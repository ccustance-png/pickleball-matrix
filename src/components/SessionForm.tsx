'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import GameCard, { type GameEntry, newGame } from './GameCard';

function today() { return new Date().toISOString().split('T')[0]; }

function formatSheetDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}/${y.slice(2)}`;
}

// ── Main session form ──────────────────────────────────────────────────────────
export default function SessionForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [playerList, setPlayerList] = useState<string[]>([]);
  const [myName, setMyName]         = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [games, setGames] = useState<GameEntry[]>([newGame()]);

  // Session-level activity details
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch player list and current user in parallel
    Promise.all([
      fetch('/api/players').then(r => r.json()).catch(() => []),
      fetch('/api/me').then(r => r.json()).catch(() => ({ player: null })),
    ]).then(([players, me]) => {
      const list = (players as { name: string }[]).map(p => p.name);
      setPlayerList(list);

      // Auto-populate the signed-in user into the first player slot
      if (me?.player) {
        setMyName(me.player);
        setGames(prev => prev.map((g, i) =>
          i === 0 ? { ...g, t1p1: me.player } : g
        ));
      }
    });
  }, []);

  function updateGame(id: string, patch: Partial<GameEntry>) {
    setGames((prev) => prev.map((g) => g.id === id ? { ...g, ...patch } : g));
  }

  function removeGame(id: string) {
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  function addGame() {
    setGames((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, {
        ...newGame(),
        // carry forward players, type, and bracket — clear scores only
        bracket: last.bracket,
        type: last.type,
        t1p1: last.t1p1,
        t1p2: last.t1p2,
        t2p1: last.t2p1,
        t2p2: last.t2p2,
      }];
    });
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'match');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setPhotoUrl(data.url);
    } catch {
      setPhotoPreview('');
      setError('Photo upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (uploading) { setError('Please wait for photo to finish uploading.'); return; }

    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      const t1 = g.type === 'SINGLES' ? [g.t1p1] : [g.t1p1, g.t1p2];
      const t2 = g.type === 'SINGLES' ? [g.t2p1] : [g.t2p1, g.t2p2];
      if (t1.some((p) => !p.trim()) || t2.some((p) => !p.trim())) {
        setError(`Game ${i + 1}: all player names are required.`); return;
      }
      if (!g.score1 || !g.score2) {
        setError(`Game ${i + 1}: both scores are required.`); return;
      }
      if (Number(g.score1) === Number(g.score2)) {
        setError(`Game ${i + 1}: scores cannot be tied.`); return;
      }
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatSheetDate(date),
          games: games.map((g) => ({
            bracket: g.bracket,
            type: g.type,
            team1Players: g.type === 'SINGLES' ? [g.t1p1] : [g.t1p1, g.t1p2],
            team2Players: g.type === 'SINGLES' ? [g.t2p1] : [g.t2p1, g.t2p2],
            team1Score: Number(g.score1),
            team2Score: Number(g.score2),
          })),
          photoUrl,
          location: location.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit');
      setStatus('success');
      setTimeout(() => router.push('/'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-xl font-semibold text-lime-400">
          {games.length === 1 ? 'Match logged!' : `${games.length} games logged!`}
        </p>
        <p className="text-slate-400 text-sm">Redirecting to home…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Signed-in player chip */}
      {myName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg">
          <span className="text-sm">🥒</span>
          <span className="text-xs text-slate-400">Playing as</span>
          <span className="text-sm font-bold text-lime-400">{myName}</span>
        </div>
      )}

      {/* ── Session header ───────────────────────────────────────────────── */}
      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30" />
      </div>

      {/* Activity details (once for whole session) */}
      <div className="border border-slate-700 rounded-xl p-4 space-y-4 bg-slate-800/30">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Session Details <span className="normal-case font-normal text-slate-600">(optional · shared across all games)</span>
        </p>

        {/* Photo */}
        <div className="flex items-center gap-3">
          {photoPreview ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0">
              <Image src={photoPreview} alt="Session photo" fill className="object-cover" unoptimized />
              <button type="button" onClick={() => { setPhotoPreview(''); setPhotoUrl(''); }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-xs flex items-center justify-center hover:bg-black">
                ×
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 hover:border-lime-500 text-slate-500 hover:text-lime-400 transition-colors flex flex-col items-center justify-center gap-1 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs">Photo</span>
            </button>
          )}
          <div className="flex-1 space-y-2">
            {uploading && <p className="text-xs text-lime-400">Uploading…</p>}
            {/* Location */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Location" maxLength={100}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500" />
            </div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

        {/* Description */}
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="How was the session? (optional)"
          rows={2} maxLength={300}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 resize-none" />
      </div>

      {/* ── Games ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Games · <span className="text-lime-400">{games.length}</span>
        </p>

        {games.map((game, i) => (
          <GameCard
            key={game.id}
            game={game}
            index={i}
            players={playerList}
            onChange={(patch) => updateGame(game.id, patch)}
            onRemove={() => removeGame(game.id)}
            canRemove={games.length > 1}
          />
        ))}

        <button
          type="button"
          onClick={addGame}
          className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-lime-500 text-slate-500 hover:text-lime-400 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none">+</span>
          Add Game
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || uploading}
        className="w-full py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
      >
        {status === 'loading'
          ? 'Submitting…'
          : games.length === 1
            ? 'Log Match'
            : `Log Session · ${games.length} games`}
      </button>
    </form>
  );
}
