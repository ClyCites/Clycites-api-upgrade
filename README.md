# ClyCites API - Agricultural E-Market Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey.svg)](https://expressjs.com/)

## 🌾 Overview

ClyCites is a state-of-the-art digital platform designed to transform agriculture by connecting farmers, buyers, experts, and market data into one intelligent ecosystem. The platform leverages modern software engineering, data analytics, and AI to improve agricultural productivity, market access, pricing transparency, and economic sustainability.

## ✨ Key Features

- **🔐 Authentication & Authorization** - JWT-based auth with OTP verification
- **👥 Role-Based Access Control (RBAC)** - Admin, Farmer, Buyer, Expert, Trader roles
- **🌾 Farmer Management** - Profile, farm management, and verification
- **🥕 Product Management** - Crop and livestock product catalog
- **🛒 Agricultural E-Market** - Digital marketplace for buying and selling
- **💳 Payment Integration** - MTN MoMo, Airtel Money support
- **🚚 Logistics** - Delivery coordination and tracking
- **🤖 AI-Powered Assistant** - Smart recommendations and price predictions
- **📊 Market Intelligence** - Analytics, trends, and insights
- **👨‍🔬 Expert Portal** - Knowledge sharing and consultation
- **📧 Notifications** - Email, SMS, and push notifications

## 🏗️ Architecture

```
src/
├── modules/              # Feature modules
│   ├── auth/            # Authentication & authorization
│   ├── users/           # User management
│   ├── farmers/         # Farmer profiles & farms
│   ├── products/        # Product catalog
│   ├── marketplace/     # Listings & marketplace
│   ├── orders/          # Order management
│   ├── payments/        # Payment processing
│   ├── logistics/       # Delivery & logistics
│   ├── weather/         # Weather data integration
│   ├── ai-assistant/    # AI recommendations
│   ├── analytics/       # Market intelligence
│   ├── experts/         # Expert portal
│   ├── notifications/   # Notification service
│   └── admin/           # Admin panel
├── common/              # Shared utilities
│   ├── config/          # Configuration
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── errors/          # Error classes
│   └── validators/      # Validation schemas
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
- **OTP** - One-time passwords
- **RefreshToken** - JWT refresh tokens

## 🌐 Integrations

- **Email** - Nodemailer (SMTP)
- **SMS** - Twilio
- **Payments** - MTN MoMo, Airtel Money
- **Weather** - OpenWeatherMap API
- **AI/ML** - Custom service integration

## 🚧 Roadmap

### Phase 1 (Current)
- [x] Auth & User Management
- [x] Farmer Profiles
- [x] Product Management
- [x] Basic Marketplace

### Phase 2
- [ ] Order Management
- [ ] Payment Integration
- [ ] Logistics Module
- [ ] Notifications

### Phase 3
- [ ] AI Assistant
- [ ] Market Analytics
- [ ] Expert Portal
- [ ] Admin Dashboard

### Phase 4
- [ ] GraphQL Gateway
- [ ] Microservices Architecture
- [ ] Real-time Features
- [ ] Mobile App APIs

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

