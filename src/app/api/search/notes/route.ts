import { getAllMatchNotes } from '@/lib/db';

export async function GET() {
  const notes = await getAllMatchNotes().catch(() => []);
  return Response.json(notes);
}
