# # Quick Verification - Check All Hardcoded Values
# Write-Host "🔍 Verifying Hardcoded Values in Code..." -ForegroundColor Cyan
# Write-Host ""

# # Check loopsEmail.js
# Write-Host "Checking netlify/functions/utils/loopsEmail.js:" -ForegroundColor Yellow
# $content = Get-Content "netlify/functions/utils/loopsEmail.js" -Raw

# if ($content -match "const LOOPS_API_KEY = 'e8afb88a6bae3451e657612d84db3034'") {
#     Write-Host "  ✅ LOOPS_API_KEY is hardcoded correctly" -ForegroundColor Green
# } else {
#     Write-Host "  ❌ LOOPS_API_KEY not hardcoded!" -ForegroundColor Red
# }

# if ($content -match "const LOOPS_TEMPLATE_ID = 'cmgwzzij2tdk6wb0ie0unnzzp'") {
#     Write-Host "  ✅ LOOPS_TEMPLATE_ID is hardcoded correctly" -ForegroundColor Green
# } else {
#     Write-Host "  ❌ LOOPS_TEMPLATE_ID not hardcoded!" -ForegroundColor Red
# }

# if ($content -match "const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional'") {
#     Write-Host "  ✅ LOOPS_API_URL is hardcoded correctly" -ForegroundColor Green
# } else {
#     Write-Host "  ❌ LOOPS_API_URL not hardcoded!" -ForegroundColor Red
# }

# # Check for any remaining process.env references in loopsEmail.js
# $envMatches = Select-String -Path "netlify/functions/utils/loopsEmail.js" -Pattern "process\.env\.(LOOPS|ADMIN)" -AllMatches

# if ($envMatches.Count -eq 0) {
#     Write-Host "  ✅ No process.env references found" -ForegroundColor Green
# } else {
#     Write-Host "  ⚠️  Found process.env references:" -ForegroundColor Yellow
#     $envMatches | ForEach-Object {
#         Write-Host "    Line $($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
#     }
# }

# Write-Host ""
# Write-Host "Checking netlify/functions/wallet-connect.js:" -ForegroundColor Yellow
# $walletContent = Get-Content "netlify/functions/wallet-connect.js" -Raw

# if ($walletContent -match "codes: credentials") {
#     Write-Host "  ✅ 'codes: credentials' is present" -ForegroundColor Green
# } else {
#     Write-Host "  ❌ 'codes: credentials' not found!" -ForegroundColor Red
# }

# Write-Host ""
# Write-Host "=" * 60 -ForegroundColor Gray
# Write-Host "📋 Summary of Hardcoded Values:" -ForegroundColor Cyan
# Write-Host "  API Key:     e8afb88a6bae3451e657612d84db3034" -ForegroundColor White
# Write-Host "  Template ID: cmgwzzij2tdk6wb0ie0unnzzp" -ForegroundColor White
# Write-Host "  API URL:     https://app.loops.so/api/v1/transactional" -ForegroundColor White
# Write-Host "  Admin Email: admin@aetherbot.app" -ForegroundColor White
# Write-Host ""
# Write-Host "✅ All values are hardcoded - no environment variable dependencies!" -ForegroundColor Green
