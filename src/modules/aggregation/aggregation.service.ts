import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { isSuperAdminRole } from '../../common/middleware/superAdmin';
import AuditService from '../audit/audit.service';
import CollectionPoint, { ICollectionPoint } from '../logistics/collectionPoint.model';
import Shipment, { IShipment, ShipmentStatus } from '../logistics/shipment.model';
import StorageBin, { IStorageBin, StorageBinStatus } from './storageBin.model';
import AggregationBatch, { IAggregationBatch, AggregationBatchStatus } from './batch.model';
import QualityGrade, { IQualityGrade, QualityGradeStatus } from './qualityGrade.model';
import SpoilageReport, { ISpoilageReport, SpoilageReportStatus } from './spoilageReport.model';

export type WarehouseLifecycleStatus = 'active' | 'maintenance' | 'inactive';
export type StockMovementStatus = 'draft' | 'confirmed' | 'completed' | 'rejected';
export type StockMovementType = 'receive' | 'transfer' | 'dispatch';

type ActorContext = {
  userId: mongoose.Types.ObjectId;
  role?: string;
  orgId?: string;
};

type PaginatedResult<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AggregationStockMovement = {
  id: string;
  shipmentId: string;
  movementType: StockMovementType;
  sourceId?: string;
  destinationId?: string;
  quantity?: number;
  status: StockMovementStatus;
  shipmentStatus: ShipmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

class AggregationService {
  private assertOrgAccess(resourceOrg: mongoose.Types.ObjectId | undefined, actor: ActorContext): void {
    if (isSuperAdminRole(actor.role)) {
      return;
    }

    if (!resourceOrg) {
      throw new ForbiddenError('Resource has no organization context');
    }

    if (!actor.orgId) {
      throw new ForbiddenError('Organization context is required');
    }

    if (resourceOrg.toString() !== actor.orgId) {
      throw new ForbiddenError('Cannot access resources outside your organization');
    }
  }

  private buildPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private toWarehouseLifecycleStatus(point: ICollectionPoint): WarehouseLifecycleStatus {
    if (point.status === 'maintenance') {
      return 'maintenance';
    }

    if (point.status === 'inactive' || point.isActive === false) {
      return 'inactive';
    }

    return 'active';
  }

  mapWarehouseForUi(point: ICollectionPoint): ICollectionPoint & { uiStatus: WarehouseLifecycleStatus } {
    return Object.assign(point, {
      status: this.toWarehouseLifecycleStatus(point),
      uiStatus: this.toWarehouseLifecycleStatus(point),
    });
  }

  async listStorageBins(
    warehouseId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId,
    actor: ActorContext,
    options: {
      page?: number;
      limit?: number;
      status?: StorageBinStatus;
      search?: string;
    } = {}
  ): Promise<PaginatedResult<IStorageBin>> {
    const warehouse = await CollectionPoint.findOne({
      _id: warehouseId,
      type: 'warehouse',
      isActive: true,
    });
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }

    this.assertOrgAccess(warehouse.organization as mongoose.Types.ObjectId, actor);

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      warehouseId,
      isActive: true,
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.search) {
      filter.name = { $regex: options.search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      StorageBin.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StorageBin.countDocuments(filter),
    ]);

    return {
      data,
      ...this.buildPagination(page, limit, total),
    };
  }

  async createStorageBin(
    warehouseId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<IStorageBin>
  ): Promise<IStorageBin> {
    const warehouse = await CollectionPoint.findOne({
      _id: warehouseId,
      type: 'warehouse',
      isActive: true,
    });
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }

    this.assertOrgAccess(warehouse.organization as mongoose.Types.ObjectId, actor);

    const bin = await StorageBin.create({
      organization: organizationId,
      warehouseId,
      name: payload.name,
      capacity: payload.capacity,
      capacityUnit: payload.capacityUnit,
      temperatureControl: payload.temperatureControl ?? false,
      currentLoad: payload.currentLoad ?? 0,
      status: payload.status ?? 'available',
      notes: payload.notes,
      createdBy: actor.userId,
      lastModifiedBy: actor.userId,
    });

    await AuditService.log({
      action: 'aggregation.storage_bin_created',
      resource: 'storage_bin',
      resourceId: bin._id.toString(),
      userId: actor.userId.toString(),
      organizationId: organizationId.toString(),
    });

    return bin;
  }

  async getStorageBin(
    binId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<IStorageBin> {
    const bin = await StorageBin.findOne({ _id: binId, isActive: true });
    if (!bin) {
      throw new NotFoundError('Storage bin not found');
    }

    this.assertOrgAccess(bin.organization as mongoose.Types.ObjectId, actor);
    return bin;
  }

  async updateStorageBin(
    binId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<IStorageBin>
  ): Promise<IStorageBin> {
    const bin = await this.getStorageBin(binId, actor);

    const allowedUpdates: Array<keyof IStorageBin> = [
      'name',
      'capacity',
      'capacityUnit',
      'temperatureControl',
      'currentLoad',
      'status',
      'notes',
    ];

    for (const field of allowedUpdates) {
      if (payload[field] !== undefined) {
        (bin as unknown as Record<string, unknown>)[field as string] = payload[field];
      }
    }

    bin.lastModifiedBy = actor.userId;
    await bin.save();

    await AuditService.log({
      action: 'aggregation.storage_bin_updated',
      resource: 'storage_bin',
      resourceId: bin._id.toString(),
      userId: actor.userId.toString(),
      organizationId: bin.organization.toString(),
    });

    return bin;
  }

  async deleteStorageBin(
    binId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<void> {
    const bin = await this.getStorageBin(binId, actor);
    await bin.softDelete(actor.userId);

    await AuditService.log({
      action: 'aggregation.storage_bin_deleted',
      resource: 'storage_bin',
      resourceId: bin._id.toString(),
      userId: actor.userId.toString(),
      organizationId: bin.organization.toString(),
      risk: 'medium',
    });
  }

  async listBatches(
    organizationId: mongoose.Types.ObjectId,
    actor: ActorContext,
    options: {
      page?: number;
      limit?: number;
      status?: AggregationBatchStatus;
      commodity?: string;
      warehouseId?: string;
      binId?: string;
    } = {}
  ): Promise<PaginatedResult<IAggregationBatch>> {
    if (!isSuperAdminRole(actor.role) && actor.orgId && actor.orgId !== organizationId.toString()) {
      throw new ForbiddenError('Cannot access batches outside your organization');
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isActive: true,
    };
    if (options.status) filter.status = options.status;
    if (options.commodity) filter.commodity = { $regex: options.commodity, $options: 'i' };
    if (options.warehouseId) filter.warehouseId = new mongoose.Types.ObjectId(options.warehouseId);
    if (options.binId) filter.binId = new mongoose.Types.ObjectId(options.binId);

    const [data, total] = await Promise.all([
      AggregationBatch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AggregationBatch.countDocuments(filter),
    ]);

    return {
      data,
      ...this.buildPagination(page, limit, total),
    };
  }

  async createBatch(
    organizationId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<IAggregationBatch>
  ): Promise<IAggregationBatch> {
    const warehouseId = payload.warehouseId as mongoose.Types.ObjectId | undefined;
    if (!warehouseId) {
      throw new BadRequestError('warehouseId is required');
    }

    const warehouse = await CollectionPoint.findOne({
      _id: warehouseId,
      type: 'warehouse',
      isActive: true,
    });
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }

    this.assertOrgAccess(warehouse.organization as mongoose.Types.ObjectId, actor);

    if (payload.binId) {
      const bin = await StorageBin.findOne({
        _id: payload.binId,
        organization: organizationId,
        warehouseId,
        isActive: true,
      });
      if (!bin) {
        throw new NotFoundError('Storage bin not found for this warehouse');
      }
    }

    const batch = await AggregationBatch.create({
      organization: organizationId,
      commodity: payload.commodity,
      quantity: payload.quantity,
      unit: payload.unit,
      grade: payload.grade,
      warehouseId,
      binId: payload.binId,
      receivedAt: payload.receivedAt || new Date(),
      status: payload.status || 'received',
      notes: payload.notes,
      createdBy: actor.userId,
      lastModifiedBy: actor.userId,
    });

    await AuditService.log({
      action: 'aggregation.batch_created',
      resource: 'aggregation_batch',
      resourceId: batch._id.toString(),
      userId: actor.userId.toString(),
      organizationId: organizationId.toString(),
    });

    return batch;
  }

  async getBatch(
    batchId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<IAggregationBatch> {
    const batch = await AggregationBatch.findOne({ _id: batchId, isActive: true });
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    this.assertOrgAccess(batch.organization as mongoose.Types.ObjectId, actor);
    return batch;
  }

  async updateBatch(
    batchId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<IAggregationBatch>
  ): Promise<IAggregationBatch> {
    const batch = await this.getBatch(batchId, actor);

    if (payload.warehouseId) {
      const warehouse = await CollectionPoint.findOne({
        _id: payload.warehouseId,
        type: 'warehouse',
        isActive: true,
      });
      if (!warehouse) {
        throw new NotFoundError('Warehouse not found');
      }
      this.assertOrgAccess(warehouse.organization as mongoose.Types.ObjectId, actor);
    }

    const targetWarehouseId = (payload.warehouseId || batch.warehouseId) as mongoose.Types.ObjectId;
    if (payload.binId) {
      const bin = await StorageBin.findOne({
        _id: payload.binId,
        organization: batch.organization,
        warehouseId: targetWarehouseId,
        isActive: true,
      });
      if (!bin) {
        throw new NotFoundError('Storage bin not found for selected warehouse');
      }
    }

    const allowedUpdates: Array<keyof IAggregationBatch> = [
      'commodity',
      'quantity',
      'unit',
      'grade',
      'warehouseId',
      'binId',
      'receivedAt',
      'status',
      'notes',
    ];

    for (const field of allowedUpdates) {
      if (payload[field] !== undefined) {
        (batch as unknown as Record<string, unknown>)[field as string] = payload[field];
      }
    }

    batch.lastModifiedBy = actor.userId;
    await batch.save();

    await AuditService.log({
      action: 'aggregation.batch_updated',
      resource: 'aggregation_batch',
      resourceId: batch._id.toString(),
      userId: actor.userId.toString(),
      organizationId: batch.organization.toString(),
    });

    return batch;
  }

  async deleteBatch(
    batchId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<void> {
    const batch = await this.getBatch(batchId, actor);
    await batch.softDelete(actor.userId);

    await AuditService.log({
      action: 'aggregation.batch_deleted',
      resource: 'aggregation_batch',
      resourceId: batch._id.toString(),
      userId: actor.userId.toString(),
      organizationId: batch.organization.toString(),
      risk: 'medium',
    });
  }

  async listQualityGrades(
    organizationId: mongoose.Types.ObjectId,
    actor: ActorContext,
    options: {
      page?: number;
      limit?: number;
      batchId?: string;
      status?: QualityGradeStatus;
      grade?: string;
    } = {}
  ): Promise<PaginatedResult<IQualityGrade>> {
    if (!isSuperAdminRole(actor.role) && actor.orgId && actor.orgId !== organizationId.toString()) {
      throw new ForbiddenError('Cannot access quality grades outside your organization');
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isActive: true,
    };
    if (options.batchId) filter.batchId = new mongoose.Types.ObjectId(options.batchId);
    if (options.status) filter.status = options.status;
    if (options.grade) filter.grade = { $regex: options.grade, $options: 'i' };

    const [data, total] = await Promise.all([
      QualityGrade.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      QualityGrade.countDocuments(filter),
    ]);

    return {
      data,
      ...this.buildPagination(page, limit, total),
    };
  }

  async createQualityGrade(
    organizationId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<IQualityGrade>
  ): Promise<IQualityGrade> {
    const batchId = payload.batchId as mongoose.Types.ObjectId | undefined;
    if (!batchId) {
      throw new BadRequestError('batchId is required');
    }

    const batch = await AggregationBatch.findOne({
      _id: batchId,
      organization: organizationId,
      isActive: true,
    });
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    this.assertOrgAccess(batch.organization as mongoose.Types.ObjectId, actor);

    const qualityGrade = await QualityGrade.create({
      organization: organizationId,
      batchId,
      grade: payload.grade,
      notes: payload.notes,
      assessedBy: payload.assessedBy || actor.userId,
      assessedAt: payload.assessedAt || new Date(),
      status: payload.status || 'draft',
      createdBy: actor.userId,
      lastModifiedBy: actor.userId,
    });

    await AuditService.log({
      action: 'aggregation.quality_grade_created',
      resource: 'quality_grade',
      resourceId: qualityGrade._id.toString(),
      userId: actor.userId.toString(),
      organizationId: organizationId.toString(),
    });

    return qualityGrade;
  }

  async getQualityGrade(
    gradeId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<IQualityGrade> {
    const grade = await QualityGrade.findOne({ _id: gradeId, isActive: true });
    if (!grade) {
      throw new NotFoundError('Quality grade not found');
    }

    this.assertOrgAccess(grade.organization as mongoose.Types.ObjectId, actor);
    return grade;
  }

  async updateQualityGrade(
    gradeId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<IQualityGrade>
  ): Promise<IQualityGrade> {
    const grade = await this.getQualityGrade(gradeId, actor);

    if (payload.status && grade.status === 'final' && payload.status !== 'final') {
      throw new BadRequestError('Cannot transition quality grade from final to another status');
    }

    if (payload.batchId) {
      const batch = await AggregationBatch.findOne({
        _id: payload.batchId,
        organization: grade.organization,
        isActive: true,
      });
      if (!batch) {
        throw new NotFoundError('Batch not found');
      }
    }

    const allowedUpdates: Array<keyof IQualityGrade> = [
      'batchId',
      'grade',
      'notes',
      'assessedBy',
      'assessedAt',
      'status',
    ];

    for (const field of allowedUpdates) {
      if (payload[field] !== undefined) {
        (grade as unknown as Record<string, unknown>)[field as string] = payload[field];
      }
    }

    grade.lastModifiedBy = actor.userId;
    await grade.save();

    await AuditService.log({
      action: 'aggregation.quality_grade_updated',
      resource: 'quality_grade',
      resourceId: grade._id.toString(),
      userId: actor.userId.toString(),
      organizationId: grade.organization.toString(),
    });

    return grade;
  }

  async deleteQualityGrade(
    gradeId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<void> {
    const grade = await this.getQualityGrade(gradeId, actor);
    await grade.softDelete(actor.userId);

    await AuditService.log({
      action: 'aggregation.quality_grade_deleted',
      resource: 'quality_grade',
      resourceId: grade._id.toString(),
      userId: actor.userId.toString(),
      organizationId: grade.organization.toString(),
      risk: 'medium',
    });
  }

  async listSpoilageReports(
    organizationId: mongoose.Types.ObjectId,
    actor: ActorContext,
    options: {
      page?: number;
      limit?: number;
      batchId?: string;
      status?: SpoilageReportStatus;
    } = {}
  ): Promise<PaginatedResult<ISpoilageReport>> {
    if (!isSuperAdminRole(actor.role) && actor.orgId && actor.orgId !== organizationId.toString()) {
      throw new ForbiddenError('Cannot access spoilage reports outside your organization');
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isActive: true,
    };

    if (options.batchId) filter.batchId = new mongoose.Types.ObjectId(options.batchId);
    if (options.status) filter.status = options.status;

    const [data, total] = await Promise.all([
      SpoilageReport.find(filter).sort({ reportedAt: -1 }).skip(skip).limit(limit),
      SpoilageReport.countDocuments(filter),
    ]);

    return {
      data,
      ...this.buildPagination(page, limit, total),
    };
  }

  async createSpoilageReport(
    organizationId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<ISpoilageReport>
  ): Promise<ISpoilageReport> {
    const batchId = payload.batchId as mongoose.Types.ObjectId | undefined;
    if (!batchId) {
      throw new BadRequestError('batchId is required');
    }

    const batch = await AggregationBatch.findOne({
      _id: batchId,
      organization: organizationId,
      isActive: true,
    });
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    this.assertOrgAccess(batch.organization as mongoose.Types.ObjectId, actor);

    const report = await SpoilageReport.create({
      organization: organizationId,
      batchId,
      quantity: payload.quantity,
      unit: payload.unit,
      cause: payload.cause,
      reportedAt: payload.reportedAt || new Date(),
      reportedBy: payload.reportedBy || actor.userId,
      status: payload.status || 'reported',
      notes: payload.notes,
      createdBy: actor.userId,
      lastModifiedBy: actor.userId,
    });

    await AuditService.log({
      action: 'aggregation.spoilage_report_created',
      resource: 'spoilage_report',
      resourceId: report._id.toString(),
      userId: actor.userId.toString(),
      organizationId: organizationId.toString(),
      risk: 'high',
    });

    return report;
  }

  async getSpoilageReport(
    reportId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<ISpoilageReport> {
    const report = await SpoilageReport.findOne({ _id: reportId, isActive: true });
    if (!report) {
      throw new NotFoundError('Spoilage report not found');
    }

    this.assertOrgAccess(report.organization as mongoose.Types.ObjectId, actor);
    return report;
  }

  async updateSpoilageReport(
    reportId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: Partial<ISpoilageReport>
  ): Promise<ISpoilageReport> {
    const report = await this.getSpoilageReport(reportId, actor);

    if (payload.status) {
      const transitions: Record<SpoilageReportStatus, SpoilageReportStatus[]> = {
        reported: ['reported', 'approved', 'closed'],
        approved: ['approved', 'closed'],
        closed: ['closed'],
      };

      if (!transitions[report.status].includes(payload.status)) {
        throw new BadRequestError(`Invalid spoilage status transition: ${report.status} -> ${payload.status}`);
      }
    }

    if (payload.batchId) {
      const batch = await AggregationBatch.findOne({
        _id: payload.batchId,
        organization: report.organization,
        isActive: true,
      });
      if (!batch) {
        throw new NotFoundError('Batch not found');
      }
    }

    const allowedUpdates: Array<keyof ISpoilageReport> = [
      'batchId',
      'quantity',
      'unit',
      'cause',
      'reportedAt',
      'reportedBy',
      'status',
      'notes',
    ];

    for (const field of allowedUpdates) {
      if (payload[field] !== undefined) {
        (report as unknown as Record<string, unknown>)[field as string] = payload[field];
      }
    }

    report.lastModifiedBy = actor.userId;
    await report.save();

    await AuditService.log({
      action: 'aggregation.spoilage_report_updated',
      resource: 'spoilage_report',
      resourceId: report._id.toString(),
      userId: actor.userId.toString(),
      organizationId: report.organization.toString(),
      risk: 'high',
    });

    return report;
  }

  async deleteSpoilageReport(
    reportId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<void> {
    const report = await this.getSpoilageReport(reportId, actor);
    await report.softDelete(actor.userId);

    await AuditService.log({
      action: 'aggregation.spoilage_report_deleted',
      resource: 'spoilage_report',
      resourceId: report._id.toString(),
      userId: actor.userId.toString(),
      organizationId: report.organization.toString(),
      risk: 'high',
    });
  }

  private mapShipmentStatusToMovementStatus(status: ShipmentStatus): StockMovementStatus {
    switch (status) {
    case 'created':
      return 'draft';
    case 'assigned':
    case 'picked_up':
    case 'in_transit':
      return 'confirmed';
    case 'delivered':
      return 'completed';
    case 'cancelled':
    case 'returned':
      return 'rejected';
    default:
      return 'draft';
    }
  }

  private mapMovementStatusToShipmentStatus(status: StockMovementStatus): ShipmentStatus {
    switch (status) {
    case 'draft':
      return 'created';
    case 'confirmed':
      return 'in_transit';
    case 'completed':
      return 'delivered';
    case 'rejected':
      return 'cancelled';
    default:
      return 'created';
    }
  }

  private mapMovementType(shipment: IShipment): StockMovementType {
    const sourceType = shipment.from?.type;
    const destinationType = shipment.to?.type;

    if (
      (sourceType === 'farm' || sourceType === 'address' || sourceType === 'other')
      && (destinationType === 'warehouse' || destinationType === 'collection_point')
    ) {
      return 'receive';
    }

    if (
      (sourceType === 'warehouse' || sourceType === 'collection_point')
      && (destinationType === 'warehouse' || destinationType === 'collection_point')
    ) {
      return 'transfer';
    }

    return 'dispatch';
  }

  private getMetadataValue(shipment: IShipment, key: string): string | undefined {
    if (!shipment.metadata) {
      return undefined;
    }

    if (shipment.metadata instanceof Map) {
      return shipment.metadata.get(key);
    }

    return (shipment.metadata as unknown as Record<string, string>)[key];
  }

  private isShipmentDeletedForAggregation(shipment: IShipment): boolean {
    return this.getMetadataValue(shipment, 'aggregationDeleted') === 'true';
  }

  private extractQuantity(shipment: IShipment): number | undefined {
    const candidates = ['quantity', 'qty', 'totalQuantity'];
    for (const key of candidates) {
      const raw = this.getMetadataValue(shipment, key);
      if (!raw) continue;
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private toStockMovement(shipment: IShipment): AggregationStockMovement {
    return {
      id: shipment._id.toString(),
      shipmentId: shipment._id.toString(),
      movementType: this.mapMovementType(shipment),
      sourceId: shipment.from?.refId?.toString(),
      destinationId: shipment.to?.refId?.toString(),
      quantity: this.extractQuantity(shipment),
      status: this.mapShipmentStatusToMovementStatus(shipment.status),
      shipmentStatus: shipment.status,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  }

  async getStockMovement(
    movementId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<AggregationStockMovement> {
    const shipment = await Shipment.findById(movementId);
    if (!shipment || this.isShipmentDeletedForAggregation(shipment)) {
      throw new NotFoundError('Stock movement not found');
    }

    this.assertOrgAccess(shipment.organization as mongoose.Types.ObjectId, actor);
    return this.toStockMovement(shipment);
  }

  async updateStockMovement(
    movementId: mongoose.Types.ObjectId,
    actor: ActorContext,
    payload: {
      status?: StockMovementStatus;
      note?: string;
      location?: string;
      quantity?: number;
    }
  ): Promise<AggregationStockMovement> {
    const shipment = await Shipment.findById(movementId);
    if (!shipment || this.isShipmentDeletedForAggregation(shipment)) {
      throw new NotFoundError('Stock movement not found');
    }

    this.assertOrgAccess(shipment.organization as mongoose.Types.ObjectId, actor);

    if (payload.status) {
      const currentStatus = this.mapShipmentStatusToMovementStatus(shipment.status);
      const transitions: Record<StockMovementStatus, StockMovementStatus[]> = {
        draft: ['draft', 'confirmed', 'rejected'],
        confirmed: ['confirmed', 'completed', 'rejected'],
        completed: ['completed'],
        rejected: ['rejected'],
      };

      if (!transitions[currentStatus].includes(payload.status)) {
        throw new BadRequestError(`Invalid stock movement transition: ${currentStatus} -> ${payload.status}`);
      }

      shipment.status = this.mapMovementStatusToShipmentStatus(payload.status);
    }

    if (payload.quantity !== undefined) {
      if (!shipment.metadata) {
        shipment.metadata = {};
      }

      if (shipment.metadata instanceof Map) {
        shipment.metadata.set('quantity', String(payload.quantity));
      } else {
        (shipment.metadata as unknown as Record<string, string>).quantity = String(payload.quantity);
      }
    }

    shipment.trackingEvents.push({
      status: shipment.status,
      note: payload.note || 'Stock movement updated via aggregation workspace',
      location: payload.location,
      updatedBy: actor.userId,
      timestamp: new Date(),
    });

    await shipment.save();

    await AuditService.log({
      action: 'aggregation.stock_movement_updated',
      resource: 'stock_movement',
      resourceId: shipment._id.toString(),
      userId: actor.userId.toString(),
      organizationId: shipment.organization?.toString(),
      details: {
        metadata: {
          status: payload.status,
          note: payload.note,
          location: payload.location,
        },
      },
    });

    return this.toStockMovement(shipment);
  }

  async deleteStockMovement(
    movementId: mongoose.Types.ObjectId,
    actor: ActorContext
  ): Promise<void> {
    const shipment = await Shipment.findById(movementId);
    if (!shipment || this.isShipmentDeletedForAggregation(shipment)) {
      throw new NotFoundError('Stock movement not found');
    }

    this.assertOrgAccess(shipment.organization as mongoose.Types.ObjectId, actor);

    if (!shipment.metadata) {
      shipment.metadata = {};
    }

    if (shipment.metadata instanceof Map) {
      shipment.metadata.set('aggregationDeleted', 'true');
      shipment.metadata.set('aggregationDeletedAt', new Date().toISOString());
      shipment.metadata.set('aggregationDeletedBy', actor.userId.toString());
    } else {
      const metadata = shipment.metadata as unknown as Record<string, string>;
      metadata.aggregationDeleted = 'true';
      metadata.aggregationDeletedAt = new Date().toISOString();
      metadata.aggregationDeletedBy = actor.userId.toString();
    }

    shipment.status = 'cancelled';
    shipment.trackingEvents.push({
      status: 'cancelled',
      note: 'Stock movement deleted from aggregation workspace',
      updatedBy: actor.userId,
      timestamp: new Date(),
    });

    await shipment.save();

    await AuditService.log({
      action: 'aggregation.stock_movement_deleted',
      resource: 'stock_movement',
      resourceId: shipment._id.toString(),
      userId: actor.userId.toString(),
      organizationId: shipment.organization?.toString(),
      risk: 'high',
    });
  }
}

export default new AggregationService();
