/**
 * One-time migration: copies all data from Google Sheets (via Apps Script)
 * into Supabase. Run after setting APPS_SCRIPT_URL and SUPABASE_* env vars:
 *
 *   npx tsx scripts/migrate-from-sheets.ts
 */

import { createClient } from '@supabase/supabase-js';
import { recalculateElo } from '../src/lib/elo';

const SCRIPT_URL = process.env.APPS_SCRIPT_URL!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SCRIPT_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars: APPS_SCRIPT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchTab(tab: string): Promise<string[][]> {
  const url = `${SCRIPT_URL}?action=getTab&tab=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${tab}: ${res.status}`);
  return res.json();
}

async function run() {
  console.log('Starting migration from Google Sheets → Supabase\n');

  // ── 1. Profiles ──────────────────────────────────────────────────────────
  console.log('Migrating PROFILES...');
  const profileRows = await fetchTab('PROFILES');
  const players = profileRows.slice(1).filter(r => r[0]).map(r => ({
    name:         r[0].trim().toUpperCase(),
    photo_url:    r[1] ?? '',
    bio:          r[2] ?? '',
    google_email: r[3] || null,
    first_name:   r[4] ?? '',
    last_name:    r[5] ?? '',
    location:     r[6] ?? '',
  }));
  if (players.length) {
    const { error } = await db.from('players').upsert(players, { onConflict: 'name' });
    if (error) throw error;
  }
  console.log(`  ✓ ${players.length} players`);

  // ── 2. Matches ───────────────────────────────────────────────────────────
  console.log('Migrating SCORESHEET (matches)...');
  const matchRows = await fetchTab('SCORESHEET');
  const matches = matchRows.slice(1).filter(r => r[0] && r[3]).map(r => ({
    id:          Number(r[0]),
    date:        r[1] ?? '',
    bracket:     r[2] ?? '',
    type:        r[3] ?? '',
    team1:       r[4] ?? '',
    team2:       r[5] ?? '',
    win:         r[6] ?? '',
    loss:        r[7] ?? '',
    team1_score: Number(r[8]) || 0,
    team2_score: Number(r[9]) || 0,
    players:     r[10] ?? '',
  }));
  if (matches.length) {
    // Insert in batches of 500 to avoid payload limits
    for (let i = 0; i < matches.length; i += 500) {
      const { error } = await db.from('matches').upsert(matches.slice(i, i + 500), { onConflict: 'id' });
      if (error) throw error;
    }
  }
  console.log(`  ✓ ${matches.length} matches`);

  // ── 3. Recalculate ELO from scratch ─────────────────────────────────────
  console.log('Calculating ELO ratings...');
  const { singles, doubles } = recalculateElo(
    matches.map(m => ({
      type: m.type, team1: m.team1, team2: m.team2,
      win: m.win, team1_score: m.team1_score, team2_score: m.team2_score,
    }))
  );
  const eloUpserts = [
    ...Object.entries(singles).map(([p, e]) => ({ player_name: p, type: 'singles', elo: Math.round(e) })),
    ...Object.entries(doubles).map(([p, e]) => ({ player_name: p, type: 'doubles', elo: Math.round(e) })),
  ];
  if (eloUpserts.length) {
    const { error } = await db.from('elo_ratings').upsert(eloUpserts, { onConflict: 'player_name,type' });
    if (error) throw error;
  }
  console.log(`  ✓ ${Object.keys(singles).length} singles ELO, ${Object.keys(doubles).length} doubles ELO`);

  // ── 4. Friends ───────────────────────────────────────────────────────────
  console.log('Migrating FRIENDS...');
  try {
    const friendRows = await fetchTab('FRIENDS');
    const friends = friendRows.slice(1).filter(r => r[0]).map(r => ({
      id:          r[0],
      from_player: r[1] ?? '',
      to_player:   r[2] ?? '',
      status:      r[3] ?? 'PENDING',
      created_at:  r[4] || new Date().toISOString(),
    }));
    if (friends.length) {
      const { error } = await db.from('friend_requests').upsert(friends, { onConflict: 'id' });
      if (error) throw error;
    }
    console.log(`  ✓ ${friends.length} friend requests`);
  } catch (e) { console.log('  ⚠ FRIENDS tab not found, skipping'); }

  // ── 5. Messages ──────────────────────────────────────────────────────────
  console.log('Migrating MESSAGES...');
  try {
    const msgRows = await fetchTab('MESSAGES');
    const msgs = msgRows.slice(1).filter(r => r[0]).map(r => ({
      id:          r[0],
      from_player: r[1] ?? '',
      to_player:   r[2] ?? '',
      text:        r[3] ?? '',
      created_at:  r[4] || new Date().toISOString(),
      read:        r[5] === 'true',
    }));
    if (msgs.length) {
      const { error } = await db.from('messages').upsert(msgs, { onConflict: 'id' });
      if (error) throw error;
    }
    console.log(`  ✓ ${msgs.length} messages`);
  } catch (e) { console.log('  ⚠ MESSAGES tab not found, skipping'); }

  // ── 6. Clubs ─────────────────────────────────────────────────────────────
  console.log('Migrating CLUBS...');
  try {
    const clubRows = await fetchTab('CLUBS');
    const clubs = clubRows.slice(1).filter(r => r[0]).map(r => ({
      id:          r[0],
      name:        r[1] ?? '',
      description: r[2] ?? '',
      location:    r[3] ?? '',
      photo_url:   r[4] ?? '',
      created_by:  r[5] ?? '',
      created_at:  r[6] || new Date().toISOString(),
    }));
    if (clubs.length) {
      const { error } = await db.from('clubs').upsert(clubs, { onConflict: 'id' });
      if (error) throw error;
    }
    console.log(`  ✓ ${clubs.length} clubs`);

    const memberRows = await fetchTab('CLUB_MEMBERS');
    const members = memberRows.slice(1).filter(r => r[0]).map(r => ({
      club_id:     r[0],
      player_name: r[1] ?? '',
      joined_at:   r[2] || new Date().toISOString(),
    }));
    if (members.length) {
      const { error } = await db.from('club_members').upsert(members, { onConflict: 'club_id,player_name' });
      if (error) throw error;
    }
    console.log(`  ✓ ${members.length} club members`);
  } catch (e) { console.log('  ⚠ CLUBS tab not found, skipping'); }

  // ── 7. Push subscriptions ─────────────────────────────────────────────────
  console.log('Migrating PUSH_SUBSCRIPTIONS...');
  try {
    const pushRows = await fetchTab('PUSH_SUBSCRIPTIONS');
    const subs = pushRows.slice(1).filter(r => r[0]).map(r => ({
      player_name:  r[0],
      subscription: r[1] ?? '',
    }));
    if (subs.length) {
      const { error } = await db.from('push_subscriptions').upsert(subs, { onConflict: 'player_name,subscription' });
      if (error) throw error;
    }
    console.log(`  ✓ ${subs.length} push subscriptions`);
  } catch (e) { console.log('  ⚠ PUSH_SUBSCRIPTIONS tab not found, skipping'); }

  console.log('\n✅ Migration complete!');
}

run().catch(err => { console.error('Migration failed:', err); process.exit(1); });
