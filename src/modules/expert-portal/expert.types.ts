/**
 * Expert Portal - TypeScript Type Definitions
 *
 * Enterprise-grade types for the Expert Portal module covering:
 * - Expert identity and credentials
 * - AI case review and diagnosis validation
 * - Knowledge base and publications
 * - Advisory and communication
 * - Analytics and intelligence
 */

import { Document, Types } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum ExpertSpecialization {
  CROP_PRODUCTION = 'crop_production',
  LIVESTOCK = 'livestock',
  SOIL_SCIENCE = 'soil_science',
  PLANT_PATHOLOGY = 'plant_pathology',
  ENTOMOLOGY = 'entomology',
  AGRONOMY = 'agronomy',
  HORTICULTURE = 'horticulture',
  AQUACULTURE = 'aquaculture',
  MARKET_ANALYSIS = 'market_analysis',
  AGRICULTURAL_POLICY = 'agricultural_policy',
  FOOD_SAFETY = 'food_safety',
  CLIMATE_ADAPTATION = 'climate_adaptation',
  IRRIGATION = 'irrigation',
  POST_HARVEST = 'post_harvest',
  VETERINARY = 'veterinary',
}

export enum ExpertRole {
  ADVISOR = 'advisor',
  REVIEWER = 'reviewer',
  ANALYST = 'analyst',
  SENIOR_EXPERT = 'senior_expert',
  ADMINISTRATOR = 'administrator',
}

export enum ExpertStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  REJECTED = 'rejected',
}

export enum CredentialType {
  DEGREE = 'degree',
  CERTIFICATION = 'certification',
  LICENSE = 'license',
  FELLOWSHIP = 'fellowship',
  ACCREDITATION = 'accreditation',
}

export enum CaseReviewStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  ESCALATED = 'escalated',
  REVIEWED = 'reviewed',
  CLOSED = 'closed',
}

export enum CaseReviewDecision {
  APPROVED = 'approved',
  MODIFIED = 'modified',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  INCONCLUSIVE = 'inconclusive',
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum KnowledgeCategory {
  PEST_DISEASE = 'pest_disease',
  TREATMENT_PROTOCOL = 'treatment_protocol',
  CROP_MANAGEMENT = 'crop_management',
  LIVESTOCK_CARE = 'livestock_care',
  SOIL_FERTILITY = 'soil_fertility',
  SEASONAL_CALENDAR = 'seasonal_calendar',
  MARKET_INTELLIGENCE = 'market_intelligence',
  CLIMATE_ADVISORY = 'climate_advisory',
  FOOD_SAFETY = 'food_safety',
  RESEARCH_SUMMARY = 'research_summary',
  POLICY_BRIEF = 'policy_brief',
  BEST_PRACTICES = 'best_practices',
}

export enum PublicationStatus {
  DRAFT = 'draft',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  REJECTED = 'rejected',
}

export enum AdvisoryType {
  INDIVIDUAL_RESPONSE = 'individual_response',
  BROADCAST = 'broadcast',
  EMERGENCY_ALERT = 'emergency_alert',
  SEASONAL_ADVISORY = 'seasonal_advisory',
  CAMPAIGN = 'campaign',
}

export enum AdvisoryStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  CANCELLED = 'cancelled',
}

export enum InquiryStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface ICredential {
  type: CredentialType;
  title: string;
  institution: string;
  year: number;
  verificationUrl?: string;
  documentUrl?: string;
  verified: boolean;
}

export interface IExpertPerformance {
  totalReviews: number;
  approvedReviews: number;
  averageResponseTime: number; // hours
  accuracyScore: number; // 0-100
  farmerRating: number; // 0-5
  ratingCount: number;
  advisoriesIssued: number;
  publicationsCount: number;
  escalationRate: number; // %
  lastActiveAt: Date;
}

export interface IExpertProfile extends Document {
  user: Types.ObjectId;
  displayName: string;
  title?: string;

  // Specialization
  specializations: ExpertSpecialization[];
  primarySpecialization: ExpertSpecialization;
  subjectAreas: string[];

  // Geographic scope
  regions: string[];
  districts: string[];
  nationalCoverage: boolean;
  languages: string[];

  // Role & Access
  role: ExpertRole;
  status: ExpertStatus;
  permissions: string[];

  // Credentials
  credentials: ICredential[];
  yearsOfExperience: number;
  institutionAffiliation?: string;
  institutionType?: string;
  bio?: string;
  profileImageUrl?: string;

  // Performance
  performance: IExpertPerformance;

