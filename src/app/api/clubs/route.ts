import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTabRows, createClub } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, location, photoUrl } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });

  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const profile = rows.slice(1).find(r => (r[3] ?? '').toString().trim() === session.user!.email);
  const playerName = profile?.[0]?.toString().trim();
  if (!playerName) return Response.json({ error: 'No claimed profile found' }, { status: 404 });

  const result = await createClub(
    name.trim(),
    description?.trim() ?? '',
    location?.trim() ?? '',
    photoUrl?.trim() ?? '',
    playerName,
  );
  return Response.json(result);
}
