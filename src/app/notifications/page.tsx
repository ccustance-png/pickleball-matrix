import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getTabRows,
  getFriendsForPlayer,
  getAllMatches,
  getMatchNotes,
  getAllProfilesMap,
} from '@/lib/sheets';
import NotificationsView from '@/components/NotificationsView';

export const revalidate = 0;

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🔔</p>
        <h1 className="text-xl font-bold text-slate-100 mb-2">Your Inbox</h1>
        <p className="text-slate-400 text-sm">Sign in to see your friend requests and match activity.</p>
      </div>
    );
  }

  // Resolve claimed player name
  const profileRows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const profileRow = profileRows.slice(1).find(
    r => (r[3] ?? '').toString().trim() === session.user!.email,
  );
  const myPlayer = profileRow?.[0]?.toString().trim() ?? null;

  if (!myPlayer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🔔</p>
        <h1 className="text-xl font-bold text-slate-100 mb-2">Your Inbox</h1>
        <p className="text-slate-400 text-sm mb-4">Set up your player profile to see notifications.</p>
        <a
          href="/onboarding"
          className="inline-block px-5 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors"
        >
          Set up profile
        </a>
      </div>
    );
  }

  const [friendReqs, matches, profilesMap] = await Promise.all([
    getFriendsForPlayer(myPlayer).catch(() => []),
    getAllMatches().catch(() => []),
    getAllProfilesMap().catch(() => ({})),
  ]);

  // Incoming = requests sent TO me
  const incoming = friendReqs.filter(
    r => r.toPlayer.toUpperCase() === myPlayer.toUpperCase(),
  );
  // Outgoing = requests I sent
  const outgoing = friendReqs.filter(
    r => r.fromPlayer.toUpperCase() === myPlayer.toUpperCase() && r.status === 'ACCEPTED',
  );

  // Recent matches I played in (last 60 days)
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  function parseDate(d: string) {
    if (d.includes('/')) {
      const [m, dy, y] = d.split('/').map(Number);
      return new Date(2000 + (y || 0), (m || 1) - 1, dy || 1).getTime();
    }
    return new Date(d).getTime();
  }

  const myMatches = matches
    .filter(m => {
      const players = m.players.split('/').map(p => p.trim().toUpperCase());
      return players.includes(myPlayer.toUpperCase()) && parseDate(m.date) >= cutoff;
    })
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 50);

  const matchNotes = myMatches.length > 0
    ? await getMatchNotes(myMatches.map(m => m.matchId)).catch(() => ({}))
    : {};

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Inbox</h1>
        <p className="text-slate-400 text-sm mt-1">Friend requests &amp; matches you played in</p>
      </div>
      <NotificationsView
        myPlayer={myPlayer}
        incoming={incoming}
        outgoing={outgoing}
        myMatches={myMatches}
        matchNotes={matchNotes}
        profilesMap={profilesMap}
      />
    </div>
  );
}
