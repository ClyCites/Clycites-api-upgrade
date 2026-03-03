import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceAlert extends Document {
  user: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
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
  status: 'new' | 'investigating' | 'investigated' | 'dismissed';
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
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
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
    status: {
      type: String,
      enum: ['new', 'investigating', 'investigated', 'dismissed'],
      default: 'new',
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
PriceAlertSchema.index({ organization: 1, status: 1, createdAt: -1 });

PriceAlertSchema.pre('save', function syncLegacyActive(next) {
  if (this.isModified('status')) {
    this.active = this.status !== 'dismissed';
  } else if (this.isModified('active') && this.status === undefined) {
    this.status = this.active ? 'new' : 'dismissed';
  }
  next();
});

export default mongoose.model<IPriceAlert>('MarketAlert', PriceAlertSchema);
