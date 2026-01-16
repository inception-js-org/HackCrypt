# Admin Setup Script
# Run this after implementing admin role

Write-Host "🚀 Starting Admin Role Setup..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the frontend directory." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Step 1: Pushing database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database push failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Database schema updated" -ForegroundColor Green
Write-Host ""

Write-Host "🌱 Step 2: Seeding admin user..." -ForegroundColor Yellow
npm run seed:admin
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Admin seeding failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Admin user created" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Admin setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Default Admin Credentials:" -ForegroundColor Cyan
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Remember to change these credentials in production!" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start frontend: npm run dev" -ForegroundColor White
Write-Host "   2. Start backend: cd ../backend && uvicorn app.main:app --reload" -ForegroundColor White
Write-Host "   3. Navigate to: http://localhost:3000/login/choose-role" -ForegroundColor White
Write-Host "   4. Click 'Admin Login' and use the credentials above" -ForegroundColor White
Write-Host ""
