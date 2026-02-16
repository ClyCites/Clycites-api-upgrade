# Pest & Disease Detection Module - Installation & Setup Guide

## 📋 Prerequisites

Before installing the Pest & Disease Detection Module, ensure you have:

- ✅ Node.js >= 16.x
- ✅ MongoDB >= 5.x (with replica set for transactions)
- ✅ Existing ClyCites API installation
- ✅ At least 2GB free disk space (for image storage)
- ✅ (Optional) AWS S3 or Azure Blob account for cloud storage
- ✅ (Optional) AI detection provider API key

---

## 🚀 Installation Steps

### Step 1: Verify Module Files

The module should already be integrated. Verify all files exist:

```bash
# Check module structure
ls -la src/modules/pest-disease/

# Expected files:
# - pestDisease.types.ts
# - models/ (pestDiseaseReport.model.ts, regionalOutbreak.model.ts, treatmentKnowledgeBase.model.ts)
# - services/ (pestDisease.service.ts, aiDetection.service.ts, imageStorage.service.ts, outbreakAnalytics.service.ts)
# - pestDisease.controller.ts
# - pestDisease.validator.ts
# - pestDisease.routes.ts
# - index.ts
```

### Step 2: Install Dependencies

All required dependencies should already be in `package.json`. Install them:

```bash
npm install
```

**Required packages:**
- `mongoose` (^8.x) - Database ORM
- `express` (^4.x) - Web framework
- `multer` (^1.x) - File upload middleware
- `sharp` (^0.33.x) - Image processing
- `express-validator` (^7.x) - Request validation
- `form-data` (^4.x) - Multipart form data
- `axios` (^1.x) - HTTP client

### Step 3: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.pest-disease.example .env.pest-disease
```

Add these variables to your main `.env` file:

```bash
# Minimum configuration for local development
AI_DETECTION_PROVIDER=mock
IMAGE_STORAGE_PROVIDER=local
IMAGE_STORAGE_PATH=./uploads/pest-disease
IMAGE_STORAGE_BASE_URL=http://localhost:3000
IMAGE_MAX_SIZE=10485760
AI_CONFIDENCE_THRESHOLD=60
```

### Step 4: Create Upload Directory

```bash
mkdir -p uploads/pest-disease
chmod 755 uploads/pest-disease
```

For production, ensure the directory is writable by the application user:

```bash
chown -R www-data:www-data uploads/pest-disease
```

### Step 5: Verify Route Integration

Check that routes are mounted in `src/routes.ts`:

```typescript
import pestDiseaseRoutes from './modules/pest-disease/pestDisease.routes';

// Routes should include:
router.use(`${API_VERSION}/pest-disease`, pestDiseaseRoutes);
```

### Step 6: Build the Application

```bash
npm run build
```

Verify no TypeScript errors:

```bash
# Should complete without errors
tsc --noEmit
```

### Step 7: Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

Verify the server starts successfully and check logs for:
```
✓ Database connected
✓ Routes mounted at /api/v1/pest-disease
✓ Server listening on port 3000
```

---

## 🧪 Testing the Installation

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

### Test 2: Authentication

Get a valid JWT token (login as a test farmer):

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "password123"
  }'
```

### Test 3: Submit Test Detection

```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/detect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/test-crop-image.jpg" \
  -F 'farmerId=YOUR_FARMER_ID' \
  -F 'farmId=YOUR_FARM_ID' \
  -F 'fieldContext={"cropType":"Maize","growthStage":"vegetative","longitude":34.5,"latitude":-1.2}' \
  -F 'consent={"agreedToAIAnalysis":true,"agreedToDataSharing":true,"consentVersion":"v1.0"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "reportId": "...",
    "reportCode": "PDR-000001",
    "status": "processing"
  }
}
```

### Test 4: Get Report Details

```bash
curl -X GET http://localhost:3000/api/v1/pest-disease/reports/REPORT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: Complete report with AI detection results (after processing).

---

## 📊 Database Setup

### Automatic Index Creation

MongoDB indexes are created automatically on first document insertion. However, you can create them manually:

```javascript
// Connect to MongoDB
use clycites;

