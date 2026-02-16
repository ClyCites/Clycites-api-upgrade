# ClyCites API - Agricultural E-Market Platform

[![Node.js](https://img.shields.io/badge/Node.js-22.11-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🌾 Overview

ClyCites is a comprehensive digital agricultural e-market platform that connects farmers directly with buyers, providing transparent pricing, secure transactions, market intelligence, and logistics coordination. Built with modern TypeScript, Express.js, and MongoDB, the platform features advanced search, real-time analytics, multi-channel notifications, and role-based access control.

**🎯 Mission**: Empower African farmers with technology to increase income, reduce post-harvest losses, and improve market access.

## ✨ Core Features

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens
- OTP email verification for account security
- Password reset functionality
- Role-based access control (Admin, Farmer, Buyer, Expert, Trader)
- Secure password hashing with bcrypt
- Rate limiting to prevent abuse

### 👨‍🌾 Farmer Management
- Complete farmer profile management
- Multiple farm management
- Farm details (size, location, soil type, water sources, crops)
- Verification system for trusted farmers
- Performance analytics and ratings

### 🥕 Product Catalog
- Comprehensive product database
- Categories: Grains, Vegetables, Fruits, Livestock, Dairy
- Product variants and specifications
- Unit management (kg, ton, bag, piece, liter, crate)
- Minimum order quantities

### 🛒 Marketplace
- Advanced listing system with quality grades (Premium, Standard, Economy)
- Multi-criteria search and filtering:
  - By product, region, district
  - Price range filtering
  - Quality filtering
  - Availability dates
- Delivery options (pickup, local, regional, national)
- View tracking and inquiry counting
- Listing analytics for farmers

### 📦 Order Management
- Complete order lifecycle:
  - Pending → Confirmed → Processing → In Transit → Delivered → Completed
- Automatic order numbering system
- Order cancellation with reason tracking
- Detailed delivery address management
- Order statistics and history
- Farmer and buyer order views

### 📊 Analytics & Market Intelligence
- Market overview dashboard
- Price trend analysis
- Product demand forecasting
- Supply analysis by region
- Farmer performance metrics
- Regional market analysis
- Market health indicators
- Fulfillment rate tracking
- Return buyer rate analytics

### 🔔 Notifications
- Multi-channel notifications:
  - Email notifications
  - SMS notifications (integration ready)
  - Push notifications (integration ready)
  - In-app notifications
- Notification types: Order, Payment, Listing, Message, System, Marketing
- Priority levels: Low, Medium, High, Urgent
- Unread count tracking
- Notification preferences

### 🌱 **Pest & Disease Detection** ⭐ NEW
- AI-assisted image diagnosis for crop pests and diseases
- Regional outbreak intelligence and geospatial analytics
- Treatment recommendations (chemical, organic, biological)
- Expert review workflow for quality assurance
- Farmer feedback loop for model improvement
- Multi-image upload with automatic analysis
- Confidence scoring and severity assessment
- **[→ View Full Documentation](./PEST_DISEASE_README.md)**

### 💡 Additional Features
- Pagination support on all list endpoints
- Comprehensive input validation
- Structured error handling
- Request/response logging
- CORS support
- API versioning (/api/v1)
- Health check endpoint

## 🏗️ Project Structure

```
src/
├── modules/                    # Feature modules
│   ├── auth/                  # Authentication & authorization
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.validator.ts
│   │   ├── otp.model.ts
│   │   └── refreshToken.model.ts
│   ├── users/                 # User management
│   │   ├── user.model.ts
│   │   └── role.model.ts
│   ├── farmers/               # Farmer profiles & farms
│   │   ├── farmer.model.ts
│   │   ├── farm.model.ts
│   │   ├── farmer.service.ts
│   │   ├── farmer.controller.ts
│   │   ├── farmer.validator.ts
│   │   └── farmer.routes.ts
│   ├── products/              # Product catalog
│   │   ├── product.model.ts
│   │   ├── product.service.ts
│   │   ├── product.controller.ts
│   │   ├── product.validator.ts
│   │   └── product.routes.ts
│   ├── marketplace/           # Listings & marketplace
│   │   ├── listing.model.ts
│   │   ├── listing.service.ts
│   │   ├── listing.controller.ts
│   │   ├── listing.validator.ts
│   │   └── listing.routes.ts
│   ├── orders/                # Order management
│   │   ├── order.model.ts
│   │   ├── order.service.ts
│   │   ├── order.controller.ts
│   │   ├── order.validator.ts
│   │   └── order.routes.ts
│   ├── notifications/         # Notification service
│   │   ├── notification.model.ts
│   │   ├── notification.service.ts
│   │   ├── notification.controller.ts
│   │   ├── notification.validator.ts
│   │   └── notification.routes.ts
│   ├── pest-disease/          # 🌱 Pest & Disease Detection (NEW)
│   │   ├── pestDisease.types.ts
│   │   ├── models/
│   │   │   ├── pestDiseaseReport.model.ts
│   │   │   ├── regionalOutbreak.model.ts
│   │   │   └── treatmentKnowledgeBase.model.ts
│   │   ├── services/
│   │   │   ├── pestDisease.service.ts
│   │   │   ├── aiDetection.service.ts
│   │   │   ├── imageStorage.service.ts
│   │   │   └── outbreakAnalytics.service.ts
│   │   ├── pestDisease.controller.ts
│   │   ├── pestDisease.validator.ts
│   │   ├── pestDisease.routes.ts
│   │   └── index.ts
│   └── analytics/             # Market intelligence
│       ├── analytics.service.ts
│       ├── analytics.controller.ts
│       ├── analytics.validator.ts
│       └── analytics.routes.ts
├── common/                     # Shared utilities
│   ├── config/                # Configuration
│   │   └── index.ts
│   ├── database/              # Database connection
│   │   └── connection.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.ts           # JWT authentication
│   │   ├── authorize.ts       # RBAC authorization
│   │   ├── errorHandler.ts    # Global error handler
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   └── validate.ts        # Input validation
│   ├── utils/                 # Utility functions
│   │   ├── logger.ts         # Winston logging
│   │   ├── response.ts        # Response formatter
│   │   ├── password.ts        # Password utilities
│   │   ├── token.ts          # JWT utilities
│   │   ├── otp.ts            # OTP generation
│   │   ├── pagination.ts      # Pagination helper
│   │   └── email.ts          # Email service
│   └── errors/                # Error classes
│       └── AppError.ts
├── app.ts                      # Express application setup
├── routes.ts                   # Central route registration
└── server.ts                   # Server entry point
├── routes.ts            # Route registration
└── app.ts               # Application entry point
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Clycites-api-upgrade
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on your system
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## 📝 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login user | ❌ |
| POST | `/auth/refresh-token` | Refresh access token | ❌ |
| POST | `/auth/logout` | Logout user | ❌ |
| POST | `/auth/verify-otp` | Verify OTP code | ❌ |
| POST | `/auth/resend-otp` | Resend OTP | ❌ |
| POST | `/auth/forgot-password` | Request password reset | ❌ |
| POST | `/auth/reset-password` | Reset password | ❌ |
| GET | `/auth/me` | Get current user | ✅ |

### Example: Register User

**Request:**
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "farmer@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+256700000000",
  "role": "farmer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "farmer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "farmer",
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "15m"
    }
  },
  "meta": {
    "timestamp": "2026-02-03T10:00:00.000Z"
  }
}
```

### Health Check

```bash
GET /api/v1/health
```

Response:
```json
{
  "success": true,
  "message": "ClyCites API is running",
  "timestamp": "2026-02-03T10:00:00.000Z",
  "version": "1.0.0"
}
```

## 🔑 Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `SMTP_*` - Email configuration
- `MTN_MOMO_*` - Mobile Money integration
- `WEATHER_API_KEY` - Weather data API key

## 🛠️ Development

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm test           # Run tests
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint errors
```

### Code Structure

Each module follows this pattern:
```
module/
├── model.ts       # Mongoose schema
├── service.ts     # Business logic
├── controller.ts  # Request handlers
├── routes.ts      # Express routes
└── validator.ts   # Input validation
```

## 🔒 Security

- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on sensitive endpoints
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ OTP verification
- ✅ Role-based access control

## 📊 Database Models

- **User** - User accounts and authentication
- **Role** - User roles and permissions
- **Farmer** - Farmer profiles
- **Farm** - Farm details and location
- **Product** - Product catalog
- **Listing** - Marketplace listings
- **Order** - Order management and tracking
- **Notification** - Multi-channel notifications
- **PestDiseaseReport** - 🌱 Crop health detection records
- **RegionalOutbreak** - 🌱 Pest/disease outbreak tracking
- **TreatmentKnowledgeBase** - 🌱 Treatment recommendations database
- **OTP** - One-time passwords
- **RefreshToken** - JWT refresh tokens

## 🌐 Integrations

- **Email** - Nodemailer (SMTP)
- **SMS** - Twilio (integration ready)
- **Payments** - MTN MoMo, Airtel Money (integration ready)
- **Weather** - OpenWeatherMap API (integration ready)
- **AI/ML** - PlantVillage, Custom AI APIs, TensorFlow, PyTorch
- **Cloud Storage** - AWS S3, Azure Blob, Google Cloud Storage
- **Image Processing** - Sharp library for optimization

## 🚧 Roadmap

### Phase 1 (✅ Completed)
- [x] Auth & User Management
- [x] Farmer Profiles & Farm Management
- [x] Product Catalog
- [x] Marketplace & Listings

### Phase 2 (✅ Completed)
- [x] Order Management & Tracking
- [x] Multi-channel Notifications
- [x] Analytics & Market Intelligence
- [x] 🌱 **Pest & Disease Detection Module**

### Phase 3 (In Progress)
- [ ] Payment Integration (MTN MoMo, Airtel Money)
- [ ] Logistics & Delivery Tracking
- [ ] Expert Portal & Advisory Services
- [ ] Admin Dashboard & Reporting

### Phase 4 (Planned)
- [ ] GraphQL API Gateway
- [ ] Microservices Architecture
- [ ] Real-time Features (WebSockets)
- [ ] Mobile App SDK
- [ ] Blockchain for Supply Chain Traceability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

Built by the ClyCites Team

## 📞 Support

For support, email support@clycites.com

---

**ClyCites** - Transforming Agriculture through Technology 🌾

