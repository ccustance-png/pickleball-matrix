'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { PlayerProfile } from '@/lib/sheets';

type Friend = {
  playerName: string;
  profile: PlayerProfile | null;
};

function displayName(f: Friend) {
  return f.profile?.firstName && f.profile?.lastName
    ? `${f.profile.firstName} ${f.profile.lastName}`
    : f.playerName;
}

export default function NewMessageButton({ friends }: { friends: Friend[] }) {
  const [open, setOpen] = useState(false);
  const [toQuery, setToQuery] = useState('');
  const [selected, setSelected] = useState<Friend | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const toInputRef = useRef<HTMLInputElement>(null);
  const msgInputRef = useRef<HTMLTextAreaElement>(null);

  const filtered = friends.filter(f =>
    displayName(f).toLowerCase().includes(toQuery.toLowerCase())
  );

  function selectFriend(f: Friend) {
    setSelected(f);
    setToQuery('');
    setShowDropdown(false);
    setTimeout(() => msgInputRef.current?.focus(), 50);
  }

  function clearSelected() {
    setSelected(null);
    setTimeout(() => toInputRef.current?.focus(), 50);
  }

  function close() {
    setOpen(false);
    setSelected(null);
    setToQuery('');
    setShowDropdown(false);
    setMessageText('');
  }

  function send() {
    if (!selected || !messageText.trim() || sending) return;
    const text = messageText.trim();
    close();
    router.push(`/messages/${encodeURIComponent(selected.playerName)}?draft=${encodeURIComponent(text)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTimeout(() => toInputRef.current?.focus(), 50); }}
        className="w-9 h-9 rounded-full bg-lime-500 hover:bg-lime-400 flex items-center justify-center transition-colors shrink-0"
        aria-label="New message"
      >
        <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800">
              <h2 className="font-semibold text-slate-100 text-base">New Message</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-200 transition-colors p-1 -mr-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* To: field */}
            <div className="px-4 py-3 border-b border-slate-800 relative">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">To</span>
                {selected ? (
                  <div className="flex items-center gap-1.5 bg-lime-500/20 border border-lime-500/40 rounded-full pl-1.5 pr-2 py-0.5">
                    {selected.profile?.photoUrl ? (
                      <Image src={selected.profile.photoUrl} alt="" width={20} height={20}
                        className="rounded-full object-cover shrink-0" unoptimized />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 text-[10px] font-bold shrink-0">
                        {displayName(selected)[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-lime-300">{displayName(selected)}</span>
                    <button onClick={clearSelected} className="text-lime-400/70 hover:text-lime-300 ml-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <input
                    ref={toInputRef}
                    type="text"
                    placeholder="Search friends…"
                    value={toQuery}
                    onChange={e => { setToQuery(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && !selected && (
                <div className="absolute left-4 right-4 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                  {friends.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4 px-3">No friends yet.</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4 px-3">No matches.</p>
                  ) : (
                    filtered.map(f => (
                      <button
                        key={f.playerName}
                        onMouseDown={e => { e.preventDefault(); selectFriend(f); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left"
                      >
                        {f.profile?.photoUrl ? (
                          <Image src={f.profile.photoUrl} alt="" width={32} height={32}
                            className="rounded-full object-cover shrink-0" unoptimized />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
                            {displayName(f)[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-200">{displayName(f)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Message input + send */}
            <div className="px-4 py-3 flex items-end gap-3">
              <textarea
                ref={msgInputRef}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message…"
                rows={3}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 resize-none leading-relaxed"
              />
              <button
                onClick={send}
                disabled={!selected || !messageText.trim() || sending}
                className="w-10 h-10 rounded-full bg-lime-500 hover:bg-lime-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0 mb-0.5"
              >
                <svg className="w-4 h-4 text-slate-900 -rotate-45 translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
