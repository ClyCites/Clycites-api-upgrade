import mongoose, { Document, Schema } from 'mongoose';

export type ShipmentStatus =
  | 'created'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'returned';

interface ShipmentEndpoint {
  type: 'collection_point' | 'warehouse' | 'farm' | 'address' | 'other';
  refId?: mongoose.Types.ObjectId;
  label: string;
}

interface TrackingEvent {
  status: ShipmentStatus;
  note?: string;
  location?: string;
  updatedBy: mongoose.Types.ObjectId;
  timestamp: Date;
}

interface ProofOfDelivery {
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  originalFileName?: string;
  notes?: string;
  receivedBy?: string;
  receivedAt?: Date;
  uploadedBy?: mongoose.Types.ObjectId;
  uploadedAt?: Date;
}

export interface IShipment extends Document {
  shipmentNumber: string;
  order?: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  from: ShipmentEndpoint;
  to: ShipmentEndpoint;
  status: ShipmentStatus;
  carrierName?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryWindowStart?: Date;
  deliveryWindowEnd?: Date;
  expectedDeliveryAt?: Date;
  actualDeliveredAt?: Date;
  trackingEvents: TrackingEvent[];
  proofOfDelivery?: ProofOfDelivery;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentEndpointSchema = new Schema<ShipmentEndpoint>(
  {
    type: {
      type: String,
      enum: ['collection_point', 'warehouse', 'farm', 'address', 'other'],
      required: true,
    },
    refId: {
      type: Schema.Types.ObjectId,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false }
);

const TrackingEventSchema = new Schema<TrackingEvent>(
  {
    status: {
      type: String,
      enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const ProofOfDeliverySchema = new Schema<ProofOfDelivery>(
  {
    fileUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    sizeBytes: {
      type: Number,
      min: 0,
      max: 5 * 1024 * 1024,
    },
    originalFileName: {
      type: String,
      trim: true,
      maxlength: 260,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    receivedBy: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    receivedAt: Date,
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: Date,
  },
  { _id: false }
);

const ShipmentSchema = new Schema<IShipment>(
  {
    shipmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
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
    from: {
      type: ShipmentEndpointSchema,
      required: true,
    },
    to: {
      type: ShipmentEndpointSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'],
      default: 'created',
      index: true,
    },
    carrierName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    driverName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    driverPhone: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    deliveryWindowStart: Date,
    deliveryWindowEnd: Date,
    expectedDeliveryAt: Date,
    actualDeliveredAt: Date,
    trackingEvents: {
      type: [TrackingEventSchema],
      default: [],
    },
    proofOfDelivery: ProofOfDeliverySchema,
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ShipmentSchema.index({ organization: 1, status: 1, createdAt: -1 });
ShipmentSchema.index({ createdBy: 1, createdAt: -1 });
ShipmentSchema.index({ shipmentNumber: 1, status: 1 });

export default mongoose.model<IShipment>('Shipment', ShipmentSchema);
