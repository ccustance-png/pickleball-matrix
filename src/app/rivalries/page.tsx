import { getAllMatches, type MatchRow } from '@/lib/sheets';
import RivalriesView from '@/components/RivalriesView';

export const revalidate = 15;

export type Rivalry = {
  player1: string;
  player2: string;
  player1Wins: number;
  player2Wins: number;
  totalGames: number;
  lastPlayed: string;
};

function computeRivalries(matches: MatchRow[], matchType: 'SINGLES' | 'DOUBLES'): Rivalry[] {
  const map = new Map<string, Rivalry>();

  for (const m of matches.filter((m) => m.type === matchType)) {
    const a = m.team1.trim().toUpperCase();
    const b = m.team2.trim().toUpperCase();
    if (!a || !b) continue;

    // Canonical key so "A vs B" and "B vs A" are the same rivalry
    const [p1, p2] = [a, b].sort();
    const key = `${p1}|||${p2}`;

    if (!map.has(key)) {
      map.set(key, { player1: p1, player2: p2, player1Wins: 0, player2Wins: 0, totalGames: 0, lastPlayed: '' });
    }

    const r = map.get(key)!;
    r.totalGames++;
    r.lastPlayed = m.date;

    const winner = m.win.trim().toUpperCase();
    if (winner === p1) r.player1Wins++;
    else r.player2Wins++;
  }

  return Array.from(map.values())
    .filter((r) => r.totalGames >= 2)
    .sort((a, b) => {
      if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
      // Tiebreak: closer record = more competitive = shown first
      return Math.abs(a.player1Wins - a.player2Wins) - Math.abs(b.player1Wins - b.player2Wins);
    });
}

export default async function RivalriesPage() {
  const matches = await getAllMatches().catch(() => []);

  const singles = computeRivalries(matches, 'SINGLES');
  const doubles = computeRivalries(matches, 'DOUBLES');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Rivalries</h1>
      <RivalriesView singles={singles} doubles={doubles} />
    </div>
  );
}
