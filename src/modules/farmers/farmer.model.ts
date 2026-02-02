import mongoose, { Document, Schema } from 'mongoose';

export interface IFarmer extends Document {
  user: mongoose.Types.ObjectId;
  businessName?: string;
  farmSize?: number;
  farmSizeUnit: 'acres' | 'hectares';
  location: {
    region: string;
    district: string;
    village?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  farmingType: ('crop' | 'livestock' | 'mixed' | 'aquaculture')[];
  certifications: string[];
  verified: boolean;
  rating: number;
  totalSales: number;
  createdAt: Date;
  updatedAt: Date;
}

const FarmerSchema = new Schema<IFarmer>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    farmSize: {
      type: Number,
      min: 0,
    },
    farmSizeUnit: {
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
    farmingType: {
      type: [String],
      enum: ['crop', 'livestock', 'mixed', 'aquaculture'],
      default: ['crop'],
    },
    certifications: {
      type: [String],
      default: [],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FarmerSchema.index({ user: 1 });
FarmerSchema.index({ 'location.region': 1, 'location.district': 1 });
FarmerSchema.index({ verified: 1 });
FarmerSchema.index({ rating: -1 });

export default mongoose.model<IFarmer>('Farmer', FarmerSchema);
