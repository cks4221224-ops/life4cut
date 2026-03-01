import sharp from 'sharp';

const FRAME_SIZE = 512;
const BORDER = 16;

// 4개 이미지 URL을 받아 2×2 그리드로 합성 후 border_color 테두리 적용
// @returns base64 PNG 문자열
export async function compositeGrid(frameUrls: string[], borderColor: string): Promise<string> {
  if (frameUrls.length !== 4) {
    throw new Error('4개의 프레임 URL이 필요합니다.');
  }

  const frameBuffers = await Promise.all(
    frameUrls.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`프레임 이미지 fetch 실패: ${url}`);
      const arrayBuffer = await res.arrayBuffer();
      return sharp(Buffer.from(arrayBuffer))
        .resize(FRAME_SIZE, FRAME_SIZE, { fit: 'cover' })
        .png()
        .toBuffer();
    })
  );

  const totalW = FRAME_SIZE * 2 + BORDER * 2;
  const totalH = FRAME_SIZE * 2 + BORDER * 2;

  // 1단계로 테두리 배경 위에 4프레임 직접 배치 (중간 grid 버퍼 제거)
  const result = await sharp({
    create: { width: totalW, height: totalH, channels: 3, background: borderColor },
  })
    .composite([
      { input: frameBuffers[0], left: BORDER,              top: BORDER },
      { input: frameBuffers[1], left: BORDER + FRAME_SIZE,  top: BORDER },
      { input: frameBuffers[2], left: BORDER,               top: BORDER + FRAME_SIZE },
      { input: frameBuffers[3], left: BORDER + FRAME_SIZE,  top: BORDER + FRAME_SIZE },
    ])
    .png()
    .toBuffer();

  return result.toString('base64');
}
