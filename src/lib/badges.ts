import type { MatchRow, MatchNote } from './sheets';

// ── ELO replay helpers (must mirror Apps Script exactly) ─────────────────────
const K = 32;
function dynK(e: number) { return K * (2000 / (Math.max(e, 400) + 1000)); }
function expWin(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
function movMult(margin: number, exp1: number) {
  const c = 1 - Math.abs(exp1 - 0.5) * 2;
  return 1 + margin * 0.1 * c;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legendary';

export type BadgeDef = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  tier: BadgeTier;
};

export const ALL_BADGES: BadgeDef[] = [
  // — Getting started —
  { id: 'first_match',  emoji: '🎾', name: 'Game On',        desc: 'Played your first competitive match',       tier: 'bronze'    },
  { id: 'first_win',   emoji: '🏆', name: 'First Blood',     desc: 'Won your first match',                      tier: 'bronze'    },
  { id: 'all_rounder', emoji: '🔄', name: 'All-Rounder',     desc: 'Won in both singles and doubles',           tier: 'bronze'    },
  { id: 'content',     emoji: '📸', name: 'Content Creator', desc: 'Logged a match with a photo',               tier: 'bronze'    },

  // — Volume —
  { id: 'matches_10',  emoji: '📋', name: 'Regular',         desc: 'Played 10 competitive matches',             tier: 'bronze'    },
  { id: 'matches_25',  emoji: '💪', name: 'Grinder',         desc: 'Played 25 competitive matches',             tier: 'silver'    },
  { id: 'matches_50',  emoji: '🏃', name: 'Veteran',         desc: 'Played 50 competitive matches',             tier: 'gold'      },
  { id: 'matches_100', emoji: '🔱', name: 'Legend',          desc: 'Played 100 competitive matches',            tier: 'legendary' },
  { id: 'doubles_20',  emoji: '🤝', name: 'Team Player',     desc: 'Played 20 doubles matches',                 tier: 'silver'    },

  // — Streaks —
  { id: 'streak_3',   emoji: '🔥', name: 'Hot Streak',      desc: 'Won 3 matches in a row',                    tier: 'bronze'    },
  { id: 'streak_5',   emoji: '⚡', name: 'On Fire',          desc: 'Won 5 matches in a row',                    tier: 'silver'    },
  { id: 'streak_10',  emoji: '💫', name: 'Unstoppable',      desc: 'Won 10 matches in a row',                   tier: 'gold'      },

  // — ELO milestones —
  { id: 'elo_1100',   emoji: '📈', name: 'Rising Star',      desc: 'Reached 1100 ELO',                          tier: 'bronze'    },
  { id: 'elo_1200',   emoji: '⭐', name: 'Competitor',       desc: 'Reached 1200 ELO',                          tier: 'silver'    },
  { id: 'elo_1300',   emoji: '🌟', name: 'Elite',            desc: 'Reached 1300 ELO',                          tier: 'gold'      },
  { id: 'elo_1400',   emoji: '👑', name: 'GOAT',             desc: 'Reached 1400 ELO',                          tier: 'legendary' },

  // — Performance —
  { id: 'bagel',      emoji: '🥒', name: "Pickled 'Em",      desc: 'Won a match 11–0',                          tier: 'gold'      },
  { id: 'blowout',    emoji: '💥', name: 'Dominant',         desc: 'Won a match by 8+ points',                  tier: 'bronze'    },
  { id: 'clutch',     emoji: '😤', name: 'Clutch',           desc: 'Won a match decided by exactly 1 point',    tier: 'silver'    },
  { id: 'upset',      emoji: '🎯', name: 'Upset Artist',     desc: 'Beat someone with 200+ higher ELO',         tier: 'gold'      },
];

export const TIER_STYLES: Record<BadgeTier, { border: string; bg: string; text: string; label: string }> = {
  bronze:    { border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400',  label: 'Bronze'    },
  silver:    { border: 'border-slate-400/30',  bg: 'bg-slate-500/10',  text: 'text-slate-300',   label: 'Silver'    },
  gold:      { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-400',  label: 'Gold'      },
  legendary: { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400',  label: 'Legendary' },
};

export function computePlayerBadges(
  allMatches: MatchRow[],
  playerName: string,
  matchNotes?: Record<number, MatchNote>
): BadgeDef[] {
  const T = playerName.toUpperCase().trim();
  const earned = new Set<string>();

  // All competitive matches for this player (chronological — allMatches is already in order)
  const myMatches = allMatches.filter(m =>
    m.bracket.toUpperCase() !== 'CASUAL' &&
    m.players.toUpperCase().split('/').map(p => p.trim()).includes(T)
  );

  if (myMatches.length === 0) return [];

  // ── Participation ───────────────────────────────────────────────────────────
  earned.add('first_match');
  if (myMatches.length >= 10)  earned.add('matches_10');
  if (myMatches.length >= 25)  earned.add('matches_25');
  if (myMatches.length >= 50)  earned.add('matches_50');
  if (myMatches.length >= 100) earned.add('matches_100');

  // ── Per-match stats ─────────────────────────────────────────────────────────
  let singlesWins = 0, doublesWins = 0, doublesPlayed = 0;
  let maxStreak = 0, streak = 0;

  for (const m of myMatches) {
    const winPlayers = m.win.toUpperCase().split('/').map(p => p.trim());
    const won = winPlayers.includes(T);
    const inT1 = m.team1.toUpperCase().split('/').map(p => p.trim()).includes(T);
    const myScore  = inT1 ? m.team1Score : m.team2Score;
    const oppScore = inT1 ? m.team2Score : m.team1Score;
    const margin = Math.abs(myScore - oppScore);

    if (m.type === 'DOUBLES') doublesPlayed++;

    if (won) {
      if (m.type === 'SINGLES') singlesWins++;
      if (m.type === 'DOUBLES') doublesWins++;
      streak++;
      maxStreak = Math.max(maxStreak, streak);

      if (oppScore === 0 && myScore === 11) earned.add('bagel');
      if (margin >= 8)                      earned.add('blowout');
      if (margin === 1)                     earned.add('clutch');
    } else {
      streak = 0;
    }
  }

  const hasWon = singlesWins + doublesWins > 0;
  if (hasWon)             earned.add('first_win');
  if (maxStreak >= 3)     earned.add('streak_3');
  if (maxStreak >= 5)     earned.add('streak_5');
  if (maxStreak >= 10)    earned.add('streak_10');
  if (doublesPlayed >= 20) earned.add('doubles_20');
  if (singlesWins > 0 && doublesWins > 0) earned.add('all_rounder');

  // ── Content creator (needs match notes) ────────────────────────────────────
  if (matchNotes) {
    const hasPhoto = myMatches.some(m => matchNotes[m.matchId]?.photoUrl);
    if (hasPhoto) earned.add('content');
  }

  // ── Full ELO replay — peak ELO tracking + upset detection ──────────────────
  const singlesElo: Record<string, number> = {};
  const doublesElo: Record<string, number> = {};
  let peakElo = 1000;

  for (const m of allMatches) {
    if (m.bracket.toUpperCase() === 'CASUAL') continue;
    const t1 = m.team1.trim().toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    const t2 = m.team2.trim().toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    if (!t1.length || !t2.length) continue;

    const eloMap = m.type === 'SINGLES' ? singlesElo : doublesElo;
    [...t1, ...t2].forEach(p => { if (!eloMap[p]) eloMap[p] = 1000; });

    const avg1 = t1.reduce((s, p) => s + eloMap[p], 0) / t1.length;
    const avg2 = t2.reduce((s, p) => s + eloMap[p], 0) / t2.length;
    const e1 = expWin(avg1, avg2);
    const team1Won = m.win.trim().toUpperCase() === m.team1.trim().toUpperCase();
    const mov = movMult(Math.abs(m.team1Score - m.team2Score), e1);
    const o1 = mov * ((team1Won ? 1 : 0) - e1);
    const o2 = mov * ((team1Won ? 0 : 1) - (1 - e1));

    // Upset check BEFORE applying changes (use ELO at time of match)
    const inT1 = t1.includes(T), inT2 = t2.includes(T);
    if (inT1 || inT2) {
      const won = inT1 ? team1Won : !team1Won;
      if (won) {
        const myAvg  = inT1 ? avg1 : avg2;
        const oppAvg = inT1 ? avg2 : avg1;
        if (oppAvg - myAvg >= 200) earned.add('upset');
      }
    }

    const applyTeam = (team: string[], outcome: number) => {
      if (team.length < 2) {
        team.forEach(p => { eloMap[p] = (eloMap[p] || 1000) + dynK(eloMap[p] || 1000) * outcome; });
        return;
      }
      const es = team.map(p => eloMap[p] || 1000);
      const hi = Math.max(...es), lo = Math.min(...es);
      const prop = lo > 0 ? hi / lo : 1;
      team.forEach(p => {
        const pe = eloMap[p] || 1000;
        const ch = dynK(pe) * outcome;
        eloMap[p] = pe + (pe >= hi ? ch : ch > 0 ? ch * prop : ch / prop);
      });
    };
    applyTeam(t1, o1);
    applyTeam(t2, o2);

    // Track peak ELO for this player across both modes
    if (singlesElo[T]) peakElo = Math.max(peakElo, singlesElo[T]);
    if (doublesElo[T]) peakElo = Math.max(peakElo, doublesElo[T]);
  }

  if (peakElo >= 1100) earned.add('elo_1100');
  if (peakElo >= 1200) earned.add('elo_1200');
  if (peakElo >= 1300) earned.add('elo_1300');
  if (peakElo >= 1400) earned.add('elo_1400');

  return ALL_BADGES.filter(b => earned.has(b.id));
}
