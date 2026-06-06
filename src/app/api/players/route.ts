import { NextResponse } from 'next/server';
import { getAllMatches, getAllProfilesMap } from '@/lib/db';

export async function GET() {
  try {
    const [matches, profilesMap] = await Promise.all([
      getAllMatches(),
      getAllProfilesMap().catch(() => ({} as Record<string, { firstName?: string; lastName?: string; player: string; photoUrl: string; bio: string; googleEmail: string }>)),
    ]);

    const playerMap = new Map<string, { wins: number; losses: number; singles: number; doubles: number }>();

    for (const m of matches) {
      const allPlayers = m.players.split('/').map((p) => p.trim()).filter(Boolean);
      const winPlayers = m.win.split('/').map((p) => p.trim()).filter(Boolean);
      const isDoubles = m.type === 'DOUBLES';

      for (const name of allPlayers) {
        if (!playerMap.has(name)) playerMap.set(name, { wins: 0, losses: 0, singles: 0, doubles: 0 });
        const s = playerMap.get(name)!;
        if (winPlayers.includes(name)) s.wins++;
        else s.losses++;
        if (isDoubles) s.doubles++;
        else s.singles++;
      }
    }

    // Include registered players who haven't played yet
    Object.keys(profilesMap).forEach(key => {
      const username = profilesMap[key].player;
      if (username && !playerMap.has(username)) {
        playerMap.set(username, { wins: 0, losses: 0, singles: 0, doubles: 0 });
      }
    });

    const getDisplayName = (username: string): string => {
      const p = profilesMap[username.toUpperCase()];
      if (p?.firstName && p?.lastName) return `${p.firstName} ${p.lastName}`;
      return username;
    };

    const players = Array.from(playerMap.entries())
      .map(([name, s]) => ({
        name,
        displayName: getDisplayName(name),
        matches: s.wins + s.losses,
        wins: s.wins,
        losses: s.losses,
        singles: s.singles,
        doubles: s.doubles,
        winRate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0,
      }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);

    return NextResponse.json(players);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
