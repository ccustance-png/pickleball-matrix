import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { savePushSubscription } from '@/lib/sheets';
import { getTabRows } from '@/lib/sheets';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscription } = await req.json();
  if (!subscription?.endpoint) {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  // Look up the player name from their email
  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const profile = rows.slice(1).find(r => (r[3] ?? '').toString().trim() === session.user!.email);
  const playerName = profile?.[0]?.toString().trim();

  if (!playerName) {
    return Response.json({ error: 'No claimed profile found' }, { status: 404 });
  }

  await savePushSubscription(playerName, JSON.stringify(subscription));
  return Response.json({ ok: true });
}
