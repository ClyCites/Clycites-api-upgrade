import mongoose, { Document, Schema } from 'mongoose';

/**
 * Production Profile Model
 * Tracks crops, livestock, seasonal calendars, yield history, and input usage
 */

// ==================== CROP PRODUCTION ====================

export interface ICropProduction extends Document {
  farmerId: mongoose.Types.ObjectId;
  farmId: mongoose.Types.ObjectId;
  
  // Crop Details
  cropName: string;
  cropVariety?: string;
  cropCategory: 'cereals' | 'legumes' | 'vegetables' | 'fruits' | 'cash_crops' | 'roots_tubers' | 'fodder' | 'other';
  
  // Season & Timing
  season: 'season_a' | 'season_b' | 'dry_season' | 'wet_season' | 'year_round';
  year: number;
  plantingDate?: Date;
  expectedHarvestDate?: Date;
  actualHarvestDate?: Date;
  
  // Area & Planting
  areaPlanted: number;
  areaUnit: 'acres' | 'hectares' | 'square_meters';
  plantingMethod: 'broadcast' | 'row_planting' | 'transplanting' | 'mechanized' | 'manual';
  seedSource: 'own_saved' | 'purchased' | 'cooperative' | 'government' | 'donation';
  seedQuantity?: number;
  seedUnit?: 'kg' | 'grams' | 'bags' | 'packets';
  
  // Production Estimates & Actuals
  estimatedYield: number;
  actualYield?: number;
  yieldUnit: 'kg' | 'tons' | 'bags' | 'bunches' | 'pieces';
  qualityGrade?: 'premium' | 'grade_a' | 'grade_b' | 'grade_c' | 'reject';
  
  // Input Usage
  inputs: {
    fertilizers?: {
      name: string;
      type: 'organic' | 'inorganic' | 'mixed';
      quantity: number;
      unit: 'kg' | 'bags' | 'liters';
      applicationDate?: Date;
      cost?: number;
      currency?: string;
    }[];
    pesticides?: {
      name: string;
      type: 'insecticide' | 'herbicide' | 'fungicide' | 'mixed';
      quantity: number;
      unit: 'liters' | 'kg' | 'ml';
      applicationDate?: Date;
      cost?: number;
      currency?: string;
    }[];
    laborInput?: {
      activity: 'land_preparation' | 'planting' | 'weeding' | 'spraying' | 'harvesting' | 'other';
      laborType: 'family' | 'hired' | 'cooperative_shared';
      numberOfWorkers?: number;
      workDays?: number;
      cost?: number;
      currency?: string;
    }[];
    otherInputs?: {
      name: string;
      description?: string;
      quantity?: number;
      unit?: string;
      cost?: number;
      currency?: string;
    }[];
  };
  
  // Costs & Revenue
  financials: {
    totalCost?: number; // Production costs
    sellingPrice?: number; // Price per unit sold
    totalRevenue?: number;
    profitMargin?: number;
    currency: string;
  };
  
  // Challenges & Performance
  challenges?: {
    type: 'drought' | 'pests' | 'diseases' | 'flooding' | 'labor_shortage' | 'market_access' | 'other';
    description?: string;
    severity: 'low' | 'moderate' | 'severe';
    impactOnYield?: number; // percentage
  }[];
  
  // Status
  productionStatus: 'planned' | 'in_progress' | 'harvested' | 'sold' | 'stored' | 'failed';
  storageLocation?: string;
  marketDestination?: 'local_market' | 'cooperative' | 'contract_buyer' | 'export' | 'home_consumption';
  
  // Quality & Certification
  organicCertified: boolean;
  certificationDetails?: {
    certificationBody: string;
    certificateNumber: string;
    validUntil?: Date;
  };
  
  // Notes & Observations
  notes?: string;
  photos?: string[];
  
  // Multi-tenant & Audit
  tenantId?: string;
  version: number;
  isActive: boolean;
  deletedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
}

