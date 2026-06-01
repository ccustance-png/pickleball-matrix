import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllMatches, getProfile } from '@/lib/sheets';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ player: null });

  const email = session.user.email;

  // Collect all unique player names from match history
  const matches = await getAllMatches().catch(() => []);
  const playerNames = new Set<string>();
  for (const m of matches) {
    m.players.split('/').map((p) => p.trim()).filter(Boolean).forEach((p) => playerNames.add(p));
  }

  // Fetch all profiles in parallel and find the one that matches this email
  const profiles = await Promise.all(Array.from(playerNames).map((name) => getProfile(name)));
  const found = profiles.find((p) => p?.googleEmail === email);

  return Response.json({ player: found?.player ?? null });
}
