import { NextResponse } from 'next/server';
import { getAllMatches, getEloRankings } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name: rawName } = await params;
    const name = decodeURIComponent(rawName).toUpperCase();

    const [matches, eloRankings] = await Promise.all([
      getAllMatches(),
      getEloRankings(),
    ]);

    const playerMatches = matches.filter(m =>
      m.players.split('/').map(p => p.trim()).includes(name)
    );

    const singlesMatches = playerMatches.filter(m => m.type === 'SINGLES');
    const doublesMatches = playerMatches.filter(m => m.type === 'DOUBLES');
    const singlesWins = singlesMatches.filter(m => m.win.trim() === name).length;
    const doublesWins = doublesMatches.filter(m =>
      m.win.split('/').map(p => p.trim()).includes(name)
    ).length;

    const singlesElo = eloRankings.singles.find(e => e.name.toUpperCase() === name)?.elo ?? 1000;
    const doublesElo = eloRankings.doubles.find(e => e.name.toUpperCase() === name)?.elo ?? 1000;

    return NextResponse.json({
      name,
      overall: {
        matches: playerMatches.length,
        wins: singlesWins + doublesWins,
        losses: playerMatches.length - (singlesWins + doublesWins),
      },
      singles: {
        matches: singlesMatches.length,
        wins: singlesWins,
        losses: singlesMatches.length - singlesWins,
        stats: { elo: singlesElo },
      },
      doubles: {
        matches: doublesMatches.length,
        wins: doublesWins,
        losses: doublesMatches.length - doublesWins,
        stats: { elo: doublesElo },
      },
      elo: { singlesElo, doublesElo },
      recentMatches: [...playerMatches].reverse().slice(0, 15),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
