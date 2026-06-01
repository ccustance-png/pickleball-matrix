import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File;
  const name = (form.get('name') as string) ?? 'unknown';
  const type = (form.get('type') as string) ?? 'profile';

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = type === 'match'
    ? `matches/${Date.now()}.jpg`
    : `profiles/${name.toUpperCase()}.jpg`;

  // Auto-orient based on EXIF data so the pixels are physically correct,
  // then strip all metadata. This fixes upside-down / rotated photos in
  // iMessage previews, social shares, and any client that ignores EXIF.
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await sharp(buffer)
    .rotate()          // apply EXIF orientation to actual pixels
    .withMetadata({})  // strip rotation tag (and other metadata) afterwards
    .jpeg({ quality: 88 })
    .toBuffer();

  const blob = await put(path, processed, {
    access: 'public',
    contentType: 'image/jpeg',
    addRandomSuffix: type === 'match',
  });

  return NextResponse.json({ url: blob.url });
}
