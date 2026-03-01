import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const MAX_SIZE_MB = 10;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.` }, { status: 413 });
  }

  const blob = await put(`selfies/${Date.now()}-${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
  });

  return NextResponse.json({ blobUrl: blob.url });
}
