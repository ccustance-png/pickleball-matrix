import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTabRows } from '@/lib/sheets';

const SCRIPT_URL = process.env.APPS_SCRIPT_URL!;
const NAME_RE = /^[a-zA-Z'\-\s]+$/;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { firstName, lastName } = await req.json() as { firstName: string; lastName: string };

  if (!firstName?.trim() || !lastName?.trim()) {
    return Response.json({ error: 'First and last name are required' }, { status: 400 });
  }
  if (!NAME_RE.test(firstName.trim()) || !NAME_RE.test(lastName.trim())) {
    return Response.json({ error: 'Names can only contain letters, hyphens, and apostrophes' }, { status: 400 });
  }
  if (firstName.trim().length < 2 || lastName.trim().length < 2) {
    return Response.json({ error: 'First and last name must each be at least 2 characters' }, { status: 400 });
  }

  const playerName = `${firstName.trim()} ${lastName.trim()}`.toUpperCase();
  const email = session.user.email;

  // Read PROFILES tab — one call for all checks
  const profileRows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const data = profileRows.slice(1).filter(r => r[0]);

  // Already have a profile?
  const alreadyOwned = data.find(r => (r[3] ?? '').toString().trim() === email);
  if (alreadyOwned) {
    return Response.json({ error: 'You already have a profile', playerName: alreadyOwned[0]?.toString().trim() }, { status: 409 });
  }

  // Name taken?
  const nameTaken = data.find(r => r[0].toString().trim().toUpperCase() === playerName);
  if (nameTaken) {
    return Response.json({ error: 'That name is already taken — try adding a middle initial (e.g. Calvin A. Smith)' }, { status: 409 });
  }

  // Create profile in GAS
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'claimProfile', player: playerName, googleEmail: email }),
  });

  if (!res.ok) {
    return Response.json({ error: 'Failed to save profile' }, { status: 500 });
  }

  return Response.json({ success: true, playerName });
}
