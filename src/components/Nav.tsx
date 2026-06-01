'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/submit', label: 'Log Match' },
  { href: '/players', label: 'Players' },
  { href: '/rivalries', label: 'Rivalries' },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-lime-400 text-lg tracking-tight shrink-0">
          <Image src="/logo.png" alt="Pickleball ELO" width={32} height={32} className="rounded-md" />
          Pickleball ELO
        </Link>
        <nav className="flex gap-1 ml-auto items-center">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-lime-400/10 text-lime-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              {label}
            </Link>
          ))}

          {/* Auth */}
          {session ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ''}
                  width={28}
                  height={28}
                  className="rounded-full"
                  unoptimized
                />
              )}
              <button
                onClick={() => signOut()}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="ml-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
