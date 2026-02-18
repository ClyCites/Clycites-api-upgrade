# E-Market Database Schema
## ClyCites Agricultural Marketplace - Production Database Design

### Overview
This document defines the complete database schema for the ClyCites e-Market system, supporting millions of farmers, buyers, and transactions across continental scale.

---

## Core Entities

### 1. Enhanced Product Listings

```typescript
Collection: listings
{
  _id: ObjectId,
  
  // Seller Information
  seller: {
    sellerId: ObjectId, // ref: User or Farmer
    sellerType: 'farmer' | 'cooperative' | 'organization',
    organizationId?: ObjectId, // ref: Organization
  },
  
  // Product Details
  product: ObjectId, // ref: Product
  title: String,
  description: String,
  
  // Classification & Quality
  category: String,
  variety?: String,
  grade: 'premium' | 'grade-a' | 'grade-b' | 'standard' | 'ungraded',
  qualityScore?: Number, // AI-generated quality score (0-100)
  qualityVerified: Boolean,
  qualityVerifiedAt?: Date,
  qualityVerifiedBy?: ObjectId,
  
  // Quantity & Units
  quantity: Number,
  unit: 'kg' | 'ton' | 'bag' | 'piece' | 'liter' | 'crate' | 'bundle',
  minOrderQuantity: Number,
  maxOrderQuantity?: Number,
  
  // Pricing
  price: Number,
  pricePerUnit: Number,
  currency: String, // default: 'UGX'
  priceNegotiable: Boolean,
  suggestedPriceRange?: {
    min: Number,
    max: Number,
    source: String, // 'ai' | 'market' | 'historical'
  },
  
  // Location & Geospatial
  location: {
    type: 'Point',
    coordinates: [Number, Number], // [longitude, latitude]
  },
  address: {
    region: String,
    district: String,
    subcounty?: String,
    village?: String,
    farmName?: String,
  },
  
  // Timing & Availability
  harvestDate?: Date,
  availableFrom: Date,
  availableUntil?: Date,
  expectedHarvestDate?: Date,
  
  // Storage & Condition
  storageCondition?: 'fresh' | 'refrigerated' | 'cold_storage' | 'dried' | 'processed',
  storageLocation?: String,
  packagingType?: String,
  certifications?: [String], // 'organic', 'fair-trade', etc.
  
  // Media
  images: [String], // URLs
  videos?: [String],
  documents?: [String], // certificates, lab reports
  
  // Status & Lifecycle
  status: 'draft' | 'active' | 'paused' | 'sold' | 'expired' | 'cancelled',
  visibility: 'public' | 'private' | 'verified_only',
  
  // Engagement Metrics
  views: Number,
  searches: Number,
  inquiries: Number,
  offers: Number,
  bookmarks: Number,
  
  // Business Rules
  deliveryOptions: ['pickup' | 'delivery' | 'shipping'],
  paymentMethods: ['cash' | 'mobile_money' | 'bank_transfer' | 'escrow'],
  bulkDiscounts?: [{
    minQuantity: Number,
    discountPercentage: Number,
  }],
  
  // AI & Analytics
  aiAnalysis?: {
    cropHealthScore?: Number,
    estimatedYield?: Number,
    marketDemandScore?: Number,
    priceCompetitiveness?: Number,
    recommendedActions?: [String],
  },
  
  // Metadata
  createdBy: ObjectId,
  updatedBy?: ObjectId,
  publishedAt?: Date,
  expiresAt?: Date,
  
  timestamps: true,
}

// Geospatial Index
Index: { location: '2dsphere' }
Index: { status: 1, availableFrom: 1, expiresAt: 1 }
Index: { 'seller.sellerId': 1, status: 1 }
Index: { product: 1, status: 1, price: 1 }
Index: { 'address.region': 1, 'address.district': 1, status: 1 }
```

---

### 2. Offers & Negotiations

