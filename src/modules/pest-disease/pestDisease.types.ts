/**
 * Pest & Disease Detection Module - TypeScript Type Definitions
 * 
 * Enterprise-grade type definitions for AI-assisted pest and disease detection,
 * regional outbreak intelligence, and treatment recommendation system.
 */

import { Document, Types } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Type of detection target
 */
export enum DetectionType {
  PEST = 'pest',
  DISEASE = 'disease',
  NUTRIENT_DEFICIENCY = 'nutrient_deficiency',
  ENVIRONMENTAL_STRESS = 'environmental_stress',
  HEALTHY = 'healthy',
  UNKNOWN = 'unknown'
}

/**
 * Severity levels for pest/disease impact
 */
export enum SeverityLevel {
  NONE = 'none',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  SEVERE = 'severe',
  CRITICAL = 'critical'
}

/**
 * Report status workflow
 */
export enum ReportStatus {
  PENDING = 'pending',           // Awaiting AI processing
  PROCESSING = 'processing',     // AI inference in progress
  COMPLETED = 'completed',       // AI diagnosis complete
  EXPERT_REVIEW = 'expert_review', // Flagged for human review
  CONFIRMED = 'confirmed',       // Expert verified
  REJECTED = 'rejected',         // False positive
  ARCHIVED = 'archived'          // Historical/resolved
}

/**
 * Confidence thresholds for AI predictions
 */
export enum ConfidenceLevel {
  VERY_LOW = 'very_low',     // 0-40%
  LOW = 'low',               // 40-60%
  MEDIUM = 'medium',         // 60-75%
  HIGH = 'high',             // 75-90%
  VERY_HIGH = 'very_high'    // 90-100%
}

/**
 * Image source types
 */
export enum ImageSource {
  MOBILE_CAMERA = 'mobile_camera',
  GALLERY = 'gallery',
  FIELD_DEVICE = 'field_device',
  DRONE = 'drone',
  SATELLITE = 'satellite',
  UPLOAD = 'upload'
}

/**
 * Treatment method categories
 */
export enum TreatmentMethod {
  CHEMICAL = 'chemical',
  ORGANIC = 'organic',
  BIOLOGICAL = 'biological',
  CULTURAL = 'cultural',
  MECHANICAL = 'mechanical',
  INTEGRATED = 'integrated'
}

/**
 * Outbreak severity index
 */
export enum OutbreakSeverity {
  SPORADIC = 'sporadic',           // Isolated cases
  LOCALIZED = 'localized',         // Small region affected
  WIDESPREAD = 'widespread',       // Large region affected
  EPIDEMIC = 'epidemic',           // Entire region at risk
  PANDEMIC = 'pandemic'            // Multi-regional crisis
}

/**
 * Crop growth stages
 */
export enum GrowthStage {
  GERMINATION = 'germination',
  SEEDLING = 'seedling',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  FRUITING = 'fruiting',
  MATURITY = 'maturity',
  HARVEST = 'harvest',
  POST_HARVEST = 'post_harvest'
}

// ============================================================================
// IMAGE METADATA
// ============================================================================

/**
 * Secure image storage reference
 */
