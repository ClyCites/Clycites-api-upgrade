import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  transactionNumber: string;
  
  // Parties
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  
  // Transaction Details
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'escrow_hold' | 'escrow_release' | 'fee' | 'commission' | 'transfer';
  amount: number;
  currency: string;
  
  // References
  order?: mongoose.Types.ObjectId;
  offer?: mongoose.Types.ObjectId;
  relatedTransaction?: mongoose.Types.ObjectId;
  
  // Payment Details
  paymentMethod: 'wallet' | 'mobile_money' | 'bank_transfer' | 'card' | 'cash';
  paymentProvider?: string;
  externalReference?: string;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'cancelled';
  
  // Escrow
  isEscrow: boolean;
  escrowReleasedAt?: Date;
  escrowReleaseCondition?: string;
  
  // Balances (snapshot)
  balanceBefore: number;
  balanceAfter: number;
  
  // Fees
  platformFee: number;
  processingFee: number;
  totalFees: number;
  
  // Metadata
  description: string;
  metadata?: any;
  
  // Processing
  processedAt?: Date;
  failureReason?: string;
  retryCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'payment', 'refund', 'escrow_hold', 'escrow_release', 'fee', 'commission', 'transfer'],
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
    
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
    },
    relatedTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    
    paymentMethod: {
      type: String,
      enum: ['wallet', 'mobile_money', 'bank_transfer', 'card', 'cash'],
      required: true,
    },
    paymentProvider: String,
    externalReference: String,
    
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    
    isEscrow: {
      type: Boolean,
      default: false,
    },
    escrowReleasedAt: Date,
    escrowReleaseCondition: String,
    
    balanceBefore: Number,
    balanceAfter: Number,
    
    platformFee: {
      type: Number,
      default: 0,
    },
    processingFee: {
      type: Number,
      default: 0,
    },
    totalFees: {
      type: Number,
      default: 0,
    },
    
    description: {
      type: String,
      required: true,
    },
    metadata: Schema.Types.Mixed,
    
    processedAt: Date,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TransactionSchema.index({ from: 1, createdAt: -1 });
TransactionSchema.index({ to: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });

// Auto-generate transaction number
TransactionSchema.pre('save', async function (next) {
  if (!this.transactionNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await mongoose.model('Transaction').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });
    
    const sequence = (count + 1).toString().padStart(8, '0');
    this.transactionNumber = `TXN-${year}${month}${day}-${sequence}`;
  }
  
  next();
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
