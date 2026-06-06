import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlayerByEmail } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ player: null });

  const profile = await getPlayerByEmail(session.user.email).catch(() => null);
  return Response.json({ player: profile?.player ?? null });
}
