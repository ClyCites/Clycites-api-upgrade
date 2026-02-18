import mongoose from 'mongoose';
import MarketInsight from './marketInsight.model';
import PriceAlert from './priceAlert.model';
import Listing from '../marketplace/listing.model';
import Order from '../orders/order.model';
import Price from '../prices/price.model';
import logger from '../../common/utils/logger';

/**
 * Market Intelligence Service
 * Provides market analytics, price predictions, and insights
 * 
 * Note: AI prediction integration points are marked with TODO comments
 */
export class MarketIntelligenceService {
  /**
   * Generate market insights for a product
   */
  async generateMarketInsight(
    productId: string,
    region?: string,
    district?: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build query for listings
      const listingQuery: any = {
        product: productId,
        status: 'active',
        availableFrom: { $lte: new Date() },
      };

      if (region) listingQuery['address.region'] = region;
      if (district) listingQuery['address.district'] = district;

      // Get active listings
      const listings = await Listing.find(listingQuery);

      // Get recent orders (completed)
      const orderQuery: any = {
        product: productId,
        status: 'completed',
        createdAt: { $gte: this.getStartDate(period, today) },
      };

      const orders = await Order.find(orderQuery);

      // Get historical prices
      const priceQuery: any = {
        product: productId,
        date: { $gte: this.getStartDate(period, today) },
      };

      if (region) priceQuery.region = region;
      
      const historicalPrices = await Price.find(priceQuery).sort({ date: -1 });

      // Calculate price statistics
      const priceStats = this.calculatePriceStatistics(listings, orders, historicalPrices);

      // Calculate supply/demand metrics
      const supplyDemand = this.calculateSupplyDemand(listings, orders);

      // Generate AI predictions (mock for now, integrate with ML service)
      const predictions = await this.generatePredictions(productId, historicalPrices, priceStats);

      // Identify trends
      const trends = this.identifyTrends(historicalPrices, priceStats);

      // Competitive analysis
      const competitiveAnalysis = await this.analyzeCompetition(listings);

      // Generate alerts
      const alerts = this.generateAlerts(priceStats, supplyDemand);

      // Create or update market insight
      const insight = await MarketInsight.findOneAndUpdate(
        {
          product: productId,
          region,
          district,
          period,
          date: today,
        },
        {
          product: productId,
          region,
          district,
          date: today,
          period,
          priceStatistics: priceStats,
          supplyDemand,
          predictions,
          trends,
          competitiveAnalysis,
          alerts,
          dataPoints: listings.length + orders.length + historicalPrices.length,
          confidence: this.calculateConfidence(listings.length, orders.length),
        },
        {
          upsert: true,
          new: true,
        }
      );

      logger.info(`Market insight generated for product ${productId}`);

      // Check and trigger price alerts
      await this.checkPriceAlerts(productId, priceStats.current, region, district);

      return insight;
    } catch (error) {
      logger.error('Error generating market insight:', error);
      throw error;
    }
  }

  /**
   * Calculate price statistics
   */
  private calculatePriceStatistics(listings: any[], orders: any[], historicalPrices: any[]): any {
    const allPrices = [
      ...listings.map(l => l.pricePerUnit || l.price / l.quantity),
      ...orders.map(o => o.unitPrice),
    ];

    if (allPrices.length === 0) {
      return {
        current: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        changePercentage: 0,
        volatilityScore: 0,
      };
    }

    const sortedPrices = [...allPrices].sort((a, b) => a - b);
    const average = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const min = sortedPrices[0];
    const max = sortedPrices[sortedPrices.length - 1];

    // Standard deviation
    const variance = allPrices.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / allPrices.length;
    const stdDev = Math.sqrt(variance);

    // Calculate price change vs previous period
    let changePercentage = 0;
    if (historicalPrices.length > 0) {
      const previousAvg = historicalPrices[0].price;
      if (previousAvg > 0) {
        changePercentage = ((average - previousAvg) / previousAvg) * 100;
      }
    }

    // Volatility score (coefficient of variation)
    const volatilityScore = average > 0 ? Math.min((stdDev / average) * 100, 100) : 0;

    return {
      current: listings.length > 0 ? listings[0].pricePerUnit || listings[0].price / listings[0].quantity : average,
      average,
      median,
      min,
      max,
      standardDeviation: stdDev,
      changePercentage,
      volatilityScore,
    };
  }

  /**
   * Calculate supply and demand metrics
   */
  private calculateSupplyDemand(listings: any[], orders: any[]): any {
    const totalListings = listings.length;
    const totalQuantityAvailable = listings.reduce((sum, l) => sum + l.quantity, 0);
    const totalOrders = orders.length;
    const totalQuantityOrdered = orders.reduce((sum, o) => sum + o.quantity, 0);

    const supplyDemandRatio = totalQuantityAvailable > 0
      ? totalQuantityOrdered / totalQuantityAvailable
      : 0;

    // Demand score: high ratio = high demand
    const demandScore = Math.min(supplyDemandRatio * 100, 100);

    return {
      totalListings,
      totalQuantityAvailable,
      totalOrders,
      totalQuantityOrdered,
      supplyDemandRatio,
      demandScore,
    };
  }

  /**
   * Generate AI price predictions
   * TODO: Integrate with ML service (Flask app or external AI service)
   */
  private async generatePredictions(_productId: string, historicalPrices: any[], priceStats: any): Promise<any> {
    // Mock implementation - replace with actual ML model
    const currentPrice = priceStats.current || priceStats.average;

    // Simple trend-based prediction
    const trend = priceStats.changePercentage;
    const nextWeekFactor = 1 + (trend / 100) * 0.5; // 50% of current trend
    const nextMonthFactor = 1 + (trend / 100) * 1.5; // 150% of current trend

    // TODO: Call ML service
    // const mlPredictions = await axios.post('http://ml-service/predict', {
    //   productId,
    //   historicalPrices,
    //   currentStats: priceStats,
    // });

    return {
      nextWeekPrice: currentPrice * nextWeekFactor,
      nextMonthPrice: currentPrice * nextMonthFactor,
      confidence: historicalPrices.length > 10 ? 75 : 50,
      trendDirection: trend > 2 ? 'increasing' : trend < -2 ? 'decreasing' : 'stable',
      seasonalityFactor: 1.0, // TODO: Calculate from historical data
      modelVersion: 'v1.0-mock',
      generatedAt: new Date(),
    };
  }

  /**
   * Identify market trends
   */
  private identifyTrends(_historicalPrices: any[], priceStats: any): any[] {
    const trends = [];

    // Price trend
    if (priceStats.changePercentage > 5) {
      trends.push({
        indicator: 'price_movement',
        value: priceStats.changePercentage,
        change: priceStats.changePercentage,
        interpretation: 'Prices are rising significantly',
      });
    } else if (priceStats.changePercentage < -5) {
      trends.push({
        indicator: 'price_movement',
        value: priceStats.changePercentage,
        change: priceStats.changePercentage,
        interpretation: 'Prices are falling significantly',
      });
    }

    // Volatility trend
    if (priceStats.volatilityScore > 30) {
      trends.push({
        indicator: 'volatility',
        value: priceStats.volatilityScore,
        change: 0,
        interpretation: 'High price volatility detected',
      });
    }

    return trends;
  }

  /**
   * Analyze competitive landscape
   */
  private async analyzeCompetition(listings: any[]): Promise<any> {
    const qualityGrades = ['premium', 'grade-a', 'grade-b', 'standard', 'ungraded'];
    const priceRangeByQuality = [];

    for (const grade of qualityGrades) {
      const gradeListings = listings.filter(l => l.grade === grade);
      if (gradeListings.length > 0) {
        const prices = gradeListings.map(l => l.pricePerUnit || l.price / l.quantity);
        priceRangeByQuality.push({
          grade,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
        });
      }
    }

    // Get top sellers by listing count
    const sellerCounts = new Map();
    listings.forEach(l => {
      const sellerId = l.farmer?.toString() || l.seller?.toString();
      if (sellerId) {
        sellerCounts.set(sellerId, (sellerCounts.get(sellerId) || 0) + 1);
      }
    });

    const topSellers = Array.from(sellerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sellerId]) => new mongoose.Types.ObjectId(sellerId));

    // Calculate HHI (Herfindahl-Hirschman Index) for market concentration
    const totalListings = listings.length;
    let hhi = 0;
    if (totalListings > 0) {
      for (const count of sellerCounts.values()) {
        const marketShare = count / totalListings;
        hhi += Math.pow(marketShare * 100, 2);
      }
    }

    return {
      averageQuality: this.calculateAverageQuality(listings),
      priceRangeByQuality,
      topSellers,
      marketConcentration: hhi,
    };
  }

  /**
   * Calculate average quality grade
   */
  private calculateAverageQuality(listings: any[]): string {
    const qualityMap: any = { premium: 4, 'grade-a': 3, 'grade-b': 2, standard: 1, ungraded: 0 };
    const qualityScores = listings.map(l => qualityMap[l.grade] || 0);
    const avgScore = qualityScores.reduce((sum, s) => sum + s, 0) / listings.length;

    if (avgScore >= 3.5) return 'premium';
    if (avgScore >= 2.5) return 'grade-a';
    if (avgScore >= 1.5) return 'grade-b';
    return 'standard';
  }

  /**
   * Generate alerts based on market conditions
   */
  private generateAlerts(priceStats: any, supplyDemand: any): any[] {
    const alerts = [];

    // Price spike alert
    if (priceStats.changePercentage > 20) {
      alerts.push({
        type: 'price_spike',
        severity: 'high',
        message: `Price has increased by ${priceStats.changePercentage.toFixed(1)}%`,
        triggeredAt: new Date(),
      });
    }

    // Price drop alert
    if (priceStats.changePercentage < -20) {
      alerts.push({
        type: 'price_drop',
        severity: 'high',
        message: `Price has decreased by ${Math.abs(priceStats.changePercentage).toFixed(1)}%`,
        triggeredAt: new Date(),
      });
    }

    // High demand alert
    if (supplyDemand.demandScore > 80) {
      alerts.push({
        type: 'high_demand',
        severity: 'medium',
        message: 'High demand detected - supply may be insufficient',
        triggeredAt: new Date(),
      });
    }

    // Low supply alert
    if (supplyDemand.totalQuantityAvailable < supplyDemand.totalQuantityOrdered * 0.5) {
      alerts.push({
        type: 'low_supply',
        severity: 'critical',
        message: 'Critical supply shortage',
        triggeredAt: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Calculate confidence score based on data availability
   */
  private calculateConfidence(listingCount: number, orderCount: number): number {
    const totalDataPoints = listingCount + orderCount;
    
    if (totalDataPoints >= 50) return 95;
    if (totalDataPoints >= 20) return 80;
    if (totalDataPoints >= 10) return 65;
    if (totalDataPoints >= 5) return 50;
    return 30;
  }

  /**
   * Get start date based on period
   */
  private getStartDate(period: string, endDate: Date): Date {
    const start = new Date(endDate);
    
    switch (period) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
    }
    
    return start;
  }

  /**
   * Check and trigger price alerts
   */
  private async checkPriceAlerts(
    productId: string,
    currentPrice: number,
    region?: string,
    district?: string
  ): Promise<void> {
    const query: any = {
      product: productId,
      active: true,
    };

    if (region) query.region = region;
    if (district) query.district = district;

    const alerts = await PriceAlert.find(query);

    for (const alert of alerts) {
      let shouldTrigger = false;

      switch (alert.condition.operator) {
        case 'below':
          shouldTrigger = currentPrice < alert.condition.threshold;
          break;
        case 'above':
          shouldTrigger = currentPrice > alert.condition.threshold;
          break;
        case 'equals':
          shouldTrigger = Math.abs(currentPrice - alert.condition.threshold) < 1;
          break;
      }

      if (shouldTrigger) {
        alert.lastTriggered = new Date();
        alert.triggerCount += 1;
        await alert.save();

        // TODO: Send notification via configured channels
        logger.info(`Price alert triggered for user ${alert.user}, product ${productId}`);
      }
    }
  }

  /**
   * Get market insights with filters
   */
  async getMarketInsights(filters: any): Promise<any> {
    const { product, region, district, period, startDate, endDate, page = 1, limit = 20 } = filters;

    const query: any = {};
    if (product) query.product = product;
    if (region) query.region = region;
    if (district) query.district = district;
    if (period) query.period = period;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [insights, total] = await Promise.all([
      MarketInsight.find(query)
        .populate('product', 'name category')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MarketInsight.countDocuments(query),
    ]);

    return {
      insights,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get price recommendation for a listing
   */
  async getPriceRecommendation(
    productId: string,
    quantity: number,
    quality: string,
    region?: string,
    district?: string
  ): Promise<any> {
    // Get latest market insight
    const insight = await MarketInsight.findOne({
      product: productId,
      region,
      district,
    }).sort({ date: -1 });

    if (!insight) {
      return {
        recommended: null,
        range: { min: null, max: null },
        message: 'Insufficient market data for recommendation',
      };
    }

    // Find quality-specific pricing
    const qualityPricing = insight.competitiveAnalysis.priceRangeByQuality.find(
      q => q.grade === quality
    );

    let recommendedPrice = insight.priceStatistics.average;
    let minPrice = insight.priceStatistics.min;
    let maxPrice = insight.priceStatistics.max;

    if (qualityPricing) {
      recommendedPrice = qualityPricing.avgPrice;
      minPrice = qualityPricing.minPrice;
      maxPrice = qualityPricing.maxPrice;
    }

    // Adjust for quantity (bulk discount suggestion)
    if (quantity > 1000) {
      recommendedPrice *= 0.95; // 5% discount for bulk
    } else if (quantity > 500) {
      recommendedPrice *= 0.97; // 3% discount
    }

    return {
      recommended: Math.round(recommendedPrice),
      range: {
        min: Math.round(minPrice),
        max: Math.round(maxPrice),
      },
      confidence: insight.confidence,
      marketTrend: insight.predictions.trendDirection,
      message: `Based on ${insight.dataPoints} data points with ${insight.confidence}% confidence`,
    };
  }
}

export const marketIntelligenceService = new MarketIntelligenceService();
