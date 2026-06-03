'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError]   = useState('');

  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) { setError('First name is required.'); return; }
    if (!lastName.trim())  { setError('Last name is required.');  return; }

    setStatus('loading');
    try {
      const res = await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create profile');
      setStatus('success');
      setTimeout(() => router.push('/'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="text-5xl">✅</div>
        <p className="text-xl font-bold text-lime-400">You&rsquo;re in!</p>
        <p className="text-slate-400 text-sm">Taking you home…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Calvin"
            maxLength={30}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Smith"
            maxLength={30}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
          />
        </div>
      </div>

      {/* Live preview */}
      {displayName && (
        <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-4 text-center">
          <p className="text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Your player name</p>
          <p className="text-2xl font-black text-lime-400 tracking-tight">{displayName}</p>
          <p className="text-xs text-slate-600 mt-1.5">This is how you&rsquo;ll appear in matches, rankings, and stats</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !firstName.trim() || !lastName.trim()}
        className="w-full py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
      >
        {status === 'loading' ? 'Creating…' : 'Create My Profile'}
      </button>
    </form>
  );
}
