import Product, { IProduct } from './product.model';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';

interface CreateProductData {
  name: string;
  category: 'grains' | 'vegetables' | 'fruits' | 'livestock' | 'dairy' | 'other';
  variety?: string;
  description?: string;
  unit: 'kg' | 'ton' | 'bag' | 'piece' | 'liter' | 'crate';
  minOrderQuantity?: number;
  images?: string[];
}

class ProductService {
  async createProduct(data: CreateProductData): Promise<IProduct> {
    // Check if product with same name and variety exists
    const existingProduct = await Product.findOne({
      name: data.name,
      variety: data.variety || { $exists: false },
    });

    if (existingProduct) {
      throw new ConflictError('Product with same name and variety already exists');
    }

    const product = await Product.create(data);
    return product;
  }

  async getProductById(productId: string): Promise<IProduct> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async getAllProducts(query: any) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy, sortOrder);

    const filter: any = { isActive: true };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { variety: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(products, total, page, limit);
  }

  async updateProduct(productId: string, updateData: Partial<CreateProductData>): Promise<IProduct> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    Object.assign(product, updateData);
    await product.save();

    return product;
  }

  async deleteProduct(productId: string): Promise<void> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    product.isActive = false;
    await product.save();
  }

  async getProductsByCategory(category: string) {
    const products = await Product.find({ category, isActive: true });
    return products;
  }
}

export default ProductService;
