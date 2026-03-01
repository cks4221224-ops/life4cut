import { NextRequest, NextResponse } from 'next/server';
import { getPreset } from '@/lib/presets';
import { compositeGrid } from '@/lib/composite';

export async function POST(req: NextRequest) {
  const { frames, styleId } = (await req.json()) as {
    frames: string[];
    styleId: string;
  };

  if (!frames || frames.length !== 4) {
    return NextResponse.json({ error: '4개의 프레임 URL이 필요합니다.' }, { status: 400 });
  }

  const preset = getPreset(styleId);
  if (!preset) {
    return NextResponse.json({ error: `프리셋을 찾을 수 없음: ${styleId}` }, { status: 404 });
  }

  const resultBase64 = await compositeGrid(frames, preset.border_color);

  return NextResponse.json({ resultImage: resultBase64 });
}
