import { appendMatch, saveMatchNote } from '@/lib/sheets';

type GamePayload = {
  bracket: 'COMPETITIVE' | 'CASUAL';
  type: 'SINGLES' | 'DOUBLES';
  team1Players: string[];
  team2Players: string[];
  team1Score: number;
  team2Score: number;
};

// POST — add more games to an existing session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ anchorId: string }> }
) {
  try {
    const { anchorId: anchorIdRaw } = await params;
    const anchorId = Number(anchorIdRaw);
    if (!anchorId) return Response.json({ error: 'Invalid session ID' }, { status: 400 });

    const { date, games } = await req.json() as { date: string; games: GamePayload[] };
    if (!date || !games?.length) return Response.json({ error: 'Missing fields' }, { status: 400 });

    for (const game of games) {
      if (game.team1Score === game.team2Score) {
        return Response.json({ error: 'Scores cannot be tied' }, { status: 400 });
      }
    }

    const matchIds: number[] = [];
    for (const game of games) {
      const fmt = (players: string[]) => players.map(p => p.toUpperCase().trim()).join('/');
      const team1 = fmt(game.team1Players);
      const team2 = fmt(game.team2Players);
      const win   = game.team1Score > game.team2Score ? team1 : team2;
      const loss  = game.team1Score > game.team2Score ? team2 : team1;

      const id = await appendMatch({
        date,
        bracket: game.bracket,
        type: game.type,
        team1, team2, win, loss,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        players: `${win}/${loss}`,
      });
      matchIds.push(id);
    }

    // Link each new match back to the session anchor
    for (const matchId of matchIds) {
      await saveMatchNote({
        matchId,
        photoUrl: '',
        location: '',
        description: `__sid:${anchorId}__`,
      });
    }

    return Response.json({ ok: true, matchIds });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
