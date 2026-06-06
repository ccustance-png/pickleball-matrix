'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import type { Challenge } from '@/lib/db';

// ── helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = ['bg-lime-600', 'bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-orange-600', 'bg-teal-600'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ── Challenge card ─────────────────────────────────────────────────────────────
function ChallengeCard({
  challenge,
  onUpdate,
}: {
  challenge: Challenge;
  onUpdate: (id: string, status: Challenge['status']) => void;
}) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(status: Challenge['status']) {
    if (!session) { signIn('google'); return; }
    setLoading(status);
    await fetch(`/api/challenges/${challenge.challengeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    onUpdate(challenge.challengeId, status);
    setLoading(null);
  }

  const isOpen      = challenge.status === 'OPEN';
  const isAccepted  = challenge.status === 'ACCEPTED';
  const isCompleted = challenge.status === 'COMPLETED';
  const isDeclined  = challenge.status === 'DECLINED';

  const statusStyle = isOpen
    ? 'bg-lime-500/10 text-lime-400 border-lime-500/20'
    : isAccepted
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    : isCompleted
    ? 'bg-slate-700/50 text-slate-400 border-slate-600/20'
    : 'bg-red-500/10 text-red-400 border-red-500/20';

  const statusLabel = isOpen ? 'Open' : isAccepted ? 'Accepted' : isCompleted ? 'Completed' : 'Declined';

  return (
    <div className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition-opacity ${
      isDeclined || isCompleted ? 'border-slate-800 opacity-60' : 'border-slate-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Avatar name={challenge.fromPlayer} />
          <div>
            <p className="text-sm font-bold text-slate-100">
              <span className="text-lime-400">{challenge.fromPlayer}</span>
              <span className="text-slate-500 font-normal mx-1.5">challenged</span>
              <span className="text-slate-200">{challenge.toPlayer}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {challenge.type === 'SINGLES' ? 'Singles' : 'Doubles'} · {timeAgo(challenge.createdAt)}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>

      {/* Trash talk */}
      {challenge.message && (
        <div className="bg-slate-800/60 rounded-lg px-3 py-2 border-l-2 border-lime-500/40">
          <p className="text-sm text-slate-300 italic">"{challenge.message}"</p>
        </div>
      )}

      {/* Actions — only show for open/accepted challenges to signed-in users */}
      {(isOpen || isAccepted) && session && (
        <div className="flex items-center gap-2 pt-1">
          {isOpen && (
            <>
              <button
                onClick={() => handleAction('ACCEPTED')}
                disabled={!!loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-500/15 hover:bg-lime-500/25 border border-lime-500/30 text-lime-400 text-xs font-semibold rounded-lg transition-colors"
              >
                {loading === 'ACCEPTED' ? '…' : '✓ Accept'}
              </button>
              <button
                onClick={() => handleAction('DECLINED')}
                disabled={!!loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-red-400 text-xs font-semibold rounded-lg transition-colors"
              >
                {loading === 'DECLINED' ? '…' : '✕ Decline'}
              </button>
            </>
          )}
          {isAccepted && (
            <button
              onClick={() => handleAction('COMPLETED')}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-lg transition-colors"
            >
              {loading === 'COMPLETED' ? '…' : '🏓 Mark as Played'}
            </button>
          )}
        </div>
      )}

      {/* Sign in nudge for unauthenticated users on open challenges */}
      {(isOpen || isAccepted) && !session && (
        <button
          onClick={() => signIn('google')}
          className="text-xs text-slate-600 hover:text-lime-400 transition-colors"
        >
          Sign in to respond →
        </button>
      )}
    </div>
  );
}

// ── New challenge form ─────────────────────────────────────────────────────────
function NewChallengeForm({
  players,
  onSubmit,
  onCancel,
}: {
  players: string[];
  onSubmit: (c: Challenge) => void;
  onCancel: () => void;
}) {
  const [fromPlayer, setFromPlayer] = useState('');
  const [toPlayer, setToPlayer]     = useState('');
  const [type, setType]             = useState<'SINGLES' | 'DOUBLES'>('SINGLES');
  const [message, setMessage]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!fromPlayer || !toPlayer) { setError('Pick both players.'); return; }
    if (fromPlayer === toPlayer)  { setError('Cannot challenge yourself.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPlayer, toPlayer, type, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      onSubmit({
        challengeId: data.challengeId,
        fromPlayer: fromPlayer.toUpperCase(),
        fromEmail: '',
        toPlayer: toPlayer.toUpperCase(),
        type,
        message,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const sel = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-lime-500 appearance-none";

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-100">Throw Down a Challenge</h3>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">You</label>
          <select value={fromPlayer} onChange={e => setFromPlayer(e.target.value)} className={sel} required>
            <option value="">Your name…</option>
            {players.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <span className="text-slate-600 font-bold text-sm pt-5">VS</span>
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Opponent</label>
          <select value={toPlayer} onChange={e => setToPlayer(e.target.value)} className={sel} required>
            <option value="">Their name…</option>
            {players.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Match type */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Match Type</label>
        <div className="flex gap-2">
          {(['SINGLES', 'DOUBLES'] as const).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                type === t
                  ? 'bg-lime-500 border-lime-500 text-slate-900'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
              {t === 'SINGLES' ? 'Singles' : 'Doubles'}
            </button>
          ))}
        </div>
      </div>

      {/* Trash talk */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">
          Trash Talk <span className="normal-case font-normal text-slate-600">(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Say something bold…"
          rows={2}
          maxLength={140}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 resize-none"
        />
        <p className="text-xs text-slate-600 text-right">{message.length}/140</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
      >
        {loading ? 'Posting…' : '🏓 Throw Down'}
      </button>
    </form>
  );
}

// ── Main feed ──────────────────────────────────────────────────────────────────
export default function ChallengeFeed({
  initialChallenges,
  players,
}: {
  initialChallenges: Challenge[];
  players: string[];
}) {
  const { data: session } = useSession();
  const [challenges, setChallenges] = useState<Challenge[]>(
    [...initialChallenges].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
  const [showForm, setShowForm] = useState(false);

  function handleUpdate(id: string, status: Challenge['status']) {
    setChallenges(prev => prev.map(c => c.challengeId === id ? { ...c, status } : c));
  }

  function handleNew(c: Challenge) {
    setChallenges(prev => [c, ...prev]);
    setShowForm(false);
  }

  const open     = challenges.filter(c => c.status === 'OPEN' || c.status === 'ACCEPTED');
  const resolved = challenges.filter(c => c.status === 'COMPLETED' || c.status === 'DECLINED');

  return (
    <div className="space-y-6">
      {/* CTA */}
      {!showForm && (
        <button
          onClick={() => session ? setShowForm(true) : signIn('google')}
          className="w-full py-3 bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">🏓</span>
          Throw Down a Challenge
        </button>
      )}

      {/* Form */}
      {showForm && (
        <NewChallengeForm
          players={players}
          onSubmit={handleNew}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Open challenges */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Open Challenges
          </h2>
          {open.length > 0 && (
            <span className="text-xs bg-lime-500/15 text-lime-400 px-2 py-0.5 rounded-full font-semibold">
              {open.length}
            </span>
          )}
        </div>

        {open.length === 0 ? (
          <div className="text-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-xl">
            <p className="text-3xl mb-2">😤</p>
            <p className="text-sm font-medium">No open challenges</p>
            <p className="text-xs mt-1">Be the first to call someone out</p>
          </div>
        ) : (
          <div className="space-y-3">
            {open.map(c => (
              <ChallengeCard key={c.challengeId} challenge={c} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">History</h2>
          <div className="space-y-3">
            {resolved.map(c => (
              <ChallengeCard key={c.challengeId} challenge={c} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
