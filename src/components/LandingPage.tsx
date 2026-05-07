import CasePlanrLogo from './CasePlanrLogo';

const FEATURES = [
  {
    title: 'Participant Profiles',
    description: 'Create and manage detailed profiles for each court participant, including case numbers, phases, and assigned goals.',
  },
  {
    title: 'Phase Tracking',
    description: 'Track participant progress through a structured 5-phase milestone system from intake to program completion.',
  },
  {
    title: 'Goal Management',
    description: 'Build, assign, and monitor SMART goals with due dates, completion tracking, and AI-assisted refinement.',
  },
  {
    title: 'Case Documentation',
    description: 'Record detailed case manager observations and generate printable court-ready case plan documents.',
  },
  {
    title: 'AI Writing Assistance',
    description: 'Use AI to refine rough notes into professional observations, sharpen goals, and draft hearing briefs.',
  },
  {
    title: 'Audit Logs',
    description: 'Every change is automatically logged — who did what and when — for full accountability and compliance.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Nav */}
      <header className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <CasePlanrLogo className="w-8 h-8" />
          <span className="text-xl font-black text-slate-900 tracking-tight">CasePlanr</span>
        </div>
        <a
          href="/app"
          className="px-4 py-2 bg-burnt-peach-600 hover:bg-burnt-peach-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          Sign In
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-burnt-peach-50 border border-burnt-peach-100 text-burnt-peach-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
            Court Case Management
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            Case plans that<br />keep cases moving.
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 text-balance">
            CasePlanr helps court case managers track participant progress, manage goals, document observations, and generate professional case plans — all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/app"
              className="px-6 py-3 bg-burnt-peach-600 hover:bg-burnt-peach-700 text-white font-bold rounded-xl shadow-lg shadow-burnt-peach-100 transition-colors"
            >
              Sign In to CasePlanr
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-10 tracking-tight">
            Everything a case manager needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-2">
                <h3 className="font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} CasePlanr. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-burnt-peach-600 transition-colors">Privacy Policy</a>
            <span className="text-slate-200 select-none">&middot;</span>
            <a href="/terms" className="hover:text-burnt-peach-600 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
