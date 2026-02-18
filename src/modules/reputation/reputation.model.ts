import mongoose, { Document, Schema } from 'mongoose';

export interface IReputationScore extends Document {
  user: mongoose.Types.ObjectId;
  userType: 'farmer' | 'buyer' | 'cooperative' | 'processor';
  
  // Aggregate Scores
  overallScore: number; // 0-100
  trustLevel: 'new' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'verified';
  
  // Rating Statistics
  ratings: {
    average: number; // 0-5
    count: number;
    distribution: {
      five: number;
      four: number;
      three: number;
      two: number;
      one: number;
    };
    recent30Days: number;
  };
  
  // Transaction History
  transactions: {
    total: number;
    completed: number;
    cancelled: number;
    disputed: number;
    completionRate: number;
    cancellationRate: number;
    disputeRate: number;
    totalValue: number;
    averageOrderValue: number;
    asSellerCount: number;
    asBuyerCount: number;
  };
  
  // Behavioral Metrics
  behavior: {
    responseTime: number; // average in minutes
    responseRate: number; // percentage
    onTimeDeliveryRate: number;
    qualityComplaintRate: number;
    repeatCustomerRate: number;
    accountAge: number; // days
    lastActiveAt: Date;
    activityScore: number; // 0-100
  };
  
  // Verification & Trust Badges
  verifications: Array<{
    type: 'identity' | 'address' | 'business' | 'bank' | 'phone' | 'email' | 'farm';
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    expiresAt?: Date;
    documents?: string[];
  }>;
  
  badges: Array<{
    type: string;
    awardedAt: Date;
    validUntil?: Date;
  }>;
  
  // Risk Assessment
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number; // 0-100
    factors: string[];
    lastAssessedAt: Date;
    fraudFlags: number;
    suspiciousActivity: Array<{
      type: string;
      detectedAt: Date;
      severity: string;
      resolved: boolean;
    }>;
  };
  
  // Performance Trends
  trends: {
    ratingTrend: 'improving' | 'stable' | 'declining';
    transactionVolumeTrend: 'growing' | 'stable' | 'declining';
    lastCalculated: Date;
  };
  
  // Ranking
  ranking: {
    regional?: number;
    national?: number;
    category?: number;
  };
  
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReputationScoreSchema = new Schema<IReputationScore>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ['farmer', 'buyer', 'cooperative', 'processor'],
      required: true,
    },
    
    overallScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
      index: true,
    },
    trustLevel: {
      type: String,
      enum: ['new', 'bronze', 'silver', 'gold', 'platinum', 'verified'],
      default: 'new',
      index: true,
    },
    
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
      distribution: {
        five: { type: Number, default: 0 },
        four: { type: Number, default: 0 },
        three: { type: Number, default: 0 },
        two: { type: Number, default: 0 },
        one: { type: Number, default: 0 },
      },
      recent30Days: { type: Number, default: 0 },
    },
    
    transactions: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      disputed: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      cancellationRate: { type: Number, default: 0 },
      disputeRate: { type: Number, default: 0 },
      totalValue: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      asSellerCount: { type: Number, default: 0 },
      asBuyerCount: { type: Number, default: 0 },
    },
    
    behavior: {
      responseTime: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 },
      onTimeDeliveryRate: { type: Number, default: 0 },
      qualityComplaintRate: { type: Number, default: 0 },
      repeatCustomerRate: { type: Number, default: 0 },
      accountAge: { type: Number, default: 0 },
      lastActiveAt: { type: Date, default: Date.now },
      activityScore: { type: Number, default: 0 },
    },
    
    verifications: [{
      type: {
        type: String,
        enum: ['identity', 'address', 'business', 'bank', 'phone', 'email', 'farm'],
        required: true,
      },
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      expiresAt: Date,
      documents: [String],
    }],
    
    badges: [{
      type: { type: String, required: true },
      awardedAt: { type: Date, default: Date.now },
      validUntil: Date,
    }],
    
    risk: {
      level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
      },
      score: { type: Number, default: 0, min: 0, max: 100 },
      factors: [String],
      lastAssessedAt: { type: Date, default: Date.now },
      fraudFlags: { type: Number, default: 0 },
      suspiciousActivity: [{
        type: String,
        detectedAt: Date,
        severity: String,
        resolved: { type: Boolean, default: false },
      }],
    },
    
    trends: {
      ratingTrend: {
        type: String,
        enum: ['improving', 'stable', 'declining'],
        default: 'stable',
      },
      transactionVolumeTrend: {
        type: String,
        enum: ['growing', 'stable', 'declining'],
        default: 'stable',
      },
      lastCalculated: { type: Date, default: Date.now },
    },
    
    ranking: {
      regional: Number,
      national: Number,
      category: Number,
    },
    
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ReputationScoreSchema.index({ overallScore: -1 });
ReputationScoreSchema.index({ trustLevel: 1 });
ReputationScoreSchema.index({ 'ranking.national': 1 });
ReputationScoreSchema.index({ userType: 1, overallScore: -1 });

// Helper method to calculate trust level
ReputationScoreSchema.methods.calculateTrustLevel = function (): string {
  const score = this.overallScore;
  const transactionCount = this.transactions.total;
  const verificationCount = this.verifications.filter((v: any) => v.verified).length;
  
  // Verified badge requires multiple verifications
  if (verificationCount >= 5 && score >= 90 && transactionCount >= 100) {
    return 'verified';
  }
  
  // Platinum: High score, many transactions
  if (score >= 85 && transactionCount >= 50) {
    return 'platinum';
  }
  
  // Gold: Good score, moderate transactions
  if (score >= 75 && transactionCount >= 25) {
    return 'gold';
  }
  
  // Silver: Decent score, some transactions
  if (score >= 65 && transactionCount >= 10) {
    return 'silver';
  }
  
  // Bronze: Some activity
  if (score >= 50 && transactionCount >= 3) {
    return 'bronze';
  }
  
  return 'new';
};

// Helper method to calculate overall score
ReputationScoreSchema.methods.calculateOverallScore = function (): number {
  const weights = {
    ratings: 0.35,
    completionRate: 0.25,
    responseMetrics: 0.15,
    verifications: 0.10,
    activityAge: 0.10,
    riskPenalty: 0.05,
  };
  
  // Ratings component (0-100)
  const ratingScore = (this.ratings.average / 5) * 100;
  
  // Completion rate component (0-100)
  const completionScore = this.transactions.completionRate;
  
  // Response metrics (0-100)
  const responseScore = (
    (this.behavior.responseRate * 0.5) +
    (this.behavior.onTimeDeliveryRate * 0.5)
  );
  
  // Verifications (0-100)
  const verificationScore = Math.min(
    (this.verifications.filter((v: any) => v.verified).length / 5) * 100,
    100
  );
  
  // Activity and account age (0-100)
  const activityScore = Math.min(
    (this.behavior.accountAge / 365) * 50 + this.behavior.activityScore * 0.5,
    100
  );
  
  // Risk penalty (subtract from 100)
  const riskPenalty = this.risk.score;
  
  // Weighted average
  const totalScore = (
    (ratingScore * weights.ratings) +
    (completionScore * weights.completionRate) +
    (responseScore * weights.responseMetrics) +
    (verificationScore * weights.verifications) +
    (activityScore * weights.activityAge) -
    (riskPenalty * weights.riskPenalty)
  );
  
  return Math.max(0, Math.min(100, totalScore));
};

export default mongoose.model<IReputationScore>('ReputationScore', ReputationScoreSchema);
