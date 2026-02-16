# Pest & Disease Detection Module - Quick Reference

## 🚀 Quick Start

### 1. Configure Environment
```bash
# Copy environment template
cp .env.pest-disease.example .env

# Minimum required configuration
AI_DETECTION_PROVIDER=mock
IMAGE_STORAGE_PROVIDER=local
IMAGE_STORAGE_PATH=./uploads/pest-disease
```

### 2. API Base URL
```
/api/v1/pest-disease
```

### 3. Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 📸 Submit Detection (Mobile/Web)

### Endpoint
```http
POST /api/v1/pest-disease/detect
Content-Type: multipart/form-data
```

### Minimal Request
```javascript
const formData = new FormData();
formData.append('images', imageFile);  // 1-10 images
formData.append('farmerId', '507f1f77bcf86cd799439011');
formData.append('farmId', '507f1f77bcf86cd799439012');
formData.append('fieldContext', JSON.stringify({
  cropType: 'Maize',
  growthStage: 'vegetative',
  longitude: 34.5,
  latitude: -1.2
}));
formData.append('consent', JSON.stringify({
  agreedToAIAnalysis: true,
  agreedToDataSharing: true,
  consentVersion: 'v1.0'
}));
```

### Response
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439011",
    "reportCode": "PDR-000123",
    "status": "processing"
  }
}
```

---

## 📊 Get Detection Results

### Endpoint
```http
GET /api/v1/pest-disease/reports/:reportId
```

### Response
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
        "confidenceScore": 92.5,
        "severityLevel": "high"
      }
    },
    "recommendedTreatment": {
      "isUrgent": true,
      "immediateActions": [
        "Isolate affected plants",
        "Scout adjacent fields"
      ],
      "chemicalControl": [{
        "activIngredient": "Cypermethrin",
        "dosage": "100ml per 20L water"
      }]
    }
  }
}
```

---

## 🔍 Common Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/detect` | Submit detection request | Farmer, Officer |
| GET | `/reports/:reportId` | Get report details | All |
| GET | `/farmers/:farmerId/reports` | List farmer's reports | Farmer, Officer |
| POST | `/reports/:reportId/review` | Expert review | Officer, Agronomist |
| POST | `/reports/:reportId/feedback` | Submit feedback | Farmer |
| GET | `/outbreaks` | Active outbreaks | All |
| GET | `/outbreaks/hotspots` | Hotspot analysis | Analyst |
| GET | `/analytics/dashboard` | Dashboard data | Analyst |
| GET | `/treatments/search?q=blight` | Search treatments | All |
| POST | `/treatments` | Create treatment entry | Admin, Agronomist |

---

## 🎯 Field Context (Optional but Recommended)

### Complete Field Context
```json
{
  "cropType": "Maize",
  "growthStage": "vegetative",
  "longitude": 34.5,
  "latitude": -1.2,
  "soilType": "Clay Loam",
  "previousCrop": "Beans",
  "weatherConditions": {
    "temperature": 28,
    "humidity": 70,
    "recentRainfall": 15
  },
  "irrigationType": "Drip"
}
```

### Growth Stages
- `seedling` - Germination to 2 weeks
- `vegetative` - Leaf development
- `flowering` - Reproductive stage
- `fruiting` - Fruit/grain development
- `maturity` - Harvest-ready
- `post_harvest` - After harvest

---

## 🧪 Detection Types

| Type | Examples |
|------|----------|
| `pest` | Fall Armyworm, Aphids, Cutworms |
| `disease` | Late Blight, Maize Lethal Necrosis, Rust |
| `nutrient_deficiency` | Nitrogen, Phosphorus, Potassium deficiency |
| `environmental_stress` | Drought, Heat stress, Waterlogging |
| `weed` | Invasive weeds |
| `physiological_disorder` | Non-pathogenic disorders |

---

## 📈 Severity Levels

| Level | Confidence | Action |
|-------|------------|--------|
| **Very Low** | < 40% | Expert review REQUIRED |
| **Low** | 40-60% | Expert review recommended |
| **Medium** | 60-75% | Monitor closely |
| **High** | 75-90% | Take action |
| **Very High** | 90-100% | Immediate action |

---

## 🚨 Outbreak Monitoring

### Get Active Outbreaks
```http
GET /api/v1/pest-disease/outbreaks?status=active&severity=epidemic
```

### Get Hotspots (Last 30 Days)
```http
GET /api/v1/pest-disease/outbreaks/hotspots?days=30&radius=50
```

### Response
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

---

## 🔐 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Farmer** | Submit detections, view own reports, submit feedback |
| **Extension Officer** | Submit detections, review reports, view analytics |
| **Agronomist** | Expert reviews, edit knowledge base, view analytics |
| **Analyst** | Advanced analytics, hotspot analysis, trend reports |
| **Admin** | Full access, create treatments, system configuration |

---

## 🖼️ Image Requirements

| Property | Requirement |
|----------|-------------|
| **Formats** | JPEG, PNG, WebP, HEIC |
| **Max Size** | 10MB per image |
| **Max Files** | 10 images per request |
| **Min Dimensions** | 100 x 100 pixels |
| **Max Dimensions** | 4096 x 4096 pixels |
| **Content** | Clear, well-lit crop images |

---

## ⚡ AI Provider Configuration

