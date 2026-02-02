import { Router } from 'express';
import productController from './product.controller';
import { authenticate, optionalAuth } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  categoryValidator,
} from './product.validator';

const router = Router();

// Public routes (optional auth)
router.get('/', optionalAuth, productController.getAllProducts);

router.get(
  '/category/:category',
  optionalAuth,
  validate(categoryValidator),
  productController.getProductsByCategory
);

router.get(
  '/:id',
  optionalAuth,
  validate(productIdValidator),
  productController.getProductById
);

// Protected routes (admin only)
router.use(authenticate);

router.post(
  '/',
  authorize('admin'),
  validate(createProductValidator),
  productController.createProduct
);

router.put(
  '/:id',
  authorize('admin'),
  validate(updateProductValidator),
  productController.updateProduct
);

router.delete(
  '/:id',
  authorize('admin'),
  validate(productIdValidator),
  productController.deleteProduct
);

export default router;
