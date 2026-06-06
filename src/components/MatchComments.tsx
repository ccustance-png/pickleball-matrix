'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import type { MatchComment } from '@/lib/db';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ name }: { name: string }) {
  const letter = name?.[0]?.toUpperCase() ?? '?';
  const colors = [
    'bg-lime-500/20 text-lime-400',
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-orange-500/20 text-orange-400',
    'bg-pink-500/20 text-pink-400',
  ];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
      {letter}
    </div>
  );
}

export default function MatchComments({ matchId }: { matchId: number }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function fetchComments() {
    try {
      const res = await fetch(`/api/match/${matchId}/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComments();
  }, [matchId]);

  async function handlePost() {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/match/${matchId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      setText('');
      await fetchComments();
      setExpanded(true);
    } catch {
      // silently fail
    } finally {
      setPosting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  }

  const visibleComments = expanded ? comments : comments.slice(-2);
  const hiddenCount = comments.length - visibleComments.length;

  return (
    <div className="border-t border-slate-800 px-4 py-3 space-y-3">
      {/* Comment count toggle */}
      {!loading && comments.length > 0 && (
        <div className="space-y-2">
          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              View {hiddenCount} more comment{hiddenCount !== 1 ? 's' : ''}
            </button>
          )}
          {visibleComments.map((c) => (
            <div key={c.commentId} className="flex items-start gap-2">
              <Avatar name={c.authorName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-200">{c.authorName}</span>
                  <span className="text-xs text-slate-600">{timeAgo(c.timestamp)}</span>
                </div>
                <p className="text-sm text-slate-300 mt-0.5 leading-snug">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-xs text-slate-600">Loading comments…</p>
      )}

      {/* Input */}
      {session ? (
        <div className="flex items-start gap-2">
          <Avatar name={session.user?.name ?? session.user?.email ?? '?'} />
          <div className="flex-1 flex gap-2">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment…"
              rows={1}
              maxLength={300}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30 resize-none"
            />
            <button
              onClick={handlePost}
              disabled={!text.trim() || posting}
              className="px-3 py-2 bg-lime-500 hover:bg-lime-400 disabled:opacity-40 text-slate-900 text-xs font-bold rounded-lg transition-colors shrink-0"
            >
              {posting ? '…' : 'Post'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => signIn('google')}
          className="text-xs text-slate-500 hover:text-lime-400 transition-colors"
        >
          Sign in to comment
        </button>
      )}
    </div>
  );
}
