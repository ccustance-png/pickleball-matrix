import { getAllMatches, getEloRankings } from '@/lib/sheets';
import PowerRankings from '@/components/PowerRankings';

export const revalidate = 15;

export default async function PlayersPage() {
  const [matches, elo] = await Promise.all([
    getAllMatches().catch(() => []),
    getEloRankings().catch(() => ({ singles: [], doubles: [] })),
  ]);

  const singlesWL: Record<string, { wins: number; losses: number }> = {};
  const doublesWL: Record<string, { wins: number; losses: number }> = {};

  for (const m of matches) {
    const map = m.type === 'SINGLES' ? singlesWL : doublesWL;
    const allPlayers = m.players.split('/').map((p) => p.trim()).filter(Boolean);
    const winPlayers = m.win.split('/').map((p) => p.trim());
    for (const name of allPlayers) {
      if (!map[name]) map[name] = { wins: 0, losses: 0 };
      if (winPlayers.includes(name)) map[name].wins++;
      else map[name].losses++;
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">⚡ Power Rankings</h1>
        <p className="text-slate-400 text-sm mt-1">Composite score: ELO 55% · Recent form 30% · Strength of schedule 15%</p>
      </div>
      <PowerRankings
        matches={matches}
        singlesElo={elo.singles}
        doublesElo={elo.doubles}
        singlesWL={singlesWL}
        doublesWL={doublesWL}
      />
    </div>
  );
}