// PestDiseaseReport indexes
db.pestdiseasereports.createIndex({ reportCode: 1 }, { unique: true });
db.pestdiseasereports.createIndex({ tenantId: 1, farmerId: 1, createdAt: -1 });
db.pestdiseasereports.createIndex({ 'fieldContext.location': '2dsphere' });
db.pestdiseasereports.createIndex({ 
  'aiDetection.primaryResult.detectedEntity': 'text',
  farmerNotes: 'text'
});

// RegionalOutbreak indexes
db.regionaloutbreaks.createIndex({ outbreakCode: 1 }, { unique: true });
db.regionaloutbreaks.createIndex({ 'region.geometry': '2dsphere' });
db.regionaloutbreaks.createIndex({ 'region.center': '2dsphere' });
db.regionaloutbreaks.createIndex({ tenantId: 1, outbreakStatus: 1, outbreakSeverity: -1 });

// TreatmentKnowledgeBase indexes
db.treatmentknowledgebases.createIndex({ pestOrDiseaseName: 1 });
db.treatmentknowledgebases.createIndex({ tenantId: 1, isPublished: 1 });
db.treatmentknowledgebases.createIndex({
  pestOrDiseaseName: 'text',
  'symptoms.description': 'text',
  category: 'text'
});
```

### Verify Indexes

```javascript
db.pestdiseasereports.getIndexes();
db.regionaloutbreaks.getIndexes();
db.treatmentknowledgebases.getIndexes();
```

---

## 🌱 Seed Data (Optional)

### Seed Treatment Knowledge Base

Create a seed script `scripts/seedPestDiseaseKnowledge.ts`:

```typescript
import mongoose from 'mongoose';
import { TreatmentKnowledgeBase } from '../src/modules/pest-disease';

const seedData = [
  {
    tenantId: new mongoose.Types.ObjectId('YOUR_TENANT_ID'),
    pestOrDiseaseName: 'Fall Armyworm',
    scientificName: 'Spodoptera frugiperda',
    detectionType: 'pest',
    category: 'Insect - Lepidoptera',
    affectedCrops: ['Maize', 'Sorghum', 'Rice', 'Wheat'],
    symptoms: {
      description: 'Larvae feed on leaves creating irregular holes and whorl damage. Frass is visible on leaves.',
      visual: ['Whorl damage', 'Irregular holes in leaves', 'Frass on leaves', 'Window-pane feeding']
    },
    favorableConditions: {
      temperatureRange: { min: 20, max: 35, unit: 'celsius' },
      humidityRange: { min: 60, max: 90 },
      rainfallPattern: 'Moderate to high rainfall'
    },
    treatment: {
      chemical: [{
        activIngredient: 'Cypermethrin',
        dosage: '100ml per 20L water',
        applicationMethod: 'Foliar spray',
        frequency: 'Every 7-10 days',
        safetyPrecautions: ['Wear protective gear', 'Do not spray during flowering', 'Observe PHI of 7 days']
      }],
      organic: [{
        method: 'Neem extract',
        materials: ['Neem leaves (500g)', 'Water (10L)', 'Soap (50ml)'],
        procedure: 'Crush neem leaves, soak in water for 24 hours, strain, add soap, spray early morning',
        applicationFrequency: 'Every 5 days'
      }],
      biological: [{
        agent: 'Trichogramma wasps',
        application: 'Release 50,000 wasps per acre when eggs are detected',
        timing: 'Early morning or evening'
      }]
    },
    preventiveMeasures: [
      {
        practice: 'Early planting',
        description: 'Plant at onset of rains to avoid peak infestation periods',
        effectiveness: 'high'
      },
      {
        practice: 'Crop rotation',
        description: 'Rotate with non-host crops like legumes',
        effectiveness: 'medium'
      }
    ],
    sources: [
      { title: 'FAO Fall Armyworm Guide', url: 'https://www.fao.org/fall-armyworm', year: 2023 }
    ],
    isPublished: true,
    createdBy: new mongoose.Types.ObjectId('YOUR_ADMIN_ID')
  },
  
  {
    tenantId: new mongoose.Types.ObjectId('YOUR_TENANT_ID'),
    pestOrDiseaseName: 'Late Blight',
    scientificName: 'Phytophthora infestans',
    detectionType: 'disease',
    category: 'Fungal Disease',
    affectedCrops: ['Tomato', 'Potato'],
    symptoms: {
      description: 'Water-soaked lesions on leaves and stems, white mold on undersides, rapid plant collapse',
      visual: ['Water-soaked lesions', 'White fungal growth', 'Brown-black spots', 'Plant wilting']
    },
    favorableConditions: {
      temperatureRange: { min: 10, max: 25, unit: 'celsius' },
      humidityRange: { min: 90, max: 100 },
      rainfallPattern: 'High rainfall, cloudy weather'
    },
    treatment: {
      chemical: [{
        activIngredient: 'Metalaxyl + Mancozeb',
        dosage: '50g per 20L water',
        applicationMethod: 'Foliar spray',
        frequency: 'Every 7 days during wet periods'
      }],
      organic: [{
        method: 'Bordeaux mixture',
        materials: ['Copper sulfate (1kg)', 'Lime (1kg)', 'Water (100L)'],
        procedure: 'Mix copper sulfate in 50L water, lime in 50L water separately, combine slowly'
      }]
    },
    preventiveMeasures: [
      {
        practice: 'Use resistant varieties',
        description: 'Plant certified disease-resistant tomato/potato varieties',
        effectiveness: 'very high'
      },
      {
        practice: 'Proper spacing',
        description: 'Ensure good air circulation between plants',
        effectiveness: 'high'
      }
    ],
    isPublished: true,
    createdBy: new mongoose.Types.ObjectId('YOUR_ADMIN_ID')
  }
];

