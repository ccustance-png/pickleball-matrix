import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File;
  const name = (form.get('name') as string) ?? 'unknown';
  const type = (form.get('type') as string) ?? 'profile';

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = type === 'match'
    ? `matches/${Date.now()}.${ext}`
    : `profiles/${name.toUpperCase()}.${ext}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: type === 'match',
  });

  return NextResponse.json({ url: blob.url });
}
