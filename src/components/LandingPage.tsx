import { Users, TrendingUp, Target, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import CasePlanrLogo from './CasePlanrLogo';

const FEATURES = [
  {
    icon: Users,
    title: 'Participant Profiles',
    description: 'Create and manage detailed profiles for each court participant, including case numbers, phases, and assigned goals.',
  },
  {
    icon: TrendingUp,
    title: 'Phase Tracking',
    description: 'Track participant progress through a structured 5-phase milestone system from intake to program completion.',
  },
  {
    icon: Target,
    title: 'Goal Management',
    description: 'Build, assign, and monitor SMART goals with due dates, completion tracking, and AI-assisted refinement.',
  },
  {
    icon: FileText,
    title: 'Case Documentation',
    description: 'Record detailed observations and generate printable, court-ready case plan documents in seconds.',
  },
  {
    icon: Sparkles,
    title: 'AI Writing Assistance',
    description: 'Refine rough notes into professional observations, sharpen goals, and draft hearing briefs with AI.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit Logs',
    description: 'Every change is automatically logged — who did what and when — for full accountability and compliance.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Nav */}
      <header className="absolute top-0 left-0 right-0 z-10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <CasePlanrLogo className="w-8 h-8 text-burnt-peach-600" />
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
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_100%_70%_at_50%_100%,#dbeafe,#ffffff)]">
        <div className="relative max-w-5xl mx-auto px-6 pt-40 pb-32 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.05] mb-6">
            Case plans that<br />
            <span className="text-burnt-peach-600">keep cases moving.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto text-balance leading-relaxed">
            CasePlanr helps court case managers track participant progress, manage goals, document observations, and generate professional case plans — all in one place.
          </p>
        </div>
      </section>

      {/* Features */}
      <main className="flex-1 bg-slate-50">
        <section className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Everything a case manager needs</h2>
            <p className="text-slate-500 mt-3 text-balance">Purpose-built tools for every step of the case management workflow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md hover:border-burnt-peach-100 transition-all">
                <div className="w-9 h-9 bg-burnt-peach-50 rounded-xl flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-burnt-peach-600" strokeWidth={2} />
                </div>
                <h3 className="font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} CasePlanr. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-burnt-peach-600 transition-colors">Privacy Policy</a>
            <span className="text-slate-300 select-none">&middot;</span>
            <a href="/terms" className="hover:text-burnt-peach-600 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
