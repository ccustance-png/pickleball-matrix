import { notFound } from 'next/navigation';
import { getProfile, getAllMatches } from '@/lib/sheets';
import ProfileEditForm from '@/components/ProfileEditForm';

export default async function EditProfilePage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName).toUpperCase();

  const [matches, profile] = await Promise.all([
    getAllMatches().catch(() => []),
    getProfile(name),
  ]);

  const exists = matches.some((m) =>
    m.players.split('/').map((p) => p.trim()).includes(name)
  );
  if (!exists && matches.length > 0) return notFound();

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Edit Profile</h1>
        <p className="text-slate-400 text-sm mt-1">{name}</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <ProfileEditForm
          name={name}
          currentPhoto={profile?.photoUrl ?? ''}
          currentBio={profile?.bio ?? ''}
          currentFirstName={profile?.firstName ?? ''}
          currentLastName={profile?.lastName ?? ''}
          currentLocation={profile?.location ?? ''}
        />
      </div>
    </div>
  );
}
