import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { FaceAnalysis } from '@/types';

const SYSTEM_PROMPT = `You are a professional fashion stylist describing a photo for image generation purposes.
Look at the image and describe the styling details. Return ONLY valid JSON with this exact structure, no markdown, no explanation.

{
  "subject_biometrics": {
    "ethnicity_and_vibe": "describe overall aesthetic vibe and style (e.g. 'Korean street style', 'Y2K aesthetic', 'minimalist chic')",
    "age_range": "estimated age range (e.g. 'early 20s')",
    "skin_details": "skin tone description for lighting reference (e.g. 'fair skin, warm undertone')",
    "body_build": "general build for composition (e.g. 'slender', 'average build')"
  },
  "subject_features": {
    "hair_styling": "detailed hair description (length, color, texture, style)",
    "eye_details": "eye shape and any visible makeup",
    "expression_variants": [],
    "makeup_specification": "makeup style if visible (e.g. 'natural no-makeup look', 'bold red lip')"
  },
  "attire_and_ornaments": {
    "main_outfit": "describe the clothing items visible",
    "materials": ["list fabric types if identifiable"],
    "accessories": {
      "head_and_neck": "any headwear or neckwear",
      "jewelry_and_details": ["list any jewelry"],
      "hand_accessories": "any bags, watches, or hand items"
    }
  }
}`;

export async function POST(req: NextRequest) {
  try {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { blobUrl } = await req.json();

  if (!blobUrl) {
    return NextResponse.json({ error: 'blobUrl이 없습니다.' }, { status: 400 });
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: blobUrl, detail: 'high' } },
        ],
      },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  console.log('[analyze] GPT-4o raw response:', raw);

  // JSON 객체 부분만 추출 (마크다운 코드블록 포함 모든 경우 대응)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const content = jsonMatch ? jsonMatch[0] : raw;

  let faceAnalysis: FaceAnalysis;
  try {
    faceAnalysis = JSON.parse(content);
  } catch {
    return NextResponse.json(
      { error: `GPT-4o 응답 파싱 실패: ${raw.slice(0, 200)}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ faceAnalysis });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `분석 실패: ${message}` }, { status: 500 });
  }
}
