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