### Mock Provider (Development)
```bash
AI_DETECTION_PROVIDER=mock
# No API key required
# Returns random detections instantly
```

### PlantVillage API
```bash
AI_DETECTION_PROVIDER=plantvillage
AI_DETECTION_API_ENDPOINT=https://api.plantvillage.org/v1/detect
AI_DETECTION_API_KEY=your-api-key
```

### Custom API
```bash
AI_DETECTION_PROVIDER=custom
AI_DETECTION_API_ENDPOINT=https://your-ai-api.com/detect
AI_DETECTION_API_KEY=your-api-key
```

---

## 📦 Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* result data */ },
  "pagination": {  // If paginated
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 47,
    "limit": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid crop type",
    "details": [...]
  }
}
```

---

## 🧩 Integration Examples

### React Native (Mobile)
```javascript
import { launchImageLibrary } from 'react-native-image-picker';

const submitDetection = async () => {
  const images = await launchImageLibrary({ selectionLimit: 5 });
  const formData = new FormData();
  
  images.assets.forEach(img => {
    formData.append('images', {
      uri: img.uri,
      type: img.type,
      name: img.fileName
    });
  });
  
  formData.append('farmerId', currentFarmerId);
  formData.append('farmId', selectedFarmId);
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
  
  const response = await fetch('/api/v1/pest-disease/detect', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  const result = await response.json();
  console.log('Report ID:', result.data.reportId);
};
```

### React (Web Dashboard)
```javascript
const fetchOutbreaks = async () => {
  const response = await fetch(
    '/api/v1/pest-disease/outbreaks?status=active&severity=epidemic',
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await response.json();
  return data.data;
};
```

### cURL (Testing)
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/detect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/crop-image.jpg" \
  -F 'farmerId=507f1f77bcf86cd799439011' \
  -F 'farmId=507f1f77bcf86cd799439012' \
  -F 'fieldContext={"cropType":"Maize","growthStage":"vegetative","longitude":34.5,"latitude":-1.2}' \
  -F 'consent={"agreedToAIAnalysis":true,"agreedToDataSharing":true,"consentVersion":"v1.0"}'
```

---

## 🧪 Testing with Mock Provider

The mock provider returns realistic test data:

**Detections:**
1. Fall Armyworm (Pest, High Severity, 85-92% confidence)
2. Late Blight (Disease, Very High Severity, 88-95% confidence)
3. Maize Leaf Rust (Disease, Moderate Severity, 75-82% confidence)
4. Nitrogen Deficiency (Nutrient, Low Severity, 70-78% confidence)
5. Aphid Infestation (Pest, Moderate Severity, 80-87% confidence)

**Usage:**
```bash
AI_DETECTION_PROVIDER=mock
```
Returns random detection from above list with 2-second processing delay.

---

## 🔧 Common Tasks

### Seed Treatment Knowledge Base
```javascript
const seedKnowledgeBase = async () => {
  await fetch('/api/v1/pest-disease/treatments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pestOrDiseaseName: 'Fall Armyworm',
      scientificName: 'Spodoptera frugiperda',
      detectionType: 'pest',
      category: 'Insect',
      affectedCrops: ['Maize', 'Sorghum'],
      symptoms: {
        description: 'Larvae feed on leaves creating irregular holes',
        visual: ['Whorl damage', 'Frass on leaves']
      },
      treatment: {
        chemical: [{
          activIngredient: 'Cypermethrin',
          dosage: '100ml per 20L water',
          applicationMethod: 'Foliar spray'
        }],
        organic: [{
          method: 'Neem extract',
          materials: ['Neem leaves', 'Water']
        }]
      }
    })
  });
};
```

### Poll for AI Results
```javascript
const pollForResults = async (reportId) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/v1/pest-disease/reports/${reportId}`);
    const data = await response.json();
    
    if (data.data.reportStatus === 'completed') {
      clearInterval(interval);
      console.log('Detection complete:', data.data.aiDetection);
    }
  }, 3000);
};
```

---

## 🐛 Troubleshooting

### Issue: AI Detection Timeout
**Solution:**
```bash
AI_REQUEST_TIMEOUT=60000  # Increase to 60 seconds
```

### Issue: Image Upload Failed
**Check:**
- File size < 10MB
- Format is JPEG/PNG/WebP/HEIC
- Minimum dimensions 100x100px

### Issue: Outbreak Not Detected
**Adjust:**
```bash
OUTBREAK_MIN_REPORTS_THRESHOLD=3  # Lower threshold
OUTBREAK_TIME_WINDOW_DAYS=30       # Wider time window
```

---

## 📚 Additional Resources

- **Full Documentation**: `PEST_DISEASE_MODULE_DOCUMENTATION.md`
- **Environment Template**: `.env.pest-disease.example`
- **Support**: support@clycites.com

---

## 🎯 Key Metrics to Monitor

| Metric | Endpoint | Description |
|--------|----------|-------------|
| Total Detections | `/analytics/dashboard` | All-time detection count |
| Active Outbreaks | `/outbreaks?status=active` | Current active outbreaks |
| Expert Review Queue | Service method | Pending expert reviews |
| Average Confidence | `/analytics/dashboard` | AI model performance |
| Resolution Rate | `/analytics/dashboard` | Treatment effectiveness |

---

**Version**: 1.0.0  
**Module Status**: ✅ Production Ready  
**Last Updated**: February 2026
