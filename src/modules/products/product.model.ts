import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: 'grains' | 'vegetables' | 'fruits' | 'livestock' | 'dairy' | 'other';
  variety?: string;
  description?: string;
  unit: 'kg' | 'ton' | 'bag' | 'piece' | 'liter' | 'crate';
  minOrderQuantity: number;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['grains', 'vegetables', 'fruits', 'livestock', 'dairy', 'other'],
      required: [true, 'Category is required'],
      index: true,
    },
    variety: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      enum: ['kg', 'ton', 'bag', 'piece', 'liter', 'crate'],
      required: [true, 'Unit is required'],
    },
    minOrderQuantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    images: {
      type: [String],
      default: [],
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

// Indexes
ProductSchema.index({ name: 1, category: 1 });
ProductSchema.index({ isActive: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
