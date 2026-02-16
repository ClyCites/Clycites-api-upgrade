import mongoose, { Document, Schema } from 'mongoose';

/**
 * Farmer Membership & Progression Model
 * Tracks organization membership, role evolution, and eligibility for services
 */

export interface IFarmerMembership extends Document {
  // Identity
  farmerId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // For direct IAM link
  
  // Organization Link (nullable - for independent farmers)
  organizationId?: mongoose.Types.ObjectId;
  
  // Membership Details
  membershipType: 'independent' | 'cooperative_member' | 'group_member' | 'contract_member';
  membershipNumber?: string; // Unique within organization
  membershipStatus: 'active' | 'inactive' | 'suspended' | 'terminated' | 'pending_approval';
  
  // Role & Responsibilities
  role: 'member' | 'committee_member' | 'treasurer' | 'secretary' | 'chairperson' | 'vice_chairperson' | 'auditor';
  responsibilities?: string[];
  appointmentDate?: Date;
  termEndDate?: Date;
  
  // Membership Timeline
  applicationDate?: Date;
  approvalDate?: Date;
  approvedBy?: mongoose.Types.ObjectId; // User who approved
  joinedDate: Date;
  exitDate?: Date;
  exitReason?: 'voluntary' | 'expulsion' | 'death' | 'relocation' | 'inactivity' | 'other';
  exitNotes?: string;
  
  // Membership History (Track transitions between organizations)
  membershipHistory: {
    organizationId?: mongoose.Types.ObjectId;
    organizationName?: string;
    role: string;
    joinedDate: Date;
    exitDate?: Date;
    exitReason?: string;
    status: 'completed' | 'active';
  }[];
  
  // Financial Standing & Eligibility
  financialStanding: {
    // Membership fees
    membershipFeePaid: boolean;
    membershipFeeAmount?: number;
    lastPaymentDate?: Date;
    nextPaymentDue?: Date;
    currency?: string;
    outstandingBalance?: number;
    
    // Share capital (for cooperatives)
    sharesOwned?: number;
    shareValue?: number;
    totalShareCapital?: number;
    
    // Contributions
    totalContributions?: number;
    savingsBalance?: number;
    loanBalance?: number;
    
    // Payment history
    paymentStatus: 'up_to_date' | 'overdue' | 'defaulted' | 'exempt';
    overdueAmount?: number;
    defaultCount?: number;
  };
  
  // Service Eligibility
  eligibility: {
    // Financial services
    eligibleForLoans: boolean;
    loanEligibilityNotes?: string;
    maxLoanAmount?: number;
    currentLoanCount?: number;
    
    // Insurance
    eligibleForInsurance: boolean;
    insuranceCoverage?: ('crop' | 'livestock' | 'life' | 'asset')[];
    
    // Input access
    eligibleForInputs: boolean;
    inputCreditLimit?: number;
    
    // Market access
    eligibleForContracts: boolean;
    contractFarmingStatus?: 'active' | 'eligible' | 'not_eligible';
    
    // Training & extension
    eligibleForTraining: boolean;
    trainingCredits?: number;
    
    // Voting rights
    hasVotingRights: boolean;
    votingPower?: number; // Based on shares, seniority, etc.
  };
  
  // Participation & Engagement
  participation: {
    meetingsAttended: number;
    totalMeetingsCalled: number;
    attendanceRate?: number; // percentage
    lastMeetingAttended?: Date;
    
    trainingsAttended?: {
      trainingName: string;
      trainingDate: Date;
      provider?: string;
      certificateUrl?: string;
    }[];
    
    demonstrationFarmer: boolean; // Model farmer for training others
    fieldDaysHosted?: number;
    
    // Community contribution  
    communityServiceHours?: number;
    volunteerActivities?: string[];
  };
  
