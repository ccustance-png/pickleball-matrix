'use client';

import { useState } from 'react';
import Link from 'next/link';

type PlayerStat = {
  name: string;
  wins: number;
  losses: number;
  winRate: number;
};

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

function RankingTable({ players }: { players: PlayerStat[] }) {
  if (players.length === 0) return <p className="text-slate-500 text-sm py-4">No data yet.</p>;
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-8">Rank</th>
            <th className="px-4 py-3 text-left">Player</th>
            <th className="px-4 py-3 text-center">W</th>
            <th className="px-4 py-3 text-center">L</th>
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
              <td className="px-4 py-3"><WinBar rate={p.winRate} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Props = { singles: PlayerStat[]; doubles: PlayerStat[] };

export default function PlayerTabs({ singles, doubles }: Props) {
  const [tab, setTab] = useState<'singles' | 'doubles'>('singles');

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {(['singles', 'doubles'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors capitalize ${
              tab === t
                ? 'bg-lime-500 text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <RankingTable players={tab === 'singles' ? singles : doubles} />
    </div>
  );
}
