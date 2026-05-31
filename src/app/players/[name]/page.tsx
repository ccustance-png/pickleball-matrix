import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllMatches, getTabRows, tabToObjects, type MatchRow } from '@/lib/sheets';

export const revalidate = 60;

function RecordBadge({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-100 font-bold text-lg">{wins}–{losses}</span>
      <div className="h-2 w-28 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-lime-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
      </div>
      <span className="text-slate-400 text-sm">{rate}%</span>
    </div>
  );
}

function formatValue(v: string): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  const n = Number(s);
  if (!isNaN(n) && s.trim() !== '') {
    return Number.isInteger(n) ? s : n.toFixed(2);
  }
  return s;
}

function StatsGrid({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data).filter(([k]) => k !== '' && k !== 'PLAYER');
  if (entries.length === 0) return <p className="text-slate-500 text-sm">No data</p>;
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {entries.map(([k, v]) => (
        <div key={k} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
          <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{k}</dt>
          <dd className="text-slate-100 font-semibold">{formatValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function MatchHistory({ matches, name }: { matches: MatchRow[]; name: string }) {
  if (matches.length === 0) return <p className="text-slate-500 text-sm">No matches yet.</p>;
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-xs text-slate-400 uppercase tracking-wider">
            <th className="px-4 py-2.5 text-left">#</th>
            <th className="px-4 py-2.5 text-left">Date</th>
            <th className="px-4 py-2.5 text-left">Type</th>
            <th className="px-4 py-2.5 text-left">Opponent</th>
            <th className="px-4 py-2.5 text-center">Result</th>
            <th className="px-4 py-2.5 text-right">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {matches.map((m) => {
            const isWinner = m.win.split('/').map((p) => p.trim()).includes(name);
            const myTeam = isWinner ? m.win : m.loss;
            const oppTeam = isWinner ? m.loss : m.win;
            const myScore = m.team1.includes(name) ? m.team1Score : m.team2Score;
            const oppScore = m.team1.includes(name) ? m.team2Score : m.team1Score;
            return (
              <tr key={m.matchId} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{m.matchId}</td>
                <td className="px-4 py-2.5 text-slate-400">{m.date}</td>
                <td className="px-4 py-2.5 text-slate-400">{m.type}</td>
                <td className="px-4 py-2.5 text-slate-300">{oppTeam}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-lime-500/15 text-lime-400' : 'bg-red-500/10 text-red-400'}`}>
                    {isWinner ? 'W' : 'L'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  <span className={isWinner ? 'text-lime-400 font-bold' : 'text-slate-400'}>{myScore}</span>
                  <span className="text-slate-600 mx-1">–</span>
                  <span className={!isWinner ? 'text-red-400' : 'text-slate-400'}>{oppScore}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function PlayerPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName).toUpperCase();

  const [matches, singlesRows, doublesRows, eloRows] = await Promise.all([
    getAllMatches().catch(() => []),
    getTabRows('SINGLES').catch(() => []),
    getTabRows('DOUBLES').catch(() => []),
    getTabRows('ELO').catch(() => []),
  ]);

  const playerMatches = matches.filter((m) =>
    m.players.split('/').map((p) => p.trim()).includes(name)
  );

  if (playerMatches.length === 0 && matches.length > 0) return notFound();

  const singlesMatches = playerMatches.filter((m) => m.type === 'SINGLES');
  const doublesMatches = playerMatches.filter((m) => m.type === 'DOUBLES');
  const singlesWins = singlesMatches.filter((m) => m.win.split('/').map((p) => p.trim()).includes(name)).length;
  const doublesWins = doublesMatches.filter((m) => m.win.split('/').map((p) => p.trim()).includes(name)).length;

  const findPlayerStats = (rows: string[][]): Record<string, string> | null => {
    const objs = tabToObjects(rows);
    return objs.find((o) => {
      const firstVal = Object.values(o)[0];
      return firstVal?.toUpperCase().trim() === name;
    }) ?? null;
  };

  const singlesStats = findPlayerStats(singlesRows);
  const doublesStats = findPlayerStats(doublesRows);
  const eloStats = findPlayerStats(eloRows);

  const recentMatches = [...playerMatches].reverse().slice(0, 15);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-lime-500/20 border border-lime-500/30 flex items-center justify-center text-2xl">
          🏓
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{name}</h1>
          <div className="mt-2">
            <RecordBadge wins={singlesWins + doublesWins} losses={playerMatches.length - singlesWins - doublesWins} />
          </div>
        </div>
        <Link href="/players" className="ml-auto text-sm text-slate-500 hover:text-slate-300 transition-colors">
          ← All players
        </Link>
      </div>

      {/* ELO */}
      {eloStats && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">ELO / Ratings</h2>
          <StatsGrid data={eloStats} />
        </div>
      )}

      {/* Singles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Singles</h2>
          <RecordBadge wins={singlesWins} losses={singlesMatches.length - singlesWins} />
        </div>
        {singlesStats ? <StatsGrid data={singlesStats} /> : <p className="text-slate-600 text-sm">No singles sheet data.</p>}
      </div>

      {/* Doubles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Doubles</h2>
          <RecordBadge wins={doublesWins} losses={doublesMatches.length - doublesWins} />
        </div>
        {doublesStats ? <StatsGrid data={doublesStats} /> : <p className="text-slate-600 text-sm">No doubles sheet data.</p>}
      </div>

      {/* Match history */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Match History</h2>
        <MatchHistory matches={recentMatches} name={name} />
      </div>
    </div>
  );
}
