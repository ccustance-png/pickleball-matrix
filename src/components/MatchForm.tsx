'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
      >
        {status === 'loading' ? 'Submitting…' : 'Log Match'}
      </button>
    </form>
  );
}
