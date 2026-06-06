import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteMatch, updateMatch } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const matchId = Number(params.id);
  if (!matchId) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

  const body = await req.json() as {
    date: string;
    bracket: string;
    type: string;
    team1Players: string[];
    team2Players: string[];
    team1Score: number;
    team2Score: number;
  };

  const fmt = (players: string[]) => players.map((p) => p.toUpperCase().trim()).join('/');
  const team1 = fmt(body.team1Players);
  const team2 = fmt(body.team2Players);
  const win   = body.team1Score > body.team2Score ? team1 : team2;
  const loss  = body.team1Score > body.team2Score ? team2 : team1;

  await updateMatch({
    matchId,
    date: body.date,
    bracket: body.bracket,
    type: body.type,
    team1, team2, win, loss,
    team1Score: body.team1Score,
    team2Score: body.team2Score,
    players: `${win}/${loss}`,
  });

  revalidatePath('/');
  revalidatePath('/activities');
  revalidatePath('/players');
  revalidatePath('/stats');
  revalidatePath('/rivalries');

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matchId = Number(params.id);
  if (!matchId) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  }

  await deleteMatch(matchId);
  return NextResponse.json({ ok: true });
}
