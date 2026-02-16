# 🌾 Pest & Disease Detection Module

> **Enterprise AI-Assisted Crop Health Monitoring System for ClyCites**

A production-ready module that enables farmers to detect and diagnose crop pests and diseases using mobile image uploads, AI-powered classification, and expert verification workflows.

---

## 🎯 Overview

The Pest & Disease Detection Module provides:

✅ **AI-Assisted Image Diagnosis** - Upload crop photos for instant pest/disease identification  
✅ **Regional Outbreak Intelligence** - Real-time monitoring of pest/disease spread patterns  
✅ **Treatment Recommendations** - Actionable guidance including chemical, organic, and cultural practices  
✅ **Expert Review Workflow** - Human verification for low-confidence detections  
✅ **Farmer Feedback Loop** - Continuous model improvement through field validation  
✅ **Geospatial Analytics** - Hotspot clustering and predictive spread modeling  
✅ **Multi-Tenant Architecture** - Scalable SaaS design with audit trails  

---

## 🚀 Quick Start

### 1. Install & Configure

```bash
# 1. Ensure dependencies are installed
npm install

# 2. Configure environment (minimum viable setup)
echo "AI_DETECTION_PROVIDER=mock" >> .env
echo "IMAGE_STORAGE_PROVIDER=local" >> .env
echo "IMAGE_STORAGE_PATH=./uploads/pest-disease" >> .env

# 3. Create upload directory
mkdir -p uploads/pest-disease

# 4. Start server
npm run dev
```

### 2. Test the API

```bash
# Submit detection request
curl -X POST http://localhost:3000/api/v1/pest-disease/detect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@./test-image.jpg" \
  -F "farmerId=507f1f77bcf86cd799439011" \
  -F "farmId=507f1f77bcf86cd799439012" \
  -F 'fieldContext={"cropType":"Maize","growthStage":"vegetative","longitude":34.5,"latitude":-1.2}' \
  -F 'consent={"agreedToAIAnalysis":true,"agreedToDataSharing":true,"consentVersion":"v1.0"}'

# Get report results (replace REPORT_ID)
curl http://localhost:3000/api/v1/pest-disease/reports/REPORT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "reportCode": "PDR-000001",
    "aiDetection": {
      "primaryResult": {
        "detectedEntity": "Fall Armyworm",
        "confidenceScore": 92.5,
        "severityLevel": "high"
      }
    },
    "recommendedTreatment": {
      "isUrgent": true,
      "immediateActions": ["Isolate affected plants"],
      "chemicalControl": [...]
    }
  }
}
```

---

## 📚 Documentation

| Document | Description | Link |
|----------|-------------|------|
| **Full Documentation** | Architecture, features, configuration | [PEST_DISEASE_MODULE_DOCUMENTATION.md](./PEST_DISEASE_MODULE_DOCUMENTATION.md) |
| **Quick Reference** | API endpoints, examples, troubleshooting | [PEST_DISEASE_QUICK_REFERENCE.md](./PEST_DISEASE_QUICK_REFERENCE.md) |
| **Installation Guide** | Step-by-step setup, deployment, cloud config | [PEST_DISEASE_INSTALLATION.md](./PEST_DISEASE_INSTALLATION.md) |
| **API Testing** | Test cases, Postman collection, validation | [PEST_DISEASE_API_TESTING.md](./PEST_DISEASE_API_TESTING.md) |
| **Environment Template** | All configuration options | [.env.pest-disease.example](./.env.pest-disease.example) |

---

## 🏗️ Architecture

### System Components

```
┌──────────────────────────────────────────────────┐
│          Mobile App / Web Dashboard              │
│     (Farmer uploads crop images via camera)      │
└────────────────┬─────────────────────────────────┘
                 │ HTTP/REST
                 ▼
┌──────────────────────────────────────────────────┐
│            ClyCites API Gateway                  │
│       Authentication & Authorization             │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│     Pest & Disease Detection Module              │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  PestDiseaseService (Orchestrator)      │    │
│  │  - Detection workflow                   │    │
│  │  - Expert review coordination           │    │
│  └──┬──────┬──────────┬────────────────────┘    │
│     │      │          │                          │
│     ▼      ▼          ▼                          │
│  ┌────┐ ┌─────┐ ┌──────────┐ ┌──────────┐       │
│  │ AI │ │Image│ │Outbreak  │ │Treatment │       │
│  │Det.│ │Store│ │Analytics │ │Knowledge │       │
│  └────┘ └─────┘ └──────────┘ └──────────┘       │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│           MongoDB Database                       │
│  - PestDiseaseReports (detection records)       │
│  - RegionalOutbreaks (outbreak tracking)        │
│  - TreatmentKnowledgeBase (pest/disease info)   │
└──────────────────────────────────────────────────┘
```

