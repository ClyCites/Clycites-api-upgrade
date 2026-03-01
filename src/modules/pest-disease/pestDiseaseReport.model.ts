/**
 * Pest & Disease Report Model
 * 
 * Enterprise data model for AI-assisted pest and disease detection reports.
 * Supports image-based diagnosis, expert review workflow, treatment recommendations,
 * and machine learning pipeline integration.
 */

import mongoose, { Schema, Model } from 'mongoose';
import {
  IPestDiseaseReport,
  DetectionType,
  SeverityLevel,
  ReportStatus,
  ConfidenceLevel,
  ImageSource,
  GrowthStage,
  IImageMetadata,
  IDetectionResult,
  IAlternativePrediction,
  IModelMetadata,
  IFieldContext,
  IEnvironmentalContext,
  IRegionalContext,
  ITreatmentRecommendation,
  IExpertReview,
  IConsentMetadata,
  IRetrainingFeedback
} from './pestDisease.types';

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

/**
 * Image metadata sub-schema
 */
const ImageMetadataSchema = new Schema<IImageMetadata>({
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  storageKey: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  dimensions: {
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  source: {
    type: String,
    enum: Object.values(ImageSource),
    required: true
  },
  capturedAt: { type: Date, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: (coords: number[]) => coords.length === 2,
        message: 'Coordinates must be [longitude, latitude]'
      }
    }
  },
  checksum: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

// Geospatial index for image locations
ImageMetadataSchema.index({ location: '2dsphere' });

/**
 * Detection result sub-schema
 */
const DetectionResultSchema = new Schema<IDetectionResult>({
  detectedEntity: { type: String, required: true, trim: true },
  detectionType: {
    type: String,
    enum: Object.values(DetectionType),
    required: true,
    index: true
  },
  scientificName: { type: String, trim: true },
  commonNames: [{ type: String, trim: true }],
  confidenceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },
  confidenceLevel: {
    type: String,
    enum: Object.values(ConfidenceLevel),
    required: true
  },
  severityLevel: {
    type: String,
    enum: Object.values(SeverityLevel),
    required: true,
    index: true
  },
  affectedArea: { type: Number, min: 0, max: 100 },
  boundingBoxes: [{
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    confidence: { type: Number, min: 0, max: 100 }
  }]
}, { _id: false });

/**
 * Alternative prediction sub-schema
 */
const AlternativePredictionSchema = new Schema<IAlternativePrediction>({
  entity: { type: String, required: true },
  detectionType: {
    type: String,
    enum: Object.values(DetectionType),
    required: true
  },
  confidenceScore: { type: Number, required: true, min: 0, max: 100 },
  rank: { type: Number, required: true }
}, { _id: false });

/**
 * AI model metadata sub-schema
 */
const ModelMetadataSchema = new Schema<IModelMetadata>({
  modelName: { type: String, required: true },
  modelVersion: { type: String, required: true },
  inferenceEngine: { type: String, required: true },
  inferenceTime: { type: Number, required: true },
  modelAccuracy: { type: Number, min: 0, max: 100 },
  trainingDataset: { type: String },
  deployedAt: { type: Date, required: true }
}, { _id: false });

/**
 * Field context sub-schema
 */
const FieldContextSchema = new Schema<IFieldContext>({
  cropType: { type: String, required: true, trim: true, index: true },
  cropVariety: { type: String, trim: true },
  growthStage: {
    type: String,
    enum: Object.values(GrowthStage),
    required: true
  },
  plantingDate: { type: Date },
  farmLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords: number[]) => coords.length === 2,
        message: 'Coordinates must be [longitude, latitude]'
      }
    }
  },
  farmSize: { type: Number, min: 0 },
  soilType: { type: String },
  irrigationType: { type: String }
}, { _id: false });

// Geospatial index for farm locations
FieldContextSchema.index({ farmLocation: '2dsphere' });

/**
 * Environmental context sub-schema
 */
