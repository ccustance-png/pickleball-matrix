import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File;
  const name = (form.get('name') as string) ?? 'unknown';

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop() ?? 'jpg';
  const blob = await put(`profiles/${name.toUpperCase()}.${ext}`, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return NextResponse.json({ url: blob.url });
}
