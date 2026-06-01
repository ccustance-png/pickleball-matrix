import Link from 'next/link';
import { getAllMatches, getEloRankings, type MatchRow } from '@/lib/sheets';
import EloTabs from '@/components/EloTabs';
import HotRightNow from '@/components/HotRightNow';

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

    [...team1Players, ...team2Players].forEach((p) => { if (elo[p] === undefined) elo[p] = 1000; });

    const matchDate = parseDate(m.date);
    if (matchDate >= cutoff) {
      [...team1Players, ...team2Players].forEach((p) => {
        if (eloAtCutoff[p] === undefined) eloAtCutoff[p] = elo[p];
      });
    }

    const avg1 = team1Players.reduce((s, p) => s + elo[p], 0) / team1Players.length;
    const avg2 = team2Players.reduce((s, p) => s + elo[p], 0) / team2Players.length;
    const exp1 = expected(avg1, avg2);
    const win1 = m.win.trim().toUpperCase() === m.team1.trim().toUpperCase() ? 1 : 0;

    team1Players.forEach((p) => {
      const weight = avg1 > 0 ? elo[p] / avg1 : 1;
      elo[p] += K * weight * (win1 - exp1);
    });
    team2Players.forEach((p) => {
      const weight = avg2 > 0 ? elo[p] / avg2 : 1;
      elo[p] += K * weight * ((1 - win1) - (1 - exp1));
    });
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

  const hotSingles = computeHotPlayers(matches, 'SINGLES');
  const hotDoubles = computeHotPlayers(matches, 'DOUBLES');

  // Most recent close matches (decided by 2 pts or less), up to 5
  const nailBiters = [...matches]
    .reverse()
    .filter((m) => {
      const diff = Math.abs(m.team1Score - m.team2Score);
      return diff <= 2 && (m.team1Score > 0 || m.team2Score > 0);
    })
    .slice(0, 5);

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

      {/* CTA */}
      <Link
        href="/submit"
        className="block w-full py-3 bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold rounded-lg text-sm transition-colors text-center"
      >
        + Log a Match
      </Link>

      {/* Nail Biters */}
      {nailBiters.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-1">🫀 Nail Biters</h2>
          <p className="text-xs text-slate-500 mb-4">Most recent matches decided by 2 points or less</p>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            {nailBiters.map((m) => {
              const team1Won = m.win.trim().toUpperCase() === m.team1.trim().toUpperCase();

              return (
                <div key={m.matchId} className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 last:border-0 bg-slate-950 hover:bg-slate-900 transition-colors">
                  {/* Date + type */}
                  <div className="shrink-0 text-right w-16">
                    <p className="text-xs text-slate-500">{m.date}</p>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      m.type === 'SINGLES' ? 'bg-slate-800 text-slate-400' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {m.type === 'SINGLES' ? 'S' : 'D'}
                    </span>
                  </div>

                  {/* Winner */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/players/${encodeURIComponent(m.win.split('/')[0].trim())}`}
                      className="text-sm font-bold text-lime-400 hover:text-lime-300 transition-colors truncate block"
                    >
                      {m.win}
                    </Link>
                    <p className="text-xs text-slate-500 truncate">{m.loss}</p>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-bold">
                      <span className="text-lime-400">
                        {team1Won ? m.team1Score : m.team2Score}
                      </span>
                      <span className="text-slate-600 mx-1">–</span>
                      <span className="text-slate-400">
                        {team1Won ? m.team2Score : m.team1Score}
                      </span>
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hot Right Now */}
      <HotRightNow singles={hotSingles} doubles={hotDoubles} />

      {/* ELO Rankings */}
      <EloTabs singles={elo.singles} doubles={elo.doubles} singlesWL={singlesWL} doublesWL={doublesWL} />
    </div>
  );
}
