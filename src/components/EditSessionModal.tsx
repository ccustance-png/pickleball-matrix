'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import GameCard, { type GameEntry, newGame } from './GameCard';
import type { MatchNote } from '@/lib/sheets';

type Props = {
  anchorId: number;
  sessionDate: string;   // raw sheet date string e.g. "5/28/25"
  note: MatchNote;
  onClose: () => void;
};

type Tab = 'games' | 'details';

export default function EditSessionModal({ anchorId, sessionDate, note, onClose }: Props) {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('games');

  // ── Games state ────────────────────────────────────────────────────────────
  const [playerList, setPlayerList] = useState<string[]>([]);
  const [games, setGames]           = useState<GameEntry[]>([newGame()]);
  const [gamesStatus, setGamesStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [gamesError, setGamesError]   = useState('');

  // ── Note state ─────────────────────────────────────────────────────────────
  const [photoPreview, setPhotoPreview] = useState(note.photoUrl ?? '');
  const [photoUrl,     setPhotoUrl]     = useState(note.photoUrl ?? '');
  const [location,     setLocation]     = useState(note.location ?? '');
  const [description,  setDescription]  = useState(note.description ?? '');
  const [uploading,    setUploading]    = useState(false);
  const [noteStatus,   setNoteStatus]   = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [noteError,    setNoteError]    = useState('');

  useEffect(() => {
    fetch('/api/players')
      .then(r => r.json())
      .then((d: { name: string }[]) => setPlayerList(d.map(p => p.name)))
      .catch(() => {});
  }, []);

  function updateGame(id: string, patch: Partial<GameEntry>) {
    setGames(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  }
  function removeGame(id: string) { setGames(prev => prev.filter(g => g.id !== id)); }
  function addGame() {
    setGames(prev => {
      const last = prev[prev.length - 1];
      return [...prev, { ...newGame(), bracket: last.bracket, type: last.type, t1p1: last.t1p1, t1p2: last.t1p2, t2p1: last.t2p1, t2p2: last.t2p2 }];
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
      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setPhotoUrl(data.url);
    } catch {
      setPhotoPreview(note.photoUrl ?? '');
      setNoteError('Photo upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function saveNote() {
    setNoteError('');
    setNoteStatus('loading');
    try {
      const res = await fetch(`/api/match/${anchorId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, location: location.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setNoteStatus('success');
      setTimeout(() => { setNoteStatus('idle'); router.refresh(); }, 1200);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Save failed');
      setNoteStatus('error');
    }
  }

  async function saveGames() {
    setGamesError('');
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      const t1 = g.type === 'SINGLES' ? [g.t1p1] : [g.t1p1, g.t1p2];
      const t2 = g.type === 'SINGLES' ? [g.t2p1] : [g.t2p1, g.t2p2];
      if (t1.some(p => !p.trim()) || t2.some(p => !p.trim())) { setGamesError(`Game ${i+1}: all player names required.`); return; }
      if (!g.score1 || !g.score2) { setGamesError(`Game ${i+1}: both scores required.`); return; }
      if (Number(g.score1) === Number(g.score2)) { setGamesError(`Game ${i+1}: scores can't be tied.`); return; }
    }

    setGamesStatus('loading');
    try {
      const res = await fetch(`/api/sessions/${anchorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: sessionDate,
          games: games.map(g => ({
            bracket: g.bracket,
            type: g.type,
            team1Players: g.type === 'SINGLES' ? [g.t1p1] : [g.t1p1, g.t1p2],
            team2Players: g.type === 'SINGLES' ? [g.t2p1] : [g.t2p1, g.t2p2],
            team1Score: Number(g.score1),
            team2Score: Number(g.score2),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save games');
      setGamesStatus('success');
      setTimeout(() => { onClose(); router.refresh(); }, 1200);
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : 'Unknown error');
      setGamesStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <h2 className="text-base font-bold text-slate-100">Edit Session</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-0 shrink-0">
          {([['games', 'Add Games'], ['details', 'Session Details']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === id ? 'bg-lime-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">

          {/* ── Add Games tab ──────────────────────────────────────────── */}
          {tab === 'games' && (
            <>
              <p className="text-xs text-slate-500">Games added here will be linked to this session and recorded in the sheet.</p>

              {games.map((game, i) => (
                <GameCard
                  key={game.id}
                  game={game}
                  index={i}
                  players={playerList}
                  onChange={patch => updateGame(game.id, patch)}
                  onRemove={() => removeGame(game.id)}
                  canRemove={games.length > 1}
                />
              ))}

              <button
                type="button"
                onClick={addGame}
                className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-lime-500 text-slate-500 hover:text-lime-400 rounded-xl text-sm font-semibold transition-colors"
              >
                + Add Another Game
              </button>

              {gamesError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{gamesError}</div>
              )}

              {gamesStatus === 'success' ? (
                <div className="text-center py-3 text-lime-400 font-semibold">✅ Games saved!</div>
              ) : (
                <button
                  onClick={saveGames}
                  disabled={gamesStatus === 'loading'}
                  className="w-full py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
                >
                  {gamesStatus === 'loading' ? 'Saving…' : `Add ${games.length} Game${games.length > 1 ? 's' : ''} to Session`}
                </button>
              )}
            </>
          )}

          {/* ── Session Details tab ────────────────────────────────────── */}
          {tab === 'details' && (
            <>
              {/* Photo */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Photo</label>
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                      <Image src={photoPreview} alt="Session" fill className="object-cover" unoptimized />
                      <button type="button" onClick={() => { setPhotoPreview(''); setPhotoUrl(''); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-xs flex items-center justify-center">×</button>
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
                  <div className="flex-1">
                    {uploading && <p className="text-xs text-lime-400">Uploading…</p>}
                    {!uploading && !photoPreview && (
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="text-xs text-slate-500 hover:text-lime-400 transition-colors">
                        Add photo
                      </button>
                    )}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Riverside Park Courts" maxLength={100}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="How was the session?" rows={3} maxLength={300}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 resize-none" />
              </div>

              {noteError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{noteError}</div>
              )}

              {noteStatus === 'success' ? (
                <div className="text-center py-3 text-lime-400 font-semibold">✅ Details saved!</div>
              ) : (
                <button
                  onClick={saveNote}
                  disabled={noteStatus === 'loading' || uploading}
                  className="w-full py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
                >
                  {noteStatus === 'loading' ? 'Saving…' : 'Save Details'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
