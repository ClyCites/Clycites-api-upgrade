import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceAlert extends Document {
  userId: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  market: mongoose.Types.ObjectId;
  priceThreshold: number;
  alertTriggered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PriceAlertSchema = new Schema<IPriceAlert>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    market: { type: Schema.Types.ObjectId, ref: 'Market', required: true },
    priceThreshold: { type: Number, required: true },
    alertTriggered: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPriceAlert>('PriceAlert', PriceAlertSchema);
