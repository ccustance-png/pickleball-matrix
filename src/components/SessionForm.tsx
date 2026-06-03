'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PlayerCombobox from './PlayerCombobox';

type Bracket = 'COMPETITIVE' | 'CASUAL';
type MatchType = 'SINGLES' | 'DOUBLES';

type GameEntry = {
  id: string;
  bracket: Bracket;
  type: MatchType;
  t1p1: string; t1p2: string;
  t2p1: string; t2p2: string;
  score1: string; score2: string;
};

function newGame(): GameEntry {
  return {
    id: Math.random().toString(36).slice(2),
    bracket: 'COMPETITIVE',
    type: 'SINGLES',
    t1p1: '', t1p2: '',
    t2p1: '', t2p2: '',
    score1: '', score2: '',
  };
}

function today() { return new Date().toISOString().split('T')[0]; }

function formatSheetDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}/${y.slice(2)}`;
}

// ── Single game entry card ─────────────────────────────────────────────────────
function GameCard({
  game,
  index,
  players,
  onChange,
  onRemove,
  canRemove,
}: {
  game: GameEntry;
  index: number;
  players: string[];
  onChange: (patch: Partial<GameEntry>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const s1 = Number(game.score1);
  const s2 = Number(game.score2);
  const t1Label = game.type === 'SINGLES'
    ? game.t1p1 || 'Player 1'
    : [game.t1p1, game.t1p2].filter(Boolean).join('/') || 'Team 1';
  const t2Label = game.type === 'SINGLES'
    ? game.t2p1 || 'Player 2'
    : [game.t2p1, game.t2p2].filter(Boolean).join('/') || 'Team 2';
  const winner = game.score1 && game.score2 && s1 !== s2
    ? (s1 > s2 ? t1Label : t2Label) : null;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
      {/* Header: game number + remove */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Game {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Bracket + Type toggles */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-1.5">
          {(['COMPETITIVE', 'CASUAL'] as Bracket[]).map((b) => (
            <button key={b} type="button" onClick={() => onChange({ bracket: b })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                game.bracket === b
                  ? 'bg-lime-500 border-lime-500 text-slate-900'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
              {b === 'COMPETITIVE' ? 'Comp' : 'Casual'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['SINGLES', 'DOUBLES'] as MatchType[]).map((t) => (
            <button key={t} type="button" onClick={() => onChange({ type: t })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                game.type === t
                  ? 'bg-lime-500 border-lime-500 text-slate-900'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
              {t === 'SINGLES' ? 'Singles' : 'Doubles'}
            </button>
          ))}
        </div>
      </div>

      {/* Players + Scores */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
        {/* Team 1 */}
        <div className="space-y-2">
          <PlayerCombobox value={game.t1p1} onChange={(v) => onChange({ t1p1: v })}
            suggestions={players} placeholder={game.type === 'DOUBLES' ? 'Player 1…' : 'Player 1…'} />
          {game.type === 'DOUBLES' && (
            <PlayerCombobox value={game.t1p2} onChange={(v) => onChange({ t1p2: v })}
              suggestions={players} placeholder="Partner…" />
          )}
          <input type="number" min={0} max={99} value={game.score1}
            onChange={(e) => onChange({ score1: e.target.value })}
            placeholder="Score"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500" />
        </div>

        {/* VS */}
        <div className="flex items-center justify-center pt-2">
          <span className="text-slate-600 font-bold text-xs">VS</span>
        </div>

        {/* Team 2 */}
        <div className="space-y-2">
          <PlayerCombobox value={game.t2p1} onChange={(v) => onChange({ t2p1: v })}
            suggestions={players} placeholder={game.type === 'DOUBLES' ? 'Player 3…' : 'Player 2…'} />
          {game.type === 'DOUBLES' && (
            <PlayerCombobox value={game.t2p2} onChange={(v) => onChange({ t2p2: v })}
              suggestions={players} placeholder="Partner…" />
          )}
          <input type="number" min={0} max={99} value={game.score2}
            onChange={(e) => onChange({ score2: e.target.value })}
            placeholder="Score"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500" />
        </div>
      </div>

      {/* Winner preview */}
      {winner && (
        <div className="rounded-lg bg-lime-500/10 border border-lime-500/30 px-3 py-2 text-xs text-lime-300">
          Winner: <span className="font-bold">{winner}</span>
        </div>
      )}
    </div>
  );
}

// ── Main session form ──────────────────────────────────────────────────────────
export default function SessionForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [playerList, setPlayerList] = useState<string[]>([]);
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
    fetch('/api/players')
      .then((r) => r.json())
      .then((data: { name: string }[]) => setPlayerList(data.map((p) => p.name)))
      .catch(() => {});
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
