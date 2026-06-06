import { getSupabaseAdmin } from './supabase';
import { applySingles, applyDoubles } from './elo';

const db = () => getSupabaseAdmin();

// ─── Types (same shape as sheets.ts so all imports are drop-in replacements) ───

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

export type PlayerProfile = {
  player: string;
  photoUrl: string;
  bio: string;
  googleEmail: string;
  firstName?: string;
  lastName?: string;
  location?: string;
};

export type EloEntry = { name: string; elo: number };

export type MatchNote = {
  matchId: number;
  photoUrl: string;
  location: string;
  description: string;
};

export type MatchComment = {
  commentId: string;
  matchId: number;
  authorEmail: string;
  authorName: string;
  text: string;
  timestamp: string;
};

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

export type DinkEntry = {
  matchId: number;
  userEmail: string;
  userName: string;
  timestamp: string;
};

export type FriendRequest = {
  requestId: string;
  fromPlayer: string;
  toPlayer: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
};

export type DirectMessage = {
  messageId: string;
  fromPlayer: string;
  toPlayer: string;
  text: string;
  timestamp: string;
  read: string;
};

export type Club = {
  clubId: string;
  name: string;
  description: string;
  location: string;
  photoUrl: string;
  createdBy: string;
  createdAt: string;
};

export type ClubMember = {
  clubId: string;
  playerName: string;
  joinedAt: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getDisplayName(username: string, profile?: PlayerProfile | null): string {
  if (profile?.firstName && profile?.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  return username;
}

// tabToObjects kept for any remaining callers
export function tabToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const [headers, ...data] = rows;
  return data.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])));
}

// ─── Matches ─────────────────────────────────────────────────────────────────

function rowToMatch(r: Record<string, unknown>): MatchRow {
  return {
    matchId:    Number(r.id),
    date:       String(r.date ?? ''),
    bracket:    String(r.bracket ?? ''),
    type:       String(r.type ?? ''),
    team1:      String(r.team1 ?? ''),
    team2:      String(r.team2 ?? ''),
    win:        String(r.win ?? ''),
    loss:       String(r.loss ?? ''),
    team1Score: Number(r.team1_score ?? 0),
    team2Score: Number(r.team2_score ?? 0),
    players:    String(r.players ?? ''),
  };
}

export async function getAllMatches(): Promise<MatchRow[]> {
  const { data, error } = await db()
    .from('matches')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToMatch);
}

export async function appendMatch(match: Omit<MatchRow, 'matchId'>): Promise<number> {
  const { data, error } = await db()
    .from('matches')
    .insert({
      date:        match.date,
      bracket:     match.bracket,
      type:        match.type,
      team1:       match.team1,
      team2:       match.team2,
      win:         match.win,
      loss:        match.loss,
      team1_score: match.team1Score,
      team2_score: match.team2Score,
      players:     match.players,
    })
    .select('id')
    .single();
  if (error) throw error;

  // Update ELO incrementally
  await updateEloForMatch(match);

  return data.id;
}

export async function updateMatch(match: MatchRow): Promise<void> {
  const { error } = await db()
    .from('matches')
    .update({
      date:        match.date,
      bracket:     match.bracket,
      type:        match.type,
      team1:       match.team1,
      team2:       match.team2,
      win:         match.win,
      loss:        match.loss,
      team1_score: match.team1Score,
      team2_score: match.team2Score,
      players:     match.players,
    })
    .eq('id', match.matchId);
  if (error) throw error;
  // Recalculate ELO from scratch after an edit (matches may have changed outcome)
  await recalculateAllElo();
}

export async function deleteMatch(matchId: number): Promise<void> {
  const { error } = await db().from('matches').delete().eq('id', matchId);
  if (error) throw error;
  await recalculateAllElo();
}

// ─── ELO ─────────────────────────────────────────────────────────────────────

