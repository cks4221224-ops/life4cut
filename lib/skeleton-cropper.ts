import sharp from 'sharp';
import path from 'path';
import { readFile } from 'fs/promises';

// 2×2 합본 스켈레톤을 한 번만 읽어 4프레임 Buffer 배열로 반환
// 프레임 순서: 0=좌상, 1=우상, 2=좌하, 3=우하
export async function cropAllSkeletonFrames(styleId: string): Promise<Buffer[]> {
  const skeletonPath = path.join(process.cwd(), 'public', 'skeletons', `${styleId}.jpg`);
  const fileBuffer = await readFile(skeletonPath);

  const { width, height } = await sharp(fileBuffer).metadata();
  if (!width || !height) {
    throw new Error(`스켈레톤 이미지 메타데이터 읽기 실패: ${styleId}`);
  }

  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  return Promise.all(
    [0, 1, 2, 3].map((frameIndex) => {
      const col = frameIndex % 2;
      const row = Math.floor(frameIndex / 2);
      return sharp(fileBuffer)
        .extract({ left: col * halfW, top: row * halfH, width: halfW, height: halfH })
        .toBuffer();
    })
  );
}
