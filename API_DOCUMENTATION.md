# ClyCites API - Complete API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
Most endpoints require authentication using JWT Bearer tokens.

**Header Format:**
```
Authorization: Bearer <access_token>
```

---

## 1. Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phone": "+256700000000",
  "role": "farmer" // or "buyer", "trader", "expert"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "...", "role": "..." },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Refresh Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

---

## 2. Farmers Endpoints

### Create Farmer Profile
```http
POST /farmers
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessName": "Green Valley Farms",
  "farmSize": 50,
  "location": {
    "region": "Central",
    "district": "Kampala",
    "subcounty": "Makindye"
  },
  "farmingType": ["crop_farming", "livestock"],
  "mainProducts": ["maize", "beans"],
  "certifications": ["organic", "gap"]
}
```

### Get My Farmer Profile
```http
GET /farmers/me
Authorization: Bearer <token>
```

### Get Farmer by ID
```http
GET /farmers/:id
```

### Update Farmer Profile
```http
PUT /farmers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessName": "Updated Farm Name",
  "farmSize": 75
}
```

### List All Farmers
```http
GET /farmers?page=1&limit=10&region=Central&verified=true
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `region`: Filter by region
- `district`: Filter by district
- `verified`: Filter verified farmers (true/false)
- `farmingType`: Filter by farming type

### Create Farm
```http
POST /farmers/farms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "North Field",
  "size": 25,
  "location": {
    "region": "Central",
    "district": "Kampala"
  },
  "soilType": "loam",
  "waterSource": ["borehole", "rain"],
  "crops": ["maize", "beans"]
}
```

### Get Farmer's Farms
```http
GET /farmers/:farmerId/farms
```

### Get Farm by ID
```http
GET /farmers/farms/:id
```

### Update Farm
```http
PUT /farmers/farms/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Field Name",
  "size": 30
}
```

### Delete Farm
```http
DELETE /farmers/farms/:id
Authorization: Bearer <token>
```

---

## 3. Products Endpoints

### Create Product (Admin Only)
```http
POST /products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Maize",
  "category": "grains",
  "variety": "Yellow Maize",
  "description": "High quality maize",
  "unit": "kg",
  "minOrderQuantity": 50
}
```

**Categories:** `grains`, `vegetables`, `fruits`, `livestock`, `dairy`, `other`
**Units:** `kg`, `ton`, `bag`, `piece`, `liter`, `crate`

### Get All Products
```http
GET /products?page=1&limit=20&category=grains&search=maize
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `category`: Filter by category
- `search`: Search in name/description

### Get Product by ID
```http
GET /products/:id
```

### Get Products by Category
```http
GET /products/category/:category
```

### Update Product (Admin Only)
```http
PUT /products/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Product Name",
  "minOrderQuantity": 100
}
```

### Delete Product (Admin Only)
```http
DELETE /products/:id
Authorization: Bearer <admin_token>
```

---

## 4. Marketplace Listings Endpoints

### Create Listing
```http
POST /listings
Authorization: Bearer <farmer_token>
Content-Type: application/json

{
  "product": "product_id",
  "title": "Fresh Yellow Maize - Premium Quality",
  "description": "Freshly harvested maize",
  "quantity": 500,
  "price": 2500,
  "quality": "premium",
  "harvestDate": "2024-01-15",
  "availableFrom": "2024-01-20",
  "availableUntil": "2024-03-20",
  "deliveryOptions": ["pickup", "local_delivery", "regional_delivery"],
  "location": {
    "region": "Central",
    "district": "Kampala",
    "subcounty": "Makindye"
  }
}
```

**Quality Levels:** `premium`, `standard`, `economy`
**Delivery Options:** `pickup`, `local_delivery`, `regional_delivery`, `national_delivery`

### Search Listings
```http
GET /listings?search=maize&region=Central&minPrice=2000&maxPrice=3000&quality=premium&page=1&limit=20
```

**Query Parameters:**
- `search`: Text search in title/description
- `product`: Filter by product ID
- `farmer`: Filter by farmer ID
- `quality`: Filter by quality level
- `region`: Filter by region
- `district`: Filter by district
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `minQuantity`: Minimum quantity
- `deliveryOption`: Filter by delivery option
- `availableFrom`: Available from date
- `availableUntil`: Available until date
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (asc/desc)

### Get Listing by ID
```http
GET /listings/:id
```

### Get My Listings
```http
GET /listings/my/listings?status=active
Authorization: Bearer <farmer_token>
```

### Get My Listing Stats
```http
GET /listings/my/stats
Authorization: Bearer <farmer_token>
```

### Update Listing
```http
PUT /listings/:id
Authorization: Bearer <farmer_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "price": 2700,
  "quantity": 450
}
```

