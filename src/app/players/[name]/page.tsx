import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllMatches, getTabRows, tabToObjects, getProfile, getEloRankings, getMatchNotes, getDisplayName } from '@/lib/sheets';
import { computePlayerData } from '@/lib/badges';
import ClaimButton from '@/components/ClaimButton';
import ProfileTabs from '@/components/ProfileTabs';
import PickleJarButton from '@/components/PickleJarButton';
import EloChart from '@/components/EloChart';

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
  const { badges: earnedBadges, pickles, pickleLog, eloChanges } = computePlayerData(matches, name, matchNotes);

  const isClaimed = !!profile?.googleEmail;
  const isOwner = !!session?.user?.email && session.user.email === profile?.googleEmail;

  const singlesMatches = playerMatches.filter((m) => m.type === 'SINGLES');
  const doublesMatches = playerMatches.filter((m) => m.type === 'DOUBLES');
  const singlesWins = singlesMatches.filter((m) => m.win.split('/').map((p) => p.trim()).includes(name)).length;
  const doublesWins = doublesMatches.filter((m) => m.win.split('/').map((p) => p.trim()).includes(name)).length;

  // Competitive vs Casual split
  const compSingles  = singlesMatches.filter(m => m.bracket.toUpperCase() !== 'CASUAL');
  const compDoubles  = doublesMatches.filter(m => m.bracket.toUpperCase() !== 'CASUAL');
  const casualAll    = playerMatches.filter(m => m.bracket.toUpperCase() === 'CASUAL');
  const compSinglesW = compSingles.filter(m => m.win.split('/').map(p => p.trim()).includes(name)).length;
  const compDoublesW = compDoubles.filter(m => m.win.split('/').map(p => p.trim()).includes(name)).length;
  const casualW      = casualAll.filter(m => m.win.split('/').map(p => p.trim()).includes(name)).length;

  // Head-to-head: record against each opponent played 2+ times (singles)
  const h2hMap: Record<string, { wins: number; losses: number }> = {};
  for (const m of singlesMatches) {
    const opp = m.players.split('/').map(p => p.trim()).find(p => p !== name);
    if (!opp) continue;
    if (!h2hMap[opp]) h2hMap[opp] = { wins: 0, losses: 0 };
    if (m.win.split('/').map(p => p.trim()).includes(name)) h2hMap[opp].wins++;
    else h2hMap[opp].losses++;
  }
  const h2h = Object.entries(h2hMap)
    .filter(([, r]) => r.wins + r.losses >= 2)
    .sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
    .slice(0, 8);

  // Partner stats: doubles record with each partner
  const partnerMap: Record<string, { wins: number; losses: number }> = {};
  for (const m of doublesMatches) {
    const myTeam = m.win.split('/').map(p => p.trim()).includes(name) ? m.win : m.loss;
    const partners = myTeam.split('/').map(p => p.trim()).filter(p => p !== name);
    const won = m.win.split('/').map(p => p.trim()).includes(name);
    for (const partner of partners) {
      if (!partnerMap[partner]) partnerMap[partner] = { wins: 0, losses: 0 };
      if (won) partnerMap[partner].wins++; else partnerMap[partner].losses++;
    }
  }
  const partners = Object.entries(partnerMap)
    .filter(([, r]) => r.wins + r.losses >= 2)
    .sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
    .slice(0, 6);

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
            <h1 className="text-3xl font-bold text-slate-100">{getDisplayName(name, profile)}</h1>
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
          {profile?.location && (
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(profile.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-lime-400 transition-colors mt-1"
            >
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {profile.location}
            </a>
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
      {(singlesElo !== null || doublesElo !== null || singlesMatches.length > 0 || doublesMatches.length > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">ELO / Ratings</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Singles */}
            {singlesMatches.length > 0 && (
              singlesMatches.length >= 10 && singlesElo !== null ? (
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Singles ELO</dt>
                  <dd className="text-lime-400 font-bold font-mono text-lg">{singlesElo}</dd>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <dt className="text-xs text-slate-500 uppercase tracking-wider mb-1">Singles</dt>
                  <dd className="text-xs text-slate-400 mb-2">{singlesMatches.length}/10 games to rank</dd>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-lime-500/60 rounded-full transition-all" style={{ width: `${Math.min((singlesMatches.length / 10) * 100, 100)}%` }} />
                  </div>
                </div>
              )
            )}
            {/* Doubles */}
            {doublesMatches.length > 0 && (
              doublesMatches.length >= 10 && doublesElo !== null ? (
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Doubles ELO</dt>
                  <dd className="text-lime-400 font-bold font-mono text-lg">{doublesElo}</dd>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <dt className="text-xs text-slate-500 uppercase tracking-wider mb-1">Doubles</dt>
                  <dd className="text-xs text-slate-400 mb-2">{doublesMatches.length}/10 games to rank</dd>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-lime-500/60 rounded-full transition-all" style={{ width: `${Math.min((doublesMatches.length / 10) * 100, 100)}%` }} />
                  </div>
                </div>
              )
            )}
          </dl>
        </div>
      )}

      {/* ELO History Charts */}
      {(singlesMatches.length >= 3 || doublesMatches.length >= 3) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {singlesMatches.length >= 3 && <EloChart matches={matches} playerName={name} type="SINGLES" />}
          {doublesMatches.length >= 3 && <EloChart matches={matches} playerName={name} type="DOUBLES" />}
        </div>
      )}

      {/* Competitive vs Casual split */}
      {(compSingles.length > 0 || compDoubles.length > 0 || casualAll.length > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Record Breakdown</h2>
          <dl className="grid grid-cols-3 gap-3">
            {compSingles.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Comp Singles</dt>
                <dd className="text-slate-100 font-bold font-mono">{compSinglesW}–{compSingles.length - compSinglesW}</dd>
              </div>
            )}
            {compDoubles.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Comp Doubles</dt>
                <dd className="text-slate-100 font-bold font-mono">{compDoublesW}–{compDoubles.length - compDoublesW}</dd>
              </div>
            )}
            {casualAll.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                <dt className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Casual</dt>
                <dd className="text-slate-100 font-bold font-mono">{casualW}–{casualAll.length - casualW}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Head-to-head */}
      {h2h.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Head to Head (Singles)</h2>
          <div className="grid grid-cols-2 gap-2">
            {h2h.map(([opp, rec]) => {
              const total = rec.wins + rec.losses;
              const pct = Math.round((rec.wins / total) * 100);
              return (
                <div key={opp} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                  <Link href={`/players/${encodeURIComponent(opp)}`} className="text-sm font-semibold text-slate-200 hover:text-lime-400 transition-colors truncate">
                    {opp}
                  </Link>
                  <div className="text-right shrink-0">
                    <span className={`font-mono font-bold text-sm ${rec.wins > rec.losses ? 'text-lime-400' : rec.wins < rec.losses ? 'text-red-400' : 'text-slate-400'}`}>
                      {rec.wins}–{rec.losses}
                    </span>
                    <span className="text-slate-600 text-xs ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Partner stats */}
      {partners.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Doubles Partners</h2>
          <div className="grid grid-cols-2 gap-2">
            {partners.map(([partner, rec]) => {
              const total = rec.wins + rec.losses;
              const pct = Math.round((rec.wins / total) * 100);
              return (
                <div key={partner} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                  <Link href={`/players/${encodeURIComponent(partner)}`} className="text-sm font-semibold text-slate-200 hover:text-lime-400 transition-colors truncate">
                    {partner}
                  </Link>
                  <div className="text-right shrink-0">
                    <span className={`font-mono font-bold text-sm ${rec.wins > rec.losses ? 'text-lime-400' : rec.wins < rec.losses ? 'text-red-400' : 'text-slate-400'}`}>
                      {rec.wins}–{rec.losses}
                    </span>
                    <span className="text-slate-600 text-xs ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
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
        eloChanges={eloChanges}
      />
    </div>
  );
}
