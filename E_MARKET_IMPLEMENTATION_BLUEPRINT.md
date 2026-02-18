# E-Market Implementation Blueprint
## Step-by-Step Integration Guide

This document provides concrete steps to integrate the new E-Market modules into your existing ClyCites application.

---

## Phase 1: Database & Models (1-2 days)

### Step 1.1: Verify Model Imports

Ensure all models are properly exported and importable:

```typescript
// src/modules/offers/index.ts
export { default as Offer } from './offer.model';
export { offerService } from './offer.service';
export { offerController } from './offer.controller';
export { default as offerRoutes } from './offer.routes';

// src/modules/reputation/index.ts
export { default as Rating } from './rating.model';
export { default as ReputationScore } from './reputation.model';
export { reputationService } from './reputation.service';
export { reputationController } from './reputation.controller';
export { default as reputationRoutes } from './reputation.routes';

// src/modules/market-intelligence/index.ts
export { default as MarketInsight } from './marketInsight.model';
export { default as PriceAlert } from './priceAlert.model';
export { marketIntelligenceService } from './marketIntelligence.service';
// export controllers and routes when created

// src/modules/payments/index.ts
export { default as Wallet } from './wallet.model';
export { default as Transaction } from './transaction.model';
export { default as Escrow } from './escrow.model';
export { paymentService } from './payment.service';
```

### Step 1.2: Create Database Index Script

**File:** `src/scripts/createIndexes.ts`

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from '../modules/offers/offer.model';
import Rating from '../modules/reputation/rating.model';
import ReputationScore from '../modules/reputation/reputation.model';
import MarketInsight from '../modules/market-intelligence/marketInsight.model';
import PriceAlert from '../modules/market-intelligence/priceAlert.model';
import Wallet from '../modules/payments/wallet.model';
import Transaction from '../modules/payments/transaction.model';
import Escrow from '../modules/payments/escrow.model';

dotenv.config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clycites');
    console.log('Connected to MongoDB');

    console.log('Creating indexes for Offers...');
    await Offer.createIndexes();
    
    console.log('Creating indexes for Ratings...');
    await Rating.createIndexes();
    
    console.log('Creating indexes for Reputation Scores...');
    await ReputationScore.createIndexes();
    
    console.log('Creating indexes for Market Insights...');
    await MarketInsight.createIndexes();
    
    console.log('Creating indexes for Price Alerts...');
    await PriceAlert.createIndexes();
    
    console.log('Creating indexes for Wallets...');
    await Wallet.createIndexes();
    
    console.log('Creating indexes for Transactions...');
    await Transaction.createIndexes();
    
    console.log('Creating indexes for Escrows...');
    await Escrow.createIndexes();

    console.log('✅ All indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
```

**Add to package.json:**
```json
{
  "scripts": {
    "create-indexes": "ts-node src/scripts/createIndexes.ts"
  }
}
```

**Run:**
```bash
npm run create-indexes
```

---

## Phase 2: Route Integration (1 day)

### Step 2.1: Update Main Routes File

**File:** `src/routes.ts`

```typescript
import { Express } from 'express';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import farmerRoutes from './modules/farmers/farmer.routes';
import productRoutes from './modules/products/product.routes';
import priceRoutes from './modules/prices/price.routes';
import marketRoutes from './modules/markets/market.routes';
import orderRoutes from './modules/orders/order.routes';
// ... existing imports ...

// New E-Market Routes
import offerRoutes from './modules/offers/offer.routes';
import reputationRoutes from './modules/reputation/reputation.routes';
// import marketIntelligenceRoutes from './modules/market-intelligence/marketIntelligence.routes';
// import paymentRoutes from './modules/payments/payment.routes'; // When controller is created

import { errorHandler } from './common/middleware/errorHandler';
import { AppError } from './common/errors/AppError';

export function registerRoutes(app: Express) {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Existing routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/farmers', farmerRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/prices', priceRoutes);
  app.use('/api/markets', marketRoutes);
  app.use('/api/orders', orderRoutes);
  // ... other existing routes ...

  // ===== NEW E-MARKET ROUTES =====
  app.use('/api/offers', offerRoutes);
  app.use('/api/reputation', reputationRoutes);
  // app.use('/api/market-intelligence', marketIntelligenceRoutes); // Uncomment when controllers created
  // app.use('/api/payments', paymentRoutes); // Uncomment when controllers created

  // 404 handler
  app.use('*', (req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
  });

  // Error handler
  app.use(errorHandler);
}
```

### Step 2.2: Update App Initialization

**File:** `src/app.ts`

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { registerRoutes } from './routes';
import { connectDatabase } from './common/config/database';
import { logger } from './common/utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Register all routes
registerRoutes(app);

// Database connection
connectDatabase();

export default app;
```

