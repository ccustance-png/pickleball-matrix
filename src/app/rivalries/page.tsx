import { getAllMatches, type MatchRow } from '@/lib/db';
import RivalriesView from '@/components/RivalriesView';

export const revalidate = 15;

export type RivalryMatch = {
  matchId: number;
  date: string;
  p1Score: number;
  p2Score: number;
  winnerIsP1: boolean;
  p1EloDelta: number;
  p2EloDelta: number;
};

export type Rivalry = {
  player1: string;
  player2: string;
  player1Wins: number;
  player2Wins: number;
  totalGames: number;
  lastPlayed: string;
  matches: RivalryMatch[];   // chronological oldest → newest
};

// ── ELO helpers — match the rest of the app ───────────────────────────────────
function dynK(e: number): number {
  if (e < 1000) return 40;
  if (e < 1400) return 20;
  return 10;
}
function expWin(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
function movMult(margin: number, exp1: number) {
  const c = 1 - Math.abs(exp1 - 0.5) * 2;
  return 1 + margin * 0.05 * c;
}

// Single ELO replay — returns matchId → { playerName: eloDelta } for every player in every match
function buildEloDeltaMap(
  matches: MatchRow[],
  type: 'SINGLES' | 'DOUBLES',
): Map<number, Record<string, number>> {
  const elo: Record<string, number> = {};
  const out = new Map<number, Record<string, number>>();

  for (const m of matches) {
    if (m.type !== type || m.bracket.toUpperCase() === 'CASUAL') continue;
    const t1 = m.team1.trim().toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    const t2 = m.team2.trim().toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    if (!t1.length || !t2.length) continue;

    [...t1, ...t2].forEach(p => { if (!elo[p]) elo[p] = 1000; });

    const avg1 = t1.reduce((s, p) => s + elo[p], 0) / t1.length;
    const avg2 = t2.reduce((s, p) => s + elo[p], 0) / t2.length;
    const e1   = expWin(avg1, avg2);
    const team1Won = m.win.trim().toUpperCase() === m.team1.trim().toUpperCase();
    const mov  = movMult(Math.abs(m.team1Score - m.team2Score), e1);
    const o1   = mov * ((team1Won ? 1 : 0) - e1);
    const o2   = mov * ((team1Won ? 0 : 1) - (1 - e1));

    // Snapshot ELO before changes
    const before: Record<string, number> = {};
    [...t1, ...t2].forEach(p => { before[p] = elo[p]; });

    // Apply changes
    const applyTeam = (team: string[], outcome: number) => {
      if (team.length < 2) {
        team.forEach(p => { elo[p] = (elo[p] || 1000) + dynK(elo[p] || 1000) * outcome; });
        return;
      }
      const es = team.map(p => elo[p] || 1000);
      const hi = Math.max(...es), lo = Math.min(...es);
      const prop = lo > 0 ? hi / lo : 1;
      team.forEach(p => {
        const pe = elo[p] || 1000;
        const ch = dynK(pe) * outcome;
        elo[p] = pe + (pe >= hi ? ch : ch > 0 ? ch * prop : ch / prop);
      });
    };
    applyTeam(t1, o1);
    applyTeam(t2, o2);

    // Record deltas for all players in this match
    const deltas: Record<string, number> = {};
    [...t1, ...t2].forEach(p => { deltas[p] = Math.round(elo[p] - before[p]); });
    out.set(m.matchId, deltas);
  }

  return out;
}

function computeRivalries(
  matches: MatchRow[],
  deltaMap: Map<number, Record<string, number>>,
  matchType: 'SINGLES' | 'DOUBLES',
): Rivalry[] {
  const map = new Map<string, Rivalry>();

  const relevant = matches.filter(
    m => m.type === matchType && m.bracket.toUpperCase() !== 'CASUAL',
  );

  for (const m of relevant) {
    const a = m.team1.trim().toUpperCase();
    const b = m.team2.trim().toUpperCase();
    if (!a || !b) continue;

    // Canonical alphabetical key so A vs B and B vs A map to the same rivalry
    const [p1, p2] = [a, b].sort();
    const key = `${p1}|||${p2}`;

    if (!map.has(key)) {
      map.set(key, { player1: p1, player2: p2, player1Wins: 0, player2Wins: 0, totalGames: 0, lastPlayed: '', matches: [] });
    }

    const r = map.get(key)!;
    r.totalGames++;
    r.lastPlayed = m.date;

    const winner    = m.win.trim().toUpperCase();
    const winnerIsP1 = winner === p1;
    if (winnerIsP1) r.player1Wins++; else r.player2Wins++;

    // Map team1/team2 → p1/p2
    const p1IsTeam1 = (a === p1);
    const p1Score   = p1IsTeam1 ? m.team1Score : m.team2Score;
    const p2Score   = p1IsTeam1 ? m.team2Score : m.team1Score;

    // ELO deltas — for doubles use first player in each team as representative
    const matchDeltas = deltaMap.get(m.matchId) ?? {};
    const p1Key = p1.split('/')[0];
    const p2Key = p2.split('/')[0];
    const p1EloDelta = matchDeltas[p1Key] ?? 0;
    const p2EloDelta = matchDeltas[p2Key] ?? 0;

    r.matches.push({ matchId: m.matchId, date: m.date, p1Score, p2Score, winnerIsP1, p1EloDelta, p2EloDelta });
  }

  return Array.from(map.values())
    .filter(r => r.totalGames >= 2)
    .sort((a, b) => {
      if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
      return Math.abs(a.player1Wins - a.player2Wins) - Math.abs(b.player1Wins - b.player2Wins);
    });
}

export default async function RivalriesPage() {
  const matches = await getAllMatches().catch(() => []);

  const singlesDelta = buildEloDeltaMap(matches, 'SINGLES');
  const doublesDelta = buildEloDeltaMap(matches, 'DOUBLES');

  const singles = computeRivalries(matches, singlesDelta, 'SINGLES');
  const doubles = computeRivalries(matches, doublesDelta, 'DOUBLES');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Rivalries</h1>
      <RivalriesView singles={singles} doubles={doubles} />
    </div>
  );
}
