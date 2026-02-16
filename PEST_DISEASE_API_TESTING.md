# Pest & Disease Detection Module - API Testing Guide

## 📋 Overview

This guide provides comprehensive test cases for all Pest & Disease Detection API endpoints.

**Base URL**: `http://localhost:3000/api/v1/pest-disease`

---

## 🔑 Authentication Setup

### 1. Get Authentication Token

First, login to get a JWT token:

```bash
# Login as Farmer
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "role": "farmer"
    }
  }
}
```

### 2. Use Token in Requests

Add the token to all subsequent requests:

```bash
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🧪 Test Cases

### Test Case 1: Submit Detection Request

**Endpoint**: `POST /detect`

**Description**: Submit crop images for AI-assisted pest/disease detection.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/detect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@./test-images/maize-leaf-1.jpg" \
  -F "images=@./test-images/maize-leaf-2.jpg" \
  -F 'farmerId=507f1f77bcf86cd799439011' \
  -F 'farmId=507f1f77bcf86cd799439012' \
  -F 'fieldContext={
    "cropType": "Maize",
    "growthStage": "vegetative",
    "longitude": 34.5234,
    "latitude": -1.2876,
    "soilType": "Clay Loam",
    "previousCrop": "Beans",
    "weatherConditions": {
      "temperature": 28,
      "humidity": 70,
      "recentRainfall": 15
    }
  }' \
  -F 'consent={
    "agreedToAIAnalysis": true,
    "agreedToDataSharing": true,
    "consentVersion": "v1.0"
  }' \
  -F 'farmerNotes=Noticed yellow spots on leaves yesterday'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439013",
    "reportCode": "PDR-000001",
    "status": "processing",
    "detection": {
      "detectedEntity": "Processing...",
      "confidenceScore": 0
    },
    "imagesUploaded": 2,
    "estimatedProcessingTime": 30000
  }
}
```

**Validation Tests:**

**1.1 Missing Required Fields**
```bash
# Missing farmerId
curl -X POST http://localhost:3000/api/v1/pest-disease/detect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@./test-image.jpg" \
  -F 'farmId=507f1f77bcf86cd799439012'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "farmerId",
        "message": "Farmer ID is required"
      }
    ]
  }
}
```

**1.2 Invalid Image Format**
```bash
# Upload .txt file
curl -X POST http://localhost:3000/api/v1/pest-disease/detect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@./document.txt" \
  -F 'farmerId=...' \
  -F 'farmId=...'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only JPEG, PNG, WebP, and HEIC images are allowed"
  }
}
```

**1.3 Image Too Large**
```bash
# Upload 15MB image (limit is 10MB)
curl -X POST http://localhost:3000/api/v1/pest-disease/detect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@./large-image.jpg"
```

