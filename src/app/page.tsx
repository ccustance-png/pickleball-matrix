import Link from 'next/link';
import { getAllMatches } from '@/lib/sheets';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

export const revalidate = 60;

export default async function HomePage() {
  let matches: Awaited<ReturnType<typeof getAllMatches>> = [];
  let error = '';

  try {
    matches = await getAllMatches();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Could not load matches';
  }

  const recent = [...matches].reverse().slice(0, 20);
  const uniquePlayers = new Set(matches.flatMap((m) => m.players.split('/').map((p) => p.trim())));
  const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  const todayMatches = matches.filter((m) => m.date === today).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {error && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-300">
          ⚠️ {error} — check your Google Sheets credentials in <code>.env.local</code>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Matches" value={matches.length} />
        <StatCard label="Players" value={uniquePlayers.size} />
        <StatCard label="Today" value={todayMatches} />
        <StatCard label="Latest ID" value={matches.length > 0 ? Math.max(...matches.map((m) => m.matchId)) : '—'} />
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link
          href="/submit"
          className="px-5 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold rounded-lg text-sm transition-colors"
        >
          + Log a Match
        </Link>
        <Link
          href="/players"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-sm transition-colors"
        >
          Player Rankings
        </Link>
      </div>

      {/* Recent matches */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Recent Matches</h2>
        {recent.length === 0 && !error && (
          <p className="text-slate-500 text-sm">No matches yet. Log the first one!</p>
        )}
        {recent.length > 0 && (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Bracket</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Winner</th>
                  <th className="px-4 py-3 text-left">Loser</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recent.map((m) => (
                  <tr key={m.matchId} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono">{m.matchId}</td>
                    <td className="px-4 py-3 text-slate-400">{m.date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.bracket === 'COMPETITIVE'
                          ? 'bg-lime-500/15 text-lime-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {m.bracket}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{m.type}</td>
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {m.win.split('/').map((p, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-slate-600 mx-0.5">/</span>}
                          <Link href={`/players/${encodeURIComponent(p.trim())}`} className="hover:text-lime-400 transition-colors">
                            {p.trim()}
                          </Link>
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {m.loss.split('/').map((p, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-slate-600 mx-0.5">/</span>}
                          <Link href={`/players/${encodeURIComponent(p.trim())}`} className="hover:text-lime-400 transition-colors">
                            {p.trim()}
                          </Link>
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={m.team1Score > m.team2Score ? 'text-lime-400 font-bold' : 'text-slate-400'}>{m.team1Score}</span>
                      <span className="text-slate-600 mx-1">–</span>
                      <span className={m.team2Score > m.team1Score ? 'text-lime-400 font-bold' : 'text-slate-400'}>{m.team2Score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
