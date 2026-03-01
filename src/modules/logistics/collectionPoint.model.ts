import mongoose, { Document, Schema } from 'mongoose';

export interface ICollectionPoint extends Document {
  name: string;
  type: 'collection_point' | 'warehouse';
  status: 'active' | 'maintenance' | 'inactive';
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  address: {
    country: string;
    district: string;
    subCounty?: string;
    parish?: string;
    village?: string;
    line1?: string;
    line2?: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  contactName?: string;
  contactPhone?: string;
  capacityTons?: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionPointSchema = new Schema<ICollectionPoint>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    type: {
      type: String,
      enum: ['collection_point', 'warehouse'],
      default: 'collection_point',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'inactive'],
      default: 'active',
      index: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    address: {
      country: {
        type: String,
        required: true,
        trim: true,
      },
      district: {
        type: String,
        required: true,
        trim: true,
      },
      subCounty: { type: String, trim: true },
      parish: { type: String, trim: true },
      village: { type: String, trim: true },
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
    },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    contactName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    capacityTons: {
      type: Number,
      min: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CollectionPointSchema.index({ organization: 1, type: 1, isActive: 1 });
CollectionPointSchema.index({ organization: 1, type: 1, status: 1, isActive: 1 });
CollectionPointSchema.index({ 'address.country': 1, 'address.district': 1, isActive: 1 });
CollectionPointSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model<ICollectionPoint>('CollectionPoint', CollectionPointSchema);