const CropProductionSchema = new Schema<ICropProduction>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true,
    },
    farmId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmEnterprise',
      required: true,
      index: true,
    },
    cropName: {
      type: String,
      required: true,
      index: true,
    },
    cropVariety: String,
    cropCategory: {
      type: String,
      enum: ['cereals', 'legumes', 'vegetables', 'fruits', 'cash_crops', 'roots_tubers', 'fodder', 'other'],
      required: true,
      index: true,
    },
    season: {
      type: String,
      enum: ['season_a', 'season_b', 'dry_season', 'wet_season', 'year_round'],
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    plantingDate: Date,
    expectedHarvestDate: Date,
    actualHarvestDate: Date,
    areaPlanted: {
      type: Number,
      required: true,
      min: 0,
    },
    areaUnit: {
      type: String,
      enum: ['acres', 'hectares', 'square_meters'],
      default: 'acres',
    },
    plantingMethod: {
      type: String,
      enum: ['broadcast', 'row_planting', 'transplanting', 'mechanized', 'manual'],
    },
    seedSource: {
      type: String,
      enum: ['own_saved', 'purchased', 'cooperative', 'government', 'donation'],
    },
    seedQuantity: Number,
    seedUnit: {
      type: String,
      enum: ['kg', 'grams', 'bags', 'packets'],
    },
    estimatedYield: {
      type: Number,
      required: true,
    },
    actualYield: Number,
    yieldUnit: {
      type: String,
      enum: ['kg', 'tons', 'bags', 'bunches', 'pieces'],
      required: true,
    },
    qualityGrade: {
      type: String,
      enum: ['premium', 'grade_a', 'grade_b', 'grade_c', 'reject'],
    },
    inputs: {
      fertilizers: [
        {
          name: String,
          type: {
            type: String,
            enum: ['organic', 'inorganic', 'mixed'],
          },
          quantity: Number,
          unit: {
            type: String,
            enum: ['kg', 'bags', 'liters'],
          },
          applicationDate: Date,
          cost: Number,
          currency: String,
        },
      ],
      pesticides: [
        {
          name: String,
          type: {
            type: String,
            enum: ['insecticide', 'herbicide', 'fungicide', 'mixed'],
          },
          quantity: Number,
          unit: {
            type: String,
            enum: ['liters', 'kg', 'ml'],
          },
          applicationDate: Date,
          cost: Number,
          currency: String,
        },
      ],
      laborInput: [
        {
          activity: {
            type: String,
            enum: ['land_preparation', 'planting', 'weeding', 'spraying', 'harvesting', 'other'],
          },
          laborType: {
            type: String,
            enum: ['family', 'hired', 'cooperative_shared'],
          },
          numberOfWorkers: Number,
          workDays: Number,
          cost: Number,
          currency: String,
        },
      ],
      otherInputs: [
        {
          name: String,
          description: String,
          quantity: Number,
          unit: String,
          cost: Number,
          currency: String,
        },
      ],
    },
    financials: {
      totalCost: Number,
      sellingPrice: Number,
      totalRevenue: Number,
      profitMargin: Number,
      currency: {
        type: String,
        default: 'UGX',
      },
    },
    challenges: [
      {
        type: {
          type: String,
          enum: ['drought', 'pests', 'diseases', 'flooding', 'labor_shortage', 'market_access', 'other'],
        },
        description: String,
        severity: {
          type: String,
          enum: ['low', 'moderate', 'severe'],
        },
        impactOnYield: Number,
      },
    ],
    productionStatus: {
      type: String,
      enum: ['planned', 'in_progress', 'harvested', 'sold', 'stored', 'failed'],
      default: 'planned',
      index: true,
    },
    storageLocation: String,
    marketDestination: {
      type: String,
      enum: ['local_market', 'cooperative', 'contract_buyer', 'export', 'home_consumption'],
    },
    organicCertified: {
      type: Boolean,
      default: false,
    },
    certificationDetails: {
      certificationBody: String,
      certificateNumber: String,
      validUntil: Date,
    },
    notes: String,
    photos: [String],
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CropProductionSchema.index({ farmerId: 1, year: -1, season: 1 });
CropProductionSchema.index({ farmId: 1, cropName: 1 });
CropProductionSchema.index({ productionStatus: 1, isActive: 1 });
CropProductionSchema.index({ cropCategory: 1, year: -1 });
CropProductionSchema.index({ tenantId: 1, isActive: 1 });

// ==================== LIVESTOCK PRODUCTION ====================

export interface ILivestockProduction extends Document {
  farmerId: mongoose.Types.ObjectId;
  farmId: mongoose.Types.ObjectId;
  
  // Livestock Details
  animalType: 'cattle' | 'goats' | 'sheep' | 'pigs' | 'poultry' | 'rabbits' | 'fish' | 'bees' | 'other';
  breed?: string;
  productionSystem: 'intensive' | 'semi_intensive' | 'extensive' | 'free_range' | 'battery' | 'pond' | 'cage';
  
  // Herd/Flock Management
  totalAnimals: number;
  ageBreakdown?: {
    category: 'young' | 'breeding_age' | 'mature' | 'old';
    count: number;
  }[];
  sexBreakdown?: {
    male: number;
    female: number;
    unknown?: number;
  };
  
  // Production Type & Goals
  primaryPurpose: 'meat' | 'milk' | 'eggs' | 'breeding' | 'draft_power' | 'honey' | 'fish' | 'mixed';
  secondaryPurpose?: string[];
  
  // Period Tracking
  year: number;
  recordingPeriod: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'annual';
  startDate: Date;
  endDate?: Date;
  
  // Production Records
  production: {
    milk?: {
      averageDailyProduction: number; // liters
      totalProduction: number;
      soldQuantity?: number;
      homeConsumption?: number;
      sellingPricePerLiter?: number;
      currency?: string;
    };
    eggs?: {
      averageDailyProduction: number; // number of eggs
      totalProduction: number;
      soldQuantity?: number;
      homeConsumption?: number;
      sellingPricePerEgg?: number;
      currency?: string;
    };
    meat?: {
      animalsSlaughtered: number;
      totalWeight: number; // kg
      weightUnit: 'kg' | 'pounds';
      sellingPricePerKg?: number;
      totalRevenue?: number;
      currency?: string;
    };
    offspring?: {
      births: number;
      deaths: number;
      survivaRate: number; // percentage
      sold?: number;
      retained?: number;
    };
    honey?: {
      totalProduction: number; // kg or liters
      unit: 'kg' | 'liters';
      sellingPricePerUnit?: number;
      currency?: string;
    };
    fish?: {
      totalHarvest: number; // kg
      stockingDensity?: number;
      survivalRate?: number;
      sellingPricePerKg?: number;
      currency?: string;
    };
  };
  
  // Feed & Nutrition
  feeding: {
    feedType: ('grazing' | 'hay' | 'silage' | 'concentrate' | 'kitchen_waste' | 'commercial_feed' | 'fodder' | 'other')[];
    feedSource: 'own_production' | 'purchased' | 'mixed';
    feedCostPerMonth?: number;
    supplementation?: boolean;
    waterSource: 'borehole' | 'river' | 'tap' | 'pond' | 'well' | 'rainwater';
  };
  
  // Health Management
  health: {
    vaccinationProgram: boolean;
    lastVaccinationDate?: Date;
    vaccinesGiven?: string[];
    dewormingSchedule: boolean;
    lastDewormingDate?: Date;
    diseaseOutbreaks?: {
      disease: string;
      occurrenceDate: Date;
      affectedAnimals: number;
      deaths?: number;
      treatmentCost?: number;
    }[];
    veterinaryVisits?: number;
    veterinaryCost?: number;
  };
  
  // Housing & Infrastructure
  housing: {
    housingType: 'barn' | 'shed' | 'stall' | 'pen' | 'cage' | 'pond' | 'hive' | 'open_field';
    capacity: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    hasWaterSystem: boolean;
    hasFeedingSystem: boolean;
  };
  
  // Financial Performance
  financials: {
    totalRevenue?: number;
    feedCost?: number;
    veterinaryCost?: number;
    laborCost?: number;
    otherCosts?: number;
    totalCost?: number;
    profitMargin?: number;
    currency: string;
  };
  
  // Breeding Records
  breeding?: {
    breedingMethod: 'natural' | 'artificial_insemination' | 'mixed';
    numberOfBreedings: number;
    conceptionRate?: number; // percentage
    averageOffspringPerBirth?: number;
  };
  
  // Challenges
  challenges?: {
    type: 'disease' | 'feed_shortage' | 'water_shortage' | 'predators' | 'theft' | 'market_access' | 'other';
    description?: string;
    severity: 'low' | 'moderate' | 'severe';
    impact?: string;
  }[];
  
  // Status & Notes
  productionStatus: 'active' | 'completed' | 'suspended' | 'failed';
  notes?: string;
  photos?: string[];
  
  // Multi-tenant & Audit
  tenantId?: string;
  version: number;
  isActive: boolean;
  deletedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
}

const LivestockProductionSchema = new Schema<ILivestockProduction>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true,
    },
    farmId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmEnterprise',
      required: true,
      index: true,
    },
    animalType: {
      type: String,
      enum: ['cattle', 'goats', 'sheep', 'pigs', 'poultry', 'rabbits', 'fish', 'bees', 'other'],
      required: true,
      index: true,
    },
    breed: String,
    productionSystem: {
      type: String,
      enum: ['intensive', 'semi_intensive', 'extensive', 'free_range', 'battery', 'pond', 'cage'],
      required: true,
    },
    totalAnimals: {
      type: Number,
      required: true,
      min: 0,
    },
    ageBreakdown: [
      {
        category: {
          type: String,
          enum: ['young', 'breeding_age', 'mature', 'old'],
        },
        count: Number,
      },
    ],
    sexBreakdown: {
      male: Number,
      female: Number,
      unknown: Number,
    },
    primaryPurpose: {
      type: String,
      enum: ['meat', 'milk', 'eggs', 'breeding', 'draft_power', 'honey', 'fish', 'mixed'],
      required: true,
      index: true,
    },
    secondaryPurpose: [String],
    year: {
      type: Number,
      required: true,
      index: true,
    },
    recordingPeriod: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'seasonal', 'annual'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    production: {
      milk: {
        averageDailyProduction: Number,
        totalProduction: Number,
        soldQuantity: Number,
        homeConsumption: Number,
        sellingPricePerLiter: Number,
        currency: String,
      },
      eggs: {
        averageDailyProduction: Number,
        totalProduction: Number,
        soldQuantity: Number,
        homeConsumption: Number,
        sellingPricePerEgg: Number,
        currency: String,
      },
      meat: {
        animalsSlaughtered: Number,
        totalWeight: Number,
        weightUnit: {
          type: String,
          enum: ['kg', 'pounds'],
        },
        sellingPricePerKg: Number,
        totalRevenue: Number,
        currency: String,
      },
      offspring: {
        births: Number,
        deaths: Number,
        survivalRate: Number,
        sold: Number,
        retained: Number,
      },
      honey: {
        totalProduction: Number,
        unit: {
          type: String,
          enum: ['kg', 'liters'],
        },
        sellingPricePerUnit: Number,
        currency: String,
      },
      fish: {
        totalHarvest: Number,
        stockingDensity: Number,
        survivalRate: Number,
        sellingPricePerKg: Number,
        currency: String,
      },
    },
    feeding: {
      feedType: {
        type: [String],
        enum: ['grazing', 'hay', 'silage', 'concentrate', 'kitchen_waste', 'commercial_feed', 'fodder', 'other'],
      },
      feedSource: {
        type: String,
        enum: ['own_production', 'purchased', 'mixed'],
      },
      feedCostPerMonth: Number,
      supplementation: Boolean,
      waterSource: {
        type: String,
        enum: ['borehole', 'river', 'tap', 'pond', 'well', 'rainwater'],
      },
    },
    health: {
      vaccinationProgram: {
        type: Boolean,
        default: false,
      },
      lastVaccinationDate: Date,
      vaccinesGiven: [String],
      dewormingSchedule: Boolean,
      lastDewormingDate: Date,
      diseaseOutbreaks: [
        {
          disease: String,
          occurrenceDate: Date,
          affectedAnimals: Number,
          deaths: Number,
          treatmentCost: Number,
        },
      ],
      veterinaryVisits: Number,
      veterinaryCost: Number,
    },
    housing: {
      housingType: {
        type: String,
        enum: ['barn', 'shed', 'stall', 'pen', 'cage', 'pond', 'hive', 'open_field'],
      },
      capacity: Number,
      condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      hasWaterSystem: Boolean,
      hasFeedingSystem: Boolean,
    },
    financials: {
      totalRevenue: Number,
      feedCost: Number,
      veterinaryCost: Number,
      laborCost: Number,
      otherCosts: Number,
      totalCost: Number,
      profitMargin: Number,
      currency: {
        type: String,
        default: 'UGX',
      },
    },
    breeding: {
      breedingMethod: {
        type: String,
        enum: ['natural', 'artificial_insemination', 'mixed'],
      },
      numberOfBreedings: Number,
      conceptionRate: Number,
      averageOffspringPerBirth: Number,
    },
    challenges: [
      {
        type: {
          type: String,
          enum: ['disease', 'feed_shortage', 'water_shortage', 'predators', 'theft', 'market_access', 'other'],
        },
        description: String,
        severity: {
          type: String,
          enum: ['low', 'moderate', 'severe'],
        },
        impact: String,
      },
    ],
    productionStatus: {
      type: String,
      enum: ['active', 'completed', 'suspended', 'failed'],
      default: 'active',
      index: true,
    },
    notes: String,
    photos: [String],
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
LivestockProductionSchema.index({ farmerId: 1, year: -1 });
LivestockProductionSchema.index({ farmId: 1, animalType: 1 });
LivestockProductionSchema.index({ productionStatus: 1, isActive: 1 });
LivestockProductionSchema.index({ animalType: 1, primaryPurpose: 1 });
LivestockProductionSchema.index({ tenantId: 1, isActive: 1 });

// Export models
export const CropProduction = mongoose.model<ICropProduction>('CropProduction', CropProductionSchema);
export const LivestockProduction = mongoose.model<ILivestockProduction>('LivestockProduction', LivestockProductionSchema);
