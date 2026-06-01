const SCRIPT_URL = process.env.APPS_SCRIPT_URL;

function scriptUrl() {
  if (!SCRIPT_URL) throw new Error('APPS_SCRIPT_URL is not set in .env.local');
  return SCRIPT_URL;
}

export type MatchRow = {
  matchId: number;
  date: string;
  bracket: string;
  type: string;
  team1: string;
  team2: string;
  win: string;
  loss: string;
  team1Score: number;
  team2Score: number;
  players: string;
};

function formatDate(raw: string): string {
  if (!raw) return '';
  if (raw.includes('T')) {
    const d = new Date(raw);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${String(d.getUTCFullYear()).slice(2)}`;
  }
  return raw;
}

export async function getAllMatches(): Promise<MatchRow[]> {
  const url = `${scriptUrl()}?action=getMatches`;
  const res = await fetch(url, { next: { revalidate: 15 } });
  if (!res.ok) throw new Error(`Script error: ${res.status}`);
  const rows: string[][] = await res.json();
  return rows
    .slice(1)
    .filter((r) => r[0] && r[3])  // must have matchId AND type (SINGLES/DOUBLES)
    .map((r) => ({
      matchId: Number(r[0]),
      date: formatDate(r[1] ?? ''),
      bracket: r[2] ?? '',
      type: r[3] ?? '',
      team1: r[4] ?? '',
      team2: r[5] ?? '',
      win: r[6] ?? '',
      loss: r[7] ?? '',
      team1Score: Number(r[8]) || 0,
      team2Score: Number(r[9]) || 0,
      players: r[10] ?? '',
    }));
}

export async function appendMatch(match: Omit<MatchRow, 'matchId'>): Promise<number> {
  const res = await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify(match),
  });
  if (!res.ok) throw new Error(`Script error: ${res.status}`);
  const data = await res.json();
  return data.matchId;
}

export async function getTabRows(tabName: string): Promise<string[][]> {
  try {
    const url = `${scriptUrl()}?action=getTab&tab=${encodeURIComponent(tabName)}`;
    const res = await fetch(url, { next: { revalidate: 15 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export type PlayerProfile = { player: string; photoUrl: string; bio: string; googleEmail: string };

export async function getProfile(name: string): Promise<PlayerProfile | null> {
  try {
    const url = `${scriptUrl()}?action=getProfile&player=${encodeURIComponent(name)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!data.player) return null;
    return data as PlayerProfile;
  } catch {
    return null;
  }
}

export async function upsertProfile(player: string, photoUrl: string, bio: string): Promise<void> {
  await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({ action: 'upsertProfile', player, photoUrl, bio }),
  });
}

export type EloEntry = { name: string; elo: number };

export async function getEloRankings(): Promise<{ singles: EloEntry[]; doubles: EloEntry[] }> {
  const rows = await getTabRows('ELO');
  const data = rows.slice(1); // skip header

  const singles: EloEntry[] = data
    .filter((r) => r[0] && r[1] && !isNaN(Number(r[1])))
    .map((r) => ({ name: String(r[0]), elo: Number(r[1]) }))
    .sort((a, b) => b.elo - a.elo);

  const doubles: EloEntry[] = data
    .filter((r) => r[3] && r[4] && !isNaN(Number(r[4])))
    .map((r) => ({ name: String(r[3]), elo: Number(r[4]) }))
    .sort((a, b) => b.elo - a.elo);

  return { singles, doubles };
}

export type MatchNote = { matchId: number; photoUrl: string; location: string; description: string };

export type MatchComment = {
  commentId: string;
  matchId: number;
  authorEmail: string;
  authorName: string;
  text: string;
  timestamp: string;
};

export async function getMatchComments(matchId: number): Promise<MatchComment[]> {
  try {
    const url = `${scriptUrl()}?action=getMatchComments&matchId=${matchId}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function addMatchComment(
  matchId: number,
  authorEmail: string,
  authorName: string,
  text: string
): Promise<void> {
  await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({
      action: 'addMatchComment',
      matchId,
      authorEmail,
      authorName,
      text,
      timestamp: new Date().toISOString(),
    }),
  });
}

export async function getMatchNotes(matchIds: number[]): Promise<Record<number, MatchNote>> {
  try {
    if (matchIds.length === 0) return {};
    const url = `${scriptUrl()}?action=getMatchNotes&ids=${matchIds.join(',')}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return data as Record<number, MatchNote>;
  } catch {
    return {};
  }
}

export async function getAllMatchNotes(): Promise<MatchNote[]> {
  try {
    const url = `${scriptUrl()}?action=getAllMatchNotes`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveMatchNote(note: MatchNote): Promise<void> {
  await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({ action: 'saveMatchNote', ...note }),
  });
}

export function tabToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const [headers, ...data] = rows;
  return data.map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  );
}