```typescript
Collection: offers
{
  _id: ObjectId,
  offerNumber: String, // unique, e.g., "OFF-2026-001234"
  
  // Parties
  buyer: ObjectId, // ref: User
  buyerOrganization?: ObjectId, // ref: Organization
  seller: ObjectId, // ref: User or Farmer
  listing: ObjectId, // ref: Listing
  product: ObjectId, // ref: Product
  
  // Offer Details
  offerType: 'direct' | 'counter' | 'bulk' | 'auction_bid',
  quantity: Number,
  unitPrice: Number,
  totalAmount: Number,
  currency: String,
  
  // Terms & Conditions
  terms: {
    paymentTerms: String, // '50% advance, 50% on delivery'
    deliveryTerms: String,
    qualityRequirements?: String,
    inspectionRights?: Boolean,
    returnPolicy?: String,
  },
  
  // Delivery
  deliveryOption: 'pickup' | 'seller_delivery' | 'third_party',
  deliveryLocation?: {
    type: 'Point',
    coordinates: [Number, Number],
  },
  deliveryAddress?: {
    region: String,
    district: String,
    subcounty?: String,
    village?: String,
    street?: String,
    phone: String,
    recipientName: String,
  },
  deliveryDate?: Date,
  
  // Status & Lifecycle
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired' | 'withdrawn' | 'superseded',
  expiresAt: Date,
  
  // Negotiation Chain
  parentOffer?: ObjectId, // ref: Offer (for counter-offers)
  counterOffers: [ObjectId],
  negotiationHistory: [{
    action: 'created' | 'countered' | 'accepted' | 'rejected' | 'withdrawn',
    by: ObjectId,
    price: Number,
    quantity: Number,
    notes?: String,
    timestamp: Date,
  }],
  
  // Communication
  messages: [{
    from: ObjectId,
    message: String,
    timestamp: Date,
    read: Boolean,
  }],
  
  // Financial
  platformFee: Number,
  platformFeePercentage: Number,
  escrowRequired: Boolean,
  escrowId?: ObjectId,
  
  // Response Tracking
  responseBy?: ObjectId,
  respondedAt?: Date,
  responseTime?: Number, // milliseconds
  
  // Conversion
  convertedToOrder?: ObjectId, // ref: Order
  convertedAt?: Date,
  
  // Metadata
  notes?: String,
  internalNotes?: String, // admin only
  flagged: Boolean,
  flagReason?: String,
  
  timestamps: true,
}

Index: { offerNumber: 1 }, unique
Index: { buyer: 1, status: 1, createdAt: -1 }
Index: { seller: 1, status: 1, createdAt: -1 }
Index: { listing: 1, status: 1 }
Index: { status: 1, expiresAt: 1 }
Index: { parentOffer: 1 }
```

---

### 3. Enhanced Orders & Fulfillment

```typescript
Collection: orders
{
  _id: ObjectId,
  orderNumber: String, // unique, e.g., "ORD-2026-001234"
  
  // Relationships
  offer: ObjectId, // ref: Offer
  buyer: ObjectId,
  seller: ObjectId,
  listing: ObjectId,
  product: ObjectId,
  
  // Order Details (from existing + enhancements)
  quantity: Number,
  unitPrice: Number,
  totalAmount: Number,
  deliveryFee: Number,
  platformFee: Number,
  taxes: Number,
  finalAmount: Number,
  currency: String,
  
  // Status Management
  status: 'pending' | 'confirmed' | 'processing' | 'quality_check' | 'packaged' | 
          'in_transit' | 'delivered' | 'completed' | 'cancelled' | 'disputed',
  
  // Payment Tracking
  paymentStatus: 'pending' | 'partial' | 'paid' | 'escrow' | 'refunded' | 'failed',
  paymentMethod: String,
  paymentReference?: String,
  paymentProof?: [String],
  escrowStatus?: 'held' | 'released' | 'refunded',
  
  // Fulfillment Workflow
  fulfillment: {
    preparedAt?: Date,
    preparedBy?: ObjectId,
    qualityCheckedAt?: Date,
    qualityCheckedBy?: ObjectId,
    qualityCheckPassed?: Boolean,
    qualityNotes?: String,
    
    packagedAt?: Date,
    packagedBy?: ObjectId,
    packageDetails?: String,
    weight?: Number,
    
    dispatchedAt?: Date,
    dispatchedBy?: ObjectId,
    trackingNumber?: String,
    logisticsProvider?: String,
    vehicleInfo?: String,
    driverInfo?: {
      name: String,
      phone: String,
    },
    
    inTransitAt?: Date,
    currentLocation?: {
      type: 'Point',
      coordinates: [Number, Number],
    },
    
    deliveredAt?: Date,
    deliveredTo?: String,
    deliveryProof?: [String], // images, signatures
    
    completedAt?: Date,
  },
  
  // Delivery Information (from existing)
  deliveryAddress: {
    region: String,
    district: String,
    subcounty?: String,
    village?: String,
    street?: String,
    landmark?: String,
    phone: String,
    recipientName: String,
    coordinates?: {
      type: 'Point',
      coordinates: [Number, Number],
    },
  },
  
  deliveryOption: String,
  estimatedDeliveryDate?: Date,
  actualDeliveryDate?: Date,
  
  // Quality & Inspection
  qualityDispute?: {
    raised: Boolean,
    raisedBy: 'buyer' | 'seller',
    raisedAt: Date,
    reason: String,
    evidence: [String],
    resolution?: String,
    resolvedAt?: Date,
    resolvedBy?: ObjectId,
  },
  
  // Quantity Reconciliation
  quantityReconciliation?: {
    ordered: Number,
    delivered: Number,
    accepted: Number,
    rejected?: Number,
    reason?: String,
    adjustedAmount?: Number,
  },
  
  // Cancellation
  cancellationReason?: String,
  cancelledBy?: 'buyer' | 'seller' | 'admin' | 'system',
  cancelledAt?: Date,
  cancellationFee?: Number,
  
  // Communication
  timeline: [{
    event: String,
    description: String,
    timestamp: Date,
    by?: ObjectId,
    metadata?: Object,
  }],
  
  notes?: String,
  internalNotes?: String,
  
  timestamps: true,
}

Index: { orderNumber: 1 }, unique
Index: { buyer: 1, status: 1, createdAt: -1 }
Index: { seller: 1, status: 1, createdAt: -1 }
Index: { status: 1, paymentStatus: 1 }
Index: { 'fulfillment.trackingNumber': 1 }
```

