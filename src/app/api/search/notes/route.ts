import { getAllMatchNotes } from '@/lib/sheets';

export async function GET() {
  const notes = await getAllMatchNotes().catch(() => []);
  return Response.json(notes);
}