  // Performance Metrics
  performance: {
    // Contribution to collective
    totalSalesToCooperative?: number;
    totalVolumeSupplied?: number;
    volumeUnit?: string;
    
    qualityConsistency?: 'excellent' | 'good' | 'fair' | 'poor';
    deliveryReliability?: 'excellent' | 'good' | 'fair' | 'poor';
    
    // Ratings
    overallRating?: number; // 0-5
    complianceRating?: number; // 0-5
    trustScore?: number; // 0-100
    
    // Recognition
    awardsReceived?: {
      awardName: string;
      awardDate: Date;
      issuedBy: string;
      category?: string;
    }[];
    
    // Violations
    violations?: {
      violationType: string;
      description: string;
      date: Date;
      penalty?: string;
      resolved: boolean;
    }[];
  };
  
  // Progression & Growth Path
  progression: {
    currentTier: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master_farmer';
    tierStartDate?: Date;
    nextTierRequirements?: string[];
    
    certifications?: {
      certificationName: string;
      issuedBy: string;
      issuedDate: Date;
      expiryDate?: Date;
      status: 'active' | 'expired' | 'suspended';
    }[];
    
    skillsAcquired?: string[];
    areasOfExpertise?: string[];
    
    mentoringOthers: boolean;
    menteesCount?: number;
  };
  
  // Benefits & Incentives Received
  benefitsReceived: {
    type: 'loan' | 'input_credit' | 'equipment_access' | 'training' | 'insurance' | 'market_access' | 'other';
    description: string;
    value?: number;
    currency?: string;
    receivedDate: Date;
    provider?: string;
  }[];
  
  // Communication Preferences
  communicationPreferences: {
    receiveSMSAlerts: boolean;
    receiveEmailUpdates: boolean;
    receiveWhatsAppMessages: boolean;
    preferredLanguage?: 'english' | 'luganda' | 'swahili' | 'other';
    contactFrequency?: 'daily' | 'weekly' | 'monthly' | 'as_needed';
  };
  
  // Governance & Representation
  governance: {
    isOnCommittee: boolean;
    committeeRole?: string;
    electedDate?: Date;
    termLength?: number; // in months
    canVote: boolean;
    canStandForElection: boolean;
    hasSignatoryRights: boolean;
  };
  
  // Notes & Documentation
  notes?: string; // Internal administrative notes
  documents?: {
    documentType: string;
    documentUrl: string;
    uploadedDate: Date;
    expiryDate?: Date;
  }[];
  
  // Multi-tenant & Audit
  tenantId?: string;
  version: number;
  
  // Soft Delete & Audit Trail
  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  // Methods
  transferToOrganization(newOrganizationId: mongoose.Types.ObjectId, newRole: string): Promise<IFarmerMembership>;
  softDelete(deletedBy?: mongoose.Types.ObjectId): Promise<IFarmerMembership>;
}

