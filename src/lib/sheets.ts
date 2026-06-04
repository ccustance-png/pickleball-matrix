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

export type PlayerProfile = {
  player: string;
  photoUrl: string;
  bio: string;
  googleEmail: string;
  firstName?: string;
  lastName?: string;
};

/** Returns "First Last" if set, otherwise falls back to the raw username. */
export function getDisplayName(username: string, profile?: PlayerProfile | null): string {
  if (profile?.firstName && profile?.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  return username;
}

/** Build a username → profile map from the PROFILES tab in one call. */
export async function getAllProfilesMap(): Promise<Record<string, PlayerProfile>> {
  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const map: Record<string, PlayerProfile> = {};
  rows.slice(1).forEach(row => {
    if (!row[0]) return;
    const key = row[0].toString().trim().toUpperCase();
    map[key] = {
      player:     row[0]?.toString().trim() ?? '',
      photoUrl:   row[1]?.toString() ?? '',
      bio:        row[2]?.toString() ?? '',
      googleEmail:row[3]?.toString() ?? '',
      firstName:  row[4]?.toString() ?? '',
      lastName:   row[5]?.toString() ?? '',
    };
  });
  return map;
}

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

export async function upsertProfile(
  player: string,
  photoUrl: string,
  bio: string,
  firstName?: string,
  lastName?: string,
): Promise<void> {
  await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({ action: 'upsertProfile', player, photoUrl, bio, firstName, lastName }),
  });
}

export type EloEntry = { name: string; elo: number };

export async function getEloRankings(): Promise<{ singles: EloEntry[]; doubles: EloEntry[] }> {
  const rows = await getTabRows('ELO');
  const data = rows.slice(1); // skip header

  // Deduplicate by name (case-insensitive) keeping highest ELO.
  // Duplicates can appear when updateElo() runs concurrently in Apps Script.
  const singlesMap = new Map<string, EloEntry>();
  const doublesMap = new Map<string, EloEntry>();

  for (const r of data) {
    if (r[0] && r[1] && !isNaN(Number(r[1]))) {
      const name = String(r[0]).trim();
      const elo  = Number(r[1]);
      const key  = name.toUpperCase();
      if (!singlesMap.has(key) || singlesMap.get(key)!.elo < elo) {
        singlesMap.set(key, { name, elo });
      }
    }
    if (r[3] && r[4] && !isNaN(Number(r[4]))) {
      const name = String(r[3]).trim();
      const elo  = Number(r[4]);
      const key  = name.toUpperCase();
      if (!doublesMap.has(key) || doublesMap.get(key)!.elo < elo) {
        doublesMap.set(key, { name, elo });
      }
    }
  }

  const singles = Array.from(singlesMap.values()).sort((a, b) => b.elo - a.elo);
  const doubles = Array.from(doublesMap.values()).sort((a, b) => b.elo - a.elo);

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

export type Challenge = {
  challengeId: string;
  fromPlayer: string;
  fromEmail: string;
  toPlayer: string;
  type: 'SINGLES' | 'DOUBLES';
  message: string;
  status: 'OPEN' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  createdAt: string;
};

export async function getChallenges(): Promise<Challenge[]> {
  try {
    const url = `${scriptUrl()}?action=getChallenges`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createChallenge(
  fromPlayer: string,
  fromEmail: string,
  toPlayer: string,
  type: string,
  message: string
): Promise<{ challengeId: string }> {
  const res = await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({ action: 'createChallenge', fromPlayer, fromEmail, toPlayer, type, message }),
  });
  return res.json();
}

export async function updateChallengeStatus(
  challengeId: string,
  status: string
): Promise<void> {
  await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({ action: 'updateChallenge', challengeId, status }),
  });
}

export type DinkEntry = {
  matchId: number;
  userEmail: string;
  userName: string;
  timestamp: string;
};

export async function getMatchDinks(matchId: number): Promise<DinkEntry[]> {
  try {
    const url = `${scriptUrl()}?action=getDinks&matchId=${matchId}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function toggleMatchDink(
  matchId: number,
  userEmail: string,
  userName: string
): Promise<{ dinked: boolean }> {
  const res = await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({ action: 'toggleDink', matchId, userEmail, userName }),
  });
  return res.json();
}

export async function deleteMatch(matchId: number): Promise<void> {
  await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteMatch', matchId }),
  });
}

export async function updateMatch(match: MatchRow): Promise<void> {
  await fetch(scriptUrl(), {
    method: 'POST',
    body: JSON.stringify({ action: 'updateMatch', ...match }),
  });
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