---

## Phase 3: Background Jobs (1-2 days)

### Step 3.1: Create Job Scheduler

**File:** `src/services/jobs/scheduler.ts`

```typescript
import cron from 'node-cron';
import { logger } from '../../common/utils/logger';
import { marketIntelligenceService } from '../../modules/market-intelligence/marketIntelligence.service';
import { reputationService } from '../../modules/reputation/reputation.service';
import Offer from '../../modules/offers/offer.model';
import Product from '../../modules/products/product.model';
import Order from '../../modules/orders/order.model';

export class JobScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all background jobs
   */
  startAll() {
    this.startMarketInsightsJob();
    this.startReputationUpdateJob();
    this.startExpiredOffersJob();
    this.startEscrowExpiryJob();

    logger.info('All background jobs started');
  }

  /**
   * Generate market insights daily at 2 AM
   */
  private startMarketInsightsJob() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting market insights generation job');
        
        const products = await Product.find({ isActive: true });
        let processed = 0;

        for (const product of products) {
          try {
            await marketIntelligenceService.generateMarketInsight(
              product._id.toString(),
              undefined, // all regions
              undefined,
              'daily'
            );
            processed++;
          } catch (error) {
            logger.error(`Error generating insight for product ${product._id}:`, error);
          }
        }

        logger.info(`Market insights job completed. Processed ${processed}/${products.length} products`);
      } catch (error) {
        logger.error('Market insights job failed:', error);
      }
    });

    this.jobs.set('market-insights', job);
  }

  /**
   * Update reputation scores for active users hourly
   */
  private startReputationUpdateJob() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting reputation update job');

        // Get users with recent activity (orders in last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const recentOrders = await Order.find({
          createdAt: { $gte: yesterday },
        }).distinct('farmer');

        let updated = 0;
        for (const userId of recentOrders) {
          try {
            await reputationService.updateReputationScore(userId.toString());
            updated++;
          } catch (error) {
            logger.error(`Error updating reputation for user ${userId}:`, error);
          }
        }

        logger.info(`Reputation update job completed. Updated ${updated} users`);
      } catch (error) {
        logger.error('Reputation update job failed:', error);
      }
    });

    this.jobs.set('reputation-update', job);
  }

  /**
   * Expire old offers hourly
   */
  private startExpiredOffersJob() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting expired offers cleanup job');

        const result = await Offer.updateMany(
          {
            status: 'pending',
            expiresAt: { $lt: new Date() },
          },
          {
            status: 'expired',
          }
        );

        logger.info(`Expired ${result.modifiedCount} offers`);
      } catch (error) {
        logger.error('Expired offers job failed:', error);
      }
    });

    this.jobs.set('expired-offers', job);
  }

  /**
   * Check escrow expiry daily
   */
  private startEscrowExpiryJob() {
    // TODO: Implement escrow expiry logic
    // Check and refund escrows that have expired without release
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });
    this.jobs.clear();
  }
}

export const jobScheduler = new JobScheduler();
```

### Step 3.2: Initialize Jobs in Server

**File:** `src/server.ts`

```typescript
import app from './app';
import { logger } from './common/utils/logger';
import { jobScheduler } from './services/jobs/scheduler';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start background jobs in production
  if (process.env.NODE_ENV === 'production') {
    jobScheduler.startAll();
    logger.info('Background jobs started');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  jobScheduler.stopAll();
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  
  jobScheduler.stopAll();
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
```

---

## Phase 4: Event System (1 day)

### Step 4.1: Create Event Emitter

**File:** `src/services/events/emitter.ts`

