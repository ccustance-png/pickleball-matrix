import { getMatchNotes, saveMatchNote } from '@/lib/sheets';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notes = await getMatchNotes([Number(id)]);
  return Response.json(notes[Number(id)] ?? null);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { photoUrl, location, description } = await req.json();
  await saveMatchNote({
    matchId: Number(id),
    photoUrl: photoUrl ?? '',
    location: location ?? '',
    description: description ?? '',
  });
  return Response.json({ success: true });
}
