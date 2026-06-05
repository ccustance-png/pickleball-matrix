'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import type { FriendRequest } from '@/lib/sheets';

type Props = {
  targetPlayer: string;       // the profile being viewed
  myPlayer: string | null;    // logged-in user's player name (null if unclaimed)
  existingRequest: FriendRequest | null;
};

export default function FriendButton({ targetPlayer, myPlayer, existingRequest }: Props) {
  const { data: session } = useSession();
  const [req, setReq] = useState<FriendRequest | null>(existingRequest);
  const [loading, setLoading] = useState(false);

  // Don't show on your own profile
  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-lime-400 rounded-full transition-colors"
      >
        🤝 Add Friend
      </button>
    );
  }
  if (!myPlayer) return null;
  if (myPlayer.toUpperCase() === targetPlayer.toUpperCase()) return null;

  async function sendRequest() {
    setLoading(true);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toPlayer: targetPlayer }),
      });
      const data = await res.json();
      if (res.ok) {
        setReq({
          requestId: data.requestId,
          fromPlayer: myPlayer!,
          toPlayer: targetPlayer,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  if (!req) {
    return (
      <button
        onClick={sendRequest}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-lime-400 rounded-full transition-colors disabled:opacity-50"
      >
        {loading ? '…' : '🤝 Add Friend'}
      </button>
    );
  }

  if (req.status === 'PENDING') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-500 rounded-full">
        ⏳ Request sent
      </span>
    );
  }

  if (req.status === 'ACCEPTED') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-lime-500/10 border border-lime-500/20 text-lime-400 rounded-full">
        ✓ Friends
      </span>
    );
  }

  return null;
}