---

### 4. Market Intelligence & Pricing

```typescript
Collection: market_insights
{
  _id: ObjectId,
  
  // Scope
  product: ObjectId,
  region?: String,
  district?: String,
  market?: ObjectId,
  
  // Time Period
  date: Date,
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
  
  // Price Analytics
  priceStatistics: {
    current: Number,
    average: Number,
    median: Number,
    min: Number,
    max: Number,
    standardDeviation: Number,
    changePercentage: Number, // vs previous period
    volatilityScore: Number, // 0-100
  },
  
  // Supply & Demand
  supplyDemand: {
    totalListings: Number,
    totalQuantityAvailable: Number,
    totalOrders: Number,
    totalQuantityOrdered: Number,
    supplyDemandRatio: Number,
    demandScore: Number, // 0-100
  },
  
  // AI Predictions
  predictions: {
    nextWeekPrice: Number,
    nextMonthPrice: Number,
    confidence: Number, // 0-100
    trendDirection: 'increasing' | 'decreasing' | 'stable',
    seasonalityFactor: Number,
    modelVersion: String,
    generatedAt: Date,
  },
  
  // Market Trends
  trends: [{
    indicator: String,
    value: Number,
    change: Number,
    interpretation: String,
  }],
  
  // Competitive Analysis
  competitiveAnalysis: {
    averageQuality: String,
    priceRangeByQuality: [{
      grade: String,
      minPrice: Number,
      maxPrice: Number,
      avgPrice: Number,
    }],
    topSellers: [ObjectId],
    marketConcentration: Number, // HHI index
  },
  
  // Alerts
  alerts: [{
    type: 'price_spike' | 'price_drop' | 'high_demand' | 'low_supply',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: String,
    triggeredAt: Date,
  }],
  
  // Data Quality
  dataPoints: Number,
  confidence: Number,
  
  timestamps: true,
}

Index: { product: 1, date: -1 }
Index: { region: 1, district: 1, product: 1, date: -1 }
Index: { date: -1, period: 1 }
```

```typescript
Collection: price_alerts
{
  _id: ObjectId,
  
  user: ObjectId,
  product: ObjectId,
  region?: String,
  district?: String,
  
  // Alert Configuration
  alertType: 'price_drop' | 'price_increase' | 'target_price' | 'availability',
  
  condition: {
    operator: 'below' | 'above' | 'equals' | 'changes_by',
    threshold: Number,
    percentage?: Number,
  },
  
  // Notification Preferences
  notificationChannels: ['email' | 'sms' | 'push' | 'in_app'],
  frequency: 'instant' | 'daily' | 'weekly',
  
  // Status
  active: Boolean,
  lastTriggered?: Date,
  triggerCount: Number,
  
  timestamps: true,
}

Index: { user: 1, active: 1 }
Index: { product: 1, active: 1 }
```

---

### 5. Reputation & Trust System

