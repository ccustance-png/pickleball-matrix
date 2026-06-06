import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllProfilesMap } from '@/lib/sheets';

const SCRIPT_URL = process.env.APPS_SCRIPT_URL!;
const NAME_RE    = /^[a-zA-Z'\-\s]+$/;
const USER_RE    = /^[a-zA-Z0-9_\-]+$/;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { username, firstName, lastName } = await req.json() as {
    username: string;
    firstName: string;
    lastName: string;
  };

  if (!username?.trim())  return Response.json({ error: 'Username is required' }, { status: 400 });
  if (!firstName?.trim()) return Response.json({ error: 'First name is required' }, { status: 400 });
  if (!lastName?.trim())  return Response.json({ error: 'Last name is required' }, { status: 400 });

  if (!USER_RE.test(username.trim())) {
    return Response.json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' }, { status: 400 });
  }
  if (!NAME_RE.test(firstName.trim()) || !NAME_RE.test(lastName.trim())) {
    return Response.json({ error: 'Names can only contain letters, hyphens, and apostrophes' }, { status: 400 });
  }

  const playerKey = username.trim().toUpperCase();
  const email     = session.user.email;

  const profilesMap = await getAllProfilesMap().catch(() => ({} as Record<string, { googleEmail: string; player: string; photoUrl: string; bio: string }>));

  // Already have a profile?
  const already = Object.values(profilesMap).find(p => p.googleEmail === email);
  if (already) {
    return Response.json({ error: 'You already have a profile', playerName: already.player }, { status: 409 });
  }

  // Username taken?
  if (profilesMap[playerKey]) {
    return Response.json({ error: 'That username is already taken — try a different one' }, { status: 409 });
  }

  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'claimProfile',
      player: playerKey,
      googleEmail: email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }),
  });

  if (!res.ok) return Response.json({ error: 'Failed to save profile' }, { status: 500 });

  return Response.json({ success: true, playerName: playerKey });
}
