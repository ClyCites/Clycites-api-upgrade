import Order, { IOrder } from './order.model';
import Listing from '../marketplace/listing.model';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import { PaginationUtil } from '../../common/utils/pagination';
import mongoose from 'mongoose';

interface CreateOrderData {
  buyer: string;
  listing: string;
  quantity: number;
  deliveryAddress: {
    region: string;
    district: string;
    subcounty?: string;
    village?: string;
    street?: string;
    landmark?: string;
    phone: string;
    recipientName: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  deliveryOption: string;
  notes?: string;
}

class OrderService {
  async createOrder(data: CreateOrderData): Promise<IOrder> {
    // Get listing details
    const listing = await Listing.findById(data.listing).populate('product');
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new BadRequestError('Listing is not available for ordering');
    }

    if (data.quantity > listing.quantity) {
      throw new BadRequestError('Requested quantity exceeds available stock');
    }

    // Calculate amounts
    const totalAmount = listing.price * data.quantity;
    const deliveryFee = this.calculateDeliveryFee(data.deliveryOption, data.deliveryAddress.region);
    const platformFee = totalAmount * 0.05; // 5% platform fee
    const finalAmount = totalAmount + deliveryFee + platformFee;

    // Create order
    const order = await Order.create({
      buyer: data.buyer,
      farmer: listing.farmer,
      listing: listing._id,
      product: listing.product,
      quantity: data.quantity,
      unitPrice: listing.price,
      totalAmount,
      deliveryFee,
      platformFee,
      finalAmount,
      deliveryAddress: data.deliveryAddress,
      deliveryOption: data.deliveryOption,
      notes: data.notes,
      estimatedDeliveryDate: this.calculateEstimatedDelivery(data.deliveryOption),
    });

    // Update listing quantity
    listing.quantity -= data.quantity;
    if (listing.quantity === 0) {
      listing.status = 'sold';
    }
    await listing.save();

    return order.populate(['buyer', 'farmer', 'listing', 'product']);
  }

  async getOrderById(orderId: string, userId: string, userRole: string): Promise<IOrder> {
    const order = await Order.findById(orderId)
      .populate('buyer', '-password')
      .populate('farmer')
      .populate('listing')
      .populate('product');

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check authorization
    if (userRole !== 'admin' && order.buyer.toString() !== userId) {
      const farmerDoc = await mongoose.model('Farmer').findOne({ user: userId });
      if (!farmerDoc || order.farmer.toString() !== farmerDoc._id.toString()) {
        throw new BadRequestError('You do not have access to this order');
      }
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

    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('farmer')
        .populate('listing')
        .populate('product')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(orders, total, page, limit);
  }

  async getFarmerOrders(userId: string, query: any) {
    // Get farmer document
    const farmerDoc = await mongoose.model('Farmer').findOne({ user: userId });
    if (!farmerDoc) {
      throw new NotFoundError('Farmer profile not found');
    }

    const { page, limit, sortBy, sortOrder } = PaginationUtil.getPaginationParams(query);
    const skip = PaginationUtil.getSkip(page, limit);
    const sort = PaginationUtil.getSortObject(sortBy, sortOrder);

    const filter: any = { farmer: farmerDoc._id };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('buyer', '-password')
        .populate('listing')
        .populate('product')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return PaginationUtil.buildPaginationResult(orders, total, page, limit);
  }

  async updateOrderStatus(
    orderId: string,
    status: IOrder['status'],
    userId: string,
    userRole: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check authorization
    if (userRole !== 'admin') {
      const farmerDoc = await mongoose.model('Farmer').findOne({ user: userId });
      if (!farmerDoc || order.farmer.toString() !== farmerDoc._id.toString()) {
        throw new BadRequestError('Only the farmer or admin can update order status');
      }
    }

    // Validate status transition
    this.validateStatusTransition(order.status, status);

    order.status = status;

    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    return order.populate(['buyer', 'farmer', 'listing', 'product']);
  }

  async cancelOrder(orderId: string, userId: string, userRole: string, reason: string): Promise<IOrder> {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new BadRequestError('Order cannot be cancelled');
    }

    // Check authorization
    let cancelledBy: 'buyer' | 'farmer' | 'admin' = 'buyer';
    if (userRole === 'admin') {
      cancelledBy = 'admin';
    } else if (order.buyer.toString() !== userId) {
      const farmerDoc = await mongoose.model('Farmer').findOne({ user: userId });
      if (!farmerDoc || order.farmer.toString() !== farmerDoc._id.toString()) {
        throw new BadRequestError('You do not have permission to cancel this order');
      }
      cancelledBy = 'farmer';
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledBy = cancelledBy;

    // Restore listing quantity if payment not made
    if (order.paymentStatus !== 'paid') {
      const listing = await Listing.findById(order.listing);
      if (listing) {
        listing.quantity += order.quantity;
        if (listing.status === 'sold') {
          listing.status = 'active';
        }
        await listing.save();
      }
    }

    await order.save();

    return order.populate(['buyer', 'farmer', 'listing', 'product']);
  }

  async getOrderStats(userId: string, userRole: string) {
    let matchQuery: any = {};

    if (userRole === 'buyer') {
      matchQuery = { buyer: new mongoose.Types.ObjectId(userId) };
    } else if (userRole === 'farmer') {
      const farmerDoc = await mongoose.model('Farmer').findOne({ user: userId });
      if (!farmerDoc) {
        throw new NotFoundError('Farmer profile not found');
      }
      matchQuery = { farmer: farmerDoc._id };
    }

    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' },
        },
      },
    ]);

    return stats;
  }

  private calculateDeliveryFee(deliveryOption: string, region: string): number {
    // Simple delivery fee calculation based on delivery option
    const baseRates: Record<string, number> = {
      'pickup': 0,
      'local_delivery': 5000,
      'regional_delivery': 15000,
      'national_delivery': 30000,
    };

    return baseRates[deliveryOption] || 10000;
  }

  private calculateEstimatedDelivery(deliveryOption: string): Date {
    const days: Record<string, number> = {
      'pickup': 0,
      'local_delivery': 1,
      'regional_delivery': 3,
      'national_delivery': 7,
    };

    const deliveryDays = days[deliveryOption] || 5;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + deliveryDays);
    return estimatedDate;
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'cancelled'],
      'delivered': ['completed'],
      'completed': [],
      'cancelled': [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestError(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }
}

export default OrderService;
