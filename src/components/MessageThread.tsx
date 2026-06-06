'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { DirectMessage, PlayerProfile } from '@/lib/sheets';

type Props = {
  myPlayer: string;
  otherPlayer: string;
  otherDisplayName: string;
  otherPhotoUrl: string;
  initialMessages: DirectMessage[];
  profilesMap: Record<string, PlayerProfile>;
};

function timeAgo(ts: string) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MessageThread({
  myPlayer, otherPlayer, otherDisplayName, otherPhotoUrl, initialMessages, profilesMap,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Mark incoming messages as read on mount
  useEffect(() => {
    fetch(`/api/messages/${encodeURIComponent(otherPlayer)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read' }),
    }).catch(() => {});
  }, [otherPlayer]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');

    // Optimistic update
    const optimistic: DirectMessage = {
      messageId: `pending-${Date.now()}`,
      fromPlayer: myPlayer,
      toPlayer: otherPlayer,
      text: trimmed,
      timestamp: new Date().toISOString(),
      read: 'false',
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(otherPlayer)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        // Replace optimistic with confirmed (just update messageId)
        const data = await res.json();
        setMessages(prev => prev.map(m =>
          m.messageId === optimistic.messageId ? { ...m, messageId: data.messageId ?? m.messageId } : m,
        ));
      }
    } catch {
      // revert on error
      setMessages(prev => prev.filter(m => m.messageId !== optimistic.messageId));
      setText(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const myProfile = profilesMap[myPlayer.toUpperCase()];

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-4.5rem)] sm:h-[calc(100dvh-3.5rem)] max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-14 z-10">
        <Link href="/messages" className="text-slate-400 hover:text-slate-200 transition-colors p-1 -ml-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        {otherPhotoUrl ? (
          <Image src={otherPhotoUrl} alt={otherDisplayName} width={36} height={36}
            className="rounded-full object-cover" unoptimized />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
            {otherDisplayName[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link
            href={`/players/${encodeURIComponent(otherPlayer)}`}
            className="font-semibold text-slate-100 hover:text-lime-400 transition-colors text-sm leading-tight truncate block"
          >
            {otherDisplayName}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-3xl mb-2">👋</p>
            <p className="text-sm">Say hi to {otherDisplayName}!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.fromPlayer.toUpperCase() === myPlayer.toUpperCase();
          const prevMsg = messages[i - 1];
          const showTime = !prevMsg || new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 5 * 60 * 1000;

          return (
            <div key={msg.messageId}>
              {showTime && (
                <p className="text-center text-xs text-slate-600 py-2">{timeAgo(msg.timestamp)}</p>
              )}
              <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  otherPhotoUrl ? (
                    <Image src={otherPhotoUrl} alt={otherDisplayName} width={24} height={24}
                      className="rounded-full object-cover mb-1 shrink-0" unoptimized />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold mb-1 shrink-0">
                      {otherDisplayName[0]?.toUpperCase()}
                    </div>
                  )
                )}
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    isMine
                      ? 'bg-lime-500 text-slate-900 rounded-br-sm'
                      : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                  } ${msg.messageId.startsWith('pending-') ? 'opacity-60' : ''}`}
                >
                  {msg.text}
                </div>
                {isMine && (
                  myProfile?.photoUrl ? (
                    <Image src={myProfile.photoUrl} alt={myPlayer} width={24} height={24}
                      className="rounded-full object-cover mb-1 shrink-0" unoptimized />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 text-xs font-bold mb-1 shrink-0">
                      {myPlayer[0]?.toUpperCase()}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 resize-none max-h-32 leading-relaxed"
            style={{ height: 'auto' }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full bg-lime-500 hover:bg-lime-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <svg className="w-4 h-4 text-slate-900 -rotate-45 translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
