/**
 * Treatment Knowledge Base Model
 * 
 * Enterprise knowledge repository for pest and disease identification, symptoms,
 * prevention strategies, and treatment recommendations. Supports multi-tenant
 * content management with versioning and expert curation.
 */

import mongoose, { Schema } from 'mongoose';
import {
  ITreatmentKnowledgeBase,
  DetectionType,
  SeverityLevel,
  IChemicalControl,
  IOrganicControl,
  IPreventivePractice,
  ITreatmentRecommendation
} from './pestDisease.types';

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

/**
 * Chemical control option sub-schema
 */
const ChemicalControlSchema = new Schema<IChemicalControl>({
  activIngredient: { type: String, required: true, trim: true },
  tradenames: [{ type: String, trim: true }],
  dosage: { type: String, required: true },
  applicationMethod: { type: String, required: true },
  safetyPrecautions: [{ type: String }],
  preharvest_interval: { type: Number, min: 0, comment: 'Days before harvest' },
  regulatoryStatus: {
    type: String,
    enum: ['approved', 'restricted', 'banned', 'pending'],
    default: 'approved'
  },
  environmentalImpact: { type: String }
}, { _id: false });

/**
 * Organic/biological control option sub-schema
 */
const OrganicControlSchema = new Schema<IOrganicControl>({
  method: { type: String, required: true, trim: true },
  materials: [{ type: String, trim: true }],
  procedure: { type: String, required: true },
  effectiveness: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  costEstimate: { type: String }
}, { _id: false });

/**
 * Preventive practice sub-schema
 */
const PreventivePracticeSchema = new Schema<IPreventivePractice>({
  practice: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  timing: { type: String },
  effectiveness: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, { _id: false });

/**
 * Taxonomy sub-schema
 */
const TaxonomySchema = new Schema({
  kingdom: { type: String, trim: true },
  phylum: { type: String, trim: true },
  class: { type: String, trim: true },
  order: { type: String, trim: true },
  family: { type: String, trim: true },
  genus: { type: String, trim: true },
  species: { type: String, trim: true }
}, { _id: false });

/**
 * Symptoms sub-schema
 */
const SymptomsSchema = new Schema({
  visual: [{ type: String }],
  description: { type: String, required: true },
  images: [{ type: String }] // Reference image URLs
}, { _id: false });

/**
 * Favorable conditions sub-schema
 */
const FavorableConditionsSchema = new Schema({
  temperature: {
    min: { type: Number },
    max: { type: Number },
    optimal: { type: Number }
  },
  humidity: {
    min: { type: Number, min: 0, max: 100 },
    max: { type: Number, min: 0, max: 100 }
  },
  rainfall: { type: String },
  season: [{ type: String }],
  soilConditions: { type: String }
}, { _id: false });

/**
 * Treatment options sub-schema
 */
const TreatmentOptionsSchema = new Schema({
  chemical: [ChemicalControlSchema],
  organic: [OrganicControlSchema],
  biological: [OrganicControlSchema],
  cultural: [{ type: String }],
  mechanical: [{ type: String }]
}, { _id: false });

/**
 * Potential loss sub-schema
 */
const PotentialLossSchema = new Schema({
  yieldReduction: { type: String },
  qualityImpact: { type: String },
  economicCost: { type: String }
}, { _id: false });

/**
 * Reference source sub-schema
 */
const SourceSchema = new Schema({
  type: {
    type: String,
    enum: ['research_paper', 'extension_guide', 'book', 'manual', 'website', 'expert_opinion'],
    required: true
  },
  title: { type: String, required: true },
  author: { type: String },
  url: { type: String },
  year: { type: Number, min: 1900, max: 2100 }
}, { _id: false });

// ============================================================================
// MAIN SCHEMA
// ============================================================================

const TreatmentKnowledgeBaseSchema = new Schema<ITreatmentKnowledgeBase>(
  {
    // Multi-tenancy
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },

    // Identification
    pestOrDiseaseName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    detectionType: {
      type: String,
      enum: Object.values(DetectionType),
      required: true,
      index: true
    },
    scientificName: {
      type: String,
      trim: true,
      index: true
    },
    commonNames: {
      type: [String],
      default: []
    },
    aliases: {
      type: [String],
      default: [],
      comment: 'Alternative spellings and local names'
    },

    // Classification
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
      comment: 'Fungal, Bacterial, Viral, Insect, Nematode, etc.'
    },
    taxonomy: TaxonomySchema,

    // Affected crops
    affectedCrops: {
      type: [String],
      required: true,
      validate: {
        validator: (crops: string[]) => crops.length > 0,
        message: 'At least one affected crop must be specified'
      }
    },
    primaryCrops: {
      type: [String],
      default: [],
      comment: 'Crops most vulnerable to this pest/disease'
    },

    // Symptoms & identification
    symptoms: {
      type: SymptomsSchema,
      required: true
    },

    // Environmental factors
    favorableConditions: FavorableConditionsSchema,

    // Prevention strategies
    preventiveMeasures: {
      type: [PreventivePracticeSchema],
      default: []
    },

    // Treatment options
    treatment: {
      type: TreatmentOptionsSchema,
      required: true
    },

    // Economic impact
    potentialLoss: PotentialLossSchema,

    // Geographic distribution
    regions: {
      type: [String],
      default: [],
      comment: 'Regions where pest/disease is commonly found'
    },
    seasonalRisk: {
      type: Map,
      of: new Schema({
        type: Map,
        of: String
      }, { _id: false }),
      default: new Map()
    },

    // References & citations
    sources: {
      type: [SourceSchema],
      default: []
    },

    // Content versioning
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    },
    publishedAt: {
      type: Date,
      index: true
    },
    lastReviewedAt: {
      type: Date,
      index: true
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      comment: 'Expert who last reviewed this content'
    },

    // Audit trail
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    collection: 'treatment_knowledge_base'
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Compound indexes for common queries
TreatmentKnowledgeBaseSchema.index({ tenantId: 1, isPublished: 1, pestOrDiseaseName: 1 });
TreatmentKnowledgeBaseSchema.index({ tenantId: 1, detectionType: 1, isPublished: 1 });
TreatmentKnowledgeBaseSchema.index({ tenantId: 1, category: 1, isPublished: 1 });
TreatmentKnowledgeBaseSchema.index({ affectedCrops: 1, isPublished: 1 });
TreatmentKnowledgeBaseSchema.index({ version: 1, pestOrDiseaseName: 1 });

