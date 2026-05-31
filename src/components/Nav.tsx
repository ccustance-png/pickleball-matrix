'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/submit', label: 'Log Match' },
  { href: '/players', label: 'Players' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-lime-400 text-lg tracking-tight">
          <Image src="/logo.png" alt="Pickleball Matrix" width={32} height={32} className="rounded-md" />
          Pickleball ELO
        </Link>
        <nav className="flex gap-1 ml-auto">
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
        </nav>
      </div>
    </header>
  );
}
