// ELO calculation logic — ported from apps-script/Code.gs

function expected(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function movMultiplier(margin: number, exp: number): number {
  return Math.log(Math.abs(margin) + 1) * (2.2 / (exp * 0.001 + 2.2));
}

function dynamicK(elo: number): number {
  if (elo < 1100) return 40;
  if (elo < 1400) return 32;
  if (elo < 1800) return 24;
  return 20;
}

export type EloMap = Record<string, number>;

export function applySingles(
  elo: EloMap,
  p1: string,
  p2: string,
  p1Won: boolean,
  margin: number,
): void {
  const e1 = elo[p1] ?? 1000;
  const e2 = elo[p2] ?? 1000;
  const exp1 = expected(e1, e2);
  const mov = movMultiplier(margin, exp1);
  elo[p1] = (elo[p1] ?? 1000) + dynamicK(e1) * mov * ((p1Won ? 1 : 0) - exp1);
  elo[p2] = (elo[p2] ?? 1000) + dynamicK(e2) * mov * ((p1Won ? 0 : 1) - (1 - exp1));
}

export function applyDoubles(
  elo: EloMap,
  t1: string[],
  t2: string[],
  t1Won: boolean,
  margin: number,
): void {
  const all = [...t1, ...t2];
  all.forEach(p => { if (!elo[p]) elo[p] = 1000; });

  const avg1 = t1.reduce((s, p) => s + (elo[p] ?? 1000), 0) / t1.length;
  const avg2 = t2.reduce((s, p) => s + (elo[p] ?? 1000), 0) / t2.length;
  const exp1 = expected(avg1, avg2);
  const mov = movMultiplier(margin, exp1);
  const o1 = mov * ((t1Won ? 1 : 0) - exp1);
  const o2 = mov * ((t1Won ? 0 : 1) - (1 - exp1));

  function applyTeam(team: string[], outcome: number) {
    if (team.length < 2) {
      team.forEach(p => { elo[p] = (elo[p] ?? 1000) + dynamicK(elo[p] ?? 1000) * outcome; });
      return;
    }
    const es = team.map(p => elo[p] ?? 1000);
    const hi = Math.max(...es);
    const lo = Math.min(...es);
    const prop = lo > 0 ? hi / lo : 1;
    team.forEach(p => {
      const pe = elo[p] ?? 1000;
      const ch = dynamicK(pe) * outcome;
      elo[p] = pe + (pe >= hi ? ch : ch > 0 ? ch * prop : ch / prop);
    });
  }

  applyTeam(t1, o1);
  applyTeam(t2, o2);
}

/** Recalculate all ELO from a full match list (used in migration script). */
export function recalculateElo(matches: Array<{
  type: string;
  team1: string;
  team2: string;
  win: string;
  team1_score: number;
  team2_score: number;
}>): { singles: EloMap; doubles: EloMap } {
  const sElo: EloMap = {};
  const dElo: EloMap = {};

  for (const m of matches) {
    const type = m.type.toUpperCase();
    if (type === 'CASUAL') continue;

    const t1 = m.team1.toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    const t2 = m.team2.toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
    if (!t1.length || !t2.length) continue;

    const margin = Math.abs(m.team1_score - m.team2_score);
    const winStr = m.win.toUpperCase();
    const t1Won = winStr === t1.join('/') || (t1.length === 1 && winStr === t1[0]);

    if (type === 'SINGLES' && t1.length === 1 && t2.length === 1) {
      applySingles(sElo, t1[0], t2[0], t1Won, margin);
    } else if (type === 'DOUBLES') {
      applyDoubles(dElo, t1, t2, t1Won, margin);
    }
  }

  return { singles: sElo, doubles: dElo };
}