const FarmerMembershipSchema = new Schema<IFarmerMembership>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
      sparse: true, // Allows null for independent farmers
    },
    membershipType: {
      type: String,
      enum: ['independent', 'cooperative_member', 'group_member', 'contract_member'],
      default: 'independent',
      index: true,
    },
    membershipNumber: {
      type: String,
      sparse: true,
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'terminated', 'pending_approval'],
      default: 'active',
      index: true,
    },
    role: {
      type: String,
      enum: ['member', 'committee_member', 'treasurer', 'secretary', 'chairperson', 'vice_chairperson', 'auditor'],
      default: 'member',
    },
    responsibilities: [String],
    appointmentDate: Date,
    termEndDate: Date,
    applicationDate: Date,
    approvalDate: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    exitDate: Date,
    exitReason: {
      type: String,
      enum: ['voluntary', 'expulsion', 'death', 'relocation', 'inactivity', 'other'],
    },
    exitNotes: String,
    membershipHistory: [
      {
        organizationId: {
          type: Schema.Types.ObjectId,
          ref: 'Organization',
        },
        organizationName: String,
        role: String,
        joinedDate: Date,
        exitDate: Date,
        exitReason: String,
        status: {
          type: String,
          enum: ['completed', 'active'],
          default: 'active',
        },
      },
    ],
    financialStanding: {
      membershipFeePaid: {
        type: Boolean,
        default: false,
      },
      membershipFeeAmount: Number,
      lastPaymentDate: Date,
      nextPaymentDue: Date,
      currency: {
        type: String,
        default: 'UGX',
      },
      outstandingBalance: {
        type: Number,
        default: 0,
      },
      sharesOwned: Number,
      shareValue: Number,
      totalShareCapital: Number,
      totalContributions: {
        type: Number,
        default: 0,
      },
      savingsBalance: {
        type: Number,
        default: 0,
      },
      loanBalance: {
        type: Number,
        default: 0,
      },
      paymentStatus: {
        type: String,
        enum: ['up_to_date', 'overdue', 'defaulted', 'exempt'],
        default: 'up_to_date',
      },
      overdueAmount: Number,
      defaultCount: {
        type: Number,
        default: 0,
      },
    },
    eligibility: {
      eligibleForLoans: {
        type: Boolean,
        default: true,
      },
      loanEligibilityNotes: String,
      maxLoanAmount: Number,
      currentLoanCount: {
        type: Number,
        default: 0,
      },
      eligibleForInsurance: {
        type: Boolean,
        default: true,
      },
      insuranceCoverage: {
        type: [String],
        enum: ['crop', 'livestock', 'life', 'asset'],
      },
      eligibleForInputs: {
        type: Boolean,
        default: true,
      },
      inputCreditLimit: Number,
      eligibleForContracts: {
        type: Boolean,
        default: true,
      },
      contractFarmingStatus: {
        type: String,
        enum: ['active', 'eligible', 'not_eligible'],
      },
      eligibleForTraining: {
        type: Boolean,
        default: true,
      },
      trainingCredits: {
        type: Number,
        default: 0,
      },
      hasVotingRights: {
        type: Boolean,
        default: true,
      },
      votingPower: {
        type: Number,
        default: 1,
      },
    },
    participation: {
      meetingsAttended: {
        type: Number,
        default: 0,
      },
      totalMeetingsCalled: {
        type: Number,
        default: 0,
      },
      attendanceRate: Number,
      lastMeetingAttended: Date,
      trainingsAttended: [
        {
          trainingName: String,
          trainingDate: Date,
          provider: String,
          certificateUrl: String,
        },
      ],
      demonstrationFarmer: {
        type: Boolean,
        default: false,
      },
      fieldDaysHosted: {
        type: Number,
        default: 0,
      },
      communityServiceHours: {
        type: Number,
        default: 0,
      },
      volunteerActivities: [String],
    },
    performance: {
      totalSalesToCooperative: {
        type: Number,
        default: 0,
      },
      totalVolumeSupplied: Number,
      volumeUnit: String,
      qualityConsistency: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      deliveryReliability: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      overallRating: {
        type: Number,
        min: 0,
        max: 5,
      },
      complianceRating: {
        type: Number,
        min: 0,
        max: 5,
      },
      trustScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      awardsReceived: [
        {
          awardName: String,
          awardDate: Date,
          issuedBy: String,
          category: String,
        },
      ],
      violations: [
        {
          violationType: String,
          description: String,
          date: Date,
          penalty: String,
          resolved: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    progression: {
      currentTier: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert', 'master_farmer'],
        default: 'beginner',
      },
      tierStartDate: Date,
      nextTierRequirements: [String],
      certifications: [
        {
          certificationName: String,
          issuedBy: String,
          issuedDate: Date,
          expiryDate: Date,
          status: {
            type: String,
            enum: ['active', 'expired', 'suspended'],
            default: 'active',
          },
        },
      ],
      skillsAcquired: [String],
      areasOfExpertise: [String],
      mentoringOthers: {
        type: Boolean,
        default: false,
      },
      menteesCount: {
        type: Number,
        default: 0,
      },
    },
    benefitsReceived: [
      {
        type: {
          type: String,
          enum: ['loan', 'input_credit', 'equipment_access', 'training', 'insurance', 'market_access', 'other'],
        },
        description: String,
        value: Number,
        currency: String,
        receivedDate: Date,
        provider: String,
      },
    ],
    communicationPreferences: {
      receiveSMSAlerts: {
        type: Boolean,
        default: true,
      },
      receiveEmailUpdates: {
        type: Boolean,
        default: true,
      },
      receiveWhatsAppMessages: {
        type: Boolean,
        default: true,
      },
      preferredLanguage: {
        type: String,
        enum: ['english', 'luganda', 'swahili', 'other'],
        default: 'english',
      },
      contactFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'as_needed'],
        default: 'weekly',
      },
    },
    governance: {
      isOnCommittee: {
        type: Boolean,
        default: false,
      },
      committeeRole: String,
      electedDate: Date,
      termLength: Number,
      canVote: {
        type: Boolean,
        default: true,
      },
      canStandForElection: {
        type: Boolean,
        default: true,
      },
      hasSignatoryRights: {
        type: Boolean,
        default: false,
      },
    },
    notes: String,
    documents: [
      {
        documentType: String,
        documentUrl: String,
        uploadedDate: Date,
        expiryDate: Date,
      },
    ],
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
  },
  {
    timestamps: true,
  }
);

