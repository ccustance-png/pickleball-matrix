'use client';

import { useState } from 'react';
import type { MatchRow, MatchNote } from '@/lib/sheets';
import MatchActivityCard from './MatchActivityCard';
import SessionActivityCard from './SessionActivityCard';
import MatchHistory from './MatchHistory';
import BadgesGrid from './BadgesGrid';
import type { BadgeDef, PickleBreakdown } from '@/lib/badges';

const SID_RE = /^__sid:(\d+)__$/;

function formatValue(v: string): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  const n = Number(s);
  if (!isNaN(n) && s.trim() !== '') {
    return Number.isInteger(n) ? s : n.toFixed(2);
  }
  return s;
}

function RecordBadge({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-100 font-bold">{wins}–{losses}</span>
      <div className="h-1.5 w-20 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-lime-500 rounded-full" style={{ width: `${rate}%` }} />
      </div>
      <span className="text-slate-400 text-xs">{rate}%</span>
    </div>
  );
}

function StatsGrid({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data).filter(([k]) => k !== '' && k !== 'PLAYER');
  if (entries.length === 0) return <p className="text-slate-500 text-sm">No data</p>;
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {entries.map(([k, v]) => (
        <div key={k} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
          <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{k}</dt>
          <dd className="text-slate-100 font-semibold">{formatValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

type Props = {
  name: string;
  singlesStats: Record<string, string> | null;
  doublesStats: Record<string, string> | null;
  singlesWins: number;
  singlesTotal: number;
  doublesWins: number;
  doublesTotal: number;
  recentMatches: MatchRow[];
  allMatches: MatchRow[];
  matchNotes: Record<number, MatchNote>;
  earnedBadges: BadgeDef[];
  pickles: PickleBreakdown;
  eloChanges?: Record<number, number>;
};

type Tab = 'stats' | 'history' | 'activities' | 'badges';

export default function ProfileTabs({
  name, singlesStats, doublesStats,
  singlesWins, singlesTotal, doublesWins, doublesTotal,
  recentMatches, allMatches, matchNotes,
  earnedBadges, pickles, eloChanges,
}: Props) {
  const [tab, setTab] = useState<Tab>('stats');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stats', label: 'Stats' },
    { id: 'history', label: 'History' },
    { id: 'activities', label: 'Activities' },
    { id: 'badges', label: 'Badges' },
  ];

  // Build session groups from this player's matches
  const linkedToAnchor = new Map<number, number>();
  const sessionGroups = new Map<number, MatchRow[]>();
  for (const m of allMatches) {
    const note = matchNotes[m.matchId];
    const sid = note?.description?.match(SID_RE);
    if (sid) {
      const anchorId = Number(sid[1]);
      linkedToAnchor.set(m.matchId, anchorId);
      if (!sessionGroups.has(anchorId)) sessionGroups.set(anchorId, []);
      sessionGroups.get(anchorId)!.push(m);
    }
  }

  // Matches that have notes — skip session-linked ones
  const activitiesWithNotes = [...allMatches].reverse().filter((m) => {
    if (linkedToAnchor.has(m.matchId)) return false;
    const note = matchNotes[m.matchId];
    return note && (note.photoUrl || note.location || note.description);
  });

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-lime-500 text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.id === 'activities' && activitiesWithNotes.length > 0 && (
              <span className="ml-1.5 text-xs bg-lime-500/20 text-lime-400 px-1.5 py-0.5 rounded-full">
                {activitiesWithNotes.length}
              </span>
            )}
            {t.id === 'badges' && earnedBadges.length > 0 && (
              <span className="ml-1.5 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                {earnedBadges.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Singles</h2>
              <RecordBadge wins={singlesWins} losses={singlesTotal - singlesWins} />
            </div>
            {singlesStats ? <StatsGrid data={singlesStats} /> : <p className="text-slate-600 text-sm">No singles sheet data.</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Doubles</h2>
              <RecordBadge wins={doublesWins} losses={doublesTotal - doublesWins} />
            </div>
            {doublesStats ? <StatsGrid data={doublesStats} /> : <p className="text-slate-600 text-sm">No doubles sheet data.</p>}
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <MatchHistory matches={recentMatches} name={name} eloChanges={eloChanges} />
      )}

      {/* Badges + Pickle Jar */}
      {tab === 'badges' && (
        <div className="space-y-6">
          {/* Pickle Jar */}
          <div className="bg-slate-900 border border-lime-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pickle Jar</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl">🥒</span>
                  <span className="text-5xl font-black text-lime-400 tabular-nums">{pickles.total}</span>
                  <span className="text-lg text-slate-500 font-semibold">pickles</span>
                </div>
              </div>
              {pickles.total > 0 && (
                <div className="text-right space-y-1.5">
                  {pickles.fromBadges > 0 && (
                    <p className="text-xs text-slate-500">🎖️ <span className="text-slate-300 font-semibold">{pickles.fromBadges}</span> from milestones</p>
                  )}
                  {pickles.fromEvents > 0 && (
                    <p className="text-xs text-slate-500">⚡ <span className="text-slate-300 font-semibold">{pickles.fromEvents}</span> from achievements</p>
                  )}
                  {pickles.fromParticipation > 0 && (
                    <p className="text-xs text-slate-500">📅 <span className="text-slate-300 font-semibold">{pickles.fromParticipation}</span> from participation</p>
                  )}
                  {pickles.fromDinks > 0 && (
                    <p className="text-xs text-slate-500">🏓 <span className="text-slate-300 font-semibold">{pickles.fromDinks}</span> from dinks</p>
                  )}
                </div>
              )}
            </div>
            {pickles.total === 0 && (
              <p className="text-sm text-slate-600 mt-3">Start earning pickles by completing achievements, beating stronger players, and getting dinks on your activities.</p>
            )}
          </div>
          <BadgesGrid earned={earnedBadges} showAll />
        </div>
      )}

      {/* Activities */}
      {tab === 'activities' && (
        <div className="space-y-4">
          {activitiesWithNotes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-4xl mb-3">📸</p>
              <p className="font-medium">No activities yet</p>
              <p className="text-sm mt-1">Add a photo, location, or description when logging a match.</p>
            </div>
          ) : (
            activitiesWithNotes.map((m) => {
              const linked = sessionGroups.get(m.matchId) ?? [];
              if (linked.length > 0) {
                const allSessionMatches = [m, ...linked].sort((a, b) => a.matchId - b.matchId);
                return (
                  <SessionActivityCard
                    key={m.matchId}
                    anchorMatch={m}
                    note={matchNotes[m.matchId]}
                    matches={allSessionMatches}
                    name={name}
                  />
                );
              }
              return (
                <MatchActivityCard
                  key={m.matchId}
                  match={m}
                  name={name}
                  note={matchNotes[m.matchId]}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
