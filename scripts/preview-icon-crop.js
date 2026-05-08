/**
 * 아이콘 텍스트 제거 미리보기
 * 세 가지 크롭 비율로 결과 생성 후 비교
 */
const sharp = require('sharp');
const path = require('path');

const src    = path.join(__dirname, '../apps/mobile/assets/adaptive-icon.png');
const outDir = path.join(__dirname, '../apps/mobile/assets');

async function preview() {
  const meta = await sharp(src).metadata();
  console.log(`원본: ${meta.width} × ${meta.height}`);

  const variants = [
    { label: 'v1_60pct', cropH: Math.round(meta.height * 0.60) }, // 614px — 텍스트 완전 제거
    { label: 'v2_65pct', cropH: Math.round(meta.height * 0.65) }, // 665px — 여유 있게
    { label: 'v3_68pct', cropH: Math.round(meta.height * 0.68) }, // 696px — 살짝만 제거
  ];

  for (const v of variants) {
    // 1) 상단 크롭 (텍스트 제거)
    const cropped = await sharp(src)
      .extract({ left: 0, top: 0, width: meta.width, height: v.cropH })
      .toBuffer();

    // 2) 1024×1024 정사각형으로 확대 (여백은 투명)
    await sharp(cropped)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(outDir, `preview_${v.label}.png`));

    console.log(`✅ preview_${v.label}.png  (crop ${v.cropH}px)`);
  }
}

preview().catch(console.error);
