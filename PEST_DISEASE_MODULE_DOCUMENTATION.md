# Pest & Disease Detection Module - Documentation

## Overview

The **Pest & Disease Detection Module** is an enterprise-grade subsystem for the ClyCites API that provides AI-assisted identification of crop pests and diseases, regional outbreak intelligence, and actionable treatment recommendations.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [AI Detection System](#ai-detection-system)
- [Image Storage](#image-storage)
- [Outbreak Analytics](#outbreak-analytics)
- [Security & Compliance](#security--compliance)
- [Integration Guide](#integration-guide)
- [Configuration](#configuration)
- [Examples](#examples)

---

## Features

### Core Capabilities

1. **AI-Assisted Image Detection**
   - Upload crop images from mobile cameras, gallery, or field devices
   - Automatic classification of pests, diseases, nutrient deficiencies, and environmental stress
   - Confidence scoring and severity assessment
   - Bounding box annotations for affected areas
   - Support for multiple AI providers (PlantVillage, custom APIs, local models)

2. **Field Context Awareness**
   - Integration with farm location, crop type, and growth stage
   - Weather and seasonal correlation
   - Regional disease prevalence tracking

3. **Treatment Recommendations**
   - Immediate action guidance
   - Chemical control options with safety precautions
   - Organic and biological alternatives
   - Cultural and preventive practices
   - Regulatory compliance information

4. **Expert Review Workflow**
   - Low-confidence detections flagged for human review
   - Extension officer and agronomist verification
   - Corrective diagnosis and treatment override
   - Feedback loop for model improvement

5. **Regional Outbreak Intelligence**
   - Automated outbreak detection from report clustering
   - Geospatial hotspot identification
   - Predictive spread modeling
   - Actionable advisory messages for agricultural authorities

6. **Analytics & Insights**
   - Trend analysis comparing time periods
   - Detection type and severity breakdowns
   - Crop vulnerability analysis
   - Expert review and resolution rates

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                   API Layer                             │
│  (Controllers, Routes, Validators)                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│             PestDisease Service (Orchestrator)          │
│  - Detection request handling                           │
│  - Expert review coordination                           │
│  - Analytics aggregation                                │
└──┬───────┬──────────┬────────────┬──────────────────────┘
   │       │          │            │
   │       │          │            │
   ▼       ▼          ▼            ▼
┌──────┐ ┌──────┐ ┌─────────┐ ┌──────────────┐
│  AI  │ │Image │ │Outbreak │ │  Treatment   │
│Detect│ │Store │ │Analytics│ │  Knowledge   │
│      │ │      │ │         │ │     Base     │
└──────┘ └──────┘ └─────────┘ └──────────────┘
   │        │         │             │
   │        │         │             │
   ▼        ▼         ▼             ▼
┌─────────────────────────────────────────────┐
│           Database Layer (MongoDB)          │
│  - PestDiseaseReports                       │
│  - RegionalOutbreaks                        │
│  - TreatmentKnowledgeBase                   │
└─────────────────────────────────────────────┘
```

### Service Responsibilities

#### **PestDiseaseService**
- Main business logic orchestrator
- Coordinates AI detection, image storage, and outbreak checking
- Manages detection lifecycle (pending → processing → completed/review)
- Handles expert reviews and farmer feedback

#### **AIDetectionService**
- Pluggable AI provider interface
- Image preprocessing and optimization
- Result parsing and confidence scoring
- Model versioning and metadata tracking

#### **ImageStorageService**
- Secure image upload and storage
- Validation (size, format, dimensions)
- Thumbnail generation
- Support for local and cloud storage (S3, Azure, GCS)
- Optional virus scanning

#### **OutbreakAnalyticsService**
- Pattern detection from report clusters
- Geospatial hotspot identification
- Trend analysis and forecasting
- Severity index calculation

---

## Data Models

### 1. PestDiseaseReport

Main entity for individual pest/disease detection reports.

**Key Fields:**
- `reportCode`: Unique identifier (PDR-XXXXXX)
- `farmerId` / `farmId`: References to farmer and farm
- `fieldContext`: Crop type, growth stage, location, soil, etc.
- `images[]`: Array of secure image metadata
- `aiDetection`: AI model results with confidence and severity
- `recommendedTreatment`: Treatment guidance
- `expertReview`: Optional human verification
- `consent`: Farmer's agreement to AI analysis
- `outcome`: Resolution status and effectiveness

**Lifecycle States:**
- `pending` → `processing` → `completed` → `confirmed`/`rejected`/`archived`

### 2. RegionalOutbreak

Tracks pest/disease outbreaks at a regional level.

**Key Fields:**
- `outbreakCode`: Unique identifier (OBK-XXXXXX)
- `pestOrDisease`: Primary pest/disease name
- `region`: GeoJSON polygon with administrative metadata
- `outbreakSeverity`: Sporadic → Localized → Widespread → Epidemic → Pandemic
- `severityIndex`: Composite score (0-100)
- `affectedCrops[]`: Breakdown by crop type
- `timeline[]`: Time-series of report counts and severity
- `advisoryMessage`: Public health alert
- `predictedSpread`: Direction, speed, and risk areas

### 3. TreatmentKnowledgeBase

Repository of pest/disease information and treatment protocols.

**Key Fields:**
- `pestOrDiseaseName`: Common name
- `scientificName`: Taxonomic identification
- `detectionType`: Pest, disease, nutrient deficiency, etc.
- `symptoms`: Visual identification guide
- `favorableConditions`: Temperature, humidity, rainfall ranges
- `treatment`: Chemical, organic, biological, cultural methods
- `preventiveMeasures[]`: Best practices
- `sources[]`: References and citations

---

## API Endpoints

Base URL: `/api/v1/pest-disease`

### Detection

#### Submit Detection Request
```http
POST /detect
```

**Request:**
```
Content-Type: multipart/form-data

images: [File, File, ...]  # 1-10 images
farmerId: ObjectId
farmId: ObjectId
fieldContext: {
  cropType: string
  growthStage: enum
  longitude: number
  latitude: number
  ...
}
consent: {
  agreedToAIAnalysis: true
  agreedToDataSharing: boolean
  consentVersion: string
}
farmerNotes: string (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439011",
    "reportCode": "PDR-000123",
    "status": "processing",
    "detection": {
      "detectedEntity": "Processing...",
      "confidenceScore": 0
    },
    "estimatedProcessingTime": 30000
  }
}
```

#### Get Report
```http
GET /reports/:reportId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportCode": "PDR-000123",
    "reportStatus": "completed",
    "aiDetection": {
      "primaryResult": {
        "detectedEntity": "Fall Armyworm",
        "detectionType": "pest",
        "scientificName": "Spodoptera frugiperda",
        "confidenceScore": 92.5,
        "severityLevel": "high"
      },
      "modelMetadata": {
        "modelName": "PlantDisease-ResNet50",
        "modelVersion": "v1.0.0"
      }
    },
    "recommendedTreatment": {
      "isUrgent": true,
      "immediateActions": [...],
      "chemicalControl": [...],
      "organicControl": [...]
    }
  }
}
```

#### Get Farmer Reports
```http
GET /farmers/:farmerId/reports?status=completed&page=1&limit=20
```

### Expert Review

#### Submit Review
```http
POST /reports/:reportId/review
```

**Request:**
```json
{
  "decision": "confirm" | "reject" | "reclassify",
  "correctedDiagnosis": "Actual pest/disease name",
  "correctedSeverity": "moderate",
  "notes": "Expert observations",
  "confidence": 95
}
```

#### Submit Feedback
```http
POST /reports/:reportId/feedback
```

**Request:**
```json
{
  "isCorrect": true,
  "actualDiagnosis": "Corrected name (if incorrect)",
  "notes": "Farmer observations"
}
```

### Outbreaks

#### Get Active Outbreaks
```http
GET /outbreaks?region=Central&status=active&severity=epidemic
```

#### Get Hotspots
```http
GET /outbreaks/hotspots?detectionType=disease&days=30&radius=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "location": [34.5, -1.2],
      "pestOrDisease": "Late Blight",
      "reportCount": 47,
      "severityIndex": 85,
      "radius": 50
    }
  ]
}
```

### Analytics

#### Get Trends
```http
GET /analytics/trends?currentPeriod=30&previousPeriod=30
```

#### Get Dashboard Analytics
```http
GET /analytics/dashboard?startDate=2024-01-01&endDate=2024-12-31
```

### Treatment Knowledge

#### Search Treatments
```http
GET /treatments/search?q=blight
```

#### Create Treatment Entry (Admin)
```http
POST /treatments
```

---

## AI Detection System

### Supported Providers

1. **Mock Provider** (Development/Testing)
   - Generates random detections with realistic confidence scores
   - No external API required

2. **PlantVillage API**
   - Cloud-based plant disease classifier
   - Requires API key and endpoint configuration

3. **Custom API**
   - Generic HTTP endpoint integration
   - Flexible JSON request/response format

### Configuration

```bash
# .env
AI_DETECTION_PROVIDER=plantvillage|custom|mock
AI_DETECTION_API_ENDPOINT=https://api.provider.com/detect
AI_DETECTION_API_KEY=your-api-key
AI_MODEL_NAME=PlantDisease-ResNet50
AI_MODEL_VERSION=v1.0.0
AI_INFERENCE_ENGINE=TensorFlow
AI_CONFIDENCE_THRESHOLD=60
AI_MAX_ALTERNATIVES=3
AI_REQUEST_TIMEOUT=30000
```

### Detection Workflow

1. **Image Upload**: Farmer submits 1-10 crop images
2. **Validation**: Check file size, format, dimensions
3. **Storage**: Secure upload with checksum verification
4. **AI Processing**: Send to configured provider
5. **Result Parsing**: Extract entity, confidence, severity
6. **Treatment Lookup**: Match against knowledge base
7. **Expert Review Flag**: Low confidence triggers human review
8. **Notification**: Alert farmer of results

### Confidence Levels

- **Very High** (90-100%): Highly reliable, immediate action
- **High** (75-90%): Reliable, farmer can proceed
- **Medium** (60-75%): Moderate reliability, monitor closely
- **Low** (40-60%): Expert review recommended
- **Very Low** (0-40%): Expert review required

---

## Image Storage

### Supported Backends

- **Local Filesystem**: Development and small deployments
- **AWS S3**: Production cloud storage
- **Azure Blob**: Microsoft cloud integration
- **Google Cloud Storage**: Google cloud integration

### Security Features

- **Format Validation**: JPEG, PNG, WebP, HEIC only
- **Size Limits**: 10MB default, configurable
- **Dimension Checks**: Minimum 100x100, maximum 4096x4096
- **Virus Scanning**: Optional integration with ClamAV
- **SHA-256 Checksum**: File integrity verification
- **Access Control**: Signed URLs for secure access

### Configuration

```bash
# .env
IMAGE_STORAGE_PROVIDER=local|s3|azure|gcs
IMAGE_STORAGE_BASE_URL=http://localhost:3000
IMAGE_STORAGE_PATH=/uploads/pest-disease
IMAGE_STORAGE_BUCKET=your-s3-bucket
IMAGE_STORAGE_REGION=us-east-1
IMAGE_MAX_SIZE=10485760  # 10MB
IMAGE_GENERATE_THUMBNAILS=true
IMAGE_THUMBNAIL_WIDTH=320
IMAGE_THUMBNAIL_HEIGHT=240
IMAGE_VIRUS_SCAN=false
```

---

## Outbreak Analytics

### Detection Algorithm

Outbreaks are automatically detected when:
- **Threshold**: ≥5 reports in a region within 14 days
- **Confidence**: Average confidence ≥60%
- **Clustering**: Multiple farms affected
- **Severity**: High concentration of severe cases

### Severity Index Calculation

Composite score (0-100) based on:
- Report volume (30 points)
- Confirmation rate (20 points)
- Farms affected (20 points)
- Outbreak severity enum (30 points)

### Hotspot Identification

- **Grid-based clustering** with configurable radius (default 50km)
- **Minimum 3 reports** per cluster
- **Geospatial distance** calculation (Haversine formula)
- **Ranking** by severity index

### Trend Analysis

Compare two time periods:
- **Metrics**: Report count, average severity
- **Trends**: Increasing (>+20%), Decreasing (<-20%), Stable
- **Top pests/diseases**: Ranked by current period volume

---

## Security & Compliance

### Data Protection

1. **Consent Management**
   - Explicit farmer consent for AI analysis
   - Opt-in for data sharing
   - Version-tracked consent records
   - IP address logging for audit

2. **Access Control**
   - Role-based permissions (RBAC)
   - Farmer: Submit detections, view own reports
   - Extension Officer: Review reports, access analytics
   - Agronomist: Expert reviews, edit knowledge base
   - Admin: Full access

3. **Audit Trail**
   - All actions logged via AuditService
   - Metadata includes actor, timestamp, resource ID
   - Immutable audit records

### Multi-Tenancy

All models include `tenantId` for SaaS isolation:
- Automatic tenant filtering in all queries
- Prevent cross-tenant data leakage
- Tenant-specific AI model configurations

### Compliance

- **GDPR-Ready**: Farmer consent tracking, right to erasure (soft delete)
- **Data Retention**: Configurable TTL policies
- **Anonymization**: Personal data encrypted at rest
- **Export**: JSON export for data portability

---

## Integration Guide

### 1. Installation

The module is already integrated into the ClyCites API. No additional installation required.

### 2. Database Indexes

Geospatial and compound indexes are automatically created on first document insertion.

### 3. Dependencies

Required npm packages:
```json
{
  "mongoose": "^8.x",
  "express": "^4.x",
  "multer": "^1.x",
  "sharp": "^0.33.x",
  "form-data": "^4.x",
  "axios": "^1.x"
}
```

### 4. Environment Configuration

Copy `.env.example` and configure:
```bash
# Required
DATABASE_URL=mongodb://localhost:27017/clycites
JWT_SECRET=your-secret-key

# AI Detection
AI_DETECTION_PROVIDER=mock  # Start with mock for testing
AI_CONFIDENCE_THRESHOLD=60

# Image Storage
IMAGE_STORAGE_PROVIDER=local
IMAGE_STORAGE_PATH=./uploads/pest-disease
IMAGE_MAX_SIZE=10485760
```

### 5. Seed Knowledge Base (Optional)

```typescript
import { TreatmentKnowledgeBase } from './modules/pest-disease';

await TreatmentKnowledgeBase.create({
  tenantId: yourTenantId,
  pestOrDiseaseName: 'Fall Armyworm',
  scientificName: 'Spodoptera frugiperda',
  detectionType: 'pest',
  category: 'Insect',
  affectedCrops: ['maize', 'sorghum'],
  symptoms: {
    description: 'Larvae feed on leaves, creating irregular holes...',
    visual: ['Whorl damage', 'Frass on leaves']
  },
  treatment: {
    chemical: [{
      activIngredient: 'Cypermethrin',
      dosage: '100ml per 20L water',
      applicationMethod: 'Foliar spray',
      safetyPrecautions: ['Wear protective gear']
    }],
    organic: [{
      method: 'Neem extract',
      materials: ['Neem leaves', 'Water'],
      procedure: 'Crush neem leaves and soak in water...'
    }]
  },
  createdBy: adminUserId
});
```

---

## Configuration

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AI_DETECTION_PROVIDER` | AI backend (mock/plantvillage/custom) | `mock` | No |
| `AI_DETECTION_API_ENDPOINT` | Custom API URL | - | If custom |
| `AI_DETECTION_API_KEY` | API authentication key | - | If required |
| `AI_MODEL_NAME` | Model identifier | `PlantDisease-ResNet50` | No |
| `AI_MODEL_VERSION` | Model version | `v1.0.0` | No |
| `AI_CONFIDENCE_THRESHOLD` | Min confidence for auto-accept | `60` | No |
| `IMAGE_STORAGE_PROVIDER` | Storage backend | `local` | No |
| `IMAGE_STORAGE_PATH` | Local storage directory | `./uploads/pest-disease` | If local |
| `IMAGE_STORAGE_BUCKET` | S3/Azure bucket name | - | If cloud |
| `IMAGE_MAX_SIZE` | Max upload size (bytes) | `10485760` | No |
| `IMAGE_GENERATE_THUMBNAILS` | Create thumbnails | `true` | No |

---

## Examples

### Mobile App Integration (React Native)

```javascript
import axios from 'axios';
import { launchImageLibrary } from 'react-native-image-picker';

const submitDetection = async (farmerId, farmId) => {
  // 1. Pick images
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
    selectionLimit: 5
  });

  if (result.didCancel) return;

  // 2. Get location
  const location = await getCurrentPosition();

  // 3. Prepare form data
  const formData = new FormData();
  result.assets.forEach(asset => {
    formData.append('images', {
      uri: asset.uri,
      type: asset.type,
      name: asset.fileName
    });
  });

  formData.append('farmerId', farmerId);
  formData.append('farmId', farmId);
  formData.append('fieldContext', JSON.stringify({
    cropType: 'Maize',
    growthStage: 'vegetative',
    longitude: location.coords.longitude,
    latitude: location.coords.latitude
  }));
  formData.append('consent', JSON.stringify({
    agreedToAIAnalysis: true,
    agreedToDataSharing: true,
    consentVersion: 'v1.0'
  }));

  // 4. Submit to API
  const response = await axios.post(
    'https://api.clycites.com/api/v1/pest-disease/detect',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  // 5. Poll for results
  const reportId = response.data.data.reportId;
  const pollInterval = setInterval(async () => {
    const report = await axios.get(
      `https://api.clycites.com/api/v1/pest-disease/reports/${reportId}`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    if (report.data.data.reportStatus === 'completed') {
      clearInterval(pollInterval);
      displayResults(report.data.data);
    }
  }, 3000);
};
```

### Web Dashboard Integration (React)

```javascript
import { useEffect, useState } from 'react';

