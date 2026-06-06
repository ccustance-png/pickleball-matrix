import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProfile } from '@/lib/sheets';

const SCRIPT_URL = process.env.APPS_SCRIPT_URL!;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName).toUpperCase();

  const profile = await getProfile(name);
  if (profile?.googleEmail) {
    return Response.json({ error: 'Profile already claimed' }, { status: 409 });
  }

  // Accept optional firstName/lastName for display name
  let firstName = '';
  let lastName  = '';
  try {
    const body = await req.json().catch(() => ({}));
    firstName = body.firstName ?? '';
    lastName  = body.lastName  ?? '';
  } catch { /* no body is fine */ }

  await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'claimProfile',
      player: name,
      googleEmail: session.user.email,
      firstName,
      lastName,
    }),
  });

  return Response.json({ success: true });
}
