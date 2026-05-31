import MatchForm from '@/components/MatchForm';

export default function SubmitPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Log a Match</h1>
        <p className="text-slate-400 text-sm mt-1">Results are saved directly to the Pickleball Matrix spreadsheet.</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <MatchForm />
      </div>
    </div>
  );
}
