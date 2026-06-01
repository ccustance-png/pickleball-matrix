import { getAllMatches, getAllMatchNotes } from '@/lib/sheets';
import MatchActivityCard from '@/components/MatchActivityCard';

export const revalidate = 15;

export default async function ActivitiesPage() {
  const [matches, notes] = await Promise.all([
    getAllMatches().catch(() => []),
    getAllMatchNotes().catch(() => []),
  ]);

  // Build a lookup map of matchId -> note
  const noteMap = Object.fromEntries(notes.map((n) => [n.matchId, n]));

  // Only show matches that have at least one enriched field
  const activities = [...matches]
    .reverse()
    .filter((m) => {
      const note = noteMap[m.matchId];
      return note && (note.photoUrl || note.location || note.description);
    });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Activities</h1>
        <p className="text-slate-400 text-sm mt-1">Recent match activity from the group</p>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-4">📸</p>
          <p className="font-semibold text-lg">No activities yet</p>
          <p className="text-sm mt-2">Add a photo, location, or description when logging a match and it'll show up here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {activities.map((m) => (
            <MatchActivityCard
              key={m.matchId}
              match={m}
              note={noteMap[m.matchId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
