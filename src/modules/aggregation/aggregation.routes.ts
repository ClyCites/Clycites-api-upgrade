import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import AggregationController from './aggregation.controller';
import {
  batchIdValidator,
  binIdValidator,
  createBatchValidator,
  createQualityGradeValidator,
  createSpoilageReportValidator,
  createStorageBinValidator,
  gradeIdValidator,
  listBatchesValidator,
  listQualityGradesValidator,
  listSpoilageReportsValidator,
  listStorageBinsValidator,
  movementIdValidator,
  spoilageReportIdValidator,
  updateBatchValidator,
  updateQualityGradeValidator,
  updateSpoilageReportValidator,
  updateStockMovementValidator,
  updateStorageBinValidator,
} from './aggregation.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/warehouses/:warehouseId/bins',
  validate(listStorageBinsValidator),
  AggregationController.listStorageBins
);

router.post(
  '/warehouses/:warehouseId/bins',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(createStorageBinValidator),
  AggregationController.createStorageBin
);

router.get(
  '/bins/:binId',
  validate(binIdValidator),
  AggregationController.getStorageBin
);

router.patch(
  '/bins/:binId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateStorageBinValidator),
  AggregationController.updateStorageBin
);

router.delete(
  '/bins/:binId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(binIdValidator),
  AggregationController.deleteStorageBin
);

router.get(
  '/batches',
  validate(listBatchesValidator),
  AggregationController.listBatches
);

router.post(
  '/batches',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(createBatchValidator),
  AggregationController.createBatch
);

router.get(
  '/batches/:batchId',
  validate(batchIdValidator),
  AggregationController.getBatch
);

router.patch(
  '/batches/:batchId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateBatchValidator),
  AggregationController.updateBatch
);

router.delete(
  '/batches/:batchId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(batchIdValidator),
  AggregationController.deleteBatch
);

router.get(
  '/quality-grades',
  validate(listQualityGradesValidator),
  AggregationController.listQualityGrades
);

router.post(
  '/quality-grades',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(createQualityGradeValidator),
  AggregationController.createQualityGrade
);

router.get(
  '/quality-grades/:gradeId',
  validate(gradeIdValidator),
  AggregationController.getQualityGrade
);

router.patch(
  '/quality-grades/:gradeId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateQualityGradeValidator),
  AggregationController.updateQualityGrade
);

router.delete(
  '/quality-grades/:gradeId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(gradeIdValidator),
  AggregationController.deleteQualityGrade
);

router.get(
  '/stock-movements/:movementId',
  validate(movementIdValidator),
  AggregationController.getStockMovement
);

router.patch(
  '/stock-movements/:movementId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateStockMovementValidator),
  AggregationController.updateStockMovement
);

router.delete(
  '/stock-movements/:movementId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(movementIdValidator),
  AggregationController.deleteStockMovement
);

router.get(
  '/spoilage-reports',
  validate(listSpoilageReportsValidator),
  AggregationController.listSpoilageReports
);

router.post(
  '/spoilage-reports',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(createSpoilageReportValidator),
  AggregationController.createSpoilageReport
);

router.get(
  '/spoilage-reports/:reportId',
  validate(spoilageReportIdValidator),
  AggregationController.getSpoilageReport
);

router.patch(
  '/spoilage-reports/:reportId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(updateSpoilageReportValidator),
  AggregationController.updateSpoilageReport
);

router.delete(
  '/spoilage-reports/:reportId',
  authorize('admin', 'platform_admin', 'super_admin', 'trader'),
  validate(spoilageReportIdValidator),
  AggregationController.deleteSpoilageReport
);

export default router;
