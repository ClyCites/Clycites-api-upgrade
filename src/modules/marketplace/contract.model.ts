import mongoose, { Document, Schema } from 'mongoose';

export type MarketplaceContractStatus =
  | 'draft'
  | 'under_review'
  | 'active'
  | 'completed'
  | 'terminated';

export interface IMarketplaceContract extends Document {
  contractNumber: string;
  organization?: mongoose.Types.ObjectId;
  listing?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  offer?: mongoose.Types.ObjectId;
  title: string;
  terms: string;
  valueAmount?: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  parties: mongoose.Types.ObjectId[];
  signatures: Array<{
    user: mongoose.Types.ObjectId;
    signedAt: Date;
    note?: string;
  }>;
  status: MarketplaceContractStatus;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy: mongoose.Types.ObjectId): Promise<IMarketplaceContract>;
}

const marketplaceContractSchema = new Schema<IMarketplaceContract>(
  {
    contractNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    terms: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
    },
    valueAmount: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'UGX',
      trim: true,
      maxlength: 12,
    },
    startDate: Date,
    endDate: Date,
    parties: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    }],
    signatures: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      signedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
      note: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    }],
    status: {
      type: String,
      enum: ['draft', 'under_review', 'active', 'completed', 'terminated'],
      default: 'draft',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

marketplaceContractSchema.pre('validate', async function (next) {
  if (!this.contractNumber) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('MarketplaceContract').countDocuments({
      createdAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      },
    });
    this.contractNumber = `CTR-${year}${month}-${String(count + 1).padStart(6, '0')}`;
  }

  next();
});

marketplaceContractSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
marketplaceContractSchema.index({ parties: 1, status: 1, isActive: 1, createdAt: -1 });

marketplaceContractSchema.methods.softDelete = async function (deletedBy: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<IMarketplaceContract>('MarketplaceContract', marketplaceContractSchema);
