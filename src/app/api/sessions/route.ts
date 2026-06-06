import { revalidatePath } from 'next/cache';
import { appendMatch, saveMatchNote } from '@/lib/sheets';
import { notifyPlayers } from '@/lib/push';

type GamePayload = {
  bracket: 'COMPETITIVE' | 'CASUAL';
  type: 'SINGLES' | 'DOUBLES';
  team1Players: string[];
  team2Players: string[];
  team1Score: number;
  team2Score: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      date: string;
      games: GamePayload[];
      photoUrl: string;
      location: string;
      description: string;
    };

    const { date, games, photoUrl, location, description } = body;

    if (!date || !games?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate all games first
    for (const game of games) {
      if (game.team1Score === game.team2Score) {
        return Response.json({ error: 'Scores cannot be tied' }, { status: 400 });
      }
    }

    // Submit games sequentially (GAS auto-increments IDs — parallel would race)
    const matchIds: number[] = [];
    for (const game of games) {
      const fmt = (players: string[]) =>
        players.map((p) => p.toUpperCase().trim()).join('/');
      const team1 = fmt(game.team1Players);
      const team2 = fmt(game.team2Players);
      const win  = game.team1Score > game.team2Score ? team1 : team2;
      const loss = game.team1Score > game.team2Score ? team2 : team1;
      const players = `${win}/${loss}`;

      const id = await appendMatch({
        date,
        bracket: game.bracket,
        type: game.type,
        team1,
        team2,
        win,
        loss,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        players,
      });
      matchIds.push(id);
    }

    // Save session notes only if there's something to attach
    if (photoUrl || location || description) {
      const anchorId = matchIds[0];

      // Anchor gets the real note
      await saveMatchNote({
        matchId: anchorId,
        photoUrl: photoUrl ?? '',
        location: location ?? '',
        description: description ?? '',
      });

      // Remaining matches get a back-reference so the activities page can group them
      for (const matchId of matchIds.slice(1)) {
        await saveMatchNote({
          matchId,
          photoUrl: '',
          location: '',
          description: `__sid:${anchorId}__`,
        });
      }
    }

    // Notify all players in the session (fire-and-forget)
    const allPlayers = Array.from(new Set(
      games.flatMap(g => [...g.team1Players, ...g.team2Players]).map(p => p.toUpperCase().trim())
    ));
    notifyPlayers(allPlayers, {
      title: '🏓 Match logged!',
      body: `${allPlayers.slice(0, 3).join(', ')} · ${games.length} game${games.length > 1 ? 's' : ''} on ${date}`,
      url: '/activities',
    }).catch(() => {}); // never let push errors affect the response

    // Bust Next.js data cache so new matches appear immediately everywhere
    revalidatePath('/');
    revalidatePath('/activities');
    revalidatePath('/players');
    revalidatePath('/stats');
    revalidatePath('/rivalries');

    return Response.json({ sessionId: matchIds[0], matchIds });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
