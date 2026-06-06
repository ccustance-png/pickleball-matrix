import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateFriendRequest } from '@/lib/sheets';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json() as { status: 'ACCEPTED' | 'DECLINED' };

  if (status !== 'ACCEPTED' && status !== 'DECLINED') {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  await updateFriendRequest(id, status);
  return Response.json({ ok: true });
}
