import { AdvisoryStatus, CaseReviewStatus, PublicationStatus } from './expert.types';

export type AdvisoryUiStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'acknowledged';

export type KnowledgeUiStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'unpublished'
  | 'archived';

export type FieldCaseUiStatus =
  | 'created'
  | 'assigned'
  | 'in_visit'
  | 'resolved'
  | 'closed';

export const advisoryUiStatus = (
  status: AdvisoryStatus,
  acknowledgedCount?: number
): AdvisoryUiStatus => {
  if (status === AdvisoryStatus.SENT && Number(acknowledgedCount || 0) > 0) {
    return 'acknowledged';
  }

  switch (status) {
    case AdvisoryStatus.DRAFT:
      return 'draft';
    case AdvisoryStatus.SUBMITTED:
      return 'in_review';
    case AdvisoryStatus.APPROVED:
      return 'approved';
    case AdvisoryStatus.REJECTED:
      return 'rejected';
    case AdvisoryStatus.SCHEDULED:
    case AdvisoryStatus.SENT:
      return 'published';
    case AdvisoryStatus.CANCELLED:
      return 'rejected';
    default:
      return 'draft';
  }
};

export const knowledgeUiStatus = (
  status: PublicationStatus
): KnowledgeUiStatus => {
  switch (status) {
    case PublicationStatus.DRAFT:
      return 'draft';
    case PublicationStatus.UNDER_REVIEW:
      return 'in_review';
    case PublicationStatus.APPROVED:
      return 'approved';
    case PublicationStatus.REJECTED:
      return 'rejected';
    case PublicationStatus.PUBLISHED:
      return 'published';
    case PublicationStatus.ARCHIVED:
      return 'archived';
    default:
      return 'draft';
  }
};

export const legacyCaseUiStatus = (status: CaseReviewStatus): FieldCaseUiStatus => {
  switch (status) {
    case CaseReviewStatus.PENDING:
      return 'assigned';
    case CaseReviewStatus.IN_REVIEW:
      return 'in_visit';
    case CaseReviewStatus.ESCALATED:
      return 'assigned';
    case CaseReviewStatus.REVIEWED:
      return 'resolved';
    case CaseReviewStatus.CLOSED:
      return 'closed';
    default:
      return 'assigned';
  }
};
