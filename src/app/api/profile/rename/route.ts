import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProfile, renamePlayer, getAllProfilesMap } from '@/lib/db';

const NAME_RE = /^[a-zA-Z'\-\s]+$/;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not signed in' }, { status: 401 });

  const { oldName, firstName, lastName } = await req.json() as {
    oldName: string; firstName: string; lastName: string;
  };

  if (!oldName?.trim() || !firstName?.trim() || !lastName?.trim()) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!NAME_RE.test(firstName.trim()) || !NAME_RE.test(lastName.trim())) {
    return Response.json({ error: 'Names can only contain letters, hyphens, and apostrophes' }, { status: 400 });
  }

  const newName = `${firstName.trim()} ${lastName.trim()}`.toUpperCase();
  const normalOld = oldName.trim().toUpperCase();
  if (newName === normalOld) return Response.json({ ok: true, playerName: newName });

  // Verify the caller owns this profile
  const profile = await getProfile(normalOld).catch(() => null);
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.googleEmail !== session.user.email) {
    return Response.json({ error: 'You do not own this profile' }, { status: 403 });
  }

  // Check new name isn't already taken
  const existing = await getProfile(newName).catch(() => null);
  if (existing && existing.player.toUpperCase() !== normalOld) {
    return Response.json({ error: 'That name is already taken — try adding a middle initial' }, { status: 409 });
  }

  await renamePlayer(normalOld, newName);
  return Response.json({ ok: true, playerName: newName });
}