```typescript
import { EventEmitter } from 'events';
import { logger } from '../../common/utils/logger';

class MarketplaceEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase if needed
  }

  emitSafe(event: string, data: any) {
    try {
      this.emit(event, data);
      logger.debug(`Event emitted: ${event}`, { data });
    } catch (error) {
      logger.error(`Error emitting event ${event}:`, error);
    }
  }
}

export const marketplaceEvents = new MarketplaceEventEmitter();

// Event names
export const EVENTS = {
  // Offers
  OFFER_CREATED: 'offer:created',
  OFFER_COUNTERED: 'offer:countered',
  OFFER_ACCEPTED: 'offer:accepted',
  OFFER_REJECTED: 'offer:rejected',
  OFFER_WITHDRAWN: 'offer:withdrawn',
  
  // Orders
  ORDER_CREATED: 'order:created',
  ORDER_CONFIRMED: 'order:confirmed',
  ORDER_DISPATCHED: 'order:dispatched',
  ORDER_DELIVERED: 'order:delivered',
  ORDER_COMPLETED: 'order:completed',
  ORDER_CANCELLED: 'order:cancelled',
  
  // Ratings
  RATING_CREATED: 'rating:created',
  REPUTATION_UPDATED: 'reputation:updated',
  
  // Payments
  ESCROW_INITIATED: 'escrow:initiated',
  ESCROW_RELEASED: 'escrow:released',
  ESCROW_REFUNDED: 'escrow:refunded',
  PAYMENT_COMPLETED: 'payment:completed',
  
  // Alerts
  PRICE_ALERT_TRIGGERED: 'price-alert:triggered',
  MARKET_ALERT: 'market:alert',
};
```

### Step 4.2: Update Services to Emit Events

**File:** `src/modules/offers/offer.service.ts` (add at end of methods)

```typescript
import { marketplaceEvents, EVENTS } from '../../services/events/emitter';

// In createOffer method, after save:
marketplaceEvents.emitSafe(EVENTS.OFFER_CREATED, { offer });

// In acceptOffer method, after transaction:
marketplaceEvents.emitSafe(EVENTS.OFFER_ACCEPTED, { offer, order: order[0] });
marketplaceEvents.emitSafe(EVENTS.ORDER_CREATED, { order: order[0] });
```

### Step 4.3: Create Event Handlers

**File:** `src/services/events/handlers.ts`

```typescript
import { marketplaceEvents, EVENTS } from './emitter';
import { logger } from '../../common/utils/logger';
// import { notificationService } from '../notifications/notification.service'; // When available

class EventHandlers {
  register() {
    // Offer events
    marketplaceEvents.on(EVENTS.OFFER_CREATED, this.handleOfferCreated.bind(this));
    marketplaceEvents.on(EVENTS.OFFER_ACCEPTED, this.handleOfferAccepted.bind(this));
    
    // Rating events
    marketplaceEvents.on(EVENTS.RATING_CREATED, this.handleRatingCreated.bind(this));
    
    logger.info('Event handlers registered');
  }

  private async handleOfferCreated(data: any) {
    const { offer } = data;
    logger.info(`Offer created: ${offer.offerNumber}`);
    
    // TODO: Send notification to seller
    // await notificationService.sendOfferNotification(offer.seller, offer);
  }

  private async handleOfferAccepted(data: any) {
    const { offer, order } = data;
    logger.info(`Offer accepted: ${offer.offerNumber}, Order created: ${order.orderNumber}`);
    
    // TODO: Send notifications to both parties
    // await notificationService.sendOfferAcceptedNotification(offer, order);
  }

  private async handleRatingCreated(data: any) {
    const { rating } = data;
    logger.info(`Rating created for user: ${rating.ratedUser}`);
    
    // Trigger reputation recalculation
    // This is already done in the rating service, but you could add webhooks here
  }
}

export const eventHandlers = new EventHandlers();
```

**Initialize in server.ts:**
```typescript
import { eventHandlers } from './services/events/handlers';

// After app initialization
eventHandlers.register();
```

---

## Phase 5: Testing (2-3 days)

### Step 5.1: Create Test Data Script

**File:** `src/scripts/seedTestData.ts`

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../modules/products/product.model';
import User from '../modules/users/user.model';
import Listing from '../modules/marketplace/listing.model';

dotenv.config();

