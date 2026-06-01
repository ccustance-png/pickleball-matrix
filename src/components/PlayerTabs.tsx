'use client';

import { useState } from 'react';
import Link from 'next/link';

type PlayerStat = {
  name: string;
  wins: number;
  losses: number;
  winRate: number;
  elo: number | null;
};

function RankingTable({ players, allPlayers }: { players: PlayerStat[]; allPlayers: PlayerStat[] }) {
  if (players.length === 0) return <p className="text-slate-500 text-sm py-4">No players found.</p>;
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-8">Rank</th>
            <th className="px-4 py-3 text-left">Player</th>
            <th className="px-4 py-3 text-center">ELO</th>
            <th className="px-4 py-3 text-center">W</th>
            <th className="px-4 py-3 text-center">L</th>
            <th className="px-4 py-3 text-center">Win %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {players.map((p) => {
            const rank = allPlayers.findIndex((a) => a.name === p.name) + 1;
            return (
              <tr key={p.name} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{rank}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${encodeURIComponent(p.name)}`}
                    className="font-semibold text-slate-100 hover:text-lime-400 transition-colors"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-center font-mono font-bold text-lime-400">
                  {p.elo ?? '—'}
                </td>
                <td className="px-4 py-3 text-center text-slate-300">{p.wins}</td>
                <td className="px-4 py-3 text-center text-slate-400">{p.losses}</td>
                <td className="px-4 py-3 text-center text-slate-400">{p.winRate}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Props = { singles: PlayerStat[]; doubles: PlayerStat[] };

export default function PlayerTabs({ singles, doubles }: Props) {
  const [tab, setTab] = useState<'singles' | 'doubles'>('singles');
  const [query, setQuery] = useState('');

  const players = tab === 'singles' ? singles : doubles;
  const filtered = query.trim()
    ? players.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : players;

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-5">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players…"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Tabs */}
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

      <RankingTable players={filtered} allPlayers={players} />
    </div>
  );
}