**Expected Response (413 Payload Too Large):**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Image size exceeds 10MB limit"
  }
}
```

---

### Test Case 2: Get Report Details

**Endpoint**: `GET /reports/:reportId`

**Description**: Retrieve detection results and treatment recommendations.

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/pest-disease/reports/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200 OK) - Completed Report:**
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439013",
    "reportCode": "PDR-000001",
    "reportStatus": "completed",
    "aiDetection": {
      "primaryResult": {
        "detectedEntity": "Fall Armyworm",
        "detectionType": "pest",
        "scientificName": "Spodoptera frugiperda",
        "confidenceScore": 92.5,
        "confidenceLevel": "very_high",
        "severityLevel": "high",
        "affectedArea": {
          "percentage": 35,
          "boundingBoxes": [
            { "x": 120, "y": 80, "width": 200, "height": 150 }
          ]
        }
      },
      "alternativePredictions": [
        {
          "detectedEntity": "Cutworm",
          "confidenceScore": 15.3,
          "detectionType": "pest"
        }
      ],
      "modelMetadata": {
        "modelName": "PlantDisease-ResNet50",
        "modelVersion": "v1.0.0",
        "inferenceEngine": "TensorFlow",
        "processingTime": 2847
      }
    },
    "recommendedTreatment": {
      "isUrgent": true,
      "severity": "high",
      "immediateActions": [
        "Isolate affected plants to prevent spread",
        "Scout adjacent fields for early detection"
      ],
      "chemicalControl": [
        {
          "activIngredient": "Cypermethrin",
          "dosage": "100ml per 20L water",
          "applicationMethod": "Foliar spray",
          "safetyPrecautions": ["Wear protective gear", "Do not spray during flowering"]
        }
      ],
      "organicControl": [
        {
          "method": "Neem extract",
          "materials": ["Neem leaves (500g)", "Water (10L)"],
          "procedure": "Crush neem leaves and soak in water for 24 hours"
        }
      ],
      "culturalPractices": [
        "Remove and destroy affected plant parts",
        "Practice crop rotation"
      ]
    },
    "fieldContext": {
      "cropType": "Maize",
      "growthStage": "vegetative",
      "location": {
        "type": "Point",
        "coordinates": [34.5234, -1.2876]
      }
    },
    "images": [
      {
        "url": "http://localhost:3000/uploads/pest-disease/1707239847_abc123.jpg",
        "thumbnailUrl": "http://localhost:3000/uploads/pest-disease/1707239847_abc123_thumb.jpg"
      }
    ],
    "createdAt": "2024-02-06T10:30:47.000Z",
    "updatedAt": "2024-02-06T10:31:15.000Z"
  }
}
```

**Validation Tests:**

**2.1 Report Not Found**
```bash
curl -X GET http://localhost:3000/api/v1/pest-disease/reports/000000000000000000000000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "REPORT_NOT_FOUND",
    "message": "Detection report not found"
  }
}
```

---

### Test Case 3: Get Farmer's Reports

**Endpoint**: `GET /farmers/:farmerId/reports`

**Description**: List all detection reports for a specific farmer.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/farmers/507f1f77bcf86cd799439011/reports?status=completed&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "reportId": "507f1f77bcf86cd799439013",
      "reportCode": "PDR-000001",
      "reportStatus": "completed",
      "aiDetection": {
        "primaryResult": {
          "detectedEntity": "Fall Armyworm",
          "confidenceScore": 92.5,
          "severityLevel": "high"
        }
      },
      "fieldContext": {
        "cropType": "Maize",
        "farmId": "507f1f77bcf86cd799439012"
      },
      "createdAt": "2024-02-06T10:30:47.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 27,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Query Parameter Tests:**

**3.1 Filter by Status**
```bash
# Pending reports only
curl -X GET "http://localhost:3000/api/v1/pest-disease/farmers/507f1f77bcf86cd799439011/reports?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**3.2 Filter by Detection Type**
```bash
# Pest detections only
curl -X GET "http://localhost:3000/api/v1/pest-disease/farmers/507f1f77bcf86cd799439011/reports?detectionType=pest" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**3.3 Pagination Test**
```bash
# Page 2, 5 items per page
curl -X GET "http://localhost:3000/api/v1/pest-disease/farmers/507f1f77bcf86cd799439011/reports?page=2&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Test Case 4: Submit Expert Review

**Endpoint**: `POST /reports/:reportId/review`

**Description**: Extension officer or agronomist reviews AI detection.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/reports/507f1f77bcf86cd799439013/review \
  -H "Authorization: Bearer EXTENSION_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "confirm",
    "confidence": 95,
    "notes": "Confirmed Fall Armyworm infestation based on whorl damage and frass. Recommend immediate chemical treatment.",
    "additionalRecommendations": "Scout adjacent fields within 48 hours"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439013",
    "expertReview": {
      "reviewedBy": "507f1f77bcf86cd799439020",
      "decision": "confirm",
      "confidence": 95,
      "notes": "Confirmed Fall Armyworm infestation...",
      "reviewedAt": "2024-02-06T14:22:10.000Z"
    },
    "reportStatus": "confirmed"
  }
}
```

