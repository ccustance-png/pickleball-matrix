'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { MatchRow, EloEntry } from '@/lib/sheets';

// ── ELO replay (mirrors Apps Script exactly) ──────────────────────────────────
const BASE_K = 32;
function dynK(e: number) { return BASE_K * (2000 / (Math.max(e, 400) + 1000)); }
function expWin(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
function movMult(margin: number, exp1: number) {
  const c = 1 - Math.abs(exp1 - 0.5) * 2;
  return 1 + margin * 0.1 * c;
}

type HistoryPoint = { date: string; elo: number; win: boolean; opp: string };

function replayHistory(matches: MatchRow[], target: string, type: 'SINGLES' | 'DOUBLES') {
  const T = target.toUpperCase().trim();
  const elo: Record<string, number> = {};
  const history: HistoryPoint[] = [];

  for (const m of matches) {
    if (m.type !== type || m.bracket.toUpperCase() === 'CASUAL') continue;
    const t1 = m.team1.trim().toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    const t2 = m.team2.trim().toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    if (!t1.length || !t2.length) continue;
    [...t1, ...t2].forEach(p => { if (!elo[p]) elo[p] = 1000; });

    const avg1 = t1.reduce((s, p) => s + elo[p], 0) / t1.length;
    const avg2 = t2.reduce((s, p) => s + elo[p], 0) / t2.length;
    const e1 = expWin(avg1, avg2);
    const team1Won = m.win.trim().toUpperCase() === m.team1.trim().toUpperCase();
    const mov = movMult(Math.abs(m.team1Score - m.team2Score), e1);
    const o1 = mov * ((team1Won ? 1 : 0) - e1);
    const o2 = mov * ((team1Won ? 0 : 1) - (1 - e1));

    const applyTeam = (team: string[], outcome: number) => {
      if (team.length < 2) {
        team.forEach(p => { elo[p] = (elo[p] || 1000) + dynK(elo[p] || 1000) * outcome; });
        return;
      }
      const es = team.map(p => elo[p] || 1000);
      const hi = Math.max(...es), lo = Math.min(...es);
      const prop = lo > 0 ? hi / lo : 1;
      team.forEach(p => {
        const pe = elo[p] || 1000;
        const ch = dynK(pe) * outcome;
        elo[p] = pe + (pe >= hi ? ch : ch > 0 ? ch * prop : ch / prop);
      });
    };
    applyTeam(t1, o1);
    applyTeam(t2, o2);

    const inT1 = t1.includes(T), inT2 = t2.includes(T);
    if (inT1 || inT2) {
      history.push({
        date: m.date,
        elo: Math.round(elo[T] || 1000),
        win: inT1 ? team1Won : !team1Won,
        opp: (inT1 ? t2 : t1).join('/'),
      });
    }
  }
  return { history, currentElo: Math.round(elo[T] || 1000) };
}

// ── ELO sparkline chart ────────────────────────────────────────────────────────
function EloChart({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) return (
    <div className="h-24 flex items-center justify-center text-slate-600 text-xs">
      Need more matches to display chart
    </div>
  );
  const W = 400, H = 96;
  const elos = history.map(h => h.elo);
  const minE = Math.min(...elos) - 30;
  const maxE = Math.max(...elos) + 30;
  const range = maxE - minE || 1;
  const toX = (i: number) => (i / (history.length - 1)) * (W - 16) + 8;
  const toY = (e: number) => H - 8 - ((e - minE) / range) * (H - 20);
  const pts = history.map((h, i) => `${toX(i)},${toY(h.elo)}`).join(' ');
  const y1k = toY(1000);
  const show1k = y1k > 2 && y1k < H - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#84cc16" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#84cc16" stopOpacity={0} />
        </linearGradient>
      </defs>
      {show1k && <line x1={0} y1={y1k} x2={W} y2={y1k} stroke="#1e293b" strokeWidth={1} strokeDasharray="4 3" />}
      <polygon points={`8,${H} ${pts} ${toX(history.length - 1)},${H}`} fill="url(#cg)" />
      <polyline points={pts} fill="none" stroke="#84cc16" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {history.map((h, i) => (
        <circle key={i} cx={toX(i)} cy={toY(h.elo)} r={3.5}
          fill={h.win ? '#84cc16' : '#ef4444'} stroke="#0f172a" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

// ── Win probability bar ────────────────────────────────────────────────────────
function WinBar({ pct, name1, name2, elo1, elo2 }: {
  pct: number; name1: string; name2: string; elo1: number; elo2: number;
}) {
  const p1 = Math.round(pct * 100);
  const p2 = 100 - p1;
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-bold">
        <span className="text-lime-400 truncate max-w-[45%]">{name1}</span>
        <span className="text-slate-400 truncate max-w-[45%] text-right">{name2}</span>
      </div>
      <div className="flex h-12 rounded-xl overflow-hidden border border-slate-700">
        <div className="flex items-center justify-end pr-3 bg-lime-500/20 transition-all duration-700"
          style={{ width: `${p1}%` }}>
          <span className="text-lime-400 font-black text-xl">{p1}%</span>
        </div>
        <div className="flex items-center justify-start pl-3 bg-slate-800/80 transition-all duration-700"
          style={{ width: `${p2}%` }}>
          <span className="text-slate-400 font-black text-xl">{p2}%</span>
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>ELO {elo1}</span>
        <span>ELO {elo2}</span>
      </div>
    </div>
  );
}

// ── Date formatter ─────────────────────────────────────────────────────────────
function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return s; }
}

// ── Player combobox (simple inline version) ────────────────────────────────────
function PlayerSelect({ value, onChange, players, placeholder }: {
  value: string; onChange: (v: string) => void; players: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-lime-500 appearance-none"
    >
      <option value="">{placeholder ?? 'Select player…'}</option>
      {players.map(p => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
type Props = {
  matches: MatchRow[];
  singlesElo: EloEntry[];
  doublesElo: EloEntry[];
  players: string[];
};

type Tab = 'insights' | 'predict';
type MatchType = 'SINGLES' | 'DOUBLES';

export default function StatsTabs({ matches, singlesElo, doublesElo, players }: Props) {
  const [tab, setTab] = useState<Tab>('insights');

  // ── Insights state ──────────────────────────────────────────────────────────
  const [insightPlayer, setInsightPlayer] = useState('');
  const [insightType, setInsightType] = useState<MatchType>('SINGLES');

  // ── Predict state ───────────────────────────────────────────────────────────
  const [predType, setPredType] = useState<MatchType>('SINGLES');
  const [predP1, setPredP1] = useState('');
  const [predP2, setPredP2] = useState('');
  const [predT1p2, setPredT1p2] = useState('');
  const [predT2p2, setPredT2p2] = useState('');

  // ── Insights computation ────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!insightPlayer) return null;
    const { history, currentElo } = replayHistory(matches, insightPlayer, insightType);
    if (!history.length) return null;

    const T = insightPlayer.toUpperCase().trim();
    const wins = history.filter(h => h.win).length;
    const losses = history.length - wins;
    const recentForm = history.slice(-10);

    // Win rate by ELO bracket
    const eloMap = (insightType === 'SINGLES' ? singlesElo : doublesElo)
      .reduce<Record<string, number>>((acc, e) => { acc[e.name.toUpperCase()] = e.elo; return acc; }, {});

    const brackets = { weaker: [0, 0], similar: [0, 0], stronger: [0, 0] };
    history.forEach(h => {
      const oppName = h.opp.split('/')[0].toUpperCase();
      const oppElo = eloMap[oppName] ?? 1000;
      const diff = oppElo - currentElo;
      const key = diff < -100 ? 'weaker' : diff > 100 ? 'stronger' : 'similar';
      brackets[key][0] += h.win ? 1 : 0;
      brackets[key][1] += 1;
    });

    // Matchups
    const matchupMap: Record<string, { w: number; l: number }> = {};
    history.forEach(h => {
      const key = h.opp;
      if (!matchupMap[key]) matchupMap[key] = { w: 0, l: 0 };
      h.win ? matchupMap[key].w++ : matchupMap[key].l++;
    });
    const matchups = Object.entries(matchupMap)
      .filter(([, v]) => v.w + v.l >= 2)
      .map(([opp, v]) => ({ opp, w: v.w, l: v.l, pct: v.w / (v.w + v.l) }))
      .sort((a, b) => b.w + b.l - (a.w + a.l));

    const best = [...matchups].sort((a, b) => b.pct - a.pct).slice(0, 3);
    const worst = [...matchups].sort((a, b) => a.pct - b.pct).slice(0, 3);

    // ELO change
    const firstElo = history[0]?.elo ?? 1000;
    const eloChange = currentElo - firstElo;

    return { history, currentElo, wins, losses, recentForm, brackets, best, worst, eloChange };
  }, [insightPlayer, insightType, matches, singlesElo, doublesElo]);

  // ── Prediction computation ──────────────────────────────────────────────────
  const prediction = useMemo(() => {
    const eloMap = (predType === 'SINGLES' ? singlesElo : doublesElo)
      .reduce<Record<string, number>>((acc, e) => { acc[e.name.toUpperCase()] = e.elo; return acc; }, {});

    type LastMatch = { date: string; p1Score: number; p2Score: number; p1Won: boolean };

    // ── Branch: resolve ELO + h2h matches ─────────────────────────────────
    let pct: number, e1: number, e2: number;
    let h2hRaw: MatchRow[] = [];

    if (predType === 'SINGLES') {
      if (!predP1 || !predP2) return null;
      e1 = eloMap[predP1.toUpperCase()] ?? 1000;
      e2 = eloMap[predP2.toUpperCase()] ?? 1000;
      pct = expWin(e1, e2);
      h2hRaw = matches.filter(m => {
        if (m.type !== 'SINGLES') return false;
        const all = m.players.toUpperCase();
        return all.includes(predP1.toUpperCase()) && all.includes(predP2.toUpperCase());
      });
    } else {
      const t1 = [predP1, predT1p2].filter(Boolean);
      const t2 = [predP2, predT2p2].filter(Boolean);
      if (t1.length < 2 || t2.length < 2) return null;
      const avg1 = t1.reduce((s, p) => s + (eloMap[p.toUpperCase()] ?? 1000), 0) / t1.length;
      const avg2 = t2.reduce((s, p) => s + (eloMap[p.toUpperCase()] ?? 1000), 0) / t2.length;
      e1 = Math.round(avg1); e2 = Math.round(avg2);
      pct = expWin(avg1, avg2);
      h2hRaw = matches.filter(m => {
        if (m.type !== 'DOUBLES') return false;
        const t1Names = t1.map(p => p.toUpperCase());
        const t2Names = t2.map(p => p.toUpperCase());
        const team1 = m.team1.toUpperCase().split('/').map(p => p.trim());
        const team2 = m.team2.toUpperCase().split('/').map(p => p.trim());
        return (t1Names.every(p => team1.includes(p)) && t2Names.every(p => team2.includes(p))) ||
               (t2Names.every(p => team1.includes(p)) && t1Names.every(p => team2.includes(p)));
      });
    }

    // ── H2H stats ──────────────────────────────────────────────────────────
    const p1wins = h2hRaw.filter(m => m.win.toUpperCase().includes(predP1.toUpperCase())).length;
    let p1TotalPts = 0, p2TotalPts = 0;
    h2hRaw.forEach(m => {
      const p1isT1 = m.team1.toUpperCase().includes(predP1.toUpperCase());
      p1TotalPts += p1isT1 ? m.team1Score : m.team2Score;
      p2TotalPts += p1isT1 ? m.team2Score : m.team1Score;
    });
    let lastMatch: LastMatch | null = null;
    if (h2hRaw.length > 0) {
      const last = h2hRaw[h2hRaw.length - 1];
      const p1isT1 = last.team1.toUpperCase().includes(predP1.toUpperCase());
      lastMatch = {
        date: last.date,
        p1Score: p1isT1 ? last.team1Score : last.team2Score,
        p2Score: p1isT1 ? last.team2Score : last.team1Score,
        p1Won: last.win.toUpperCase().includes(predP1.toUpperCase()),
      };
    }

    // ── Score prediction ───────────────────────────────────────────────────
    const p1Favoured = pct >= 0.5;
    const favWinPct = Math.max(pct, 1 - pct);
    const favKey = p1Favoured ? predP1 : predP2;
    const favWins = h2hRaw.filter(m => m.win.toUpperCase().includes(favKey.toUpperCase()));
    let scorePred: { p1: number; p2: number };
    if (favWins.length >= 2) {
      let fSum = 0, dSum = 0;
      favWins.forEach(m => {
        const fIsT1 = m.team1.toUpperCase().includes(favKey.toUpperCase());
        fSum += fIsT1 ? m.team1Score : m.team2Score;
        dSum += fIsT1 ? m.team2Score : m.team1Score;
      });
      const fa = Math.min(11, Math.round(fSum / favWins.length));
      const da = Math.min(11, Math.round(dSum / favWins.length));
      scorePred = p1Favoured ? { p1: fa, p2: da } : { p1: da, p2: fa };
    } else {
      const loser = Math.min(11, Math.max(0, Math.round(11 * (1 - favWinPct) / favWinPct * 0.85)));
      scorePred = p1Favoured ? { p1: 11, p2: loser } : { p1: loser, p2: 11 };
    }

    // ── Recent form per player ─────────────────────────────────────────────
    const playerMs = (name: string) => matches.filter(m =>
      m.type === predType &&
      m.bracket.toUpperCase() !== 'CASUAL' &&
      m.players.toUpperCase().split('/').map((p: string) => p.trim()).includes(name.toUpperCase())
    );
    const getStrk = (name: string, ms: MatchRow[]) => {
      let count = 0, type: 'W' | 'L' | null = null;
      for (let i = ms.length - 1; i >= 0; i--) {
        const w = ms[i].win.toUpperCase().includes(name.toUpperCase());
        if (!type) { type = w ? 'W' : 'L'; count = 1; }
        else if ((type === 'W') === w) count++;
        else break;
      }
      return { count, type };
    };
    const p1AllM = playerMs(predP1);
    const p2AllM = playerMs(predP2);
    const p1Strk = getStrk(predP1, p1AllM);
    const p2Strk = getStrk(predP2, p2AllM);
    const p1R5   = p1AllM.slice(-5);
    const p2R5   = p2AllM.slice(-5);
    const p1RW   = p1R5.filter(m => m.win.toUpperCase().includes(predP1.toUpperCase())).length;
    const p2RW   = p2R5.filter(m => m.win.toUpperCase().includes(predP2.toUpperCase())).length;

    // ── Analysis text ──────────────────────────────────────────────────────
    const eloDiff  = Math.abs(e1 - e2);
    const p1Label  = predType === 'DOUBLES' ? `${predP1}/${predT1p2}` : predP1;
    const p2Label  = predType === 'DOUBLES' ? `${predP2}/${predT2p2}` : predP2;
    const favLabel = p1Favoured ? p1Label : p2Label;
    const dogLabel = p1Favoured ? p2Label : p1Label;
    const favPctN  = Math.round(favWinPct * 100);
    const favStrk  = p1Favoured ? p1Strk : p2Strk;
    const dogStrk  = p1Favoured ? p2Strk : p1Strk;
    const favRW    = p1Favoured ? p1RW : p2RW;
    const favR5    = p1Favoured ? p1R5 : p2R5;
    const dogRW    = p1Favoured ? p2RW : p1RW;
    const dogR5    = p1Favoured ? p2R5 : p1R5;

    let s1: string, s2: string;
    if (eloDiff < 50) {
      s1 = `${favLabel} holds a razor-thin ELO edge (${e1} vs ${e2}) — this is essentially a coin flip where either player can take it.`;
    } else if (eloDiff < 150) {
      s1 = `${favLabel} enters as the moderate favourite with a ${eloDiff}-point ELO advantage, translating to a ${favPctN}% win probability.`;
    } else {
      s1 = `${favLabel} carries a commanding ${eloDiff}-point ELO lead over ${dogLabel}, making them a strong ${favPctN}% favourite on paper.`;
    }

    if (favStrk.type === 'W' && favStrk.count >= 3) {
      s2 = `${favLabel} is locked in on a ${favStrk.count}-match winning streak, making them an even stronger lock here.`;
    } else if (dogStrk.type === 'W' && dogStrk.count >= 3) {
      s2 = `${dogLabel} is red hot though — riding a ${dogStrk.count}-win streak, an upset absolutely cannot be ruled out.`;
    } else if (h2hRaw.length > 0) {
      const favH2h = p1Favoured ? p1wins : (h2hRaw.length - p1wins);
      const dogH2h = h2hRaw.length - favH2h;
      if (favH2h > dogH2h) {
        s2 = `History backs the pick — ${favLabel} leads their head-to-head ${favH2h}–${dogH2h}, showing they know how to get it done against this opponent.`;
      } else if (dogH2h > favH2h) {
        s2 = `Despite the rating gap, ${dogLabel} leads the head-to-head ${dogH2h}–${favH2h} — history says this matchup is closer than the numbers suggest.`;
      } else {
        s2 = `Their head-to-head is perfectly even, so it'll come down to whoever is sharper on the day.`;
      }
    } else if (favR5.length > 0 && favRW / favR5.length >= 0.8) {
      s2 = `${favLabel} has been in excellent form lately (${favRW}–${favR5.length - favRW} last ${favR5.length}), cementing them as the pick.`;
    } else if (dogR5.length > 0 && dogRW / dogR5.length >= 0.8) {
      s2 = `${dogLabel} has been playing their best ball recently (${dogRW}–${dogR5.length - dogRW} last ${dogR5.length}), making this more interesting than the rating gap suggests.`;
    } else {
      s2 = `No head-to-head history to draw from, so the ELO gap is the best guide — trust the numbers and back ${favLabel}.`;
    }

    return {
      pct, e1, e2, h2h: h2hRaw.length, p1wins,
      p1TotalPts, p2TotalPts, lastMatch,
      scorePred, analysis: `${s1} ${s2}`,
    };
  }, [predType, predP1, predP2, predT1p2, predT2p2, matches, singlesElo, doublesElo]);

  const pctFmt = (w: number, total: number) =>
    total === 0 ? '—' : `${Math.round((w / total) * 100)}%`;

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
        {(['insights', 'predict'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors capitalize ${
              tab === t ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {t === 'insights' ? '📊 Insights' : '🎯 Predict'}
          </button>
        ))}
      </div>

      {/* ── INSIGHTS ── */}
      {tab === 'insights' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex gap-2">
            <div className="flex-1">
              <PlayerSelect value={insightPlayer} onChange={setInsightPlayer} players={players} placeholder="Select a player…" />
            </div>
            <div className="flex gap-1 bg-slate-800 p-1 rounded-lg shrink-0">
              {(['SINGLES', 'DOUBLES'] as MatchType[]).map(t => (
                <button key={t} onClick={() => setInsightType(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    insightType === t ? 'bg-lime-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}>
                  {t === 'SINGLES' ? 'S' : 'D'}
                </button>
              ))}
            </div>
          </div>

          {!insightPlayer && (
            <div className="text-center py-16 text-slate-600">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm">Select a player to see their stats</p>
            </div>
          )}

          {insightPlayer && !insights && (
            <div className="text-center py-16 text-slate-600">
              <p className="text-sm">No {insightType.toLowerCase()} matches found for {insightPlayer}</p>
            </div>
          )}

          {insights && (
            <>
              {/* ELO + record header */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/players/${encodeURIComponent(insightPlayer)}`}
                      className="text-lg font-bold text-lime-400 hover:text-lime-300">
                      {insightPlayer}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">{insightType === 'SINGLES' ? 'Singles' : 'Doubles'} · {insights.wins + insights.losses} matches</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-100">{insights.currentElo}</p>
                    <p className={`text-xs font-semibold ${insights.eloChange >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                      {insights.eloChange >= 0 ? '+' : ''}{insights.eloChange} all-time
                    </p>
                  </div>
                </div>

                {/* ELO chart */}
                <div className="bg-slate-950 rounded-lg p-2">
                  <EloChart history={insights.history} />
                </div>

                {/* Chart legend */}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime-400 inline-block" /> Win</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Loss</span>
                </div>
              </div>

              {/* Record + recent form */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Record</h3>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-black text-lime-400">{insights.wins}</p>
                    <p className="text-xs text-slate-500">Wins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-400">{insights.losses}</p>
                    <p className="text-xs text-slate-500">Losses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-100">
                      {Math.round((insights.wins / (insights.wins + insights.losses)) * 100)}%
                    </p>
                    <p className="text-xs text-slate-500">Win Rate</p>
                  </div>
                </div>
                {/* Recent form dots */}
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Recent form (last {insights.recentForm.length})</p>
                  <div className="flex items-center gap-1.5">
                    {insights.recentForm.map((h, i) => (
                      <div key={i} title={`${h.win ? 'W' : 'L'} vs ${h.opp}`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          h.win ? 'bg-lime-500/20 text-lime-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                        {h.win ? 'W' : 'L'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Win rate by bracket */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Win Rate by Opponent Strength</h3>
                {[
                  { key: 'stronger' as const, label: 'vs Stronger (+100 ELO)', color: 'bg-red-400' },
                  { key: 'similar' as const, label: 'vs Similar (±100 ELO)', color: 'bg-yellow-400' },
                  { key: 'weaker' as const, label: 'vs Weaker (−100 ELO)', color: 'bg-lime-400' },
                ].map(({ key, label, color }) => {
                  const [w, total] = insights.brackets[key];
                  const pct = total > 0 ? (w / total) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-slate-300 font-semibold">{pctFmt(w, total)} <span className="text-slate-600">({w}–{total - w})</span></span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Matchups */}
              {(insights.best.length > 0 || insights.worst.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {insights.best.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Best Matchups</h3>
                      <div className="space-y-2">
                        {insights.best.map(m => (
                          <div key={m.opp} className="flex items-center justify-between">
                            <Link href={`/players/${encodeURIComponent(m.opp.split('/')[0])}`}
                              className="text-xs text-slate-300 hover:text-lime-400 truncate transition-colors">
                              {m.opp}
                            </Link>
                            <span className="text-xs font-bold text-lime-400 shrink-0 ml-1">{m.w}–{m.l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {insights.worst.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Toughest</h3>
                      <div className="space-y-2">
                        {insights.worst.map(m => (
                          <div key={m.opp} className="flex items-center justify-between">
                            <Link href={`/players/${encodeURIComponent(m.opp.split('/')[0])}`}
                              className="text-xs text-slate-300 hover:text-lime-400 truncate transition-colors">
                              {m.opp}
                            </Link>
                            <span className="text-xs font-bold text-red-400 shrink-0 ml-1">{m.w}–{m.l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── PREDICT ── */}
      {tab === 'predict' && (
        <div className="space-y-4">
          {/* Match type */}
          <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
            {(['SINGLES', 'DOUBLES'] as MatchType[]).map(t => (
              <button key={t} onClick={() => setPredType(t)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  predType === t ? 'bg-lime-500 text-slate-900' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {t === 'SINGLES' ? 'Singles' : 'Doubles'}
              </button>
            ))}
          </div>

          {/* Player selectors */}
          {predType === 'SINGLES' ? (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <PlayerSelect value={predP1} onChange={setPredP1} players={players} placeholder="Player 1…" />
              <span className="text-slate-600 font-bold text-sm">VS</span>
              <PlayerSelect value={predP2} onChange={setPredP2} players={players} placeholder="Player 2…" />
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team 1</p>
                <PlayerSelect value={predP1} onChange={setPredP1} players={players} placeholder="Player 1…" />
                <PlayerSelect value={predT1p2} onChange={setPredT1p2} players={players} placeholder="Partner…" />
              </div>
              <span className="text-slate-600 font-bold text-sm pt-7">VS</span>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team 2</p>
                <PlayerSelect value={predP2} onChange={setPredP2} players={players} placeholder="Player 1…" />
                <PlayerSelect value={predT2p2} onChange={setPredT2p2} players={players} placeholder="Partner…" />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!prediction && (
            <div className="text-center py-16 text-slate-600">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-sm">Select {predType === 'SINGLES' ? 'two players' : 'all four players'} to predict the outcome</p>
            </div>
          )}

          {/* Prediction result */}
          {prediction && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              {/* Win probability bar */}
              <WinBar
                pct={prediction.pct}
                name1={predType === 'SINGLES' ? predP1 : `${predP1} / ${predT1p2}`}
                name2={predType === 'SINGLES' ? predP2 : `${predP2} / ${predT2p2}`}
                elo1={prediction.e1}
                elo2={prediction.e2}
              />

              {/* Predicted Score */}
              <div className="border-t border-slate-800 pt-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">Predicted Score</p>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center min-w-0">
                    <p className={`text-6xl font-black tabular-nums ${prediction.scorePred.p1 > prediction.scorePred.p2 ? 'text-lime-400' : 'text-slate-500'}`}>
                      {prediction.scorePred.p1}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 truncate max-w-[96px]">
                      {predType === 'SINGLES' ? predP1 : predP1}
                    </p>
                  </div>
                  <span className="text-slate-700 font-black text-4xl shrink-0 pb-5">–</span>
                  <div className="text-center min-w-0">
                    <p className={`text-6xl font-black tabular-nums ${prediction.scorePred.p2 > prediction.scorePred.p1 ? 'text-lime-400' : 'text-slate-500'}`}>
                      {prediction.scorePred.p2}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 truncate max-w-[96px]">
                      {predType === 'SINGLES' ? predP2 : predP2}
                    </p>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Analysis</p>
                <p className="text-sm text-slate-300 leading-relaxed">{prediction.analysis}</p>
              </div>

              {/* Head-to-head */}
              {prediction.h2h > 0 && (
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Head-to-head</p>

                  {/* Stat rows */}
                  {[
                    {
                      label: 'Record',
                      p1val: `${prediction.p1wins}–${prediction.h2h - prediction.p1wins}`,
                      p2val: `${prediction.h2h - prediction.p1wins}–${prediction.p1wins}`,
                    },
                    {
                      label: 'Points For',
                      p1val: `${prediction.p1TotalPts}`,
                      p2val: `${prediction.p2TotalPts}`,
                    },
                  ].map(({ label, p1val, p2val }) => (
                    <div key={label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <span className="text-sm font-bold text-lime-400">{p1val}</span>
                      <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider text-center w-20">{label}</span>
                      <span className="text-sm font-bold text-slate-400 text-right">{p2val}</span>
                    </div>
                  ))}

                  {/* Win bar */}
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                    <div className="bg-lime-500 transition-all duration-500"
                      style={{ width: `${(prediction.p1wins / prediction.h2h) * 100}%` }} />
                  </div>

                  {/* Last match */}
                  {prediction.lastMatch && (
                    <div className="bg-slate-800/60 rounded-lg px-4 py-3 flex items-center justify-between">
                      <span className={`text-2xl font-black tabular-nums ${prediction.lastMatch.p1Won ? 'text-lime-400' : 'text-slate-500'}`}>
                        {prediction.lastMatch.p1Score}
                      </span>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-500">Last match</p>
                        <p className="text-xs text-slate-600 mt-0.5">{fmtDate(prediction.lastMatch.date)}</p>
                      </div>
                      <span className={`text-2xl font-black tabular-nums ${!prediction.lastMatch.p1Won ? 'text-lime-400' : 'text-slate-500'}`}>
                        {prediction.lastMatch.p2Score}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {prediction.h2h === 0 && (
                <p className="text-xs text-slate-600 text-center border-t border-slate-800 pt-4">
                  No head-to-head history yet
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
