'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Props = { name: string; signedIn: boolean };

export default function ClaimButton({ name, signedIn }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleClaim() {
    if (!signedIn) {
      signIn('google');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(name)}/claim`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to claim');
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to claim');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-lime-500/15 text-lime-400 font-semibold">
        ✓ Profile claimed!
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClaim}
        disabled={loading}
        className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-lime-400 rounded-full transition-colors disabled:opacity-50"
      >
        {loading ? 'Claiming…' : signedIn ? 'Claim this profile' : 'Sign in to claim'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
