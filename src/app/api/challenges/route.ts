import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChallenges, createChallenge } from '@/lib/sheets';

export async function GET() {
  const challenges = await getChallenges();
  return NextResponse.json(challenges);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to post a challenge' }, { status: 401 });
  }

  const { fromPlayer, toPlayer, type, message } = await req.json();
  if (!fromPlayer || !toPlayer || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (fromPlayer.trim().toUpperCase() === toPlayer.trim().toUpperCase()) {
    return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });
  }

  const result = await createChallenge(
    fromPlayer.trim().toUpperCase(),
    session.user.email,
    toPlayer.trim().toUpperCase(),
    type,
    (message ?? '').trim()
  );
  return NextResponse.json(result);
}
