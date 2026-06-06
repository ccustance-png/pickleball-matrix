'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { FriendRequest, MatchRow, MatchNote, PlayerProfile } from '@/lib/db';

type Props = {
  myPlayer: string;
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  myMatches: MatchRow[];
  matchNotes: Record<number, MatchNote>;
  profilesMap: Record<string, PlayerProfile>;
};

function displayName(name: string, profilesMap: Record<string, PlayerProfile>) {
  const p = profilesMap[name.toUpperCase()];
  return p?.firstName && p?.lastName ? `${p.firstName} ${p.lastName}` : name;
}

function Avatar({ name, profilesMap }: { name: string; profilesMap: Record<string, PlayerProfile> }) {
  const p = profilesMap[name.toUpperCase()];
  const dn = displayName(name, profilesMap);
  if (p?.photoUrl) {
    return (
      <Image src={p.photoUrl} alt={dn} width={36} height={36}
        className="rounded-full object-cover shrink-0" unoptimized />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold shrink-0">
      {dn[0]?.toUpperCase()}
    </div>
  );
}

export default function NotificationsView({
  myPlayer, incoming, outgoing, myMatches, matchNotes, profilesMap,
}: Props) {
  const [requests, setRequests] = useState(incoming);
  const [loading, setLoading] = useState<string | null>(null);

  const pending  = requests.filter(r => r.status === 'PENDING');
  const accepted = requests.filter(r => r.status === 'ACCEPTED');

  async function respond(requestId: string, status: 'ACCEPTED' | 'DECLINED') {
    setLoading(requestId);
    await fetch(`/api/friends/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setRequests(prev =>
      status === 'ACCEPTED'
        ? prev.map(r => r.requestId === requestId ? { ...r, status: 'ACCEPTED' as const } : r)
        : prev.filter(r => r.requestId !== requestId),
    );
    setLoading(null);
  }

  const isEmpty = pending.length === 0 && accepted.length === 0 && outgoing.length === 0 && myMatches.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-5xl mb-4">🔔</p>
        <p className="font-semibold text-lg text-slate-400">All caught up</p>
        <p className="text-sm mt-2">Friend requests and your matches will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Pending friend requests ── */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            Friend Requests
            <span className="bg-lime-500 text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{pending.length}</span>
          </h2>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.requestId} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                <Avatar name={r.fromPlayer} profilesMap={profilesMap} />
                <Link
                  href={`/players/${encodeURIComponent(r.fromPlayer)}`}
                  className="flex-1 min-w-0"
                >
                  <p className="font-semibold text-sm text-slate-100 hover:text-lime-400 transition-colors truncate">
                    {displayName(r.fromPlayer, profilesMap)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">wants to be friends</p>
                </Link>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => respond(r.requestId, 'ACCEPTED')}
                    disabled={loading === r.requestId}
                    className="px-3 py-1.5 text-xs font-semibold bg-lime-500/15 hover:bg-lime-500/25 border border-lime-500/30 text-lime-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === r.requestId ? '…' : '✓ Accept'}
                  </button>
                  <button
                    onClick={() => respond(r.requestId, 'DECLINED')}
                    disabled={loading === r.requestId}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Accepted / friends ── */}
      {(accepted.length > 0 || outgoing.length > 0) && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Friends · <span className="text-lime-400">{accepted.length + outgoing.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[...accepted.map(r => r.fromPlayer), ...outgoing.map(r => r.toPlayer)].map(name => (
              <Link
                key={name}
                href={`/players/${encodeURIComponent(name)}`}
                className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2.5 transition-colors"
              >
                <Avatar name={name} profilesMap={profilesMap} />
                <span className="text-sm font-semibold text-slate-200 hover:text-lime-400 truncate">
                  {displayName(name, profilesMap)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Your recent matches ── */}
      {myMatches.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Your Matches · <span className="text-slate-400">{myMatches.length}</span>
          </h2>
          <div className="space-y-2">
            {myMatches.map(m => {
              const note = matchNotes[m.matchId];
              const winPlayers = m.win.split('/').map(p => p.trim().toUpperCase());
              const lossPlayers = m.loss.split('/').map(p => p.trim().toUpperCase());
              const isWinner = winPlayers.includes(myPlayer.toUpperCase());
              const myScore = m.team1.toUpperCase().includes(myPlayer.toUpperCase()) ? m.team1Score : m.team2Score;
              const oppScore = m.team1.toUpperCase().includes(myPlayer.toUpperCase()) ? m.team2Score : m.team1Score;
              const oppTeam = isWinner ? lossPlayers : winPlayers;

              return (
                <div key={m.matchId} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                  {note?.photoUrl && (
                    <div className="relative h-36 w-full">
                      <Image src={note.photoUrl} alt="Match photo" fill className="object-cover" unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                    </div>
                  )}
                  <div className="px-4 py-3 flex items-center gap-3">
                    {/* W/L badge */}
                    <span className={`text-xs font-black w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isWinner ? 'bg-lime-500/20 text-lime-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {isWinner ? 'W' : 'L'}
                    </span>

                    {/* Score */}
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className={`text-xl font-black font-mono ${isWinner ? 'text-lime-400' : 'text-slate-300'}`}>{myScore}</span>
                      <span className="text-slate-600 text-sm">–</span>
                      <span className={`text-xl font-black font-mono ${!isWinner ? 'text-red-400' : 'text-slate-500'}`}>{oppScore}</span>
                    </div>

                    {/* vs opponents */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-slate-500">vs</span>
                        {oppTeam.map((opp, i) => (
                          <span key={opp}>
                            {i > 0 && <span className="text-slate-600 text-xs"> / </span>}
                            <Link
                              href={`/players/${encodeURIComponent(opp)}`}
                              className="text-sm font-semibold text-slate-200 hover:text-lime-400 transition-colors"
                            >
                              {displayName(opp, profilesMap)}
                            </Link>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500">{m.date}</span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-500">{m.type === 'SINGLES' ? 'Singles' : 'Doubles'}</span>
                        {m.bracket && (
                          <>
                            <span className="text-xs text-slate-600">·</span>
                            <span className={`text-xs ${m.bracket.toUpperCase() === 'CASUAL' ? 'text-amber-400' : 'text-slate-500'}`}>
                              {m.bracket}
                            </span>
                          </>
                        )}
                      </div>
                      {note?.location && (
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          {note.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {note?.description && (
                    <p className="px-4 pb-3 text-sm text-slate-400 leading-relaxed">{note.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
