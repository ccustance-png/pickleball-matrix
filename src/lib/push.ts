import webpush from 'web-push';
import { getPushSubscriptionsForPlayers } from './sheets';

webpush.setVapidDetails(
  'mailto:admin@pickleballelo.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function notifyPlayers(
  playerNames: string[],
  payload: { title: string; body: string; url?: string }
) {
  if (!process.env.VAPID_PRIVATE_KEY) return; // silently skip if not configured

  const subscriptionStrings = await getPushSubscriptionsForPlayers(playerNames);
  if (!subscriptionStrings.length) return;

  await Promise.allSettled(
    subscriptionStrings.map(async (sub) => {
      try {
        const subscription = JSON.parse(sub);
        await webpush.sendNotification(subscription, JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url ?? '/',
        }));
      } catch {
        // Subscription may have expired — ignore silently
      }
    })
  );
}
