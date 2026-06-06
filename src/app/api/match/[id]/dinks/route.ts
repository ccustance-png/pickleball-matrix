import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMatchDinks, toggleMatchDink } from '@/lib/sheets';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const matchId = Number(params.id);
  const dinks = await getMatchDinks(matchId);
  return NextResponse.json(dinks);
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matchId = Number(params.id);
  const result = await toggleMatchDink(
    matchId,
    session.user.email,
    session.user.name ?? session.user.email
  );
  return NextResponse.json(result);
}
