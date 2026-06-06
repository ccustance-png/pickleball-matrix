import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTabRows, getMessagesForPlayer, getAllProfilesMap } from '@/lib/sheets';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 0;

function timeAgo(ts: string) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">💬</p>
        <h1 className="text-xl font-bold text-slate-100 mb-2">Messages</h1>
        <p className="text-slate-400 text-sm">Sign in to send and receive direct messages.</p>
      </div>
    );
  }

  const profileRows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const profileRow = profileRows.slice(1).find(
    r => (r[3] ?? '').toString().trim() === session.user!.email,
  );
  const myPlayer = profileRow?.[0]?.toString().trim() ?? null;

  if (!myPlayer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">💬</p>
        <h1 className="text-xl font-bold text-slate-100 mb-2">Messages</h1>
        <p className="text-slate-400 text-sm mb-4">Set up your profile to send messages.</p>
        <a href="/onboarding" className="inline-block px-5 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors">
          Set up profile
        </a>
      </div>
    );
  }

  const [messages, profilesMap] = await Promise.all([
    getMessagesForPlayer(myPlayer).catch(() => []),
    getAllProfilesMap().catch(() => ({} as Record<string, import('@/lib/sheets').PlayerProfile>)),
  ]);

  // Group messages by conversation partner
  const convMap = new Map<string, { lastMsg: typeof messages[0]; unread: number }>();
  for (const msg of messages) {
    const other = msg.fromPlayer.toUpperCase() === myPlayer.toUpperCase()
      ? msg.toPlayer
      : msg.fromPlayer;
    const key = other.toUpperCase();
    const existing = convMap.get(key);
    const isNewer = !existing || new Date(msg.timestamp) > new Date(existing.lastMsg.timestamp);
    const unreadDelta = msg.toPlayer.toUpperCase() === myPlayer.toUpperCase() && msg.read !== 'true' ? 1 : 0;
    if (!existing) {
      convMap.set(key, { lastMsg: msg, unread: unreadDelta });
    } else {
      convMap.set(key, {
        lastMsg: isNewer ? msg : existing.lastMsg,
        unread: existing.unread + unreadDelta,
      });
    }
  }

  const conversations = Array.from(convMap.entries())
    .map(([key, data]) => {
      const otherName = data.lastMsg.fromPlayer.toUpperCase() === myPlayer.toUpperCase()
        ? data.lastMsg.toPlayer
        : data.lastMsg.fromPlayer;
      return { key, otherName, ...data };
    })
    .sort((a, b) => new Date(b.lastMsg.timestamp).getTime() - new Date(a.lastMsg.timestamp).getTime());

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Messages</h1>
        <p className="text-slate-400 text-sm mt-1">Direct messages with other players</p>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-4">💬</p>
          <p className="font-semibold text-lg text-slate-400">No messages yet</p>
          <p className="text-sm mt-2">Visit a player&apos;s profile to start a conversation.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map(({ otherName, lastMsg, unread }) => {
            const profile = profilesMap[otherName.toUpperCase()];
            const dn = profile?.firstName && profile?.lastName
              ? `${profile.firstName} ${profile.lastName}`
              : otherName;
            const isMine = lastMsg.fromPlayer.toUpperCase() === myPlayer.toUpperCase();
            const preview = `${isMine ? 'You: ' : ''}${lastMsg.text}`;

            return (
              <Link
                key={otherName}
                href={`/messages/${encodeURIComponent(otherName)}`}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-800/60 transition-colors group"
              >
                {profile?.photoUrl ? (
                  <Image src={profile.photoUrl} alt={dn} width={44} height={44}
                    className="rounded-full object-cover shrink-0" unoptimized />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-base shrink-0">
                    {dn[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`font-semibold text-sm truncate ${unread > 0 ? 'text-slate-100' : 'text-slate-300'}`}>{dn}</span>
                    <span className="text-xs text-slate-500 shrink-0">{timeAgo(lastMsg.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-sm truncate ${unread > 0 ? 'text-slate-300' : 'text-slate-500'}`}>{preview}</p>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] bg-lime-500 text-slate-900 text-xs font-bold rounded-full flex items-center justify-center px-1">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
