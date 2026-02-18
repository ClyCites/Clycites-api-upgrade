# E-Market API Quick Reference
## ClyCites Marketplace API Endpoints

### Base URL
```
Production: https://api.clycites.com/v1
Development: http://localhost:3000/api
```

### Authentication
All endpoints require JWT bearer token:
```
Authorization: Bearer <token>
```

---

## Offers & Negotiation

### Create Offer
```http
POST /api/offers
Content-Type: application/json

{
  "listing": "65e8f1a2b3c4d5e6f7a8b9c0",
  "quantity": 500,
  "unitPrice": 3500,
  "deliveryOption": "seller_delivery",
  "deliveryAddress": {
    "region": "Central",
    "district": "Kampala",
    "phone": "+256700000000",
    "recipientName": "John Doe"
  },
  "terms": {
    "paymentTerms": "50% advance, 50% on delivery",
    "deliveryTerms": "Within 7 days"
  },
  "expiresIn": 48
}
```

### Get User Offers
```http
GET /api/offers?type=sent&status=pending&page=1&limit=20
GET /api/offers?type=received&status=pending
```

### Counter Offer
```http
POST /api/offers/:offerId/counter

{
  "unitPrice": 3800,
  "quantity": 450,
  "deliveryDate": "2026-03-15",
  "notes": "Can deliver earlier at this price"
}
```

### Accept Offer
```http
POST /api/offers/:offerId/accept

{
  "notes": "Accepted. Please proceed with delivery"
}

Response: {
  success: true,
  data: {
    offer: {...},
    order: {...}  // Auto-created order
  }
}
```

### Reject Offer
```http
POST /api/offers/:offerId/reject

{
  "reason": "Price too high for current market"
}
```

### Add Message
```http
POST /api/offers/:offerId/messages

{
  "message": "Can you guarantee Grade A quality?"
}
```

---

## Reputation & Trust

### Create Rating
```http
POST /api/reputation/ratings

{
  "order": "65e8f1a2b3c4d5e6f7a8b9c0",
  "overallRating": 5,
  "categoryRatings": {
    "productQuality": 5,
    "communication": 5,
    "packaging": 4,
    "delivery": 5,
    "pricing": 4
  },
  "review": "Excellent quality maize, well-packaged and delivered on time.",
  "pros": ["High quality", "On-time delivery", "Good communication"],
  "cons": ["Slightly expensive"],
  "wouldRecommend": true,
  "wouldBuyAgain": true
}
```

### Get User Ratings
```http
GET /api/reputation/users/:userId/ratings?role=buyer&page=1&limit=20
```

### Get Reputation Score
```http
GET /api/reputation/users/:userId/score

Response: {
  user: "65e8f1a2b3c4d5e6f7a8b9c0",
  overallScore: 87,
  trustLevel: "gold",
  ratings: {
    average: 4.6,
    count: 143,
    distribution: {
      five: 98,
      four: 32,
      three: 10,
      two: 2,
      one: 1
    }
  },
  transactions: {
    total: 152,
    completed: 146,
    completionRate: 96.05,
    asSellerCount: 89,
    asBuyerCount: 63
  },
  behavior: {
    responseTime: 45,  // minutes
    responseRate: 94.5,
    onTimeDeliveryRate: 92.3
  },
  verifications: [
    { type: "phone", verified: true },
    { type: "identity", verified: true },
    { type: "farm", verified: true }
  ],
  badges: [
    { type: "top_seller", awardedAt: "2026-01-15" },
    { type: "verified_farmer", awardedAt: "2025-12-10" }
  ]
}
```

### Add Seller Response
```http
POST /api/reputation/ratings/:ratingId/response

{
  "message": "Thank you for your feedback! We're glad you enjoyed our produce."
}
```

### Get Top Rated Users
```http
GET /api/reputation/top-rated?userType=farmer&limit=10
```

---

## Market Intelligence

### Get Market Insights
```http
GET /api/market-intelligence/insights?product=65e8f1&region=Central&period=daily
```

### Get Price Recommendation
```http
GET /api/market-intelligence/price-recommendation
  ?product=65e8f1a2b3c4d5e6f7a8b9c0
  &quantity=500
  &quality=grade-a
  &region=Central

Response: {
  recommended: 3500,
  range: {
    min: 3000,
    max: 4000
  },
  confidence: 85,
  marketTrend: "stable",
  message: "Based on 127 data points with 85% confidence"
}
```

