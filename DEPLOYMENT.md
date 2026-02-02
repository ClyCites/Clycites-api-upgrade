# ClyCites API - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Deployment](#development-deployment)
3. [Production Deployment](#production-deployment)
4. [Cloud Deployment Options](#cloud-deployment-options)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Security Checklist](#security-checklist)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Node.js >= 18.0.0
- MongoDB >= 5.0 (or MongoDB Atlas account)
- Git
- PM2 (for production process management)

### Required Accounts
- MongoDB Atlas account (for cloud database)
- SMTP email service (Gmail, SendGrid, etc.)
- SMS provider (optional: Twilio, Africa's Talking)
- Payment gateway accounts (MTN MoMo, Airtel Money)

---

## Development Deployment

### 1. Clone Repository
```bash
git clone https://github.com/your-org/clycites-api.git
cd clycites-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create `.env` file:
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/clycites
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/clycites?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@clycites.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Optional: SMS Configuration
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Optional: File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Optional: Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379
```

### 4. Start Development Server
```bash
npm run dev
```

Server will run on `http://localhost:5000`

---

## Production Deployment

### Option 1: Traditional VPS (Ubuntu/Debian)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (if not using Atlas)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install SSL certificate (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Deploy Application
```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-org/clycites-api.git
cd clycites-api

# Install dependencies
sudo npm ci --production

# Create .env file
sudo nano .env
# (Copy production environment variables)

# Build TypeScript
sudo npm run build

# Start with PM2
sudo pm2 start dist/app.js --name clycites-api
sudo pm2 save
sudo pm2 startup
```

#### 3. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/clycites-api
```

Add configuration:
```nginx
server {
    listen 80;
    server_name api.clycites.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/clycites-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. Setup SSL
```bash
sudo certbot --nginx -d api.clycites.com
```

---

### Option 2: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "dist/app.js"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/clycites
    env_file:
      - .env
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  mongo-data:
```

#### 3. Deploy with Docker
```bash
docker-compose up -d
```

---

## Cloud Deployment Options

### Heroku

1. **Install Heroku CLI**
```bash
npm install -g heroku
heroku login
```

2. **Create Application**
```bash
heroku create clycites-api
```

3. **Add MongoDB Atlas**
```bash
# Use MongoDB Atlas connection string in config vars
heroku config:set MONGODB_URI="mongodb+srv://..."
```

4. **Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set SMTP_USER=your-email
# ... set all other variables
```

5. **Deploy**
```bash
git push heroku main
heroku logs --tail
```

---

### AWS Elastic Beanstalk

1. **Install EB CLI**
```bash
pip install awsebcli
eb init
```

2. **Create Environment**
```bash
eb create clycites-api-prod
```

3. **Configure Environment Variables**
```bash
eb setenv NODE_ENV=production MONGODB_URI="..." JWT_SECRET="..."
```

4. **Deploy**
```bash
eb deploy
eb open
```

---

### DigitalOcean App Platform

1. **Connect GitHub Repository**
- Go to DigitalOcean App Platform
- Connect your GitHub repository

2. **Configure Build Settings**
- Build Command: `npm run build`
- Run Command: `node dist/app.js`

3. **Set Environment Variables**
- Add all variables from `.env`

4. **Deploy**
- Click "Deploy"

---

### Render

1. **Create Web Service**
- Connect GitHub repository
- Select "Node" environment

2. **Configure**
- Build Command: `npm install && npm run build`
- Start Command: `node dist/app.js`

3. **Set Environment Variables**
- Add variables in Render dashboard

4. **Deploy**
- Automatic deployment on git push

---

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create Cluster**
- Go to mongodb.com/cloud/atlas
- Create free/paid cluster
- Choose region closest to your users

2. **Create Database User**
- Database Access → Add New User
- Set username and password

3. **Whitelist IP Addresses**
- Network Access → Add IP Address
- For testing: Allow access from anywhere (0.0.0.0/0)
- For production: Add specific IPs

4. **Get Connection String**
```
mongodb+srv://<username>:<password>@cluster.mongodb.net/clycites?retryWrites=true&w=majority
```

5. **Create Indexes**
```bash
# Connect to MongoDB
mongosh "mongodb+srv://cluster.mongodb.net/clycites" --username admin

# Create indexes (already defined in models, but verify)
db.users.createIndex({ email: 1 }, { unique: true })
db.listings.createIndex({ status: 1, createdAt: -1 })
db.orders.createIndex({ buyer: 1, status: 1 })
```

---

## Environment Configuration

### Production .env Template
```env
# NEVER commit this file to version control!
NODE_ENV=production
PORT=5000

# Database - MongoDB Atlas
MONGODB_URI=mongodb+srv://admin:STRONG_PASSWORD@cluster.mongodb.net/clycites?retryWrites=true&w=majority

# JWT - Use strong random strings
JWT_SECRET=USE_OPENSSL_RAND_BASE64_32_TO_GENERATE
JWT_REFRESH_SECRET=DIFFERENT_STRONG_SECRET_KEY_HERE
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email - Production SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EMAIL_FROM=noreply@clycites.com

# CORS
FRONTEND_URL=https://clycites.com

# File Upload (use S3 in production)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AWS_S3_BUCKET=clycites-uploads
AWS_REGION=us-east-1

# Redis (for session management)
REDIS_URL=redis://red-xxxxxxxxxx.redis.cloud:12345

# Payment Gateways
MTN_MOMO_SUBSCRIPTION_KEY=xxxxxxxxxxxxxxxxxx
MTN_MOMO_API_USER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MTN_MOMO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AIRTEL_MONEY_CLIENT_ID=xxxxxxxx
AIRTEL_MONEY_CLIENT_SECRET=xxxxxxxx

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### Generate Secrets
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use OpenSSL
openssl rand -base64 32
```

---

## Security Checklist

### Pre-Deployment
- [ ] Change all default secrets
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set secure CORS policy
- [ ] Enable helmet security headers
- [ ] Implement rate limiting
- [ ] Validate all inputs
- [ ] Sanitize user data
- [ ] Use prepared statements (Mongoose does this)
- [ ] Hash passwords with bcrypt
- [ ] Implement CSRF protection
- [ ] Set secure cookie flags
- [ ] Hide error stack traces in production
- [ ] Implement request size limits
- [ ] Enable MongoDB authentication
- [ ] Use environment variables (never hardcode)

### Post-Deployment
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Monitor logs for suspicious activity
- [ ] Backup database regularly
- [ ] Implement intrusion detection
- [ ] Set up SSL certificate auto-renewal
- [ ] Enable firewall rules
- [ ] Restrict database access
- [ ] Use VPN for server access
- [ ] Implement 2FA for admin accounts

---

## Monitoring & Logging

### PM2 Monitoring
```bash
# View logs
pm2 logs clycites-api

# Monitor resources
pm2 monit

# View status
pm2 status

# Restart if needed
pm2 restart clycites-api
```

### Setup PM2 Monitoring Dashboard
```bash
pm2 install pm2-server-monit
pm2 web
# Access dashboard at http://localhost:9615
```

### Log Management
```bash
# View application logs
tail -f logs/all.log
tail -f logs/error.log

# Rotate logs (using logrotate)
sudo nano /etc/logrotate.d/clycites-api
```

Add configuration:
```
/var/www/clycites-api/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### Monitoring Tools
- **Sentry**: Error tracking
- **New Relic**: Application performance
- **Datadog**: Infrastructure monitoring
- **Prometheus + Grafana**: Metrics and dashboards
- **PM2 Plus**: Process monitoring

---

## Backup Strategy

### Database Backups

#### Automated MongoDB Backup
```bash
#!/bin/bash
# backup-mongodb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

# Backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"

# Compress
tar -czf "$BACKUP_DIR/$DATE.tar.gz" "$BACKUP_DIR/$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Keep only last 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

#### Schedule with Cron
```bash
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-mongodb.sh
```

#### MongoDB Atlas Backups
- Automatic backups enabled by default
- Point-in-time recovery available
- Configure retention policy in Atlas dashboard

---

## Performance Optimization

### 1. Enable Compression
```typescript
// Already included in app.ts
import compression from 'compression';
app.use(compression());
```

### 2. Implement Caching
```bash
npm install redis ioredis
```

```typescript
// Cache frequently accessed data
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Cache listings
await redis.setex(`listings:${id}`, 300, JSON.stringify(listing));
```

### 3. Database Indexing
- Already implemented in models
- Monitor slow queries: `db.setProfilingLevel(1, 100)`

### 4. Load Balancing
Use PM2 cluster mode:
```bash
pm2 start dist/app.js -i max --name clycites-api
```

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:**
- Check if MongoDB is running: `sudo systemctl status mongod`
- Verify connection string in `.env`
- Check network access in MongoDB Atlas

#### 2. CORS Errors
```
Access to fetch blocked by CORS policy
```
**Solution:**
- Add frontend URL to `FRONTEND_URL` in `.env`
- Verify CORS middleware configuration

#### 3. JWT Token Expired
```
401 Unauthorized: Token expired
```
**Solution:**
- Implement token refresh logic
- Use refresh token endpoint

#### 4. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
```bash
# Find process
lsof -i :5000
# Kill process
kill -9 <PID>
```

#### 5. Out of Memory
```
FATAL ERROR: Reached heap limit
```
**Solution:**
```bash
# Increase Node.js memory
pm2 start dist/app.js --node-args="--max-old-space-size=2048"
```

---

## Rollback Procedure

### If Deployment Fails

1. **Identify Issue**
```bash
pm2 logs --err
```

2. **Rollback Git**
```bash
git log
git revert HEAD
git push
```

3. **Redeploy Previous Version**
```bash
git checkout <previous-commit>
npm run build
pm2 restart clycites-api
```

4. **Database Rollback** (if needed)
```bash
mongorestore --uri="$MONGODB_URI" /backups/mongodb/BACKUP_DATE
```

---

## Maintenance Mode

Create maintenance page:
```nginx
# In Nginx config
if (-f /var/www/maintenance.html) {
    return 503;
}

error_page 503 @maintenance;
location @maintenance {
    root /var/www;
    rewrite ^(.*)$ /maintenance.html break;
}
```

Enable:
```bash
sudo touch /var/www/maintenance.html
sudo systemctl reload nginx
```

---

## Support & Resources

- Documentation: https://docs.clycites.com
- GitHub Issues: https://github.com/your-org/clycites-api/issues
- Email: devops@clycites.com
- Slack: #clycites-devops

---

**Last Updated:** January 2024
**Version:** 1.0.0
