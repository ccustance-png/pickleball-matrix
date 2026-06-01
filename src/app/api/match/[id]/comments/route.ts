import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMatchComments, addMatchComment } from '@/lib/sheets';

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

  await addMatchComment(
    Number(id),
    session.user.email,
    session.user.name ?? session.user.email,
    text.trim()
  );

  return Response.json({ success: true });
}
