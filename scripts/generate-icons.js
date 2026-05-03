const sharp = require('sharp');
const path = require('path');

const src    = path.join(__dirname, '../apps/mobile/assets/adaptive-icon.png');
const outDir = path.join(__dirname, '../apps/mobile/assets/images');

async function generate() {
  const meta = await sharp(src).metadata();
  console.log(`원본: ${meta.width}x${meta.height} / ${meta.format}`);

  // iOS App Store / 앱 기본 아이콘 — 투명 배경 불가, 흰색 배경 적용
  await sharp(src)
    .resize(1024, 1024, { fit: 'contain', background: { r:255,g:255,b:255,alpha:1 } })
    .flatten({ background: { r:255,g:255,b:255 } })
    .png()
    .toFile(path.join(outDir, 'icon-1024.png'));
  console.log('✅ icon-1024.png  (1024×1024, 흰색 배경)');

  // Android adaptiveIcon foreground — 투명 배경 유지
  await sharp(src)
    .resize(512, 512, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
    .png()
    .toFile(path.join(outDir, 'icon-512.png'));
  console.log('✅ icon-512.png   (512×512,  투명 배경)');

  // Android 기본 아이콘 / 웹 파비콘 — 흰색 배경
  await sharp(src)
    .resize(192, 192, { fit: 'contain', background: { r:255,g:255,b:255,alpha:1 } })
    .flatten({ background: { r:255,g:255,b:255 } })
    .png()
    .toFile(path.join(outDir, 'icon-192.png'));
  console.log('✅ icon-192.png   (192×192,  흰색 배경)');

  console.log('\n완료!');
}

generate().catch(console.error);
