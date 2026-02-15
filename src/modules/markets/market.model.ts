import mongoose, { Document, Schema } from 'mongoose';

export interface IMarket extends Document {
  name: string;
  location: string;
  region: string;
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MarketSchema = new Schema<IMarket>(
  {
    name: {
      type: String,
      required: [true, 'Market name is required'],
      unique: true,
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      trim: true,
      index: true,
    },
    country: {
      type: String,
      default: 'Uganda',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

MarketSchema.index({ name: 1 });
MarketSchema.index({ region: 1 });

export default mongoose.model<IMarket>('Market', MarketSchema);