export interface IImageMetadata {
  url: string;                    // Secure storage URL
  thumbnailUrl?: string;          // Low-res preview
  storageKey: string;             // S3/cloud storage key
  fileName: string;               // Original filename
  fileSize: number;               // Bytes
  mimeType: string;               // image/jpeg, image/png, etc.
  dimensions: {
    width: number;
    height: number;
  };
  source: ImageSource;
  capturedAt: Date;               // Image timestamp
  location?: {                    // GPS from EXIF
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  checksum: string;               // SHA-256 for integrity
  uploadedBy: Types.ObjectId;     // User ID
  uploadedAt: Date;
}

// ============================================================================
// AI DETECTION RESULTS
// ============================================================================

/**
 * AI model prediction result
 */
export interface IDetectionResult {
  detectedEntity: string;         // Pest/disease name (e.g., "Fall Armyworm", "Late Blight")
  detectionType: DetectionType;   // pest, disease, etc.
  scientificName?: string;        // Taxonomic name
  commonNames: string[];          // Local/regional names
  confidenceScore: number;        // 0-100
  confidenceLevel: ConfidenceLevel;
  severityLevel: SeverityLevel;
  affectedArea?: number;          // % of image showing damage
  boundingBoxes?: {               // Detection regions in image
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }[];
}

/**
 * AI model metadata
 */
export interface IModelMetadata {
  modelName: string;              // e.g., "PlantVillage-ResNet50-v3"
  modelVersion: string;           // Semantic version
  inferenceEngine: string;        // TensorFlow, PyTorch, ONNX, etc.
  inferenceTime: number;          // Milliseconds
  modelAccuracy?: number;         // Training accuracy %
  trainingDataset?: string;       // Source dataset name
  deployedAt: Date;
}

/**
 * Alternative predictions (top-N results)
 */
export interface IAlternativePrediction {
  entity: string;
  detectionType: DetectionType;
  confidenceScore: number;
  rank: number;
}

// ============================================================================
// TREATMENT RECOMMENDATIONS
// ============================================================================

/**
 * Chemical control option
 */
export interface IChemicalControl {
  activIngredient: string;
  tradenames: string[];
  dosage: string;
  applicationMethod: string;
  safetyPrecautions: string[];
  preharvest_interval: number;    // Days before harvest
  regulatoryStatus: string;       // Approved/Restricted/Banned
  environmentalImpact?: string;
}

/**
 * Organic/biological control option
 */
export interface IOrganicControl {
  method: string;
  materials: string[];
  procedure: string;
  effectiveness: string;          // Low/Medium/High
  costEstimate?: string;
}

/**
 * Cultural/preventive practices
 */
export interface IPreventivePractice {
  practice: string;
  description: string;
  timing: string;
  effectiveness: string;
}

/**
 * Complete treatment recommendation
 */
export interface ITreatmentRecommendation {
  isUrgent: boolean;
  immediateActions: string[];
  chemicalControl?: IChemicalControl[];
  organicControl?: IOrganicControl[];
  preventivePractices?: IPreventivePractice[];
  culturalControl?: string[];
  expectedRecoveryTime?: string;
  monitoringAdvice: string;
  expertConsultation?: boolean;   // Should farmer contact extension officer?
}

// ============================================================================
// CONTEXT AWARENESS
// ============================================================================

/**
 * Field context for detection
 */
export interface IFieldContext {
  cropType: string;
  cropVariety?: string;
  growthStage: GrowthStage;
  plantingDate?: Date;
  farmLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  farmSize?: number;              // Hectares
  soilType?: string;
  irrigationType?: string;
}

/**
 * Environmental context
 */
export interface IEnvironmentalContext {
  temperature?: number;           // Celsius
  humidity?: number;              // Percentage
  rainfall?: number;              // mm in last 7 days
  season: string;                 // Wet/Dry/Transition
  weatherSource?: string;         // API source
  fetchedAt?: Date;
}

/**
 * Regional disease prevalence
 */
export interface IRegionalContext {
  region: string;
  activeOutbreaks: string[];      // Pest/disease names
  seasonalRisk: {
    [pestOrDisease: string]: string; // Low/Medium/High
  };
}

// ============================================================================
// OUTBREAK ANALYTICS
// ============================================================================

/**
 * Geospatial region for outbreak tracking
 */
export interface IOutbreakRegion {
  name: string;                   // County/District/Province
  adminLevel: number;             // 1=Country, 2=State, 3=County, etc.
  geometry: {                     // GeoJSON Polygon
    type: 'Polygon';
    coordinates: number[][][];
  };
  centerPoint: {
    type: 'Point';
    coordinates: [number, number];
  };
}

/**
 * Time-series outbreak data
 */
export interface IOutbreakTimeline {
  date: Date;
  reportCount: number;
  confirmedCount: number;
  severityIndex: number;          // 0-100 composite score
}

/**
 * Affected crop breakdown
 */
export interface IAffectedCrop {
  cropType: string;
  reportCount: number;
  averageSeverity: SeverityLevel;
  affectedArea?: number;          // Hectares
}

// ============================================================================
// EXPERT REVIEW
// ============================================================================

/**
 * Expert review decision
 */
export interface IExpertReview {
  reviewerId: Types.ObjectId;     // Extension officer/agronomist
  reviewedAt: Date;
  decision: 'confirm' | 'reject' | 'reclassify';
  correctedDiagnosis?: string;
  correctedSeverity?: SeverityLevel;
  notes: string;
  confidence: number;             // Expert's confidence
  treatmentOverride?: ITreatmentRecommendation;
}

// ============================================================================
// AUDIT & METADATA
// ============================================================================

/**
 * Consent tracking for AI analysis
 */
export interface IConsentMetadata {
  agreedToAIAnalysis: boolean;
  agreedToDataSharing: boolean;
  consentVersion: string;         // Terms version
  consentedAt: Date;
  ipAddress?: string;
}

/**
 * Retraining feedback
 */
export interface IRetrainingFeedback {
  isCorrect: boolean;
  actualDiagnosis?: string;
  feedbackSource: 'farmer' | 'expert' | 'outcome';
  submittedAt: Date;
  notes?: string;
}

// ============================================================================
// DOCUMENT INTERFACES
// ============================================================================

/**
 * Pest/Disease Report Document Interface
 */
export interface IPestDiseaseReport extends Document {
  // Multi-tenancy & references
  tenantId: Types.ObjectId;
  farmerId: Types.ObjectId;
  farmId: Types.ObjectId;
  
