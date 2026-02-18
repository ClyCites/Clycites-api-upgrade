import mongoose, { Document, Schema } from 'mongoose';

export interface IOffer extends Document {
  offerNumber: string;
  
  // Parties
  buyer: mongoose.Types.ObjectId;
  buyerOrganization?: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  listing: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  
  // Offer Details
  offerType: 'direct' | 'counter' | 'bulk' | 'auction_bid';
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  
  // Terms & Conditions
  terms: {
    paymentTerms?: string;
    deliveryTerms?: string;
    qualityRequirements?: string;
    inspectionRights?: boolean;
    returnPolicy?: string;
  };
  
  // Delivery
  deliveryOption: 'pickup' | 'seller_delivery' | 'third_party';
  deliveryLocation?: {
    type: string;
    coordinates: [number, number];
  };
  deliveryAddress?: {
    region: string;
    district: string;
    subcounty?: string;
    village?: string;
    street?: string;
    phone: string;
    recipientName: string;
  };
  deliveryDate?: Date;
  
  // Status & Lifecycle
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired' | 'withdrawn' | 'superseded';
  expiresAt: Date;
  
  // Negotiation Chain
  parentOffer?: mongoose.Types.ObjectId;
  counterOffers: mongoose.Types.ObjectId[];
  negotiationHistory: Array<{
    action: 'created' | 'countered' | 'accepted' | 'rejected' | 'withdrawn';
    by: mongoose.Types.ObjectId;
    price: number;
    quantity: number;
    notes?: string;
    timestamp: Date;
  }>;
  
  // Communication
  messages: Array<{
    from: mongoose.Types.ObjectId;
    message: string;
    timestamp: Date;
    read: boolean;
  }>;
  
  // Financial
  platformFee: number;
  platformFeePercentage: number;
  escrowRequired: boolean;
  escrowId?: mongoose.Types.ObjectId;
  
  // Response Tracking
  responseBy?: mongoose.Types.ObjectId;
  respondedAt?: Date;
  responseTime?: number;
  
  // Conversion
  convertedToOrder?: mongoose.Types.ObjectId;
  convertedAt?: Date;
  
  // Metadata
  notes?: string;
  internalNotes?: string;
  flagged: boolean;
  flagReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    offerNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    
    // Parties
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyerOrganization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    
    // Offer Details
    offerType: {
      type: String,
      enum: ['direct', 'counter', 'bulk', 'auction_bid'],
      default: 'direct',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'UGX',
    },
    
    // Terms & Conditions
    terms: {
      paymentTerms: String,
      deliveryTerms: String,
      qualityRequirements: String,
      inspectionRights: Boolean,
      returnPolicy: String,
    },
    
    // Delivery
    deliveryOption: {
      type: String,
      enum: ['pickup', 'seller_delivery', 'third_party'],
      required: true,
    },
    deliveryLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
    },
    deliveryAddress: {
      region: String,
      district: String,
      subcounty: String,
      village: String,
      street: String,
      phone: String,
      recipientName: String,
    },
    deliveryDate: Date,
    
    // Status & Lifecycle
    status: {
      type: String,
      enum: ['pending', 'countered', 'accepted', 'rejected', 'expired', 'withdrawn', 'superseded'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    
    // Negotiation Chain
    parentOffer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      index: true,
    },
    counterOffers: [{
      type: Schema.Types.ObjectId,
      ref: 'Offer',
    }],
    negotiationHistory: [{
      action: {
        type: String,
        enum: ['created', 'countered', 'accepted', 'rejected', 'withdrawn'],
        required: true,
      },
      by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      price: Number,
      quantity: Number,
      notes: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Communication
    messages: [{
      from: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      read: {
        type: Boolean,
        default: false,
      },
    }],
    
    // Financial
    platformFee: {
      type: Number,
      default: 0,
    },
    platformFeePercentage: {
      type: Number,
      default: 2.5, // 2.5% default platform fee
    },
    escrowRequired: {
      type: Boolean,
      default: false,
    },
    escrowId: {
      type: Schema.Types.ObjectId,
      ref: 'Escrow',
    },
    
    // Response Tracking
    responseBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: Date,
    responseTime: Number, // milliseconds
    
    // Conversion
    convertedToOrder: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    convertedAt: Date,
    
    // Metadata
    notes: String,
    internalNotes: String,
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
OfferSchema.index({ buyer: 1, status: 1, createdAt: -1 });
OfferSchema.index({ seller: 1, status: 1, createdAt: -1 });
OfferSchema.index({ status: 1, expiresAt: 1 });
OfferSchema.index({ listing: 1, status: 1 });

// Auto-generate offer number
OfferSchema.pre('save', async function (next) {
  if (!this.offerNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Count today's offers
    const count = await mongoose.model('Offer').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });
    
    const sequence = (count + 1).toString().padStart(6, '0');
    this.offerNumber = `OFF-${year}${month}${day}-${sequence}`;
  }
  
  // Calculate response time if responded
  if (this.respondedAt && !this.responseTime) {
    this.responseTime = this.respondedAt.getTime() - this.createdAt.getTime();
  }
  
  next();
});

// Auto-expire offers
OfferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if offer is active
OfferSchema.virtual('isActive').get(function () {
  return this.status === 'pending' && this.expiresAt > new Date();
});

// Virtual for checking if can counter
OfferSchema.virtual('canCounter').get(function () {
  return ['pending', 'countered'].includes(this.status) && this.expiresAt > new Date();
});

export default mongoose.model<IOffer>('Offer', OfferSchema);
