# 🚀 ClyCites API - Quick Start Guide

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Express (web framework)
- TypeScript (type safety)
- MongoDB & Mongoose (database)
- JWT & bcrypt (authentication)
- And many more...

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update these critical values:

```env
# Minimum required for development
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/clycites
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# Email (optional for now, but needed for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:

**Windows:**
```powershell
# If MongoDB is installed as a service
net start MongoDB

# Or run manually
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath="C:\data\db"
```

**Mac:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### 4. Run Development Server

```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🌾 ClyCites API Server                             ║
║                                                       ║
║   Environment: development                            ║
║   Port: 5000                                          ║
║   API Version: v1                                     ║
║                                                       ║
║   Server running at: http://localhost:5000            ║
║   Health check: http://localhost:5000/api/v1/health  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

### 5. Test the API

**Health Check:**
```bash
curl http://localhost:5000/api/v1/health
```

**Register a User:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "farmer"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "SecurePass123!"
  }'
```

## 📁 Project Structure Overview

```
Clycites-api-upgrade/
├── src/
│   ├── modules/
│   │   ├── auth/              # ✅ Authentication (Login, Register, OTP)
│   │   ├── users/             # ✅ User Management & RBAC
│   │   ├── farmers/           # ✅ Farmer Profiles & Farms
│   │   ├── products/          # ✅ Product Catalog
│   │   └── marketplace/       # ✅ Marketplace Listings
│   ├── common/
│   │   ├── config/           # Configuration & DB connection
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── utils/            # Helper functions (token, password, email)
│   │   └── errors/           # Custom error classes
│   ├── routes.ts             # API route registration
│   └── app.ts                # Main application entry
├── .env.example              # Environment variables template
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Full documentation
```

## 🔑 Key Features Implemented

### ✅ Authentication Module
- User registration with email/password
- Login with JWT tokens
- OTP email verification
- Password reset functionality
- Refresh token mechanism
- Logout

### ✅ Security
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- CORS protection
- Helmet security headers
- Input validation

### ✅ Database Models
- **User** - Authentication and profile
- **Role** - RBAC system
- **Farmer** - Farmer profiles
- **Farm** - Farm management
- **Product** - Product catalog
- **Listing** - Marketplace listings
- **OTP** - Email verification
- **RefreshToken** - Token management

## 🔧 Development Commands

```bash
npm run dev         # Start development server with hot reload
npm run build       # Compile TypeScript to JavaScript
npm start           # Run production build
npm run lint        # Check code quality
npm run lint:fix    # Auto-fix linting issues
```

## 📮 API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login user |
| POST | `/refresh-token` | Refresh access token |
| POST | `/logout` | Logout user |
| POST | `/verify-otp` | Verify OTP code |
| POST | `/resend-otp` | Resend OTP |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password |
| GET | `/me` | Get current user (requires auth) |

## 🎯 Next Steps

1. **Test the Authentication Flow:**
   - Register a user
   - Verify email with OTP
   - Login and get tokens
   - Use token to access `/auth/me`

2. **Extend the API:**
   - Add farmer profile endpoints
   - Add marketplace listing endpoints
   - Add order management
   - Add payment integration

3. **Add More Modules:**
   - Orders & Transactions
   - Payments (MTN MoMo, Airtel)
   - Logistics & Delivery
   - Weather Integration
   - AI/ML Recommendations
   - Analytics & Reports

## 🐛 Troubleshooting

### MongoDB Connection Failed
```
Error: MongoDB connection failed
```
**Solution:** Ensure MongoDB is running and the URI in `.env` is correct.

### Port Already in Use
```
Error: Port 5000 already in use
```
**Solution:** Change `PORT` in `.env` or stop the other process.

### TypeScript Errors
```
Cannot find module '@modules/...'
```
**Solution:** Run `npm install` and restart the dev server.

### Email Not Sending
```
SMTP connection failed
```
**Solution:** 
1. Use Gmail? Enable "App Passwords" in Google Account settings
2. Update `SMTP_USER` and `SMTP_PASS` in `.env`
3. For development, you can skip email verification

## 📚 Resources

- [Express Documentation](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Mongoose Guide](https://mongoosejs.com/docs/)
- [JWT.io](https://jwt.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 💡 Tips

1. **Use a tool like Postman or Thunder Client** for testing APIs
2. **Check the logs/** folder for detailed error logs
3. **MongoDB Compass** is great for viewing database contents
4. **Use `npm run lint:fix`** before committing code
5. **Keep your `.env` file secret** - never commit it to Git

---

Need help? Check the main [README.md](README.md) for detailed documentation.

**Happy Coding! 🌾**