// Indexes
FarmerMembershipSchema.index({ farmerId: 1, isActive: 1 });
FarmerMembershipSchema.index({ userId: 1, isActive: 1 });
FarmerMembershipSchema.index({ organizationId: 1, membershipStatus: 1 });
FarmerMembershipSchema.index({ membershipType: 1, membershipStatus: 1 });
FarmerMembershipSchema.index({ membershipNumber: 1 }, { unique: true, sparse: true });
FarmerMembershipSchema.index({ tenantId: 1, isActive: 1 });

// Compound indexes for common queries
FarmerMembershipSchema.index({ organizationId: 1, role: 1, membershipStatus: 1 });
FarmerMembershipSchema.index({ organizationId: 1, 'eligibility.eligibleForLoans': 1 });
FarmerMembershipSchema.index({ 'progression.currentTier': 1, 'performance.overallRating': -1 });

// Pre-save: Auto-calculate attendance rate
FarmerMembershipSchema.pre('save', function (next) {
  if (this.participation.totalMeetingsCalled > 0) {
    this.participation.attendanceRate = 
      (this.participation.meetingsAttended / this.participation.totalMeetingsCalled) * 100;
  }
  next();
});

// Methods
FarmerMembershipSchema.methods.softDelete = async function (deletedBy?: mongoose.Types.ObjectId) {
  this.isActive = false;
  this.deletedAt = new Date();
  if (deletedBy) this.deletedBy = deletedBy;
  return await this.save();
};

// Method: Transfer to new organization
FarmerMembershipSchema.methods.transferToOrganization = async function (
  newOrganizationId: mongoose.Types.ObjectId,
  newRole: string = 'member'
) {
  // Archive current membership to history
  if (this.organizationId) {
    this.membershipHistory.push({
      organizationId: this.organizationId,
      organizationName: 'Organization', // Should be fetched from Organization model
      role: this.role,
      joinedDate: this.joinedDate,
      exitDate: new Date(),
      status: 'completed',
    });
  }
  
  // Update to new organization
  this.organizationId = newOrganizationId;
  this.role = newRole as 'member' | 'committee_member' | 'treasurer' | 'secretary' | 'chairperson' | 'vice_chairperson' | 'auditor';
  this.membershipType = 'cooperative_member';
  this.joinedDate = new Date();
  this.applicationDate = new Date();
  this.membershipStatus = 'pending_approval';
  
  return await this.save();
};

export default mongoose.model<IFarmerMembership>('FarmerMembership', FarmerMembershipSchema);
