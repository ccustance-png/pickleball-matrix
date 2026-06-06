import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTabRows } from '@/lib/sheets';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ player: null });

  const email = session.user.email;

  // Read PROFILES tab directly — one call instead of N parallel lookups
  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const match = rows.slice(1).find(r => (r[3] ?? '').toString().trim() === email);

  return Response.json({ player: match?.[0]?.toString().trim() ?? null });
}
