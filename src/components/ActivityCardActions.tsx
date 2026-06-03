'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type DinkEntry = {
  matchId: number;
  userEmail: string;
  userName: string;
};

type Props = {
  matchId: number;
  shareText: string;
};

export default function ActivityCardActions({ matchId, shareText }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  const [dinks, setDinks] = useState<DinkEntry[]>([]);
  const [dinked, setDinked] = useState(false);
  const [dinkLoading, setDinkLoading] = useState(false);
  const [bounce, setBounce] = useState(false);

  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/match/${matchId}/dinks`)
      .then((r) => r.json())
      .then((data: DinkEntry[]) => {
        if (!Array.isArray(data)) return;
        setDinks(data);
        if (session?.user?.email) {
          setDinked(data.some((d) => d.userEmail === session.user!.email));
        }
      })
      .catch(() => {});
  }, [matchId, session]);

  async function handleDink() {
    if (!session) {
      signIn('google');
      return;
    }
    // Optimistic update
    const wasDinked = dinked;
    setDinked(!wasDinked);
    setDinks((prev) =>
      wasDinked
        ? prev.filter((d) => d.userEmail !== session.user!.email)
        : [...prev, { matchId, userEmail: session.user!.email!, userName: session.user!.name ?? '' }]
    );
    setBounce(true);
    setTimeout(() => setBounce(false), 300);

    setDinkLoading(true);
    try {
      await fetch(`/api/match/${matchId}/dinks`, { method: 'POST' });
    } catch {
      // Revert on error
      setDinked(wasDinked);
      setDinks((prev) =>
        wasDinked
          ? [...prev, { matchId, userEmail: session.user!.email!, userName: session.user!.name ?? '' }]
          : prev.filter((d) => d.userEmail !== session.user!.email)
      );
    } finally {
      setDinkLoading(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/activities`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Pickleball ELO', text: shareText, url });
      } catch { /* user canceled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await fetch(`/api/match/${matchId}`, { method: 'DELETE' });
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const dinkNames = dinks
    .slice(0, 3)
    .map((d) => d.userName || d.userEmail.split('@')[0])
    .join(', ');
  const extraDinks = dinks.length > 3 ? ` +${dinks.length - 3} more` : '';

  return (
    <div className="px-4 pt-2 pb-3 border-t border-slate-800/60 space-y-2">

      {/* Dink row */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleDink}
          disabled={dinkLoading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150 ${
            dinked
              ? 'bg-lime-500/15 text-lime-400 border-lime-500/40 shadow-sm shadow-lime-500/10'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-lime-500/30 hover:text-lime-400'
          } ${bounce ? 'scale-110' : 'scale-100'}`}
        >
          {/* Pickleball paddle SVG */}
          <svg
            className={`w-4 h-4 transition-transform ${bounce ? 'rotate-12' : ''}`}
            viewBox="0 0 24 24"
            fill={dinked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="9.5" cy="9" rx="6.5" ry="7" />
            <line x1="14" y1="14.5" x2="20.5" y2="21" strokeWidth={2.5} />
            <circle cx="9.5" cy="9" r="2" fill={dinked ? 'rgba(0,0,0,0.25)' : 'none'} strokeWidth={1.2} />
          </svg>
          Dink{dinks.length > 0 && ` · ${dinks.length}`}
        </button>

        {/* Who dinked */}
        {dinks.length > 0 && (
          <span className="text-xs text-slate-500 truncate">
            {dinkNames}{extraDinks}
          </span>
        )}
      </div>

      {/* Share + Delete row */}
      <div className="flex items-center">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-800"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {copied ? 'Copied!' : 'Share'}
        </button>

        {session && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-1.5 text-xs transition-colors px-2.5 py-1.5 rounded-lg ml-auto ${
              confirmDelete
                ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                : 'text-slate-600 hover:text-red-400 hover:bg-slate-800'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}
