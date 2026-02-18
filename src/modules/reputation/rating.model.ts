import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  // Transaction Reference
  order: mongoose.Types.ObjectId;
  offer?: mongoose.Types.ObjectId;
  
  // Parties
  ratedUser: mongoose.Types.ObjectId;
  ratedBy: mongoose.Types.ObjectId;
  raterRole: 'buyer' | 'seller';
  
  // Rating Components
  overallRating: number; // 1-5
  categoryRatings: {
    productQuality?: number;
    communication?: number;
    packaging?: number;
    delivery?: number;
    pricing?: number;
    professionalism?: number;
    responsiveness?: number;
  };
  
  // Feedback
  review?: string;
  pros?: string[];
  cons?: string[];
  
  // Media Evidence
  images?: string[];
  
  // Recommendations
  wouldRecommend: boolean;
  wouldBuyAgain?: boolean;
  
  // Verification
  verified: boolean;
  helpful: number;
  notHelpful: number;
  
  // Response
  sellerResponse?: {
    message: string;
    respondedAt: Date;
  };
  
  // Moderation
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  flagReason?: string;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
    },
    
    ratedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ratedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    raterRole: {
      type: String,
      enum: ['buyer', 'seller'],
      required: true,
    },
    
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    
    categoryRatings: {
      productQuality: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      packaging: { type: Number, min: 1, max: 5 },
      delivery: { type: Number, min: 1, max: 5 },
      pricing: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
      responsiveness: { type: Number, min: 1, max: 5 },
    },
    
    review: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    pros: [String],
    cons: [String],
    
    images: [String],
    
    wouldRecommend: {
      type: Boolean,
      required: true,
    },
    wouldBuyAgain: Boolean,
    
    verified: {
      type: Boolean,
      default: true, // Verified if linked to actual order
    },
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
    
    sellerResponse: {
      message: String,
      respondedAt: Date,
    },
    
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'approved', // Auto-approve unless flagged
      index: true,
    },
    flagReason: String,
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate ratings
RatingSchema.index({ order: 1, ratedBy: 1, raterRole: 1 }, { unique: true });

// Indexes for queries
RatingSchema.index({ ratedUser: 1, status: 1, createdAt: -1 });
RatingSchema.index({ status: 1, overallRating: -1 });

export default mongoose.model<IRating>('Rating', RatingSchema);
