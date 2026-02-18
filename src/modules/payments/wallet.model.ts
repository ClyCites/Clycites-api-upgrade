import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  user: mongoose.Types.ObjectId;
  
  // Balance
  balance: number;
  currency: string;
  escrowBalance: number;
  availableBalance: number;
  
  // Limits
  dailyLimit: number;
  monthlyLimit: number;
  transactionLimit: number;
  
  // Status
  status: 'active' | 'suspended' | 'frozen' | 'closed';
  kycVerified: boolean;
  kycLevel: 'basic' | 'intermediate' | 'advanced';
  
  // Bank Linking
  linkedBankAccounts: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    branchCode?: string;
    isPrimary: boolean;
    verified: boolean;
    addedAt: Date;
  }>;
  
  // Mobile Money
  linkedMobileAccounts: Array<{
    provider: string;
    phoneNumber: string;
    accountName: string;
    isPrimary: boolean;
    verified: boolean;
    addedAt: Date;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'UGX',
    },
    escrowBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    dailyLimit: {
      type: Number,
      default: 5000000, // 5M UGX
    },
    monthlyLimit: {
      type: Number,
      default: 50000000, // 50M UGX
    },
    transactionLimit: {
      type: Number,
      default: 10000000, // 10M UGX per transaction
    },
    
    status: {
      type: String,
      enum: ['active', 'suspended', 'frozen', 'closed'],
      default: 'active',
      index: true,
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    kycLevel: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced'],
      default: 'basic',
    },
    
    linkedBankAccounts: [{
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true }, // Should be encrypted in production
      accountName: { type: String, required: true },
      branchCode: String,
      isPrimary: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      addedAt: { type: Date, default: Date.now },
    }],
    
    linkedMobileAccounts: [{
      provider: { type: String, required: true }, // MTN, Airtel, etc.
      phoneNumber: { type: String, required: true }, // Should be encrypted in production
      accountName: { type: String, required: true },
      isPrimary: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      addedAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  }
);

// Update available balance before save
WalletSchema.pre('save', function (next) {
  this.availableBalance = this.balance - this.escrowBalance;
  next();
});

// Virtual for checking if wallet is usable
WalletSchema.virtual('isUsable').get(function () {
  return this.status === 'active' && this.kycVerified;
});

export default mongoose.model<IWallet>('Wallet', WalletSchema);
