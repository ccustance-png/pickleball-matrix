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

  const { oldName, firstName, lastName } = await req.json() as {
    oldName: string;
    firstName: string;
    lastName: string;
  };

  if (!oldName?.trim() || !firstName?.trim() || !lastName?.trim()) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!NAME_RE.test(firstName.trim()) || !NAME_RE.test(lastName.trim())) {
    return Response.json({ error: 'Names can only contain letters, hyphens, and apostrophes' }, { status: 400 });
  }

  const newName = `${firstName.trim()} ${lastName.trim()}`.toUpperCase();
  const normalOld = oldName.trim().toUpperCase();

  if (newName === normalOld) {
    return Response.json({ ok: true, playerName: newName }); // nothing to do
  }

  // Verify the caller owns this profile
  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const profileRow = rows.slice(1).find(
    r => r[0]?.toString().trim().toUpperCase() === normalOld
  );
  if (!profileRow) {
    return Response.json({ error: 'Profile not found' }, { status: 404 });
  }
  if ((profileRow[3] ?? '').toString().trim() !== session.user.email) {
    return Response.json({ error: 'You do not own this profile' }, { status: 403 });
  }

  // Check new name isn't already taken by someone else
  const taken = rows.slice(1).find(
    r => r[0]?.toString().trim().toUpperCase() === newName &&
         r[0]?.toString().trim().toUpperCase() !== normalOld
  );
  if (taken) {
    return Response.json({ error: 'That name is already taken — try adding a middle initial' }, { status: 409 });
  }

  // Trigger rename in GAS (updates SCORESHEET + PROFILES, recalculates ELO)
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'renamePlayer', oldName: normalOld, newName }),
  });

  if (!res.ok) {
    return Response.json({ error: 'Rename failed in GAS' }, { status: 500 });
  }

  return Response.json({ ok: true, playerName: newName });
}
