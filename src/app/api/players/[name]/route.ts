import { NextResponse } from 'next/server';
import { getAllMatches, getTabRows, tabToObjects } from '@/lib/sheets';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name: rawName } = await params;
    const name = decodeURIComponent(rawName).toUpperCase();

    const [matches, singlesRows, doublesRows, eloRows, gamelogRows] = await Promise.all([
      getAllMatches(),
      getTabRows('SINGLES'),
      getTabRows('DOUBLES'),
      getTabRows('ELO'),
      getTabRows('GAMELOG'),
    ]);

    const playerMatches = matches.filter((m) =>
      m.players.split('/').map((p) => p.trim()).includes(name)
    );

    const singlesMatches = playerMatches.filter((m) => m.type === 'SINGLES');
    const doublesMatches = playerMatches.filter((m) => m.type === 'DOUBLES');

    const singlesWins = singlesMatches.filter((m) => m.win.trim() === name).length;
    const doublesWins = doublesMatches.filter((m) =>
      m.win.split('/').map((p) => p.trim()).includes(name)
    ).length;

    const findRow = (rows: string[][]): Record<string, string> | null => {
      const objs = tabToObjects(rows);
      return objs.find((o) => Object.values(o)[0]?.toUpperCase().trim() === name) ?? null;
    };

    const singlesStats = findRow(singlesRows);
    const doublesStats = findRow(doublesRows);
    const eloStats = findRow(eloRows);
    const gamelogStats = findRow(gamelogRows);

    return NextResponse.json({
      name,
      overall: {
        matches: playerMatches.length,
        wins: singlesWins + doublesWins,
        losses: playerMatches.length - singlesWins - doublesWins,
      },
      singles: {
        matches: singlesMatches.length,
        wins: singlesWins,
        losses: singlesMatches.length - singlesWins,
        stats: singlesStats,
      },
      doubles: {
        matches: doublesMatches.length,
        wins: doublesWins,
        losses: doublesMatches.length - doublesWins,
        stats: doublesStats,
      },
      elo: eloStats,
      gamelog: gamelogStats,
      recentMatches: [...playerMatches].reverse().slice(0, 15),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