### Update Listing Status
```http
PATCH /listings/:id/status
Authorization: Bearer <farmer_token>
Content-Type: application/json

{
  "status": "sold"
}
```

**Status Values:** `active`, `sold`, `expired`, `inactive`

### Delete Listing
```http
DELETE /listings/:id
Authorization: Bearer <farmer_token>
```

### Record Inquiry
```http
POST /listings/:id/inquire
```

---

## 5. Orders Endpoints

### Create Order
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "listing": "listing_id",
  "quantity": 100,
  "deliveryAddress": {
    "region": "Central",
    "district": "Kampala",
    "subcounty": "Makindye",
    "village": "Kibuye",
    "street": "Plot 123",
    "landmark": "Near police station",
    "phone": "+256700000000",
    "recipientName": "John Doe"
  },
  "deliveryOption": "local_delivery",
  "notes": "Please call before delivery"
}
```

### Get My Orders
```http
GET /orders/my-orders?status=pending&page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by order status
- `paymentStatus`: Filter by payment status
- `page`: Page number
- `limit`: Items per page

### Get Order by ID
```http
GET /orders/:id
Authorization: Bearer <token>
```

### Get Farmer Orders
```http
GET /orders/farmer/orders?status=confirmed
Authorization: Bearer <farmer_token>
```

### Update Order Status (Farmer/Admin)
```http
PATCH /orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed"
}
```

**Order Statuses:** `pending`, `confirmed`, `processing`, `in_transit`, `delivered`, `completed`, `cancelled`

### Cancel Order
```http
POST /orders/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed my mind about the purchase"
}
```

### Get Order Stats
```http
GET /orders/my-stats
Authorization: Bearer <token>
```

---

## 6. Notifications Endpoints

### Get My Notifications
```http
GET /notifications?type=order&read=false&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: Filter by type (order, payment, listing, message, system, marketing)
- `read`: Filter by read status (true/false)
- `page`: Page number
- `limit`: Items per page

### Get Unread Count
```http
GET /notifications/unread-count
Authorization: Bearer <token>
```

### Get Notification by ID
```http
GET /notifications/:id
Authorization: Bearer <token>
```

### Mark as Read
```http
PATCH /notifications/:id/read
Authorization: Bearer <token>
```

### Mark All as Read
```http
PATCH /notifications/mark-all-read
Authorization: Bearer <token>
```

### Delete Notification
```http
DELETE /notifications/:id
Authorization: Bearer <token>
```

---

## 7. Analytics Endpoints

### Market Overview
```http
GET /analytics/overview
```

**Response:**
```json
{
  "listings": { "total": 500, "active": 350 },
  "orders": { "total": 1200, "avgValue": 150000 },
  "revenue": { "total": 180000000 },
  "users": { "farmers": 150, "verifiedFarmers": 120, "buyers": 800 }
}
```

### Price Trends
```http
GET /analytics/price-trends?product=product_id&region=Central&days=30
```

### Product Demand Analysis
```http
GET /analytics/demand?category=grains&region=Central&days=30
```

### Supply Analysis
```http
GET /analytics/supply?category=grains&region=Central
```

### Regional Analysis
```http
GET /analytics/regional
```

### Market Health
```http
GET /analytics/market-health
```

### My Performance (Farmer)
```http
GET /analytics/my-performance?days=30
Authorization: Bearer <farmer_token>
```

### Farmer Performance (Admin)
```http
GET /analytics/farmer/:farmerId?days=30
Authorization: Bearer <admin_token>
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ErrorType",
  "stack": "..." // Only in development
}
```

## HTTP Status Codes

- `200 OK`: Successful GET/PUT/PATCH/DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Validation error or invalid request
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limits

- **Auth endpoints**: 5 requests per 15 minutes
- **General API**: 100 requests per 15 minutes
- **Create operations**: 50 requests per hour

---

## Testing with cURL

### Register and Login
```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@example.com","password":"Pass123!","phone":"+256700000000","role":"farmer"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@example.com","password":"Pass123!"}'

# Get current user
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Listing
```bash
curl -X POST http://localhost:5000/api/v1/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "product":"PRODUCT_ID",
    "title":"Fresh Maize",
    "quantity":500,
    "price":2500,
    "quality":"premium",
    "deliveryOptions":["pickup","local_delivery"],
    "location":{"region":"Central","district":"Kampala"}
  }'
```

### Search Listings
```bash
curl "http://localhost:5000/api/v1/listings?search=maize&region=Central&minPrice=2000"
```

---

## Postman Collection

Import this collection to test all endpoints: [Link to Postman Collection]

## WebSocket Support (Coming Soon)

Real-time features for:
- Order status updates
- New messages
- Price alerts
- Marketplace updates

---

## Support

For API support, contact: support@clycites.com
Documentation: https://docs.clycites.com
