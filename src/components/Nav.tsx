'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import SearchModal from './SearchModal';
import NotificationBell from './NotificationBell';

const links = [
  { href: '/', label: 'Home' },
  { href: '/submit', label: 'Log Session' },
  { href: '/activities', label: 'Activities' },
  { href: '/players', label: 'Power Rankings' },
  { href: '/rivalries', label: 'Rivalries' },
  { href: '/stats', label: 'Stats' },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [myPlayer, setMyPlayer] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch the claimed player name for the signed-in user
  useEffect(() => {
    if (!session?.user?.email) { setMyPlayer(null); return; }
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setMyPlayer(d.player ?? null))
      .catch(() => setMyPlayer(null));
  }, [session?.user?.email]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lime-400 text-lg tracking-tight shrink-0">
          <Image src="/logo.png" alt="Pickleball ELO" width={32} height={32} className="rounded-md" />
          <span>Pickleball ELO</span>
        </Link>

        {/* Search + Notifications + Hamburger */}
        <div className="flex items-center gap-2">
        <NotificationBell />
        {/* Search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </button>

        {/* Hamburger button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
            aria-label="Menu"
          >
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ''}
                width={22}
                height={22}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
              <nav className="py-1">
                {links.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                      pathname === href
                        ? 'text-lime-400 bg-lime-500/10'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    {pathname === href && (
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shrink-0" />
                    )}
                    {pathname !== href && <span className="w-1.5 h-1.5 shrink-0" />}
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Divider + Auth */}
              <div className="border-t border-slate-800 py-1">
                {session ? (
                  <div>
                    {/* Onboarding nudge for unclaimed users */}
                    {!myPlayer && (
                      <Link
                        href="/onboarding"
                        className="flex items-center gap-2 mx-3 my-2 px-3 py-2 bg-lime-500/15 border border-lime-500/30 rounded-lg text-sm font-semibold text-lime-400 hover:bg-lime-500/25 transition-colors"
                      >
                        <span>🥒</span>
                        Set up your player profile
                      </Link>
                    )}
                    {/* My Profile link */}
                    {myPlayer && (
                      <Link
                        href={`/players/${encodeURIComponent(myPlayer)}`}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                          pathname === `/players/${encodeURIComponent(myPlayer)}`
                            ? 'text-lime-400 bg-lime-500/10'
                            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        {pathname === `/players/${encodeURIComponent(myPlayer)}` ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shrink-0" />
                        ) : (
                          <span className="text-base leading-none">👤</span>
                        )}
                        My Profile
                      </Link>
                    )}
                    <div className="px-4 py-2 text-xs text-slate-500 truncate">{session.user?.email}</div>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => signIn('google')}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-lime-400 hover:bg-slate-800 transition-colors flex items-center gap-3"
                  >
                    <span className="w-1.5 h-1.5 shrink-0" />
                    Sign in with Google
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        </div>{/* end flex wrapper */}
      </div>
    </header>

    {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}
