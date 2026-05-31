import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pickleball ELO',
  description: 'Track matches, rankings, and player stats',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
