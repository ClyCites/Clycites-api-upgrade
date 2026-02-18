import mongoose, { Document, Schema } from 'mongoose';

export interface IEscrow extends Document {
  escrowNumber: string;
  
  order: mongoose.Types.ObjectId;
  buyer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  
  amount: number;
  currency: string;
  platformFee: number;
  
  status: 'initiated' | 'funded' | 'held' | 'released' | 'refunded' | 'disputed';
  
  fundedAt?: Date;
  fundingTransaction?: mongoose.Types.ObjectId;
  
  releaseConditions: Array<{
    condition: string;
    met: boolean;
    metAt?: Date;
  }>;
  
  releasedAt?: Date;
  releaseTransaction?: mongoose.Types.ObjectId;
  releasedTo?: mongoose.Types.ObjectId;
  
  refundedAt?: Date;
  refundTransaction?: mongoose.Types.ObjectId;
  refundReason?: string;
  
  dispute?: {
    raised: boolean;
    raisedBy: mongoose.Types.ObjectId;
    raisedAt: Date;
    reason: string;
    resolution?: string;
    resolvedAt?: Date;
  };
  
  expiresAt: Date;
  
  timeline: Array<{
    event: string;
    timestamp: Date;
    by?: mongoose.Types.ObjectId;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const EscrowSchema = new Schema<IEscrow>(
  {
    escrowNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'UGX',
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    
    status: {
      type: String,
      enum: ['initiated', 'funded', 'held', 'released', 'refunded', 'disputed'],
      default: 'initiated',
      index: true,
    },
    
    fundedAt: Date,
    fundingTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    
    releaseConditions: [{
      condition: { type: String, required: true },
      met: { type: Boolean, default: false },
      metAt: Date,
    }],
    
    releasedAt: Date,
    releaseTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    releasedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    refundedAt: Date,
    refundTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    refundReason: String,
    
    dispute: {
      raised: { type: Boolean, default: false },
      raisedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      raisedAt: Date,
      reason: String,
      resolution: String,
      resolvedAt: Date,
    },
    
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    
    timeline: [{
      event: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
EscrowSchema.index({ order: 1 });
EscrowSchema.index({ status: 1, expiresAt: 1 });
EscrowSchema.index({ buyer: 1, status: 1 });
EscrowSchema.index({ seller: 1, status: 1 });

// Auto-generate escrow number
EscrowSchema.pre('save', async function (next) {
  if (!this.escrowNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await mongoose.model('Escrow').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });
    
    const sequence = (count + 1).toString().padStart(6, '0');
    this.escrowNumber = `ESC-${year}${month}${day}-${sequence}`;
  }
  
  next();
});

export default mongoose.model<IEscrow>('Escrow', EscrowSchema);
