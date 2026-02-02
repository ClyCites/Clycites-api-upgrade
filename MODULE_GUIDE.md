# 📖 Module Development Guide

This guide explains how to add new modules to the ClyCites API following the established patterns.

## 🏗️ Module Structure

Each module follows a consistent structure:

```
src/modules/your-module/
├── model.ts          # Mongoose schema/model
├── service.ts        # Business logic
├── controller.ts     # Request handlers
├── routes.ts         # Express routes
├── validator.ts      # Input validation
└── types.ts          # TypeScript interfaces (optional)
```

## 📝 Step-by-Step: Creating a New Module

Let's create an **Orders** module as an example.

### Step 1: Create the Model

**File:** `src/modules/orders/order.model.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  buyer: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  listing: mongoose.Types.ObjectId;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
  deliveryAddress: {
    region: string;
    district: string;
    details: string;
  };
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
      index: true,
    },
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    deliveryAddress: {
      region: { type: String, required: true },
      district: { type: String, required: true },
      details: { type: String, required: true },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ buyer: 1, status: 1 });
OrderSchema.index({ farmer: 1, status: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
```

### Step 2: Create the Service

**File:** `src/modules/orders/order.service.ts`

```typescript
import Order, { IOrder } from './order.model';
import Listing from '../marketplace/listing.model';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';

interface CreateOrderData {
  buyerId: string;
  listingId: string;
  quantity: number;
  deliveryAddress: {
    region: string;
    district: string;
    details: string;
  };
}

class OrderService {
  async createOrder(data: CreateOrderData): Promise<IOrder> {
    // Fetch listing
    const listing = await Listing.findById(data.listingId).populate('farmer');

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new BadRequestError('Listing is not available');
    }

    if (data.quantity > listing.quantity) {
      throw new BadRequestError('Insufficient quantity available');
    }

    // Calculate total price
    const totalPrice = listing.price * data.quantity;

    // Create order
    const order = await Order.create({
      buyer: data.buyerId,
      farmer: listing.farmer,
      listing: listing._id,
      quantity: data.quantity,
      totalPrice,
      deliveryAddress: data.deliveryAddress,
      status: 'pending',
      paymentStatus: 'pending',
    });

    // Update listing quantity
    listing.quantity -= data.quantity;
    if (listing.quantity === 0) {
      listing.status = 'sold';
    }
    await listing.save();

    return order.populate(['buyer', 'farmer', 'listing']);
  }

  async getOrderById(orderId: string): Promise<IOrder> {
    const order = await Order.findById(orderId).populate(['buyer', 'farmer', 'listing']);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  async getMyOrders(userId: string, query: any) {
    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy, sortOrder);

    const filter: any = { buyer: userId };
    
    if (query.status) {
      filter.status = query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate(['farmer', 'listing'])
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(orders, total, page, limit);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<IOrder> {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    order.status = status as any;
    await order.save();

    return order;
  }
}

export default OrderService;
```

### Step 3: Create the Controller

**File:** `src/modules/orders/order.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import OrderService from './order.service';
import { ResponseHandler } from '../../common/utils/response';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const buyerId = req.user?.id;

      const order = await this.orderService.createOrder({
        ...req.body,
        buyerId,
      });

      ResponseHandler.created(res, order, 'Order created successfully');
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id);

      ResponseHandler.success(res, order, 'Order retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const result = await this.orderService.getMyOrders(userId!, req.query);

      ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        'Orders retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await this.orderService.updateOrderStatus(id, status);

      ResponseHandler.success(res, order, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  };
}

export default new OrderController();
```

### Step 4: Create Validators

**File:** `src/modules/orders/order.validator.ts`

```typescript
import { body, param } from 'express-validator';

export const createOrderValidator = [
  body('listingId')
    .notEmpty()
    .withMessage('Listing ID is required')
    .isMongoId()
    .withMessage('Invalid listing ID'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('deliveryAddress.region')
    .notEmpty()
    .withMessage('Region is required'),
  body('deliveryAddress.district')
    .notEmpty()
    .withMessage('District is required'),
  body('deliveryAddress.details')
    .notEmpty()
    .withMessage('Delivery details are required'),
];

export const updateOrderStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('status')
    .isIn(['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
];
```

### Step 5: Create Routes

**File:** `src/modules/orders/order.routes.ts`

```typescript
import { Router } from 'express';
import orderController from './order.controller';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import {
  createOrderValidator,
  updateOrderStatusValidator,
} from './order.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create order (buyers only)
router.post(
  '/',
  authorize('buyer', 'trader'),
  validate(createOrderValidator),
  orderController.createOrder
);

// Get my orders
router.get('/my-orders', orderController.getMyOrders);

// Get order by ID
router.get('/:id', orderController.getOrderById);

// Update order status (farmers and admins)
router.put(
  '/:id/status',
  authorize('farmer', 'admin'),
  validate(updateOrderStatusValidator),
  orderController.updateOrderStatus
);

export default router;
```

### Step 6: Register Routes

**File:** `src/routes.ts`

```typescript
import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import orderRoutes from './modules/orders/order.routes'; // Add this

const router = Router();

const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/orders`, orderRoutes); // Add this

// Health check
router.get(`${API_VERSION}/health`, (_req, res) => {
  res.json({
    success: true,
    message: 'ClyCites API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
```

## 🎯 Best Practices

### 1. **Separation of Concerns**
- **Model:** Database schema only
- **Service:** Business logic and data operations
- **Controller:** HTTP request/response handling
- **Routes:** Endpoint definitions and middleware

### 2. **Error Handling**
Always use custom error classes:
```typescript
throw new NotFoundError('Resource not found');
throw new BadRequestError('Invalid input');
throw new UnauthorizedError('Access denied');
```

### 3. **Validation**
Use express-validator for all inputs:
```typescript
body('email').isEmail().withMessage('Invalid email');
param('id').isMongoId().withMessage('Invalid ID');
```

### 4. **Authentication & Authorization**
```typescript
// Require authentication
router.use(authenticate);

// Require specific roles
router.post('/', authorize('admin', 'farmer'), controller.create);

// Check ownership
router.put('/:id', checkOwnership('userId'), controller.update);
```

### 5. **Pagination**
Always paginate list endpoints:
```typescript
const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
return PaginationUtil.buildPaginationResult(data, total, page, limit);
```

### 6. **Response Format**
Use ResponseHandler for consistent responses:
```typescript
ResponseHandler.success(res, data, 'Success message');
ResponseHandler.created(res, data, 'Created message');
ResponseHandler.paginated(res, data, pagination, 'Success');
ResponseHandler.error(res, message, statusCode, errorCode);
```

## 🔄 Common Patterns

### Population
```typescript
const order = await Order.findById(id)
  .populate('buyer', 'firstName lastName email')
  .populate('farmer')
  .populate('listing');
```

### Filtering
```typescript
const filter: any = {};

if (query.status) filter.status = query.status;
if (query.region) filter['location.region'] = query.region;

const results = await Model.find(filter);
```

### Aggregation
```typescript
const stats = await Order.aggregate([
  { $match: { farmer: farmerId } },
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
      totalRevenue: { $sum: '$totalPrice' },
    },
  },
]);
```

## 📚 Additional Resources

- [Mongoose Documentation](https://mongoosejs.com/)
- [Express Validator](https://express-validator.github.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

Follow this pattern for all new modules and maintain consistency across the API! 🚀
