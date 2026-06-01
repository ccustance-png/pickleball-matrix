import type { MatchRow, MatchNote } from './sheets';

// ── ELO replay helpers (mirrors Apps Script exactly) ─────────────────────────
// K steps down as rating rises — mirrors chess FIDE tiers
function dynK(e: number): number {
  if (e < 1000) return 40;   // developing
  if (e < 1400) return 20;   // standard
  return 10;                  // elite
}
function expWin(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
// Margin-of-victory multiplier — reduced coefficient (0.05) keeps swings chess-comparable
function movMult(margin: number, exp1: number) {
  const c = 1 - Math.abs(exp1 - 0.5) * 2;
  return 1 + margin * 0.05 * c;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function parseMatchDate(d: string): Date {
  if (d.includes('/')) {
    const [m, dy, y] = d.split('/').map(Number);
    return new Date(2000 + (y || 0), (m || 1) - 1, dy || 1);
  }
  return new Date(d);
}
function monthKey(d: string): string {
  const dt = parseMatchDate(d);
  return `${dt.getFullYear()}-${dt.getMonth()}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const dt = new Date(y, m, 1);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function weekKey(d: string): string {
  const dt = parseMatchDate(d);
  const startOfYear = new Date(dt.getFullYear(), 0, 1);
  const week = Math.floor((dt.getTime() - startOfYear.getTime()) / (7 * 86400000));
  return `${dt.getFullYear()}-W${week}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legendary';

export type BadgeDef = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  tier: BadgeTier;
  pickles?: number;   // pickle value of badge (defaults to 1)
  pickleMode?: 'once' | 'event'; // 'once' = milestone, 'event' = recurring per occurrence
};

export type PickleEvent = {
  date: string;          // raw match date string for sorting
  emoji: string;
  label: string;
  pickles: number;
};

export const ALL_BADGES: BadgeDef[] = [
  // ── Getting started ──────────────────────────────────────────────────────────
  { id: 'first_match',  emoji: '🎾', name: 'Game On',        desc: 'Played your first competitive match',             tier: 'bronze',    pickleMode: 'once' },
  { id: 'first_win',   emoji: '🏆', name: 'First Blood',     desc: 'Won your first match',                            tier: 'bronze',    pickleMode: 'once' },
  { id: 'all_rounder', emoji: '🔄', name: 'All-Rounder',     desc: 'Won in both singles and doubles',                 tier: 'bronze',    pickleMode: 'once' },
  { id: 'content',     emoji: '📸', name: 'Content Creator', desc: 'Logged a match with a photo',                     tier: 'bronze',    pickleMode: 'once' },

  // ── Volume ───────────────────────────────────────────────────────────────────
  { id: 'matches_10',  emoji: '📋', name: 'Regular',         desc: 'Played 10 competitive matches',                   tier: 'bronze',    pickleMode: 'once' },
  { id: 'matches_25',  emoji: '💪', name: 'Grinder',         desc: 'Played 25 competitive matches',                   tier: 'silver',    pickleMode: 'once' },
  { id: 'matches_50',  emoji: '🏃', name: 'Veteran',         desc: 'Played 50 competitive matches',                   tier: 'gold',      pickleMode: 'once' },
  { id: 'matches_100', emoji: '🔱', name: 'Legend',          desc: 'Played 100 competitive matches',                  tier: 'legendary', pickleMode: 'once' },
  { id: 'doubles_20',  emoji: '🤝', name: 'Team Player',     desc: 'Played 20 doubles matches',                       tier: 'silver',    pickleMode: 'once' },

  // ── Streaks ──────────────────────────────────────────────────────────────────
  { id: 'streak_3',   emoji: '🔥', name: 'Hot Streak',       desc: 'Won 3 matches in a row',                          tier: 'bronze',    pickleMode: 'event' },
  { id: 'streak_5',   emoji: '⚡', name: 'On Fire',           desc: 'Won 5 matches in a row',                          tier: 'silver',    pickleMode: 'event' },
  { id: 'streak_10',  emoji: '💫', name: 'Unstoppable',       desc: 'Won 10 matches in a row',                         tier: 'gold',      pickleMode: 'event' },

  // ── ELO milestones ───────────────────────────────────────────────────────────
  { id: 'elo_1100',   emoji: '📈', name: 'Rising Star',       desc: 'Reached 1100 ELO',                                tier: 'bronze',    pickleMode: 'once' },
  { id: 'elo_1200',   emoji: '⭐', name: 'Competitor',        desc: 'Reached 1200 ELO',                                tier: 'silver',    pickleMode: 'once' },
  { id: 'elo_1300',   emoji: '🌟', name: 'Elite',             desc: 'Reached 1300 ELO',                                tier: 'gold',      pickleMode: 'once' },
  { id: 'elo_1400',   emoji: '👑', name: 'GOAT',              desc: 'Reached 1400 ELO',                                tier: 'legendary', pickleMode: 'once' },

  // ── Performance (existing) ───────────────────────────────────────────────────
  { id: 'bagel',      emoji: '🥒', name: "Pickled 'Em",       desc: 'Won a match 11–0',                                tier: 'gold',      pickleMode: 'event' },
  { id: 'blowout',    emoji: '💥', name: 'Dominant',          desc: 'Won a match by 8+ points',                        tier: 'bronze',    pickleMode: 'event' },
  { id: 'clutch',     emoji: '😤', name: 'Clutch',            desc: 'Won a match decided by exactly 1 point',          tier: 'silver',    pickleMode: 'event' },
  { id: 'upset',      emoji: '🎯', name: 'Upset Artist',      desc: 'Beat someone with 200+ higher ELO',               tier: 'gold',      pickleMode: 'event' },

  // ── Big Dill ─────────────────────────────────────────────────────────────────
  { id: 'heartbreaker',     emoji: '💔', name: 'Heartbreaker',    desc: 'Win a game that went to extra points (12-10, 13-11…)', tier: 'gold',      pickleMode: 'event' },
  { id: 'tiny_dill',        emoji: '🌱', name: 'Tiny Dill',        desc: 'Win as the lowest-rated player on the court',          tier: 'gold',      pickleMode: 'event' },
  { id: 'matchmaker',       emoji: '🤝', name: 'Matchmaker',       desc: 'Play with 5 different partners in one week',           tier: 'gold',      pickleMode: 'event' },
  { id: 'friendly_pickle',  emoji: '👋', name: 'Friendly Pickle',  desc: "Play against someone's very first competitive match",  tier: 'silver',    pickleMode: 'event' },
  { id: 'pickle_theft',     emoji: '🦹', name: 'Pickle Theft',     desc: 'Beat the same player 3 times in one day',             tier: 'gold',      pickleMode: 'event' },
  { id: 'rent_free',        emoji: '🏠', name: 'Rent Free',         desc: 'Beat the same opponent 5 consecutive times',          tier: 'gold',      pickleMode: 'event' },
  { id: 'revenge_pickle',   emoji: '⚔️',  name: 'Revenge Pickle',  desc: 'Lose to someone then beat them the same day',         tier: 'gold',      pickleMode: 'event' },
  { id: 'midnight_pickle',  emoji: '🌙', name: 'Midnight Pickle',  desc: 'Record a match after 11pm',                           tier: 'silver',    pickleMode: 'event' },
  { id: 'breakfast_pickle', emoji: '🌅', name: 'Breakfast Pickle', desc: 'Record a match before 8am',                           tier: 'silver',    pickleMode: 'event' },
  { id: 'marathon_pickle',  emoji: '🏃', name: 'Marathon',         desc: 'Play 10 matches in one day',                          tier: 'legendary', pickleMode: 'event' },

  // ── Character Building ───────────────────────────────────────────────────────
  { id: 'reverse_pickle',   emoji: '🙃', name: 'Reverse Pickle',             desc: 'Lose 11-0',                                    tier: 'bronze',    pickles: 2, pickleMode: 'event'  },
  { id: 'again',            emoji: '😭', name: 'Again?!?',                   desc: 'Lose 11-0 twice in one day',                   tier: 'silver',    pickles: 5, pickleMode: 'event'  },
  { id: 'brine_award',      emoji: '🧂', name: 'Brine Award',                desc: 'Lose 5 straight games',                        tier: 'bronze',    pickles: 2, pickleMode: 'event'  },
  { id: 'extra_salty',      emoji: '😤', name: 'Extra Salty',                desc: 'Lose 10 straight games',                       tier: 'silver',    pickles: 5, pickleMode: 'event'  },
  { id: 'pickled_beyond',   emoji: '😵', name: 'Pickled Beyond Recognition', desc: 'Lose 15 straight games',                       tier: 'legendary', pickles: 10, pickleMode: 'event' },
  { id: 'frequent_customer',emoji: '🎫', name: 'Frequent Customer',          desc: 'Lose to the same player 10 times',             tier: 'silver',    pickles: 3, pickleMode: 'once'   },
  { id: 'season_ticket',    emoji: '🎟️', name: 'Season Ticket Holder',       desc: 'Lose to the same player 20 times',             tier: 'gold',      pickles: 5, pickleMode: 'once'   },
  { id: 'property_of',      emoji: '🏷️', name: 'Property Of…',              desc: 'Get beaten by the same player 30 times',       tier: 'legendary', pickles: 10, pickleMode: 'once'  },
];

export const TIER_STYLES: Record<BadgeTier, { border: string; bg: string; text: string; label: string }> = {
  bronze:    { border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400',  label: 'Bronze'    },
  silver:    { border: 'border-slate-400/30',  bg: 'bg-slate-500/10',  text: 'text-slate-300',   label: 'Silver'    },
  gold:      { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-400',  label: 'Gold'      },
  legendary: { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400',  label: 'Legendary' },
};

// ── Main computation ──────────────────────────────────────────────────────────
export type PickleBreakdown = {
  total: number;
  fromBadges: number;      // milestone / once-type badges
  fromEvents: number;      // recurring event-based badges
  fromUpsets: number;      // per-win ELO upset pickles
  fromParticipation: number; // 1 per 10 matches/month
  fromDinks: number;       // 1 per 25 dinks received
};

export function computePlayerData(
  allMatches: MatchRow[],
  playerName: string,
  matchNotes?: Record<number, MatchNote>,
  totalDinks = 0,
): { badges: BadgeDef[]; pickles: PickleBreakdown; pickleLog: PickleEvent[] } {
  const T = playerName.toUpperCase().trim();
  const earnedIds = new Set<string>();
  const log: PickleEvent[] = [];

  function addLog(date: string, emoji: string, label: string, pickles: number) {
    log.push({ date, emoji, label, pickles });
  }

  // All competitive matches for this player (chronological)
  const myMatches = allMatches.filter(m =>
    m.bracket.toUpperCase() !== 'CASUAL' &&
    m.players.toUpperCase().split('/').map(p => p.trim()).includes(T)
  );

  if (myMatches.length === 0) {
    return { badges: [], pickles: { total: 0, fromBadges: 0, fromEvents: 0, fromUpsets: 0, fromParticipation: 0, fromDinks: 0 }, pickleLog: [] };
  }

  // ── Pre-compute first appearance index for brand-new player detection ────────
  const firstAppearance: Record<string, number> = {};
  allMatches.forEach((m, idx) => {
    m.players.toUpperCase().split('/').map(p => p.trim()).filter(Boolean).forEach(p => {
      if (firstAppearance[p] === undefined) firstAppearance[p] = idx;
    });
  });

  // ── Event counters (for recurring pickle counts) ─────────────────────────────
  let bagels = 0, blowouts = 0, clutches = 0, heartbreakers = 0;
  let reverseBagels = 0;
  let tinyDillCount = 0, friendlyCount = 0;
  let pickleTheftDays = 0, revengeDays = 0, marathonDays = 0;
  let matchmakerWeeks = 0;
  let rentFreeCount = 0;
  let opponentPickles = 0;

  // Win streak pickle counting (each time threshold is crossed)
  let winStreak = 0, winStreakPickles = 0;
  // Loss streak
  let lossStreak = 0, lossStreakPickles = 0;
  let badgeLossStreak5 = false, badgeLossStreak10 = false, badgeLossStreak15 = false;

  // Per-opponent tracking
  const lossesTo: Record<string, number> = {};
  const winsVs: Record<string, string[]> = {}; // opponent → win dates

  // Per-day tracking
  const dayMatches: Record<string, number> = {};
  const dayOppWins: Record<string, Record<string, number>> = {};
  const dayOppResults: Record<string, { opp: string; won: boolean }[]> = {};
  const dayBagelsLost: Record<string, number> = {};

  // Per-week doubles partner tracking
  const weekPartners: Record<string, Set<string>> = {};

  // Badge flags (earned once)
  let singlesWins = 0, doublesWins = 0, doublesPlayed = 0;
  let firstWinLogged = false, allRounderLogged = false;

  for (let mi = 0; mi < myMatches.length; mi++) {
    const m = myMatches[mi];
    const inT1 = m.team1.toUpperCase().split('/').map(p => p.trim()).includes(T);
    const oppTeam = (inT1 ? m.team2 : m.team1).toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    const winPlayers = m.win.toUpperCase().split('/').map(p => p.trim());
    const won = winPlayers.includes(T);
    const myScore  = inT1 ? m.team1Score : m.team2Score;
    const oppScore = inT1 ? m.team2Score : m.team1Score;
    const oppLabel = oppTeam.map(p => p.charAt(0) + p.slice(1).toLowerCase()).join('/');

    // ── First match ────────────────────────────────────────────────────────────
    if (mi === 0) {
      earnedIds.add('first_match');
      addLog(m.date, '🎾', 'Played your first competitive match', 1);
    }

    // ── Volume milestones ──────────────────────────────────────────────────────
    if (mi === 9)   { earnedIds.add('matches_10');  addLog(m.date, '📋', '10 matches played', 1); }
    if (mi === 24)  { earnedIds.add('matches_25');  addLog(m.date, '💪', '25 matches played', 1); }
    if (mi === 49)  { earnedIds.add('matches_50');  addLog(m.date, '🏃', '50 matches played', 1); }
    if (mi === 99)  { earnedIds.add('matches_100'); addLog(m.date, '🔱', '100 matches played', 1); }

    // ── Doubles volume ─────────────────────────────────────────────────────────
    if (m.type === 'DOUBLES') {
      doublesPlayed++;
      if (doublesPlayed === 20) {
        earnedIds.add('doubles_20');
        addLog(m.date, '🤝', '20 doubles matches played', 1);
      }
    }

    if (won) {
      if (m.type === 'SINGLES') singlesWins++;
      if (m.type === 'DOUBLES') doublesWins++;

      // First win
      if (!firstWinLogged) {
        firstWinLogged = true;
        earnedIds.add('first_win');
        addLog(m.date, '🏆', 'First match win', 1);
      }

      // All-rounder
      if (!allRounderLogged && singlesWins > 0 && doublesWins > 0) {
        allRounderLogged = true;
        earnedIds.add('all_rounder');
        addLog(m.date, '🔄', 'Won in both singles & doubles', 1);
      }

      winStreak++;
      lossStreak = 0;

      if (winStreak === 3)  { earnedIds.add('streak_3');  winStreakPickles++; addLog(m.date, '🔥', '3-match win streak', 1); }
      if (winStreak === 5)  { earnedIds.add('streak_5');  winStreakPickles++; addLog(m.date, '⚡', '5-match win streak', 1); }
      if (winStreak === 10) { earnedIds.add('streak_10'); winStreakPickles++; addLog(m.date, '💫', '10-match win streak', 1); }

      // Performance events
      if (myScore === 11 && oppScore === 0) {
        earnedIds.add('bagel'); bagels++;
        addLog(m.date, '🥒', `Won 11–0 vs ${oppLabel}`, 1);
      }
      if (myScore - oppScore >= 8) {
        earnedIds.add('blowout'); blowouts++;
        addLog(m.date, '💥', `Won by ${myScore - oppScore} vs ${oppLabel}`, 1);
      }
      if (myScore - oppScore === 1) {
        earnedIds.add('clutch'); clutches++;
        addLog(m.date, '😤', `Clutch 1-point win vs ${oppLabel}`, 1);
      }
      if (myScore > 11 && myScore - oppScore === 2) {
        earnedIds.add('heartbreaker'); heartbreakers++;
        addLog(m.date, '💔', `Extra-point win vs ${oppLabel} (${myScore}–${oppScore})`, 1);
      }

      // Pickle theft: 3 wins over same player in one day
      if (!dayOppWins[m.date]) dayOppWins[m.date] = {};
      oppTeam.forEach(opp => {
        dayOppWins[m.date][opp] = (dayOppWins[m.date][opp] ?? 0) + 1;
        if (dayOppWins[m.date][opp] === 3) {
          earnedIds.add('pickle_theft');
          pickleTheftDays++;
          addLog(m.date, '🦹', `Beat ${opp.charAt(0) + opp.slice(1).toLowerCase()} 3× in one day`, 1);
        }
      });

      // Rent free: 5 wins over same opponent
      oppTeam.forEach(opp => {
        if (!winsVs[opp]) winsVs[opp] = [];
        winsVs[opp].push(m.date);
        if (winsVs[opp].length === 5) {
          earnedIds.add('rent_free');
          rentFreeCount++;
          addLog(m.date, '🏠', `5 wins over ${opp.charAt(0) + opp.slice(1).toLowerCase()}`, 1);
        }
      });

    } else {
      winStreak = 0;
      lossStreak++;

      // Loss streak badges + pickles
      if (lossStreak === 5)  {
        if (!badgeLossStreak5)  { earnedIds.add('brine_award');    badgeLossStreak5  = true; }
        lossStreakPickles += 2;
        addLog(m.date, '🧂', '5-match losing streak', 2);
      }
      if (lossStreak === 10) {
        if (!badgeLossStreak10) { earnedIds.add('extra_salty');    badgeLossStreak10 = true; }
        lossStreakPickles += 5;
        addLog(m.date, '😤', '10-match losing streak', 5);
      }
      if (lossStreak === 15) {
        if (!badgeLossStreak15) { earnedIds.add('pickled_beyond'); badgeLossStreak15 = true; }
        lossStreakPickles += 10;
        addLog(m.date, '😵', '15-match losing streak', 10);
      }

      // Lose 11-0
      if (oppScore === 11 && myScore === 0) {
        earnedIds.add('reverse_pickle');
        reverseBagels++;
        addLog(m.date, '🙃', `Lost 11–0 to ${oppLabel}`, 2);
        dayBagelsLost[m.date] = (dayBagelsLost[m.date] ?? 0) + 1;
        if (dayBagelsLost[m.date] === 2) {
          earnedIds.add('again');
          addLog(m.date, '😭', 'Lost 11–0 twice in one day', 5);
        }
      }

      // Per-opponent loss milestones
      oppTeam.forEach(opp => {
        lossesTo[opp] = (lossesTo[opp] ?? 0) + 1;
        const oppName = opp.charAt(0) + opp.slice(1).toLowerCase();
        if (lossesTo[opp] === 10) {
          earnedIds.add('frequent_customer');
          opponentPickles += 3;
          addLog(m.date, '🎫', `Lost to ${oppName} 10 times`, 3);
        }
        if (lossesTo[opp] === 20) {
          earnedIds.add('season_ticket');
          opponentPickles += 5;
          addLog(m.date, '🎟️', `Lost to ${oppName} 20 times`, 5);
        }
        if (lossesTo[opp] === 30) {
          earnedIds.add('property_of');
          opponentPickles += 10;
          addLog(m.date, '🏷️', `Lost to ${oppName} 30 times`, 10);
        }
      });
    }

    // Per-day match count
    dayMatches[m.date] = (dayMatches[m.date] ?? 0) + 1;
    if (dayMatches[m.date] === 10) {
      earnedIds.add('marathon_pickle');
      marathonDays++;
      addLog(m.date, '🏃', '10 matches in one day', 1);
    }

    // Revenge pickle tracking
    if (!dayOppResults[m.date]) dayOppResults[m.date] = [];
    oppTeam.forEach(opp => dayOppResults[m.date].push({ opp, won }));

    // Friendly pickle: opponent playing their first ever competitive match
    const globalMatchIdx = allMatches.findIndex(am => am.matchId === m.matchId);
    oppTeam.forEach(opp => {
      if (firstAppearance[opp] === globalMatchIdx) {
        earnedIds.add('friendly_pickle');
        friendlyCount++;
        addLog(m.date, '👋', `Played against ${opp.charAt(0) + opp.slice(1).toLowerCase()}'s first ever match`, 1);
      }
    });

    // Matchmaker: 5 different partners in one week (doubles only)
    if (m.type === 'DOUBLES') {
      const wk = weekKey(m.date);
      if (!weekPartners[wk]) weekPartners[wk] = new Set();
      const prevSize = weekPartners[wk].size;
      const myTeam = (inT1 ? m.team1 : m.team2).toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
      myTeam.filter(p => p !== T).forEach(p => weekPartners[wk].add(p));
      if (prevSize < 5 && weekPartners[wk].size >= 5) {
        earnedIds.add('matchmaker');
        matchmakerWeeks++;
        addLog(m.date, '🤝', '5 different doubles partners in one week', 1);
      }
    }

    // Content creator
    if (matchNotes && matchNotes[m.matchId]?.photoUrl && !earnedIds.has('content')) {
      earnedIds.add('content');
      addLog(m.date, '📸', 'Logged a match with a photo', 1);
    }
  }

  // ── Revenge pickle (post-loop per day) ────────────────────────────────────────
  for (const [date, dayArr] of Object.entries(dayOppResults)) {
    const oppMap: Record<string, boolean[]> = {};
    dayArr.forEach(({ opp, won }) => { if (!oppMap[opp]) oppMap[opp] = []; oppMap[opp].push(won); });
    for (const [opp, seq] of Object.entries(oppMap)) {
      for (let i = 0; i < seq.length - 1; i++) {
        if (!seq[i] && seq.slice(i + 1).some(v => v)) {
          earnedIds.add('revenge_pickle');
          revengeDays++;
          addLog(date, '⚔️', `Revenge win vs ${opp.charAt(0) + opp.slice(1).toLowerCase()}`, 1);
          break;
        }
      }
    }
  }

  // ── Full ELO replay — peak ELO, tiny_dill, upset pickles ─────────────────────
  const singlesElo: Record<string, number> = {};
  const doublesElo: Record<string, number> = {};
  let peakElo = 1000;
  let upsetPickles = 0;
  const eloMilestoneDates: Record<number, string> = {};

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

    const inT1 = t1.includes(T), inT2 = t2.includes(T);
    if (inT1 || inT2) {
      const myTeamWon = inT1 ? team1Won : !team1Won;
      const myAvg  = inT1 ? avg1 : avg2;
      const oppAvg = inT1 ? avg2 : avg1;
      const oppTeamRaw = inT1 ? t2 : t1;
      const oppLabel2 = oppTeamRaw.map(p => p.charAt(0) + p.slice(1).toLowerCase()).join('/');

      if (myTeamWon) {
        if (oppAvg - myAvg >= 200) earnedIds.add('upset');

        if (oppAvg - myAvg >= 50) {
          const gained = Math.floor((oppAvg - myAvg) / 50);
          upsetPickles += gained;
          addLog(m.date, '🎯', `Upset win vs ${oppLabel2} (+${Math.round(oppAvg - myAvg)} ELO gap)`, gained);
        }

        // Tiny dill: won as lowest ELO on court
        const allOnCourt = [...t1, ...t2];
        const myCurrentElo = eloMap[T] || 1000;
        const isLowest = allOnCourt.every(p => (eloMap[p] || 1000) >= myCurrentElo);
        if (isLowest && allOnCourt.length > 1) {
          earnedIds.add('tiny_dill');
          tinyDillCount++;
          addLog(m.date, '🌱', `Won as lowest ELO on court vs ${oppLabel2}`, 1);
        }
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

    // Track ELO milestone dates
    const myElo = (singlesElo[T] || 0) > (doublesElo[T] || 0) ? singlesElo[T] : doublesElo[T];
    if (myElo) {
      const prevPeak = peakElo;
      peakElo = Math.max(peakElo, myElo);
      for (const threshold of [1100, 1200, 1300, 1400]) {
        if (prevPeak < threshold && peakElo >= threshold && !eloMilestoneDates[threshold]) {
          eloMilestoneDates[threshold] = m.date;
        }
      }
    }
  }

  if (peakElo >= 1100) { earnedIds.add('elo_1100'); if (eloMilestoneDates[1100]) addLog(eloMilestoneDates[1100], '📈', 'Reached 1100 ELO', 1); }
  if (peakElo >= 1200) { earnedIds.add('elo_1200'); if (eloMilestoneDates[1200]) addLog(eloMilestoneDates[1200], '⭐', 'Reached 1200 ELO', 1); }
  if (peakElo >= 1300) { earnedIds.add('elo_1300'); if (eloMilestoneDates[1300]) addLog(eloMilestoneDates[1300], '🌟', 'Reached 1300 ELO', 1); }
  if (peakElo >= 1400) { earnedIds.add('elo_1400'); if (eloMilestoneDates[1400]) addLog(eloMilestoneDates[1400], '👑', 'Reached 1400 ELO', 1); }

  // ── Monthly participation ─────────────────────────────────────────────────────
  const monthCounts: Record<string, { count: number; lastDate: string }> = {};
  myMatches.forEach(m => {
    const mk = monthKey(m.date);
    if (!monthCounts[mk]) monthCounts[mk] = { count: 0, lastDate: m.date };
    monthCounts[mk].count++;
    monthCounts[mk].lastDate = m.date;
  });
  let fromParticipation = 0;
  for (const [mk, { count, lastDate }] of Object.entries(monthCounts)) {
    const earned = Math.floor(count / 10);
    if (earned > 0) {
      fromParticipation += earned;
      addLog(lastDate, '📅', `${count} matches in ${monthLabel(mk)}`, earned);
    }
  }

  // ── Build final badge list ───────────────────────────────────────────────────
  const badges = ALL_BADGES.filter(b => earnedIds.has(b.id));

  // ── Pickle counts ─────────────────────────────────────────────────────────────
  const onceBadges = badges.filter(b => b.pickleMode === 'once');
  const fromBadges = onceBadges.reduce((s, b) => s + (b.pickles ?? 1), 0);

  const eventPickles =
    bagels           * 1 +
    blowouts         * 1 +
    clutches         * 1 +
    heartbreakers    * 1 +
    tinyDillCount    * 1 +
    friendlyCount    * 1 +
    pickleTheftDays  * 1 +
    revengeDays      * 1 +
    marathonDays     * 1 +
    matchmakerWeeks  * 1 +
    rentFreeCount    * 1 +
    reverseBagels    * 2 +
    Object.values(dayBagelsLost).filter(c => c >= 2).length * 5 +
    winStreakPickles  * 1 +
    lossStreakPickles +
    opponentPickles;

  const fromDinks = Math.floor(totalDinks / 25);
  const fromEvents = eventPickles + upsetPickles;
  const total = fromBadges + fromEvents + fromParticipation + fromDinks;

  // Sort log chronologically (oldest → newest) using parsed date
  const sortedLog = [...log].sort((a, b) =>
    parseMatchDate(a.date).getTime() - parseMatchDate(b.date).getTime()
  );

  return {
    badges,
    pickles: { total, fromBadges, fromEvents, fromUpsets: upsetPickles, fromParticipation, fromDinks },
    pickleLog: sortedLog,
  };
}

// ── Backward-compatible wrapper ───────────────────────────────────────────────
export function computePlayerBadges(
  allMatches: MatchRow[],
  playerName: string,
  matchNotes?: Record<number, MatchNote>
): BadgeDef[] {
  return computePlayerData(allMatches, playerName, matchNotes).badges;
}