async function seedTestData() {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Create test users
  const buyer = await User.create({
    name: 'John Buyer',
    email: 'buyer@test.com',
    phone: '+256700000001',
    role: 'buyer',
    // ... other fields
  });

  const seller = await User.create({
    name: 'Jane Seller',
    email: 'seller@test.com',
    phone: '+256700000002',
    role: 'farmer',
    // ... other fields
  });

  // Create test product
  const product = await Product.create({
    name: 'Maize',
    category: 'Cereals',
    variety: 'White Maize',
    unit: 'kg',
  });

  // Create test listing
  const listing = await Listing.create({
    farmer: seller._id,
    product: product._id,
    title: 'Premium White Maize',
    quantity: 1000,
    price: 3500000,
    pricePerUnit: 3500,
    status: 'active',
    location: {
      type: 'Point',
      coordinates: [32.5825, 0.3476], // Kampala
    },
    address: {
      region: 'Central',
      district: 'Kampala',
    },
  });

  console.log('✅ Test data seeded successfully');
  process.exit(0);
}

seedTestData();
```

### Step 5.2: Integration Test Example

**File:** `tests/integration/offers.test.ts`

```typescript
import request from 'supertest';
import app from '../../src/app';
import mongoose from 'mongoose';
import Offer from '../../src/modules/offers/offer.model';

describe('Offers API', () => {
  let buyerToken: string;
  let sellerToken: string;
  let listingId: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_MONGODB_URI!);
    // Setup: Login as buyer and seller, get tokens
    // Create test listing
  });

  afterAll(async () => {
    await Offer.deleteMany({});
    await mongoose.disconnect();
  });

  describe('POST /api/offers', () => {
    it('should create a new offer', async () => {
      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listing: listingId,
          quantity: 500,
          unitPrice: 3500,
          deliveryOption: 'pickup',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offer).toHaveProperty('offerNumber');
      expect(response.body.data.offer.status).toBe('pending');
    });
  });

  describe('POST /api/offers/:offerId/accept', () => {
    it('should accept offer and create order', async () => {
      // ... test implementation
    });
  });
});
```

---

## Phase 6: Deployment Checklist

### Production Readiness

- [ ] All database indexes created
- [ ] Environment variables configured
- [ ] Background jobs tested
- [ ] Error handling verified
- [ ] Rate limiting configured
- [ ] Logging properly set up
- [ ] Monitoring dashboards created
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] API documentation published

### Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://production-cluster.mongodb.net/clycites
MONGODB_OPTIONS=retryWrites=true&w=majority

# Redis
REDIS_URL=redis://cache.example.com:6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=your-super-secret-production-key
JWT_EXPIRY=7d

# Background Jobs
ENABLE_BACKGROUND_JOBS=true
MARKET_INSIGHTS_CRON=0 2 * * *
REPUTATION_UPDATE_CRON=0 * * * *

# Feature Flags
ENABLE_ESCROW=true
ENABLE_AI_PREDICTIONS=false
ESCROW_THRESHOLD=1000000

# Notifications (when integrated)
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

---

## Monitoring & Maintenance

### Health Checks

```typescript
// Add to routes.ts
app.get('/health/detailed', authenticate, authorize(['admin']), async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabaseConnection(),
    redis: await checkRedisConnection(),
    backgroundJobs: jobScheduler.getJobStatus(),
  };
  
  res.json(health);
});
```

### Metrics Endpoints

```typescript
import { register } from 'prom-client';

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

---

## Troubleshooting

### Common Issues

**Issue:** Offers not creating
- Check listing exists and is active
- Verify buyer has authentication token
- Check validation errors in response

**Issue:** Reputation scores not updating
- Run manual update: `reputationService.updateReputationScore(userId)`
- Check if background job is running
- Verify ratings exist for user

**Issue:** Market insights empty
- Ensure listings and orders exist
- Run manual generation: `marketIntelligenceService.generateMarketInsight(...)`
- Check data confidence levels

---

## Next Steps

1. **Complete Market Intelligence Controllers** - Create REST endpoints for market insights
2. **Add Payment Gateway Integration** - Integrate Flutterwave/Paystack
3. **Enhance Listings with Geo-Fields** - Add location coordinates to existing listings
4. **Implement Notification Service** - Email/SMS/Push notifications
5. **Create Admin Dashboard** - Monitor offers, disputes, fraud
6. **Mobile App Integration** - Build React Native app using APIs

---

This blueprint provides a clear path from the implemented modules to a fully functional production e-market system. Each phase builds on the previous, allowing for incremental deployment and testing.
