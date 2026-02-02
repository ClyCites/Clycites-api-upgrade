import mongoose, { Document, Schema } from 'mongoose';

export interface IFarm extends Document {
  farmer: mongoose.Types.ObjectId;
  name: string;
  size: number;
  sizeUnit: 'acres' | 'hectares';
  location: {
    region: string;
    district: string;
    village?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  soilType?: string;
  waterSource?: string;
  crops: string[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const FarmSchema = new Schema<IFarm>(
  {
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, 'Farm size is required'],
      min: 0,
    },
    sizeUnit: {
      type: String,
      enum: ['acres', 'hectares'],
      default: 'acres',
    },
    location: {
      region: {
        type: String,
        required: [true, 'Region is required'],
      },
      district: {
        type: String,
        required: [true, 'District is required'],
      },
      village: {
        type: String,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    soilType: {
      type: String,
    },
    waterSource: {
      type: String,
    },
    crops: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FarmSchema.index({ farmer: 1 });
FarmSchema.index({ 'location.region': 1, 'location.district': 1 });

export default mongoose.model<IFarm>('Farm', FarmSchema);
