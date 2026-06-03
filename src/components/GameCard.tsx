'use client';

import PlayerCombobox from './PlayerCombobox';

export type Bracket  = 'COMPETITIVE' | 'CASUAL';
export type MatchType = 'SINGLES' | 'DOUBLES';

export type GameEntry = {
  id: string;
  bracket: Bracket;
  type: MatchType;
  t1p1: string; t1p2: string;
  t2p1: string; t2p2: string;
  score1: string; score2: string;
};

export function newGame(): GameEntry {
  return {
    id: Math.random().toString(36).slice(2),
    bracket: 'COMPETITIVE',
    type: 'SINGLES',
    t1p1: '', t1p2: '',
    t2p1: '', t2p2: '',
    score1: '', score2: '',
  };
}

type Props = {
  game: GameEntry;
  index: number;
  players: string[];
  onChange: (patch: Partial<GameEntry>) => void;
  onRemove: () => void;
  canRemove: boolean;
};

export default function GameCard({ game, index, players, onChange, onRemove, canRemove }: Props) {
  const s1 = Number(game.score1);
  const s2 = Number(game.score2);
  const t1Label = game.type === 'SINGLES'
    ? game.t1p1 || 'Player 1'
    : [game.t1p1, game.t1p2].filter(Boolean).join('/') || 'Team 1';
  const t2Label = game.type === 'SINGLES'
    ? game.t2p1 || 'Player 2'
    : [game.t2p1, game.t2p2].filter(Boolean).join('/') || 'Team 2';
  const winner = game.score1 && game.score2 && s1 !== s2 ? (s1 > s2 ? t1Label : t2Label) : null;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Game {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none">×</button>
        )}
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-1.5">
          {(['COMPETITIVE', 'CASUAL'] as Bracket[]).map(b => (
            <button key={b} type="button" onClick={() => onChange({ bracket: b })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                game.bracket === b ? 'bg-lime-500 border-lime-500 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
              {b === 'COMPETITIVE' ? 'Comp' : 'Casual'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['SINGLES', 'DOUBLES'] as MatchType[]).map(t => (
            <button key={t} type="button" onClick={() => onChange({ type: t })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                game.type === t ? 'bg-lime-500 border-lime-500 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
              {t === 'SINGLES' ? 'Singles' : 'Doubles'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
        <div className="space-y-2">
          <PlayerCombobox value={game.t1p1} onChange={v => onChange({ t1p1: v })} suggestions={players} placeholder="Player 1…" />
          {game.type === 'DOUBLES' && (
            <PlayerCombobox value={game.t1p2} onChange={v => onChange({ t1p2: v })} suggestions={players} placeholder="Partner…" />
          )}
          <input type="number" min={0} max={99} value={game.score1} onChange={e => onChange({ score1: e.target.value })}
            placeholder="Score" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500" />
        </div>
        <div className="flex items-center justify-center pt-2">
          <span className="text-slate-600 font-bold text-xs">VS</span>
        </div>
        <div className="space-y-2">
          <PlayerCombobox value={game.t2p1} onChange={v => onChange({ t2p1: v })} suggestions={players} placeholder={game.type === 'DOUBLES' ? 'Player 3…' : 'Player 2…'} />
          {game.type === 'DOUBLES' && (
            <PlayerCombobox value={game.t2p2} onChange={v => onChange({ t2p2: v })} suggestions={players} placeholder="Partner…" />
          )}
          <input type="number" min={0} max={99} value={game.score2} onChange={e => onChange({ score2: e.target.value })}
            placeholder="Score" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500" />
        </div>
      </div>

      {winner && (
        <div className="rounded-lg bg-lime-500/10 border border-lime-500/30 px-3 py-2 text-xs text-lime-300">
          Winner: <span className="font-bold">{winner}</span>
        </div>
      )}
    </div>
  );
}
