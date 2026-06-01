import { getAllMatches, getEloRankings } from '@/lib/sheets';
import PlayerTabs from '@/components/PlayerTabs';

export const revalidate = 15;

export default async function PlayersPage() {
  const [matches, elo] = await Promise.all([
    getAllMatches().catch(() => []),
    getEloRankings().catch(() => ({ singles: [], doubles: [] })),
  ]);

  const singlesMap = new Map<string, { wins: number; losses: number }>();
  const doublesMap = new Map<string, { wins: number; losses: number }>();

  for (const m of matches) {
    const map = m.type === 'SINGLES' ? singlesMap : doublesMap;
    const allPlayers = m.players.split('/').map((p) => p.trim()).filter(Boolean);
    const winPlayers = m.win.split('/').map((p) => p.trim());
    for (const name of allPlayers) {
      if (!map.has(name)) map.set(name, { wins: 0, losses: 0 });
      const s = map.get(name)!;
      if (winPlayers.includes(name)) s.wins++;
      else s.losses++;
    }
  }

  const singlesElo = new Map(elo.singles.map((e) => [e.name.toUpperCase(), e.elo]));
  const doublesElo = new Map(elo.doubles.map((e) => [e.name.toUpperCase(), e.elo]));

  function toRanked(map: Map<string, { wins: number; losses: number }>, eloMap: Map<string, number>) {
    return Array.from(map.entries())
      .map(([name, s]) => ({
        name,
        wins: s.wins,
        losses: s.losses,
        winRate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0,
        elo: eloMap.get(name.toUpperCase()) ?? null,
      }))
      .sort((a, b) => {
        if (a.elo !== null && b.elo !== null) return b.elo - a.elo;
        if (a.elo !== null) return -1;
        if (b.elo !== null) return 1;
        return b.wins - a.wins || b.winRate - a.winRate;
      });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Player Rankings</h1>
      <PlayerTabs
        singles={toRanked(singlesMap, singlesElo)}
        doubles={toRanked(doublesMap, doublesElo)}
      />
    </div>
  );
}
