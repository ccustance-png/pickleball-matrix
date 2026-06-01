'use client';

import { useState } from 'react';
import type { PickleEvent } from '@/lib/badges';

function formatDate(raw: string): string {
  if (raw.includes('/')) {
    const [m, d, y] = raw.split('/').map(Number);
    const dt = new Date(2000 + (y || 0), (m || 1) - 1, d || 1);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  }
  const dt = new Date(raw);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function PickleHistoryModal({
  total,
  log,
  onClose,
}: {
  total: number;
  log: PickleEvent[];
  onClose: () => void;
}) {
  // Show newest first
  const reversed = [...log].reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥒</span>
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Pickle History</p>
              <p className="text-xl font-black text-lime-400 tabular-nums leading-none">{total} pickles earned</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {reversed.length === 0 ? (
            <div className="text-center py-10 text-slate-600">
              <p className="text-3xl mb-2">🥒</p>
              <p className="text-sm">No pickles earned yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/60">
              {reversed.map((ev, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/40 transition-colors">
                  <span className="text-xl shrink-0 w-7 text-center">{ev.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium leading-tight">{ev.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(ev.date)}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 bg-lime-500/10 border border-lime-500/20 rounded-full px-2 py-0.5">
                    <span className="text-xs font-black text-lime-400">+{ev.pickles}</span>
                    <span className="text-xs">🥒</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PickleJarButton({
  total,
  log,
}: {
  total: number;
  log: PickleEvent[];
}) {
  const [open, setOpen] = useState(false);

  if (total === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1 bg-lime-500/10 border border-lime-500/20 rounded-full hover:bg-lime-500/20 hover:border-lime-500/40 active:scale-95 transition-all cursor-pointer"
      >
        <span className="text-base">🥒</span>
        <span className="text-sm font-black text-lime-400">{total}</span>
        <span className="text-xs text-slate-500 font-medium">pickles</span>
      </button>

      {open && (
        <PickleHistoryModal total={total} log={log} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
