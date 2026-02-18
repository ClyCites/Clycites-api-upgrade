import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketInsight extends Document {
  // Scope
  product: mongoose.Types.ObjectId;
  region?: string;
  district?: string;
  market?: mongoose.Types.ObjectId;
  
  // Time Period
  date: Date;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  
  // Price Analytics
  priceStatistics: {
    current: number;
    average: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
    changePercentage: number;
    volatilityScore: number; // 0-100
  };
  
  // Supply & Demand
  supplyDemand: {
    totalListings: number;
    totalQuantityAvailable: number;
    totalOrders: number;
    totalQuantityOrdered: number;
    supplyDemandRatio: number;
    demandScore: number; // 0-100
  };
  
  // AI Predictions
  predictions: {
    nextWeekPrice: number;
    nextMonthPrice: number;
    confidence: number; // 0-100
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    seasonalityFactor: number;
    modelVersion: string;
    generatedAt: Date;
  };
  
  // Market Trends
  trends: Array<{
    indicator: string;
    value: number;
    change: number;
    interpretation: string;
  }>;
  
  // Competitive Analysis
  competitiveAnalysis: {
    averageQuality: string;
    priceRangeByQuality: Array<{
      grade: string;
      minPrice: number;
      maxPrice: number;
      avgPrice: number;
    }>;
    topSellers: mongoose.Types.ObjectId[];
    marketConcentration: number; // HHI index
  };
  
  // Alerts
  alerts: Array<{
    type: 'price_spike' | 'price_drop' | 'high_demand' | 'low_supply';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    triggeredAt: Date;
  }>;
  
  // Data Quality
  dataPoints: number;
  confidence: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const MarketInsightSchema = new Schema<IMarketInsight>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    region: {
      type: String,
      index: true,
    },
    district: {
      type: String,
      index: true,
    },
    market: {
      type: Schema.Types.ObjectId,
      ref: 'Market',
    },
    
    date: {
      type: Date,
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      default: 'daily',
    },
    
    priceStatistics: {
      current: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      median: { type: Number, default: 0 },
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      standardDeviation: { type: Number, default: 0 },
      changePercentage: { type: Number, default: 0 },
      volatilityScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    
    supplyDemand: {
      totalListings: { type: Number, default: 0 },
      totalQuantityAvailable: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalQuantityOrdered: { type: Number, default: 0 },
      supplyDemandRatio: { type: Number, default: 0 },
      demandScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    
    predictions: {
      nextWeekPrice: { type: Number, default: 0 },
      nextMonthPrice: { type: Number, default: 0 },
      confidence: { type: Number, default: 0, min: 0, max: 100 },
      trendDirection: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable'],
        default: 'stable',
      },
      seasonalityFactor: { type: Number, default: 1 },
      modelVersion: { type: String, default: 'v1.0' },
      generatedAt: { type: Date, default: Date.now },
    },
    
    trends: [{
      indicator: String,
      value: Number,
      change: Number,
      interpretation: String,
    }],
    
    competitiveAnalysis: {
      averageQuality: String,
      priceRangeByQuality: [{
        grade: String,
        minPrice: Number,
        maxPrice: Number,
        avgPrice: Number,
      }],
      topSellers: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      marketConcentration: { type: Number, default: 0 },
    },
    
    alerts: [{
      type: {
        type: String,
        enum: ['price_spike', 'price_drop', 'high_demand', 'low_supply'],
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      message: String,
      triggeredAt: { type: Date, default: Date.now },
    }],
    
    dataPoints: {
      type: Number,
      default: 0,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MarketInsightSchema.index({ product: 1, date: -1 });
MarketInsightSchema.index({ region: 1, district: 1, product: 1, date: -1 });
MarketInsightSchema.index({ date: -1, period: 1 });

// Compound index for efficient queries
MarketInsightSchema.index({ product: 1, region: 1, period: 1, date: -1 });

export default mongoose.model<IMarketInsight>('MarketInsight', MarketInsightSchema);
