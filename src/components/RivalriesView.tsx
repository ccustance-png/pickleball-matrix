'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Rivalry } from '@/app/rivalries/page';

function RivalryCard({ r, rank }: { r: Rivalry; rank: number }) {
  const p1Pct = r.totalGames > 0 ? Math.round((r.player1Wins / r.totalGames) * 100) : 50;
  const p2Pct = 100 - p1Pct;
  const isFeatured = rank === 0;
  const isClose = Math.abs(r.player1Wins - r.player2Wins) <= 1;

  return (
    <div className={`rounded-xl border p-5 transition-colors ${
      isFeatured
        ? 'border-lime-500/40 bg-lime-500/5'
        : 'border-slate-800 bg-slate-900'
    }`}>
      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        {isFeatured && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 uppercase tracking-wider">
            🔥 Top Rivalry
          </span>
        )}
        {isClose && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 uppercase tracking-wider">
            ⚔️ Neck &amp; Neck
          </span>
        )}
      </div>

      {/* Players + wins */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 text-left">
          <Link
            href={`/players/${encodeURIComponent(r.player1)}`}
            className="text-base font-bold text-slate-100 hover:text-lime-400 transition-colors block truncate"
          >
            {r.player1}
          </Link>
          <span className={`text-3xl font-black font-mono ${p1Pct >= 50 ? 'text-lime-400' : 'text-slate-400'}`}>
            {r.player1Wins}
          </span>
        </div>

        <div className="text-center shrink-0">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">vs</span>
        </div>

        <div className="flex-1 text-right">
          <Link
            href={`/players/${encodeURIComponent(r.player2)}`}
            className="text-base font-bold text-slate-100 hover:text-lime-400 transition-colors block truncate"
          >
            {r.player2}
          </Link>
          <span className={`text-3xl font-black font-mono ${p2Pct > 50 ? 'text-lime-400' : 'text-slate-400'}`}>
            {r.player2Wins}
          </span>
        </div>
      </div>

      {/* Win % bar */}
      <div className="mb-3">
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          <div
            className="bg-lime-500 rounded-l-full transition-all"
            style={{ width: `${p1Pct}%` }}
          />
          <div
            className="bg-slate-600 rounded-r-full transition-all"
            style={{ width: `${p2Pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">{p1Pct}%</span>
          <span className="text-xs text-slate-500">{p2Pct}%</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{r.totalGames} matches played</span>
        {r.lastPlayed && <span>Last: {r.lastPlayed}</span>}
      </div>
    </div>
  );
}

type Props = { singles: Rivalry[]; doubles: Rivalry[] };

export default function RivalriesView({ singles, doubles }: Props) {
  const [tab, setTab] = useState<'singles' | 'doubles'>('singles');
  const rivalries = tab === 'singles' ? singles : doubles;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {(['singles', 'doubles'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors capitalize ${
              tab === t ? 'bg-lime-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cards */}
      {rivalries.length === 0 ? (
        <p className="text-slate-500 text-sm py-4">No rivalries yet — need at least 2 matches between the same players.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rivalries.map((r, i) => (
            <RivalryCard key={`${r.player1}|${r.player2}`} r={r} rank={i} />
          ))}
        </div>
      )}
    </div>
  );
}
