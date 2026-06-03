import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getTabRows } from '@/lib/sheets';
import OnboardingForm from '@/components/OnboardingForm';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  // Must be signed in
  if (!session?.user?.email) redirect('/api/auth/signin?callbackUrl=/onboarding');

  // If they already have a claimed profile, send them home
  const rows = await getTabRows('PROFILES').catch(() => [] as string[][]);
  const existing = rows.slice(1).find(r => (r[3] ?? '').toString().trim() === session.user!.email);
  if (existing?.[0]) redirect('/');

  return (
    <div className="min-h-screen flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🥒</div>
          <h1 className="text-2xl font-bold text-slate-100">Welcome to Pickleball ELO!</h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Set your player name — this is what gets recorded in every match,<br />
            shows up in the rankings, and follows you forever.
          </p>
          {session.user?.email && (
            <p className="text-xs text-slate-600 mt-3">Signed in as {session.user.email}</p>
          )}
        </div>

        {/* Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <OnboardingForm />
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          First name + last name so there&rsquo;s no confusion as the group grows.
        </p>
      </div>
    </div>
  );
}
