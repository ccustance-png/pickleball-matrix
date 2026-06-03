'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Props = { name: string; signedIn: boolean };

export default function ClaimButton({ name, signedIn }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen]   = useState(false);
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [status, setStatus]         = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError]           = useState('');
  const [finalName, setFinalName]   = useState('');

  const displayPreview = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

  function handleOpen() {
    if (!signedIn) { signIn('google'); return; }
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      // Step 1: claim the profile (link email to existing name)
      const claimRes = await fetch(`/api/profile/${encodeURIComponent(name)}/claim`, { method: 'POST' });
      const claimData = await claimRes.json();
      if (!claimRes.ok) throw new Error(claimData.error ?? 'Failed to claim');

      let resolvedName = name;

      // Step 2: if they entered a full name, rename across the sheet
      if (firstName.trim() && lastName.trim()) {
        const renameRes = await fetch('/api/profile/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName: name, firstName: firstName.trim(), lastName: lastName.trim() }),
        });
        const renameData = await renameRes.json();
        if (!renameRes.ok) throw new Error(renameData.error ?? 'Failed to update name');
        resolvedName = renameData.playerName ?? resolvedName;
      }

      setFinalName(resolvedName);
      setStatus('success');
      setTimeout(() => {
        setModalOpen(false);
        // Navigate to the new profile URL if name changed
        const newPath = `/players/${encodeURIComponent(resolvedName)}`;
        if (resolvedName !== name.toUpperCase()) {
          router.push(newPath);
        } else {
          router.refresh();
        }
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  if (!modalOpen) {
    return (
      <button
        onClick={handleOpen}
        className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-lime-400 rounded-full transition-colors"
      >
        {signedIn ? 'Claim this profile' : 'Sign in to claim'}
      </button>
    );
  }

  return (
    <>
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setModalOpen(false)}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>

          {status === 'success' ? (
            <div className="text-center py-6 space-y-2">
              <div className="text-4xl">✅</div>
              <p className="text-lg font-bold text-lime-400">Profile claimed!</p>
              {finalName && <p className="text-sm text-slate-400">Saved as <span className="text-slate-200 font-semibold">{finalName}</span></p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-lg font-black text-slate-100">Claim <span className="text-lime-400">{name}</span></h2>
                <p className="text-xs text-slate-500 mt-1">This links your Google account to this player profile.</p>
              </div>

              {/* Optional name upgrade */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Update to full name <span className="normal-case font-normal text-slate-600">(recommended)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="First"
                    maxLength={30}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Last"
                    maxLength={30}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500"
                  />
                </div>
                {displayPreview && (
                  <p className="text-xs text-slate-500">
                    Will rename <span className="text-slate-400 font-semibold">{name}</span>
                    {' → '}
                    <span className="text-lime-400 font-semibold">{displayPreview.toUpperCase()}</span>
                    {' '}across all match records
                  </p>
                )}
                {!displayPreview && (
                  <p className="text-xs text-slate-600">Leave blank to keep the name <span className="text-slate-500">{name}</span></p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{error}</div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors text-sm"
              >
                {status === 'loading'
                  ? 'Saving…'
                  : displayPreview
                    ? `Claim as ${displayPreview.toUpperCase()}`
                    : `Claim as ${name}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
