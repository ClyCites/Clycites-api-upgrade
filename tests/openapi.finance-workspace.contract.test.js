const { openApiSpec } = require('../dist/common/docs');

describe('OpenAPI finance workspace contract coverage', () => {
  test('payments + finance workspace endpoints are present', () => {
    expect(openApiSpec.paths['/api/v1/payments/wallet']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/wallet/deposit']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/wallet/withdraw']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/transactions']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/escrow']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/escrow/initiate']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/escrow/{escrowId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/escrow/{escrowId}/release']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/escrow/{escrowId}/refund']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/payouts']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/payouts/{payoutId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/payouts/{payoutId}/approve']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/payments/payouts/{payoutId}/fail']).toBeDefined();

    expect(openApiSpec.paths['/api/v1/finance/invoices']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/invoices/{invoiceId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/invoices/{invoiceId}/export']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/credits']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/credits/{creditId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/credits/{creditId}/approve']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/credits/{creditId}/reject']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/credits/{creditId}/disburse']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/insurance/policies']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/insurance/policies/{policyId}']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/insurance/policies/{policyId}/claims']).toBeDefined();
    expect(openApiSpec.paths['/api/v1/finance/insurance/claims/{claimId}']).toBeDefined();
  });

  test('finance and payments schemas document frontend-aligned status enums', () => {
    const walletSchema = openApiSpec.components.schemas.PaymentWallet;
    const transactionSchema = openApiSpec.components.schemas.PaymentTransaction;
    const escrowSchema = openApiSpec.components.schemas.PaymentEscrow;
    const payoutSchema = openApiSpec.components.schemas.PaymentPayout;
    const invoiceSchema = openApiSpec.components.schemas.FinanceInvoice;
    const creditSchema = openApiSpec.components.schemas.FinanceCredit;
    const policySchema = openApiSpec.components.schemas.FinanceInsurancePolicy;
    const claimSchema = openApiSpec.components.schemas.FinanceInsuranceClaim;

    expect(walletSchema.properties.uiStatus.enum).toEqual(['active', 'frozen']);
    expect(transactionSchema.properties.uiStatus.enum).toEqual(['pending', 'completed', 'failed', 'reversed']);
    expect(escrowSchema.properties.uiStatus.enum).toEqual(['created', 'funded', 'released', 'refunded', 'closed']);
    expect(payoutSchema.properties.status.enum).toEqual(['requested', 'processing', 'paid', 'failed']);
    expect(invoiceSchema.properties.status.enum).toEqual(['draft', 'issued', 'paid', 'overdue', 'cancelled']);
    expect(creditSchema.properties.status.enum).toEqual(['applied', 'under_review', 'approved', 'rejected', 'disbursed']);
    expect(policySchema.properties.status.enum).toEqual(['active', 'claim_open', 'claim_resolved', 'expired']);
    expect(claimSchema.properties.status.enum).toEqual(['open', 'under_review', 'resolved', 'rejected']);
  });

  test('transition-sensitive endpoints document status transition behavior', () => {
    const payoutPatch = openApiSpec.paths['/api/v1/payments/payouts/{payoutId}'].patch;
    const creditPatch = openApiSpec.paths['/api/v1/finance/credits/{creditId}'].patch;
    const invoicePatch = openApiSpec.paths['/api/v1/finance/invoices/{invoiceId}'].patch;
    const policyPatch = openApiSpec.paths['/api/v1/finance/insurance/policies/{policyId}'].patch;
    const claimPatch = openApiSpec.paths['/api/v1/finance/insurance/claims/{claimId}'].patch;

    expect(payoutPatch.description).toContain('status transition');
    expect(creditPatch.description).toContain('status transition');
    expect(invoicePatch.description).toContain('status transition');
    expect(policyPatch.description).toContain('status transition');
    expect(claimPatch.description).toContain('status transition');
  });
});