**Validation Tests:**

**4.1 Reclassify Detection**
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/reports/507f1f77bcf86cd799439013/review \
  -H "Authorization: Bearer EXTENSION_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "reclassify",
    "correctedDiagnosis": "Cutworm",
    "correctedSeverity": "moderate",
    "confidence": 90,
    "notes": "AI misidentified. Actual pest is Cutworm based on field observations."
  }'
```

**4.2 Reject Detection**
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/reports/507f1f77bcf86cd799439013/review \
  -H "Authorization: Bearer EXTENSION_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "reject",
    "confidence": 95,
    "notes": "No pest or disease detected. Symptoms appear to be mechanical damage."
  }'
```

**4.3 Unauthorized Access (Farmer trying to review)**
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/reports/507f1f77bcf86cd799439013/review \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "decision": "confirm", "confidence": 95 }'
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions. Requires extension_officer or agronomist role."
  }
}
```

---

### Test Case 5: Submit Farmer Feedback

**Endpoint**: `POST /reports/:reportId/feedback`

**Description**: Farmer confirms or corrects AI detection.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/reports/507f1f77bcf86cd799439013/feedback \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isCorrect": true,
    "notes": "Treatment was effective. Infestation cleared after 2 applications of Cypermethrin."
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439013",
    "feedback": {
      "isCorrect": true,
      "notes": "Treatment was effective...",
      "submittedAt": "2024-02-15T08:10:30.000Z"
    }
  }
}
```

**5.1 Incorrect Detection Feedback**
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/reports/507f1f77bcf86cd799439013/feedback \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isCorrect": false,
    "actualDiagnosis": "Drought stress",
    "notes": "Plants recovered after irrigation. Not a pest issue."
  }'
```

---

### Test Case 6: Get Active Outbreaks

**Endpoint**: `GET /outbreaks`

**Description**: List regional pest/disease outbreaks.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/outbreaks?status=active&severity=epidemic" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "outbreakId": "507f1f77bcf86cd799439030",
      "outbreakCode": "OBK-000001",
      "pestOrDisease": "Fall Armyworm",
      "detectionType": "pest",
      "outbreakSeverity": "epidemic",
      "severityIndex": 87,
      "region": {
        "name": "Central Region",
        "adminLevel": "region",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[34.5, -1.0], [34.8, -1.0], [34.8, -1.3], [34.5, -1.3], [34.5, -1.0]]]
        }
      },
      "affectedCrops": [
        { "cropType": "Maize", "reportsCount": 127 },
        { "cropType": "Sorghum", "reportsCount": 23 }
      ],
      "timeline": [
        {
          "date": "2024-02-01",
          "reportCount": 12,
          "severityIndex": 45
        },
        {
          "date": "2024-02-06",
          "reportCount": 47,
          "severityIndex": 87
        }
      ],
      "predictedSpread": {
        "direction": "Northeast",
        "speed": "rapid",
        "atRiskAreas": ["Eastern Region", "Northern Region"]
      },
      "advisoryMessage": "Urgent action required. Fall Armyworm outbreak spreading rapidly. All farmers in Central Region should scout fields daily and apply recommended treatments immediately.",
      "firstReportDate": "2024-01-28T00:00:00.000Z",
      "lastUpdated": "2024-02-06T10:31:15.000Z"
    }
  ]
}
```

**Query Tests:**

**6.1 Filter by Region**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/outbreaks?region=Central" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**6.2 Filter by Pest/Disease**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/outbreaks?pestOrDisease=Late Blight" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**6.3 Filter by Crop**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/outbreaks?cropType=Maize" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Test Case 7: Get Hotspots

**Endpoint**: `GET /outbreaks/hotspots`

