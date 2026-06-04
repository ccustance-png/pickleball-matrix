'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import GameCard, { type GameEntry, type Bracket, type MatchType, newGame } from './GameCard';
import type { MatchNote, MatchRow } from '@/lib/sheets';

type Props = {
  anchorId: number;
  sessionDate: string;   // raw sheet date string e.g. "5/28/25"
  note: MatchNote;
  matches: MatchRow[];   // all games currently in this session
  onClose: () => void;
};

type Tab = 'games' | 'details';

/** Convert a saved MatchRow back into an editable GameEntry. */
type EditableGame = GameEntry & { matchId: number };

function matchToEditable(m: MatchRow): EditableGame {
  const t1 = m.team1.split('/').map((p) => p.trim());
  const t2 = m.team2.split('/').map((p) => p.trim());
  return {
    id: String(m.matchId),
    matchId: m.matchId,
    bracket: (m.bracket.toUpperCase() === 'CASUAL' ? 'CASUAL' : 'COMPETITIVE') as Bracket,
    type: m.type.toUpperCase() as MatchType,
    t1p1: t1[0] ?? '',
    t1p2: t1[1] ?? '',
    t2p1: t2[0] ?? '',
    t2p2: t2[1] ?? '',
    score1: String(m.team1Score),
    score2: String(m.team2Score),
  };
}

export default function EditSessionModal({ anchorId, sessionDate, note, matches, onClose }: Props) {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('details');

  // ── Games state ────────────────────────────────────────────────────────────
  const [playerList, setPlayerList]     = useState<string[]>([]);
  const [existing,   setExisting]       = useState<EditableGame[]>(() => matches.map(matchToEditable));
  const [toDelete,   setToDelete]       = useState<Set<number>>(new Set());
  const [newGames,   setNewGames]       = useState<GameEntry[]>([]);
  const [gamesStatus, setGamesStatus]   = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [gamesError,  setGamesError]    = useState('');

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

  // ── Existing game helpers ──────────────────────────────────────────────────
  function updateExisting(id: string, patch: Partial<GameEntry>) {
    setExisting(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  }

  function toggleDelete(matchId: number) {
    setToDelete(prev => {
      const next = new Set(prev);
      next.has(matchId) ? next.delete(matchId) : next.add(matchId);
      return next;
    });
  }

  // ── New game helpers ───────────────────────────────────────────────────────
  function addNewGame() {
    setNewGames(prev => {
      const last = prev[prev.length - 1] ?? existing[existing.length - 1];
      return [...prev, { ...newGame(), bracket: last?.bracket ?? 'COMPETITIVE', type: last?.type ?? 'SINGLES' }];
    });
  }
  function updateNew(id: string, patch: Partial<GameEntry>) {
    setNewGames(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  }
  function removeNew(id: string) { setNewGames(prev => prev.filter(g => g.id !== id)); }

  // ── Validate all games ─────────────────────────────────────────────────────
  function validateGames(games: GameEntry[], label: string): string | null {
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      const t1 = g.type === 'SINGLES' ? [g.t1p1] : [g.t1p1, g.t1p2];
      const t2 = g.type === 'SINGLES' ? [g.t2p1] : [g.t2p1, g.t2p2];
      if (t1.some(p => !p.trim()) || t2.some(p => !p.trim()))
        return `${label} ${i + 1}: all player names are required.`;
      if (!g.score1 || !g.score2) return `${label} ${i + 1}: both scores are required.`;
      if (Number(g.score1) === Number(g.score2)) return `${label} ${i + 1}: scores can't be tied.`;
    }
    return null;
  }

  async function saveGames() {
    setGamesError('');
    const existingErr = validateGames(existing, 'Game');
    if (existingErr) { setGamesError(existingErr); return; }
    if (newGames.length > 0) {
      const newErr = validateGames(newGames, 'New game');
      if (newErr) { setGamesError(newErr); return; }
    }

    setGamesStatus('loading');
    try {
      // 1. DELETE any games marked for removal
      if (toDelete.size > 0) {
        await Promise.all(
          Array.from(toDelete).map((matchId) =>
            fetch(`/api/match/${matchId}`, { method: 'DELETE' })
              .then(r => { if (!r.ok) throw new Error(`Failed to delete game ${matchId}`); })
          )
        );
      }

      // 2. PUT all remaining existing games (updates any changed fields)
      await Promise.all(
        existing.filter(g => !toDelete.has(g.matchId)).map((g) =>
          fetch(`/api/match/${g.matchId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: sessionDate,
              bracket: g.bracket,
              type: g.type,
              team1Players: g.type === 'SINGLES' ? [g.t1p1] : [g.t1p1, g.t1p2],
              team2Players: g.type === 'SINGLES' ? [g.t2p1] : [g.t2p1, g.t2p2],
              team1Score: Number(g.score1),
              team2Score: Number(g.score2),
            }),
          }).then(r => { if (!r.ok) throw new Error(`Failed to update game ${g.matchId}`); })
        )
      );

      // 3. POST any new games linked to this session
      if (newGames.length > 0) {
        const res = await fetch(`/api/sessions/${anchorId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: sessionDate,
            games: newGames.map(g => ({
              bracket: g.bracket,
              type: g.type,
              team1Players: g.type === 'SINGLES' ? [g.t1p1] : [g.t1p1, g.t1p2],
              team2Players: g.type === 'SINGLES' ? [g.t2p1] : [g.t2p1, g.t2p2],
              team1Score: Number(g.score1),
              team2Score: Number(g.score2),
            })),
          }),
        });
        if (!res.ok) throw new Error('Failed to save new games');
      }

      setGamesStatus('success');
      setTimeout(() => { onClose(); router.refresh(); }, 1200);
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : 'Unknown error');
      setGamesStatus('error');
    }
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
          {([['games', 'Games'], ['details', 'Session Details']] as [Tab, string][]).map(([id, label]) => (
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

          {/* ── Games tab ─────────────────────────────────────────────── */}
          {tab === 'games' && (
            <>
              {/* Existing games */}
              {existing.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Existing games — edit as needed
                  </p>
                  {existing.map((game, i) => {
                    const marked = toDelete.has(game.matchId);
                    return (
                      <div key={game.id} className={`relative transition-opacity ${marked ? 'opacity-40' : ''}`}>
                        <GameCard
                          game={game}
                          index={i}
                          players={playerList}
                          onChange={patch => !marked && updateExisting(game.id, patch)}
                          onRemove={() => {}}
                          canRemove={false}
                        />
                        <button
                          type="button"
                          onClick={() => toggleDelete(game.matchId)}
                          className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                            marked
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-red-500/15 text-red-400 hover:bg-red-500/30'
                          }`}
                        >
                          {marked ? 'Undo' : 'Delete'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Divider + new games */}
              {newGames.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-slate-800" />
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">New games</span>
                    <div className="h-px flex-1 bg-slate-800" />
                  </div>
                  {newGames.map((game, i) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      index={existing.length + i}
                      players={playerList}
                      onChange={patch => updateNew(game.id, patch)}
                      onRemove={() => removeNew(game.id)}
                      canRemove={true}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addNewGame}
                className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-lime-500 text-slate-500 hover:text-lime-400 rounded-xl text-sm font-semibold transition-colors"
              >
                + Add Game to Session
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
                  {gamesStatus === 'loading' ? 'Saving…' : 'Save Games'}
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
