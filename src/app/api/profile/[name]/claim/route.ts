import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProfile, claimPlayer, upsertProfile } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not signed in' }, { status: 401 });

  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName).toUpperCase();

  const profile = await getProfile(name).catch(() => null);
  if (profile?.googleEmail) return Response.json({ error: 'Profile already claimed' }, { status: 409 });

  let firstName = '';
  let lastName = '';
  try {
    const body = await req.json().catch(() => ({}));
    firstName = body.firstName ?? '';
    lastName = body.lastName ?? '';
  } catch { /* no body is fine */ }

  await claimPlayer(name, session.user.email);
  if (firstName || lastName) {
    await upsertProfile(name, profile?.photoUrl ?? '', profile?.bio ?? '', firstName, lastName, profile?.location ?? '');
  }

  return Response.json({ success: true });
}
