import { getAllMatches, getEloRankings } from '@/lib/sheets';
import StatsTabs from '@/components/StatsTabs';

export const revalidate = 15;

export default async function StatsPage() {
  const [matches, elo] = await Promise.all([
    getAllMatches().catch(() => []),
    getEloRankings().catch(() => ({ singles: [], doubles: [] })),
  ]);

  const playerSet = new Set(
    matches.flatMap(m =>
      m.players.split('/').map(p => p.trim()).filter(Boolean)
    )
  );
  const players = Array.from(playerSet).sort();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Stats</h1>
        <p className="text-slate-400 text-sm mt-1">Insights and match predictions</p>
      </div>
      <StatsTabs matches={matches} singlesElo={elo.singles} doublesElo={elo.doubles} players={players} />
    </div>
  );
}
