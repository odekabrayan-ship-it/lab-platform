$ErrorActionPreference = "Stop"

$backendUrl = "https://qualicore-backend.onrender.com"
$portals = @("portal-lab", "portal-admin", "portal-trust", "portal-cert")

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 QualiCore Vercel Deployment Script 🚀" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

foreach ($portal in $portals) {
    Write-Host "➡️ Deploying $portal to Vercel production..." -ForegroundColor Yellow
    Set-Location "C:\lab-platform\$portal"
    
    # Run the Vercel deployment with the Render backend URL injected as an environment variable
    npx vercel deploy --prod --yes -e VITE_API_URL=$backendUrl
    
    Write-Host "✅ $portal deployment command completed.`n" -ForegroundColor Green
}

Set-Location "C:\lab-platform"
Write-Host "🎉 All deployments finished! 🎉" -ForegroundColor Cyan
Write-Host "Check the output above for your 4 production URLs (*.vercel.app)."
Write-Host "Add these URLs to the allowedOrigins array in backend/server.js and push to GitHub!" -ForegroundColor Yellow
