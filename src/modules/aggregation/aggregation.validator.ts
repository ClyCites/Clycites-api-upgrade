import { body, param, query } from 'express-validator';

export const warehouseIdValidator = [
  param('warehouseId')
    .isMongoId()
    .withMessage('warehouseId must be a valid MongoDB ObjectId'),
];

export const binIdValidator = [
  param('binId')
    .isMongoId()
    .withMessage('binId must be a valid MongoDB ObjectId'),
];

export const batchIdValidator = [
  param('batchId')
    .isMongoId()
    .withMessage('batchId must be a valid MongoDB ObjectId'),
];

export const gradeIdValidator = [
  param('gradeId')
    .isMongoId()
    .withMessage('gradeId must be a valid MongoDB ObjectId'),
];

export const movementIdValidator = [
  param('movementId')
    .isMongoId()
    .withMessage('movementId must be a valid MongoDB ObjectId'),
];

export const spoilageReportIdValidator = [
  param('reportId')
    .isMongoId()
    .withMessage('reportId must be a valid MongoDB ObjectId'),
];

export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

export const listStorageBinsValidator = [
  ...warehouseIdValidator,
  ...paginationValidator,
  query('status')
    .optional()
    .isIn(['available', 'occupied', 'maintenance'])
    .withMessage('status must be available, occupied, or maintenance'),
  query('search')
    .optional()
    .isString()
    .withMessage('search must be a string'),
];

export const createStorageBinValidator = [
  ...warehouseIdValidator,
  body('name')
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('name must be between 2 and 160 characters'),
  body('capacity')
    .isFloat({ min: 0 })
    .withMessage('capacity must be a non-negative number'),
  body('capacityUnit')
    .optional()
    .isIn(['kg', 'tons', 'bags', 'liters', 'units'])
    .withMessage('capacityUnit must be one of kg, tons, bags, liters, units'),
  body('temperatureControl')
    .optional()
    .isBoolean()
    .withMessage('temperatureControl must be boolean'),
  body('currentLoad')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('currentLoad must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['available', 'occupied', 'maintenance'])
    .withMessage('status must be available, occupied, or maintenance'),
  body('notes')
    .optional()
    .isString()
    .withMessage('notes must be a string'),
];

export const updateStorageBinValidator = [
  ...binIdValidator,
  body('name').optional().trim().isLength({ min: 2, max: 160 }),
  body('capacity').optional().isFloat({ min: 0 }),
  body('capacityUnit').optional().isIn(['kg', 'tons', 'bags', 'liters', 'units']),
  body('temperatureControl').optional().isBoolean(),
  body('currentLoad').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['available', 'occupied', 'maintenance']),
  body('notes').optional().isString(),
];

export const listBatchesValidator = [
  ...paginationValidator,
  query('status')
    .optional()
    .isIn(['received', 'stored', 'dispatched', 'closed'])
    .withMessage('status must be received, stored, dispatched, or closed'),
  query('commodity').optional().isString(),
  query('warehouseId').optional().isMongoId(),
  query('binId').optional().isMongoId(),
  query('organizationId').optional().isMongoId(),
];

export const createBatchValidator = [
  body('commodity')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('commodity must be between 2 and 120 characters'),
  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('quantity must be a non-negative number'),
  body('unit')
    .isIn(['kg', 'tons', 'bags', 'liters', 'units'])
    .withMessage('unit must be one of kg, tons, bags, liters, units'),
  body('grade').optional().isString(),
  body('warehouseId').isMongoId().withMessage('warehouseId must be a valid MongoDB ObjectId'),
  body('binId').optional().isMongoId().withMessage('binId must be a valid MongoDB ObjectId'),
  body('receivedAt').optional().isISO8601().withMessage('receivedAt must be a valid ISO date'),
  body('status')
    .optional()
    .isIn(['received', 'stored', 'dispatched', 'closed'])
    .withMessage('status must be received, stored, dispatched, or closed'),
  body('notes').optional().isString(),
];

export const updateBatchValidator = [
  ...batchIdValidator,
  body('commodity').optional().trim().isLength({ min: 2, max: 120 }),
  body('quantity').optional().isFloat({ min: 0 }),
  body('unit').optional().isIn(['kg', 'tons', 'bags', 'liters', 'units']),
  body('grade').optional().isString(),
  body('warehouseId').optional().isMongoId(),
  body('binId').optional().isMongoId(),
  body('receivedAt').optional().isISO8601(),
  body('status').optional().isIn(['received', 'stored', 'dispatched', 'closed']),
  body('notes').optional().isString(),
];

export const listQualityGradesValidator = [
  ...paginationValidator,
  query('batchId').optional().isMongoId(),
  query('status').optional().isIn(['draft', 'verified', 'final']),
  query('grade').optional().isString(),
  query('organizationId').optional().isMongoId(),
];

export const createQualityGradeValidator = [
  body('batchId').isMongoId().withMessage('batchId must be a valid MongoDB ObjectId'),
  body('grade').trim().isLength({ min: 1, max: 80 }).withMessage('grade is required'),
  body('notes').optional().isString(),
  body('assessedBy').optional().isMongoId(),
  body('assessedAt').optional().isISO8601(),
  body('status').optional().isIn(['draft', 'verified', 'final']),
];

export const updateQualityGradeValidator = [
  ...gradeIdValidator,
  body('batchId').optional().isMongoId(),
  body('grade').optional().trim().isLength({ min: 1, max: 80 }),
  body('notes').optional().isString(),
  body('assessedBy').optional().isMongoId(),
  body('assessedAt').optional().isISO8601(),
  body('status').optional().isIn(['draft', 'verified', 'final']),
];

export const updateStockMovementValidator = [
  ...movementIdValidator,
  body('status')
    .optional()
    .isIn(['draft', 'confirmed', 'completed', 'rejected'])
    .withMessage('status must be draft, confirmed, completed, or rejected'),
  body('note').optional().isString(),
  body('location').optional().isString(),
  body('quantity').optional().isFloat({ min: 0 }),
];

export const listSpoilageReportsValidator = [
  ...paginationValidator,
  query('batchId').optional().isMongoId(),
  query('status').optional().isIn(['reported', 'approved', 'closed']),
  query('organizationId').optional().isMongoId(),
];

export const createSpoilageReportValidator = [
  body('batchId').isMongoId().withMessage('batchId must be a valid MongoDB ObjectId'),
  body('quantity').isFloat({ min: 0 }).withMessage('quantity must be a non-negative number'),
  body('unit').isIn(['kg', 'tons', 'bags', 'liters', 'units']).withMessage('invalid unit'),
  body('cause')
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('cause must be between 2 and 500 characters'),
  body('reportedAt').optional().isISO8601(),
  body('reportedBy').optional().isMongoId(),
  body('status').optional().isIn(['reported', 'approved', 'closed']),
  body('notes').optional().isString(),
];

export const updateSpoilageReportValidator = [
  ...spoilageReportIdValidator,
  body('batchId').optional().isMongoId(),
  body('quantity').optional().isFloat({ min: 0 }),
  body('unit').optional().isIn(['kg', 'tons', 'bags', 'liters', 'units']),
  body('cause').optional().trim().isLength({ min: 2, max: 500 }),
  body('reportedAt').optional().isISO8601(),
  body('reportedBy').optional().isMongoId(),
  body('status').optional().isIn(['reported', 'approved', 'closed']),
  body('notes').optional().isString(),
];
