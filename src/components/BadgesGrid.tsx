'use client';

import { useState } from 'react';
import type { BadgeDef } from '@/lib/badges';
import { ALL_BADGES, TIER_STYLES } from '@/lib/badges';

// ── Badge detail modal ─────────────────────────────────────────────────────────
function BadgeModal({
  badge,
  isEarned,
  onClose,
}: {
  badge: BadgeDef;
  isEarned: boolean;
  onClose: () => void;
}) {
  const s = TIER_STYLES[badge.tier];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors"
        >
          ×
        </button>

        {/* Emoji + status */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-3 border ${s.border} ${s.bg} ${!isEarned ? 'grayscale opacity-50' : ''}`}>
            {badge.emoji}
          </div>

          {isEarned ? (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.border} ${s.bg} ${s.text} mb-2`}>
              ✓ Earned · {s.label}
            </span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-500 mb-2">
              🔒 Locked · {s.label}
            </span>
          )}

          <h2 className={`text-xl font-black ${isEarned ? s.text : 'text-slate-400'}`}>
            {badge.name}
          </h2>
        </div>

        {/* Description */}
        <div className="bg-slate-800/60 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-slate-300 leading-relaxed text-center">{badge.desc}</p>
        </div>

        {/* Pickle value */}
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-lime-500/10 border border-lime-500/20 rounded-xl">
          <span className="text-xl">🥒</span>
          <span className="text-sm font-bold text-lime-400">
            {badge.pickleMode === 'event'
              ? `+${badge.pickles ?? 1} pickle${(badge.pickles ?? 1) > 1 ? 's' : ''} every time`
              : `+${badge.pickles ?? 1} pickle${(badge.pickles ?? 1) > 1 ? 's' : ''} once`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Badge card ─────────────────────────────────────────────────────────────────
function BadgeCard({
  badge,
  isEarned,
  onClick,
}: {
  badge: BadgeDef;
  isEarned: boolean;
  onClick: () => void;
}) {
  const s = TIER_STYLES[badge.tier];

  if (!isEarned) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-center opacity-40 grayscale hover:opacity-60 hover:grayscale-0 transition-all cursor-pointer"
      >
        <span className="text-3xl">{badge.emoji}</span>
        <span className="text-xs font-bold text-slate-500 leading-tight">{badge.name}</span>
        <span className="text-[10px] text-slate-600">tap to view</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border ${s.border} ${s.bg} text-center hover:brightness-110 active:scale-95 transition-all cursor-pointer`}
    >
      <span className="text-3xl">{badge.emoji}</span>
      <span className={`text-xs font-bold leading-tight ${s.text}`}>{badge.name}</span>
      <div className="flex items-center gap-1 mt-0.5 flex-wrap justify-center">
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.bg} ${s.text} border ${s.border}`}>
          {s.label}
        </span>
        <span className="text-xs text-slate-500 font-semibold">
          🥒×{badge.pickles ?? 1}
        </span>
      </div>
    </button>
  );
}

// ── Main grid ──────────────────────────────────────────────────────────────────
type Props = {
  earned: BadgeDef[];
  showAll?: boolean;
};

export default function BadgesGrid({ earned, showAll = true }: Props) {
  const [selected, setSelected] = useState<{ badge: BadgeDef; isEarned: boolean } | null>(null);

  const earnedIds = new Set(earned.map(b => b.id));
  const tierOrder: BadgeDef['tier'][] = ['legendary', 'gold', 'silver', 'bronze'];
  const sortedEarned = [...earned].sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  if (earned.length === 0 && !showAll) {
    return (
      <div className="text-center py-10 text-slate-600">
        <p className="text-3xl mb-2">🎖️</p>
        <p className="text-sm">No badges earned yet — start playing!</p>
      </div>
    );
  }

  const unearned = showAll ? ALL_BADGES.filter(b => !earnedIds.has(b.id)) : [];

  return (
    <>
      <div className="space-y-5">
        {/* Earned */}
        {sortedEarned.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Earned · {earned.length}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {sortedEarned.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned
                  onClick={() => setSelected({ badge, isEarned: true })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Locked */}
        {unearned.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
              Locked · {unearned.length}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {unearned.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={false}
                  onClick={() => setSelected({ badge, isEarned: false })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <BadgeModal
          badge={selected.badge}
          isEarned={selected.isEarned}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
