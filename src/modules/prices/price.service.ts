import mongoose from 'mongoose';
import Price from './price.model';
import Product from '../products/product.model';
import Market from '../markets/market.model';
import PriceAlert from './priceAlert.model';
import {
  calculateVolatility,
  detectPriceTrend,
  detectSeasonality,
  identifyAnomalies,
} from './utils/priceAnalytics';
import {
  predictWithMovingAverage,
  predictWithLinearRegression,
  predictWithWeightedMovingAverage,
  predictWithExponentialSmoothing,
  predictWithEnsemble,
  predictWithSeasonalAdjustment,
} from './utils/pricePrediction';
import { analyzeProductCorrelations, generateMarketReport as generateMarketReportUtil } from './utils/marketAnalysis';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';

interface UserContext {
  id?: string;
  role?: string;
  orgId?: string;
}

type MarketPriceStatus = 'captured' | 'validated' | 'published';

const MARKET_PRICE_STATUS_TRANSITIONS: Record<MarketPriceStatus, MarketPriceStatus[]> = {
  captured: ['captured', 'validated', 'published'],
  validated: ['validated', 'published'],
  published: ['published'],
};

const normalizeMarketPriceStatus = (value: unknown): MarketPriceStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'captured' || normalized === 'validated' || normalized === 'published') {
    return normalized;
  }
  return undefined;
};

const deriveMarketPriceStatus = (price: any): MarketPriceStatus => {
  const explicit = normalizeMarketPriceStatus(price?.status);
  if (explicit) return explicit;
  return price?.isValid === false ? 'captured' : 'validated';
};

class PriceService {
  async addPrice(data: any, user?: UserContext) {
    const { product, market, price, currency, date, productType, quantity, unit } = data;

    if (!product || !market || !price || !date || !productType || !quantity || !unit) {
      throw new BadRequestError('All fields are required');
    }

    if (!user || (user.role !== 'trader' && user.role !== 'admin')) {
      throw new ForbiddenError('Only traders and admins can add price data');
    }

    const existingProduct = await Product.findById(product);
    if (!existingProduct) throw new NotFoundError('Product not found');

    const existingMarket = await Market.findById(market);
    if (!existingMarket) throw new NotFoundError('Market not found');

    const requestedStatus = normalizeMarketPriceStatus(data.status ?? data.uiStatus);
    if ((data.status !== undefined || data.uiStatus !== undefined) && !requestedStatus) {
      throw new BadRequestError('status must be one of captured, validated, published');
    }

    const newPrice = new Price({
      product,
      market,
      price,
      currency: currency || 'UGX',
      date,
      productType,
      quantity,
      unit,
      status: requestedStatus || 'captured',
      lastUpdated: new Date(),
      addedBy: user.id,
      createdBy: user.id,
      organization: data.organizationId || user?.orgId,
    } as any);

    await newPrice.save();

    return { message: 'Price added successfully', price: newPrice };
  }

  async getPrices(query: any) {
    const { product, market, startDate, endDate, limit = 100, organizationId } = query;
    const filter: any = {};

    if (product) filter.product = product;
    if (market && market !== 'all') filter.market = market;
    if (organizationId) filter.organization = organizationId;
    const requestedStatus = normalizeMarketPriceStatus(query.status ?? query.uiStatus);
    if (requestedStatus) filter.status = requestedStatus;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const prices = await Price.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .populate('product', 'name category')
      .populate('market', 'name location region');

    return prices;
  }

  async getPriceById(id: string) {
    const price = await Price.findById(id)
      .populate('product', 'name category')
      .populate('market', 'name location region');

    if (!price) throw new NotFoundError('Price not found');

    return price;
  }

