'use client';

import { useState } from 'react';
import Link from 'next/link';

export type HotPlayer = {
  name: string;
  currentElo: number;
  change: number;
  pct: number;
};

type Props = { singles: HotPlayer[]; doubles: HotPlayer[] };

export default function HotRightNow({ singles, doubles }: Props) {
  const [tab, setTab] = useState<'singles' | 'doubles'>('singles');
  const players = tab === 'singles' ? singles : doubles;

  if (singles.length === 0 && doubles.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">
          🔥 Hot Right Now
          <span className="ml-2 text-xs font-normal text-slate-500">Biggest ELO gainers · last 14 days</span>
        </h2>
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['singles', 'doubles'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors capitalize ${
                tab === t ? 'bg-lime-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {players.length === 0 ? (
        <p className="text-slate-500 text-sm py-3">No recent {tab} activity in the last 14 days.</p>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              {players.map((p, i) => (
                <tr key={p.name} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs w-6">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${encodeURIComponent(p.name)}`}
                      className="font-semibold text-slate-100 hover:text-lime-400 transition-colors"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{p.currentElo}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-lime-400">
                    +{p.change}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-400 text-xs font-bold">
                      ↑{p.pct}%
                    </span>
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
