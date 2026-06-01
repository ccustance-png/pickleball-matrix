import Link from 'next/link';
import { getAllMatches, getEloRankings } from '@/lib/sheets';
import EloTabs from '@/components/EloTabs';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

export const revalidate = 15;

export default async function HomePage() {
  const [matches, elo] = await Promise.all([
    getAllMatches().catch(() => []),
    getEloRankings().catch(() => ({ singles: [], doubles: [] })),
  ]);

  const uniquePlayers = new Set(matches.flatMap((m) => m.players.split('/').map((p) => p.trim())));
  const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  const todayMatches = matches.filter((m) => m.date === today).length;

  // Compute W/L records per player for singles and doubles
  const singlesWL: Record<string, { wins: number; losses: number }> = {};
  const doublesWL: Record<string, { wins: number; losses: number }> = {};

  for (const m of matches) {
    const map = m.type === 'SINGLES' ? singlesWL : doublesWL;
    const allPlayers = m.players.split('/').map((p) => p.trim()).filter(Boolean);
    const winPlayers = m.win.split('/').map((p) => p.trim());
    for (const player of allPlayers) {
      if (!map[player]) map[player] = { wins: 0, losses: 0 };
      if (winPlayers.includes(player)) map[player].wins++;
      else map[player].losses++;
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Matches" value={matches.length} />
        <StatCard label="Players" value={uniquePlayers.size} />
        <StatCard label="Today" value={todayMatches} />
        <StatCard label="Latest ID" value={matches.length > 0 ? Math.max(...matches.map((m) => m.matchId)) : '—'} />
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link
          href="/submit"
          className="px-5 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold rounded-lg text-sm transition-colors"
        >
          + Log a Match
        </Link>
      </div>

      {/* ELO Rankings */}
      <EloTabs singles={elo.singles} doubles={elo.doubles} singlesWL={singlesWL} doublesWL={doublesWL} />
    </div>
  );
}
