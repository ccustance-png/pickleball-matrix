import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlayerByEmail, sendFriendRequest } from '@/lib/db';
import { notifyPlayers } from '@/lib/push';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { toPlayer } = await req.json();
  if (!toPlayer) return Response.json({ error: 'Missing toPlayer' }, { status: 400 });

  const profile = await getPlayerByEmail(session.user.email).catch(() => null);
  const fromPlayer = profile?.player;
  if (!fromPlayer) return Response.json({ error: 'No claimed profile found' }, { status: 404 });

  if (fromPlayer.toUpperCase() === toPlayer.toUpperCase()) {
    return Response.json({ error: 'Cannot add yourself' }, { status: 400 });
  }

  const result = await sendFriendRequest(fromPlayer.toUpperCase(), toPlayer.toUpperCase());

  notifyPlayers([toPlayer.toUpperCase()], {
    title: '🤝 Friend request!',
    body: `${fromPlayer} wants to be friends`,
    url: `/players/${encodeURIComponent(toPlayer)}`,
  }).catch(() => {});

  return Response.json(result);
}
