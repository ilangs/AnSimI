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
$keystore   = Join-Path $projectRoot "debug.keystore"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AAB to APK Converter (AnSimI)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ---- [1/4] Java check ----
Write-Host "[1/4] Checking Java..." -ForegroundColor Cyan

# Get-Command is more reliable than & java with try/catch
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCmd) {
    Write-Host "  [FAIL] Java is not in PATH (Get-Command failed)." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Install Java (choose one):" -ForegroundColor Yellow
    Write-Host "    A) winget install EclipseAdoptium.Temurin.17.JDK" -ForegroundColor White
    Write-Host "       (then RESTART PowerShell)" -ForegroundColor Gray
    Write-Host "    B) Download from https://adoptium.net/" -ForegroundColor White
    Write-Host ""
    Write-Host "  Already installed? Try in current shell:" -ForegroundColor Yellow
    Write-Host "    `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')" -ForegroundColor White
    Write-Host ""
    exit 1
}
$javaPath = $javaCmd.Source
$javaVer = (& java -version 2>&1 | Select-Object -First 1)
Write-Host "  [OK] $javaVer" -ForegroundColor Green
Write-Host "       at $javaPath" -ForegroundColor Gray

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

# ---- [4a/4] Generate debug keystore if missing ----
if (-Not (Test-Path $keystore)) {
    Write-Host ""
    Write-Host "[4a/4] Generating debug keystore (one-time setup)..." -ForegroundColor Cyan
    & keytool -genkey -v -keystore $keystore -alias androiddebugkey `
        -storepass android -keypass android `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -dname "CN=Android Debug,O=Android,C=US" 2>&1 | Out-Null

    if (-Not (Test-Path $keystore)) {
        Write-Host "  [FAIL] Keystore generation failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] debug.keystore created" -ForegroundColor Green
}

# ---- [4/4] Convert ----
Write-Host ""
Write-Host "[4/4] Converting AAB to signed APK (1-2 minutes)..." -ForegroundColor Cyan

if (Test-Path $apks)   { Remove-Item $apks -Force }
if (Test-Path $output) { Remove-Item $output -Force }

& java -jar $bundletool build-apks `
    --bundle="$aab" `
    --output="$apks" `
    --mode=universal `
    --ks="$keystore" `
    --ks-pass=pass:android `
    --key-pass=pass:android `
    --ks-key-alias=androiddebugkey

if (-Not (Test-Path $apks)) {
    Write-Host "  [FAIL] APKS build failed" -ForegroundColor Red
    exit 1
}

$tempDir = Join-Path $projectRoot "_apks_temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }

# Use .NET ZipFile API (works regardless of .apks extension,
# unlike Expand-Archive which only accepts .zip)
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($apks, $tempDir)

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
