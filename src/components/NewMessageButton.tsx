'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { PlayerProfile } from '@/lib/sheets';

type Friend = {
  playerName: string;
  profile: PlayerProfile | null;
};

export default function NewMessageButton({ friends }: { friends: Friend[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const filtered = friends.filter(f => {
    const dn = f.profile?.firstName && f.profile?.lastName
      ? `${f.profile.firstName} ${f.profile.lastName}`
      : f.playerName;
    return dn.toLowerCase().includes(query.toLowerCase());
  });

  function go(playerName: string) {
    setOpen(false);
    setQuery('');
    router.push(`/messages/${encodeURIComponent(playerName)}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-full bg-lime-500 hover:bg-lime-400 flex items-center justify-center transition-colors shrink-0"
        aria-label="New message"
      >
        <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-safe"
          onClick={() => { setOpen(false); setQuery(''); }}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800">
              <h2 className="font-semibold text-slate-100">New Message</h2>
              <button
                onClick={() => { setOpen(false); setQuery(''); }}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 -mr-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-800">
              <input
                autoFocus
                type="text"
                placeholder="Search friends…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>

            {/* Friends list */}
            <div className="max-h-72 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">No friends yet. Add friends from their profiles.</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">No matches.</p>
              ) : (
                filtered.map(({ playerName, profile }) => {
                  const dn = profile?.firstName && profile?.lastName
                    ? `${profile.firstName} ${profile.lastName}`
                    : playerName;
                  return (
                    <button
                      key={playerName}
                      onClick={() => go(playerName)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 transition-colors text-left"
                    >
                      {profile?.photoUrl ? (
                        <Image src={profile.photoUrl} alt={dn} width={36} height={36}
                          className="rounded-full object-cover shrink-0" unoptimized />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
                          {dn[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-200">{dn}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
