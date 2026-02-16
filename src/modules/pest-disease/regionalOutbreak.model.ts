/**
 * Regional Outbreak Model
 * 
 * Enterprise model for tracking and analyzing regional pest and disease outbreaks.
 * Provides geospatial intelligence, time-series tracking, and predictive analytics
 * for agricultural outbreak management.
 */

import mongoose, { Schema, Model } from 'mongoose';
import {
  IRegionalOutbreak,
  DetectionType,
  OutbreakSeverity,
  SeverityLevel,
  IOutbreakRegion,
  IOutbreakTimeline,
  IAffectedCrop
} from './pestDisease.types';

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

/**
 * Outbreak region sub-schema (geospatial boundary)
 */
const OutbreakRegionSchema = new Schema<IOutbreakRegion>({
  name: { type: String, required: true, trim: true },
  adminLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]],
      required: true,
      validate: {
        validator: function(coords: number[][][]) {
          // Basic validation: first and last points should match (closed polygon)
          if (coords.length === 0 || coords[0].length < 4) return false;
          const first = coords[0][0];
          const last = coords[0][coords[0].length - 1];
          return first[0] === last[0] && first[1] === last[1];
        },
        message: 'Polygon must be closed (first and last points must match)'
      }
    }
  },
  centerPoint: {
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
  }
}, { _id: false });

// Geospatial indexes
OutbreakRegionSchema.index({ geometry: '2dsphere' });
OutbreakRegionSchema.index({ centerPoint: '2dsphere' });

/**
 * Outbreak timeline entry sub-schema
 */
const OutbreakTimelineSchema = new Schema<IOutbreakTimeline>({
  date: { type: Date, required: true, index: true },
  reportCount: { type: Number, required: true, min: 0, default: 0 },
  confirmedCount: { type: Number, required: true, min: 0, default: 0 },
  severityIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  }
}, { _id: false });

/**
 * Affected crop breakdown sub-schema
 */
const AffectedCropSchema = new Schema<IAffectedCrop>({
  cropType: { type: String, required: true, trim: true, index: true },
  reportCount: { type: Number, required: true, min: 0, default: 0 },
  averageSeverity: {
    type: String,
    enum: Object.values(SeverityLevel),
    required: true
  },
  affectedArea: { type: Number, min: 0 }
}, { _id: false });

// ============================================================================
// MAIN SCHEMA
// ============================================================================

