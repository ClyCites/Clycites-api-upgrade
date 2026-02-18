/**
 * Knowledge Article Model
 *
 * Structured, versioned agricultural knowledge articles with editorial workflow,
 * multilingual support, and taxonomy-based discovery.
 */

import mongoose, { Schema } from 'mongoose';
import { IKnowledgeArticle, KnowledgeCategory, PublicationStatus } from './expert.types';

const TranslationSchema = new Schema(
  {
    locale: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const MediaAttachmentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['image', 'video', 'document'],
      required: true,
    },
    url: { type: String, required: true },
    caption: { type: String },
  },
  { _id: false }
);

const KnowledgeArticleSchema = new Schema<IKnowledgeArticle>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: 'text',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
    },
    farmerFriendlySummary: { type: String, maxlength: 1000 },

    category: {
      type: String,
      enum: Object.values(KnowledgeCategory),
      required: true,
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    cropTypes: { type: [String], default: [], index: true },
    regions: { type: [String], default: [] },
    seasons: { type: [String], default: [] },

    status: {
      type: String,
      enum: Object.values(PublicationStatus),
      default: PublicationStatus.DRAFT,
      index: true,
    },
    version: { type: Number, default: 1 },

    // Authors
    primaryAuthor: {
      type: Schema.Types.ObjectId,
      ref: 'ExpertProfile',
      required: true,
      index: true,
    },
    coAuthors: [{ type: Schema.Types.ObjectId, ref: 'ExpertProfile' }],
    reviewers: [{ type: Schema.Types.ObjectId, ref: 'ExpertProfile' }],

    // Editorial workflow
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'ExpertProfile' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'ExpertProfile' },
    approvedAt: { type: Date },
    publishedAt: { type: Date },

    // Multilingual
    translations: { type: [TranslationSchema], default: [] },

    // Media
    coverImageUrl: { type: String },
    mediaAttachments: { type: [MediaAttachmentSchema], default: [] },

    // References and links
    references: { type: [String], default: [] },
    relatedArticles: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeArticle' }],

    // Engagement analytics
    viewCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },

    // Versioning
    previousVersion: { type: Schema.Types.ObjectId, ref: 'KnowledgeArticle' },
    changeLog: { type: String },

    archivedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Full text search index
KnowledgeArticleSchema.index(
  { title: 'text', summary: 'text', content: 'text', tags: 'text' },
  { weights: { title: 10, summary: 5, tags: 3, content: 1 } }
);

KnowledgeArticleSchema.index({ category: 1, status: 1 });
KnowledgeArticleSchema.index({ cropTypes: 1, status: 1 });
KnowledgeArticleSchema.index({ status: 1, publishedAt: -1 });
KnowledgeArticleSchema.index({ primaryAuthor: 1 });

// Virtual: helpful ratio
KnowledgeArticleSchema.virtual('helpfulRatio').get(function () {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (!total) return null;
  return Math.round((this.helpfulCount / total) * 100);
});

// Auto-generate slug from title
KnowledgeArticleSchema.pre('validate', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
  next();
});

export default mongoose.model<IKnowledgeArticle>('KnowledgeArticle', KnowledgeArticleSchema);
