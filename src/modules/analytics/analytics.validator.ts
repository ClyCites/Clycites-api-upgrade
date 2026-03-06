import { query, body, param } from 'express-validator';
import { DatasetId, ChartType, ShareScope, FilterOperator, MetricType, DimensionType } from './analytics.types';

const chartStatuses = ['draft', 'published', 'archived'];
const dashboardStatuses = ['draft', 'published', 'archived'];
const datasetStatuses = ['active', 'deprecated'];
const reportStatuses = ['generated', 'exported', 'archived'];

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

export const templateIdValidator = [
  param('id').isMongoId().withMessage('Invalid template id'),
];

export const datasetIdValidator = [
  param('id').isString().trim().notEmpty().withMessage('Invalid dataset id'),
];

export const reportIdValidator = [
  param('id').isMongoId().withMessage('Invalid report id'),
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
  body('status').optional().isIn(chartStatuses),
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
  body('status').optional().isIn(dashboardStatuses),
];

export const updateDashboardValidator = [
  body('name').optional().trim().notEmpty(),
  body('description').optional().isString(),
  body('tags').optional().isArray(),
  body('tags.*').optional().isString(),
  body('isDefault').optional().isBoolean(),
  body('status').optional().isIn(dashboardStatuses),
];

export const addChartToDashboardValidator = [
  body('chartId').isMongoId().withMessage('chartId must be a valid id'),
  body('position.col').isInt({ min:0, max:11 }).withMessage('position.col 0-11'),
  body('position.row').isInt({ min:0 }).withMessage('position.row >=0'),
  body('size.w').isInt({ min:1, max:12 }).withMessage('size.w 1-12'),
  body('size.h').isInt({ min:1 }).withMessage('size.h >=1'),
];

export const reorderChartsValidator = [
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.chartId').isMongoId().withMessage('items.chartId must be a valid id'),
  body('items.*.position.col').isInt({ min: 0, max: 11 }).withMessage('items.position.col 0-11'),
  body('items.*.position.row').isInt({ min: 0 }).withMessage('items.position.row >=0'),
  body('items.*.size.w').isInt({ min: 1, max: 12 }).withMessage('items.size.w 1-12'),
  body('items.*.size.h').isInt({ min: 1 }).withMessage('items.size.h >=1'),
  body('items.*.title').optional().isString(),
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
  query('status').optional().isString(),
  query('uiStatus').optional().isString(),
];

export const datasetCreateValidator = [
  body('name').isString().trim().notEmpty().withMessage('name required'),
  body('description').optional().isString(),
  body('sourceDatasetId').optional().isString(),
  body('orgId').optional().isMongoId(),
  body('status').optional().isIn(datasetStatuses),
  body('tags').optional().isArray(),
  body('fields').optional().isArray(),
  body('fields.*.name').optional().isString().trim().notEmpty(),
  body('fields.*.type').optional().isIn(['string', 'number', 'date', 'boolean', 'objectId']),
  body('fields.*.description').optional().isString(),
  body('fields.*.filterable').optional().isBoolean(),
  body('fields.*.sortable').optional().isBoolean(),
  body('metadata').optional().isObject(),
];

export const datasetUpdateValidator = [
  body('name').optional().isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('sourceDatasetId').optional().isString(),
  body('status').optional().isIn(datasetStatuses),
  body('tags').optional().isArray(),
  body('fields').optional().isArray(),
  body('fields.*.name').optional().isString().trim().notEmpty(),
  body('fields.*.type').optional().isIn(['string', 'number', 'date', 'boolean', 'objectId']),
  body('fields.*.description').optional().isString(),
  body('fields.*.filterable').optional().isBoolean(),
  body('fields.*.sortable').optional().isBoolean(),
  body('metadata').optional().isObject(),
];

export const reportCreateValidator = [
  body('name').isString().trim().notEmpty().withMessage('name required'),
  body('description').optional().isString(),
  body('chartIds').optional().isArray(),
  body('chartIds.*').optional().isMongoId(),
  body('dashboardId').optional().isMongoId(),
  body('datasetId').optional().isString(),
  body('outputFormat').optional().isIn(['csv', 'json']),
  body('filters').optional().isObject(),
  body('metadata').optional().isObject(),
  body('orgId').optional().isMongoId(),
];

export const reportUpdateValidator = [
  body('name').optional().isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('chartIds').optional().isArray(),
  body('chartIds.*').optional().isMongoId(),
  body('dashboardId').optional().isMongoId(),
  body('datasetId').optional().isString(),
  body('outputFormat').optional().isIn(['csv', 'json']),
  body('filters').optional().isObject(),
  body('metadata').optional().isObject(),
  body('status').optional().isIn(reportStatuses),
];

export const reportExportValidator = [
  body('format').optional().isIn(['csv', 'json']),
  body('metadata').optional().isObject(),
];