  async updatePrice(id: string, data: any, user?: UserContext) {
    const existingPrice = await Price.findById(id);
    if (!existingPrice) throw new NotFoundError('Price not found');

    const { product, market, price, date, productType, quantity, unit, currency } = data;

    if (product) {
      const existingProduct = await Product.findById(product);
      if (!existingProduct) throw new NotFoundError('Product not found');
    }
    if (market) {
      const existingMarket = await Market.findById(market);
      if (!existingMarket) throw new NotFoundError('Market not found');
    }

    const nextStatus = normalizeMarketPriceStatus(data.status ?? data.uiStatus);
    if ((data.status !== undefined || data.uiStatus !== undefined) && !nextStatus) {
      throw new BadRequestError('status must be one of captured, validated, published');
    }

    const currentStatus = deriveMarketPriceStatus(existingPrice);
    const resolvedStatus = nextStatus || currentStatus;

    if (!MARKET_PRICE_STATUS_TRANSITIONS[currentStatus].includes(resolvedStatus)) {
      throw new BadRequestError(`Invalid market price status transition: ${currentStatus} -> ${resolvedStatus}`);
    }

    const newPrice = new Price({
      product: product || existingPrice.product,
      market: market || existingPrice.market,
      price: price || existingPrice.price,
      currency: currency || existingPrice.currency,
      date: date || existingPrice.date,
      productType: productType || existingPrice.productType,
      quantity: quantity || existingPrice.quantity,
      unit: unit || existingPrice.unit,
      status: resolvedStatus,
      lastUpdated: new Date(),
      addedBy: user?.id || (existingPrice as any).addedBy,
      createdBy: user?.id || (existingPrice as any).createdBy || (existingPrice as any).addedBy,
      organization: data.organizationId || (existingPrice as any).organization || user?.orgId,
    } as any);

    await newPrice.save();

    return {
      message: 'Price updated successfully',
      price: newPrice,
      previousPrice: {
        id: existingPrice._id,
        price: existingPrice.price,
        date: existingPrice.date,
      },
    };
  }

  async deletePrice(id: string) {
    const price = await Price.findById(id);
    if (!price) throw new NotFoundError('Price not found');

    await price.deleteOne();

    return { message: 'Price deleted successfully' };
  }

  async getPriceTrends(query: any) {
    const { product, market, days } = query;
    const pastDays = days ? parseInt(days, 10) : 30;

    if (!product || !market) {
      throw new BadRequestError('Product and market are required');
    }

    if (!mongoose.Types.ObjectId.isValid(product) || !mongoose.Types.ObjectId.isValid(market)) {
      throw new BadRequestError('Invalid product or market ID');
    }

    const historicalPrices = await Price.find({
      product,
      market,
      date: { $gte: new Date(Date.now() - pastDays * 24 * 60 * 60 * 1000) },
    }).sort({ date: 1 });

    if (historicalPrices.length < 2) {
      return { message: 'Not enough data for trend analysis', historicalPrices };
    }

    const firstPrice = historicalPrices[0].price;
    const latestPrice = historicalPrices[historicalPrices.length - 1].price;
    const trendPercentage = ((latestPrice - firstPrice) / firstPrice) * 100;

    const trendDirection = trendPercentage > 0 ? 'increasing' : trendPercentage < 0 ? 'decreasing' : 'stable';

    return {
      product,
      market,
      trendPercentage: trendPercentage.toFixed(2),
      trendDirection,
      historicalPrices,
    };
  }

  async predictPrice(body: any) {
    const { product, market, days = 7, method = 'ensemble' } = body;

    if (!product || !market) {
      throw new BadRequestError('Product and market are required');
    }

    const historicalPrices = await Price.find({ product, market }).sort({ date: 1 }).limit(90);

    if (historicalPrices.length < 14) {
      throw new BadRequestError('Insufficient historical data for prediction', {
        required: 14,
        available: historicalPrices.length,
      });
    }

    let predictions: any[] = [];

    switch (method) {
      case 'moving_average':
        predictions = predictWithMovingAverage(historicalPrices, Number(days));
        break;
      case 'linear_regression':
        predictions = predictWithLinearRegression(historicalPrices, Number(days));
        break;
      case 'weighted_moving_average':
        predictions = predictWithWeightedMovingAverage(historicalPrices, Number(days));
        break;
      case 'exponential_smoothing':
        predictions = predictWithExponentialSmoothing(historicalPrices, Number(days));
        break;
      case 'seasonal':
        predictions = predictWithSeasonalAdjustment(historicalPrices, Number(days));
        break;
      case 'ensemble':
      default:
        predictions = predictWithEnsemble(historicalPrices, Number(days));
    }

    const productDetails = await Product.findById(product);
    const marketDetails = await Market.findById(market);

    return {
      product: {
        id: product,
        name: productDetails ? productDetails.name : 'Unknown Product',
      },
      market: {
        id: market,
        name: marketDetails ? marketDetails.name : 'Unknown Market',
      },
      method,
      predictions,
      generatedAt: new Date(),
    };
  }

