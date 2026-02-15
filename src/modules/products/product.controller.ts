import { Request, Response, NextFunction } from 'express';
import ProductService from './product.service';
import { ResponseHandler } from '../../common/utils/response';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await this.productService.createProduct(req.body);
      ResponseHandler.created(res, { product }, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const product = await this.productService.getProductById(id);
      ResponseHandler.success(res, product, 'Product retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getAllProducts = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.productService.getProducts();
      ResponseHandler.success(res, result, 'Products retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const product = await this.productService.updateProduct(id, req.body);
      ResponseHandler.success(res, { product }, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.productService.deleteProduct(id);
      ResponseHandler.success(res, null, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new ProductController();
