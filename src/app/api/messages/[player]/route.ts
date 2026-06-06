import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTabRows, sendDirectMessage, markMessagesRead } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

async function resolvePlayer(email: string): Promise<string | null> {
  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const row = rows.slice(1).find(r => (r[3] ?? '').toString().trim() === email);
  return row?.[0]?.toString().trim() ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ player: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const myPlayer = await resolvePlayer(session.user.email);
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
