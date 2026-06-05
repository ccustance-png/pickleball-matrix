'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type PermState = 'unsupported' | 'granted' | 'denied' | 'default' | 'loading';

export default function NotificationBell() {
  const { data: session } = useSession();
  const [perm, setPerm] = useState<PermState>('loading');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPerm('unsupported');
      return;
    }
    setPerm(Notification.permission as PermState);
  }, []);

  // Only show to signed-in users on supported browsers
  if (!session || perm === 'unsupported' || perm === 'loading' || perm === 'granted') return null;

  async function enable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPerm(permission as PermState); return; }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });

      setPerm('granted');
    } catch (e) {
      console.error('Push subscription failed:', e);
    }
  }

  return (
    <button
      onClick={enable}
      title="Enable match notifications"
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-lime-400 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      <span className="text-xs font-medium hidden sm:inline">Notify me</span>
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)));
}
