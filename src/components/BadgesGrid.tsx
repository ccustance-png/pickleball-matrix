import type { BadgeDef } from '@/lib/badges';
import { ALL_BADGES, TIER_STYLES } from '@/lib/badges';

type Props = {
  earned: BadgeDef[];
  showAll?: boolean; // show unearned badges dimmed
};

export default function BadgesGrid({ earned, showAll = true }: Props) {
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
    <div className="space-y-5">
      {/* Earned */}
      {sortedEarned.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Earned · {earned.length}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {sortedEarned.map(badge => {
              const s = TIER_STYLES[badge.tier];
              return (
                <div
                  key={badge.id}
                  title={badge.desc}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border ${s.border} ${s.bg} text-center`}
                >
                  <span className="text-3xl">{badge.emoji}</span>
                  <span className={`text-xs font-bold leading-tight ${s.text}`}>{badge.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.bg} ${s.text} border ${s.border}`}>
                      {TIER_STYLES[badge.tier].label}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      🥒×{badge.pickles ?? 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unearned */}
      {unearned.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
            Locked · {unearned.length}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {unearned.map(badge => (
              <div
                key={badge.id}
                title={badge.desc}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-center opacity-40 grayscale"
              >
                <span className="text-3xl">{badge.emoji}</span>
                <span className="text-xs font-bold text-slate-500 leading-tight">{badge.name}</span>
                <span className="text-xs text-slate-600">{badge.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