async function seed() {
  await mongoose.connect(process.env.DATABASE_URL!);
  
  for (const data of seedData) {
    await TreatmentKnowledgeBase.findOneAndUpdate(
      { pestOrDiseaseName: data.pestOrDiseaseName },
      data,
      { upsert: true, new: true }
    );
  }
  
  console.log('✓ Seeded', seedData.length, 'treatment entries');
  process.exit(0);
}

seed();
```

Run the seed script:

```bash
npx ts-node scripts/seedPestDiseaseKnowledge.ts
```

---

## 🔌 AI Provider Setup

### Option 1: Mock Provider (Default)

Already configured. No setup required.

### Option 2: PlantVillage API

1. Sign up at https://plantvillage.org/developers
2. Get API key
3. Configure:

```bash
AI_DETECTION_PROVIDER=plantvillage
AI_DETECTION_API_ENDPOINT=https://api.plantvillage.org/v1/detect
AI_DETECTION_API_KEY=your-api-key-here
```

### Option 3: Custom AI API

For your own trained model:

```bash
AI_DETECTION_PROVIDER=custom
AI_DETECTION_API_ENDPOINT=https://your-ai-api.com/v1/detect
AI_DETECTION_API_KEY=your-api-key-here
```

**API Contract:**

Request:
```json
POST /v1/detect
Content-Type: application/json

{
  "image": "base64-encoded-image",
  "metadata": {
    "cropType": "Maize",
    "location": { "lat": -1.2, "lon": 34.5 }
  }
}
```

Response:
```json
{
  "detections": [
    {
      "name": "Fall Armyworm",
      "scientificName": "Spodoptera frugiperda",
      "confidence": 0.92,
      "severity": "high",
      "type": "pest"
    }
  ],
  "modelVersion": "v1.0.0"
}
```

---

## ☁️ Cloud Storage Setup

### AWS S3

1. Create S3 bucket:
```bash
aws s3 mb s3://clycites-pest-disease --region us-east-1
```

2. Set bucket policy (allow public read for image URLs):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::clycites-pest-disease/*"
  }]
}
```

