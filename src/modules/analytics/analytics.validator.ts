import { query, body, param } from 'express-validator';
import { DatasetId, ChartType, ShareScope, FilterOperator, MetricType, DimensionType } from './analytics.types';

export const analyticsQueryValidator = [
  query('days').optional().isInt({ min:1, max:365 }).withMessage('days must be 1-365'),
  query('product').optional().isMongoId(),
  query('region').optional().isString().trim(),
  query('category').optional().isString().trim(),
  query('page').optional().isInt({ min:1 }),
  query('limit').optional().isInt({ min:1, max:100 }),
];

export const farmerIdValidator = [
  param('farmerId').isMongoId().withMessage('Invalid farmerId'),
];

export const orgIdValidator = [
  param('orgId').isMongoId().withMessage('Invalid orgId'),
];

export const chartIdValidator = [
  param('id').isMongoId().withMessage('Invalid chart id'),
];

export const dashboardIdValidator = [
  param('id').isMongoId().withMessage('Invalid dashboard id'),
];

export const chartDefinitionValidator = [
  body('definition.datasetId').isIn(Object.values(DatasetId)).withMessage('Invalid datasetId'),
  body('definition.metrics').isArray({ min:1 }).withMessage('metrics must be a non-empty array'),
  body('definition.metrics.*.type').isIn(Object.values(MetricType)).withMessage('Invalid metric type'),
  body('definition.dimensions').optional().isArray(),
  body('definition.dimensions.*.type').optional().isIn(Object.values(DimensionType)).withMessage('Invalid dimension type'),
  body('definition.chartType').isIn(Object.values(ChartType)).withMessage('Invalid chartType'),
  body('definition.filters').optional().isArray(),
  body('definition.filters.*.operator').optional().isIn(Object.values(FilterOperator)).withMessage('Invalid filter operator'),
  body('name').notEmpty().trim().withMessage('name required'),
  body('shareScope').optional().isIn(Object.values(ShareScope)),
  body('tags').optional().isArray(),
  body('tags.*').optional().isString(),
];

export const previewChartValidator = [
  body('datasetId').isIn(Object.values(DatasetId)).withMessage('Invalid datasetId'),
  body('metrics').isArray({ min:1 }).withMessage('metrics required'),
  body('metrics.*.type').isIn(Object.values(MetricType)).withMessage('Invalid metric type'),
  body('chartType').isIn(Object.values(ChartType)).withMessage('Invalid chartType'),
];

export const updateChartValidator = [
  body('name').optional().trim().notEmpty(),
  body('description').optional().isString(),
  body('shareScope').optional().isIn(Object.values(ShareScope)),
  body('tags').optional().isArray(),
  body('definition.datasetId').optional().isIn(Object.values(DatasetId)),
  body('definition.metrics').optional().isArray({ min:1 }),
  body('definition.chartType').optional().isIn(Object.values(ChartType)),
];

export const dashboardValidator = [
  body('name').notEmpty().trim().withMessage('name required'),
  body('description').optional().isString(),
  body('shareScope').optional().isIn(Object.values(ShareScope)),
  body('orgId').optional().isMongoId(),
  body('templateCategory').optional().isString(),
  body('tags').optional().isArray(),
  body('isDefault').optional().isBoolean(),
];

export const addChartToDashboardValidator = [
  body('chartId').isMongoId().withMessage('chartId must be a valid id'),
  body('position.col').isInt({ min:0, max:11 }).withMessage('position.col 0-11'),
  body('position.row').isInt({ min:0 }).withMessage('position.row >=0'),
  body('size.w').isInt({ min:1, max:12 }).withMessage('size.w 1-12'),
  body('size.h').isInt({ min:1 }).withMessage('size.h >=1'),
];

export const updateSharingValidator = [
  body('scope').isIn(Object.values(ShareScope)).withMessage('Invalid scope'),
  body('roles').optional().isArray(),
  body('roles.*').optional().isString(),
  body('userIds').optional().isArray(),
  body('userIds.*').optional().isMongoId(),
];

export const exportValidator = [
  body('format').optional().isIn(['csv','json']).withMessage('format must be csv or json'),
  query('format').optional().isIn(['csv','json']),
  body('filename').optional().isString().trim(),
];

export const paginationValidator = [
  query('page').optional().isInt({ min:1 }),
  query('limit').optional().isInt({ min:1, max:100 }),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc','desc']),
];