### Data Flow

1. **Farmer uploads images** via mobile app
2. **API validates** images (format, size, dimensions)
3. **Images stored** securely (local/S3/Azure)
4. **PestDiseaseReport created** with status "processing"
5. **AI Service** analyzes images (async)
6. **Treatment recommendations** fetched from knowledge base
7. **Outbreak patterns** detected in background
8. **Report updated** to "completed" or "requires_review"
9. **Farmer notified** with results and treatment guidance

---

## 🌟 Key Features

### 1. AI Detection Providers

**Pluggable architecture** supports multiple AI backends:

| Provider | Use Case | Setup |
|----------|----------|-------|
| **Mock** | Development/Testing | `AI_DETECTION_PROVIDER=mock` |
| **PlantVillage** | Production (cloud API) | Requires API key |
| **Custom API** | Your own ML models | Configure endpoint URL |
| **TensorFlow** | On-premise inference | Local model file |
| **PyTorch** | On-premise inference | Local model file |

### 2. Image Storage

**Multi-backend support** for different deployment scenarios:

- **Local Filesystem** - Development and small deployments
- **AWS S3** - Scalable cloud storage
- **Azure Blob** - Microsoft Azure integration
- **Google Cloud Storage** - Google Cloud integration

**Security features:**
- SHA-256 checksum verification
- Virus scanning integration (ClamAV)
- Automatic thumbnail generation
- Image optimization (Sharp library)

### 3. Outbreak Analytics

**Geospatial intelligence** for regional outbreak tracking:

- **Automatic detection** (≥5 reports in 14 days)
- **Severity index** (composite 0-100 score)
- **Hotspot clustering** (configurable radius)
- **Predictive spread** (direction + speed estimation)
- **Timeline visualization** (time-series data)

### 4. Expert Review Workflow

**Human-in-the-loop** for quality assurance:

- **Auto-flagging** for low-confidence detections (<60%)
- **Three-tier decisions:** Confirm, Reclassify, Reject
- **Corrective diagnosis** with expert notes
- **Feedback loop** for model retraining

### 5. Treatment Knowledge Base

**Comprehensive pest/disease repository:**

- Chemical, organic, biological, and cultural control methods
- Preventive measures and best practices
- Favorable conditions for each pest/disease
- Citations and research references
- Fuzzy search with full-text indexing

---

## 🎯 API Endpoints

**Base URL:** `/api/v1/pest-disease`

### Detection

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/detect` | Submit detection request | Farmer, Officer |
| GET | `/reports/:reportId` | Get report details | All |
| GET | `/farmers/:farmerId/reports` | List farmer's reports | Farmer, Officer |

### Expert Review

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/reports/:reportId/review` | Submit expert review | Officer, Agronomist |
| POST | `/reports/:reportId/feedback` | Submit farmer feedback | Farmer |

### Outbreaks

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/outbreaks` | List active outbreaks | All |
| GET | `/outbreaks/hotspots` | Get outbreak hotspots | Analyst |

### Analytics

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/analytics/trends` | Trend analysis | Analyst |
| GET | `/analytics/dashboard` | Dashboard data | Analyst |

