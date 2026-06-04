import { getAllMatches, getAllMatchNotes } from '@/lib/sheets';
import type { MatchRow, MatchNote } from '@/lib/sheets';
import MatchActivityCard from '@/components/MatchActivityCard';
import SessionActivityCard from '@/components/SessionActivityCard';

export const revalidate = 15;

const SID_RE = /^__sid:(\d+)__$/;

function parseDate(d: string): number {
  if (d.includes('/')) {
    const [m, dy, y] = d.split('/').map(Number);
    return new Date(2000 + (y || 0), (m || 1) - 1, dy || 1).getTime();
  }
  return new Date(d).getTime();
}

export default async function ActivitiesPage() {
  const [matches, notes] = await Promise.all([
    getAllMatches().catch(() => []),
    getAllMatchNotes().catch(() => []),
  ]);

  const matchMap: Record<number, MatchRow> = {};
  matches.forEach((m) => { matchMap[m.matchId] = m; });

  const noteMap: Record<number, MatchNote> = {};
  notes.forEach((n) => { noteMap[n.matchId] = n; });

  // Find all session-linked notes (__sid:xxx__)
  const linkedToAnchor = new Map<number, number>(); // linkedMatchId → anchorMatchId
  for (const note of notes) {
    const m = note.description?.match(SID_RE);
    if (m) linkedToAnchor.set(note.matchId, Number(m[1]));
  }

  // Build session groups: anchorId → all linked MatchRows
  const sessionGroups = new Map<number, MatchRow[]>();
  for (const [linkedId, anchorId] of Array.from(linkedToAnchor)) {
    if (!sessionGroups.has(anchorId)) sessionGroups.set(anchorId, []);
    const m = matchMap[linkedId];
    if (m) sessionGroups.get(anchorId)!.push(m);
  }

  // Build activity items — rich (session/standalone with notes) + plain (no note)
  type Item =
    | { kind: 'session'; anchor: MatchRow; note: MatchNote; matches: MatchRow[] }
    | { kind: 'standalone'; match: MatchRow; note: MatchNote }
    | { kind: 'plain'; match: MatchRow };

  const items: Item[] = [];
  const shownMatchIds = new Set<number>();

  // First: note-based items (sessions and standalones that have real content)
  for (const note of notes) {
    // Skip session-linked back-references (they're folded into the session card)
    if (SID_RE.test(note.description ?? '')) continue;

    const match = matchMap[note.matchId];
    if (!match) continue;

    const hasContent = note.photoUrl || note.location || note.description;
    if (!hasContent) continue;

    const linked = sessionGroups.get(note.matchId) ?? [];
    const allMatches = [match, ...linked].sort((a, b) => a.matchId - b.matchId);
    allMatches.forEach((m) => shownMatchIds.add(m.matchId));

    if (linked.length > 0) {
      items.push({ kind: 'session', anchor: match, note, matches: allMatches });
    } else {
      items.push({ kind: 'standalone', match, note });
    }
  }

  // Second: plain matches from the last 30 days with no rich note
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const match of matches) {
    if (shownMatchIds.has(match.matchId)) continue;
    if (parseDate(match.date) < thirtyDaysAgo) continue;
    items.push({ kind: 'plain', match });
  }

  // Sort newest first
  items.sort((a, b) => {
    const da = a.kind === 'session' ? a.anchor.date : a.match.date;
    const db = b.kind === 'session' ? b.anchor.date : b.match.date;
    return parseDate(db) - parseDate(da);
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Activities</h1>
        <p className="text-slate-400 text-sm mt-1">Recent sessions &amp; matches from the group</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-4">📸</p>
          <p className="font-semibold text-lg">No activities yet</p>
          <p className="text-sm mt-2">Add a photo, location, or description when logging a session.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            if (item.kind === 'session') {
              return (
                <SessionActivityCard
                  key={item.anchor.matchId}
                  anchorMatch={item.anchor}
                  note={item.note}
                  matches={item.matches}
                />
              );
            }
            if (item.kind === 'standalone') {
              return (
                <MatchActivityCard
                  key={item.match.matchId}
                  match={item.match}
                  note={item.note}
                />
              );
            }
            // Plain match — no note, just the result
            return (
              <MatchActivityCard
                key={item.match.matchId}
                match={item.match}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
