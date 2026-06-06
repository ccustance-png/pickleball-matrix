'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MatchRow } from '@/lib/sheets';

type Props = {
  matches: MatchRow[];
  name: string;
  eloChanges?: Record<number, number>;
};

export default function MatchHistory({ matches, name, eloChanges }: Props) {
  const [filter, setFilter] = useState('');
  if (matches.length === 0) return <p className="text-slate-500 text-sm">No matches yet.</p>;

  const visible = filter.trim()
    ? matches.filter(m =>
        m.win.toLowerCase().includes(filter.toLowerCase()) ||
        m.loss.toLowerCase().includes(filter.toLowerCase()) ||
        m.date.includes(filter) ||
        m.type.toLowerCase().includes(filter.toLowerCase())
      )
    : matches;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by opponent, date, type…"
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
        />
      </div>

      <div className="rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-xs text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">W/L</th>
              <th className="px-4 py-2.5 text-left">Date</th>
              <th className="px-4 py-2.5 text-left">Type</th>
              <th className="px-4 py-2.5 text-left">Opponent</th>
              <th className="px-4 py-2.5 text-right">Score</th>
              {eloChanges && <th className="px-4 py-2.5 text-right">ELO</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {visible.map((m) => {
              const isWinner = m.win.split('/').map((p) => p.trim()).includes(name);
              const oppTeam = isWinner ? m.loss : m.win;
              const myScore  = m.team1.includes(name) ? m.team1Score : m.team2Score;
              const oppScore = m.team1.includes(name) ? m.team2Score : m.team1Score;
              const delta = eloChanges?.[m.matchId];

              return (
                <tr key={m.matchId} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-lime-500/15 text-lime-400' : 'bg-red-500/10 text-red-400'}`}>
                      {isWinner ? 'W' : 'L'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{m.date}</td>
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
                  <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                    <span className={isWinner ? 'text-lime-400 font-bold' : 'text-slate-400'}>{myScore}</span>
                    <span className="text-slate-600 mx-1">–</span>
                    <span className={!isWinner ? 'text-red-400' : 'text-slate-400'}>{oppScore}</span>
                  </td>
                  {eloChanges && (
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {delta !== undefined ? (
                        <span className={`text-xs font-bold tabular-nums ${delta >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                          {delta >= 0 ? '+' : ''}{delta}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-700">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && filter && (
        <p className="text-slate-500 text-sm text-center py-6">No matches found for &ldquo;{filter}&rdquo;</p>
      )}
    </div>
  );
}
