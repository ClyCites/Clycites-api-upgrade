import mongoose, { Document, Schema } from 'mongoose';

export interface IListing extends Document {
  farmer: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  title: string;
  description: string;
  quantity: number;
  price: number;
  priceUnit: string;
  quality: 'premium' | 'grade-a' | 'grade-b' | 'standard';
  harvestDate?: Date;
  availableFrom: Date;
  availableUntil?: Date;
  location: {
    region: string;
    district: string;
  };
  images: string[];
  status: 'active' | 'pending' | 'sold' | 'expired' | 'cancelled';
  views: number;
  inquiries: number;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    priceUnit: {
      type: String,
      required: [true, 'Price unit is required'],
    },
    quality: {
      type: String,
      enum: ['premium', 'grade-a', 'grade-b', 'standard'],
      default: 'standard',
    },
    harvestDate: {
      type: Date,
    },
    availableFrom: {
      type: Date,
      default: Date.now,
    },
    availableUntil: {
      type: Date,
    },
    location: {
      region: {
        type: String,
        required: true,
        index: true,
      },
      district: {
        type: String,
        required: true,
        index: true,
      },
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'sold', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    inquiries: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ListingSchema.index({ status: 1, availableFrom: 1 });
ListingSchema.index({ 'location.region': 1, status: 1 });
ListingSchema.index({ price: 1 });
ListingSchema.index({ createdAt: -1 });

export default mongoose.model<IListing>('Listing', ListingSchema);
