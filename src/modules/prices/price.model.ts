import mongoose, { Document, Schema } from 'mongoose';

export interface IPrice extends Document {
  product: mongoose.Types.ObjectId;
  market: mongoose.Types.ObjectId;
  addedBy?: mongoose.Types.ObjectId;
  price: number;
  currency: string;
  date: Date;
  lastUpdated: Date;
  productType: 'solid' | 'liquid';
  quantity: number;
  unit: 'kg' | 'liters' | 'grams' | 'pieces';
  predictedPrice?: number | null;
  predictionDate?: Date | null;
  trendPercentage?: number;
  priceChangePercentage?: number;
  alertThreshold?: number | null;
  alertTriggered?: boolean;
  historicalPrices?: Array<{ date?: Date; price?: number }>;
  isValid?: boolean;
  errorLog?: string;
}

const PriceSchema = new Schema<IPrice>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    market: { type: Schema.Types.ObjectId, ref: 'Market', required: true, index: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    price: { type: Number, required: true },
    currency: { type: String, default: 'UGX' },
    date: { type: Date, required: true },
    lastUpdated: { type: Date, default: Date.now },
    productType: { type: String, enum: ['solid', 'liquid'], required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['kg', 'liters', 'grams', 'pieces'], required: true },
    predictedPrice: { type: Number, default: null },
    predictionDate: { type: Date, default: null },
    trendPercentage: { type: Number, default: 0 },
    priceChangePercentage: { type: Number, default: 0 },
    alertThreshold: { type: Number, default: null },
    alertTriggered: { type: Boolean, default: false },
    historicalPrices: [
      {
        date: { type: Date },
        price: { type: Number },
      },
    ],
    isValid: { type: Boolean, default: true },
    errorLog: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

PriceSchema.index({ product: 1, market: 1, date: -1 });

export default mongoose.model<IPrice>('Price', PriceSchema);
