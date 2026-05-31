import Link from 'next/link';
import { getAllMatches } from '@/lib/sheets';

export const revalidate = 60;

function WinBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-lime-500 rounded-full" style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-10 text-right">{rate}%</span>
    </div>
  );
}

export default async function PlayersPage() {
  const matches = await getAllMatches().catch(() => []);

  const playerMap = new Map<string, { wins: number; losses: number; singles: number; doubles: number }>();
  for (const m of matches) {
    const allPlayers = m.players.split('/').map((p) => p.trim()).filter(Boolean);
    const winPlayers = m.win.split('/').map((p) => p.trim());
    for (const name of allPlayers) {
      if (!playerMap.has(name)) playerMap.set(name, { wins: 0, losses: 0, singles: 0, doubles: 0 });
      const s = playerMap.get(name)!;
      if (winPlayers.includes(name)) s.wins++;
      else s.losses++;
      if (m.type === 'DOUBLES') s.doubles++;
      else s.singles++;
    }
  }

  const players = Array.from(playerMap.entries())
    .map(([name, s]) => ({
      name,
      matches: s.wins + s.losses,
      wins: s.wins,
      losses: s.losses,
      singles: s.singles,
      doubles: s.doubles,
      winRate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Player Rankings</h1>
      {players.length === 0 ? (
        <p className="text-slate-500">No players found.</p>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-8">Rank</th>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">L</th>
                <th className="px-4 py-3 text-center">1v1</th>
                <th className="px-4 py-3 text-center">2v2</th>
                <th className="px-4 py-3 text-left min-w-[140px]">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {players.map((p, i) => (
                <tr key={p.name} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${encodeURIComponent(p.name)}`}
                      className="font-semibold text-slate-100 hover:text-lime-400 transition-colors"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-lime-400 font-bold">{p.wins}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{p.losses}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{p.singles}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{p.doubles}</td>
                  <td className="px-4 py-3">
                    <WinBar rate={p.winRate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
