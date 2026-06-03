'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type PlayerItem  = { name: string };
type MatchItem   = {
  matchId: number; date: string; type: string;
  win: string; loss: string; team1Score: number; team2Score: number; players: string;
};
type NoteItem    = { matchId: number; location: string; description: string; photoUrl: string };

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery]     = useState('');
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [notes, setNotes]     = useState<NoteItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    Promise.all([
      fetch('/api/players').then(r => r.json()).catch(() => []),
      fetch('/api/matches').then(r => r.json()).catch(() => []),
      fetch(`${process.env.NEXT_PUBLIC_SCRIPT_URL || ''}`).catch(() => null),
    ]).then(([p, m]) => {
      setPlayers(Array.isArray(p) ? p : []);
      setMatches(Array.isArray(m) ? m : []);
    });

    // Fetch session notes for session search
    fetch('/api/matches')
      .then(r => r.json())
      .catch(() => []);
  }, []);

  // Separate fetch for notes via existing endpoint pattern
  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(async (allMatches: MatchItem[]) => {
        if (!Array.isArray(allMatches) || allMatches.length === 0) return;
        const ids = allMatches.map(m => m.matchId).join(',');
        const res = await fetch(`/api/search/notes?ids=${ids}`).catch(() => null);
        if (res?.ok) {
          const data = await res.json();
          setNotes(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {});
  }, []);

  const q = query.toLowerCase().trim();

  const playerResults = q
    ? players.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const matchResults = q
    ? matches
        .filter(m =>
          m.win?.toLowerCase().includes(q) ||
          m.loss?.toLowerCase().includes(q) ||
          m.players?.toLowerCase().includes(q)
        )
        .slice(0, 5)
    : [];

  const sessionResults = q
    ? notes
        .filter(n =>
          n.location?.toLowerCase().includes(q) ||
          n.description?.toLowerCase().includes(q)
        )
        .filter(n => !n.description?.match(/^__sid:\d+__$/))
        .slice(0, 3)
    : [];

  const hasResults = playerResults.length > 0 || matchResults.length > 0 || sessionResults.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search players, matches, sessions…"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-xs text-slate-600 border border-slate-700 rounded px-1.5 py-0.5 hover:text-slate-400 transition-colors">
            esc
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!q && (
            <div className="px-4 py-8 text-center text-slate-600 text-sm">
              Search players, matches, rankings, or sessions
            </div>
          )}

          {q && !hasResults && (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Players */}
          {playerResults.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Players</p>
              {playerResults.map(p => (
                <Link key={p.name} href={`/players/${encodeURIComponent(p.name)}`} onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors">
                  <span className="w-7 h-7 rounded-full bg-lime-500/20 border border-lime-500/30 flex items-center justify-center text-sm shrink-0">👤</span>
                  <span className="text-sm font-semibold text-slate-200">{p.name}</span>
                  <span className="ml-auto text-xs text-slate-600">Profile →</span>
                </Link>
              ))}
            </section>
          )}

          {/* Matches */}
          {matchResults.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Matches</p>
              {matchResults.map(m => {
                const hiScore = Math.max(m.team1Score, m.team2Score);
                const loScore = Math.min(m.team1Score, m.team2Score);
                return (
                  <Link key={m.matchId} href={`/players/${encodeURIComponent(m.win.split('/')[0].trim())}`} onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors">
                    <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-lime-400 shrink-0">
                      {m.type === 'SINGLES' ? 'S' : 'D'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">
                        <span className="text-lime-400 font-semibold">{m.win}</span>
                        <span className="text-slate-600 mx-1.5 text-xs">def.</span>
                        <span className="text-slate-400">{m.loss}</span>
                      </p>
                      <p className="text-xs text-slate-500">{m.date}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-300 shrink-0">
                      {hiScore}–{loScore}
                    </span>
                  </Link>
                );
              })}
            </section>
          )}

          {/* Sessions */}
          {sessionResults.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessions</p>
              {sessionResults.map(n => (
                <Link key={n.matchId} href="/activities" onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors">
                  <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0">📸</span>
                  <div className="flex-1 min-w-0">
                    {n.location && <p className="text-sm font-semibold text-slate-200 truncate">📍 {n.location}</p>}
                    {n.description && <p className="text-xs text-slate-500 truncate">{n.description}</p>}
                  </div>
                </Link>
              ))}
            </section>
          )}

          {/* Quick links when query matches section names */}
          {q && (
            (() => {
              const links: { label: string; href: string; icon: string }[] = [];
              if ('rankings'.includes(q) || 'power'.includes(q)) links.push({ label: 'Power Rankings', href: '/players', icon: '⚡' });
              if ('activities'.includes(q) || 'sessions'.includes(q)) links.push({ label: 'Activities', href: '/activities', icon: '📸' });
              if ('stats'.includes(q) || 'statistics'.includes(q)) links.push({ label: 'Statistics', href: '/stats', icon: '📊' });
              if ('rivalries'.includes(q)) links.push({ label: 'Rivalries', href: '/rivalries', icon: '⚔️' });
              if (links.length === 0) return null;
              return (
                <section>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pages</p>
                  {links.map(l => (
                    <Link key={l.href} href={l.href} onClick={onClose}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors">
                      <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0">{l.icon}</span>
                      <span className="text-sm font-semibold text-slate-200">{l.label}</span>
                      <span className="ml-auto text-xs text-slate-600">Go →</span>
                    </Link>
                  ))}
                </section>
              );
            })()
          )}

          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
