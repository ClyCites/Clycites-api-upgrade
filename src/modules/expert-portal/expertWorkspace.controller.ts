import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError, BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { ResponseHandler } from '../../common/utils/response';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import caseReviewService from './caseReview.service';
import advisoryService from './advisory.service';
import knowledgeBaseService from './knowledgeBase.service';
import Advisory from './advisory.model';
import KnowledgeArticle from './knowledgeArticle.model';
import FieldCase, { FieldCaseStatus, IFieldCase } from './fieldCase.model';
import ResearchReport, { ResearchReportStatus } from './researchReport.model';
import {
  advisoryUiStatus,
  AdvisoryUiStatus,
  knowledgeUiStatus,
  KnowledgeUiStatus,
  legacyCaseUiStatus,
} from './expert.status';
import { AdvisoryStatus, PublicationStatus } from './expert.types';

type AnyRecord = Record<string, unknown>;

type AssignmentUiStatus = 'created' | 'assigned' | 'completed' | 'cancelled';
type ReviewQueueStatus = 'queued' | 'in_review' | 'approved' | 'rejected';
type QueueItemType = 'advisory' | 'knowledge' | 'field_case' | 'research_report';

interface ReviewQueueItem {
  id: string;
  itemType: QueueItemType;
  resourceId: string;
  title: string;
  status: ReviewQueueStatus;
  uiStatus: ReviewQueueStatus;
  createdAt: Date;
  submittedAt?: Date;
  metadata?: Record<string, unknown>;
}

const FIELD_CASE_STATUSES: FieldCaseStatus[] = ['created', 'assigned', 'in_visit', 'resolved', 'closed'];

const FIELD_CASE_STATUS_TRANSITIONS: Record<FieldCaseStatus, FieldCaseStatus[]> = {
  created: ['created', 'assigned', 'closed'],
  assigned: ['assigned', 'in_visit', 'closed'],
  in_visit: ['in_visit', 'resolved', 'closed'],
  resolved: ['resolved', 'closed', 'assigned'],
  closed: ['closed'],
};

const RESEARCH_REPORT_TRANSITIONS: Record<ResearchReportStatus, ResearchReportStatus[]> = {
  draft: ['draft', 'in_review', 'archived'],
  in_review: ['in_review', 'published', 'archived', 'draft'],
  published: ['published', 'archived'],
  archived: ['archived'],
};

const ASSIGNMENT_STATUS_TRANSITIONS: Record<AssignmentUiStatus, AssignmentUiStatus[]> = {
  created: ['created', 'assigned', 'cancelled'],
  assigned: ['assigned', 'completed', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

const toPositiveInt = (value: unknown, fallback: number, max?: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number') return Math.min(parsed, max);
  return parsed;
};

const toSort = (sortBy: unknown, sortOrder: unknown, allowedFields: string[]) => {
  const resolvedSortBy = typeof sortBy === 'string' && allowedFields.includes(sortBy) ? sortBy : 'createdAt';
  const resolvedSortOrder = sortOrder === 'asc' ? 1 : -1;
  return { [resolvedSortBy]: resolvedSortOrder } as Record<string, 1 | -1>;
};

const toObjectId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toPlainObject = <T>(value: T): T => {
  if (value && typeof (value as { toObject?: () => T }).toObject === 'function') {
    return (value as unknown as { toObject: () => T }).toObject();
  }
  return value;
};

const toPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
});

const getActorId = (req: Request): string => {
  const actorId = req.user?.id;
  if (!actorId || typeof actorId !== 'string') {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return actorId;
};

const isPrivilegedRole = (role?: string): boolean => {
  return role === 'admin' || role === 'platform_admin' || isSuperAdminRole(role);
};

const resolveScopedOrganizationId = (req: Request): string | undefined => {
  const actorOrg = typeof req.user?.orgId === 'string' ? req.user.orgId : undefined;
  const requestedOrg =
    toObjectId(req.query.organizationId) ||
    toObjectId(req.headers['x-organization-id']) ||
    (typeof req.body === 'object' && req.body ? toObjectId((req.body as AnyRecord).organizationId) : undefined);

  if (isSuperAdminRole(req.user?.role)) {
    return requestedOrg || actorOrg;
  }

  if (actorOrg) {
    if (requestedOrg && requestedOrg !== actorOrg) {
      throw new ForbiddenError('Cannot access expert resources outside your organization context');
    }
    return actorOrg;
  }

  return requestedOrg;
};

const assertTransition = <T extends string>(
  currentStatus: T,
  nextStatus: T,
  transitions: Record<T, T[]>,
  label: string
): void => {
  if (!(transitions[currentStatus] || []).includes(nextStatus)) {
    throw new BadRequestError(`Invalid ${label} transition: ${currentStatus} -> ${nextStatus}`);
  }
};

const withFieldCaseUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: FieldCaseStatus } => {
  const plain = toPlainObject(entity);
  const status = typeof plain.status === 'string' && FIELD_CASE_STATUSES.includes(plain.status as FieldCaseStatus)
    ? (plain.status as FieldCaseStatus)
    : 'created';
  return {
    ...plain,
    uiStatus: status,
  };
};

const withAdvisoryUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: AdvisoryUiStatus } => {
  const plain = toPlainObject(entity);
  const status = typeof plain.status === 'string' ? (plain.status as AdvisoryStatus) : AdvisoryStatus.DRAFT;
  const acknowledgedCount = typeof plain.acknowledgedCount === 'number' ? plain.acknowledgedCount : 0;
  return {
    ...plain,
    uiStatus: advisoryUiStatus(status, acknowledgedCount),
  };
};

const withKnowledgeUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: KnowledgeUiStatus } => {
  const plain = toPlainObject(entity);
  const status = typeof plain.status === 'string' ? (plain.status as PublicationStatus) : PublicationStatus.DRAFT;
  return {
    ...plain,
    uiStatus: knowledgeUiStatus(status),
  };
};

const withResearchReportUiStatus = <T extends AnyRecord>(entity: T): T & { uiStatus: ResearchReportStatus } => {
  const plain = toPlainObject(entity);
  const status = typeof plain.status === 'string' ? (plain.status as ResearchReportStatus) : 'draft';
  return {
    ...plain,
    uiStatus: status,
  };
};

const assignmentStatusFromCase = (fieldCase: IFieldCase): AssignmentUiStatus => {
  if (!fieldCase.isActive) return 'cancelled';

  switch (fieldCase.status) {
    case 'created':
      return 'created';
    case 'assigned':
    case 'in_visit':
      return 'assigned';
    case 'resolved':
    case 'closed':
      return 'completed';
    default:
      return 'created';
  }
};

const toAssignmentProjection = (fieldCase: IFieldCase): AnyRecord => {
  const plain = toPlainObject(fieldCase.toObject());
  const status = assignmentStatusFromCase(fieldCase);
  return {
    id: plain._id,
    assignmentId: plain._id,
    caseId: plain._id,
    caseNumber: plain.caseNumber,
    title: plain.title,
    expertId: plain.assignedExpertUser,
    assignedBy: plain.assignedBy,
    assignedAt: plain.assignedAt,
    completedAt: plain.closedAt || plain.resolvedAt,
    status,
    uiStatus: status,
    metadata: plain.metadata || {},
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const parseQueueId = (id: string): { itemType: QueueItemType; resourceId: string } => {
  const separatorIndex = id.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === id.length - 1) {
    throw new BadRequestError('Invalid review queue id. Expected format "<itemType>:<resourceId>"');
  }

  const itemType = id.substring(0, separatorIndex) as QueueItemType;
  const resourceId = id.substring(separatorIndex + 1);

  if (!['advisory', 'knowledge', 'field_case', 'research_report'].includes(itemType)) {
    throw new BadRequestError('Invalid review queue item type');
  }

  return { itemType, resourceId };
};

const buildQueueId = (itemType: QueueItemType, resourceId: string): string => `${itemType}:${resourceId}`;

const mapAdvisoryQueueStatus = (status: AdvisoryStatus): ReviewQueueStatus => {
  switch (status) {
    case AdvisoryStatus.SUBMITTED:
      return 'queued';
    case AdvisoryStatus.APPROVED:
      return 'approved';
    case AdvisoryStatus.REJECTED:
      return 'rejected';
    default:
      return 'queued';
  }
};

const mapKnowledgeQueueStatus = (status: PublicationStatus): ReviewQueueStatus => {
  switch (status) {
    case PublicationStatus.UNDER_REVIEW:
      return 'in_review';
    case PublicationStatus.APPROVED:
      return 'approved';
    case PublicationStatus.REJECTED:
      return 'rejected';
    default:
      return 'queued';
  }
};

const mapFieldCaseQueueStatus = (status: FieldCaseStatus): ReviewQueueStatus => {
  switch (status) {
    case 'created':
    case 'assigned':
      return 'queued';
    case 'in_visit':
      return 'in_review';
    case 'resolved':
    case 'closed':
      return 'approved';
    default:
      return 'queued';
  }
};

const mapResearchQueueStatus = (status: ResearchReportStatus): ReviewQueueStatus => {
  switch (status) {
    case 'in_review':
      return 'in_review';
    case 'published':
      return 'approved';
    case 'archived':
      return 'approved';
    default:
      return 'queued';
  }
};

const assertFieldCaseAccess = (
  req: Request,
  fieldCase: IFieldCase
): void => {
  if (isSuperAdminRole(req.user?.role)) return;

  const actorId = getActorId(req);
  const actorOrg = typeof req.user?.orgId === 'string' ? req.user.orgId : undefined;
  const caseOrg = fieldCase.organization?.toString();

  if (isPrivilegedRole(req.user?.role)) {
    if (caseOrg && actorOrg && caseOrg !== actorOrg) {
      throw new ForbiddenError('Cannot access field cases outside your organization context');
    }
    return;
  }

  const isCreator = fieldCase.createdBy.toString() === actorId;
  const isAssignedExpert = fieldCase.assignedExpertUser?.toString() === actorId;

  if (!isCreator && !isAssignedExpert) {
    throw new ForbiddenError('You can only access your own or assigned field cases');
  }

  if (caseOrg && actorOrg && caseOrg !== actorOrg) {
    throw new ForbiddenError('Cannot access field cases outside your organization context');
  }
};

class ExpertWorkspaceController {
  listCases = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const source = typeof req.query.source === 'string' ? req.query.source : 'all';
      const requestedStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
      const requestedUiStatus = typeof req.query.uiStatus === 'string' ? req.query.uiStatus : undefined;
      const statusFilter = requestedUiStatus || requestedStatus;
      const fetchLimit = page * limit;

      const fieldFilter: Record<string, unknown> = { isActive: true };
      const organizationId = resolveScopedOrganizationId(req);
      if (organizationId) {
        fieldFilter.organization = organizationId;
      }
      if (!isPrivilegedRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        const actorId = getActorId(req);
        fieldFilter.$or = [{ createdBy: actorId }, { assignedExpertUser: actorId }];
      }

      const includeField = source === 'all' || source === 'field';
      const includeLegacy = source === 'all' || source === 'legacy';

      let fieldCases: Array<AnyRecord & { uiStatus: FieldCaseStatus }> = [];
      let fieldTotal = 0;

      if (includeField) {
        const [rows, total] = await Promise.all([
          FieldCase.find(fieldFilter)
            .sort({ createdAt: -1 })
            .limit(fetchLimit),
          FieldCase.countDocuments(fieldFilter),
        ]);
        fieldCases = rows.map((row) => withFieldCaseUiStatus(row as unknown as AnyRecord));
        fieldTotal = total;
      }

      let legacyRows: Array<AnyRecord & { uiStatus: FieldCaseStatus }> = [];
      let legacyTotal = 0;

      if (includeLegacy) {
        const result = await caseReviewService.getAllCases({
          page: 1,
          limit: fetchLimit,
        });

        legacyRows = result.cases.map((item) => {
          const plain = toPlainObject(item.toObject());
          const mappedStatus = legacyCaseUiStatus(plain.status as any);
          return {
            ...plain,
            source: 'legacy_case_review',
            uiStatus: mappedStatus,
          };
        });
        legacyTotal = result.total;
      }

      let combined = [...fieldCases, ...legacyRows];
      if (statusFilter) {
        combined = combined.filter((item) => item.status === statusFilter || item.uiStatus === statusFilter);
      }

      combined.sort((a, b) => {
        const aTime = new Date(String(a.createdAt || 0)).getTime();
        const bTime = new Date(String(b.createdAt || 0)).getTime();
        return bTime - aTime;
      });

      const filteredTotal = statusFilter ? combined.length : fieldTotal + legacyTotal;
      const pagedRows = combined.slice(skip, skip + limit);

      ResponseHandler.success(
        res,
        pagedRows,
        'Cases retrieved',
        200,
        {
          pagination: toPagination(page, limit, filteredTotal),
          source,
        }
      );
    } catch (error) {
      next(error);
    }
  };

  createCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = getActorId(req);
      const organizationId = resolveScopedOrganizationId(req);
      const requestedStatus = typeof req.body.status === 'string' && FIELD_CASE_STATUSES.includes(req.body.status as FieldCaseStatus)
        ? (req.body.status as FieldCaseStatus)
        : undefined;

      const assignedExpertUser = toObjectId(req.body.expertId);
      const status: FieldCaseStatus = requestedStatus || (assignedExpertUser ? 'assigned' : 'created');
      const now = new Date();

      const created = await FieldCase.create({
        organization: organizationId,
        createdBy: new mongoose.Types.ObjectId(actorId),
        caseNumber: `CASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: req.body.title || req.body.subject || 'Untitled Field Case',
        description: req.body.description || 'No description provided',
        region: req.body.region,
        cropType: req.body.cropType,
        source: req.body.source || 'workspace',
        inquiryId: toObjectId(req.body.inquiryId),
        reportId: toObjectId(req.body.reportId),
        assignedExpertUser: assignedExpertUser ? new mongoose.Types.ObjectId(assignedExpertUser) : undefined,
        assignedBy: assignedExpertUser ? new mongoose.Types.ObjectId(actorId) : undefined,
        assignedAt: assignedExpertUser ? now : undefined,
        status,
        priority: req.body.priority || 'medium',
        notes: req.body.notes,
        metadata: req.body.metadata || {},
        isActive: true,
      });

      ResponseHandler.created(res, withFieldCaseUiStatus(created as unknown as AnyRecord), 'Field case created');
    } catch (error) {
      next(error);
    }
  };

  getCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({ _id: req.params.id, isActive: true });
      if (fieldCase) {
        assertFieldCaseAccess(req, fieldCase);
        ResponseHandler.success(res, withFieldCaseUiStatus(fieldCase as unknown as AnyRecord), 'Case retrieved');
        return;
      }

      const legacyCase = await caseReviewService.getCaseById(req.params.id);
      const plain = toPlainObject(legacyCase.toObject());
      ResponseHandler.success(
        res,
        {
          ...plain,
          source: 'legacy_case_review',
          uiStatus: legacyCaseUiStatus(plain.status as any),
        },
        'Case retrieved'
      );
    } catch (error) {
      next(error);
    }
  };

  updateCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({ _id: req.params.id, isActive: true });
      if (!fieldCase) throw new NotFoundError('Field case not found');

      assertFieldCaseAccess(req, fieldCase);

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as FieldCaseStatus;
        if (!FIELD_CASE_STATUSES.includes(nextStatus)) {
          throw new BadRequestError('Invalid field case status');
        }
        assertTransition(fieldCase.status, nextStatus, FIELD_CASE_STATUS_TRANSITIONS, 'field case status');
        fieldCase.status = nextStatus;

        if (nextStatus === 'assigned' && !fieldCase.assignedAt) fieldCase.assignedAt = new Date();
        if (nextStatus === 'in_visit' && !fieldCase.startedAt) fieldCase.startedAt = new Date();
        if (nextStatus === 'resolved') fieldCase.resolvedAt = new Date();
        if (nextStatus === 'closed') fieldCase.closedAt = new Date();
      }

      if (req.body.title !== undefined) fieldCase.title = req.body.title;
      if (req.body.description !== undefined) fieldCase.description = req.body.description;
      if (req.body.region !== undefined) fieldCase.region = req.body.region;
      if (req.body.cropType !== undefined) fieldCase.cropType = req.body.cropType;
      if (req.body.priority !== undefined) fieldCase.priority = req.body.priority;
      if (req.body.resolution !== undefined) fieldCase.resolution = req.body.resolution;
      if (req.body.closeReason !== undefined) fieldCase.closeReason = req.body.closeReason;
      if (req.body.notes !== undefined) fieldCase.notes = req.body.notes;
      if (req.body.metadata !== undefined) fieldCase.metadata = req.body.metadata;

      if (typeof req.body.expertId === 'string' && req.body.expertId.trim()) {
        const expertId = req.body.expertId.trim();
        fieldCase.assignedExpertUser = new mongoose.Types.ObjectId(expertId);
        fieldCase.assignedBy = new mongoose.Types.ObjectId(getActorId(req));
        fieldCase.assignedAt = new Date();
        if (fieldCase.status === 'created') fieldCase.status = 'assigned';
      }

      await fieldCase.save();
      ResponseHandler.success(res, withFieldCaseUiStatus(fieldCase as unknown as AnyRecord), 'Field case updated');
    } catch (error) {
      next(error);
    }
  };

  deleteCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({ _id: req.params.id, isActive: true });
      if (!fieldCase) throw new NotFoundError('Field case not found');
      assertFieldCaseAccess(req, fieldCase);

      fieldCase.isActive = false;
      fieldCase.status = 'closed';
      fieldCase.closedAt = new Date();
      await fieldCase.save();

      ResponseHandler.success(res, null, 'Field case deleted');
    } catch (error) {
      next(error);
    }
  };

  assignCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({ _id: req.params.id, isActive: true });
      if (fieldCase) {
        assertFieldCaseAccess(req, fieldCase);
        const expertId = toObjectId(req.body.expertId);
        if (!expertId) throw new BadRequestError('expertId is required');

        if (fieldCase.status !== 'created' && fieldCase.status !== 'assigned' && fieldCase.status !== 'resolved') {
          throw new BadRequestError(`Invalid field case status transition for assign: ${fieldCase.status} -> assigned`);
        }

        fieldCase.assignedExpertUser = new mongoose.Types.ObjectId(expertId);
        fieldCase.assignedBy = new mongoose.Types.ObjectId(getActorId(req));
        fieldCase.assignedAt = new Date();
        fieldCase.status = 'assigned';
        await fieldCase.save();

        ResponseHandler.success(res, withFieldCaseUiStatus(fieldCase as unknown as AnyRecord), 'Case assigned');
        return;
      }

      const actorId = getActorId(req);
      const { expertId } = req.body;
      const caseDoc = await caseReviewService.assignCase({
        reportId: req.params.id,
        expertId,
        assignedBy: actorId,
      });

      const plain = toPlainObject(caseDoc.toObject());
      ResponseHandler.success(res, {
        ...plain,
        source: 'legacy_case_review',
        uiStatus: legacyCaseUiStatus(plain.status as any),
      }, 'Case assigned');
    } catch (error) {
      next(error);
    }
  };

  assignSelfCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({ _id: req.params.id, isActive: true });
      if (!fieldCase) throw new NotFoundError('Field case not found');
      assertFieldCaseAccess(req, fieldCase);

      const actorId = getActorId(req);
      if (fieldCase.status === 'closed') {
        throw new BadRequestError('Closed field cases cannot be assigned');
      }

      fieldCase.assignedExpertUser = new mongoose.Types.ObjectId(actorId);
      fieldCase.assignedBy = new mongoose.Types.ObjectId(actorId);
      fieldCase.assignedAt = new Date();
      if (fieldCase.status === 'created' || fieldCase.status === 'resolved') {
        fieldCase.status = 'assigned';
      }

      await fieldCase.save();
      ResponseHandler.success(
        res,
        withFieldCaseUiStatus(fieldCase as unknown as AnyRecord),
        'Case self-assigned'
      );
    } catch (error) {
      next(error);
    }
  };

  startCaseReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({ _id: req.params.id, isActive: true });
      if (fieldCase) {
        assertFieldCaseAccess(req, fieldCase);
        const actorId = getActorId(req);

        if (fieldCase.assignedExpertUser && fieldCase.assignedExpertUser.toString() !== actorId && !isPrivilegedRole(req.user?.role)) {
          throw new ForbiddenError('Case is assigned to another expert');
        }

        if (fieldCase.status !== 'assigned') {
          throw new BadRequestError(`Invalid field case status transition: ${fieldCase.status} -> in_visit`);
        }

        fieldCase.status = 'in_visit';
        fieldCase.startedAt = new Date();
        await fieldCase.save();
        ResponseHandler.success(res, withFieldCaseUiStatus(fieldCase as unknown as AnyRecord), 'Case review started');
        return;
      }

      const caseDoc = await caseReviewService.startReview(req.params.id, getActorId(req));
      const plain = toPlainObject(caseDoc.toObject());
      ResponseHandler.success(res, {
        ...plain,
        source: 'legacy_case_review',
        uiStatus: legacyCaseUiStatus(plain.status as any),
      }, 'Case review started');
    } catch (error) {
      next(error);
    }
  };

  submitCaseReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({ _id: req.params.id, isActive: true });
      if (fieldCase) {
        assertFieldCaseAccess(req, fieldCase);
        const actorId = getActorId(req);

        if (fieldCase.assignedExpertUser && fieldCase.assignedExpertUser.toString() !== actorId && !isPrivilegedRole(req.user?.role)) {
          throw new ForbiddenError('Case is assigned to another expert');
        }

        if (fieldCase.status !== 'in_visit' && fieldCase.status !== 'assigned') {
          throw new BadRequestError(`Invalid field case status transition: ${fieldCase.status} -> resolved`);
        }

        fieldCase.status = 'resolved';
        fieldCase.submittedAt = new Date();
        fieldCase.resolvedAt = new Date();
        fieldCase.resolution = req.body.resolution || req.body.reviewNotes || req.body.notes || fieldCase.resolution;
        if (req.body.notes !== undefined) fieldCase.notes = req.body.notes;
        if (req.body.metadata !== undefined) fieldCase.metadata = req.body.metadata;
        await fieldCase.save();

        ResponseHandler.success(res, withFieldCaseUiStatus(fieldCase as unknown as AnyRecord), 'Case review submitted');
        return;
      }

      const caseDoc = await caseReviewService.submitReview(req.params.id, getActorId(req), req.body);
      const plain = toPlainObject(caseDoc.toObject());
      ResponseHandler.success(res, {
        ...plain,
        source: 'legacy_case_review',
        uiStatus: legacyCaseUiStatus(plain.status as any),
      }, 'Case review submitted');
    } catch (error) {
      next(error);
    }
  };

  closeCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({ _id: req.params.id, isActive: true });
      if (!fieldCase) throw new NotFoundError('Field case not found');
      assertFieldCaseAccess(req, fieldCase);

      if (fieldCase.status !== 'resolved' && fieldCase.status !== 'assigned') {
        throw new BadRequestError(`Invalid field case status transition: ${fieldCase.status} -> closed`);
      }

      fieldCase.status = 'closed';
      fieldCase.closedAt = new Date();
      fieldCase.closeReason = req.body.reason || req.body.closeReason || fieldCase.closeReason;
      await fieldCase.save();

      ResponseHandler.success(res, withFieldCaseUiStatus(fieldCase as unknown as AnyRecord), 'Case closed');
    } catch (error) {
      next(error);
    }
  };

  listAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);
      const filter: Record<string, unknown> = {
        isActive: true,
        assignedExpertUser: { $exists: true },
      };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.expertId === 'string') filter.assignedExpertUser = req.query.expertId;
      if (!isPrivilegedRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.assignedExpertUser = getActorId(req);
      }

      const [rows, total] = await Promise.all([
        FieldCase.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'assignedAt', 'status']))
          .skip(skip)
          .limit(limit),
        FieldCase.countDocuments(filter),
      ]);

      let assignments = rows.map((row) => toAssignmentProjection(row));
      const requestedStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
      if (requestedStatus) {
        assignments = assignments.filter((item) => item.status === requestedStatus || item.uiStatus === requestedStatus);
      }

      ResponseHandler.success(
        res,
        assignments,
        'Assignments retrieved',
        200,
        { pagination: toPagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  };

  getAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({
        _id: req.params.id,
        isActive: true,
        assignedExpertUser: { $exists: true },
      });

      if (!fieldCase) throw new NotFoundError('Assignment not found');
      assertFieldCaseAccess(req, fieldCase);

      ResponseHandler.success(res, toAssignmentProjection(fieldCase), 'Assignment retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fieldCase = await FieldCase.findOne({
        _id: req.params.id,
        isActive: true,
        assignedExpertUser: { $exists: true },
      });
      if (!fieldCase) throw new NotFoundError('Assignment not found');
      assertFieldCaseAccess(req, fieldCase);

      const currentStatus = assignmentStatusFromCase(fieldCase);
      const requestedStatus = typeof req.body.status === 'string' ? (req.body.status as AssignmentUiStatus) : undefined;
      if (requestedStatus) {
        if (!['created', 'assigned', 'completed', 'cancelled'].includes(requestedStatus)) {
          throw new BadRequestError('Invalid assignment status');
        }
        assertTransition(currentStatus, requestedStatus, ASSIGNMENT_STATUS_TRANSITIONS, 'assignment status');
      }

      const expertId = toObjectId(req.body.expertId);
      if (expertId) {
        fieldCase.assignedExpertUser = new mongoose.Types.ObjectId(expertId);
        fieldCase.assignedBy = new mongoose.Types.ObjectId(getActorId(req));
        fieldCase.assignedAt = new Date();
        if (fieldCase.status === 'created' || fieldCase.status === 'resolved') {
          fieldCase.status = 'assigned';
        }
      }

      if (requestedStatus === 'created') {
        fieldCase.status = 'created';
      } else if (requestedStatus === 'assigned') {
        if (!fieldCase.assignedExpertUser) {
          throw new BadRequestError('Cannot set assignment to assigned without expertId');
        }
        fieldCase.status = 'assigned';
      } else if (requestedStatus === 'completed') {
        fieldCase.status = 'closed';
        fieldCase.closedAt = new Date();
      } else if (requestedStatus === 'cancelled') {
        fieldCase.isActive = false;
        fieldCase.status = 'closed';
        fieldCase.closedAt = new Date();
        fieldCase.closeReason = req.body.reason || req.body.closeReason || 'Cancelled';
      }

      if (req.body.notes !== undefined) fieldCase.notes = req.body.notes;
      if (req.body.metadata !== undefined) fieldCase.metadata = req.body.metadata;

      await fieldCase.save();
      ResponseHandler.success(res, toAssignmentProjection(fieldCase), 'Assignment updated');
    } catch (error) {
      next(error);
    }
  };

  listReviewQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;

      const requestedType = typeof req.query.itemType === 'string' ? req.query.itemType : undefined;
      const requestedStatus = typeof req.query.status === 'string' ? req.query.status : undefined;

      const queueItems: ReviewQueueItem[] = [];

      if (!requestedType || requestedType === 'advisory') {
        const advisories = await Advisory.find({
          status: { $in: [AdvisoryStatus.SUBMITTED, AdvisoryStatus.APPROVED, AdvisoryStatus.REJECTED] },
        })
          .sort({ updatedAt: -1 })
          .limit(500);

        for (const advisory of advisories) {
          const plain = advisory.toObject();
          const status = mapAdvisoryQueueStatus(advisory.status);
          queueItems.push({
            id: buildQueueId('advisory', advisory._id.toString()),
            itemType: 'advisory',
            resourceId: advisory._id.toString(),
            title: advisory.title,
            status,
            uiStatus: status,
            createdAt: advisory.createdAt,
            submittedAt: advisory.updatedAt,
            metadata: {
              advisoryStatus: advisory.status,
              uiStatus: advisoryUiStatus(advisory.status, advisory.acknowledgedCount),
              acknowledgedCount: plain.acknowledgedCount,
            },
          });
        }
      }

      if (!requestedType || requestedType === 'knowledge') {
        const knowledgeArticles = await KnowledgeArticle.find({
          status: { $in: [PublicationStatus.UNDER_REVIEW, PublicationStatus.APPROVED, PublicationStatus.REJECTED] },
        })
          .sort({ updatedAt: -1 })
          .limit(500);

        for (const article of knowledgeArticles) {
          const status = mapKnowledgeQueueStatus(article.status);
          queueItems.push({
            id: buildQueueId('knowledge', article._id.toString()),
            itemType: 'knowledge',
            resourceId: article._id.toString(),
            title: article.title,
            status,
            uiStatus: status,
            createdAt: article.createdAt,
            submittedAt: article.updatedAt,
            metadata: {
              articleStatus: article.status,
              uiStatus: knowledgeUiStatus(article.status),
            },
          });
        }
      }

      if (!requestedType || requestedType === 'field_case') {
        const fieldCases = await FieldCase.find({ isActive: true })
          .sort({ updatedAt: -1 })
          .limit(500);

        for (const fieldCase of fieldCases) {
          const status = mapFieldCaseQueueStatus(fieldCase.status);
          queueItems.push({
            id: buildQueueId('field_case', fieldCase._id.toString()),
            itemType: 'field_case',
            resourceId: fieldCase._id.toString(),
            title: fieldCase.title,
            status,
            uiStatus: status,
            createdAt: fieldCase.createdAt,
            submittedAt: fieldCase.submittedAt || fieldCase.updatedAt,
            metadata: {
              fieldCaseStatus: fieldCase.status,
              uiStatus: fieldCase.status,
            },
          });
        }
      }

      if (!requestedType || requestedType === 'research_report') {
        const reports = await ResearchReport.find({ isActive: true })
          .sort({ updatedAt: -1 })
          .limit(500);

        for (const report of reports) {
          const status = mapResearchQueueStatus(report.status);
          queueItems.push({
            id: buildQueueId('research_report', report._id.toString()),
            itemType: 'research_report',
            resourceId: report._id.toString(),
            title: report.title,
            status,
            uiStatus: status,
            createdAt: report.createdAt,
            submittedAt: report.submittedAt || report.updatedAt,
            metadata: {
              reportStatus: report.status,
              uiStatus: report.status,
            },
          });
        }
      }

      let filteredItems = queueItems;
      if (requestedStatus) {
        filteredItems = filteredItems.filter((item) => item.status === requestedStatus || item.uiStatus === requestedStatus);
      }

      filteredItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = filteredItems.length;
      const pagedRows = filteredItems.slice(skip, skip + limit);
      ResponseHandler.success(
        res,
        pagedRows,
        'Review queue retrieved',
        200,
        { pagination: toPagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  };

  getReviewQueueItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { itemType, resourceId } = parseQueueId(req.params.id);

      if (itemType === 'advisory') {
        const advisory = await Advisory.findById(resourceId);
        if (!advisory) throw new NotFoundError('Review queue item not found');
        const payload = withAdvisoryUiStatus(advisory.toObject() as unknown as AnyRecord);
        const status = mapAdvisoryQueueStatus(advisory.status);
        ResponseHandler.success(res, {
          id: req.params.id,
          itemType,
          resourceId,
          status,
          uiStatus: status,
          item: payload,
        }, 'Review queue item retrieved');
        return;
      }

      if (itemType === 'knowledge') {
        const article = await KnowledgeArticle.findById(resourceId);
        if (!article) throw new NotFoundError('Review queue item not found');
        const payload = withKnowledgeUiStatus(article.toObject() as unknown as AnyRecord);
        const status = mapKnowledgeQueueStatus(article.status);
        ResponseHandler.success(res, {
          id: req.params.id,
          itemType,
          resourceId,
          status,
          uiStatus: status,
          item: payload,
        }, 'Review queue item retrieved');
        return;
      }

      if (itemType === 'field_case') {
        const fieldCase = await FieldCase.findOne({ _id: resourceId, isActive: true });
        if (!fieldCase) throw new NotFoundError('Review queue item not found');
        const status = mapFieldCaseQueueStatus(fieldCase.status);
        ResponseHandler.success(res, {
          id: req.params.id,
          itemType,
          resourceId,
          status,
          uiStatus: status,
          item: withFieldCaseUiStatus(fieldCase as unknown as AnyRecord),
        }, 'Review queue item retrieved');
        return;
      }

      const report = await ResearchReport.findOne({ _id: resourceId, isActive: true });
      if (!report) throw new NotFoundError('Review queue item not found');
      const status = mapResearchQueueStatus(report.status);
      ResponseHandler.success(res, {
        id: req.params.id,
        itemType,
        resourceId,
        status,
        uiStatus: status,
        item: withResearchReportUiStatus(report as unknown as AnyRecord),
      }, 'Review queue item retrieved');
    } catch (error) {
      next(error);
    }
  };

  approveReviewQueueItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = getActorId(req);
      const { itemType, resourceId } = parseQueueId(req.params.id);

      if (itemType === 'advisory') {
        const advisory = await advisoryService.reviewAdvisory(resourceId, actorId, 'approved', req.body?.reason);
        ResponseHandler.success(res, withAdvisoryUiStatus(advisory.toObject() as AnyRecord), 'Review queue item approved');
        return;
      }

      if (itemType === 'knowledge') {
        const article = await knowledgeBaseService.reviewArticle(resourceId, actorId, true, req.body?.reason);
        ResponseHandler.success(res, withKnowledgeUiStatus(article.toObject() as AnyRecord), 'Review queue item approved');
        return;
      }

      if (itemType === 'field_case') {
        const fieldCase = await FieldCase.findOne({ _id: resourceId, isActive: true });
        if (!fieldCase) throw new NotFoundError('Review queue item not found');

        if (fieldCase.status === 'closed') {
          throw new BadRequestError('Field case is already closed');
        }

        if (fieldCase.status === 'created' || fieldCase.status === 'assigned' || fieldCase.status === 'in_visit') {
          fieldCase.status = 'resolved';
          fieldCase.resolvedAt = new Date();
        } else {
          fieldCase.status = 'closed';
          fieldCase.closedAt = new Date();
        }
        await fieldCase.save();

        ResponseHandler.success(res, withFieldCaseUiStatus(fieldCase as unknown as AnyRecord), 'Review queue item approved');
        return;
      }

      const report = await ResearchReport.findOne({ _id: resourceId, isActive: true });
      if (!report) throw new NotFoundError('Review queue item not found');

      assertTransition(report.status, 'published', RESEARCH_REPORT_TRANSITIONS, 'research report status');
      report.status = 'published';
      report.publishedAt = new Date();
      report.publishedBy = new mongoose.Types.ObjectId(actorId);
      await report.save();

      ResponseHandler.success(res, withResearchReportUiStatus(report as unknown as AnyRecord), 'Review queue item approved');
    } catch (error) {
      next(error);
    }
  };

  rejectReviewQueueItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = getActorId(req);
      const { itemType, resourceId } = parseQueueId(req.params.id);

      if (itemType === 'advisory') {
        const advisory = await advisoryService.reviewAdvisory(resourceId, actorId, 'rejected', req.body?.reason);
        ResponseHandler.success(res, withAdvisoryUiStatus(advisory.toObject() as AnyRecord), 'Review queue item rejected');
        return;
      }

      if (itemType === 'knowledge') {
        const article = await knowledgeBaseService.reviewArticle(resourceId, actorId, false, req.body?.reason);
        ResponseHandler.success(res, withKnowledgeUiStatus(article.toObject() as AnyRecord), 'Review queue item rejected');
        return;
      }

      if (itemType === 'field_case') {
        const fieldCase = await FieldCase.findOne({ _id: resourceId, isActive: true });
        if (!fieldCase) throw new NotFoundError('Review queue item not found');

        if (fieldCase.status === 'closed') {
          throw new BadRequestError('Closed field cases cannot be rejected');
        }

        fieldCase.status = 'assigned';
        fieldCase.notes = req.body?.reason
          ? `${fieldCase.notes || ''}\nReview rejection note: ${req.body.reason}`.trim()
          : fieldCase.notes;
        await fieldCase.save();

        ResponseHandler.success(res, withFieldCaseUiStatus(fieldCase as unknown as AnyRecord), 'Review queue item rejected');
        return;
      }

      const report = await ResearchReport.findOne({ _id: resourceId, isActive: true });
      if (!report) throw new NotFoundError('Review queue item not found');

      assertTransition(report.status, 'draft', RESEARCH_REPORT_TRANSITIONS, 'research report status');
      report.status = 'draft';
      report.metadata = {
        ...(report.metadata || {}),
        rejectionReason: req.body?.reason || req.body?.note || 'Rejected from review queue',
      };
      await report.save();

      ResponseHandler.success(res, withResearchReportUiStatus(report as unknown as AnyRecord), 'Review queue item rejected');
    } catch (error) {
      next(error);
    }
  };

  listResearchReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = toPositiveInt(req.query.page, 1, 10000);
      const limit = toPositiveInt(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const organizationId = resolveScopedOrganizationId(req);
      const filter: Record<string, unknown> = { isActive: true };

      if (organizationId) filter.organization = organizationId;
      if (typeof req.query.status === 'string') filter.status = req.query.status;
      if (typeof req.query.relatedCaseId === 'string') filter.relatedCaseId = req.query.relatedCaseId;
      if (!isPrivilegedRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        filter.createdBy = getActorId(req);
      }

      const [rows, total] = await Promise.all([
        ResearchReport.find(filter)
          .sort(toSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'status', 'title', 'publishedAt']))
          .skip(skip)
          .limit(limit),
        ResearchReport.countDocuments(filter),
      ]);

      ResponseHandler.success(
        res,
        rows.map((row) => withResearchReportUiStatus(row as unknown as AnyRecord)),
        'Research reports retrieved',
        200,
        { pagination: toPagination(page, limit, total) }
      );
    } catch (error) {
      next(error);
    }
  };

  createResearchReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = getActorId(req);
      const organizationId = resolveScopedOrganizationId(req);
      const requestedStatus = typeof req.body.status === 'string' ? (req.body.status as ResearchReportStatus) : undefined;
      const status: ResearchReportStatus =
        requestedStatus && ['draft', 'in_review', 'published', 'archived'].includes(requestedStatus)
          ? requestedStatus
          : 'draft';

      const created = await ResearchReport.create({
        organization: organizationId,
        createdBy: new mongoose.Types.ObjectId(actorId),
        title: req.body.title,
        summary: req.body.summary,
        content: req.body.content,
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        relatedCaseId: toObjectId(req.body.relatedCaseId),
        status,
        submittedAt: status === 'in_review' ? new Date() : undefined,
        publishedAt: status === 'published' ? new Date() : undefined,
        archivedAt: status === 'archived' ? new Date() : undefined,
        publishedBy: status === 'published' ? new mongoose.Types.ObjectId(actorId) : undefined,
        metadata: req.body.metadata || {},
      });

      ResponseHandler.created(res, withResearchReportUiStatus(created as unknown as AnyRecord), 'Research report created');
    } catch (error) {
      next(error);
    }
  };

  getResearchReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await ResearchReport.findOne({ _id: req.params.id, isActive: true });
      if (!report) throw new NotFoundError('Research report not found');

      if (!isPrivilegedRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        const actorId = getActorId(req);
        if (report.createdBy.toString() !== actorId) {
          throw new ForbiddenError('You can only access your own research reports');
        }
      }

      ResponseHandler.success(res, withResearchReportUiStatus(report as unknown as AnyRecord), 'Research report retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateResearchReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await ResearchReport.findOne({ _id: req.params.id, isActive: true });
      if (!report) throw new NotFoundError('Research report not found');

      if (!isPrivilegedRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        const actorId = getActorId(req);
        if (report.createdBy.toString() !== actorId) {
          throw new ForbiddenError('You can only update your own research reports');
        }
      }

      if (typeof req.body.status === 'string') {
        const nextStatus = req.body.status as ResearchReportStatus;
        if (!['draft', 'in_review', 'published', 'archived'].includes(nextStatus)) {
          throw new BadRequestError('Invalid research report status');
        }
        assertTransition(report.status, nextStatus, RESEARCH_REPORT_TRANSITIONS, 'research report status');
        report.status = nextStatus;

        if (nextStatus === 'in_review') report.submittedAt = new Date();
        if (nextStatus === 'published') {
          report.publishedAt = new Date();
          report.publishedBy = new mongoose.Types.ObjectId(getActorId(req));
        }
        if (nextStatus === 'archived') report.archivedAt = new Date();
      }

      if (req.body.title !== undefined) report.title = req.body.title;
      if (req.body.summary !== undefined) report.summary = req.body.summary;
      if (req.body.content !== undefined) report.content = req.body.content;
      if (Array.isArray(req.body.tags)) report.tags = req.body.tags;
      if (req.body.relatedCaseId !== undefined) {
        const relatedCaseId = toObjectId(req.body.relatedCaseId);
        report.relatedCaseId = relatedCaseId ? new mongoose.Types.ObjectId(relatedCaseId) : undefined;
      }
      if (req.body.metadata !== undefined) report.metadata = req.body.metadata;

      await report.save();
      ResponseHandler.success(res, withResearchReportUiStatus(report as unknown as AnyRecord), 'Research report updated');
    } catch (error) {
      next(error);
    }
  };

  deleteResearchReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await ResearchReport.findOne({ _id: req.params.id, isActive: true });
      if (!report) throw new NotFoundError('Research report not found');

      if (!isPrivilegedRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        const actorId = getActorId(req);
        if (report.createdBy.toString() !== actorId) {
          throw new ForbiddenError('You can only delete your own research reports');
        }
      }

      report.isActive = false;
      report.status = 'archived';
      report.archivedAt = new Date();
      await report.save();

      ResponseHandler.success(res, null, 'Research report deleted');
    } catch (error) {
      next(error);
    }
  };

  submitResearchReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await ResearchReport.findOne({ _id: req.params.id, isActive: true });
      if (!report) throw new NotFoundError('Research report not found');

      if (!isPrivilegedRole(req.user?.role) && !isSuperAdminRole(req.user?.role)) {
        const actorId = getActorId(req);
        if (report.createdBy.toString() !== actorId) {
          throw new ForbiddenError('You can only submit your own research reports');
        }
      }

      assertTransition(report.status, 'in_review', RESEARCH_REPORT_TRANSITIONS, 'research report status');
      report.status = 'in_review';
      report.submittedAt = new Date();
      await report.save();

      ResponseHandler.success(res, withResearchReportUiStatus(report as unknown as AnyRecord), 'Research report submitted for review');
    } catch (error) {
      next(error);
    }
  };

  publishResearchReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await ResearchReport.findOne({ _id: req.params.id, isActive: true });
      if (!report) throw new NotFoundError('Research report not found');

      assertTransition(report.status, 'published', RESEARCH_REPORT_TRANSITIONS, 'research report status');
      report.status = 'published';
      report.publishedAt = new Date();
      report.publishedBy = new mongoose.Types.ObjectId(getActorId(req));
      await report.save();

      ResponseHandler.success(res, withResearchReportUiStatus(report as unknown as AnyRecord), 'Research report published');
    } catch (error) {
      next(error);
    }
  };

  archiveResearchReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await ResearchReport.findOne({ _id: req.params.id, isActive: true });
      if (!report) throw new NotFoundError('Research report not found');

      assertTransition(report.status, 'archived', RESEARCH_REPORT_TRANSITIONS, 'research report status');
      report.status = 'archived';
      report.archivedAt = new Date();
      await report.save();

      ResponseHandler.success(res, withResearchReportUiStatus(report as unknown as AnyRecord), 'Research report archived');
    } catch (error) {
      next(error);
    }
  };
}

export default new ExpertWorkspaceController();
