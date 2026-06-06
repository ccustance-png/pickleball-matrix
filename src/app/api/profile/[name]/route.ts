import { NextResponse } from 'next/server';
import { getProfile, upsertProfile } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const profile = await getProfile(decodeURIComponent(name).toUpperCase());
  return NextResponse.json(profile ?? {});
}

export async function PUT(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { photoUrl, bio, firstName, lastName, location } = await req.json();
  await upsertProfile(decodeURIComponent(name).toUpperCase(), photoUrl ?? '', bio ?? '', firstName, lastName, location);
  return NextResponse.json({ success: true });
}