**Description**: Geospatial clustering of high-intensity outbreak zones.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/outbreaks/hotspots?detectionType=pest&days=30&radius=50" \
  -H "Authorization: Bearer ANALYST_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "location": [34.5234, -1.2876],
      "pestOrDisease": "Fall Armyworm",
      "detectionType": "pest",
      "reportCount": 47,
      "farmsAffected": 32,
      "severityIndex": 85,
      "radius": 50,
      "clusterBounds": {
        "type": "Polygon",
        "coordinates": [[[...circle approximation...]]]
      }
    },
    {
      "location": [34.7123, -1.1234],
      "pestOrDisease": "Late Blight",
      "detectionType": "disease",
      "reportCount": 23,
      "farmsAffected": 18,
      "severityIndex": 72,
      "radius": 50
    }
  ]
}
```

**7.1 Unauthorized Access (Farmer trying to access)**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/outbreaks/hotspots" \
  -H "Authorization: Bearer FARMER_TOKEN"
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Requires analyst role"
  }
}
```

---

### Test Case 8: Get Analytics Trends

**Endpoint**: `GET /analytics/trends`

**Description**: Compare pest/disease trends across time periods.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/analytics/trends?currentPeriod=30&previousPeriod=30" \
  -H "Authorization: Bearer ANALYST_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "currentPeriod": {
      "startDate": "2024-01-07",
      "endDate": "2024-02-06",
      "reportCount": 234,
      "averageSeverity": 6.7,
      "topPestsAndDiseases": [
        { "name": "Fall Armyworm", "count": 127 },
        { "name": "Late Blight", "count": 45 }
      ]
    },
    "previousPeriod": {
      "startDate": "2023-12-08",
      "endDate": "2024-01-07",
      "reportCount": 156,
      "averageSeverity": 5.2,
      "topPestsAndDiseases": [
        { "name": "Aphids", "count": 89 },
        { "name": "Fall Armyworm", "count": 34 }
      ]
    },
    "comparison": {
      "reportCountChange": 50,
      "reportCountChangePercent": +50.0,
      "severityChange": +1.5,
      "trend": "increasing",
      "emergingThreats": ["Fall Armyworm"],
      "decliningThreats": ["Aphids"]
    }
  }
}
```

---

### Test Case 9: Get Dashboard Analytics

**Endpoint**: `GET /analytics/dashboard`

**Description**: Comprehensive analytics for management dashboard.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/analytics/dashboard?startDate=2024-01-01&endDate=2024-02-06" \
  -H "Authorization: Bearer ANALYST_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReports": 542,
      "pendingReports": 12,
      "completedReports": 487,
      "awaitingReview": 23,
      "averageConfidence": 82.3,
      "averageSeverity": 6.4
    },
    "detectionBreakdown": {
      "byType": [
        { "type": "pest", "count": 320 },
        { "type": "disease", "count": 178 },
        { "type": "nutrient_deficiency", "count": 44 }
      ],
      "bySeverity": [
        { "severity": "very_high", "count": 89 },
        { "severity": "high", "count": 167 },
        { "severity": "moderate", "count": 203 },
        { "severity": "low", "count": 83 }
      ]
    },
    "topPestsAndDiseases": [
      { "name": "Fall Armyworm", "count": 127, "severityIndex": 85 },
      { "name": "Late Blight", "count": 89, "severityIndex": 78 }
    ],
    "cropVulnerability": [
      { "cropType": "Maize", "reportCount": 234, "averageSeverity": 7.2 },
      { "cropType": "Tomato", "reportCount": 123, "averageSeverity": 6.8 }
    ],
    "expertReviewMetrics": {
      "totalReviews": 146,
      "confirmed": 112,
      "rejected": 18,
      "reclassified": 16,
      "averageReviewTime": 14.5
    },
    "outbreaks": {
      "active": 5,
      "contained": 2,
      "resolved": 12
    }
  }
}
```

---

### Test Case 10: Search Treatment Knowledge

**Endpoint**: `GET /treatments/search`

