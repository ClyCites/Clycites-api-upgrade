import mongoose, { Document, Schema } from 'mongoose';

export interface IPlot extends Document {
  farmerId: mongoose.Types.ObjectId;
  farmId?: mongoose.Types.ObjectId;
  plotName: string;
  plotCode?: string;
  area: number;
  areaUnit: 'acres' | 'hectares' | 'square_meters';
  soilType?: string;
  status: 'active' | 'fallow' | 'inactive';
  notes?: string;
  version: number;
  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  softDelete(deletedBy?: mongoose.Types.ObjectId): Promise<IPlot>;
}

const PlotSchema = new Schema<IPlot>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true,
    },
    farmId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmEnterprise',
      index: true,
    },
    plotName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    plotCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    area: {
      type: Number,
      required: true,
      min: 0.01,
    },
    areaUnit: {
      type: String,
      enum: ['acres', 'hectares', 'square_meters'],
      default: 'acres',
    },
    soilType: String,
    status: {
      type: String,
      enum: ['active', 'fallow', 'inactive'],
      default: 'active',
      index: true,
    },
    notes: String,
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

PlotSchema.index({ farmerId: 1, isActive: 1, createdAt: -1 });
PlotSchema.index({ farmId: 1, isActive: 1 });

PlotSchema.pre('save', function (next) {
  if (!this.plotCode) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.plotCode = `PLT-${timestamp}-${random}`;
  }
  next();
});

PlotSchema.methods.softDelete = async function (deletedBy?: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  if (deletedBy) this.deletedBy = deletedBy;
  return this.save();
};

export default mongoose.model<IPlot>('Plot', PlotSchema);
