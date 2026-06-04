import Link from 'next/link';
import { getAllMatches, getEloRankings, type MatchRow } from '@/lib/sheets';
import EloTabs from '@/components/EloTabs';
import HotRightNow from '@/components/HotRightNow';

export type StreakMap = Record<string, { count: number; kind: 'W' | 'L' }>;

/** For each player, count how many consecutive wins or losses they have at the END of their match history. */
function computeStreaks(matches: MatchRow[], type: 'SINGLES' | 'DOUBLES'): StreakMap {
  const streaks: StreakMap = {};
  const done = new Set<string>();
  // Most-recent first, competitive only
  const filtered = [...matches]
    .filter(m => m.type === type && m.bracket.toUpperCase() !== 'CASUAL')
    .reverse();

  for (const m of filtered) {
    const winners = m.win.split('/').map(p => p.trim());
    const all = m.players.split('/').map(p => p.trim()).filter(Boolean);
    for (const player of all) {
      if (done.has(player)) continue;
      const kind: 'W' | 'L' = winners.includes(player) ? 'W' : 'L';
      if (!streaks[player]) {
        streaks[player] = { count: 1, kind };
      } else if (streaks[player].kind === kind) {
        streaks[player].count++;
      } else {
        done.add(player);
      }
    }
  }
  return streaks;
}

// Replay ELO math to find biggest gainers over the last 14 days
function computeHotPlayers(matches: MatchRow[], type: 'SINGLES' | 'DOUBLES') {
  const K = 32;
  const DAYS = 14;

  function expected(a: number, b: number) {
    return 1 / (1 + Math.pow(10, (b - a) / 400));
  }

  // Dynamic K: higher ELO = smaller K (harder to extend lead)
  //            lower ELO  = larger K  (easier to close gap)
  function dynK(playerElo: number) {
    return K * (2000 / (Math.max(playerElo, 400) + 1000));
  }

  function parseDate(d: string): Date {
    const [m, dy, y] = d.split('/').map(Number);
    return new Date(2000 + (y || 0), (m || 1) - 1, dy || 1);
  }

  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const filtered = matches.filter((m) => m.type === type && m.bracket.toUpperCase() !== 'CASUAL');

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

    // MOV multiplier: scales with score margin, dampened by ELO gap
    // → blowout vs equal ELO = big bonus; blowout vs weak team = small bonus
    const margin = Math.abs((m.team1Score || 0) - (m.team2Score || 0));
    const competitiveness = 1 - Math.abs(exp1 - 0.5) * 2; // 1.0=equal, ~0=mismatch
    const rawMov = 1 + margin * 0.1;
    const movMultiplier = 1 + (rawMov - 1) * competitiveness;

    // outcome = movMultiplier * (win - expected), K NOT included — each player applies their own dynK
    const applyDoublesChange = (players: string[], outcome: number) => {
      if (players.length < 2) {
        players.forEach((p) => { elo[p] += dynK(elo[p] || 1000) * outcome; });
        return;
      }
      const elos = players.map((p) => elo[p] || 1000);
      const hi = Math.max(...elos);
      const lo = Math.min(...elos);
      const proportion = lo > 0 ? hi / lo : 1;
      players.forEach((p) => {
        const playerElo = elo[p] || 1000;
        const change = dynK(playerElo) * outcome;
        if (playerElo >= hi) {
          elo[p] += change;
        } else {
          elo[p] += change > 0 ? change * proportion : change / proportion;
        }
      });
    };

    applyDoublesChange(team1Players, movMultiplier * (win1 - exp1));
    applyDoublesChange(team2Players, movMultiplier * ((1 - win1) - (1 - exp1)));
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

/** Find the player with the most competitive wins in the current calendar month. */
function computePlayerOfMonth(matches: MatchRow[]): { name: string; wins: number; type: string } | null {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const wins: Record<string, number> = {};
  for (const m of matches) {
    if (m.bracket.toUpperCase() === 'CASUAL') continue;
    // Parse m/d/yy date
    const [mo, dy, yr] = m.date.split('/').map(Number);
    const matchTime = new Date(2000 + (yr || 0), (mo || 1) - 1, dy || 1).getTime();
    if (matchTime < monthStart) continue;

    for (const p of m.win.split('/').map(p => p.trim()).filter(Boolean)) {
      wins[p] = (wins[p] ?? 0) + 1;
    }
  }

  const entries = Object.entries(wins).filter(([, w]) => w >= 3);
  if (!entries.length) return null;
  const [name, w] = entries.sort((a, b) => b[1] - a[1])[0];
  return { name, wins: w, type: 'wins this month' };
}

export const revalidate = 15;

export default async function HomePage() {
  const [matches, elo] = await Promise.all([
    getAllMatches().catch(() => []),
    getEloRankings().catch(() => ({ singles: [], doubles: [] })),
  ]);

  const hotSingles = computeHotPlayers(matches, 'SINGLES');
  const hotDoubles = computeHotPlayers(matches, 'DOUBLES');
  const singlesStreaks = computeStreaks(matches, 'SINGLES');
  const doublesStreaks = computeStreaks(matches, 'DOUBLES');
  const playerOfMonth = computePlayerOfMonth(matches);

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
        + Log Session
      </Link>

      {/* Player of the Month */}
      {playerOfMonth && (
        <Link href={`/players/${encodeURIComponent(playerOfMonth.name)}`}
          className="flex items-center gap-4 bg-gradient-to-r from-lime-500/10 to-slate-900 border border-lime-500/20 rounded-xl px-5 py-4 hover:border-lime-500/40 transition-colors"
        >
          <span className="text-3xl">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-lime-400 uppercase tracking-wider mb-0.5">Player of the Month</p>
            <p className="text-lg font-bold text-slate-100 truncate">{playerOfMonth.name}</p>
            <p className="text-xs text-slate-400">{playerOfMonth.wins} competitive {playerOfMonth.type}</p>
          </div>
          <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* ELO Rankings */}
      <EloTabs singles={elo.singles} doubles={elo.doubles} singlesWL={singlesWL} doublesWL={doublesWL} singlesStreaks={singlesStreaks} doublesStreaks={doublesStreaks} />

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
    </div>
  );
}
