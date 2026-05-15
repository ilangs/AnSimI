# ============================================================
#  AAB -> Universal APK Converter for AnSimI
#
#  Usage:
#    1. Place bundletool.jar at C:\AnSimI\bundletool.jar
#    2. Place app.aab at C:\AnSimI\app.aab
#    3. Run: powershell -File scripts/aab-to-apk.ps1
#
#  Result: C:\AnSimI\ansimi.apk
# ============================================================

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

$bundletool = Join-Path $projectRoot "bundletool.jar"
$aab        = Join-Path $projectRoot "app.aab"
$apks       = Join-Path $projectRoot "app.apks"
$output     = Join-Path $projectRoot "ansimi.apk"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AAB to APK Converter (AnSimI)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ---- [1/4] Java check ----
Write-Host "[1/4] Checking Java..." -ForegroundColor Cyan
$javaOk = $false
try {
    $null = & java -version 2>&1
    if ($LASTEXITCODE -eq 0) { $javaOk = $true }
} catch {
    $javaOk = $false
}

if (-Not $javaOk) {
    Write-Host "  [FAIL] Java is not installed or not in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Install Java (choose one):" -ForegroundColor Yellow
    Write-Host "    A) winget install EclipseAdoptium.Temurin.17.JDK" -ForegroundColor White
    Write-Host "       (then RESTART PowerShell)" -ForegroundColor Gray
    Write-Host "    B) Download from https://adoptium.net/" -ForegroundColor White
    Write-Host ""
    exit 1
}
$javaVer = (& java -version 2>&1 | Select-Object -First 1)
Write-Host "  [OK] $javaVer" -ForegroundColor Green

# ---- [2/4] bundletool.jar check ----
Write-Host ""
Write-Host "[2/4] Checking bundletool.jar..." -ForegroundColor Cyan
if (-Not (Test-Path $bundletool)) {
    Write-Host "  [FAIL] bundletool.jar not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Auto download:" -ForegroundColor Yellow
    Write-Host "    Invoke-WebRequest -Uri 'https://github.com/google/bundletool/releases/download/1.18.0/bundletool-all-1.18.0.jar' -OutFile '$bundletool'" -ForegroundColor White
    Write-Host ""
    exit 1
}
$btSize = [math]::Round((Get-Item $bundletool).Length / 1MB, 1)
Write-Host ("  [OK] bundletool.jar ({0} MB)" -f $btSize) -ForegroundColor Green

# ---- [3/4] app.aab check ----
Write-Host ""
Write-Host "[3/4] Checking app.aab..." -ForegroundColor Cyan
if (-Not (Test-Path $aab)) {
    Write-Host "  [FAIL] app.aab not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Download AAB from EAS Dashboard, then save as:" -ForegroundColor Yellow
    Write-Host "    $aab" -ForegroundColor White
    Write-Host ""
    Write-Host "  Or auto download (latest build URL):" -ForegroundColor Yellow
    Write-Host "    Invoke-WebRequest -Uri 'https://expo.dev/artifacts/eas/b8uZrmXLXGjJQ466gLnzDT.aab' -OutFile '$aab'" -ForegroundColor White
    Write-Host ""
    exit 1
}
$aabSize = [math]::Round((Get-Item $aab).Length / 1MB, 1)
Write-Host ("  [OK] app.aab ({0} MB)" -f $aabSize) -ForegroundColor Green

# ---- [4/4] Convert ----
Write-Host ""
Write-Host "[4/4] Converting AAB to APK (1-2 minutes)..." -ForegroundColor Cyan

if (Test-Path $apks)   { Remove-Item $apks -Force }
if (Test-Path $output) { Remove-Item $output -Force }

& java -jar $bundletool build-apks --bundle="$aab" --output="$apks" --mode=universal

if (-Not (Test-Path $apks)) {
    Write-Host "  [FAIL] APKS build failed" -ForegroundColor Red
    exit 1
}

$tempDir = Join-Path $projectRoot "_apks_temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
Expand-Archive -Path $apks -DestinationPath $tempDir -Force

$universalApk = Join-Path $tempDir "universal.apk"
if (Test-Path $universalApk) {
    Move-Item $universalApk $output -Force
    Remove-Item $tempDir -Recurse -Force
    Remove-Item $apks -Force
} else {
    Write-Host "  [FAIL] universal.apk not found in APKS" -ForegroundColor Red
    exit 1
}

# ---- Done ----
$apkSize = [math]::Round((Get-Item $output).Length / 1MB, 1)
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host ("  File: {0}" -f $output) -ForegroundColor White
Write-Host ("  Size: {0} MB" -f $apkSize) -ForegroundColor White
Write-Host ""
Write-Host "  Install on phone:" -ForegroundColor Cyan
Write-Host "    1. Send ansimi.apk via KakaoTalk (to yourself)" -ForegroundColor White
Write-Host "    2. On phone: Download -> Allow unknown sources -> Install" -ForegroundColor White
Write-Host ""
