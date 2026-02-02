import Order from '../orders/order.model';
import Listing from '../marketplace/listing.model';
import Product from '../products/product.model';
import Farmer from '../farmers/farmer.model';
import User from '../users/user.model';
import mongoose from 'mongoose';

class AnalyticsService {
  async getMarketOverview() {
    const [
      totalListings,
      activeListings,
      totalOrders,
      totalRevenue,
      totalFarmers,
      verifiedFarmers,
      totalBuyers,
      avgOrderValue,
    ] = await Promise.all([
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      this.getTotalRevenue(),
      Farmer.countDocuments(),
      Farmer.countDocuments({ verified: true }),
      User.countDocuments({ role: 'buyer' }),
      this.getAverageOrderValue(),
    ]);

    return {
      listings: {
        total: totalListings,
        active: activeListings,
      },
      orders: {
        total: totalOrders,
        avgValue: avgOrderValue,
      },
      revenue: {
        total: totalRevenue,
      },
      users: {
        farmers: totalFarmers,
        verifiedFarmers,
        buyers: totalBuyers,
      },
    };
  }

  async getPriceTrends(query: any) {
    const { product, region, days = 30 } = query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const matchStage: any = {
      createdAt: { $gte: startDate },
      status: 'active',
    };

    if (product) {
      matchStage.product = new mongoose.Types.ObjectId(product);
    }

    if (region) {
      matchStage['location.region'] = region;
    }

    const trends = await Listing.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            product: '$product',
            quality: '$quality',
          },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      { $sort: { '_id.date': 1 } },
    ]);

    return trends;
  }

  async getProductDemand(query: any) {
    const { category, region, days = 30 } = query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const matchStage: any = {
      createdAt: { $gte: startDate },
    };

    if (region) {
      matchStage['deliveryAddress.region'] = region;
    }

    const demand = await Order.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      ...(category ? [{ $match: { 'productInfo.category': category } }] : []),
      {
        $group: {
          _id: {
            product: '$product',
            name: '$productInfo.name',
            category: '$productInfo.category',
          },
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalAmount' },
          avgPrice: { $avg: '$unitPrice' },
        },
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 20 },
    ]);

    return demand;
  }

  async getSupplyAnalysis(query: any) {
    const { category, region } = query;

    const matchStage: any = {
      status: 'active',
    };

    if (region) {
      matchStage['location.region'] = region;
    }

    const supply = await Listing.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      ...(category ? [{ $match: { 'productInfo.category': category } }] : []),
      {
        $group: {
          _id: {
            product: '$product',
            name: '$productInfo.name',
            category: '$productInfo.category',
          },
          totalListings: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    return supply;
  }

  async getFarmerPerformance(farmerId: string, query: any) {
    const { days = 30 } = query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [orders, listings, revenue, avgRating] = await Promise.all([
      Order.countDocuments({
        farmer: farmerId,
        createdAt: { $gte: startDate },
      }),
      Listing.countDocuments({
        farmer: farmerId,
        createdAt: { $gte: startDate },
      }),
      this.getFarmerRevenue(farmerId, startDate),
      this.getFarmerRating(farmerId),
    ]);

    const salesByProduct = await Order.aggregate([
      {
        $match: {
          farmer: new mongoose.Types.ObjectId(farmerId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$product',
          totalSales: { $sum: '$quantity' },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      { $sort: { revenue: -1 } },
    ]);

    return {
      summary: {
        orders,
        listings,
        revenue,
        avgRating,
      },
      salesByProduct,
    };
  }

  async getRegionalAnalysis() {
    const regions = await Listing.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$location.region',
          totalListings: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          avgPrice: { $avg: '$price' },
          categories: { $addToSet: '$product' },
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { region: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$deliveryAddress.region', '$$region'],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
              },
            },
          ],
          as: 'orderStats',
        },
      },
      { $unwind: { path: '$orderStats', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          region: '$_id',
          supply: {
            listings: '$totalListings',
            quantity: '$totalQuantity',
            avgPrice: '$avgPrice',
            categoryCount: { $size: '$categories' },
          },
          demand: {
            orders: { $ifNull: ['$orderStats.totalOrders', 0] },
            revenue: { $ifNull: ['$orderStats.totalRevenue', 0] },
          },
        },
      },
      { $sort: { 'supply.listings': -1 } },
    ]);

    return regions;
  }

  async getMarketHealth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      activeListingsCount,
      listingFulfillmentRate,
      avgTimeToSale,
      returnBuyerRate,
    ] = await Promise.all([
      Listing.countDocuments({ status: 'active' }),
      this.calculateFulfillmentRate(thirtyDaysAgo),
      this.calculateAvgTimeToSale(thirtyDaysAgo),
      this.calculateReturnBuyerRate(thirtyDaysAgo),
    ]);

    return {
      activeListings: activeListingsCount,
      fulfillmentRate: listingFulfillmentRate,
      avgTimeToSale,
      returnBuyerRate,
      healthScore: this.calculateHealthScore(
        listingFulfillmentRate,
        returnBuyerRate,
        activeListingsCount
      ),
    };
  }

  // Helper methods
  private async getTotalRevenue(): Promise<number> {
    const result = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]);
    return result[0]?.total || 0;
  }

  private async getAverageOrderValue(): Promise<number> {
    const result = await Order.aggregate([
      { $group: { _id: null, avg: { $avg: '$finalAmount' } } },
    ]);
    return result[0]?.avg || 0;
  }

  private async getFarmerRevenue(farmerId: string, startDate: Date): Promise<number> {
    const result = await Order.aggregate([
      {
        $match: {
          farmer: new mongoose.Types.ObjectId(farmerId),
          createdAt: { $gte: startDate },
          paymentStatus: 'paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    return result[0]?.total || 0;
  }

  private async getFarmerRating(farmerId: string): Promise<number> {
    const farmer = await Farmer.findById(farmerId);
    return farmer?.rating || 0;
  }

  private async calculateFulfillmentRate(startDate: Date): Promise<number> {
    const [completed, total] = await Promise.all([
      Order.countDocuments({
        createdAt: { $gte: startDate },
        status: { $in: ['completed', 'delivered'] },
      }),
      Order.countDocuments({ createdAt: { $gte: startDate } }),
    ]);
    return total > 0 ? (completed / total) * 100 : 0;
  }

  private async calculateAvgTimeToSale(startDate: Date): Promise<number> {
    const results = await Listing.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'sold',
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'listing',
          as: 'orders',
        },
      },
      { $unwind: '$orders' },
      {
        $project: {
          daysToSale: {
            $divide: [
              { $subtract: ['$orders.createdAt', '$createdAt'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$daysToSale' },
        },
      },
    ]);
    return results[0]?.avgDays || 0;
  }

  private async calculateReturnBuyerRate(startDate: Date): Promise<number> {
    const buyers = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$buyer', orderCount: { $sum: 1 } } },
    ]);

    const returnBuyers = buyers.filter(b => b.orderCount > 1).length;
    return buyers.length > 0 ? (returnBuyers / buyers.length) * 100 : 0;
  }

  private calculateHealthScore(
    fulfillmentRate: number,
    returnBuyerRate: number,
    activeListings: number
  ): number {
    const fulfillmentScore = fulfillmentRate * 0.4;
    const loyaltyScore = returnBuyerRate * 0.3;
    const activityScore = Math.min((activeListings / 100) * 30, 30);

    return Math.round(fulfillmentScore + loyaltyScore + activityScore);
  }
}

export default AnalyticsService;