  // Report metadata
  reportCode: string;             // Auto-generated (PDR-XXXXXX)
  reportStatus: ReportStatus;
  
  // Field context
  fieldContext: IFieldContext;
  environmentalContext?: IEnvironmentalContext;
  regionalContext?: IRegionalContext;
  
  // Images
  images: IImageMetadata[];
  primaryImage: IImageMetadata;   // Main diagnostic image
  
  // AI detection
  aiDetection: {
    primaryResult: IDetectionResult;
    alternativePredictions?: IAlternativePrediction[];
    modelMetadata: IModelMetadata;
    processedAt: Date;
    processingTime: number;       // Milliseconds
    requiresReview: boolean;      // Low confidence flag
  };
  
  // Treatment
  recommendedTreatment?: ITreatmentRecommendation;
  
  // Expert review
  expertReview?: IExpertReview;
  
  // Consent & compliance
  consent: IConsentMetadata;
  
  // Retraining pipeline
  retrainingFeedback?: IRetrainingFeedback;
  
  // Farmer notes
  farmerNotes?: string;
  actionTaken?: string;
  outcome?: {
    isResolved: boolean;
    resolvedAt?: Date;
    effectiveness: string;        // Poor/Fair/Good/Excellent
    notes?: string;
  };
  
  // Audit trail
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  markForExpertReview(): Promise<void>;
  submitFeedback(feedback: IRetrainingFeedback): Promise<void>;
  recordOutcome(outcome: IPestDiseaseReport['outcome']): Promise<void>;
  softDelete(userId: Types.ObjectId): Promise<void>;
}

/**
 * Regional Outbreak Document Interface
 */
export interface IRegionalOutbreak extends Document {
  // Multi-tenancy
  tenantId: Types.ObjectId;
  
  // Outbreak metadata
  outbreakCode: string;           // Auto-generated (OBK-XXXXXX)
  pestOrDisease: string;
  detectionType: DetectionType;
  scientificName?: string;
  
  // Geographic scope
  region: IOutbreakRegion;
  affectedArea?: number;          // Square kilometers
  
  // Severity & timeline
  outbreakSeverity: OutbreakSeverity;
  severityIndex: number;          // 0-100 composite score
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'contained' | 'resolved';
  
  // Affected crops
  affectedCrops: IAffectedCrop[];
  
  // Time-series data
  timeline: IOutbreakTimeline[];
  
  // Intelligence
  totalReports: number;
  confirmedReports: number;
  farmsAffected: number;
  estimatedLoss?: {
    amount: number;
    currency: string;
    unit: string;               // Per hectare, total, etc.
  };
  
  // Advisory
  advisoryMessage: string;
  issuedBy?: Types.ObjectId;      // Agricultural authority
  issuedAt?: Date;
  actionableRecommendations: string[];
  
  // Predictions
  predictedSpread?: {
    direction: string;            // N/S/E/W
    speed: string;                // km/day
    riskAreas: string[];          // Neighboring regions
  };
  
