import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — generous limit for iPhone photos

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const name = (form.get('name') as string) ?? 'unknown';
    const type = (form.get('type') as string) ?? 'profile';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Photo too large (${Math.round(file.size / 1024 / 1024)}MB). Max size is 10MB.` },
        { status: 400 }
      );
    }

    const path = type === 'match'
      ? `matches/${Date.now()}.jpg`
      : `profiles/${name.toUpperCase()}.jpg`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Process: auto-orient from EXIF, convert to JPEG, strip metadata
    let processed: Buffer;
    try {
      processed = await sharp(buffer)
        .rotate()           // apply EXIF orientation to actual pixels
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch (sharpErr) {
      const msg = sharpErr instanceof Error ? sharpErr.message : String(sharpErr);
      return NextResponse.json({ error: `Image processing failed: ${msg}` }, { status: 422 });
    }

    const blob = await put(path, processed, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: type === 'match',
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown upload error';
    console.error('[upload] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