### Treatment Knowledge

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/treatments/search?q=armyworm` | Search knowledge base | All |
| POST | `/treatments` | Create treatment entry | Admin, Agronomist |

See [API Testing Guide](./PEST_DISEASE_API_TESTING.md) for detailed examples.

---

## 🗂️ File Structure

```
src/modules/pest-disease/
├── pestDisease.types.ts              # TypeScript interfaces and enums
├── models/
│   ├── pestDiseaseReport.model.ts    # Detection reports
│   ├── regionalOutbreak.model.ts     # Outbreak tracking
│   └── treatmentKnowledgeBase.model.ts  # Pest/disease knowledge
├── services/
│   ├── pestDisease.service.ts        # Main orchestrator
│   ├── aiDetection.service.ts        # AI provider integration
│   ├── imageStorage.service.ts       # Image upload/storage
│   └── outbreakAnalytics.service.ts  # Geospatial analytics
├── pestDisease.controller.ts         # HTTP request handlers
├── pestDisease.validator.ts          # Request validation
├── pestDisease.routes.ts             # Route definitions
└── index.ts                          # Module exports
```

**Total:** 13 files, 5000+ lines of production code

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| **Language** | TypeScript (strict mode) |
| **Runtime** | Node.js 16+ |
| **Framework** | Express.js |
| **Database** | MongoDB 5+ (with replica set) |
| **ORM** | Mongoose (with TypeScript) |
| **Image Processing** | Sharp |
| **File Upload** | Multer |
| **Validation** | express-validator |
| **Geospatial** | GeoJSON + 2dsphere indexes |
| **AI/ML** | Pluggable (TensorFlow, PyTorch, custom) |
| **Cloud Storage** | AWS S3, Azure Blob, GCS |

---

## 🔒 Security Features

### Data Protection
- ✅ **Farmer consent tracking** - Explicit opt-in for AI analysis
- ✅ **Multi-tenant isolation** - Complete tenant separation
- ✅ **Role-based access control (RBAC)** - Granular permissions
- ✅ **Audit trail** - All actions logged
- ✅ **Image checksums** - SHA-256 verification
- ✅ **Virus scanning** - Optional ClamAV integration

### Compliance
- ✅ **GDPR-ready** - Right to erasure (soft delete)
- ✅ **Data retention policies** - Configurable TTL
- ✅ **Consent versioning** - Track consent agreement versions
- ✅ **IP logging** - Audit trail with IP addresses

---

## 📊 Performance & Scalability

### Optimizations
- **Async AI processing** - Non-blocking inference
- **Background outbreak detection** - Scheduled jobs
- **Geospatial indexing** - 2dsphere for efficient queries
- **Pagination** - All list endpoints support pagination
- **Image optimization** - Sharp library for compression
- **Thumbnail generation** - Async thumbnail creation

### Scalability
- **Horizontal scaling** - Stateless API design
- **Load balancing** - Multiple API instances supported
- **Cloud storage** - S3/Azure for unlimited capacity
- **Database sharding** - Tenant-based sharding ready
- **Caching** - Treatment knowledge cached (configurable TTL)

---

## 🧪 Testing

### Unit Tests (Recommended)
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Testing
See [PEST_DISEASE_API_TESTING.md](./PEST_DISEASE_API_TESTING.md) for comprehensive test cases.

### Test Coverage Goals
- Services: 80%+
- Controllers: 70%+
- Models: 90%+
- Overall: 75%+

---

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/app.js --name clycites-api -i max

# Or use Docker
docker build -t clycites-api .
docker run -p 3000:3000 clycites-api
```

See [Installation Guide](./PEST_DISEASE_INSTALLATION.md) for detailed deployment instructions.

---

## 🌍 Use Cases

### Primary Use Case: Farmer Detection
1. Farmer notices unusual symptoms on crops
2. Takes photos using mobile app camera
3. Submits detection request with location and crop info
4. AI analyzes images (30-60 seconds)
5. Receives diagnosis with confidence score
6. Gets treatment recommendations
7. Follows treatment protocol
8. Provides feedback on effectiveness

### Secondary Use Case: Outbreak Monitoring
1. Multiple farmers report same pest/disease in region
2. System detects clustering pattern
3. Outbreak automatically created (severity calculated)
4. Agricultural authorities receive alerts
5. Advisory messages issued to at-risk farmers
6. Spread prediction helps target interventions
7. Timeline tracking monitors containment efforts

### Tertiary Use Case: Analytics Dashboard
1. Agricultural analyst logs into dashboard
2. Views active outbreaks on map
3. Analyzes trends (current vs previous period)
4. Identifies hotspots with clustering algorithm
5. Generates reports for policy makers
6. Monitors expert review queue
7. Evaluates model performance metrics