  async bulkImportPrices(data: any, user?: UserContext) {
    const { prices } = data;
    if (!Array.isArray(prices) || prices.length === 0) {
      throw new BadRequestError('Invalid price data');
    }

    if (!user || (user.role !== 'trader' && user.role !== 'admin')) {
      throw new ForbiddenError('Only traders and admins can import prices');
    }

    for (const priceData of prices) {
      const { product, market, price, date, productType, quantity, unit } = priceData;

      if (!product || !market || !price || !date || !productType || !quantity || !unit) {
        throw new BadRequestError('All fields are required for each price entry');
      }

      const existingProduct = await Product.findById(product);
      if (!existingProduct) throw new NotFoundError(`Product not found for ID: ${product}`);

      const existingMarket = await Market.findById(market);
      if (!existingMarket) throw new NotFoundError(`Market not found for ID: ${market}`);
    }

    const pricesToInsert = prices.map((priceItem: any) => ({
      ...priceItem,
      addedBy: user.id,
      lastUpdated: new Date(),
    }));

    await Price.insertMany(pricesToInsert);
    return { message: 'Prices imported successfully' };
  }

  async getHistoricalPrices(query: any) {
    const { product, market, limit = 30 } = query;
    const filter: any = {};

    if (product) filter.product = product;
    if (market && market !== 'all') filter.market = market;

    const historicalPrices = await Price.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .populate('product', 'name category')
      .populate('market', 'name location region');

    return historicalPrices;
  }