```typescript
Collection: ratings
{
  _id: ObjectId,
  
  // Transaction Reference
  order: ObjectId,
  offer?: ObjectId,
  
  // Parties
  ratedUser: ObjectId, // seller or buyer being rated
  ratedBy: ObjectId, // the person giving the rating
  raterRole: 'buyer' | 'seller',
  
  // Rating Components
  overallRating: Number, // 1-5
  
  categoryRatings: {
    productQuality?: Number, // 1-5
    communication?: Number, // 1-5
    packaging?: Number, // 1-5
    delivery?: Number, // 1-5
    pricing?: Number, // 1-5
    professionalism?: Number, // 1-5
    responsiveness?: Number, // 1-5
  },
  
  // Feedback
  review?: String,
  pros?: [String],
  cons?: [String],
  
  // Media Evidence
  images?: [String],
  
  // Recommendations
  wouldRecommend: Boolean,
  wouldBuyAgain?: Boolean,
  
  // Verification
  verified: Boolean, // verified purchase
  helpful: Number, // count of helpful votes
  notHelpful: Number,
  
  // Response
  sellerResponse?: {
    message: String,
    respondedAt: Date,
  },
  
  // Moderation
  status: 'pending' | 'approved' | 'rejected' | 'flagged',
  flagReason?: String,
  moderatedBy?: ObjectId,
  moderatedAt?: Date,
  
  timestamps: true,
}

Index: { ratedUser: 1, status: 1, createdAt: -1 }
Index: { order: 1 }
Index: { ratedBy: 1 }
Index: { overallRating: 1 }
```

```typescript
Collection: reputation_scores
{
  _id: ObjectId,
  user: ObjectId,
  userType: 'farmer' | 'buyer' | 'cooperative' | 'processor',
  
  // Aggregate Scores
  overallScore: Number, // 0-100
  trustLevel: 'new' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'verified',
  
  // Rating Statistics
  ratings: {
    average: Number, // 0-5
    count: Number,
    distribution: {
      five: Number,
      four: Number,
      three: Number,
      two: Number,
      one: Number,
    },
    recent30Days: Number,
  },
  
  // Transaction History
  transactions: {
    total: Number,
    completed: Number,
    cancelled: Number,
    disputed: Number,
    completionRate: Number, // percentage
    cancellationRate: Number,
    disputeRate: Number,
    
    totalValue: Number,
    averageOrderValue: Number,
    
    asSellerCount: Number,
    asBuyerCount: Number,
  },
  
  // Behavioral Metrics
  behavior: {
    responseTime: Number, // average in minutes
    responseRate: Number, // percentage
    onTimeDeliveryRate: Number,
    qualityComplaintRate: Number,
    repeatCustomerRate: Number,
    
    accountAge: Number, // days
    lastActiveAt: Date,
    activityScore: Number, // 0-100
  },
  
  // Verification & Trust Badges
  verifications: [{
    type: 'identity' | 'address' | 'business' | 'bank' | 'phone' | 'email' | 'farm',
    verified: Boolean,
    verifiedAt?: Date,
    verifiedBy?: ObjectId,
    expiresAt?: Date,
    documents?: [String],
  }],
  
  badges: [{
    type: String, // 'top_seller', 'verified_farmer', 'quality_producer', etc.
    awardedAt: Date,
    validUntil?: Date,
  }],
  
  // Risk Assessment
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical',
    score: Number, // 0-100
    factors: [String],
    lastAssessedAt: Date,
    
    fraudFlags: Number,
    suspiciousActivity: [{
      type: String,
      detectedAt: Date,
      severity: String,
      resolved: Boolean,
    }],
  },
  
  // Performance Trends
  trends: {
    ratingTrend: 'improving' | 'stable' | 'declining',
    transactionVolumeTrend: 'growing' | 'stable' | 'declining',
    lastCalculated: Date,
  },
  
  // Ranking
  ranking: {
    regional: Number,
    national: Number,
    category?: Number,
  },
  
  lastUpdated: Date,
  timestamps: true,
}

Index: { user: 1 }, unique
Index: { overallScore: -1 }
Index: { trustLevel: 1 }
Index: { 'rankings.national': 1 }
```

---

### 6. Payment & Financial Trust

