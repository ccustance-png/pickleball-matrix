import { getAllMatches, getChallenges } from '@/lib/db';
import ChallengeFeed from '@/components/ChallengeFeed';

export const revalidate = 0;

export default async function SocialPage() {
  const [matches, challenges] = await Promise.all([
    getAllMatches().catch(() => []),
    getChallenges().catch(() => []),
  ]);

  const playerSet = new Set(
    matches.flatMap(m => m.players.split('/').map(p => p.trim()).filter(Boolean))
  );
  const players = Array.from(playerSet).sort();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Social</h1>
        <p className="text-slate-400 text-sm mt-1">Call out your rivals. Back it up on the court.</p>
      </div>
      <ChallengeFeed initialChallenges={challenges} players={players} />
    </div>
  );
}