  // Audit trail
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updateSeverityIndex(): Promise<void>;
  addTimelineEntry(entry: IOutbreakTimeline): Promise<void>;
  markAsContained(): Promise<void>;
  markAsResolved(): Promise<void>;
}

/**
 * Treatment Knowledge Base Document Interface
 */
export interface ITreatmentKnowledgeBase extends Document {
  // Multi-tenancy
  tenantId: Types.ObjectId;
  
  // Identification
  pestOrDiseaseName: string;
  detectionType: DetectionType;
  scientificName?: string;
  commonNames: string[];
  aliases: string[];              // Alternative spellings
  
  // Classification
  category: string;               // Fungal, Bacterial, Viral, Insect, etc.
  taxonomy?: {
    kingdom?: string;
    phylum?: string;
    class?: string;
    order?: string;
    family?: string;
    genus?: string;
    species?: string;
  };
  
  // Affected crops
  affectedCrops: string[];
  primaryCrops: string[];         // Most vulnerable
  
  // Symptoms & identification
  symptoms: {
    visual: string[];
    description: string;
    images?: string[];            // Reference image URLs
  };
  
  // Conditions favoring development
  favorableConditions: {
    temperature?: {
      min: number;
      max: number;
      optimal: number;
    };
    humidity?: {
      min: number;
      max: number;
    };
    rainfall?: string;
    season: string[];
    soilConditions?: string;
  };
  
  // Prevention
  preventiveMeasures: IPreventivePractice[];
  
  // Treatment options
  treatment: {
    chemical?: IChemicalControl[];
    organic?: IOrganicControl[];
    biological?: IOrganicControl[];
    cultural?: string[];
    mechanical?: string[];
  };
  
  // Economic impact
  potentialLoss?: {
    yieldReduction: string;       // Percentage range
    qualityImpact: string;
    economicCost?: string;
  };
  
  // Regional prevalence
  regions: string[];              // Where it's commonly found
  seasonalRisk: {
    [region: string]: {
      [season: string]: string;   // Risk level
    };
  };
  
  // References
  sources: {
    type: string;                 // Research paper, Extension guide, etc.
    title: string;
    author?: string;
    url?: string;
    year?: number;
  }[];
  
  // Content versioning
  version: number;
  isPublished: boolean;
  publishedAt?: Date;
  lastReviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  
  // Audit trail
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  generateRecommendation(
    severity: SeverityLevel,
    cropType: string,
    farmerPreference?: 'organic' | 'chemical' | 'integrated'
  ): ITreatmentRecommendation;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * AI Detection request
 */
export interface IDetectionRequest {
  farmerId: Types.ObjectId | string;
  farmId: Types.ObjectId | string;
  images: Express.Multer.File[] | IImageMetadata[];
  fieldContext: IFieldContext;
  consent: IConsentMetadata;
  farmerNotes?: string;
}

/**
 * AI Detection response
 */
export interface IDetectionResponse {
  reportId: Types.ObjectId | string;
  reportCode: string;
  status: ReportStatus;
  detection: IDetectionResult;
  treatment?: ITreatmentRecommendation;
  requiresExpertReview: boolean;
  estimatedProcessingTime?: number;
}

/**
 * Outbreak query parameters
 */
export interface IOutbreakQuery {
  region?: string;
  pestOrDisease?: string;
  status?: 'active' | 'contained' | 'resolved';
  severity?: OutbreakSeverity;
  cropType?: string;
  startDate?: Date;
  endDate?: Date;
  location?: {
    coordinates: [number, number];
    maxDistance: number;          // Meters
  };
}

/**
 * Analytics aggregation result
 */
export interface IAnalyticsResult {
  totalReports: number;
  byDetectionType: Record<DetectionType, number>;
  bySeverity: Record<SeverityLevel, number>;
  byStatus: Record<ReportStatus, number>;
  topPests: Array<{ name: string; count: number }>;
  topDiseases: Array<{ name: string; count: number }>;
  averageConfidence: number;
  expertReviewRate: number;
  resolutionRate: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export default {
  DetectionType,
  SeverityLevel,
  ReportStatus,
  ConfidenceLevel,
  ImageSource,
  TreatmentMethod,
  OutbreakSeverity,
  GrowthStage
};
