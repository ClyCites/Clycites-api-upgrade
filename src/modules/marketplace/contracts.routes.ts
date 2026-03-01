import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import MarketplaceContractsController from './contracts.controller';
import {
  contractIdValidator,
  createContractValidator,
  listContractsValidator,
  signContractValidator,
  updateContractValidator,
} from './contracts.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/contracts',
  validate(listContractsValidator),
  MarketplaceContractsController.listContracts
);

router.post(
  '/contracts',
  authorize('buyer', 'farmer', 'trader', 'admin', 'platform_admin', 'super_admin'),
  validate(createContractValidator),
  MarketplaceContractsController.createContract
);

router.get(
  '/contracts/:contractId',
  validate(contractIdValidator),
  MarketplaceContractsController.getContract
);

router.patch(
  '/contracts/:contractId',
  authorize('buyer', 'farmer', 'trader', 'admin', 'platform_admin', 'super_admin'),
  validate(updateContractValidator),
  MarketplaceContractsController.updateContract
);

router.delete(
  '/contracts/:contractId',
  authorize('buyer', 'farmer', 'trader', 'admin', 'platform_admin', 'super_admin'),
  validate(contractIdValidator),
  MarketplaceContractsController.deleteContract
);

router.post(
  '/contracts/:contractId/sign',
  authorize('buyer', 'farmer', 'trader', 'admin', 'platform_admin', 'super_admin'),
  validate(signContractValidator),
  MarketplaceContractsController.signContract
);

export default router;
