import mongoose, { Document, Schema } from 'mongoose';

/**
 * Enterprise Farm Model
 * Supports detailed farm/land management with geo-boundaries,
 * ownership tracking, and production capacity indicators
 */

export interface IFarmEnterprise extends Document {
  // Ownership
  farmerId: mongoose.Types.ObjectId; // Links to FarmerProfile
  organizationId?: mongoose.Types.ObjectId; // Optional - for cooperative-owned farms
  
  // Basic Information
  farmName: string;
  farmCode: string; // Auto-generated unique identifier
  farmType: 'individual' | 'cooperative' | 'community' | 'leased' | 'contract';
  
  // Size & Measurements
  totalSize: number;
  sizeUnit: 'acres' | 'hectares' | 'square_meters';
  cultivableArea?: number; // Actual farmable land
  cultivableUnit?: 'acres' | 'hectares' | 'square_meters';
  
  // Ownership Details
  ownershipType: 'owned' | 'leased' | 'communal' | 'family_land' | 'rented' | 'sharecropping';
  ownershipDocuments?: {
    type: 'title_deed' | 'lease_agreement' | 'customary_rights' | 'rental_agreement' | 'other';
    documentUrl?: string;
    registrationNumber?: string;
    validFrom?: Date;
    validUntil?: Date;
    verified: boolean;
  }[];
  
  // Location & Boundaries
  location: {
    country: string;
    region: string;
    district: string;
    subCounty?: string;
    parish?: string;
    village?: string;
    landmark?: string;
    
    // Center point coordinates
    centerPoint?: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    
    // Farm boundary polygon (for advanced mapping)
    boundary?: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][]; // GeoJSON format
    };
    
    // Elevation & terrain
    elevation?: number; // meters above sea level
    slope?: 'flat' | 'gentle' | 'moderate' | 'steep';
    terrain?: 'plains' | 'hills' | 'valley' | 'mountainous';
  };
  
  // Soil & Land Quality
  soilProfile: {
    primarySoilType?: 'clay' | 'loam' | 'sand' | 'silt' | 'peat' | 'chalk' | 'mixed';
    soilPH?: number; // 0-14 scale
    soilFertility?: 'poor' | 'moderate' | 'good' | 'excellent';
    organicMatter?: number; // percentage
    soilTestDate?: Date;
    soilTestResults?: string; // URL to lab results
    requiresSoilAmendment?: boolean;
    erosionRisk?: 'low' | 'moderate' | 'high';
  };
  
  // Water & Irrigation
  waterResources: {
    primaryWaterSource?: ('rain_fed' | 'river' | 'borehole' | 'well' | 'dam' | 'spring' | 'municipal')[];
    hasIrrigation: boolean;
    irrigationType?: ('drip' | 'sprinkler' | 'flood' | 'furrow' | 'manual')[];
    irrigationCoverage?: number; // percentage of farm
    waterAvailability?: 'year_round' | 'seasonal' | 'limited';
    waterQuality?: 'good' | 'moderate' | 'poor' | 'untested';
  };
  
  // Infrastructure & Facilities
  infrastructure: {
    // Storage
    hasStorage: boolean;
    storageType?: ('warehouse' | 'silo' | 'cold_storage' | 'shed' | 'crib')[];
    storageCapacity?: number; // in kg or tons
    storageUnit?: 'kg' | 'tons' | 'bags';
    
    // Equipment & Tools
    hasEquipment: boolean;
    equipment?: {
      name: string;
      type:  'tractor' | 'plough' | 'harvester' | 'irrigation_pump' | 'sprayer' | 'other';
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      ownedOrRented: 'owned' | 'rented' | 'shared';
    }[];
    
    // Buildings & structures
    buildings?: {
      type: 'farmhouse' | 'barn' | 'greenhouse' | 'processing_unit' | 'animal_shed' | 'office';
      size?: number;
      condition: 'excellent' | 'good' | 'fair' | 'poor';
    }[];
    
    // Utilities
    hasElectricity: boolean;
    hasRoadAccess: boolean;
    roadCondition?: 'paved' | 'gravel' | 'dirt' | 'seasonal';
    distanceToMarket?: number; // in kilometers
  };
  
  // Production Capacity
  productionCapacity: {
    crops?: {
      cropType: string;
      estimatedYieldPerSeason: number;
      unit: 'kg' | 'tons' | 'bags';
      seasonsPerYear: number;
    }[];
    livestock?: {
      animalType: string;
      headCount: number;
      productionType: 'meat' | 'milk' | 'eggs' | 'breeding' | 'draft_power';
      estimatedAnnualProduction: number;
      unit: string;
    }[];
  };
  
  // Current Usage
  currentCrops: string[]; // Active crops being grown
  currentLivestock?: {
    type: string;
    count: number;
  }[];
  
  // Registration & Certification
  registrations: {
    type: 'government_registration' | 'organic_certification' | 'gap' | 'fair_trade' | 'other';
    registrationNumber?: string;
    issuedBy: string;
    issuedDate?: Date;
    expiryDate?: Date;
    status: 'active' | 'expired' | 'pending' | 'suspended';
    documentUrl?: string;
  }[];
  
  // Environmental & Sustainability
  sustainability: {
    usesOrganicFarming: boolean;
    usesChemicalFertilizers: boolean;
    usesPesticides: boolean;
    practicesConservationFarming: boolean;
    hasTreeCover: boolean;
    treeCoverPercentage?: number;
    watershedManagement: boolean;
    wasteManagement?: 'composting' | 'burning' | 'disposal' | 'recycling' | 'none';
  };
  
  // Risk Assessment
  risks: {
    floodProne: boolean;
    droughtProne: boolean;
    pestInfestation: boolean;
    diseaseOutbreaks: boolean;
    wildlifeInterference: boolean;
    securityConcerns: boolean;
    otherRisks?: string[];
  };
  
  // Media & Documentation
  media: {
    photos?: string[]; // Photo URLs
    videos?: string[]; // Video URLs
    maps?: string[]; // Map/survey document URLs
    reports?: string[]; // Farm reports, assessments
  };
  
  // Operational Status
  operationalStatus: 'active' | 'inactive' | 'fallow' | 'under_development' | 'abandoned';
  farmingSeasonStatus?: 'pre_planting' | 'planting' | 'growing' | 'harvesting' | 'post_harvest';
  
  // Performance Tracking
  lastHarvestDate?: Date;
  lastYield?: number;
  lastYieldUnit?: string;
  
  // Multi-tenant & Audit
  tenantId?: string;
  version: number;
  
  // Soft Delete & Audit Trail
  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  
  // Timestamps & Tracking
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  // Verification & Validation
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  notes?: string; // Admin notes
  softDelete(deletedBy?: mongoose.Types.ObjectId): Promise<IFarmEnterprise>;
}

