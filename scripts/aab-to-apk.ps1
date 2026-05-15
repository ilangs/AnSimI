# ─────────────────────────────────────────────────────────
# AAB → Universal APK 변환 스크립트 (Windows PowerShell)
#
# 사용법:
#   1. bundletool 다운로드 후 C:\AnSimI\bundletool.jar 로 저장
#      https://github.com/google/bundletool/releases
#   2. EAS 대시보드에서 AAB 다운로드 후 C:\AnSimI\app.aab 로 저장
#   3. 이 스크립트 실행: powershell -File scripts/aab-to-apk.ps1
#
# 결과: C:\AnSimI\ansimi.apk 생성 (카톡 공유 → 폰 설치)
# ─────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

$bundletool = Join-Path $projectRoot "bundletool.jar"
$aab        = Join-Path $projectRoot "app.aab"
$apks       = Join-Path $projectRoot "app.apks"
$output     = Join-Path $projectRoot "ansimi.apk"

# ── 사전 검증 ─────────────────────────────────────────────
Write-Host "🔍 사전 검증 중..." -ForegroundColor Cyan

if (-Not (Test-Path $bundletool)) {
    Write-Host "❌ bundletool.jar 파일이 없습니다." -ForegroundColor Red
    Write-Host "   다운로드: https://github.com/google/bundletool/releases" -ForegroundColor Yellow
    Write-Host "   위치: $bundletool" -ForegroundColor Yellow
    exit 1
}

if (-Not (Test-Path $aab)) {
    Write-Host "❌ app.aab 파일이 없습니다." -ForegroundColor Red
    Write-Host "   EAS 대시보드에서 다운로드 후 위치에 저장:" -ForegroundColor Yellow
    Write-Host "   $aab" -ForegroundColor Yellow
    exit 1
}

# Java 확인
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✅ Java 발견: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Java가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "   다운로드: https://adoptium.net/" -ForegroundColor Yellow
    exit 1
}

# ── 기존 파일 정리 ────────────────────────────────────────
if (Test-Path $apks) { Remove-Item $apks -Force }
if (Test-Path $output) { Remove-Item $output -Force }

# ── APKS 빌드 ─────────────────────────────────────────────
Write-Host ""
Write-Host "📦 AAB → APKS 변환 중... (약 1~2분)" -ForegroundColor Cyan
java -jar $bundletool build-apks `
    --bundle=$aab `
    --output=$apks `
    --mode=universal

if (-Not (Test-Path $apks)) {
    Write-Host "❌ APKS 빌드 실패" -ForegroundColor Red
    exit 1
}

# ── APKS는 ZIP이므로 압축 해제 ───────────────────────────
Write-Host "📂 APKS 압축 해제 중..." -ForegroundColor Cyan
$tempDir = Join-Path $projectRoot "_apks_temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
Expand-Archive -Path $apks -DestinationPath $tempDir

$universalApk = Join-Path $tempDir "universal.apk"
if (Test-Path $universalApk) {
    Move-Item $universalApk $output -Force
    Remove-Item $tempDir -Recurse -Force
    Remove-Item $apks -Force
} else {
    Write-Host "❌ universal.apk 를 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

# ── 완료 ─────────────────────────────────────────────────
$size = (Get-Item $output).Length / 1MB
Write-Host ""
Write-Host "✅ 완료!" -ForegroundColor Green
Write-Host "   파일: $output" -ForegroundColor Green
Write-Host "   크기: $([math]::Round($size, 1)) MB" -ForegroundColor Green
Write-Host ""
Write-Host "📱 폰 설치 방법:" -ForegroundColor Cyan
Write-Host "   1. ansimi.apk 를 카톡 '나에게 보내기'로 전송" -ForegroundColor White
Write-Host "   2. 폰에서 다운로드 → 알 수 없는 출처 허용 → 설치" -ForegroundColor White
