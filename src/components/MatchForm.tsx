'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PlayerCombobox from './PlayerCombobox';

type Bracket = 'COMPETITIVE' | 'CASUAL';
type MatchType = 'SINGLES' | 'DOUBLES';

const today = () => new Date().toISOString().split('T')[0];

function formatSheetDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}/${y.slice(2)}`;
}

export default function MatchForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [bracket, setBracket] = useState<Bracket>('COMPETITIVE');
  const [type, setType] = useState<MatchType>('SINGLES');
  const [date, setDate] = useState(today());
  const [t1p1, setT1p1] = useState('');
  const [t1p2, setT1p2] = useState('');
  const [t2p1, setT2p1] = useState('');
  const [t2p2, setT2p2] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');

  // Activity extras
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
      .then((data: { name: string }[]) => setPlayers(data.map((p) => p.name)))
      .catch(() => {});
  }, []);

  const team1Label = type === 'SINGLES' ? t1p1 || 'Team 1' : [t1p1, t1p2].filter(Boolean).join('/') || 'Team 1';
  const team2Label = type === 'SINGLES' ? t2p1 || 'Team 2' : [t2p1, t2p2].filter(Boolean).join('/') || 'Team 2';

  const s1 = Number(score1);
  const s2 = Number(score2);
  const winnerLabel = score1 && score2 && s1 !== s2
    ? (s1 > s2 ? team1Label : team2Label)
    : null;

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

    const team1Players = type === 'SINGLES' ? [t1p1] : [t1p1, t1p2];
    const team2Players = type === 'SINGLES' ? [t2p1] : [t2p1, t2p2];

    if (team1Players.some((p) => !p.trim()) || team2Players.some((p) => !p.trim())) {
      setError('All player names are required.');
      return;
    }
    if (!score1 || !score2) {
      setError('Both scores are required.');
      return;
    }
    if (s1 === s2) {
      setError('Scores cannot be tied.');
      return;
    }
    if (uploading) {
      setError('Please wait for photo to finish uploading.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatSheetDate(date),
          bracket,
          type,
          team1Players,
          team2Players,
          team1Score: s1,
          team2Score: s2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit');

      // Save activity extras if any were provided
      if (photoUrl || location.trim() || description.trim()) {
        await fetch(`/api/match/${data.matchId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl, location: location.trim(), description: description.trim() }),
        });
      }

      setStatus('success');
      setTimeout(() => router.push('/'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-xl font-semibold text-lime-400">Match logged!</p>
        <p className="text-slate-400 text-sm">Redirecting to home…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
        />
      </div>

      {/* Bracket */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Bracket</label>
        <div className="flex gap-2">
          {(['COMPETITIVE', 'CASUAL'] as Bracket[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBracket(b)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                bracket === b
                  ? 'bg-lime-500 border-lime-500 text-slate-900'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Match Type</label>
        <div className="flex gap-2">
          {(['SINGLES', 'DOUBLES'] as MatchType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                type === t
                  ? 'bg-lime-500 border-lime-500 text-slate-900'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Players + Scores */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
        {/* Team 1 */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {type === 'DOUBLES' ? 'Team 1' : 'Player 1'}
          </label>
          <PlayerCombobox value={t1p1} onChange={setT1p1} suggestions={players} placeholder="Name…" />
          {type === 'DOUBLES' && (
            <PlayerCombobox value={t1p2} onChange={setT1p2} suggestions={players} placeholder="Partner…" />
          )}
          <input
            type="number"
            min={0}
            max={99}
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            placeholder="Score"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
          />
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center pt-8">
          <span className="text-slate-600 font-bold text-sm">VS</span>
        </div>

        {/* Team 2 */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {type === 'DOUBLES' ? 'Team 2' : 'Player 2'}
          </label>
          <PlayerCombobox value={t2p1} onChange={setT2p1} suggestions={players} placeholder="Name…" />
          {type === 'DOUBLES' && (
            <PlayerCombobox value={t2p2} onChange={setT2p2} suggestions={players} placeholder="Partner…" />
          )}
          <input
            type="number"
            min={0}
            max={99}
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            placeholder="Score"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
          />
        </div>
      </div>

      {/* Winner preview */}
      {winnerLabel && (
        <div className="rounded-lg bg-lime-500/10 border border-lime-500/30 px-4 py-3 text-sm text-lime-300">
          Winner: <span className="font-bold">{winnerLabel}</span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-800 pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Activity Details <span className="normal-case font-normal text-slate-600">(optional)</span></p>

        {/* Photo */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Photo</label>
          <div className="flex items-center gap-3">
            {photoPreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                <Image src={photoPreview} alt="Match photo" fill className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(''); setPhotoUrl(''); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-xs flex items-center justify-center hover:bg-black"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 hover:border-lime-500 text-slate-500 hover:text-lime-400 transition-colors flex flex-col items-center justify-center gap-1 shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-xs">Add</span>
              </button>
            )}
            <div className="text-xs text-slate-500">
              {uploading ? (
                <span className="text-lime-400">Uploading…</span>
              ) : (
                <span>Add a photo from the match</span>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Location */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Riverside Park Courts"
              maxLength={100}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="How did the match go?"
            rows={3}
            maxLength={300}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30 resize-none"
          />
          <p className="text-xs text-slate-600 text-right mt-0.5">{description.length}/300</p>
        </div>
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
        {status === 'loading' ? 'Submitting…' : 'Log Match'}
      </button>
    </form>
  );
}
