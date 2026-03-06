import { body, param, query } from 'express-validator';

const invoiceStatuses = ['draft', 'issued', 'paid', 'overdue', 'cancelled'];
const creditStatuses = ['applied', 'under_review', 'approved', 'rejected', 'disbursed'];
const policyStatuses = ['active', 'claim_open', 'claim_resolved', 'expired'];
const claimStatuses = ['open', 'under_review', 'resolved', 'rejected'];

export const invoiceIdValidator = [
  param('invoiceId').isMongoId().withMessage('invoiceId must be a valid ID'),
];

export const creditIdValidator = [
  param('creditId').isMongoId().withMessage('creditId must be a valid ID'),
];

export const policyIdValidator = [
  param('policyId').isMongoId().withMessage('policyId must be a valid ID'),
];

export const claimIdValidator = [
  param('claimId').isMongoId().withMessage('claimId must be a valid ID'),
];

export const listInvoicesValidator = [
  query('organizationId').optional().isMongoId(),
  query('status').optional().isIn(invoiceStatuses),
  query('invoiceNumber').optional().trim().isLength({ min: 2, max: 80 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createInvoiceValidator = [
  body('organizationId').optional().isMongoId(),
  body('customerId').optional().isMongoId(),
  body('customerName').trim().isLength({ min: 2, max: 160 }),
  body('items').optional().isArray({ max: 200 }),
  body('items.*.description').optional().trim().isLength({ min: 2, max: 300 }),
  body('items.*.quantity').optional().isFloat({ gt: 0 }).toFloat(),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }).toFloat(),
  body('items.*.lineTotal').optional().isFloat({ min: 0 }).toFloat(),
  body('amount').optional().isFloat({ min: 0 }).toFloat(),
  body('currency').optional().trim().isLength({ min: 2, max: 8 }),
  body('dueDate').isISO8601().withMessage('dueDate must be an ISO8601 date'),
  body('status').optional().isIn(invoiceStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const updateInvoiceValidator = [
  ...invoiceIdValidator,
  body('customerId').optional().isMongoId(),
  body('customerName').optional().trim().isLength({ min: 2, max: 160 }),
  body('items').optional().isArray({ max: 200 }),
  body('items.*.description').optional().trim().isLength({ min: 2, max: 300 }),
  body('items.*.quantity').optional().isFloat({ gt: 0 }).toFloat(),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }).toFloat(),
  body('items.*.lineTotal').optional().isFloat({ min: 0 }).toFloat(),
  body('amount').optional().isFloat({ min: 0 }).toFloat(),
  body('currency').optional().trim().isLength({ min: 2, max: 8 }),
  body('dueDate').optional().isISO8601(),
  body('status').optional().isIn(invoiceStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const exportInvoiceValidator = [
  ...invoiceIdValidator,
  body('format').optional().isIn(['pdf', 'csv', 'json']),
];

export const listCreditsValidator = [
  query('organizationId').optional().isMongoId(),
  query('status').optional().isIn(creditStatuses),
  query('referenceCode').optional().trim().isLength({ min: 2, max: 80 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createCreditValidator = [
  body('organizationId').optional().isMongoId(),
  body('applicantId').optional().isMongoId(),
  body('applicantName').trim().isLength({ min: 2, max: 160 }),
  body('amountRequested').isFloat({ gt: 0 }).toFloat(),
  body('currency').optional().trim().isLength({ min: 2, max: 8 }),
  body('purpose').optional().trim().isLength({ max: 1000 }),
  body('termMonths').optional().isInt({ min: 1, max: 600 }).toInt(),
  body('interestRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body('status').optional().isIn(creditStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const updateCreditValidator = [
  ...creditIdValidator,
  body('applicantId').optional().isMongoId(),
  body('applicantName').optional().trim().isLength({ min: 2, max: 160 }),
  body('amountRequested').optional().isFloat({ gt: 0 }).toFloat(),
  body('amountApproved').optional().isFloat({ gt: 0 }).toFloat(),
  body('currency').optional().trim().isLength({ min: 2, max: 8 }),
  body('purpose').optional().trim().isLength({ max: 1000 }),
  body('termMonths').optional().isInt({ min: 1, max: 600 }).toInt(),
  body('interestRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body('status').optional().isIn(creditStatuses),
  body('rejectionReason').optional().trim().isLength({ max: 1000 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const approveCreditValidator = [
  ...creditIdValidator,
  body('amountApproved').optional().isFloat({ gt: 0 }).toFloat(),
];

export const rejectCreditValidator = [
  ...creditIdValidator,
  body('reason').optional().trim().isLength({ max: 1000 }),
  body('rejectionReason').optional().trim().isLength({ max: 1000 }),
];

export const disburseCreditValidator = [
  ...creditIdValidator,
];

export const listInsurancePoliciesValidator = [
  query('organizationId').optional().isMongoId(),
  query('status').optional().isIn(policyStatuses),
  query('policyNumber').optional().trim().isLength({ min: 2, max: 80 }),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createInsurancePolicyValidator = [
  body('organizationId').optional().isMongoId(),
  body('insuredEntityId').optional().isMongoId(),
  body('insuredEntityName').trim().isLength({ min: 2, max: 160 }),
  body('providerName').trim().isLength({ min: 2, max: 160 }),
  body('coverageType').trim().isLength({ min: 2, max: 120 }),
  body('premiumAmount').isFloat({ min: 0 }).toFloat(),
  body('coverageAmount').isFloat({ min: 0 }).toFloat(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('status').optional().isIn(policyStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const updateInsurancePolicyValidator = [
  ...policyIdValidator,
  body('insuredEntityId').optional().isMongoId(),
  body('insuredEntityName').optional().trim().isLength({ min: 2, max: 160 }),
  body('providerName').optional().trim().isLength({ min: 2, max: 160 }),
  body('coverageType').optional().trim().isLength({ min: 2, max: 120 }),
  body('premiumAmount').optional().isFloat({ min: 0 }).toFloat(),
  body('coverageAmount').optional().isFloat({ min: 0 }).toFloat(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('status').optional().isIn(policyStatuses),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('metadata').optional().isObject(),
];

export const createInsuranceClaimValidator = [
  ...policyIdValidator,
  body('amountClaimed').isFloat({ gt: 0 }).toFloat(),
  body('reason').trim().isLength({ min: 3, max: 1000 }),
  body('status').optional().isIn(claimStatuses),
  body('metadata').optional().isObject(),
];

export const updateInsuranceClaimValidator = [
  ...claimIdValidator,
  body('status').optional().isIn(claimStatuses),
  body('amountApproved').optional().isFloat({ min: 0 }).toFloat(),
  body('resolutionNote').optional().trim().isLength({ max: 1000 }),
  body('reason').optional().trim().isLength({ min: 3, max: 1000 }),
  body('metadata').optional().isObject(),
];
