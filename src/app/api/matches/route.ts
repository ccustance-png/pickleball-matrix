import { NextResponse } from 'next/server';
import { getAllMatches, appendMatch } from '@/lib/db';

export async function GET() {
  try {
    const matches = await getAllMatches();
    return NextResponse.json(matches);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      date: string;
      bracket: 'COMPETITIVE' | 'CASUAL';
      type: 'SINGLES' | 'DOUBLES';
      team1Players: string[];
      team2Players: string[];
      team1Score: number;
      team2Score: number;
    };

    const { date, bracket, type, team1Players, team2Players, team1Score, team2Score } = body;

    if (!date || !bracket || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (team1Score === team2Score) {
      return NextResponse.json({ error: 'Scores cannot be tied' }, { status: 400 });
    }

    const fmt = (players: string[]) => players.map((p) => p.toUpperCase().trim()).join('/');
    const team1 = fmt(team1Players);
    const team2 = fmt(team2Players);

    const win = team1Score > team2Score ? team1 : team2;
    const loss = team1Score > team2Score ? team2 : team1;
    const players = `${win}/${loss}`;

    const newId = await appendMatch({ date, bracket, type, team1, team2, win, loss, team1Score, team2Score, players });
    return NextResponse.json({ success: true, matchId: newId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
