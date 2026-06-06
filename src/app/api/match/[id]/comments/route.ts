import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMatchComments, addMatchComment, getAllMatches } from '@/lib/db';
import { notifyPlayers } from '@/lib/push';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comments = await getMatchComments(Number(id));
  return Response.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { id } = await params;
  const { text } = await req.json();

  if (!text?.trim()) {
    return Response.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }
  if (text.trim().length > 300) {
    return Response.json({ error: 'Comment too long' }, { status: 400 });
  }

  const authorName = session.user.name ?? session.user.email;
  await addMatchComment(Number(id), session.user.email, authorName, text.trim());

  // Notify the players in this match (fire-and-forget)
  getAllMatches().then(matches => {
    const match = matches.find(m => m.matchId === Number(id));
    if (!match) return;
    const players = match.players.split('/').map(p => p.trim()).filter(Boolean);
    notifyPlayers(players, {
      title: `💬 ${authorName} commented`,
      body: text.trim().slice(0, 80),
      url: '/activities',
    });
  }).catch(() => {});

  return Response.json({ success: true });
}
