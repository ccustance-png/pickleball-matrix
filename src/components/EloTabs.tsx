'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EloEntry } from '@/lib/sheets';
import type { StreakMap } from '@/app/page';

type WLRecord = { wins: number; losses: number };
type WLMap = Record<string, WLRecord>;

const PROVISIONAL_THRESHOLD = 10;

function StreakBadge({ name, streaks }: { name: string; streaks: StreakMap }) {
  const s = streaks[name.toUpperCase()] ?? streaks[name];
  if (!s || s.count < 2) return null;
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ml-1.5 ${
      s.kind === 'W'
        ? 'bg-lime-500/15 text-lime-400'
        : 'bg-red-500/10 text-red-400'
    }`}>
      {s.kind}{s.count}
    </span>
  );
}

function EloTable({ players, wlMap, streaks }: { players: EloEntry[]; wlMap: WLMap; streaks: StreakMap }) {
  // Only show players who have hit the provisional threshold
  const ranked = players.filter((p) => {
    const r = wlMap[p.name.toUpperCase()] ?? wlMap[p.name] ?? { wins: 0, losses: 0 };
    return (r.wins + r.losses) >= PROVISIONAL_THRESHOLD;
  });

  if (ranked.length === 0) return <p className="text-slate-500 text-sm py-4">No ranked players yet — need {PROVISIONAL_THRESHOLD} games to appear here.</p>;
  const max = ranked[0].elo;
  const min = Math.min(...ranked.map((p) => p.elo));
  const range = max - min || 1;

  return (
    <div className="rounded-xl border border-slate-800 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <th className="px-3 py-3 text-left w-7">Rank</th>
            <th className="px-3 py-3 text-left">Player</th>
            <th className="px-3 py-3 text-right">ELO</th>
            <th className="px-3 py-3 text-center">W-L</th>
            <th className="px-3 py-3 text-left w-14"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {ranked.map((p, i) => {
            const pct = Math.round(((p.elo - min) / range) * 100);
            const record = wlMap[p.name] ?? { wins: 0, losses: 0 };
            return (
              <tr key={p.name} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                <td className="px-3 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center">
                    <Link
                      href={`/players/${encodeURIComponent(p.name)}`}
                      className="font-semibold text-sm text-slate-100 hover:text-lime-400 transition-colors whitespace-nowrap"
                    >
                      {p.name}
                    </Link>
                    <StreakBadge name={p.name} streaks={streaks} />
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-lime-400 whitespace-nowrap">{p.elo}</td>
                <td className="px-3 py-3 text-center font-mono text-xs whitespace-nowrap">
                  <span className="text-slate-300">{record.wins}</span>
                  <span className="text-slate-600">–</span>
                  <span className="text-slate-400">{record.losses}</span>
                </td>
                <td className="px-3 py-3 w-14">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-lime-500 rounded-full" style={{ width: `${pct}%` }} />
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

type Props = {
  singles: EloEntry[];
  doubles: EloEntry[];
  singlesWL: WLMap;
  doublesWL: WLMap;
  singlesStreaks: StreakMap;
  doublesStreaks: StreakMap;
};

export default function EloTabs({ singles, doubles, singlesWL, doublesWL, singlesStreaks, doublesStreaks }: Props) {
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
      <p className="text-xs text-slate-500 mb-3">
        🏓 Requires {PROVISIONAL_THRESHOLD} games to appear on the leaderboard
      </p>
      <EloTable
        players={tab === 'singles' ? singles : doubles}
        wlMap={tab === 'singles' ? singlesWL : doublesWL}
        streaks={tab === 'singles' ? singlesStreaks : doublesStreaks}
      />
    </div>
  );
}