**Description**: Search treatment knowledge base.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/treatments/search?q=blight" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439040",
      "pestOrDiseaseName": "Late Blight",
      "scientificName": "Phytophthora infestans",
      "detectionType": "disease",
      "category": "Fungal Disease",
      "affectedCrops": ["Tomato", "Potato"],
      "symptoms": {
        "description": "Water-soaked lesions on leaves and stems...",
        "visual": ["Water-soaked lesions", "White fungal growth"]
      },
      "treatment": {
        "chemical": [...],
        "organic": [...],
        "biological": [...]
      },
      "preventiveMeasures": [...]
    },
    {
      "id": "507f1f77bcf86cd799439041",
      "pestOrDiseaseName": "Early Blight",
      "scientificName": "Alternaria solani",
      ...
    }
  ]
}
```

**10.1 Filter by Crop**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/treatments/search?q=blight&cropType=Tomato" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**10.2 Filter by Detection Type**
```bash
curl -X GET "http://localhost:3000/api/v1/pest-disease/treatments/search?q=worm&detectionType=pest" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Test Case 11: Create Treatment Knowledge Entry

**Endpoint**: `POST /treatments`

**Description**: Add new pest/disease information to knowledge base (Admin/Agronomist only).

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/pest-disease/treatments \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pestOrDiseaseName": "Maize Streak Virus",
    "scientificName": "Maize streak virus",
    "detectionType": "disease",
    "category": "Viral Disease",
    "affectedCrops": ["Maize"],
    "symptoms": {
      "description": "Chlorotic streaks on leaves parallel to veins, stunted growth",
      "visual": ["Yellow streaks on leaves", "Stunted plants", "Reduced yield"]
    },
    "favorableConditions": {
      "temperatureRange": { "min": 25, "max": 35, "unit": "celsius" },
      "humidityRange": { "min": 60, "max": 80 },
      "rainfallPattern": "Warm, wet conditions"
    },
    "treatment": {
      "chemical": [],
      "organic": [],
      "biological": [],
      "cultural": [
        {
          "practice": "Vector control",
          "description": "Control leafhopper populations that transmit the virus",
          "timing": "Throughout growing season"
        }
      ]
    },
    "preventiveMeasures": [
      {
        "practice": "Use resistant varieties",
        "description": "Plant certified MSV-resistant maize varieties",
        "effectiveness": "very high"
      },
      {
        "practice": "Rogue infected plants",
        "description": "Remove and destroy infected plants early",
        "effectiveness": "medium"
      }
    ],
    "sources": [
      {
        "title": "CIMMYT Maize Diseases Guide",
        "url": "https://www.cimmyt.org",
        "year": 2023
      }
    ]
  }'
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439050",
    "pestOrDiseaseName": "Maize Streak Virus",
    "version": 1,
    "isPublished": false,
    "reviewStatus": "pending",
    "createdBy": "507f1f77bcf86cd799439020",
    "createdAt": "2024-02-06T15:30:00.000Z"
  }
}
```

---

## 📊 Postman Collection

### Import Instructions

1. Create new Postman Collection: "ClyCites - Pest & Disease Detection"
2. Add environment variables:
   - `baseUrl`: http://localhost:3000/api/v1/pest-disease
   - `authToken`: (paste your JWT token)
3. Add requests from test cases above
4. Use `{{baseUrl}}` and `{{authToken}}` in requests

### Collection Structure

```
ClyCites - Pest & Disease Detection/
├── Authentication/
│   └── Login
├── Detection/
│   ├── Submit Detection
│   ├── Get Report
│   └── Get Farmer Reports
├── Expert Review/
│   ├── Submit Review (Confirm)
│   ├── Submit Review (Reclassify)
│   └── Submit Review (Reject)
├── Feedback/
│   └── Submit Farmer Feedback
├── Outbreaks/
│   ├── Get Active Outbreaks
│   └── Get Hotspots
├── Analytics/
│   ├── Get Trends
│   └── Get Dashboard
└── Treatment Knowledge/
    ├── Search Treatments
    └── Create Treatment Entry
