'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Rivalry, RivalryMatch } from '@/app/rivalries/page';

/** For doubles teams like "Cam Cook/Jordan Sterzick", returns ["Cam Cook", "Jordan Sterzick"]. */
function splitTeam(name: string): string[] {
  return name.includes('/') ? name.split('/').map((n) => n.trim()) : [name];
}

function TeamName({ name, align }: { name: string; align: 'left' | 'right' }) {
  const parts = splitTeam(name);
  return (
    <div className={`flex flex-col gap-0.5 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      {parts.map((p) => (
        <Link
          key={p}
          href={`/players/${encodeURIComponent(p)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-bold text-slate-100 hover:text-lime-400 transition-colors leading-tight"
        >
          {p}
        </Link>
      ))}
    </div>
  );
}

function MatchHistoryRow({ m, p1Label, p2Label }: { m: RivalryMatch; p1Label: string; p2Label: string }) {
  const winnerLabel = m.winnerIsP1 ? p1Label : p2Label;
  const hiScore = Math.max(m.p1Score, m.p2Score);
  const loScore = Math.min(m.p1Score, m.p2Score);

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/40 text-xs">
      {/* Date */}
      <span className="text-slate-500 shrink-0 w-14">{m.date}</span>

      {/* Winner */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-lime-400 truncate block">{winnerLabel}</span>
        <span className="text-slate-600">won</span>
      </div>

      {/* Score */}
      <span className="font-mono font-bold text-slate-200 shrink-0">
        {hiScore}–{loScore}
      </span>

      {/* ELO deltas */}
      <div className="flex gap-1 shrink-0">
        {m.p1EloDelta !== 0 && (
          <span className={`font-mono text-xs ${m.p1EloDelta > 0 ? 'text-lime-400' : 'text-red-400'}`}>
            {m.p1EloDelta > 0 ? '+' : ''}{m.p1EloDelta}
          </span>
        )}
        {m.p1EloDelta !== 0 && m.p2EloDelta !== 0 && (
          <span className="text-slate-700">/</span>
        )}
        {m.p2EloDelta !== 0 && (
          <span className={`font-mono text-xs ${m.p2EloDelta > 0 ? 'text-lime-400' : 'text-red-400'}`}>
            {m.p2EloDelta > 0 ? '+' : ''}{m.p2EloDelta}
          </span>
        )}
      </div>
    </div>
  );
}

function RivalryCard({ r, rank }: { r: Rivalry; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  const p1Pct = r.totalGames > 0 ? Math.round((r.player1Wins / r.totalGames) * 100) : 50;
  const p2Pct = 100 - p1Pct;
  const isFeatured = rank === 0;
  const isClose = Math.abs(r.player1Wins - r.player2Wins) <= 1;

  // Short labels for the match history (first name only for doubles)
  const p1Label = splitTeam(r.player1).map(n => n.split(' ')[0]).join('/');
  const p2Label = splitTeam(r.player2).map(n => n.split(' ')[0]).join('/');

  // Most recent first in the expanded view
  const reversedMatches = [...r.matches].reverse();

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isFeatured ? 'border-lime-500/40 bg-lime-500/5' : 'border-slate-800 bg-slate-900'
      }`}
    >
      {/* Clickable summary */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-5"
      >
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
            <TeamName name={r.player1} align="left" />
            <span className={`text-3xl font-black font-mono ${p1Pct >= 50 ? 'text-lime-400' : 'text-slate-400'}`}>
              {r.player1Wins}
            </span>
          </div>

          <div className="text-center shrink-0">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">vs</span>
          </div>

          <div className="flex-1 text-right">
            <TeamName name={r.player2} align="right" />
            <span className={`text-3xl font-black font-mono ${p2Pct > 50 ? 'text-lime-400' : 'text-slate-400'}`}>
              {r.player2Wins}
            </span>
          </div>
        </div>

        {/* Win % bar */}
        <div className="mb-3">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-lime-500 rounded-l-full transition-all" style={{ width: `${p1Pct}%` }} />
            <div className="bg-slate-600 rounded-r-full transition-all" style={{ width: `${p2Pct}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">{p1Pct}%</span>
            <span className="text-xs text-slate-500">{p2Pct}%</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{r.totalGames} matches played</span>
          <div className="flex items-center gap-2">
            {r.lastPlayed && <span>Last: {r.lastPlayed}</span>}
            <svg
              className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Match history */}
      {expanded && (
        <div className="px-5 pb-5 space-y-1.5 border-t border-slate-800/60 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Match History</p>
            <div className="flex gap-3 text-xs text-slate-600">
              <span>{p1Label}</span>
              <span>/</span>
              <span>{p2Label}</span>
            </div>
          </div>
          {reversedMatches.map((m) => (
            <MatchHistoryRow key={m.matchId} m={m} p1Label={p1Label} p2Label={p2Label} />
          ))}
        </div>
      )}
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
