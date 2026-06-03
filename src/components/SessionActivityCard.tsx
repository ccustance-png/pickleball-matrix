'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import type { MatchRow, MatchNote } from '@/lib/sheets';
import MatchComments from './MatchComments';
import ActivityCardActions from './ActivityCardActions';
import EditSessionModal from './EditSessionModal';

type Props = {
  anchorMatch: MatchRow;
  note: MatchNote;
  matches: MatchRow[];  // all games in this session, sorted by matchId
  name?: string;        // optional: player-perspective view
};

function GameRow({ match, name }: { match: MatchRow; name?: string }) {
  const winTeam  = match.win.split('/').map((p) => p.trim());
  const lossTeam = match.loss.split('/').map((p) => p.trim());
  const hiScore  = Math.max(match.team1Score, match.team2Score);
  const loScore  = Math.min(match.team1Score, match.team2Score);

  // If viewing from a specific player's perspective
  const isWin = name
    ? winTeam.map((p) => p.toUpperCase()).includes(name.toUpperCase())
    : null;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/50">
      {/* W/L badge or neutral dot */}
      {isWin !== null ? (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
          isWin ? 'bg-lime-500/15 text-lime-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {isWin ? 'W' : 'L'}
        </span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 ml-0.5" />
      )}

      {/* Players */}
      <div className="flex-1 min-w-0 text-sm">
        <span className="text-lime-400 font-semibold">
          {winTeam.map((p, i) => (
            <span key={p}>
              {i > 0 && <span className="text-slate-600">/</span>}
              <Link href={`/players/${encodeURIComponent(p)}`} className="hover:text-lime-300 transition-colors">{p}</Link>
            </span>
          ))}
        </span>
        <span className="text-slate-600 mx-1.5 text-xs">def.</span>
        <span className="text-slate-400">
          {lossTeam.map((p, i) => (
            <span key={p}>
              {i > 0 && <span className="text-slate-600">/</span>}
              <Link href={`/players/${encodeURIComponent(p)}`} className="hover:text-slate-200 transition-colors">{p}</Link>
            </span>
          ))}
        </span>
      </div>

      {/* Score + type */}
      <div className="shrink-0 flex items-center gap-2 text-xs">
        <span className="font-mono font-bold text-slate-300">{hiScore}–{loScore}</span>
        <span className="text-slate-600">{match.type === 'SINGLES' ? 'S' : 'D'}</span>
      </div>
    </div>
  );
}

export default function SessionActivityCard({ anchorMatch, note, matches, name }: Props) {
  const [expanded, setExpanded]   = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const { data: session }         = useSession();

  // All unique players across the session
  const allPlayers = Array.from(
    new Set(
      matches.flatMap((m) => m.players.split('/').map((p) => p.trim()).filter(Boolean))
    )
  );

  // Win/loss summary (from player perspective or global)
  const wins   = name ? matches.filter((m) => m.win.split('/').map((p) => p.trim().toUpperCase()).includes(name.toUpperCase())).length : null;
  const losses = name && wins !== null ? matches.length - wins : null;

  const shareText = `${matches.length} games at ${note.location || 'the courts'} 🏓`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

      {/* Photo */}
      {note.photoUrl && (
        <div className="relative w-full h-52">
          <Image src={note.photoUrl} alt="Session photo" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="absolute bottom-3 left-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-slate-300 font-medium">
              Session · {matches.length} games
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {!note.photoUrl && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                Session · {matches.length} games
              </span>
            )}
            {wins !== null && losses !== null && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                <span className="text-lime-400">{wins}W</span>
                <span className="text-slate-600 mx-0.5">–</span>
                <span className="text-red-400">{losses}L</span>
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 shrink-0">{anchorMatch.date}</span>
        </div>

        {/* Players */}
        <div className="flex flex-wrap gap-1">
          {allPlayers.map((p) => (
            <Link
              key={p}
              href={`/players/${encodeURIComponent(p)}`}
              className="text-xs font-semibold text-slate-300 hover:text-lime-400 transition-colors"
            >
              {p}
            </Link>
          )).reduce((acc: React.ReactNode[], el, i) => {
            if (i > 0) acc.push(<span key={`sep-${i}`} className="text-slate-700 text-xs">·</span>);
            acc.push(el);
            return acc;
          }, [])}
        </div>

        {/* Location */}
        {note.location && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {note.location}
          </div>
        )}

        {/* Description */}
        {note.description && (
          <p className="text-sm text-slate-300 leading-relaxed">{note.description}</p>
        )}

        {/* Expand/collapse game list */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? 'Hide games' : `See all ${matches.length} games`}
        </button>

        {/* Game list */}
        {expanded && (
          <div className="space-y-1.5 pt-1">
            {matches.map((m) => (
              <GameRow key={m.matchId} match={m} name={name} />
            ))}
          </div>
        )}
      </div>

      {/* Edit session button (signed-in only) */}
      {session && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-lime-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit session
          </button>
        </div>
      )}

      {/* Actions + Comments (anchored to first match) */}
      <ActivityCardActions matchId={anchorMatch.matchId} shareText={shareText} />
      <MatchComments matchId={anchorMatch.matchId} />

      {/* Edit modal */}
      {editOpen && (
        <EditSessionModal
          anchorId={anchorMatch.matchId}
          sessionDate={anchorMatch.date}
          note={note}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
