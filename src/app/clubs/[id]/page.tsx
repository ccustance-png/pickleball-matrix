import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getClubs, getAllClubMembers, getAllMatches, getAllProfilesMap } from '@/lib/sheets';
import JoinClubButton from '@/components/JoinClubButton';

export const revalidate = 15;

function parseMatchDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map(Number);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  return new Date(2000 + y, m - 1, d);
}

export default async function ClubDetailPage({ params }: { params: { id: string } }) {
  const [clubs, allMembers, matches, profilesMap] = await Promise.all([
    getClubs().catch(() => []),
    getAllClubMembers().catch(() => []),
    getAllMatches().catch(() => []),
    getAllProfilesMap().catch(() => ({} as Record<string, import('@/lib/sheets').PlayerProfile>)),
  ]);

  const club = clubs.find(c => c.clubId === params.id);
  if (!club) return notFound();

  const members = allMembers.filter(m => m.clubId === params.id);
  const memberNameSet = new Set(members.map(m => m.playerName.toUpperCase()));

  // Weekly leaderboard: wins in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyWins: Record<string, number> = {};
  for (const match of matches) {
    const matchDate = parseMatchDate(match.date);
    if (!matchDate || matchDate < weekAgo) continue;
    const winners = match.win.split('/').map(p => p.trim().toUpperCase());
    for (const w of winners) {
      if (memberNameSet.has(w)) {
        weeklyWins[w] = (weeklyWins[w] || 0) + 1;
      }
    }
  }

  const leaderboard = members
    .map(m => ({ ...m, wins: weeklyWins[m.playerName.toUpperCase()] || 0 }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

  // Recent matches with any club member
  const recentMatches = matches
    .filter(m => {
      const players = m.players.split('/').map(p => p.trim().toUpperCase());
      return players.some(p => memberNameSet.has(p));
    })
    .slice(-10)
    .reverse();

  const rankBadge = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `${i + 1}.`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/clubs" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        All Clubs
      </Link>

      {/* Cover banner */}
      <div
        className="h-40 w-full rounded-xl overflow-hidden mb-6 bg-gradient-to-br from-lime-500/30 to-emerald-600/20 relative"
        style={club.photoUrl ? { backgroundImage: `url(${club.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <div className="absolute inset-0 bg-slate-900/30" />
      </div>

      {/* Club info */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{club.name}</h1>
          {club.location && (
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {club.location}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-0.5">{members.length} {members.length === 1 ? 'member' : 'members'}</p>
          {club.description && (
            <p className="text-slate-300 text-sm mt-3 leading-relaxed">{club.description}</p>
          )}
        </div>
        <div className="shrink-0">
          <JoinClubButton clubId={club.clubId} />
        </div>
      </div>

      <div className="space-y-8">
        {/* Weekly leaderboard */}
        <section>
          <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
            <span>📊</span> This Week&apos;s Leaderboard
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-slate-500 text-sm">No members yet.</p>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              {leaderboard.map((m, i) => {
                const profile = profilesMap[m.playerName.toUpperCase()];
                const displayName = profile?.firstName && profile?.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : m.playerName;
                return (
                  <div
                    key={m.playerName}
                    className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 last:border-0"
                  >
                    <span className="w-7 text-center text-sm font-bold text-slate-400">{rankBadge(i)}</span>
                    {profile?.photoUrl ? (
                      <Image
                        src={profile.photoUrl}
                        alt={displayName}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
                        {displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <Link
                      href={`/players/${encodeURIComponent(m.playerName)}`}
                      className="flex-1 font-medium text-slate-100 hover:text-lime-400 transition-colors"
                    >
                      {displayName}
                    </Link>
                    <span className={`text-sm font-semibold ${m.wins > 0 ? 'text-lime-400' : 'text-slate-500'}`}>
                      {m.wins}W
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent matches */}
        <section>
          <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
            <span>🎾</span> Recent Matches
          </h2>
          {recentMatches.length === 0 ? (
            <p className="text-slate-500 text-sm">No matches yet — go play!</p>
          ) : (
            <div className="space-y-2">
              {recentMatches.map(m => (
                <div
                  key={m.matchId}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-semibold text-lime-400">{m.win}</span>
                      <span className="text-slate-500 text-xs">def.</span>
                      <span className="text-slate-300">{m.loss}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {m.date} · {m.team1Score}–{m.team2Score} · {m.type}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">{m.bracket}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Member roster */}
        <section>
          <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
            <span>👥</span> Members
          </h2>
          {members.length === 0 ? (
            <p className="text-slate-500 text-sm">No members yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map(m => {
                const profile = profilesMap[m.playerName.toUpperCase()];
                const displayName = profile?.firstName && profile?.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : m.playerName;
                return (
                  <Link
                    key={m.playerName}
                    href={`/players/${encodeURIComponent(m.playerName)}`}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full transition-colors"
                  >
                    {profile?.photoUrl ? (
                      <Image
                        src={profile.photoUrl}
                        alt={displayName}
                        width={24}
                        height={24}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 text-xs font-bold">
                        {displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-slate-300">{displayName}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
