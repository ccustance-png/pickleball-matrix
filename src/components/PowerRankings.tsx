'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { MatchRow, EloEntry } from '@/lib/db';

type WLMap = Record<string, { wins: number; losses: number }>;

type PowerEntry = {
  rank: number;
  name: string;
  elo: number;
  powerScore: number;
  eloContrib: number;
  recentContrib: number;
  sosContrib: number;
  recentWins: number;
  recentTotal: number;
  avgOppElo: number;
  record: { wins: number; losses: number };
};

// ── Computation ────────────────────────────────────────────────────────────────
function computePowerRankings(
  matches: MatchRow[],
  eloEntries: EloEntry[],
  wlMap: WLMap,
  type: 'SINGLES' | 'DOUBLES'
): PowerEntry[] {
  if (!eloEntries.length) return [];

  // Build ELO lookup (uppercase keys)
  const eloMap: Record<string, number> = {};
  eloEntries.forEach(e => { eloMap[e.name.toUpperCase()] = e.elo; });
  const playerNames = eloEntries.map(e => e.name.toUpperCase());

  const relevantMatches = matches.filter(m =>
    m.type === type && m.bracket.toUpperCase() !== 'CASUAL'
  );

  // Per-player accumulator: ordered match list + all opponent ELOs for SOS
  const acc: Record<string, {
    results: { won: boolean }[];
    allOppElos: number[];
  }> = {};
  playerNames.forEach(p => { acc[p] = { results: [], allOppElos: [] }; });

  for (const m of relevantMatches) {
    const t1 = m.team1.toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    const t2 = m.team2.toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    const t1Won = m.win.trim().toUpperCase() === m.team1.trim().toUpperCase();

    const avgOpp1 = t2.length ? t2.reduce((s, p) => s + (eloMap[p] ?? 1000), 0) / t2.length : 1000;
    const avgOpp2 = t1.length ? t1.reduce((s, p) => s + (eloMap[p] ?? 1000), 0) / t1.length : 1000;

    t1.forEach(p => {
      if (!acc[p]) return;
      acc[p].results.push({ won: t1Won });
      acc[p].allOppElos.push(avgOpp1);
    });
    t2.forEach(p => {
      if (!acc[p]) return;
      acc[p].results.push({ won: !t1Won });
      acc[p].allOppElos.push(avgOpp2);
    });
  }

  // Build raw values for each player
  const raw = playerNames.map(name => {
    const elo = eloMap[name] ?? 1000;
    const a   = acc[name];

    // Recent form: last 10 competitive matches
    const last10      = a.results.slice(-10);
    const recentWins  = last10.filter(r => r.won).length;
    const recentTotal = last10.length;
    const recentRate  = recentTotal > 0
      ? recentWins / recentTotal
      : (() => {
          const rec = wlMap[name] ?? { wins: 0, losses: 0 };
          const tot = rec.wins + rec.losses;
          return tot > 0 ? rec.wins / tot : 0.5;
        })();

    // Strength of schedule: average current ELO of all opponents faced
    const avgOppElo = a.allOppElos.length > 0
      ? a.allOppElos.reduce((s, v) => s + v, 0) / a.allOppElos.length
      : 1000;

    return {
      name,
      elo,
      recentRate,
      recentWins,
      recentTotal,
      avgOppElo,
      record: wlMap[name] ?? { wins: 0, losses: 0 },
    };
  });

  // Normalize each metric 0–100 across the player pool
  const norm = (val: number, vals: number[]) => {
    const mn = Math.min(...vals), mx = Math.max(...vals);
    return mx === mn ? 50 : ((val - mn) / (mx - mn)) * 100;
  };
  const eloVals    = raw.map(r => r.elo);
  const recentVals = raw.map(r => r.recentRate);
  const sosVals    = raw.map(r => r.avgOppElo);

  // Composite: 70 / 20 / 10
  return raw
    .map(r => {
      const eC = norm(r.elo,        eloVals)    * 0.55;
      const rC = norm(r.recentRate, recentVals) * 0.30;
      const sC = norm(r.avgOppElo,  sosVals)    * 0.15;
      return {
        name:          r.name,
        elo:           r.elo,
        powerScore:    Math.round(eC + rC + sC),
        eloContrib:    Math.round(eC),
        recentContrib: Math.round(rC),
        sosContrib:    Math.round(sC),
        recentWins:    r.recentWins,
        recentTotal:   r.recentTotal,
        avgOppElo:     Math.round(r.avgOppElo),
        record:        r.record,
      };
    })
    .sort((a, b) => b.powerScore - a.powerScore)
    .slice(0, 10)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Rank badge ─────────────────────────────────────────────────────────────────
const RANK_STYLE = [
  'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]', // #1 gold glow
  'text-slate-300',                                               // #2 silver
  'text-orange-400',                                              // #3 bronze
];

// ── Component ──────────────────────────────────────────────────────────────────
type Props = {
  matches: MatchRow[];
  singlesElo: EloEntry[];
  doublesElo: EloEntry[];
  singlesWL: WLMap;
  doublesWL: WLMap;
};

export default function PowerRankings({ matches, singlesElo, doublesElo, singlesWL, doublesWL }: Props) {
  const [type, setType]       = useState<'SINGLES' | 'DOUBLES'>('SINGLES');
  const [filter, setFilter]   = useState('');

  const rankings = useMemo(
    () => computePowerRankings(
      matches,
      type === 'SINGLES' ? singlesElo : doublesElo,
      type === 'SINGLES' ? singlesWL  : doublesWL,
      type
    ),
    [matches, type, singlesElo, doublesElo, singlesWL, doublesWL]
  );

  const visible = filter.trim()
    ? rankings.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()))
    : rankings;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">⚡ Power Rankings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Top 10 · ELO 55% · Recent 30% · Schedule 15%</p>
        </div>
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['SINGLES', 'DOUBLES'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                type === t ? 'bg-lime-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'SINGLES' ? 'Singles' : 'Doubles'}
            </button>
          ))}
        </div>
      </div>

      {/* Search filter */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by player…"
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
        />
      </div>

      {rankings.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">No data yet.</p>
      ) : visible.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">No player matches &ldquo;{filter}&rdquo;</p>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
          {visible.map((p, i) => (
            <div key={p.name} className="bg-slate-950 hover:bg-slate-900 transition-colors px-4 py-3.5">
              <div className="flex items-center gap-3">

                {/* Rank */}
                <span className={`w-7 shrink-0 text-center font-black text-base tabular-nums ${
                  RANK_STYLE[i] ?? 'text-slate-600'
                }`}>
                  {p.rank}
                </span>

                {/* Name + record */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/players/${encodeURIComponent(p.name)}`}
                    className="font-bold text-slate-100 hover:text-lime-400 transition-colors text-sm whitespace-nowrap"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.record.wins}W–{p.record.losses}L
                    {p.recentTotal > 0 && (
                      <span className="ml-2 text-slate-600">
                        {p.recentWins}–{p.recentTotal - p.recentWins} last {p.recentTotal}
                      </span>
                    )}
                  </p>
                </div>

                {/* ELO */}
                <div className="text-right shrink-0 hidden sm:block mr-2">
                  <p className="text-xs font-mono font-semibold text-slate-400">{p.elo}</p>
                  <p className="text-[10px] text-slate-700 uppercase tracking-wider">ELO</p>
                </div>

                {/* Power score */}
                <div className="text-right shrink-0 w-12">
                  <p className="text-xl font-black text-lime-400 tabular-nums leading-none">{p.powerScore}</p>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">PWR</p>
                </div>
              </div>

              {/* Composite breakdown bar — fills to power score out of 100 */}
              <div className="mt-2.5 ml-10 h-1.5 rounded-full overflow-hidden bg-slate-800 flex">
                <div className="bg-lime-500 h-full" style={{ width: `${p.eloContrib}%` }} />
                <div className="bg-blue-400 h-full" style={{ width: `${p.recentContrib}%` }} />
                <div className="bg-purple-400 h-full" style={{ width: `${p.sosContrib}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-lime-500 inline-block shrink-0" />
          ELO (55%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block shrink-0" />
          Recent form (30%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block shrink-0" />
          Strength of schedule (15%)
        </span>
      </div>
    </div>
  );
}
