import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceAlert extends Document {
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  region?: string;
  district?: string;
  
  // Alert Configuration
  alertType: 'price_drop' | 'price_increase' | 'target_price' | 'availability';
  condition: {
    operator: 'below' | 'above' | 'equals' | 'changes_by';
    threshold: number;
    percentage?: number;
  };
  
  // Notification Preferences
  notificationChannels: ('email' | 'sms' | 'push' | 'in_app')[];
  frequency: 'instant' | 'daily' | 'weekly';
  
  // Status
  active: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const PriceAlertSchema = new Schema<IPriceAlert>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    region: String,
    district: String,
    
    alertType: {
      type: String,
      enum: ['price_drop', 'price_increase', 'target_price', 'availability'],
      required: true,
    },
    
    condition: {
      operator: {
        type: String,
        enum: ['below', 'above', 'equals', 'changes_by'],
        required: true,
      },
      threshold: {
        type: Number,
        required: true,
      },
      percentage: Number,
    },
    
    notificationChannels: {
      type: [String],
      enum: ['email', 'sms', 'push', 'in_app'],
      default: ['in_app'],
    },
    frequency: {
      type: String,
      enum: ['instant', 'daily', 'weekly'],
      default: 'instant',
    },
    
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastTriggered: Date,
    triggerCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PriceAlertSchema.index({ user: 1, active: 1 });
PriceAlertSchema.index({ product: 1, active: 1 });

export default mongoose.model<IPriceAlert>('MarketAlert', PriceAlertSchema);