function OutbreakDashboard() {
  const [outbreaks, setOutbreaks] = useState([]);
  const [hotspots, setHotspots] = useState([]);

  useEffect(() => {
    fetchOutbreaks();
    fetchHotspots();
  }, []);

  const fetchOutbreaks = async () => {
    const response = await fetch('/api/v1/pest-disease/outbreaks?status=active', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setOutbreaks(data.data);
  };

  const fetchHotspots = async () => {
    const response = await fetch('/api/v1/pest-disease/outbreaks/hotspots?days=30', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setHotspots(data.data);
  };

  return (
    <div>
      <h1>Active Outbreaks</h1>
      {outbreaks.map(outbreak => (
        <OutbreakCard key={outbreak._id} outbreak={outbreak} />
      ))}

      <h1>Hotspot Map</h1>
      <Map hotspots={hotspots} />
    </div>
  );
}
```

---

## Performance Considerations

### Scalability

- **Async AI Processing**: Non-blocking inference using background workers
- **Indexed Queries**: Geospatial (2dsphere) and compound indexes
- **Pagination**: All list endpoints support pagination
- **Caching**: Cache treatment knowledge base
- **Load Balancing**: Horizontally scalable API servers

### Optimization Tips

1. **Image Compression**: Use Sharp to optimize before upload
2. **Thumbnail Generation**: Async process for faster response
3. **Batch Processing**: Queue multiple detections
4. **Regional Queries**: Use geospatial indexes for nearby searches
5. **Analytics Caching**: Cache dashboard data for 15-30 minutes

---

## Troubleshooting

### Common Issues

**1. AI Detection Timeout**
- Increase `AI_REQUEST_TIMEOUT` in .env
- Check AI provider API status
- Switch to mock provider for testing

**2. Image Upload Failed**
- Verify file size < `IMAGE_MAX_SIZE`
- Check mime type is JPEG/PNG/WebP/HEIC
- Ensure upload directory permissions

**3. Outbreak Not Detected**
- Check `minReportsThreshold` (default 5)
- Verify reports are within `timeWindowDays` (default 14)
- Ensure confidence scores ≥ threshold

**4. Knowledge Base Missing**
- Seed knowledge base with common pests/diseases
- Verify `isPublished` is true
- Check `tenantId` matches

---

## Future Enhancements

### Roadmap

1. **Drone Imagery Integration**
   - Support high-resolution aerial images
   - Field-level scanning
   - Automated flight path planning

2. **Satellite Disease Detection**
   - NDVI analysis for early stress detection
   - Multi-spectral imaging
   - Predictive modeling

3. **Offline Mobile Support**
   - On-device AI models (TensorFlow Lite)
   - Sync when connectivity restored
   - Progressive Web App (PWA)

4. **Insurance Integration**
   - Automated crop loss verification
   - Claims processing workflow
   - Risk assessment APIs

5. **Advisory Service Integration**
   - Direct messaging to extension officers
   - Scheduled field visits
   - Real-time alerts

---

## Support

For issues, questions, or contributions:
- **Email**: support@clycites.com
- **GitHub**: https://github.com/clycites/api
- **Documentation**: https://docs.clycites.com/pest-disease

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Module Status**: ✅ Production Ready