const EnvironmentalContextSchema = new Schema<IEnvironmentalContext>({
  temperature: { type: Number },
  humidity: { type: Number, min: 0, max: 100 },
  rainfall: { type: Number, min: 0 },
  season: { type: String },
  weatherSource: { type: String },
  fetchedAt: { type: Date }
}, { _id: false });

/**
 * Regional context sub-schema
 */
const RegionalContextSchema = new Schema<IRegionalContext>({
  region: { type: String, required: true },
  activeOutbreaks: [{ type: String }],
  seasonalRisk: {
    type: Map,
    of: String
  }
}, { _id: false });

/**
 * Treatment recommendation sub-schema
 */
const TreatmentRecommendationSchema = new Schema<ITreatmentRecommendation>({
  isUrgent: { type: Boolean, default: false },
  immediateActions: [{ type: String }],
  chemicalControl: [{
    activIngredient: { type: String, required: true },
    tradenames: [{ type: String }],
    dosage: { type: String, required: true },
    applicationMethod: { type: String, required: true },
    safetyPrecautions: [{ type: String }],
    preharvest_interval: { type: Number, min: 0 },
    regulatoryStatus: { type: String },
    environmentalImpact: { type: String }
  }],
  organicControl: [{
    method: { type: String, required: true },
    materials: [{ type: String }],
    procedure: { type: String, required: true },
    effectiveness: { type: String },
    costEstimate: { type: String }
  }],
  preventivePractices: [{
    practice: { type: String, required: true },
    description: { type: String, required: true },
    timing: { type: String },
    effectiveness: { type: String }
  }],
  culturalControl: [{ type: String }],
  expectedRecoveryTime: { type: String },
  monitoringAdvice: { type: String, required: true },
  expertConsultation: { type: Boolean, default: false }
}, { _id: false });

/**
 * Expert review sub-schema
 */
const ExpertReviewSchema = new Schema<IExpertReview>({
  reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedAt: { type: Date, required: true, default: Date.now },
  decision: {
    type: String,
    enum: ['confirm', 'reject', 'reclassify'],
    required: true
  },
  correctedDiagnosis: { type: String },
  correctedSeverity: {
    type: String,
    enum: Object.values(SeverityLevel)
  },
  notes: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 100 },
  treatmentOverride: TreatmentRecommendationSchema
}, { _id: false });

/**
 * Consent metadata sub-schema
 */
const ConsentMetadataSchema = new Schema<IConsentMetadata>({
  agreedToAIAnalysis: { type: Boolean, required: true },
  agreedToDataSharing: { type: Boolean, required: true },
  consentVersion: { type: String, required: true },
  consentedAt: { type: Date, required: true, default: Date.now },
  ipAddress: { type: String }
}, { _id: false });

/**
 * Retraining feedback sub-schema
 */
const RetrainingFeedbackSchema = new Schema<IRetrainingFeedback>({
  isCorrect: { type: Boolean, required: true },
  actualDiagnosis: { type: String },
  feedbackSource: {
    type: String,
    enum: ['farmer', 'expert', 'outcome'],
    required: true
  },
  submittedAt: { type: Date, required: true, default: Date.now },
  notes: { type: String }
}, { _id: false });

// ============================================================================
// MAIN SCHEMA
// ============================================================================

