import mongoose, { Document, Schema } from 'mongoose';

// ── Status history entry (immutable audit trail) ──────────────────────────────
export interface IOrderStatusEntry {
  status:    string;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  note?:     string;
}

export interface IOrder extends Document {
  orderNumber: string;
  buyer: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  listing: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deliveryFee: number;
  platformFee: number;
  finalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  // ── Enterprise additions ──────────────────────────────────────────────────
  statusHistory:          IOrderStatusEntry[];
  quantityDelivered?:     number;  // buyer-confirmed quantity
  deliveryConfirmedAt?:   Date;
  deliveryConfirmedBy?:   mongoose.Types.ObjectId;
  disputeWindowExpiresAt?: Date;   // 48h window after delivery confirmation
  disputeId?:             mongoose.Types.ObjectId;
  deliveryPhotos?:        mongoose.Types.ObjectId[]; // MediaFile refs
  // ─────────────────────────────────────────────────────────────────────────
  deliveryAddress: {
    region: string;
    district: string;
    subcounty?: string;
    village?: string;
    street?: string;
    landmark?: string;
    phone: string;
    recipientName: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  deliveryOption: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  cancellationReason?: string;
  cancelledBy?: 'buyer' | 'farmer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
      index: true,
    },
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'in_transit', 'delivered', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
      index: true,
    },
    deliveryAddress: {
      region: { type: String, required: true },
      district: { type: String, required: true },
      subcounty: String,
      village: String,
      street: String,
      landmark: String,
      phone: { type: String, required: true },
      recipientName: { type: String, required: true },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    deliveryOption: {
      type: String,
      required: true,
    },
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    notes: String,
    cancellationReason: String,
    cancelledBy: {
      type: String,
      enum: ['buyer', 'farmer', 'admin'],
    },
    // ── Enterprise audit / dispute fields ─────────────────────────────────────
    statusHistory: {
      type: [
        {
          status:    { type: String, required: true },
          changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          changedAt: { type: Date, default: Date.now },
          note:      String,
        },
      ],
      default: [],
    },
    quantityDelivered:     { type: Number, min: 0 },
    deliveryConfirmedAt:   Date,
    deliveryConfirmedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
    disputeWindowExpiresAt: Date,
    disputeId:             { type: Schema.Types.ObjectId, ref: 'Dispute' },
    deliveryPhotos:        [{ type: Schema.Types.ObjectId, ref: 'MediaFile' }],
  },
  {
    timestamps: true,
  }
);

// Generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${year}${month}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ farmer: 1, status: 1 });

const Order = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
