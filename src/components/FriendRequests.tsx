'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FriendRequest } from '@/lib/sheets';

export default function FriendRequests({
  incoming,
  friends,
}: {
  incoming: FriendRequest[];
  friends: FriendRequest[];
}) {
  const [requests, setRequests] = useState(incoming);
  const [loading, setLoading] = useState<string | null>(null);

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
        : prev.filter(r => r.requestId !== requestId)
    );
    setLoading(null);
  }

  const pending  = requests.filter(r => r.status === 'PENDING');
  const accepted = requests.filter(r => r.status === 'ACCEPTED');
  const allFriends = [...friends.map(f => f.toPlayer), ...accepted.map(r => r.fromPlayer)];

  if (pending.length === 0 && allFriends.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Pending incoming requests */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            Friend Requests
            <span className="bg-lime-500 text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
          </h2>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.requestId} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                <Link
                  href={`/players/${encodeURIComponent(r.fromPlayer)}`}
                  className="flex-1 font-semibold text-sm text-slate-100 hover:text-lime-400 transition-colors"
                >
                  {r.fromPlayer}
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
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      {allFriends.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Friends · <span className="text-lime-400">{allFriends.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {allFriends.map(name => (
              <Link
                key={name}
                href={`/players/${encodeURIComponent(name)}`}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2.5 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-lime-500/20 border border-lime-500/30 flex items-center justify-center text-xs font-bold text-lime-400 shrink-0">
                  {name[0]}
                </span>
                <span className="text-sm font-semibold text-slate-200 hover:text-lime-400 truncate">{name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
