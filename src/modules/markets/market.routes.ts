import { Router } from 'express';
import marketController from './market.controller';
import { validate } from '../../common/middleware/validate';
import {
  createMarketValidator,
  updateMarketValidator,
  marketIdValidator,
  marketIdParamValidator,
} from './market.validator';

const router = Router();

router.post('/', validate(createMarketValidator), marketController.createMarket);
router.get('/', marketController.getMarkets);
router.get('/:id', validate(marketIdValidator), marketController.getMarketById);
router.put('/:id', validate(updateMarketValidator), marketController.updateMarket);
router.delete('/:id', validate(marketIdValidator), marketController.deleteMarket);
router.get('/:marketId/prices', validate(marketIdParamValidator), marketController.getPricesForMarket);

export default router;
