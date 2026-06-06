import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTabRows, getMessagesForPlayer, getAllProfilesMap, getProfile } from '@/lib/sheets';
import { notFound } from 'next/navigation';
import MessageThread from '@/components/MessageThread';

export const revalidate = 0;

export default async function ThreadPage({ params }: { params: Promise<{ player: string }> }) {
  const session = await getServerSession(authOptions);
  const { player: rawPlayer } = await params;
  const otherPlayer = decodeURIComponent(rawPlayer).toUpperCase();

  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-400 text-sm">Sign in to send messages.</p>
      </div>
    );
  }

  const profileRows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const profileRow = profileRows.slice(1).find(
    r => (r[3] ?? '').toString().trim() === session.user!.email,
  );
  const myPlayer = profileRow?.[0]?.toString().trim() ?? null;
  if (!myPlayer) notFound();

  const [allMessages, profilesMap, otherProfile] = await Promise.all([
    getMessagesForPlayer(myPlayer).catch(() => []),
    getAllProfilesMap().catch(() => ({} as Record<string, import('@/lib/sheets').PlayerProfile>)),
    getProfile(otherPlayer).catch(() => null),
  ]);

  // Filter to this thread only
  const thread = allMessages
    .filter(m =>
      (m.fromPlayer.toUpperCase() === myPlayer.toUpperCase() && m.toPlayer.toUpperCase() === otherPlayer) ||
      (m.fromPlayer.toUpperCase() === otherPlayer && m.toPlayer.toUpperCase() === myPlayer.toUpperCase()),
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const otherDisplayName = otherProfile?.firstName && otherProfile?.lastName
    ? `${otherProfile.firstName} ${otherProfile.lastName}`
    : otherPlayer;

  return (
    <MessageThread
      myPlayer={myPlayer}
      otherPlayer={otherPlayer}
      otherDisplayName={otherDisplayName}
      otherPhotoUrl={otherProfile?.photoUrl ?? ''}
      initialMessages={thread}
      profilesMap={profilesMap}
    />
  );
}