---

## 🤝 Integration Examples

### React Native Mobile App
```javascript
import { launchCamera } from 'react-native-image-picker';

const detectPest = async () => {
  const image = await launchCamera({ quality: 0.8 });
  const formData = new FormData();
  formData.append('images', { uri: image.uri, type: 'image/jpeg', name: 'crop.jpg' });
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
  pollForResults(result.data.reportId);
};
```

### React Web Dashboard
```javascript
const OutbreakMap = () => {
  const [hotspots, setHotspots] = useState([]);
  
  useEffect(() => {
    fetch('/api/v1/pest-disease/outbreaks/hotspots?days=30')
      .then(res => res.json())
      .then(data => setHotspots(data.data));
  }, []);
  
  return (
    <MapView>
      {hotspots.map(hotspot => (
        <Circle
          center={hotspot.location}
          radius={hotspot.radius * 1000}
          severity={hotspot.severityIndex}
        />
      ))}
    </MapView>
  );
};
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: AI detection timeout  
**Solution**: Increase `AI_REQUEST_TIMEOUT` or switch to `mock` provider

**Issue**: Image upload fails  
**Solution**: Check file size (<10MB), format (JPEG/PNG), and directory permissions

**Issue**: Outbreak not detected  
**Solution**: Lower `OUTBREAK_MIN_REPORTS_THRESHOLD` or widen `OUTBREAK_TIME_WINDOW_DAYS`

**Issue**: Unauthorized access  
**Solution**: Verify JWT token is valid and user has required role

See [Troubleshooting Section](./PEST_DISEASE_MODULE_DOCUMENTATION.md#troubleshooting) in full documentation.

---

## 🛣️ Roadmap

### Phase 1: Core Features (✅ Completed)
- [x] AI-assisted image detection
- [x] Treatment recommendations
- [x] Expert review workflow
- [x] Outbreak tracking
- [x] Geospatial analytics

### Phase 2: Enhancements (Planned)
- [ ] Offline mobile support (TensorFlow Lite)
- [ ] Satellite imagery integration
- [ ] Drone imagery support
- [ ] Weather API integration
- [ ] Insurance claim integration

### Phase 3: Advanced Analytics
- [ ] Predictive modeling (LSTM/GRU)
- [ ] Multi-spectral analysis (NDVI)
- [ ] Crop loss estimation
- [ ] Economic impact assessment

---

## 📞 Support

### Documentation
- **Full Documentation**: [PEST_DISEASE_MODULE_DOCUMENTATION.md](./PEST_DISEASE_MODULE_DOCUMENTATION.md)
- **Quick Reference**: [PEST_DISEASE_QUICK_REFERENCE.md](./PEST_DISEASE_QUICK_REFERENCE.md)
- **Installation**: [PEST_DISEASE_INSTALLATION.md](./PEST_DISEASE_INSTALLATION.md)

### Contact
- **Email**: support@clycites.com
- **GitHub Issues**: https://github.com/clycites/api/issues
- **Slack**: #pest-disease-module

---

## 📄 License

This module is part of the ClyCites API and follows the same license terms.

---

## 🙏 Acknowledgments

Developed for ClyCites by the Engineering Team.

**Contributors:**
- AI/ML Integration
- Geospatial Analytics
- Image Processing
- API Design

**Special Thanks:**
- Plant pathology consultants
- Agricultural extension officers
- Farmer focus groups
- Open-source community

---

## 📈 Stats

- **13 source files** - Modular, maintainable codebase
- **5000+ lines** - Production-ready code
- **11 API endpoints** - Comprehensive REST API
- **3 data models** - Normalized database design
- **4 services** - Separation of concerns
- **25+ TypeScript interfaces** - Strong type safety
- **10+ enums** - Clear domain modeling

---

**Module Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: February 2026  
**Minimum Node.js**: 16.x  
**MongoDB Version**: 5.x+

---

<div align="center">

**Built with ❤️ for farmers worldwide**

[Documentation](./PEST_DISEASE_MODULE_DOCUMENTATION.md) • [Quick Start](#-quick-start) • [API Reference](./PEST_DISEASE_QUICK_REFERENCE.md) • [Testing](./PEST_DISEASE_API_TESTING.md)

</div>
