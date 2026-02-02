# 🚀 ClyCites API Setup Script
# This script helps you get started with the ClyCites API

Write-Host @"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🌾 ClyCites API Setup                                ║
║     Agricultural E-Market Platform                       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

# Check if Node.js is installed
Write-Host "`n📦 Checking Node.js installation..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is installed
Write-Host "`n🗄️ Checking MongoDB installation..." -ForegroundColor Cyan
try {
    $mongoVersion = mongod --version | Select-Object -First 1
    Write-Host "✅ MongoDB installed: $mongoVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️ MongoDB might not be installed or not in PATH" -ForegroundColor Yellow
    Write-Host "   Install from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
}

# Check if .env file exists
Write-Host "`n⚙️ Checking environment configuration..." -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️ .env file not found. A basic .env file has been created." -ForegroundColor Yellow
    Write-Host "   Please update it with your actual configuration." -ForegroundColor Yellow
}

# Install dependencies
Write-Host "`n📥 Installing dependencies..." -ForegroundColor Cyan
Write-Host "   This may take a few minutes..." -ForegroundColor Gray

try {
    npm install
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "`n📁 Creating directories..." -ForegroundColor Cyan
$directories = @("logs", "uploads")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created $dir directory" -ForegroundColor Green
    } else {
        Write-Host "✅ $dir directory already exists" -ForegroundColor Green
    }
}

# Show next steps
Write-Host @"

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     ✅ Setup Complete!                                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

📝 Next Steps:

1. Configure Environment
   • Edit .env file with your settings
   • Update JWT secrets (IMPORTANT!)
   • Configure email settings (optional for now)

2. Start MongoDB
   • Make sure MongoDB is running
   • Windows: net start MongoDB
   • Or check MongoDB Compass

3. Start Development Server
   • Run: npm run dev
   • API will be available at http://localhost:5000

4. Test the API
   • Health check: http://localhost:5000/api/v1/health
   • Register user: See API_TESTING.md for examples

📚 Documentation:
   • README.md - Full documentation
   • QUICKSTART.md - Quick setup guide
   • API_TESTING.md - API endpoint examples
   • MODULE_GUIDE.md - How to add new features

🎯 Quick Commands:
   • npm run dev      - Start development server
   • npm run build    - Build for production
   • npm run lint     - Check code quality
   • npm run lint:fix - Fix linting issues

🔧 Troubleshooting:
   • MongoDB not starting? Check if it's installed and in PATH
   • Port 5000 busy? Change PORT in .env
   • Email not working? You can skip email verification for now

Need help? Check the documentation files! 📖

Happy coding! 🚀🌾

"@ -ForegroundColor Cyan

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
