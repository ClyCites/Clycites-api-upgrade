import { Router } from 'express';
import productController from './product.controller';
import { validate } from '../../common/middleware/validate';
import {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
} from './product.validator';

const router = Router();

router.post('/', validate(createProductValidator), productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', validate(productIdValidator), productController.getProductById);
router.put('/:id', validate(updateProductValidator), productController.updateProduct);
router.delete('/:id', validate(productIdValidator), productController.deleteProduct);

export default router;
