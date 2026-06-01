import Link from 'next/link';
import { getAllMatches, getEloRankings, type MatchRow } from '@/lib/sheets';
import EloTabs from '@/components/EloTabs';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

// Replay ELO math to find biggest gainers over the last 14 days
function computeHotPlayers(matches: MatchRow[]) {
  const K = 32;
  const DAYS = 14;

  function expected(a: number, b: number) {
    return 1 / (1 + Math.pow(10, (b - a) / 400));
  }

  function parseDate(d: string): Date {
    const [m, dy, y] = d.split('/').map(Number);
    return new Date(2000 + (y || 0), (m || 1) - 1, dy || 1);
  }

  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const singlesMatches = matches.filter((m) => m.type === 'SINGLES');

  const elo: Record<string, number> = {};
  const eloAtCutoff: Record<string, number> = {};

  for (const m of singlesMatches) {
    const p1 = m.team1.trim().toUpperCase();
    const p2 = m.team2.trim().toUpperCase();
    if (!p1 || !p2) continue;

    if (elo[p1] === undefined) elo[p1] = 1000;
    if (elo[p2] === undefined) elo[p2] = 1000;

    // Snapshot ELO the first time we see each player in a recent match
    const matchDate = parseDate(m.date);
    if (matchDate >= cutoff) {
      if (eloAtCutoff[p1] === undefined) eloAtCutoff[p1] = elo[p1];
      if (eloAtCutoff[p2] === undefined) eloAtCutoff[p2] = elo[p2];
    }

    const exp1 = expected(elo[p1], elo[p2]);
    const win1 = m.win.trim().toUpperCase() === p1 ? 1 : 0;
    elo[p1] += K * (win1 - exp1);
    elo[p2] += K * ((1 - win1) - (1 - exp1));
  }

  return Object.entries(eloAtCutoff)
    .map(([name, before]) => ({
      name,
      currentElo: Math.round(elo[name]),
      change: Math.round(elo[name] - before),
      pct: before > 0 ? +((elo[name] - before) / before * 100).toFixed(1) : 0,
    }))
    .filter((p) => p.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);
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

  const hotPlayers = computeHotPlayers(matches);

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

      {/* Hot Right Now */}
      {hotPlayers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            🔥 Hot Right Now
            <span className="ml-2 text-xs font-normal text-slate-500">Biggest ELO gainers · last 14 days</span>
          </h2>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                {hotPlayers.map((p, i) => (
                  <tr key={p.name} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs w-6">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/players/${encodeURIComponent(p.name)}`}
                        className="font-semibold text-slate-100 hover:text-lime-400 transition-colors"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">{p.currentElo}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-lime-400">
                      +{p.change}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-400 text-xs font-bold">
                        ↑{p.pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ELO Rankings */}
      <EloTabs singles={elo.singles} doubles={elo.doubles} singlesWL={singlesWL} doublesWL={doublesWL} />
    </div>
  );
}