3. Configure environment:
```bash
IMAGE_STORAGE_PROVIDER=s3
IMAGE_STORAGE_BUCKET=clycites-pest-disease
IMAGE_STORAGE_REGION=us-east-1
IMAGE_STORAGE_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
IMAGE_STORAGE_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Azure Blob Storage

1. Create storage account and container via Azure Portal

2. Configure:
```bash
IMAGE_STORAGE_PROVIDER=azure
IMAGE_STORAGE_ACCOUNT_NAME=clycitesstorage
IMAGE_STORAGE_ACCOUNT_KEY=your-azure-key
IMAGE_STORAGE_CONTAINER=pest-disease-images
```

---

## 🔒 Security Configuration

### Enable Virus Scanning (ClamAV)

1. Install ClamAV:
```bash
# Ubuntu/Debian
sudo apt-get install clamav clamav-daemon

# Start daemon
sudo systemctl start clamav-daemon
```

2. Enable in environment:
```bash
IMAGE_VIRUS_SCAN=true
```

### Configure Rate Limiting

```bash
RATE_LIMIT_DETECTION_PER_HOUR=20
RATE_LIMIT_ANALYTICS_PER_HOUR=100
```

### Enable Audit Logging

```bash
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_LEVEL=info
```

---

## 📈 Production Deployment

### 1. Environment Setup

```bash
# Production .env
NODE_ENV=production
AI_DETECTION_PROVIDER=custom
IMAGE_STORAGE_PROVIDER=s3
ENABLE_ASYNC_AI_PROCESSING=true
ENABLE_BACKGROUND_OUTBREAK_DETECTION=true
REQUIRE_FARMER_CONSENT=true
ENABLE_AUDIT_LOGGING=true
CACHE_TREATMENT_KNOWLEDGE_TTL=3600
```

### 2. Process Management (PM2)

```bash
npm install -g pm2

# Start application
pm2 start npm --name "clycites-api" -- start

# Enable startup script
pm2 startup
pm2 save
```

### 3. Nginx Reverse Proxy

```nginx
server {
  listen 80;
  server_name api.clycites.com;
  
  client_max_body_size 10M;  # Allow image uploads
  
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
  
  location /uploads {
    alias /var/www/clycites/uploads;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
```

### 4. Monitoring

Install monitoring tools:

```bash
# Prometheus metrics (optional)
ENABLE_PROMETHEUS_METRICS=true
METRICS_PORT=9090

# Health check endpoint
ENABLE_HEALTH_CHECK_ENDPOINT=true
```

---

## 🧪 Verification Checklist

After installation, verify:

- [ ] Server starts without errors
- [ ] Routes accessible at `/api/v1/pest-disease`
- [ ] Database indexes created
- [ ] Image upload directory writable
- [ ] Mock AI detection returns results
- [ ] Treatment search works
- [ ] Authentication required for all endpoints
- [ ] Pagination works on list endpoints
- [ ] Outbreak detection runs (check logs)

---

## 🐛 Common Issues

### Issue: Module not found errors

**Solution:**
```bash
npm install
npm run build
```

### Issue: Database connection failed

**Solution:**
Check `DATABASE_URL` in `.env` and ensure MongoDB is running:
```bash
mongosh $DATABASE_URL
```

### Issue: Image upload fails with "ENOENT"

**Solution:**
Create upload directory:
```bash
mkdir -p uploads/pest-disease
chmod 755 uploads/pest-disease
```

### Issue: AI detection timeout

**Solution:**
Increase timeout or switch to mock:
```bash
AI_REQUEST_TIMEOUT=60000
# OR
AI_DETECTION_PROVIDER=mock
```

---

## 📞 Support

For installation issues:
- **Email**: support@clycites.com
- **GitHub Issues**: https://github.com/clycites/api/issues
- **Documentation**: [PEST_DISEASE_MODULE_DOCUMENTATION.md](./PEST_DISEASE_MODULE_DOCUMENTATION.md)

---

## 🎉 Next Steps

After successful installation:

1. **Seed knowledge base** with common pests/diseases in your region
2. **Configure AI provider** (switch from mock to production)
3. **Set up cloud storage** (S3/Azure) for production
4. **Train your team** using [Quick Reference Guide](./PEST_DISEASE_QUICK_REFERENCE.md)
5. **Integrate mobile apps** for farmer image submissions
6. **Monitor analytics** via dashboard endpoints

---

**Installation Guide Version**: 1.0.0  
**Last Updated**: February 2026