  // Availability
  isAvailableForReview: boolean;
  maxDailyReviews: number;
  workingHours?: {
    start: string; // HH:mm
    end: string;
    timezone: string;
  };

  // Verification
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  verificationNotes?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ICaseAssignment extends Document {
  report: Types.ObjectId; // PestDiseaseReport reference
  assignedExpert: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  assignedAt: Date;

  status: CaseReviewStatus;
  priority: UrgencyLevel;

  // Review
  decision?: CaseReviewDecision;
  reviewedAt?: Date;
  reviewDuration?: number; // minutes

  // Expert findings
  confirmedDiagnosis?: string;
  modifiedDiagnosis?: string;
  confidenceLevel?: number; // 0-100
  expertNotes?: string;

  // Outbreak flag
  isOutbreak: boolean;
  outbreakNotes?: string;

  // Recommendations
  treatmentRecommendations: IExpertTreatmentRec[];
  preventionGuidance?: string;
  followUpRequired: boolean;
  followUpDate?: Date;

  // Escalation
  escalatedTo?: Types.ObjectId;
  escalationReason?: string;
  escalatedAt?: Date;

  // AI feedback
  aiFeedback?: {
    modelId: string;
    originalPrediction: string;
    originalConfidence: number;
    expertAgreement: boolean;
    feedbackNotes?: string;
    submittedAt: Date;
  };

  // Audit
  auditTrail: ICaseAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseAuditEntry {
  action: string;
  performedBy: Types.ObjectId;
  timestamp: Date;
  notes?: string;
}

export interface IExpertTreatmentRec {
  method: 'chemical' | 'organic' | 'biological' | 'cultural' | 'mechanical' | 'integrated';
  product?: string;
  activeIngredient?: string;
  applicationRate?: string;
  applicationMethod?: string;
  frequency?: string;
  precautions?: string[];
  estimatedCost?: string;
  effectiveness: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface IKnowledgeArticle extends Document {
  title: string;
  slug: string;
  summary: string;
  content: string;
  farmerFriendlySummary?: string;

  category: KnowledgeCategory;
  tags: string[];
  cropTypes: string[];
  regions: string[];
  seasons: string[];

  status: PublicationStatus;
  version: number;

  // Authors
  primaryAuthor: Types.ObjectId;
  coAuthors: Types.ObjectId[];
  reviewers: Types.ObjectId[];

  // Editorial
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  publishedAt?: Date;

  // Multilingual
  translations: {
    locale: string;
    title: string;
    summary: string;
    content: string;
  }[];

  // Media
  coverImageUrl?: string;
  mediaAttachments: {
    type: 'image' | 'video' | 'document';
    url: string;
    caption?: string;
  }[];

  // References
  references: string[];
  relatedArticles: Types.ObjectId[];

  // Analytics
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  downloadCount: number;

  // Versioning
  previousVersion?: Types.ObjectId;
  changeLog?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export interface IAdvisory extends Document {
  title: string;
  message: string;
  type: AdvisoryType;
  status: AdvisoryStatus;

  // Author
  author: Types.ObjectId;

  // Targeting
  targetCrops: string[];
  targetRegions: string[];
  targetDistricts: string[];
  targetSeasons: string[];
  targetUserRoles: string[];
  targetFarmerIds?: Types.ObjectId[];
  specificFarmer?: Types.ObjectId;

  // Classification
  urgency: UrgencyLevel;
  specialization: ExpertSpecialization;
  relatedArticle?: Types.ObjectId;
  relatedReport?: Types.ObjectId;

  // Delivery
  scheduledAt?: Date;
  sentAt?: Date;
  expiresAt?: Date;

  // Delivery channels
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };

  // Engagement
  totalRecipients: number;
  deliveredCount: number;
  openedCount: number;
  acknowledgedCount: number;

  // Attachments
  attachmentUrls: string[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface IFarmerInquiry extends Document {
  farmer: Types.ObjectId;
  assignedExpert?: Types.ObjectId;

  subject: string;
  description: string;
  cropType?: string;
  region?: string;

  status: InquiryStatus;
  urgency: UrgencyLevel;
  category: KnowledgeCategory;

  attachmentUrls: string[];
  relatedReport?: Types.ObjectId;

  // Response
  expertResponse?: string;
  respondedAt?: Date;
  responseAttachments?: string[];

  // Rating
  farmerRating?: number;
  farmerFeedback?: string;
  ratedAt?: Date;

  // Follow-up
  followUpMessages: {
    from: Types.ObjectId;
    message: string;
    timestamp: Date;
    isExpert: boolean;
  }[];

  // Audit
  assignedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