async function updateEloForMatch(match: Omit<MatchRow, 'matchId'>): Promise<void> {
  const type = match.type.toUpperCase();
  if (type === 'CASUAL') return;

  const t1 = match.team1.toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
  const t2 = match.team2.toUpperCase().split('/').map(p => p.trim()).filter(Boolean);
  if (!t1.length || !t2.length) return;

  const players = [...t1, ...t2];
  const eloType = type === 'SINGLES' ? 'singles' : 'doubles';

  // Fetch current ELO for all players in this match
  const { data: existing } = await db()
    .from('elo_ratings')
    .select('player_name, elo')
    .in('player_name', players)
    .eq('type', eloType);

  const eloMap: Record<string, number> = {};
  (existing ?? []).forEach(r => { eloMap[r.player_name] = Number(r.elo); });

  const margin = Math.abs(match.team1Score - match.team2Score);
  const winStr = match.win.toUpperCase();
  const t1Won = winStr === t1.join('/') || (t1.length === 1 && winStr === t1[0]);

  if (type === 'SINGLES' && t1.length === 1 && t2.length === 1) {
    applySingles(eloMap, t1[0], t2[0], t1Won, margin);
  } else if (type === 'DOUBLES') {
    applyDoubles(eloMap, t1, t2, t1Won, margin);
  }

  // Upsert updated ELO values
  const upserts = players.map(p => ({
    player_name: p,
    type:        eloType,
    elo:         Math.round(eloMap[p] ?? 1000),
    updated_at:  new Date().toISOString(),
  }));

  await db().from('elo_ratings').upsert(upserts, { onConflict: 'player_name,type' });
}

async function recalculateAllElo(): Promise<void> {
  const matches = await getAllMatches();
  const { recalculateElo } = await import('./elo');
  const { singles, doubles } = recalculateElo(
    matches.map(m => ({
      type:        m.type,
      team1:       m.team1,
      team2:       m.team2,
      win:         m.win,
      team1_score: m.team1Score,
      team2_score: m.team2Score,
    })),
  );

  const upserts = [
    ...Object.entries(singles).map(([p, e]) => ({ player_name: p, type: 'singles', elo: Math.round(e), updated_at: new Date().toISOString() })),
    ...Object.entries(doubles).map(([p, e]) => ({ player_name: p, type: 'doubles', elo: Math.round(e), updated_at: new Date().toISOString() })),
  ];

  if (upserts.length) {
    await db().from('elo_ratings').upsert(upserts, { onConflict: 'player_name,type' });
  }
}

export async function getEloRankings(): Promise<{ singles: EloEntry[]; doubles: EloEntry[] }> {
  const { data, error } = await db()
    .from('elo_ratings')
    .select('player_name, type, elo')
    .order('elo', { ascending: false });
  if (error) throw error;

  const singles = (data ?? []).filter(r => r.type === 'singles').map(r => ({ name: r.player_name, elo: Number(r.elo) }));
  const doubles = (data ?? []).filter(r => r.type === 'doubles').map(r => ({ name: r.player_name, elo: Number(r.elo) }));
  return { singles, doubles };
}

// ─── Profiles ────────────────────────────────────────────────────────────────

function rowToProfile(r: Record<string, unknown>): PlayerProfile {
  return {
    player:      String(r.name ?? ''),
    photoUrl:    String(r.photo_url ?? ''),
    bio:         String(r.bio ?? ''),
    googleEmail: String(r.google_email ?? ''),
    firstName:   String(r.first_name ?? ''),
    lastName:    String(r.last_name ?? ''),
    location:    String(r.location ?? ''),
  };
}

export async function getAllProfilesMap(): Promise<Record<string, PlayerProfile>> {
  const { data, error } = await db().from('players').select('*');
  if (error) throw error;
  const map: Record<string, PlayerProfile> = {};
  (data ?? []).forEach(r => {
    map[r.name.toUpperCase()] = rowToProfile(r);
  });
  return map;
}

