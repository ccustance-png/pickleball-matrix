import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllMatches, getTabRows, tabToObjects, getProfile, getEloRankings, getMatchNotes } from '@/lib/sheets';
import { computePlayerData } from '@/lib/badges';
import ClaimButton from '@/components/ClaimButton';
import ProfileTabs from '@/components/ProfileTabs';
import PickleJarButton from '@/components/PickleJarButton';

export const revalidate = 15;

function RecordBadge({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 flex-nowrap">
      <span className="text-slate-100 font-bold text-lg whitespace-nowrap shrink-0">{wins}–{losses}</span>
      <div className="h-2 w-20 sm:w-28 bg-slate-800 rounded-full overflow-hidden shrink-0">
        <div className="h-full bg-lime-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
      </div>
      <span className="text-slate-400 text-sm shrink-0">{rate}%</span>
    </div>
  );
}

export default async function PlayerPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName).toUpperCase();

  const [matches, singlesRows, doublesRows, eloRankings, profile, session] = await Promise.all([
    getAllMatches().catch(() => []),
    getTabRows('SINGLES').catch(() => []),
    getTabRows('DOUBLES').catch(() => []),
    getEloRankings().catch(() => ({ singles: [], doubles: [] })),
    getProfile(name),
    getServerSession(authOptions),
  ]);

  const playerMatches = matches.filter((m) =>
    m.players.split('/').map((p) => p.trim()).includes(name)
  );

  if (playerMatches.length === 0 && matches.length > 0) return notFound();

  const matchNotes = await getMatchNotes(playerMatches.map((m) => m.matchId)).catch(() => ({}));
  const { badges: earnedBadges, pickles, pickleLog } = computePlayerData(matches, name, matchNotes);

  const isClaimed = !!profile?.googleEmail;
  const isOwner = !!session?.user?.email && session.user.email === profile?.googleEmail;

  const singlesMatches = playerMatches.filter((m) => m.type === 'SINGLES');
  const doublesMatches = playerMatches.filter((m) => m.type === 'DOUBLES');
  const singlesWins = singlesMatches.filter((m) => m.win.split('/').map((p) => p.trim()).includes(name)).length;
  const doublesWins = doublesMatches.filter((m) => m.win.split('/').map((p) => p.trim()).includes(name)).length;

  const findPlayerStats = (rows: string[][]): Record<string, string> | null => {
    const objs = tabToObjects(rows);
    return objs.find((o) => {
      const firstVal = Object.values(o)[0];
      return firstVal?.toUpperCase().trim() === name;
    }) ?? null;
  };

  const singlesStats = findPlayerStats(singlesRows);
  const doublesStats = findPlayerStats(doublesRows);
  const singlesElo = eloRankings.singles.find((e) => e.name.toUpperCase() === name)?.elo ?? null;
  const doublesElo = eloRankings.doubles.find((e) => e.name.toUpperCase() === name)?.elo ?? null;

  const recentMatches = [...playerMatches].reverse().slice(0, 15);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-lime-500/20 border-2 border-lime-500/30 flex items-center justify-center text-2xl shrink-0">
          {profile?.photoUrl ? (
            <Image src={profile.photoUrl} alt={name} fill className="object-cover" unoptimized />
          ) : (
            <Image src="/logo.png" alt="Player" fill className="object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-slate-100">{name}</h1>
            {isClaimed && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-400 font-semibold">
                ✓ Verified
              </span>
            )}
            {isOwner && (
              <Link
                href={`/players/${encodeURIComponent(name)}/edit`}
                className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-colors"
              >
                Edit Profile
              </Link>
            )}
            {!isClaimed && (
              <ClaimButton name={name} signedIn={!!session} />
            )}
          </div>
          {profile?.bio && (
            <p className="text-slate-400 text-sm mt-1">{profile.bio}</p>
          )}
          <div className="mt-2 flex items-center gap-4 flex-wrap">
            <RecordBadge wins={singlesWins + doublesWins} losses={playerMatches.length - singlesWins - doublesWins} />
            <PickleJarButton total={pickles.total} log={pickleLog} />
          </div>
        </div>
        <Link href="/players" className="text-sm text-slate-500 hover:text-slate-300 transition-colors shrink-0">
          ← All players
        </Link>
      </div>

      {/* ELO */}
      {(singlesElo !== null || doublesElo !== null) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">ELO / Ratings</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {singlesElo !== null && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Singles ELO</dt>
                <dd className="text-lime-400 font-bold font-mono text-lg">{singlesElo}</dd>
              </div>
            )}
            {doublesElo !== null && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Doubles ELO</dt>
                <dd className="text-lime-400 font-bold font-mono text-lg">{doublesElo}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <ProfileTabs
        name={name}
        singlesStats={singlesStats}
        doublesStats={doublesStats}
        singlesWins={singlesWins}
        singlesTotal={singlesMatches.length}
        doublesWins={doublesWins}
        doublesTotal={doublesMatches.length}
        recentMatches={recentMatches}
        allMatches={playerMatches}
        matchNotes={matchNotes}
        earnedBadges={earnedBadges}
        pickles={pickles}
      />
    </div>
  );
}