const RegionalOutbreakSchema = new Schema<IRegionalOutbreak>(
  {
    // Multi-tenancy
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },

    // Outbreak metadata
    outbreakCode: {
      type: String,
      unique: true,
      index: true,
      uppercase: true,
      match: /^OBK-\d{6}$/
    },
    pestOrDisease: {
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

    // Geographic scope
    region: {
      type: OutbreakRegionSchema,
      required: true
    },
    affectedArea: {
      type: Number,
      min: 0,
      comment: 'Affected area in square kilometers'
    },

    // Severity & status
    outbreakSeverity: {
      type: String,
      enum: Object.values(OutbreakSeverity),
      required: true,
      index: true
    },
    severityIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'contained', 'resolved'],
      default: 'active',
      required: true,
      index: true
    },

    // Timeline
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      index: true
    },

    // Affected crops
    affectedCrops: {
      type: [AffectedCropSchema],
      validate: {
        validator: (crops: IAffectedCrop[]) => crops.length > 0,
        message: 'At least one affected crop must be specified'
      }
    },

    // Time-series tracking
    timeline: {
      type: [OutbreakTimelineSchema],
      default: []
    },

    // Statistical intelligence
    totalReports: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    confirmedReports: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    farmsAffected: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    estimatedLoss: {
      amount: { type: Number, min: 0 },
      currency: { type: String, default: 'USD' },
      unit: { type: String, default: 'total' }
    },

    // Advisory messaging
    advisoryMessage: {
      type: String,
      required: true,
      maxlength: 5000
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      comment: 'Agricultural authority or extension officer'
    },
    issuedAt: {
      type: Date,
      index: true
    },
    actionableRecommendations: {
      type: [String],
      default: []
    },

    // Predictive analytics
    predictedSpread: {
      direction: { type: String },
      speed: { type: String },
      riskAreas: [{ type: String }]
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
    collection: 'regional_outbreaks'
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Compound indexes for common queries
RegionalOutbreakSchema.index({ tenantId: 1, status: 1, startDate: -1 });
RegionalOutbreakSchema.index({ tenantId: 1, outbreakSeverity: 1, startDate: -1 });
RegionalOutbreakSchema.index({ tenantId: 1, pestOrDisease: 1, status: 1 });
RegionalOutbreakSchema.index({ detectionType: 1, status: 1, startDate: -1 });
RegionalOutbreakSchema.index({ 'region.name': 1, status: 1 });
RegionalOutbreakSchema.index({ startDate: 1, endDate: 1 });

// Geospatial compound indexes
RegionalOutbreakSchema.index({ 'region.geometry': '2dsphere', status: 1 });
RegionalOutbreakSchema.index({ 'region.centerPoint': '2dsphere', status: 1 });

// Text search for outbreak details
RegionalOutbreakSchema.index({
  pestOrDisease: 'text',
  scientificName: 'text',
  advisoryMessage: 'text',
  'region.name': 'text'
});

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

/**
 * Auto-generate outbreak code before saving
 */
RegionalOutbreakSchema.pre('save', async function(next) {
  if (!this.outbreakCode) {
    // Generate unique 6-digit code
    const count = await (this.constructor as Model<IRegionalOutbreak>).countDocuments();
    const paddedCount = String(count + 1).padStart(6, '0');
    this.outbreakCode = `OBK-${paddedCount}`;
  }

  next();
});

/**
 * Auto-update severity index based on metrics
 */
RegionalOutbreakSchema.pre('save', function(next) {
  // Calculate composite severity index (0-100)
  // Factors: report count, confirmed rate, farms affected, outbreak severity enum
  
  const reportScore = Math.min(this.totalReports * 2, 30); // Max 30 points
  const confirmationRate = this.totalReports > 0 
    ? (this.confirmedReports / this.totalReports) * 20 
    : 0; // Max 20 points
  const farmScore = Math.min(this.farmsAffected, 20); // Max 20 points
  
  // Severity enum contribution
  const severityMap: Record<OutbreakSeverity, number> = {
    [OutbreakSeverity.SPORADIC]: 5,
    [OutbreakSeverity.LOCALIZED]: 10,
    [OutbreakSeverity.WIDESPREAD]: 20,
    [OutbreakSeverity.EPIDEMIC]: 25,
    [OutbreakSeverity.PANDEMIC]: 30
  };
  const severityScore = severityMap[this.outbreakSeverity] || 0; // Max 30 points
  
  this.severityIndex = Math.min(
    Math.round(reportScore + confirmationRate + farmScore + severityScore),
    100
  );

  next();
});

/**
 * Auto-set endDate when status changes to resolved
 */
RegionalOutbreakSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.endDate) {
    this.endDate = new Date();
  }
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Update severity index based on current data
 */
RegionalOutbreakSchema.methods.updateSeverityIndex = async function(): Promise<void> {
  // Trigger pre-save middleware to recalculate
  await this.save();
};

/**
 * Add timeline entry
 */
RegionalOutbreakSchema.methods.addTimelineEntry = async function(
  entry: IOutbreakTimeline
): Promise<void> {
  // Check if entry for this date already exists
  const existingIndex = this.timeline.findIndex(
    (t: IOutbreakTimeline) => 
      t.date.toISOString().split('T')[0] === entry.date.toISOString().split('T')[0]
  );

  if (existingIndex >= 0) {
    // Update existing entry
    this.timeline[existingIndex] = entry;
  } else {
    // Add new entry and sort by date
    this.timeline.push(entry);
    this.timeline.sort((a: IOutbreakTimeline, b: IOutbreakTimeline) => 
      a.date.getTime() - b.date.getTime()
    );
  }

  await this.save();
};

/**
 * Mark outbreak as contained
 */
RegionalOutbreakSchema.methods.markAsContained = async function(): Promise<void> {
  this.status = 'contained';
  await this.save();
};

/**
 * Mark outbreak as resolved
 */
