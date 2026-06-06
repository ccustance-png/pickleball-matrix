import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlayerByEmail, getAllClubMembers, joinClub, leaveClub } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ isMember: false, playerName: null });

  const profile = await getPlayerByEmail(session.user.email).catch(() => null);
  const playerName = profile?.player ?? null;
  if (!playerName) return Response.json({ isMember: false, playerName: null });

  const members = await getAllClubMembers().catch(() => []);
  const isMember = members.some(
    m => m.clubId === params.id && m.playerName.toUpperCase() === playerName.toUpperCase(),
  );
  return Response.json({ isMember, playerName });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = await req.json();
  if (action !== 'join' && action !== 'leave') {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const profile = await getPlayerByEmail(session.user.email).catch(() => null);
  const playerName = profile?.player;
  if (!playerName) return Response.json({ error: 'No claimed profile found' }, { status: 404 });

  if (action === 'join') {
    await joinClub(params.id, playerName);
  } else {
    await leaveClub(params.id, playerName);
  }
  return Response.json({ ok: true });
}
