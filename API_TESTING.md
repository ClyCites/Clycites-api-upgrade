# 🧪 API Testing Collection

Complete API test examples for ClyCites API. You can import these into Postman, Thunder Client, or use with curl.

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Testing Tips](#testing-tips)

---

## Authentication

### 1. Register User

**POST** `/api/v1/auth/register`

```json
{
  "email": "farmer@clycites.com",
  "password": "FarmerPass123!",
  "firstName": "John",
  "lastName": "Farmer",
  "phone": "+256700123456",
  "role": "farmer"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@clycites.com",
    "password": "FarmerPass123!",
    "firstName": "John",
    "lastName": "Farmer",
    "phone": "+256700123456",
    "role": "farmer"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "65abc123def456...",
      "email": "farmer@clycites.com",
      "firstName": "John",
      "lastName": "Farmer",
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

---

### 2. Login

**POST** `/api/v1/auth/login`

```json
{
  "email": "farmer@clycites.com",
  "password": "FarmerPass123!"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@clycites.com",
    "password": "FarmerPass123!"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65abc123def456...",
      "email": "farmer@clycites.com",
      "firstName": "John",
      "lastName": "Farmer",
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

---

### 3. Verify OTP

**POST** `/api/v1/auth/verify-otp`

```json
{
  "email": "farmer@clycites.com",
  "code": "123456",
  "purpose": "verification"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@clycites.com",
    "code": "123456",
    "purpose": "verification"
  }'
```

---

### 4. Resend OTP

**POST** `/api/v1/auth/resend-otp`

```json
{
  "email": "farmer@clycites.com",
  "purpose": "verification"
}
```

---

### 5. Get Current User (Protected)

**GET** `/api/v1/auth/me`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**cURL:**
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "_id": "65abc123def456...",
    "email": "farmer@clycites.com",
    "firstName": "John",
    "lastName": "Farmer",
    "role": "farmer",
    "isEmailVerified": true,
    "isPhoneVerified": false,
    "isActive": true,
    "createdAt": "2026-02-03T10:00:00.000Z",
    "updatedAt": "2026-02-03T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-02-03T10:15:00.000Z"
  }
}
```

---

### 6. Refresh Token

**POST** `/api/v1/auth/refresh-token`

```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  },
  "meta": {
    "timestamp": "2026-02-03T10:30:00.000Z"
  }
}
```

---

### 7. Forgot Password

**POST** `/api/v1/auth/forgot-password`

```json
{
  "email": "farmer@clycites.com"
}
```

---

### 8. Reset Password

**POST** `/api/v1/auth/reset-password`

```json
{
  "email": "farmer@clycites.com",
  "code": "123456",
  "newPassword": "NewSecurePass123!"
}
```

---

### 9. Logout

**POST** `/api/v1/auth/logout`

```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "meta": {
    "timestamp": "2026-02-03T11:00:00.000Z"
  }
}
```

---

## User Management

### 10. Health Check

**GET** `/api/v1/health`

**cURL:**
```bash
curl http://localhost:5000/api/v1/health
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "ClyCites API is running",
  "timestamp": "2026-02-03T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Testing Tips

### Environment Variables for Testing

Create these variables in your API client:

```
BASE_URL=http://localhost:5000/api/v1
ACCESS_TOKEN=<will be set after login>
REFRESH_TOKEN=<will be set after login>
USER_EMAIL=farmer@clycites.com
```

### Postman Collection Variables

```json
{
  "baseUrl": "http://localhost:5000/api/v1",
  "accessToken": "",
  "refreshToken": "",
  "userEmail": "farmer@clycites.com"
}
```

### Test Flow

1. **Register** → Save tokens
2. **Login** → Update tokens
3. **Get Me** → Verify authentication
4. **Verify OTP** → Complete email verification
5. **Refresh Token** → Test token refresh
6. **Logout** → Clear session

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional additional details
    }
  },
  "meta": {
    "timestamp": "2026-02-03T10:00:00.000Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required/failed |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Testing with Different Roles

### Register Different User Types

**Farmer:**
```json
{ "role": "farmer", "email": "farmer@test.com", ... }
```

**Buyer:**
```json
{ "role": "buyer", "email": "buyer@test.com", ... }
```

**Expert:**
```json
{ "role": "expert", "email": "expert@test.com", ... }
```

**Trader:**
```json
{ "role": "trader", "email": "trader@test.com", ... }
```

---

## Rate Limiting

Be aware of rate limits during testing:

- **Auth endpoints:** 5 requests per 15 minutes
- **General API:** 100 requests per 15 minutes
- **Create operations:** 50 requests per hour

If you hit the limit:
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many requests, please try again later"
  }
}
```

---

## PowerShell Testing Script

```powershell
# Set base URL
$baseUrl = "http://localhost:5000/api/v1"

# Test health endpoint
Invoke-RestMethod -Uri "$baseUrl/health" -Method Get

# Register user
$body = @{
    email = "test@clycites.com"
    password = "TestPass123!"
    firstName = "Test"
    lastName = "User"
    role = "farmer"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

# Save token
$token = $response.data.tokens.accessToken

# Get current user
Invoke-RestMethod -Uri "$baseUrl/auth/me" `
    -Method Get `
    -Headers @{Authorization = "Bearer $token"}
```

---

Happy Testing! 🧪
