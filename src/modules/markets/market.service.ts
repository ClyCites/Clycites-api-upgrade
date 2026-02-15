import Market, { IMarket } from './market.model';
import Price from '../prices/price.model';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';

interface CreateMarketData {
  name: string;
  location: string;
  region: string;
  country?: string;
}

class MarketService {
  async createMarket(data: CreateMarketData): Promise<IMarket> {
    const existingMarket = await Market.findOne({ name: data.name });
    if (existingMarket) {
      throw new ConflictError('Market already exists');
    }

    const market = await Market.create(data);
    return market;
  }

  async getMarkets(): Promise<IMarket[]> {
    return Market.find().sort({ name: 1 });
  }

  async getMarketById(marketId: string): Promise<IMarket> {
    const market = await Market.findById(marketId);
    if (!market) {
      throw new NotFoundError('Market not found');
    }

    return market;
  }

  async updateMarket(marketId: string, data: Partial<CreateMarketData>): Promise<IMarket> {
    const market = await Market.findById(marketId);
    if (!market) {
      throw new NotFoundError('Market not found');
    }

    Object.assign(market, data);
    await market.save();

    return market;
  }

  async deleteMarket(marketId: string): Promise<void> {
    const market = await Market.findById(marketId);
    if (!market) {
      throw new NotFoundError('Market not found');
    }

    await market.deleteOne();
  }

  async getPricesForMarket(marketId: string) {
    const market = await Market.findById(marketId);
    if (!market) {
      throw new NotFoundError('Market not found');
    }

    const prices = await Price.find({ market: market._id })
      .sort({ date: -1 })
      .populate('product', 'name category');

    return { market, prices };
  }
}

export default MarketService;
