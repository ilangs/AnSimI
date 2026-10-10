#!/usr/bin/env bash
set -euo pipefail

# EAS File secret GOOGLE_SERVICES_JSON → android/app/google-services.json
# (bare workflow: android/ 커밋 시 app.config googleServicesFile만으로는 Gradle에 복사되지 않음)
if [ -n "${GOOGLE_SERVICES_JSON:-}" ] && [ -f "$GOOGLE_SERVICES_JSON" ]; then
  cp "$GOOGLE_SERVICES_JSON" android/app/google-services.json
  echo "✅ google-services.json → android/app/"
else
  echo "⚠️  GOOGLE_SERVICES_JSON not set or file missing — FCM/Gradle may fail if plugin requires it"
fi
