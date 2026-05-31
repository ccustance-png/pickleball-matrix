import { NextResponse } from 'next/server';
import { getAllMatches } from '@/lib/sheets';

export async function GET() {
  try {
    const matches = await getAllMatches();

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

    const players = Array.from(playerMap.entries())
      .map(([name, s]) => ({
        name,
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