```

---

## ✅ Test Checklist

### Functionality Tests
- [ ] Submit detection with multiple images
- [ ] Poll report until status = completed
- [ ] Verify AI detection results
- [ ] Verify treatment recommendations
- [ ] Submit expert review (confirm)
- [ ] Submit expert review (reclassify)
- [ ] Submit expert review (reject)
- [ ] Submit farmer feedback
- [ ] Get active outbreaks
- [ ] Get hotspots (analyst only)
- [ ] Get analytics trends
- [ ] Get dashboard analytics
- [ ] Search treatment knowledge
- [ ] Create treatment entry (admin only)

### Validation Tests
- [ ] Missing required fields
- [ ] Invalid image format
- [ ] Image too large (>10MB)
- [ ] Invalid coordinates
- [ ] Invalid crop type
- [ ] Missing consent
- [ ] Report not found (404)
- [ ] Unauthorized access (403)

### Authorization Tests
- [ ] Farmer can submit detection
- [ ] Farmer cannot access analytics
- [ ] Extension officer can submit review
- [ ] Only analyst can access hotspots
- [ ] Only admin/agronomist can create treatments

### Edge Cases
- [ ] Submit 10 images (maximum)
- [ ] Submit 11 images (should fail)
- [ ] Very low confidence detection (expert review flagged)
- [ ] Outbreak detection with exactly threshold reports
- [ ] Paginated results with no next page

---

## 🔧 Automated Testing Script

### Using Newman (Postman CLI)

```bash
# Install Newman
npm install -g newman

# Run collection
newman run pest-disease-collection.json \
  --environment pest-disease-env.json \
  --reporters cli,json \
  --reporter-json-export ./test-results.json
```

### Using Jest

Create `tests/pest-disease.integration.test.ts`:

```typescript
import request from 'supertest';
import app from '../src/app';

describe('Pest & Disease Detection API', () => {
  let authToken: string;
  let reportId: string;
  
  beforeAll(async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'farmer@example.com', password: 'password123' });
    authToken = response.body.data.token;
  });
  
  describe('POST /detect', () => {
    it('should submit detection request', async () => {
      const response = await request(app)
        .post('/api/v1/pest-disease/detect')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', './test-images/maize-leaf.jpg')
        .field('farmerId', '507f1f77bcf86cd799439011')
        .field('farmId', '507f1f77bcf86cd799439012')
        .field('fieldContext', JSON.stringify({
          cropType: 'Maize',
          growthStage: 'vegetative',
          longitude: 34.5,
          latitude: -1.2
        }))
        .field('consent', JSON.stringify({
          agreedToAIAnalysis: true,
          agreedToDataSharing: true,
          consentVersion: 'v1.0'
        }));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reportCode).toMatch(/^PDR-/);
      reportId = response.body.data.reportId;
    });
    
    it('should reject invalid image format', async () => {
      const response = await request(app)
        .post('/api/v1/pest-disease/detect')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', './test-files/document.txt');
      
      expect(response.status).toBe(400);
    });
  });
  
  // Add more test cases...
});
```

---

## 📝 Test Results Template

Document test results in this format:

```markdown
## Test Execution Report
**Date**: 2024-02-06
**Tester**: John Doe
**Environment**: Development

### Summary
- Total Tests: 50
- Passed: 47
- Failed: 3
- Skipped: 0

### Failed Tests
1. **Test Case 7.1** - Hotspot access control
   - Expected: 403 Forbidden
   - Actual: 200 OK
   - Issue: Authorization middleware not checking analyst role
   - Severity: High
   
2. **Test Case 1.3** - Image size validation
   - Expected: 413 Payload Too Large
   - Actual: Server timeout
   - Issue: Multer not enforcing size limit
   - Severity: Medium

### Recommendations
- Fix authorization check for hotspot endpoint
- Configure Multer fileSize limit
- Add integration tests for AI provider timeout scenarios
```

---

**Testing Guide Version**: 1.0.0  
**Last Updated**: February 2026
