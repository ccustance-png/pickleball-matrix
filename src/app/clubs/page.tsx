import { getClubs, getAllClubMembers } from '@/lib/db';
import ClubsList from '@/components/ClubsList';

export const revalidate = 15;

export default async function ClubsPage() {
  const [clubs, allMembers] = await Promise.all([
    getClubs().catch(() => []),
    getAllClubMembers().catch(() => []),
  ]);

  const memberCounts = allMembers.reduce<Record<string, number>>((acc, m) => {
    acc[m.clubId] = (acc[m.clubId] || 0) + 1;
    return acc;
  }, {});

  const clubsWithCounts = clubs.map(c => ({
    ...c,
    memberCount: memberCounts[c.clubId] || 0,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <ClubsList initialClubs={clubsWithCounts} />
    </div>
  );
}
