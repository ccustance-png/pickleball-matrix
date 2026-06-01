import Link from 'next/link';
import Image from 'next/image';
import type { MatchRow, MatchNote } from '@/lib/sheets';
import MatchComments from './MatchComments';

type Props = {
  match: MatchRow;
  name: string;
  note?: MatchNote;
};

export default function MatchActivityCard({ match, name, note }: Props) {
  const isWinner = match.win.split('/').map((p) => p.trim()).includes(name);
  const oppTeam = isWinner ? match.loss : match.win;
  const myScore = match.team1.includes(name) ? match.team1Score : match.team2Score;
  const oppScore = match.team1.includes(name) ? match.team2Score : match.team1Score;

  const opponents = oppTeam.split('/').map((p) => p.trim());

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Photo */}
      {note?.photoUrl && (
        <div className="relative w-full h-48">
          <Image src={note.photoUrl} alt="Match photo" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-lime-500/15 text-lime-400' : 'bg-red-500/10 text-red-400'}`}>
              {isWinner ? 'W' : 'L'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
              {match.type === 'SINGLES' ? 'S' : 'D'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
              {match.bracket}
            </span>
          </div>
          <span className="text-xs text-slate-500 shrink-0">{match.date}</span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-black font-mono ${isWinner ? 'text-lime-400' : 'text-slate-300'}`}>{myScore}</span>
          <span className="text-slate-600 text-lg">–</span>
          <span className={`text-3xl font-black font-mono ${!isWinner ? 'text-red-400' : 'text-slate-500'}`}>{oppScore}</span>
          <span className="text-slate-500 text-sm ml-1">vs</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {opponents.map((opp) => (
              <Link
                key={opp}
                href={`/players/${encodeURIComponent(opp)}`}
                className="text-sm font-semibold text-slate-200 hover:text-lime-400 transition-colors"
              >
                {opp}
              </Link>
            ))}
          </div>
        </div>

        {/* Location */}
        {note?.location && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {note.location}
          </div>
        )}

        {/* Description */}
        {note?.description && (
          <p className="text-sm text-slate-300 leading-relaxed">{note.description}</p>
        )}
      </div>

      {/* Comments */}
      <MatchComments matchId={match.matchId} />
    </div>
  );
}
