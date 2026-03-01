import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  const { blobUrl } = await req.json();

  if (!blobUrl) {
    return NextResponse.json({ error: 'blobUrl이 없습니다.' }, { status: 400 });
  }

  try {
    await del(blobUrl);
    return NextResponse.json({ success: true });
  } catch {
    // 삭제 실패해도 200 반환 (잔류 감수 정책)
    return NextResponse.json({ success: false });
  }
}
