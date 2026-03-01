export const maxDuration = 300; // Vercel: 최대 300초

import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';
import { getPreset } from '@/lib/presets';
import { buildPrompt } from '@/lib/prompt-builder';
import { cropAllSkeletonFrames } from '@/lib/skeleton-cropper';
import { FaceAnalysis } from '@/types';

const MODEL = 'zsxkib/instant-id:2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789';

export async function POST(req: NextRequest) {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const { blobUrl, styleId, faceAnalysis } = (await req.json()) as {
    blobUrl: string;
    styleId: string;
    faceAnalysis: FaceAnalysis;
  };

  if (!blobUrl || !styleId || !faceAnalysis) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  }

  const preset = getPreset(styleId);
  if (!preset) {
    return NextResponse.json({ error: `프리셋을 찾을 수 없음: ${styleId}` }, { status: 404 });
  }

  // 스켈레톤 파일 1회 읽기 → 4프레임 크롭
  const skeletonBuffers = await cropAllSkeletonFrames(styleId);

  // 4프레임 병렬 생성
  const frameResults = await Promise.all(
    [0, 1, 2, 3].map(async (frameIndex) => {
      const { positive, negative } = buildPrompt(preset, faceAnalysis, frameIndex);
      const skeletonDataUrl = `data:image/jpeg;base64,${skeletonBuffers[frameIndex].toString('base64')}`;

      const output = await replicate.run(MODEL, {
        input: {
          image: blobUrl,          // face_image (얼굴 보존용)
          pose_image: skeletonDataUrl, // 포즈 제어용 스켈레톤
          prompt: positive,
          negative_prompt: negative,
          num_inference_steps: 30,
          controlnet_conditioning_scale: 0.8,
          ip_adapter_scale: 0.8,
        },
      });

      // Replicate 출력은 URL 배열 또는 단일 URL
      const outputUrl = Array.isArray(output) ? output[0] : output;
      return String(outputUrl);
    })
  );

  return NextResponse.json({ frames: frameResults });
}
