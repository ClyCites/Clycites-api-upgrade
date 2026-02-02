# 🌳 Project File Structure

## Complete File Tree

```
Clycites-api-upgrade/
│
├── 📄 Configuration Files
│   ├── .env.example              # Environment variables template
│   ├── .eslintrc.json            # ESLint configuration
│   ├── .gitignore                # Git ignore rules
│   ├── package.json              # Dependencies & scripts
│   └── tsconfig.json             # TypeScript configuration
│
├── 📚 Documentation
│   ├── README.md                 # Complete project documentation
│   ├── QUICKSTART.md             # Fast setup guide
│   ├── MODULE_GUIDE.md           # How to create new modules
│   ├── API_TESTING.md            # API testing examples
│   ├── PROJECT_SUMMARY.md        # Project overview
│   └── FILE_STRUCTURE.md         # This file
│
├── 📁 src/                       # Source code
│   │
│   ├── 🔧 common/                # Shared utilities
│   │   │
│   │   ├── config/               # Configuration
│   │   │   ├── index.ts          # Main config (env vars)
│   │   │   └── database.ts       # MongoDB connection
│   │   │
│   │   ├── middleware/           # Express middleware
│   │   │   ├── auth.ts           # JWT authentication
│   │   │   ├── authorize.ts      # Role-based authorization
│   │   │   ├── errorHandler.ts   # Global error handler
│   │   │   ├── rateLimiter.ts    # Rate limiting
│   │   │   └── validate.ts       # Input validation
│   │   │
│   │   ├── utils/                # Utility functions
│   │   │   ├── email.ts          # Email service (Nodemailer)
│   │   │   ├── logger.ts         # Winston logger
│   │   │   ├── otp.ts            # OTP generation/validation
│   │   │   ├── pagination.ts     # Pagination helpers
│   │   │   ├── password.ts       # Password hashing/validation
│   │   │   ├── response.ts       # Standard response formatter
│   │   │   └── token.ts          # JWT token utilities
│   │   │
│   │   └── errors/               # Custom error classes
│   │       └── AppError.ts       # Base error class
│   │
│   ├── 📦 modules/               # Feature modules
│   │   │
│   │   ├── 🔐 auth/              # Authentication module
│   │   │   ├── auth.controller.ts   # Request handlers
│   │   │   ├── auth.service.ts      # Business logic
│   │   │   ├── auth.routes.ts       # Route definitions
│   │   │   ├── auth.validator.ts    # Input validation
│   │   │   ├── otp.model.ts         # OTP schema
│   │   │   └── refreshToken.model.ts # Refresh token schema
│   │   │
│   │   ├── 👥 users/             # User management
│   │   │   ├── user.model.ts     # User schema
│   │   │   └── role.model.ts     # Role/permission schema
│   │   │
│   │   ├── 🌾 farmers/           # Farmer management
│   │   │   ├── farmer.model.ts   # Farmer profile schema
│   │   │   └── farm.model.ts     # Farm details schema
│   │   │
│   │   ├── 🥕 products/          # Product catalog
│   │   │   └── product.model.ts  # Product schema
│   │   │
│   │   └── 🛒 marketplace/       # Marketplace
│   │       └── listing.model.ts  # Listing schema
│   │
│   ├── routes.ts                 # Central route registration
│   └── app.ts                    # Application entry point
│
├── 📂 logs/                      # Application logs (gitignored)
│   └── .gitkeep
│
└── 📂 uploads/                   # File uploads (gitignored)
    └── .gitkeep
```

## 📊 File Count Summary

| Category | Count | Description |
|----------|-------|-------------|
| **Documentation** | 6 | README, guides, and references |
| **Configuration** | 5 | Project setup and configuration files |
| **Common Utilities** | 13 | Shared code (middleware, utils, errors) |
| **Auth Module** | 6 | Complete authentication system |
| **User Module** | 2 | User and role management |
| **Farmer Module** | 2 | Farmer profiles and farms |
| **Product Module** | 1 | Product catalog |
| **Marketplace Module** | 1 | Marketplace listings |
| **Core App** | 2 | Main app and routing |

