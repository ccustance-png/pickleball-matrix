'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';

type ClubWithCount = {
  clubId: string;
  name: string;
  description: string;
  location: string;
  photoUrl: string;
  createdBy: string;
  createdAt: string;
  memberCount: number;
};

type Props = {
  initialClubs: ClubWithCount[];
};

export default function ClubsList({ initialClubs }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', location: '', photoUrl: '' });

  const filtered = initialClubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/clubs/${data.clubId}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create club');
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Clubs</h1>
          <p className="text-slate-400 text-sm mt-1">Find your crew. Play together.</p>
        </div>
        {session ? (
          <button
            onClick={() => setShowCreate(s => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-900 font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Club
          </button>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-900 font-semibold text-sm transition-colors"
          >
            Sign in to create
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-8 p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-3"
        >
          <h2 className="font-semibold text-slate-100">Create a Club</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Club Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sunset Ballers"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What's your club about?"
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Location</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Austin, TX"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cover Photo URL</label>
              <input
                value={form.photoUrl}
                onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))}
                placeholder="https://..."
                type="url"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !form.name.trim()}
              className="px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Club'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clubs…"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500"
        />
      </div>

      {/* Clubs grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🥒</p>
          <p className="font-medium">{search ? 'No clubs match your search' : 'No clubs yet — be the first!'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(club => (
            <Link
              key={club.clubId}
              href={`/clubs/${club.clubId}`}
              className="group block bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl overflow-hidden transition-all"
            >
              {/* Cover */}
              <div
                className="h-24 w-full bg-gradient-to-br from-lime-500/20 to-emerald-600/20 relative"
                style={club.photoUrl ? { backgroundImage: `url(${club.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                <div className="absolute inset-0 bg-slate-900/20" />
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-100 group-hover:text-lime-400 transition-colors leading-tight">{club.name}</h3>
                  <span className="shrink-0 text-xs text-slate-500 mt-0.5">{club.memberCount} {club.memberCount === 1 ? 'member' : 'members'}</span>
                </div>
                {club.location && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {club.location}
                  </p>
                )}
                {club.description && (
                  <p className="text-sm text-slate-400 mt-2 line-clamp-2">{club.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