const FarmEnterpriseSchema = new Schema<IFarmEnterprise>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    farmName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    farmCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    farmType: {
      type: String,
      enum: ['individual', 'cooperative', 'community', 'leased', 'contract'],
      default: 'individual',
    },
    totalSize: {
      type: Number,
      required: true,
      min: 0,
    },
    sizeUnit: {
      type: String,
      enum: ['acres', 'hectares', 'square_meters'],
      default: 'acres',
    },
    cultivableArea: Number,
    cultivableUnit: {
      type: String,
      enum: ['acres', 'hectares', 'square_meters'],
    },
    ownershipType: {
      type: String,
      enum: ['owned', 'leased', 'communal', 'family_land', 'rented', 'sharecropping'],
      required: true,
    },
    ownershipDocuments: [
      {
        type: {
          type: String,
          enum: ['title_deed', 'lease_agreement', 'customary_rights', 'rental_agreement', 'other'],
        },
        documentUrl: String,
        registrationNumber: String,
        validFrom: Date,
        validUntil: Date,
        verified: {
          type: Boolean,
          default: false,
        },
      },
    ],
    location: {
      country: {
        type: String,
        required: true,
        default: 'Uganda',
      },
      region: {
        type: String,
        required: true,
        index: true,
      },
      district: {
        type: String,
        required: true,
        index: true,
      },
      subCounty: String,
      parish: String,
      village: String,
      landmark: String,
      centerPoint: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          index: '2dsphere',
        },
      },
      boundary: {
        type: {
          type: String,
          enum: ['Polygon', 'MultiPolygon'],
        },
        coordinates: {
          type: Schema.Types.Mixed, // GeoJSON coordinates
        },
      },
      elevation: Number,
      slope: {
        type: String,
        enum: ['flat', 'gentle', 'moderate', 'steep'],
      },
      terrain: {
        type: String,
        enum: ['plains', 'hills', 'valley', 'mountainous'],
      },
    },
    soilProfile: {
      primarySoilType: {
        type: String,
        enum: ['clay', 'loam', 'sand', 'silt', 'peat', 'chalk', 'mixed'],
      },
      soilPH: {
        type: Number,
        min: 0,
        max: 14,
      },
      soilFertility: {
        type: String,
        enum: ['poor', 'moderate', 'good', 'excellent'],
      },
      organicMatter: Number,
      soilTestDate: Date,
      soilTestResults: String,
      requiresSoilAmendment: Boolean,
      erosionRisk: {
        type: String,
        enum: ['low', 'moderate', 'high'],
      },
    },
    waterResources: {
      primaryWaterSource: {
        type: [String],
        enum: ['rain_fed', 'river', 'borehole', 'well', 'dam', 'spring', 'municipal'],
      },
      hasIrrigation: {
        type: Boolean,
        default: false,
      },
      irrigationType: {
        type: [String],
        enum: ['drip', 'sprinkler', 'flood', 'furrow', 'manual'],
      },
      irrigationCoverage: Number,
      waterAvailability: {
        type: String,
        enum: ['year_round', 'seasonal', 'limited'],
      },
      waterQuality: {
        type: String,
        enum: ['good', 'moderate', 'poor', 'untested'],
      },
    },
    infrastructure: {
      hasStorage: {
        type: Boolean,
        default: false,
      },
      storageType: {
        type: [String],
        enum: ['warehouse', 'silo', 'cold_storage', 'shed', 'crib'],
      },
      storageCapacity: Number,
      storageUnit: {
        type: String,
        enum: ['kg', 'tons', 'bags'],
      },
      hasEquipment: {
        type: Boolean,
        default: false,
      },
      equipment: [
        {
          name: String,
          type: {
            type: String,
            enum: ['tractor', 'plough', 'harvester', 'irrigation_pump', 'sprayer', 'other'],
          },
          condition: {
            type: String,
            enum: ['excellent', 'good', 'fair', 'poor'],
          },
          ownedOrRented: {
            type: String,
            enum: ['owned', 'rented', 'shared'],
          },
        },
      ],
      buildings: [
        {
          type: {
            type: String,
            enum: ['farmhouse', 'barn', 'greenhouse', 'processing_unit', 'animal_shed', 'office'],
          },
          size: Number,
          condition: {
            type: String,
            enum: ['excellent', 'good', 'fair', 'poor'],
          },
        },
      ],
      hasElectricity: {
        type: Boolean,
        default: false,
      },
      hasRoadAccess: {
        type: Boolean,
        default: true,
      },
      roadCondition: {
        type: String,
        enum: ['paved', 'gravel', 'dirt', 'seasonal'],
      },
      distanceToMarket: Number,
    },
    productionCapacity: {
      crops: [
        {
          cropType: String,
          estimatedYieldPerSeason: Number,
          unit: {
            type: String,
            enum: ['kg', 'tons', 'bags'],
          },
          seasonsPerYear: {
            type: Number,
            default: 2,
          },
        },
      ],
      livestock: [
        {
          animalType: String,
          headCount: Number,
          productionType: {
            type: String,
            enum: ['meat', 'milk', 'eggs', 'breeding', 'draft_power'],
          },
          estimatedAnnualProduction: Number,
          unit: String,
        },
      ],
    },
    currentCrops: {
      type: [String],
      default: [],
    },
    currentLivestock: [
      {
        type: String,
        count: Number,
      },
    ],
    registrations: [
      {
        type: {
          type: String,
          enum: ['government_registration', 'organic_certification', 'gap', 'fair_trade', 'other'],
        },
        registrationNumber: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date,
        status: {
          type: String,
          enum: ['active', 'expired', 'pending', 'suspended'],
          default: 'pending',
        },
        documentUrl: String,
      },
    ],
    sustainability: {
      usesOrganicFarming: {
        type: Boolean,
        default: false,
      },
      usesChemicalFertilizers: Boolean,
      usesPesticides: Boolean,
      practicesConservationFarming: Boolean,
      hasTreeCover: Boolean,
      treeCoverPercentage: Number,
      watershedManagement: Boolean,
      wasteManagement: {
        type: String,
        enum: ['composting', 'burning', 'disposal', 'recycling', 'none'],
      },
    },
    risks: {
      floodProne: {
        type: Boolean,
        default: false,
      },
      droughtProne: {
        type: Boolean,
        default: false,
      },
      pestInfestation: Boolean,
      diseaseOutbreaks: Boolean,
      wildlifeInterference: Boolean,
      securityConcerns: Boolean,
      otherRisks: [String],
    },
    media: {
      photos: [String],
      videos: [String],
      maps: [String],
      reports: [String],
    },
    operationalStatus: {
      type: String,
      enum: ['active', 'inactive', 'fallow', 'under_development', 'abandoned'],
      default: 'active',
      index: true,
    },
    farmingSeasonStatus: {
      type: String,
      enum: ['pre_planting', 'planting', 'growing', 'harvesting', 'post_harvest'],
    },
    lastHarvestDate: Date,
    lastYield: Number,
    lastYieldUnit: String,
    tenantId: {
      type: String,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
      index: true,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
FarmEnterpriseSchema.index({ farmerId: 1, isActive: 1 });
FarmEnterpriseSchema.index({ organizationId: 1, isActive: 1 });
FarmEnterpriseSchema.index({ farmCode: 1 });
FarmEnterpriseSchema.index({ 'location.region': 1, 'location.district': 1 });
FarmEnterpriseSchema.index({ operationalStatus: 1, isActive: 1 });
FarmEnterpriseSchema.index({ verificationStatus: 1 });
FarmEnterpriseSchema.index({ tenantId: 1, isActive: 1 });

// Geospatial indexes
FarmEnterpriseSchema.index({ 'location.centerPoint': '2dsphere' });
FarmEnterpriseSchema.index({ 'location.boundary': '2dsphere' });

// Text search
FarmEnterpriseSchema.index({
  farmName: 'text',
  farmCode: 'text',
  'location.village': 'text',
});

// Pre-save: Auto-generate farm code
FarmEnterpriseSchema.pre('save', function (next) {
  if (!this.farmCode) {
    const region = this.location.region.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.farmCode = `FRM-${region}-${timestamp}-${random}`;
  }
  next();
});

// Soft delete method
FarmEnterpriseSchema.methods.softDelete = async function (deletedBy?: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  if (deletedBy) this.deletedBy = deletedBy;
  return await this.save();
};

export default mongoose.model<IFarmEnterprise>('FarmEnterprise', FarmEnterpriseSchema);