**Total Files:** ~38 files (excluding node_modules)

## 🎯 Key File Purposes

### Configuration
- **package.json** - Dependencies, scripts, project metadata
- **tsconfig.json** - TypeScript compiler options
- **.env.example** - Environment variables template
- **.eslintrc.json** - Code quality rules

### Core Application
- **src/app.ts** - Express app setup, middleware, server start
- **src/routes.ts** - Central route registration

### Common Layer
- **config/** - Environment configuration and database connection
- **middleware/** - Authentication, authorization, validation, error handling
- **utils/** - Reusable functions (email, logging, tokens, etc.)
- **errors/** - Custom error classes

### Auth Module (Complete Implementation)
- **auth.controller.ts** - HTTP request/response handlers
- **auth.service.ts** - Business logic (registration, login, etc.)
- **auth.routes.ts** - Express route definitions
- **auth.validator.ts** - Input validation rules
- **otp.model.ts** - OTP database schema
- **refreshToken.model.ts** - Token storage schema

### Database Models (Ready for Use)
- **user.model.ts** - User accounts
- **role.model.ts** - Roles and permissions
- **farmer.model.ts** - Farmer profiles
- **farm.model.ts** - Farm details
- **product.model.ts** - Product catalog
- **listing.model.ts** - Marketplace listings

## 📝 File Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `*.model.ts` | `user.model.ts` | Mongoose schemas |
| `*.service.ts` | `auth.service.ts` | Business logic |
| `*.controller.ts` | `auth.controller.ts` | Request handlers |
| `*.routes.ts` | `auth.routes.ts` | Express routes |
| `*.validator.ts` | `auth.validator.ts` | Input validation |
| `*.middleware.ts` | `auth.ts` (in middleware/) | Express middleware |
| `*.util.ts` or `*.ts` | `password.ts` (in utils/) | Utility functions |

## 🚀 To Add New Modules

Create this structure in `src/modules/your-module/`:

```
your-module/
├── your-module.model.ts       # Database schema
├── your-module.service.ts     # Business logic
├── your-module.controller.ts  # Request handlers
├── your-module.routes.ts      # Route definitions
└── your-module.validator.ts   # Input validation
```

Then register routes in `src/routes.ts`.

See [MODULE_GUIDE.md](MODULE_GUIDE.md) for detailed instructions.

## 📦 Dependencies Overview

### Production
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **cors** - CORS middleware
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation
- **winston** - Logging
- **nodemailer** - Email service
- **dotenv** - Environment variables

### Development
- **typescript** - Type safety
- **ts-node** - TypeScript execution
- **nodemon** - Auto-restart
- **eslint** - Code linting
- **@types/** - TypeScript definitions

## 🎨 Code Organization Principles

1. **Modular** - Each feature is self-contained
2. **Layered** - Clear separation (models, services, controllers, routes)
3. **DRY** - Shared utilities in common/
4. **Typed** - TypeScript for type safety
5. **Validated** - Input validation on all endpoints
6. **Secure** - Authentication, authorization, rate limiting
7. **Documented** - Comments and documentation files
8. **Testable** - Clean architecture for easy testing

## 📍 Important Files for Development

### To Start Development
1. Read [QUICKSTART.md](QUICKSTART.md)
2. Configure `.env` (copy from `.env.example`)
3. Run `npm install`
4. Run `npm run dev`

### To Add Features
1. Read [MODULE_GUIDE.md](MODULE_GUIDE.md)
2. Follow the module pattern
3. Test with [API_TESTING.md](API_TESTING.md)

### To Understand the Project
1. Start with [README.md](README.md)
2. Review [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
3. Explore `src/modules/auth/` as reference implementation

---

**This structure supports growth from MVP to enterprise-scale platform.** 🚀