const PestDiseaseReportSchema = new Schema<IPestDiseaseReport>(
  {
    // Multi-tenancy & references
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true
    },
    farmId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmEnterprise',
      required: true,
      index: true
    },

    // Report metadata
    reportCode: {
      type: String,
      unique: true,
      index: true,
      uppercase: true,
      match: /^PDR-\d{6}$/
    },
    reportStatus: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING,
      required: true,
      index: true
    },

    // Field context
    fieldContext: {
      type: FieldContextSchema,
      required: true
    },
    environmentalContext: EnvironmentalContextSchema,
    regionalContext: RegionalContextSchema,

    // Images
    images: {
      type: [ImageMetadataSchema],
      default: [],
      validate: {
        validator: (imgs: IImageMetadata[]) => imgs.length <= 10,
        message: 'Must provide up to 10 images'
      }
    },
    primaryImage: {
      type: ImageMetadataSchema
    },

    // AI detection
    aiDetection: {
      primaryResult: {
        type: DetectionResultSchema,
        required: function(this: IPestDiseaseReport) {
          return this.reportStatus !== ReportStatus.PENDING;
        }
      },
      alternativePredictions: [AlternativePredictionSchema],
      modelMetadata: {
        type: ModelMetadataSchema,
        required: function(this: IPestDiseaseReport) {
          return this.reportStatus !== ReportStatus.PENDING;
        }
      },
      processedAt: { type: Date },
      processingTime: { type: Number },
      requiresReview: { type: Boolean, default: false }
    },

    // Treatment
    recommendedTreatment: TreatmentRecommendationSchema,

    // Expert review
    expertReview: ExpertReviewSchema,

    // Consent & compliance
    consent: {
      type: ConsentMetadataSchema,
      required: true
    },

    // Retraining pipeline
    retrainingFeedback: RetrainingFeedbackSchema,

    // Farmer interaction
    farmerNotes: { type: String, maxlength: 2000 },
    assignmentNotes: { type: String, maxlength: 2000 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    actionTaken: { type: String, maxlength: 2000 },
    outcome: {
      isResolved: { type: Boolean, default: false },
      resolvedAt: { type: Date },
      effectiveness: {
        type: String,
        enum: ['poor', 'fair', 'good', 'excellent']
      },
      notes: { type: String, maxlength: 2000 }
    },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    closeReason: { type: String, maxlength: 2000 },

    // Audit trail
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date }
  },
  {
    timestamps: true,
    collection: 'pest_disease_reports'
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Compound indexes for common queries
PestDiseaseReportSchema.index({ tenantId: 1, farmerId: 1, createdAt: -1 });
PestDiseaseReportSchema.index({ tenantId: 1, farmId: 1, createdAt: -1 });
PestDiseaseReportSchema.index({ tenantId: 1, reportStatus: 1, createdAt: -1 });
PestDiseaseReportSchema.index({ 'aiDetection.primaryResult.detectionType': 1, createdAt: -1 });
PestDiseaseReportSchema.index({ 'aiDetection.primaryResult.detectedEntity': 1, createdAt: -1 });
PestDiseaseReportSchema.index({ 'aiDetection.primaryResult.severityLevel': 1, createdAt: -1 });
PestDiseaseReportSchema.index({ 'fieldContext.cropType': 1, createdAt: -1 });
PestDiseaseReportSchema.index({ 'aiDetection.requiresReview': 1, reportStatus: 1 });
PestDiseaseReportSchema.index({ assignedTo: 1, reportStatus: 1, createdAt: -1 });

// Geospatial index for location-based queries
PestDiseaseReportSchema.index({ 'fieldContext.farmLocation': '2dsphere' });

// Text search index
PestDiseaseReportSchema.index({
  'aiDetection.primaryResult.detectedEntity': 'text',
  'aiDetection.primaryResult.scientificName': 'text',
  farmerNotes: 'text',
  actionTaken: 'text'
});

// TTL index for old archived reports (optional - configure based on retention policy)
// PestDiseaseReportSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

/**
 * Auto-generate report code before saving
 */
PestDiseaseReportSchema.pre('save', async function(next) {
  if (!this.reportCode) {
    // Generate unique 6-digit code
    const count = await (this.constructor as Model<IPestDiseaseReport>).countDocuments();
    const paddedCount = String(count + 1).padStart(6, '0');
    this.reportCode = `PDR-${paddedCount}`;
  }

  // Auto-set primary image if not specified
  if (!this.primaryImage && this.images && this.images.length > 0) {
    this.primaryImage = this.images[0];
  }

  next();
});

/**
 * Update status based on AI detection
 */
PestDiseaseReportSchema.pre('save', function(next) {
  // If AI detection is complete, update status
  if (this.aiDetection?.primaryResult && this.reportStatus === ReportStatus.PENDING) {
    this.reportStatus = ReportStatus.COMPLETED;
  }

  // Flag for expert review if confidence is low
  if (this.aiDetection?.primaryResult) {
    const confidence = this.aiDetection.primaryResult.confidenceScore;
    if (confidence < 60 || this.aiDetection.primaryResult.severityLevel === SeverityLevel.SEVERE) {
      this.aiDetection.requiresReview = true;
      this.reportStatus = ReportStatus.EXPERT_REVIEW;
    }
  }

  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Mark report for expert review
 */
PestDiseaseReportSchema.methods.markForExpertReview = async function(): Promise<void> {
  this.reportStatus = ReportStatus.EXPERT_REVIEW;
  if (this.aiDetection) {
    this.aiDetection.requiresReview = true;
  }
  await this.save();
};

/**
 * Submit retraining feedback
 */
PestDiseaseReportSchema.methods.submitFeedback = async function(
  feedback: IRetrainingFeedback
): Promise<void> {
  this.retrainingFeedback = feedback;
  await this.save();
};

/**
 * Record treatment outcome
 */
PestDiseaseReportSchema.methods.recordOutcome = async function(
  outcome: IPestDiseaseReport['outcome']
): Promise<void> {
  this.outcome = outcome;
  if (outcome?.isResolved) {
    this.reportStatus = ReportStatus.ARCHIVED;
  }
  await this.save();
};

/**
 * Soft delete report
 */
PestDiseaseReportSchema.methods.softDelete = async function(
  userId: mongoose.Types.ObjectId
): Promise<void> {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  await this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find reports requiring expert review
 */
PestDiseaseReportSchema.statics.findRequiringReview = function(
  tenantId: mongoose.Types.ObjectId,
  limit = 50
) {
  return this.find({
    tenantId,
    reportStatus: ReportStatus.EXPERT_REVIEW,
    'aiDetection.requiresReview': true,
    isActive: true
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('farmerId', 'personalInfo.fullName contactInfo.primaryPhone')
    .populate('farmId', 'basicInfo.farmName location.centerPoint');
};

/**
 * Get reports by detection type
 */
PestDiseaseReportSchema.statics.findByDetectionType = function(
  tenantId: mongoose.Types.ObjectId,
  detectionType: DetectionType,
  options: { limit?: number; skip?: number } = {}
) {
  return this.find({
    tenantId,
    'aiDetection.primaryResult.detectionType': detectionType,
    isActive: true
  })
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Get reports near location (geospatial query)
 */
PestDiseaseReportSchema.statics.findNearLocation = function(
  tenantId: mongoose.Types.ObjectId,
  longitude: number,
  latitude: number,
  maxDistanceMeters = 50000
) {
  return this.find({
    tenantId,
    'fieldContext.farmLocation': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceMeters
      }
    },
    isActive: true
  });
};

/**
 * Aggregate reports by crop type
 */
PestDiseaseReportSchema.statics.aggregateByCropType = function(
  tenantId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const match: Record<string, unknown> = {
    tenantId,
    isActive: true
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) (match.createdAt as Record<string, unknown>).$gte = startDate;
    if (endDate) (match.createdAt as Record<string, unknown>).$lte = endDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$fieldContext.cropType',
        totalReports: { $sum: 1 },
        avgConfidence: { $avg: '$aiDetection.primaryResult.confidenceScore' },
        severeCount: {
          $sum: {
            $cond: [
              { $in: ['$aiDetection.primaryResult.severityLevel', [SeverityLevel.SEVERE, SeverityLevel.CRITICAL]] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { totalReports: -1 } }
  ]);
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

const PestDiseaseReport = mongoose.model<IPestDiseaseReport>(
  'PestDiseaseReport',
  PestDiseaseReportSchema
);

export default PestDiseaseReport;