  async getTopMarketsForProduct(query: any) {
    const { product } = query;
    if (!product) {
      throw new BadRequestError('Product is required');
    }

    const markets = await Price.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(product) } },
      {
        $group: {
          _id: '$market',
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          priceCount: { $sum: 1 },
          latestDate: { $max: '$date' },
        },
      },
      { $sort: { avgPrice: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'markets',
          localField: '_id',
          foreignField: '_id',
          as: 'marketDetails',
        },
      },
      { $unwind: '$marketDetails' },
      {
        $project: {
          _id: 0,
          marketId: '$_id',
          marketName: '$marketDetails.name',
          location: '$marketDetails.location',
          region: '$marketDetails.region',
          avgPrice: 1,
          minPrice: 1,
          maxPrice: 1,
          priceRange: { $subtract: ['$maxPrice', '$minPrice'] },
          priceCount: 1,
          latestDate: 1,
        },
      },
    ]);

    return markets;
  }

  async setUserPriceAlerts(data: any) {
    const { userId, product, market, priceThreshold } = data;

    if (!userId || !product || !market || priceThreshold === undefined) {
      throw new BadRequestError('User ID, product, market, and price threshold are required');
    }

    const existingAlert = await PriceAlert.findOne({ userId, product, market });
    if (existingAlert) {
      throw new BadRequestError('Price alert already exists for this product and market');
    }

    const newAlert = new PriceAlert({ userId, product, market, priceThreshold });
    await newAlert.save();

    return { message: 'Price alert set successfully', alert: newAlert };
  }

  async checkPriceAlerts(userId: string) {
    if (!userId) {
      throw new BadRequestError('UserId is required');
    }

    const alerts = await PriceAlert.find({ userId, alertTriggered: false });
    if (!alerts.length) {
      return { message: 'No active price alerts for this user' };
    }

    const triggeredAlerts: any[] = [];
    for (const alert of alerts) {
      const { product, market, priceThreshold } = alert;
      const currentPrice = await Price.findOne({ product, market }).sort({ date: -1 });
      if (!currentPrice) {
        continue;
      }

      if (currentPrice.price <= priceThreshold) {
        alert.alertTriggered = true;
        await alert.save();
        triggeredAlerts.push({
          alert,
          currentPrice: currentPrice.price,
          date: currentPrice.date,
        });
      }
    }

    if (triggeredAlerts.length > 0) {
      return {
        message: 'Price alerts checked and triggered',
        triggeredAlerts,
      };
    }

    return { message: 'No alerts triggered, prices are still above the threshold' };
  }

  async deletePriceAlert(id: string) {
    const alert = await PriceAlert.findById(id);
    if (!alert) throw new NotFoundError('Price alert not found');

    await alert.deleteOne();
    return { message: 'Price alert deleted successfully' };
  }

  async detectPriceAnomalies(query: any) {
    const { product, market, days = 90, threshold = 2.5 } = query;

    if (!product || !market) {
      throw new BadRequestError('Product and market are required');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const prices = await Price.find({
      product,
      market,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    if (prices.length < 5) {
      throw new BadRequestError('Insufficient data for anomaly detection');
    }

    const anomalies = identifyAnomalies(prices as any[], Number(threshold));

    const productDetails = await Product.findById(product);
    const marketDetails = await Market.findById(market);

    return {
      product: {
        id: product,
        name: productDetails ? productDetails.name : 'Unknown Product',
      },
      market: {
        id: market,
        name: marketDetails ? marketDetails.name : 'Unknown Market',
      },
      anomalyCount: anomalies.length,
      anomalies,
      threshold,
      analyzedPeriod: {
        startDate,
        endDate,
        days,
      },
    };
  }

  async getAveragePricePerMarket(query: any) {
    const { product, market, days = 30 } = query;

    if (!product) {
      throw new BadRequestError('Product is required');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const matchStage: any = {
      product: new mongoose.Types.ObjectId(product),
      date: { $gte: startDate, $lte: endDate },
    };

    if (market && market !== 'all') {
      matchStage.market = new mongoose.Types.ObjectId(market);
    }

    const averagePrices = await Price.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$market',
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          priceCount: { $sum: 1 },
        },
      },
      { $sort: { avgPrice: 1 } },
      {
        $lookup: {
          from: 'markets',
          localField: '_id',
          foreignField: '_id',
          as: 'marketDetails',
        },
      },
      { $unwind: '$marketDetails' },
      {
        $project: {
          _id: 0,
          marketId: '$_id',
          marketName: '$marketDetails.name',
          location: '$marketDetails.location',
          region: '$marketDetails.region',
          avgPrice: 1,
          minPrice: 1,
          maxPrice: 1,
          priceRange: { $subtract: ['$maxPrice', '$minPrice'] },
          priceCount: 1,
        },
      },
    ]);

    const productDetails = await Product.findById(product);

    return {
      product: {
        id: product,
        name: productDetails ? productDetails.name : 'Unknown Product',
      },
      analyzedPeriod: {
        startDate,
        endDate,
        days,
      },
      marketPrices: averagePrices,
    };
  }

  async compareMarketPrices(query: any) {
    const { product } = query;

    if (!product) {
      throw new BadRequestError('Product is required');
    }

    const productId = mongoose.Types.ObjectId.isValid(product) ? new mongoose.Types.ObjectId(product) : null;

    if (!productId) {
      throw new BadRequestError('Invalid product ID');
    }

    const marketPrices = await Price.find({ product: productId }).populate('market', 'name location');

    if (!marketPrices.length) {
      throw new NotFoundError('No price data found for this product');
    }

    return marketPrices;
  }

  async getPriceVolatility(query: any) {
    const { product, market, days = 30 } = query;

    if (!product || !market) {
      throw new BadRequestError('Product and market are required');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const prices = await Price.find({
      product,
      market,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    if (prices.length < 2) {
      throw new BadRequestError('Insufficient data for volatility calculation');
    }

    const volatility = calculateVolatility(prices as any[]);

    const productDetails = await Product.findById(product);
    const marketDetails = await Market.findById(market);

    return {
      product: {
        id: product,
        name: productDetails ? productDetails.name : 'Unknown Product',
      },
      market: {
        id: market,
        name: marketDetails ? marketDetails.name : 'Unknown Market',
      },
      volatility,
      analyzedPeriod: {
        startDate,
        endDate,
        days,
      },
    };
  }

  async getTrendingProducts(query: any) {
    const { days = 30, limit = 10 } = query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const trendingProducts = await Price.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $sort: { date: 1 } },
      {
        $group: {
          _id: '$product',
          prices: { $push: '$price' },
          dates: { $push: '$date' },
          priceCount: { $sum: 1 },
        },
      },
      {
        $project: {
          productId: '$_id',
          firstPrice: { $arrayElemAt: ['$prices', 0] },
          lastPrice: { $arrayElemAt: ['$prices', -1] },
          firstDate: { $arrayElemAt: ['$dates', 0] },
          lastDate: { $arrayElemAt: ['$dates', -1] },
          priceCount: 1,
        },
      },
      {
        $project: {
          productId: 1,
          firstPrice: 1,
          lastPrice: 1,
          firstDate: 1,
          lastDate: 1,
          priceChange: { $subtract: ['$lastPrice', '$firstPrice'] },
          percentChange: {
            $multiply: [{ $divide: [{ $subtract: ['$lastPrice', '$firstPrice'] }, '$firstPrice'] }, 100],
          },
          priceCount: 1,
        },
      },
      { $match: { priceCount: { $gte: 2 } } },
      { $sort: { percentChange: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: '$productDetails' },
      {
        $project: {
          _id: 0,
          productId: 1,
          productName: '$productDetails.name',
          category: '$productDetails.category',
          priceChange: 1,
          percentChange: 1,
          trend: {
            $cond: {
              if: { $gt: ['$percentChange', 0] },
              then: 'increasing',
              else: {
                $cond: {
                  if: { $lt: ['$percentChange', 0] },
                  then: 'decreasing',
                  else: 'stable',
                },
              },
            },
          },
        },
      },
    ]);

    return {
      analyzedPeriod: {
        startDate,
        endDate,
        days,
      },
      trendingProducts,
    };
  }

  async getProductTrend(query: any) {
    const { product, market, days = 30 } = query;

    if (!product) {
      throw new BadRequestError('Product is required');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const filter: any = {
      product,
      date: { $gte: startDate, $lte: endDate },
    };

    if (market && market !== 'all') {
      filter.market = market;
    }

    const prices = await Price.find(filter).sort({ date: 1 }).populate('market', 'name location region');

    if (prices.length < 2) {
      throw new BadRequestError('Insufficient data for trend analysis');
    }

    const trend = detectPriceTrend(prices as any[], Number(days));
    const productDetails = await Product.findById(product);

    return {
      product: {
        id: product,
        name: productDetails ? productDetails.name : 'Unknown Product',
        category: productDetails ? productDetails.category : 'Unknown Category',
      },
      market: market === 'all' ? 'All Markets' : market,
      trend,
      analyzedPeriod: {
        startDate,
        endDate,
        days,
      },
      prices: prices.map((p: any) => ({
        date: p.date,
        price: p.price,
        market: p.market
          ? {
              id: p.market._id,
              name: p.market.name,
              region: p.market.region || 'Unknown',
            }
          : 'Unknown Market',
      })),
    };
  }

  async getPriceSummary(productId: string) {
    if (!productId) {
      throw new BadRequestError('Product ID is required');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const latestPrice = await Price.findOne({ product: productId }).sort({ date: -1 }).populate('market', 'name');

    const priceStats = await Price.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          priceCount: { $sum: 1 },
        },
      },
    ]);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const recentPrices = await Price.find({
      product: productId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const trend = recentPrices.length >= 2 ? detectPriceTrend(recentPrices as any[], 30) : null;

    return {
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
      },
      currentPrice: latestPrice
        ? {
            price: latestPrice.price,
            date: latestPrice.date,
            market: latestPrice.market
              ? {
                  id: (latestPrice.market as any)._id,
                  name: (latestPrice.market as any).name,
                }
              : null,
          }
        : null,
      statistics:
        priceStats.length > 0
          ? {
              averagePrice: priceStats[0].avgPrice,
              minPrice: priceStats[0].minPrice,
              maxPrice: priceStats[0].maxPrice,
              priceRange: priceStats[0].maxPrice - priceStats[0].minPrice,
              dataPoints: priceStats[0].priceCount,
            }
          : null,
      trend,
      lastUpdated: new Date(),
    };
  }

  async analyzeSeasonalPrices(query: any) {
    const { product, market, days = 365 } = query;

    if (!product) {
      throw new BadRequestError('Product is required');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const filter: any = {
      product,
      date: { $gte: startDate, $lte: endDate },
    };

    if (market && market !== 'all') {
      filter.market = market;
    }

    const prices = await Price.find(filter).sort({ date: 1 });

    if (prices.length < 30) {
      throw new BadRequestError('Insufficient data for seasonality analysis', {
        required: 30,
        available: prices.length,
      });
    }

    const seasonality = detectSeasonality(prices as any[]);

    const productDetails = await Product.findById(product);
    let marketDetails: any = null;

    if (market && market !== 'all') {
      marketDetails = await Market.findById(market);
    }

    return {
      product: {
        id: product,
        name: productDetails ? productDetails.name : 'Unknown Product',
      },
      market:
        market === 'all'
          ? { id: 'all', name: 'All Markets' }
          : {
              id: market,
              name: marketDetails ? marketDetails.name : 'Unknown Market',
            },
      seasonality,
      analyzedPeriod: {
        startDate,
        endDate,
        days,
      },
    };
  }

  async analyzeCorrelations(query: any) {
    const { market, products, days = 90 } = query;

    if (!market) {
      throw new BadRequestError('Market is required');
    }

    let productIds: string[] = [];
    if (products) {
      productIds = products.split(',');
    } else {
      const marketPrices = await Price.find({ market }).distinct('product');
      productIds = marketPrices.map((id: any) => id.toString());
    }

    if (productIds.length < 2) {
      throw new BadRequestError('At least 2 products are required for correlation analysis');
    }

    const correlations = await analyzeProductCorrelations(market, Number(days));
    return correlations;
  }

  async analyzeRegionalPrices(query: any) {
    const { product, regions: regionParam, days = 30 } = query;

    if (!product) {
      throw new BadRequestError('Product is required');
    }

    let regionList: string[] = [];
    if (regionParam) {
      regionList = regionParam.split(',');
    } else {
      const markets = await Market.find().distinct('region');
      regionList = markets as string[];
    }

    if (regionList.length < 2) {
      throw new BadRequestError('At least 2 regions are required for regional analysis');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const markets = await Market.find({ region: { $in: regionList } });
    const marketIds = markets.map((m) => m._id);

    const prices = await Price.find({
      product,
      market: { $in: marketIds },
      date: { $gte: startDate, $lte: endDate },
    })
      .populate('market', 'name location region')
      .sort({ date: -1 });

    if (prices.length === 0) {
      throw new BadRequestError('No price data found for the specified product and regions');
    }

    const regionPrices: Record<string, any[]> = {};

    prices.forEach((price: any) => {
      const region = price.market.region;

      if (!regionPrices[region]) {
        regionPrices[region] = [];
      }

      regionPrices[region].push({
        price: price.price,
        date: price.date,
        market: {
          id: price.market._id,
          name: price.market.name,
          location: price.market.location,
        },
      });
    });

    const regionStats: Record<string, any> = {};

    for (const region in regionPrices) {
      const regionData = regionPrices[region];
      const priceValues = regionData.map((p) => p.price);

      regionStats[region] = {
        avgPrice: priceValues.reduce((a: number, b: number) => a + b, 0) / priceValues.length,
        minPrice: Math.min(...priceValues),
        maxPrice: Math.max(...priceValues),
        priceRange: Math.max(...priceValues) - Math.min(...priceValues),
        dataPoints: priceValues.length,
        markets: [...new Set(regionData.map((p) => p.market.name))],
      };
    }

    const allPrices = prices.map((p: any) => p.price);
    const overallAvg = allPrices.reduce((a: number, b: number) => a + b, 0) / allPrices.length;

    for (const region in regionStats) {
      regionStats[region].priceIndex = (regionStats[region].avgPrice / overallAvg) * 100;
    }

    const regionDifferences: any[] = [];
    const regionNames = Object.keys(regionStats);

    for (let i = 0; i < regionNames.length; i++) {
      for (let j = i + 1; j < regionNames.length; j++) {
        const region1 = regionNames[i];
        const region2 = regionNames[j];

        const priceDiff = Math.abs(regionStats[region1].avgPrice - regionStats[region2].avgPrice);
        const percentDiff = (priceDiff / Math.min(regionStats[region1].avgPrice, regionStats[region2].avgPrice)) * 100;

        if (percentDiff > 5) {
          regionDifferences.push({
            region1,
            region2,
            priceDifference: priceDiff,
            percentageDifference: percentDiff,
            cheaperRegion: regionStats[region1].avgPrice < regionStats[region2].avgPrice ? region1 : region2,
          });
        }
      }
    }

    regionDifferences.sort((a, b) => b.percentageDifference - a.percentageDifference);

    const productDetails = await Product.findById(product);

    return {
      product: {
        id: product,
        name: productDetails ? productDetails.name : 'Unknown Product',
        category: productDetails ? productDetails.category : 'Unknown Category',
      },
      analyzedPeriod: {
        startDate,
        endDate,
        days,
      },
      overallAverage: overallAvg,
      regionStats,
      regionDifferences,
      lastUpdated: new Date(),
    };
  }

  async generateMarketReport(query: any) {
    const { market, days = 30 } = query;

    if (!market) {
      throw new BadRequestError('Market is required');
    }

    return generateMarketReportUtil(market, Number(days));
  }

  async scheduleReport(data: any) {
    const { userId, marketId, frequency, email } = data;

    if (!userId || !marketId || !frequency || !email) {
      throw new BadRequestError('User ID, market ID, frequency, and email are required');
    }

    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      throw new BadRequestError(`Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
    }

    return {
      message: 'Report scheduled successfully',
      schedule: {
        userId,
        marketId,
        frequency,
        email,
        nextReportDate: calculateNextReportDate(frequency),
      },
    };
  }
}

const calculateNextReportDate = (frequency: string) => {
  const now = new Date();

  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
  }

  return now;
};

export default PriceService;