// Text search index for fuzzy matching
TreatmentKnowledgeBaseSchema.index({
  pestOrDiseaseName: 'text',
  scientificName: 'text',
  commonNames: 'text',
  aliases: 'text',
  category: 'text',
  'symptoms.description': 'text'
});

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

/**
 * Auto-increment version on updates
 */
TreatmentKnowledgeBaseSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

/**
 * Set publishedAt timestamp when published
 */
TreatmentKnowledgeBaseSchema.pre('save', function(next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

/**
 * Normalize names to lowercase for better search
 */
TreatmentKnowledgeBaseSchema.pre('save', function(next) {
  // Convert aliases and common names to lowercase for consistent searching
  if (this.aliases) {
    this.aliases = this.aliases.map(alias => alias.toLowerCase());
  }
  if (this.commonNames) {
    this.commonNames = this.commonNames.map(name => name.toLowerCase());
  }
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Generate treatment recommendation based on context
 */
TreatmentKnowledgeBaseSchema.methods.generateRecommendation = function(
  severity: SeverityLevel,
  _cropType: string,
  farmerPreference: 'organic' | 'chemical' | 'integrated' = 'integrated'
): ITreatmentRecommendation {
  const recommendation: ITreatmentRecommendation = {
    isUrgent: [SeverityLevel.SEVERE, SeverityLevel.CRITICAL].includes(severity),
    immediateActions: [],
    monitoringAdvice: 'Monitor affected plants daily and check for spread to neighboring crops.'
  };

  // Determine if expert consultation is needed
  recommendation.expertConsultation = severity === SeverityLevel.CRITICAL || severity === SeverityLevel.SEVERE;

  // Add immediate actions based on severity
  if (severity === SeverityLevel.CRITICAL || severity === SeverityLevel.SEVERE) {
    recommendation.immediateActions.push(
      'Isolate affected plants immediately to prevent spread',
      'Remove and destroy severely infected plant material',
      'Avoid working in wet conditions to prevent disease spread'
    );
  } else if (severity === SeverityLevel.MODERATE || severity === SeverityLevel.HIGH) {
    recommendation.immediateActions.push(
      'Mark affected areas for targeted treatment',
      'Improve air circulation around plants'
    );
  }

  // Add treatment options based on farmer preference
  if (farmerPreference === 'chemical' || farmerPreference === 'integrated') {
    if (this.treatment.chemical && this.treatment.chemical.length > 0) {
      // Filter approved chemicals
      recommendation.chemicalControl = this.treatment.chemical.filter(
        (chem: any) => chem.regulatoryStatus === 'approved'
      );
    }
  }

  if (farmerPreference === 'organic' || farmerPreference === 'integrated') {
    recommendation.organicControl = [
      ...(this.treatment.organic || []),
      ...(this.treatment.biological || [])
    ];
  }

  // Add cultural/mechanical controls
  recommendation.culturalControl = this.treatment.cultural || [];

  // Add preventive practices
  recommendation.preventivePractices = this.preventiveMeasures || [];

  // Add recovery time estimate
  if (severity === SeverityLevel.LOW || severity === SeverityLevel.MODERATE) {
    recommendation.expectedRecoveryTime = '1-2 weeks with proper treatment';
  } else if (severity === SeverityLevel.HIGH) {
    recommendation.expectedRecoveryTime = '2-4 weeks with intensive treatment';
  } else {
    recommendation.expectedRecoveryTime = '4+ weeks; some plants may not recover';
  }

  // Customize monitoring advice
  if (severity === SeverityLevel.SEVERE || severity === SeverityLevel.CRITICAL) {
    recommendation.monitoringAdvice = 
      'Monitor affected and neighboring plants twice daily. Record spread patterns and treatment effectiveness. Consider professional scouting services.';
  }

  return recommendation;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find by pest/disease name (fuzzy search)
 */
TreatmentKnowledgeBaseSchema.statics.findByName = function(
  tenantId: mongoose.Types.ObjectId,
  searchTerm: string,
  onlyPublished = true
) {
  const query: Record<string, unknown> = {
    tenantId,
    isActive: true,
    $or: [
      { pestOrDiseaseName: new RegExp(searchTerm, 'i') },
      { scientificName: new RegExp(searchTerm, 'i') },
      { commonNames: new RegExp(searchTerm, 'i') },
      { aliases: searchTerm.toLowerCase() }
    ]
  };

  if (onlyPublished) {
    query.isPublished = true;
  }

  return this.find(query)
    .sort({ pestOrDiseaseName: 1 });
};

/**
 * Find by crop type
 */
TreatmentKnowledgeBaseSchema.statics.findByCrop = function(
  tenantId: mongoose.Types.ObjectId,
  cropType: string,
  detectionType?: DetectionType
) {
  const query: Record<string, unknown> = {
    tenantId,
    affectedCrops: cropType,
    isPublished: true,
    isActive: true
  };

  if (detectionType) {
    query.detectionType = detectionType;
  }

  return this.find(query)
    .sort({ pestOrDiseaseName: 1 });
};

/**
 * Find by detection type
 */
TreatmentKnowledgeBaseSchema.statics.findByDetectionType = function(
  tenantId: mongoose.Types.ObjectId,
  detectionType: DetectionType,
  category?: string
) {
  const query: Record<string, unknown> = {
    tenantId,
    detectionType,
    isPublished: true,
    isActive: true
  };

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .sort({ pestOrDiseaseName: 1 });
};

/**
 * Full-text search
 */
TreatmentKnowledgeBaseSchema.statics.fullTextSearch = function(
  tenantId: mongoose.Types.ObjectId,
  searchQuery: string,
  limit = 20
) {
  return this.find({
    tenantId,
    $text: { $search: searchQuery },
    isPublished: true,
    isActive: true
  }, {
    score: { $meta: 'textScore' }
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

/**
 * Get content requiring review (older than X days)
 */
TreatmentKnowledgeBaseSchema.statics.findRequiringReview = function(
  tenantId: mongoose.Types.ObjectId,
  daysOld = 365
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.find({
    tenantId,
    isPublished: true,
    isActive: true,
    $or: [
      { lastReviewedAt: { $lt: cutoffDate } },
      { lastReviewedAt: { $exists: false } }
    ]
  })
    .sort({ lastReviewedAt: 1 });
};

/**
 * Get treatment statistics
 */
TreatmentKnowledgeBaseSchema.statics.getStatistics = function(
  tenantId: mongoose.Types.ObjectId
) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        isPublished: true,
        isActive: true
      }
    },
    {
      $facet: {
        byDetectionType: [
          { $group: { _id: '$detectionType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        byCrop: [
          { $unwind: '$affectedCrops' },
          { $group: { _id: '$affectedCrops', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        contentHealth: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              withReferences: { $sum: { $cond: [{ $gt: [{ $size: '$sources' }, 0] }, 1, 0] } },
              recentlyReviewed: {
                $sum: {
                  $cond: [
                    { $gte: ['$lastReviewedAt', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]
      }
    }
  ]);
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

const TreatmentKnowledgeBase = mongoose.model<ITreatmentKnowledgeBase>(
  'TreatmentKnowledgeBase',
  TreatmentKnowledgeBaseSchema
);

export default TreatmentKnowledgeBase;