export async function getProfile(name: string): Promise<PlayerProfile | null> {
  const { data } = await db()
    .from('players')
    .select('*')
    .ilike('name', name)
    .maybeSingle();
  return data ? rowToProfile(data) : null;
}

export async function upsertProfile(
  player: string,
  photoUrl: string,
  bio: string,
  firstName?: string,
  lastName?: string,
  location?: string,
): Promise<void> {
  const { error } = await db().from('players').upsert({
    name:       player.toUpperCase(),
    photo_url:  photoUrl,
    bio:        bio,
    first_name: firstName ?? '',
    last_name:  lastName ?? '',
    location:   location ?? '',
  }, { onConflict: 'name' });
  if (error) throw error;
}

export async function getPlayerByEmail(email: string): Promise<PlayerProfile | null> {
  const { data } = await db()
    .from('players')
    .select('*')
    .eq('google_email', email)
    .maybeSingle();
  return data ? rowToProfile(data) : null;
}

export async function claimPlayer(playerName: string, email: string): Promise<void> {
  const { error } = await db()
    .from('players')
    .update({ google_email: email })
    .ilike('name', playerName);
  if (error) throw error;
}

export async function createPlayer(name: string, email: string): Promise<void> {
  const { error } = await db().from('players').insert({
    name:         name.toUpperCase(),
    google_email: email,
  });
  if (error) throw error;
}

export async function renamePlayer(oldName: string, newName: string): Promise<void> {
  // Supabase doesn't support cascading text FK updates, so we handle each table.
  // All names are stored uppercase.
  const old = oldName.toUpperCase();
  const next = newName.toUpperCase();

  await Promise.all([
    db().from('players').update({ name: next }).eq('name', old),
    db().from('elo_ratings').update({ player_name: next }).eq('player_name', old),
    db().from('matches').update({ team1: next }).eq('team1', old),
    db().from('matches').update({ team2: next }).eq('team2', old),
    db().from('matches').update({ win: next }).eq('win', old),
    db().from('matches').update({ loss: next }).eq('loss', old),
    db().from('friend_requests').update({ from_player: next }).eq('from_player', old),
    db().from('friend_requests').update({ to_player: next }).eq('to_player', old),
    db().from('messages').update({ from_player: next }).eq('from_player', old),
    db().from('messages').update({ to_player: next }).eq('to_player', old),
    db().from('clubs').update({ created_by: next }).eq('created_by', old),
    db().from('club_members').update({ player_name: next }).eq('player_name', old),
    db().from('push_subscriptions').update({ player_name: next }).eq('player_name', old),
  ]);
}

// ─── Match notes ─────────────────────────────────────────────────────────────

export async function getMatchNotes(matchIds: number[]): Promise<Record<number, MatchNote>> {
  if (!matchIds.length) return {};
  const { data } = await db().from('match_notes').select('*').in('match_id', matchIds);
  const result: Record<number, MatchNote> = {};
  (data ?? []).forEach(r => {
    result[r.match_id] = {
      matchId:     r.match_id,
      photoUrl:    r.photo_url,
      location:    r.location,
      description: r.description,
    };
  });
  return result;
}

export async function getAllMatchNotes(): Promise<MatchNote[]> {
  const { data } = await db().from('match_notes').select('*');
  return (data ?? []).map(r => ({
    matchId:     r.match_id,
    photoUrl:    r.photo_url,
    location:    r.location,
    description: r.description,
  }));
}

export async function saveMatchNote(note: MatchNote): Promise<void> {
  const { error } = await db().from('match_notes').upsert({
    match_id:    note.matchId,
    photo_url:   note.photoUrl,
    location:    note.location,
    description: note.description,
  }, { onConflict: 'match_id' });
  if (error) throw error;
}

// ─── Match comments ───────────────────────────────────────────────────────────

