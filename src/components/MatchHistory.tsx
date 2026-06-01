import Link from 'next/link';
import type { MatchRow } from '@/lib/sheets';

export default function MatchHistory({ matches, name }: { matches: MatchRow[]; name: string }) {
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
            const oppTeam = isWinner ? m.loss : m.win;
            const myScore = m.team1.includes(name) ? m.team1Score : m.team2Score;
            const oppScore = m.team1.includes(name) ? m.team2Score : m.team1Score;
            return (
              <tr key={m.matchId} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{m.matchId}</td>
                <td className="px-4 py-2.5 text-slate-400">{m.date}</td>
                <td className="px-4 py-2.5 text-slate-400">{m.type}</td>
                <td className="px-4 py-2.5 text-slate-300">
                  {oppTeam.split('/').map((opp, i) => (
                    <span key={opp}>
                      {i > 0 && <span className="text-slate-600">/</span>}
                      <Link href={`/players/${encodeURIComponent(opp.trim())}`} className="hover:text-lime-400 transition-colors">
                        {opp.trim()}
                      </Link>
                    </span>
                  ))}
                </td>
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
