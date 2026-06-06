import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlayerByEmail, savePushSubscription } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { subscription } = await req.json();
  if (!subscription?.endpoint) return Response.json({ error: 'Invalid subscription' }, { status: 400 });

  const profile = await getPlayerByEmail(session.user.email).catch(() => null);
  const playerName = profile?.player;
  if (!playerName) return Response.json({ error: 'No claimed profile found' }, { status: 404 });

  await savePushSubscription(playerName, JSON.stringify(subscription));
  return Response.json({ ok: true });
}
