/**
 * Dashboard Model
 *
 * Stores dashboard layouts: a named collection of charts with positions/sizes.
 * Supports personal, organization, role-restricted dashboards, and templates.
 */

import mongoose, { Schema, Document } from 'mongoose';
import {
  IDashboardDocument,
  IDashboardItem,
  IDashboardSharingRule,
  ShareScope,
} from './analytics.types';

export interface IDashboardMongoDocument extends Omit<IDashboardDocument, '_id'>, Document {}

const dashboardItemSchema = new Schema<IDashboardItem>(
  {
    chartId:  { type: Schema.Types.ObjectId, ref: 'Chart', required: true },
    position: {
      col: { type: Number, required: true, default: 0 },
      row: { type: Number, required: true, default: 0 },
    },
    size: {
      w: { type: Number, required: true, default: 6, min: 1, max: 12 },
      h: { type: Number, required: true, default: 4, min: 1, max: 24 },
    },
    title: String,
  },
  { _id: false }
);

const sharingRuleSchema = new Schema<IDashboardSharingRule>(
  {
    scope:   { type: String, enum: Object.values(ShareScope), required: true, default: ShareScope.OWNER_ONLY },
    roles:   [String],
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const dashboardSchema = new Schema<IDashboardMongoDocument>(
  {
    name:        { type: String, required: true, maxlength: 120 },
    description: { type: String, maxlength: 500 },
    ownerId:     { type: Schema.Types.ObjectId, ref: 'User',        required: true, index: true },
    orgId:       { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    items:       { type: [dashboardItemSchema], default: [] },
    sharing: {
      type:    sharingRuleSchema,
      default: () => ({ scope: ShareScope.OWNER_ONLY }),
    },
    isTemplate: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    templateCategory: {
      type: String,
      enum: ['farmer', 'organization', 'expert', 'admin', 'outbreak', 'market'],
    },
    tags:      [String],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dashboardSchema.index({ ownerId: 1, isDefault: 1 });
dashboardSchema.index({ orgId: 1, 'sharing.scope': 1 });
dashboardSchema.index({ isTemplate: 1, templateCategory: 1 });

const Dashboard = mongoose.model<IDashboardMongoDocument>('Dashboard', dashboardSchema);
export default Dashboard;
