import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import FinanceController from './finance.controller';
import {
  listInvoicesValidator,
  createInvoiceValidator,
  invoiceIdValidator,
  updateInvoiceValidator,
  exportInvoiceValidator,
  listCreditsValidator,
  createCreditValidator,
  creditIdValidator,
  updateCreditValidator,
  approveCreditValidator,
  rejectCreditValidator,
  disburseCreditValidator,
  listInsurancePoliciesValidator,
  createInsurancePolicyValidator,
  policyIdValidator,
  updateInsurancePolicyValidator,
  createInsuranceClaimValidator,
  updateInsuranceClaimValidator,
} from './finance.validator';

const router = Router();

router.use(authenticate);

router.get('/invoices', validate(listInvoicesValidator), FinanceController.listInvoices);
router.post('/invoices', validate(createInvoiceValidator), FinanceController.createInvoice);
router.get('/invoices/:invoiceId', validate(invoiceIdValidator), FinanceController.getInvoice);
router.patch('/invoices/:invoiceId', validate(updateInvoiceValidator), FinanceController.updateInvoice);
router.delete('/invoices/:invoiceId', validate(invoiceIdValidator), FinanceController.deleteInvoice);
router.post('/invoices/:invoiceId/export', validate(exportInvoiceValidator), FinanceController.exportInvoice);

router.get('/credits', validate(listCreditsValidator), FinanceController.listCredits);
router.post('/credits', validate(createCreditValidator), FinanceController.createCredit);
router.get('/credits/:creditId', validate(creditIdValidator), FinanceController.getCredit);
router.patch('/credits/:creditId', validate(updateCreditValidator), FinanceController.updateCredit);
router.delete('/credits/:creditId', validate(creditIdValidator), FinanceController.deleteCredit);
router.post(
  '/credits/:creditId/approve',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(approveCreditValidator),
  FinanceController.approveCredit
);
router.post(
  '/credits/:creditId/reject',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(rejectCreditValidator),
  FinanceController.rejectCredit
);
router.post(
  '/credits/:creditId/disburse',
  authorize('admin', 'platform_admin', 'super_admin'),
  validate(disburseCreditValidator),
  FinanceController.disburseCredit
);

router.get('/insurance/policies', validate(listInsurancePoliciesValidator), FinanceController.listInsurancePolicies);
router.post('/insurance/policies', validate(createInsurancePolicyValidator), FinanceController.createInsurancePolicy);
router.get('/insurance/policies/:policyId', validate(policyIdValidator), FinanceController.getInsurancePolicy);
router.patch('/insurance/policies/:policyId', validate(updateInsurancePolicyValidator), FinanceController.updateInsurancePolicy);
router.delete('/insurance/policies/:policyId', validate(policyIdValidator), FinanceController.deleteInsurancePolicy);
router.post('/insurance/policies/:policyId/claims', validate(createInsuranceClaimValidator), FinanceController.createInsuranceClaim);
router.patch('/insurance/claims/:claimId', validate(updateInsuranceClaimValidator), FinanceController.updateInsuranceClaim);

export default router;
