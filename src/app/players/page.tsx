import { getAllMatches } from '@/lib/sheets';
import PlayerTabs from '@/components/PlayerTabs';

export const revalidate = 60;

export default async function PlayersPage() {
  const matches = await getAllMatches().catch(() => []);

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

  function toRanked(map: Map<string, { wins: number; losses: number }>) {
    return Array.from(map.entries())
      .map(([name, s]) => ({
        name,
        wins: s.wins,
        losses: s.losses,
        winRate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0,
      }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Player Rankings</h1>
      <PlayerTabs singles={toRanked(singlesMap)} doubles={toRanked(doublesMap)} />
    </div>
  );
}
