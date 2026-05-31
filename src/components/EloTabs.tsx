'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EloEntry } from '@/lib/sheets';

function EloTable({ players }: { players: EloEntry[] }) {
  if (players.length === 0) return <p className="text-slate-500 text-sm py-4">No ELO data yet.</p>;
  const max = players[0].elo;
  const min = Math.min(...players.map((p) => p.elo));
  const range = max - min || 1;

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-8">Rank</th>
            <th className="px-4 py-3 text-left">Player</th>
            <th className="px-4 py-3 text-right">ELO</th>
            <th className="px-4 py-3 text-left min-w-[140px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {players.map((p, i) => {
            const pct = Math.round(((p.elo - min) / range) * 100);
            return (
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
                <td className="px-4 py-3 text-right font-mono font-bold text-lime-400">{p.elo}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-lime-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Props = { singles: EloEntry[]; doubles: EloEntry[] };

export default function EloTabs({ singles, doubles }: Props) {
  const [tab, setTab] = useState<'singles' | 'doubles'>('singles');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">ELO Rankings</h2>
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['singles', 'doubles'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-lime-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <EloTable players={tab === 'singles' ? singles : doubles} />
    </div>
  );
}