export async function getMatchComments(matchId: number): Promise<MatchComment[]> {
  const { data } = await db()
    .from('match_comments')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  return (data ?? []).map(r => ({
    commentId:   r.id,
    matchId:     r.match_id,
    authorEmail: r.author_email,
    authorName:  r.author_name,
    text:        r.text,
    timestamp:   r.created_at,
  }));
}

export async function addMatchComment(
  matchId: number,
  authorEmail: string,
  authorName: string,
  text: string,
): Promise<void> {
  const { error } = await db().from('match_comments').insert({ match_id: matchId, author_email: authorEmail, author_name: authorName, text });
  if (error) throw error;
}

// ─── Match dinks ──────────────────────────────────────────────────────────────

export async function getMatchDinks(matchId: number): Promise<DinkEntry[]> {
  const { data } = await db().from('match_dinks').select('*').eq('match_id', matchId);
  return (data ?? []).map(r => ({
    matchId:   r.match_id,
    userEmail: r.user_email,
    userName:  r.user_name,
    timestamp: r.created_at,
  }));
}

export async function toggleMatchDink(
  matchId: number,
  userEmail: string,
  userName: string,
): Promise<{ dinked: boolean }> {
  const { data: existing } = await db()
    .from('match_dinks')
    .select('match_id')
    .eq('match_id', matchId)
    .eq('user_email', userEmail)
    .maybeSingle();

  if (existing) {
    await db().from('match_dinks').delete().eq('match_id', matchId).eq('user_email', userEmail);
    return { dinked: false };
  }
  await db().from('match_dinks').insert({ match_id: matchId, user_email: userEmail, user_name: userName });
  return { dinked: true };
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export async function getChallenges(): Promise<Challenge[]> {
  const { data } = await db().from('challenges').select('*').order('created_at', { ascending: false });
  return (data ?? []).map(r => ({
    challengeId: r.id,
    fromPlayer:  r.from_player,
    fromEmail:   r.from_email,
    toPlayer:    r.to_player,
    type:        r.type as Challenge['type'],
    message:     r.message,
    status:      r.status as Challenge['status'],
    createdAt:   r.created_at,
  }));
}

export async function createChallenge(
  fromPlayer: string,
  fromEmail: string,
  toPlayer: string,
  type: string,
  message: string,
): Promise<{ challengeId: string }> {
  const { data, error } = await db()
    .from('challenges')
    .insert({ from_player: fromPlayer, from_email: fromEmail, to_player: toPlayer, type, message })
    .select('id')
    .single();
  if (error) throw error;
  return { challengeId: data.id };
}

export async function updateChallengeStatus(challengeId: string, status: string): Promise<void> {
  const { error } = await db().from('challenges').update({ status }).eq('id', challengeId);
  if (error) throw error;
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export async function getFriendsForPlayer(playerName: string): Promise<FriendRequest[]> {
  const upper = playerName.toUpperCase();
  const { data } = await db()
    .from('friend_requests')
    .select('*')
    .or(`from_player.eq.${upper},to_player.eq.${upper}`)
    .order('created_at', { ascending: false });
  return (data ?? []).map(r => ({
    requestId:  r.id,
    fromPlayer: r.from_player,
    toPlayer:   r.to_player,
    status:     r.status as FriendRequest['status'],
    createdAt:  r.created_at,
  }));
}

export async function sendFriendRequest(
  fromPlayer: string,
  toPlayer: string,
): Promise<{ requestId: string }> {
  const { data, error } = await db()
    .from('friend_requests')
    .insert({ from_player: fromPlayer.toUpperCase(), to_player: toPlayer.toUpperCase() })
    .select('id')
    .single();
  if (error) throw error;
  return { requestId: data.id };
}

export async function updateFriendRequest(
  requestId: string,
  status: 'ACCEPTED' | 'DECLINED',
): Promise<void> {
  const { error } = await db().from('friend_requests').update({ status }).eq('id', requestId);
  if (error) throw error;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessagesForPlayer(playerName: string): Promise<DirectMessage[]> {
  const upper = playerName.toUpperCase();
  const { data } = await db()
    .from('messages')
    .select('*')
    .or(`from_player.eq.${upper},to_player.eq.${upper}`)
    .order('created_at', { ascending: true });
  return (data ?? []).map(r => ({
    messageId:  r.id,
    fromPlayer: r.from_player,
    toPlayer:   r.to_player,
    text:       r.text,
    timestamp:  r.created_at,
    read:       r.read ? 'true' : 'false',
  }));
}

export async function sendDirectMessage(
  fromPlayer: string,
  toPlayer: string,
  text: string,
): Promise<{ messageId: string }> {
  const { data, error } = await db()
    .from('messages')
    .insert({ from_player: fromPlayer.toUpperCase(), to_player: toPlayer.toUpperCase(), text })
    .select('id')
    .single();
  if (error) throw error;
  return { messageId: data.id };
}

export async function markMessagesRead(myPlayer: string, otherPlayer: string): Promise<void> {
  const { error } = await db()
    .from('messages')
    .update({ read: true })
    .eq('to_player', myPlayer.toUpperCase())
    .eq('from_player', otherPlayer.toUpperCase())
    .eq('read', false);
  if (error) throw error;
}

// ─── Clubs ────────────────────────────────────────────────────────────────────

export async function getClubs(): Promise<Club[]> {
  const { data } = await db().from('clubs').select('*').order('created_at', { ascending: false });
  return (data ?? []).map(r => ({
    clubId:      r.id,
    name:        r.name,
    description: r.description,
    location:    r.location,
    photoUrl:    r.photo_url,
    createdBy:   r.created_by,
    createdAt:   r.created_at,
  }));
}

export async function getAllClubMembers(): Promise<ClubMember[]> {
  const { data } = await db().from('club_members').select('*');
  return (data ?? []).map(r => ({
    clubId:     r.club_id,
    playerName: r.player_name,
    joinedAt:   r.joined_at,
  }));
}

export async function createClub(
  name: string,
  description: string,
  location: string,
  photoUrl: string,
  createdBy: string,
): Promise<{ clubId: string }> {
  const { data, error } = await db()
    .from('clubs')
    .insert({ name, description, location, photo_url: photoUrl, created_by: createdBy.toUpperCase() })
    .select('id')
    .single();
  if (error) throw error;
  // Auto-join creator
  await db().from('club_members').insert({ club_id: data.id, player_name: createdBy.toUpperCase() });
  return { clubId: data.id };
}

export async function joinClub(clubId: string, playerName: string): Promise<void> {
  const { error } = await db()
    .from('club_members')
    .upsert({ club_id: clubId, player_name: playerName.toUpperCase() }, { onConflict: 'club_id,player_name' });
  if (error) throw error;
}

export async function leaveClub(clubId: string, playerName: string): Promise<void> {
  const { error } = await db()
    .from('club_members')
    .delete()
    .eq('club_id', clubId)
    .eq('player_name', playerName.toUpperCase());
  if (error) throw error;
}

// ─── Push subscriptions ───────────────────────────────────────────────────────

export async function savePushSubscription(playerName: string, subscription: string): Promise<void> {
  await db().from('push_subscriptions').upsert(
    { player_name: playerName.toUpperCase(), subscription },
    { onConflict: 'player_name,subscription' },
  );
}

export async function getPushSubscriptionsForPlayers(playerNames: string[]): Promise<string[]> {
  const uppers = playerNames.map(n => n.toUpperCase());
  const { data } = await db()
    .from('push_subscriptions')
    .select('subscription')
    .in('player_name', uppers);
  return (data ?? []).map(r => r.subscription);
}

// ─── Legacy compat shims ──────────────────────────────────────────────────────
// These were used in a few API routes via getTabRows. Replaced by direct functions above.

export async function getTabRows(_tabName: string): Promise<string[][]> {
  throw new Error('getTabRows is not available in the Supabase backend — use specific db functions instead.');
}
