import Product, { IProduct } from './product.model';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';

interface CreateProductData {
  name: string;
  category: string;
  description?: string;
}

class ProductService {
  async createProduct(data: CreateProductData): Promise<IProduct> {
    const existingProduct = await Product.findOne({ name: data.name });

    if (existingProduct) {
      throw new ConflictError('Product already exists');
    }

    const product = await Product.create(data);
    return product;
  }

  async getProducts(): Promise<IProduct[]> {
    const products = await Product.find().sort({ name: 1 }).populate('prices').lean();
    return products as IProduct[];
  }

  async getProductById(productId: string): Promise<IProduct> {
    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async updateProduct(productId: string, updateData: Partial<CreateProductData>): Promise<IProduct> {
    const product = await Product.findByIdAndUpdate(productId, updateData, { new: true });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async deleteProduct(productId: string): Promise<void> {
    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
  }
}

export default ProductService;
