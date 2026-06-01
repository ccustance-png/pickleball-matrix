import Link from 'next/link';
import { getAllMatches, getEloRankings, type MatchRow } from '@/lib/sheets';
import EloTabs from '@/components/EloTabs';
import HotRightNow from '@/components/HotRightNow';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

// Replay ELO math to find biggest gainers over the last 14 days
function computeHotPlayers(matches: MatchRow[], type: 'SINGLES' | 'DOUBLES') {
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
  const filtered = matches.filter((m) => m.type === type);

  const elo: Record<string, number> = {};
  const eloAtCutoff: Record<string, number> = {};

  for (const m of filtered) {
    const team1Players = m.team1.trim().toUpperCase().split('/').map((p) => p.trim()).filter(Boolean);
    const team2Players = m.team2.trim().toUpperCase().split('/').map((p) => p.trim()).filter(Boolean);
    if (!team1Players.length || !team2Players.length) continue;

    // Initialise ELO for all players
    [...team1Players, ...team2Players].forEach((p) => { if (elo[p] === undefined) elo[p] = 1000; });

    const matchDate = parseDate(m.date);
    const isRecent = matchDate >= cutoff;

    if (isRecent) {
      [...team1Players, ...team2Players].forEach((p) => {
        if (eloAtCutoff[p] === undefined) eloAtCutoff[p] = elo[p];
      });
    }

    const avg1 = team1Players.reduce((s, p) => s + elo[p], 0) / team1Players.length;
    const avg2 = team2Players.reduce((s, p) => s + elo[p], 0) / team2Players.length;
    const exp1 = expected(avg1, avg2);
    const win1 = m.win.trim().toUpperCase() === m.team1.trim().toUpperCase() ? 1 : 0;

    team1Players.forEach((p) => { elo[p] += K * (win1 - exp1); });
    team2Players.forEach((p) => { elo[p] += K * ((1 - win1) - (1 - exp1)); });
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

  const hotSingles = computeHotPlayers(matches, 'SINGLES');
  const hotDoubles = computeHotPlayers(matches, 'DOUBLES');

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
      <HotRightNow singles={hotSingles} doubles={hotDoubles} />

      {/* ELO Rankings */}
      <EloTabs singles={elo.singles} doubles={elo.doubles} singlesWL={singlesWL} doublesWL={doublesWL} />
    </div>
  );
}
