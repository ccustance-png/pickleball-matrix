'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingForm() {
  const router = useRouter();
  const [username,  setUsername]  = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error,  setError]  = useState('');

  const displayPreview = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim())   { setError('Username is required.');   return; }
    if (!firstName.trim())  { setError('First name is required.'); return; }
    if (!lastName.trim())   { setError('Last name is required.');  return; }
    if (username.trim().length < 2) { setError('Username must be at least 2 characters.'); return; }
    if (!/^[a-zA-Z0-9_\-]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, underscores, and hyphens.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toUpperCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
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

      {/* Username */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Username <span className="text-slate-600 normal-case font-normal">(stored in match records)</span>
        </label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="e.g. CALVIN or CC"
          maxLength={20}
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30 uppercase"
        />
        <p className="text-xs text-slate-600 mt-1">This is the key in the sheet — keep it short and unique</p>
      </div>

      {/* First + Last name */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Display Name <span className="text-slate-600 normal-case font-normal">(shown in the app)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First"
            maxLength={30}
            required
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
          />
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Last"
            maxLength={30}
            required
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
          />
        </div>
      </div>

      {/* Live preview */}
      {(username.trim() || displayPreview) && (
        <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-4 space-y-2">
          {username.trim() && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Sheet key</span>
              <span className="text-sm font-mono font-bold text-slate-300">{username.trim().toUpperCase()}</span>
            </div>
          )}
          {displayPreview && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Displayed as</span>
              <span className="text-sm font-bold text-lime-400">{displayPreview}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !username.trim() || !firstName.trim() || !lastName.trim()}
        className="w-full py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
      >
        {status === 'loading' ? 'Creating…' : 'Create My Profile'}
      </button>
    </form>
  );
}
