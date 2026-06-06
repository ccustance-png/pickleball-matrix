import type { MatchRow } from '@/lib/sheets';

type Props = {
  matches: MatchRow[];   // ALL matches (not just player's), needed for full ELO replay
  playerName: string;
  type: 'SINGLES' | 'DOUBLES';
};

function dynK(e: number) { return e < 1000 ? 40 : e < 1400 ? 20 : 10; }
function expWin(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
function movMult(margin: number, exp1: number) {
  return 1 + margin * 0.05 * (1 - Math.abs(exp1 - 0.5) * 2);
}

export default function EloChart({ matches, playerName, type }: Props) {
  const name = playerName.toUpperCase();

  // Replay ELO for all players, recording this player's rating after each of their matches
  const elo: Record<string, number> = {};
  const history: { date: string; elo: number }[] = [];

  const relevant = matches.filter(m => m.type === type && m.bracket.toUpperCase() !== 'CASUAL');

  for (const m of relevant) {
    const t1 = m.team1.toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    const t2 = m.team2.toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    if (!t1.length || !t2.length) continue;

    [...t1, ...t2].forEach(p => { if (!elo[p]) elo[p] = 1000; });

    const avg1 = t1.reduce((s, p) => s + elo[p], 0) / t1.length;
    const avg2 = t2.reduce((s, p) => s + elo[p], 0) / t2.length;
    const exp1 = expWin(avg1, avg2);
    const t1Won = m.win.toUpperCase().trim() === m.team1.toUpperCase().trim();
    const margin = Math.abs((m.team1Score || 0) - (m.team2Score || 0));
    const mult = movMult(margin, exp1);

    const applyChange = (players: string[], outcome: number) => {
      if (players.length < 2) {
        players.forEach(p => { elo[p] = (elo[p] || 1000) + dynK(elo[p] || 1000) * mult * outcome; });
        return;
      }
      const es = players.map(p => elo[p] || 1000);
      const hi = Math.max(...es), lo = Math.min(...es), prop = lo > 0 ? hi / lo : 1;
      players.forEach(p => {
        const pe = elo[p] || 1000, ch = dynK(pe) * mult * outcome;
        elo[p] = pe + (pe >= hi ? ch : ch > 0 ? ch * prop : ch / prop);
      });
    };

    applyChange(t1, mult * (t1Won ? 1 - exp1 : -exp1));
    applyChange(t2, mult * (t1Won ? -(1 - exp1) : 1 - exp1));

    const involved = [...t1, ...t2];
    if (involved.includes(name)) {
      history.push({ date: m.date, elo: Math.round(elo[name]) });
    }
  }

  if (history.length < 2) return null;

  // SVG dimensions
  const W = 320, H = 80, PAD = 8;
  const elos = history.map(h => h.elo);
  const minE = Math.min(...elos) - 20;
  const maxE = Math.max(...elos) + 20;
  const range = maxE - minE || 1;

  const px = (i: number) => PAD + (i / (history.length - 1)) * (W - PAD * 2);
  const py = (e: number) => PAD + (1 - (e - minE) / range) * (H - PAD * 2);

  const points = history.map((h, i) => `${px(i)},${py(h.elo)}`).join(' ');
  const areaPoints = `${px(0)},${H} ${points} ${px(history.length - 1)},${H}`;

  const current = history[history.length - 1].elo;
  const start   = history[0].elo;
  const gained  = current - start;
  const isUp    = gained >= 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {type === 'SINGLES' ? 'Singles' : 'Doubles'} ELO History
        </p>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isUp ? 'text-lime-400 bg-lime-500/10' : 'text-red-400 bg-red-500/10'}`}>
          {isUp ? '+' : ''}{gained}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        {/* Area fill */}
        <polygon points={areaPoints} fill={isUp ? 'rgba(132,204,22,0.08)' : 'rgba(239,68,68,0.08)'} />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={isUp ? '#84cc16' : '#ef4444'}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* End dot */}
        <circle cx={px(history.length - 1)} cy={py(current)} r="3" fill={isUp ? '#84cc16' : '#ef4444'} />
      </svg>
      <div className="flex justify-between text-xs text-slate-600 mt-0.5">
        <span>{history[0].date}</span>
        <span>{history.length} games</span>
        <span>{history[history.length - 1].date}</span>
      </div>
    </div>
  );
}
