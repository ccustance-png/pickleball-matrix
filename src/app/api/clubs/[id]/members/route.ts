import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTabRows, getAllClubMembers, joinClub, leaveClub } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ isMember: false, playerName: null });

  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const profile = rows.slice(1).find(r => (r[3] ?? '').toString().trim() === session.user!.email);
  const playerName = profile?.[0]?.toString().trim() ?? null;
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

  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const profile = rows.slice(1).find(r => (r[3] ?? '').toString().trim() === session.user!.email);
  const playerName = profile?.[0]?.toString().trim();
  if (!playerName) return Response.json({ error: 'No claimed profile found' }, { status: 404 });

  if (action === 'join') {
    await joinClub(params.id, playerName);
  } else {
    await leaveClub(params.id, playerName);
  }
  return Response.json({ ok: true });
}
