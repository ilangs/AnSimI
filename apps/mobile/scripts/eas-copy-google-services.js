/**
 * EAS Build pre-install: File secret GOOGLE_SERVICES_JSON → android/app/google-services.json
 * @see https://docs.expo.dev/build-reference/npm-hooks/
 */
const fs = require('fs');
const path = require('path');

if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== 'android') {
  process.exit(0);
}

const src = process.env.GOOGLE_SERVICES_JSON;
const dest = path.join(__dirname, '..', 'android', 'app', 'google-services.json');

if (src && fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('✅ google-services.json → android/app/');
} else {
  console.warn(
    '⚠️  GOOGLE_SERVICES_JSON not set or file missing — Gradle google-services plugin may fail',
  );
}