RegionalOutbreakSchema.methods.markAsResolved = async function(): Promise<void> {
  this.status = 'resolved';
  this.endDate = new Date();
  await this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find active outbreaks
 */
RegionalOutbreakSchema.statics.findActive = function(
  tenantId: mongoose.Types.ObjectId,
  options: { severity?: OutbreakSeverity; detectionType?: DetectionType } = {}
) {
  const query: Record<string, unknown> = {
    tenantId,
    status: 'active',
    isActive: true
  };

  if (options.severity) {
    query.outbreakSeverity = options.severity;
  }

  if (options.detectionType) {
    query.detectionType = options.detectionType;
  }

  return this.find(query)
    .sort({ severityIndex: -1, startDate: -1 })
    .populate('issuedBy', 'name email');
};

/**
 * Find outbreaks affecting specific region
 */
RegionalOutbreakSchema.statics.findByRegion = function(
  tenantId: mongoose.Types.ObjectId,
  regionName: string,
  status?: 'active' | 'contained' | 'resolved'
) {
  const query: Record<string, unknown> = {
    tenantId,
    'region.name': regionName,
    isActive: true
  };

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .sort({ startDate: -1 });
};

/**
 * Find outbreaks near location (geospatial)
 */
RegionalOutbreakSchema.statics.findNearLocation = function(
  tenantId: mongoose.Types.ObjectId,
  longitude: number,
  latitude: number,
  maxDistanceMeters = 100000,
  statusFilter?: 'active' | 'contained' | 'resolved'
) {
  const query: Record<string, unknown> = {
    tenantId,
    'region.centerPoint': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceMeters
      }
    },
    isActive: true
  };

  if (statusFilter) {
    query.status = statusFilter;
  }

  return this.find(query);
};

/**
 * Find outbreaks containing a point (point-in-polygon)
 */
RegionalOutbreakSchema.statics.findContainingLocation = function(
  tenantId: mongoose.Types.ObjectId,
  longitude: number,
  latitude: number,
  statusFilter?: 'active' | 'contained' | 'resolved'
) {
  const query: Record<string, unknown> = {
    tenantId,
    'region.geometry': {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    },
    isActive: true
  };

  if (statusFilter) {
    query.status = statusFilter;
  }

  return this.find(query);
};

/**
 * Aggregate outbreaks by pest/disease
 */
RegionalOutbreakSchema.statics.aggregateByPestDisease = function(
  tenantId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const match: Record<string, unknown> = {
    tenantId,
    isActive: true
  };

  if (startDate || endDate) {
    match.startDate = {};
    if (startDate) (match.startDate as Record<string, unknown>).$gte = startDate;
    if (endDate) (match.startDate as Record<string, unknown>).$lte = endDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          pestOrDisease: '$pestOrDisease',
          detectionType: '$detectionType'
        },
        totalOutbreaks: { $sum: 1 },
        activeOutbreaks: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalReports: { $sum: '$totalReports' },
        totalFarmsAffected: { $sum: '$farmsAffected' },
        avgSeverityIndex: { $avg: '$severityIndex' },
        maxSeverityIndex: { $max: '$severityIndex' },
        regionsAffected: { $addToSet: '$region.name' }
      }
    },
    { $sort: { totalReports: -1 } }
  ]);
};

/**
 * Get outbreak timeline aggregation
 */
RegionalOutbreakSchema.statics.getTimelineAggregation = function(
  tenantId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        isActive: true,
        $or: [
          { startDate: { $lte: endDate, $gte: startDate } },
          { endDate: { $lte: endDate, $gte: startDate } }
        ]
      }
    },
    { $unwind: '$timeline' },
    {
      $match: {
        'timeline.date': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: '$timeline.date',
          detectionType: '$detectionType'
        },
        totalReports: { $sum: '$timeline.reportCount' },
        totalConfirmed: { $sum: '$timeline.confirmedCount' },
        avgSeverity: { $avg: '$timeline.severityIndex' },
        outbreaksCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
};

/**
 * Get severity heatmap data
 */
RegionalOutbreakSchema.statics.getSeverityHeatmap = function(
  tenantId: mongoose.Types.ObjectId,
  status?: 'active' | 'contained' | 'resolved'
) {
  const match: Record<string, unknown> = {
    tenantId,
    isActive: true
  };

  if (status) {
    match.status = status;
  }

  return this.aggregate([
    { $match: match },
    {
      $project: {
        pestOrDisease: 1,
        region: 1,
        severityIndex: 1,
        location: '$region.centerPoint',
        status: 1
      }
    }
  ]);
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

const RegionalOutbreak = mongoose.model<IRegionalOutbreak>(
  'RegionalOutbreak',
  RegionalOutbreakSchema
);

export default RegionalOutbreak;
