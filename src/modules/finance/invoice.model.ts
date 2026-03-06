import mongoose, { Document, Schema } from 'mongoose';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';

interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IInvoice extends Document {
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  invoiceNumber: string;
  items: IInvoiceLineItem[];
  amount: number;
  currency: string;
  dueDate: Date;
  issuedAt?: Date;
  paidAt?: Date;
  status: InvoiceStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>(
  {
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 0.0001 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [InvoiceLineItemSchema],
      default: [],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'UGX',
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    issuedAt: Date,
    paidAt: Date,
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

InvoiceSchema.index({ organization: 1, status: 1, isActive: 1, createdAt: -1 });
InvoiceSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

InvoiceSchema.pre('validate', function (next) {
  if (!this.invoiceNumber) {
    this.invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
  next();
});

export default mongoose.model<IInvoice>('FinanceInvoice', InvoiceSchema);
