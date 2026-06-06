import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlayerByEmail, sendDirectMessage, markMessagesRead } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ player: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getPlayerByEmail(session.user.email).catch(() => null);
  const myPlayer = profile?.player;
  if (!myPlayer) return Response.json({ error: 'No claimed profile' }, { status: 404 });

  const { player: rawPlayer } = await params;
  const otherPlayer = decodeURIComponent(rawPlayer);
  const body = await req.json();

  if (body.action === 'read') {
    await markMessagesRead(myPlayer, otherPlayer);
    return Response.json({ ok: true });
  }

  const text = body.text?.toString().trim();
  if (!text) return Response.json({ error: 'Text required' }, { status: 400 });

  const result = await sendDirectMessage(myPlayer, otherPlayer, text);
  return Response.json(result);
}
