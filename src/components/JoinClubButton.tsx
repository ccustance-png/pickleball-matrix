'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

type Props = {
  clubId: string;
};

export default function JoinClubButton({ clubId }: Props) {
  const { data: session } = useSession();
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/clubs/${clubId}/members`)
      .then(r => r.json())
      .then(d => {
        setIsMember(d.isMember);
        setPlayerName(d.playerName);
      })
      .catch(() => setIsMember(false));
  }, [clubId]);

  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-900 font-semibold text-sm transition-colors"
      >
        Sign in to Join
      </button>
    );
  }

  if (!playerName) return null;
  if (isMember === null) {
    return <div className="px-4 py-2 rounded-lg bg-slate-800 text-slate-500 text-sm animate-pulse w-24 h-9" />;
  }

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`/api/clubs/${clubId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isMember ? 'leave' : 'join' }),
      });
      setIsMember(!isMember);
    } finally {
      setLoading(false);
    }
  }

  if (isMember) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-400 font-semibold text-sm transition-colors disabled:opacity-50"
      >
        {loading ? '…' : 'Leave Club'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50"
    >
      {loading ? '…' : 'Join Club'}
    </button>
  );
}