### Create Price Alert
```http
POST /api/market-intelligence/alerts

{
  "product": "65e8f1a2b3c4d5e6f7a8b9c0",
  "region": "Central",
  "alertType": "price_drop",
  "condition": {
    "operator": "below",
    "threshold": 3000
  },
  "notificationChannels": ["email", "sms", "push"],
  "frequency": "instant"
}
```

---

## Payments (Foundation)

### Get Wallet Balance
```http
GET /api/payments/wallet

Response: {
  balance: 150000,
  escrowBalance: 50000,
  availableBalance: 100000,
  currency: "UGX"
}
```

### Initiate Escrow
```http
POST /api/payments/escrow/initiate

{
  "orderId": "65e8f1a2b3c4d5e6f7a8b9c0",
  "amount": 1750000
}
```

### Release Escrow
```http
POST /api/payments/escrow/:escrowId/release

{
  "notes": "Order delivered successfully"
}
```

### Get Transaction History
```http
GET /api/payments/transactions?type=payment&status=completed&page=1&limit=20
```

---

## Product Listings (Enhanced)

### Create Listing with Geo-Coordinates
```http
POST /api/marketplace/listings

{
  "product": "65e8f1a2b3c4d5e6f7a8b9c0",
  "title": "Premium Grade-A Maize",
  "description": "Freshly harvested, high-quality maize...",
  "quantity": 1000,
  "unit": "kg",
  "price": 3500,
  "pricePerUnit": 3500,
  "grade": "grade-a",
  "location": {
    "type": "Point",
    "coordinates": [32.5825, 0.3476]  // [longitude, latitude]
  },
  "address": {
    "region": "Central",
    "district": "Kampala",
    "subcounty": "Makindye",
    "farmName": "Green Valley Farm"
  },
  "harvestDate": "2026-02-10",
  "availableFrom": "2026-02-15",
  "storageCondition": "fresh",
  "certifications": ["organic"],
  "images": ["https://...", "https://..."],
  "deliveryOptions": ["pickup", "delivery"],
  "paymentMethods": ["cash", "mobile_money", "escrow"]
}
```

### Search Listings by Location
```http
GET /api/marketplace/listings/nearby
  ?latitude=0.3476
  &longitude=32.5825
  &maxDistance=50  // km
  &product=65e8f1a2b3c4d5e6f7a8b9c0
```

---

## Orders (Enhanced)

### Get Order with Fulfillment Status
```http
GET /api/orders/:orderId

Response: {
  orderNumber: "ORD-260215-001234",
  status: "in_transit",
  paymentStatus: "escrow",
  fulfillment: {
    preparedAt: "2026-02-15T08:00:00Z",
    qualityCheckedAt: "2026-02-15T09:00:00Z",
    qualityCheckPassed: true,
    packagedAt: "2026-02-15T10:00:00Z",
    dispatchedAt: "2026-02-15T11:00:00Z",
    trackingNumber: "TRK-123456",
    currentLocation: {
      type: "Point",
      coordinates: [32.6, 0.4]
    },
    driverInfo: {
      name: "Peter Musoke",
      phone: "+256700000000"
    }
  },
  timeline: [
    { event: "order_created", timestamp: "..." },
    { event: "payment_escrowed", timestamp: "..." },
    { event: "order_prepared", timestamp: "..." },
    { event: "quality_checked", timestamp: "..." },
    { event: "order_dispatched", timestamp: "..." }
  ]
}
```

### Update Fulfillment Status
```http
PUT /api/orders/:orderId/fulfillment

{
  "status": "in_transit",
  "currentLocation": {
    "coordinates": [32.6, 0.4]
  },
  "notes": "Package en route to Kampala"
}
```

---

## Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Sorting
```
?sortBy=createdAt&sortOrder=desc
```

### Filtering
```
?status=active&region=Central&minPrice=1000&maxPrice=5000
```

### Date Ranges
```
?startDate=2026-02-01&endDate=2026-02-28
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response payload
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "statusCode": 400
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  }
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limits

- **Standard Users:** 100 requests / 15 minutes
- **Verified Users:** 200 requests / 15 minutes
- **Premium Users:** 500 requests / 15 minutes

---

## Webhooks (Future)

Subscribe to events:
- `offer.created`
- `offer.accepted`
- `offer.rejected`
- `order.created`
- `order.delivered`
- `payment.completed`
- `rating.created`

---

## SDKs (Planned)

- JavaScript/TypeScript
- Python
- PHP
- Mobile (React Native)

---

For complete documentation, see [E_MARKET_COMPLETE_GUIDE.md](./E_MARKET_COMPLETE_GUIDE.md)