```typescript
Collection: wallets
{
  _id: ObjectId,
  user: ObjectId,
  
  // Balance
  balance: Number,
  currency: String,
  
  // Escrow
  escrowBalance: Number, // funds held in escrow
  availableBalance: Number, // balance - escrow
  
  // Limits
  dailyLimit: Number,
  monthlyLimit: Number,
  transactionLimit: Number,
  
  // Status
  status: 'active' | 'suspended' | 'frozen' | 'closed',
  kycVerified: Boolean,
  kycLevel: 'basic' | 'intermediate' | 'advanced',
  
  // Bank Linking
  linkedBankAccounts: [{
    bankName: String,
    accountNumber: String, // encrypted
    accountName: String,
    branchCode?: String,
    isPrimary: Boolean,
    verified: Boolean,
    addedAt: Date,
  }],
  
  // Mobile Money
  linkedMobileAccounts: [{
    provider: String, // MTN, Airtel, etc.
    phoneNumber: String, // encrypted
    accountName: String,
    isPrimary: Boolean,
    verified: Boolean,
    addedAt: Date,
  }],
  
  timestamps: true,
}

Index: { user: 1 }, unique
Index: { status: 1 }
```

```typescript
Collection: transactions
{
  _id: ObjectId,
  transactionNumber: String, // unique
  
  // Parties
  from: ObjectId, // user or system
  to: ObjectId, // user or system
  
  // Transaction Details
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'escrow_hold' | 
        'escrow_release' | 'fee' | 'commission' | 'transfer',
  amount: Number,
  currency: String,
  
  // References
  order?: ObjectId,
  offer?: ObjectId,
  relatedTransaction?: ObjectId,
  
  // Payment Details
  paymentMethod: 'wallet' | 'mobile_money' | 'bank_transfer' | 'card' | 'cash',
  paymentProvider?: String,
  externalReference?: String,
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'cancelled',
  
  // Escrow
  isEscrow: Boolean,
  escrowReleasedAt?: Date,
  escrowReleaseCondition?: String,
  
  // Balances (snapshot)
  balanceBefore: Number,
  balanceAfter: Number,
  
  // Fees
  platformFee: Number,
  processingFee: Number,
  totalFees: Number,
  
  // Metadata
  description: String,
  metadata?: Object,
  
  // Processing
  processedAt?: Date,
  failureReason?: String,
  retryCount: Number,
  
  timestamps: true,
}

Index: { transactionNumber: 1 }, unique
Index: { from: 1, createdAt: -1 }
Index: { to: 1, createdAt: -1 }
Index: { order: 1 }
Index: { status: 1, createdAt: -1 }
Index: { type: 1, status: 1 }
```

```typescript
Collection: escrows
{
  _id: ObjectId,
  escrowNumber: String,
  
  order: ObjectId,
  buyer: ObjectId,
  seller: ObjectId,
  
  amount: Number,
  currency: String,
  platformFee: Number,
  
  status: 'initiated' | 'funded' | 'held' | 'released' | 'refunded' | 'disputed',
  
  fundedAt?: Date,
  fundingTransaction: ObjectId,
  
  releaseConditions: [{
    condition: String,
    met: Boolean,
    metAt?: Date,
  }],
  
  releasedAt?: Date,
  releaseTransaction?: ObjectId,
  releasedTo?: ObjectId,
  
  refundedAt?: Date,
  refundTransaction?: ObjectId,
  refundReason?: String,
  
  dispute?: {
    raised: Boolean,
    raisedBy: ObjectId,
    raisedAt: Date,
    reason: String,
    resolution?: String,
    resolvedAt?: Date,
  },
  
  expiresAt: Date,
  
  timeline: [{
    event: String,
    timestamp: Date,
    by?: ObjectId,
  }],
  
  timestamps: true,
}

Index: { escrowNumber: 1 }, unique
Index: { order: 1 }
Index: { status: 1, expiresAt: 1 }
Index: { buyer: 1, status: 1 }
Index: { seller: 1, status: 1 }
```

---

### 7. Matching & Recommendation Engine

```typescript
Collection: buyer_preferences
{
  _id: ObjectId,
  user: ObjectId,
  
  // Product Preferences
  preferredProducts: [ObjectId],
  preferredCategories: [String],
  preferredQualityGrades: [String],
  
  // Price Preferences
  maxPriceRanges: [{
    product: ObjectId,
    maxPrice: Number,
  }],
  
  // Location Preferences
  preferredRegions: [String],
  preferredDistricts: [String],
  maxDistance?: Number, // km
  
  // Seller Preferences
  minSellerRating: Number,
  preferredSellers: [ObjectId],
  blockedSellers: [ObjectId],
  onlyVerifiedSellers: Boolean,
  
  // Order Preferences
  preferredDeliveryOptions: [String],
  preferredPaymentMethods: [String],
  
  // Notification Preferences
  notifyOnNewListings: Boolean,
  notifyOnPriceDrops: Boolean,
  notificationFrequency: 'instant' | 'daily' | 'weekly',
  
  timestamps: true,
}

Index: { user: 1 }, unique
```

