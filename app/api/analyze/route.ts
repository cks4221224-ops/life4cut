import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { FaceAnalysis } from '@/types';

const SYSTEM_PROMPT = `You are a professional fashion and appearance analyst.
Analyze the person in the image and return a JSON object with the following exact structure.
Respond ONLY with valid JSON, no markdown, no explanation.

{
  "subject_biometrics": {
    "ethnicity_and_vibe": "...",
    "age_range": "...",
    "skin_details": "...",
    "body_build": "..."
  },
  "subject_features": {
    "hair_styling": "...",
    "eye_details": "...",
    "expression_variants": [],
    "makeup_specification": "..."
  },
  "attire_and_ornaments": {
    "main_outfit": "...",
    "materials": ["..."],
    "accessories": {
      "head_and_neck": "...",
      "jewelry_and_details": ["..."],
      "hand_accessories": "..."
    }
  }
}`;

export async function POST(req: NextRequest) {
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

  const content = response.choices[0].message.content ?? '';

  let faceAnalysis: FaceAnalysis;
  try {
    faceAnalysis = JSON.parse(content);
  } catch {
    return NextResponse.json(
      { error: 'GPT-4o 응답 파싱 실패', raw: content },
      { status: 502 }
    );
  }

  return NextResponse.json({ faceAnalysis });
}