```typescript
Collection: smart_matches
{
  _id: ObjectId,
  
  buyer: ObjectId,
  listing: ObjectId,
  seller: ObjectId,
  
  // Match Score
  matchScore: Number, // 0-100
  confidence: Number,
  
  // Score Breakdown
  scoreComponents: {
    productMatch: Number,
    priceMatch: Number,
    locationMatch: Number,
    qualityMatch: Number,
    sellerReputationMatch: Number,
    availabilityMatch: Number,
  },
  
  // Recommendations
  recommendationReason: [String],
  
  // User Actions
  viewed: Boolean,
  viewedAt?: Date,
  clicked: Boolean,
  clickedAt?: Date,
  offered: Boolean,
  offeredAt?: Date,
  dismissed: Boolean,
  
  // Feedback Loop
  useful?: Boolean, // user feedback
  
  // Metadata
  algorithmVersion: String,
  generatedAt: Date,
  expiresAt: Date,
  
  timestamps: true,
}

Index: { buyer: 1, matchScore: -1, expiresAt: 1 }
Index: { listing: 1 }
Index: { generatedAt: 1, expiresAt: 1 }
```

---

### 8. Analytics & Reporting

```typescript
Collection: user_analytics
{
  _id: ObjectId,
  user: ObjectId,
  date: Date,
  
  // Engagement
  sessions: Number,
  pageViews: Number,
  timeSpent: Number, // minutes
  
  // Marketplace Activity
  listingsViewed: Number,
  searchesPerformed: Number,
  offersCreated: Number,
  offersReceived: Number,
  ordersPlaced: Number,
  ordersReceived: Number,
  
  // Financial
  totalSales: Number,
  totalPurchases: Number,
  averageOrderValue: Number,
  
  // Product Performance (for sellers)
  topPerformingListings?: [{
    listing: ObjectId,
    views: Number,
    offers: Number,
  }],
  
  timestamps: true,
}

Index: { user: 1, date: -1 }
```

---

## Relationships Summary

```
User/Farmer 
  ├─> Listings (1:N)
  ├─> Offers (as buyer/seller) (1:N)
  ├─> Orders (as buyer/seller) (1:N)
  ├─> Ratings (given/received) (1:N)
  ├─> Reputation Score (1:1)
  ├─> Wallet (1:1)
  ├─> Transactions (1:N)
  └─> Buyer Preferences (1:1)

Listing
  ├─> Product (N:1)
  ├─> Seller (N:1)
  ├─> Offers (1:N)
  └─> Orders (1:N)

Offer
  ├─> Listing (N:1)
  ├─> Buyer (N:1)
  ├─> Seller (N:1)
  ├─> Parent Offer (N:1, optional)
  ├─> Counter Offers (1:N)
  └─> Order (1:1, optional)

Order
  ├─> Offer (1:1)
  ├─> Listing (N:1)
  ├─> Buyer (N:1)
  ├─> Seller (N:1)
  ├─> Escrow (1:1, optional)
  ├─> Transactions (1:N)
  └─> Ratings (1:2) - buyer rates seller, seller rates buyer

Escrow
  ├─> Order (1:1)
  ├─> Buyer (N:1)
  ├─> Seller (N:1)
  └─> Transactions (1:N)
```

---

## Scaling Considerations

### Sharding Strategy
- **Listings**: Shard by region/state for geo-distributed queries
- **Orders**: Shard by date range (time-based)
- **Transactions**: Shard by user ID
- **Analytics**: Separate time-series database or partition by month

### Caching Strategy
- Active listings: Redis cache with 15-minute TTL
- User reputation scores: Redis cache with 1-hour TTL
- Market insights: Redis cache with 6-hour TTL
- Product catalog: Redis cache with 24-hour TTL

### Archive Strategy
- Orders older than 2 years → archive collection
- Completed transactions older than 1 year → archive
- Expired listings → soft delete after 90 days

---

## Security & Privacy

### Data Encryption
- Payment details: Field-level encryption
- Bank account numbers: AES-256 encryption
- Phone numbers: Hashed + encrypted

### PII Handling
- Comply with data protection regulations
- User consent for data usage
- Right to be forgotten support
- Data export capabilities

### Audit Trail
- All financial transactions logged
- All status changes tracked
- User actions audited for compliance

---

This schema supports millions of users with proper indexing, sharding, and caching strategies while maintaining data integrity and security.
