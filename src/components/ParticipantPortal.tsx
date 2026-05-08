import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ParticipantPortal as PortalData, Signature, GoalEntry } from '../types';
import SignaturePad from './SignaturePad';
import CasePlanrLogo from './CasePlanrLogo';
import { Progress } from './ui/progress';
import {
  AlertCircle,
  Brain,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  FlaskConical,
  GraduationCap,
  Hash,
  Home,
  Scale,
  ShieldCheck,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';

const IRAS_DOMAIN_ICONS: Record<string, LucideIcon> = {
  'Criminal History': Scale,
  'Education, Employment, and Financial': GraduationCap,
  'Family and Social Support': Home,
  'Substance Use': FlaskConical,
  'Peer Associations': Users,
  'Criminal Attitudes and Behaviors': Brain,
};

function formatDisplayDate(iso: string) {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function InlineDateDisplay({ value }: { value?: string | null }) {
  if (!value) {
    return (
      <span className="text-xl font-black text-slate-200">—</span>
    );
  }

  try {
    const date = new Date(`${value}T00:00:00`);
    const year = String(date.getFullYear()).slice(-2);
    return (
      <span className="flex items-baseline gap-1 whitespace-nowrap min-w-0">
        <span className="text-xl font-black text-burnt-peach-600">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span className="text-sm font-bold text-slate-300">
          '{year}
        </span>
      </span>
    );
  } catch {
    return <span className="text-xl font-black text-burnt-peach-600">{value}</span>;
  }
}

function formatSignedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return iso;
  }
}

function SignatureDisplay({ sig, label }: { sig: Signature; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 className="w-4 h-4 text-burnt-peach-600 shrink-0" />
        <span className="text-[11px] font-bold text-burnt-peach-700 uppercase tracking-wider truncate">{label} Signed</span>
      </div>
      {sig.type === 'drawn' && sig.imageData ? (
        <img src={sig.imageData} alt={`${label} signature`} className="max-h-20 max-w-full rounded-lg border border-slate-100 bg-white" />
      ) : (
        <p className="signature-script text-4xl text-slate-700">{sig.name}</p>
      )}
      <p className="text-xs text-slate-500 leading-relaxed">
        {sig.name} &middot; {formatSignedAt(sig.signedAt)}
      </p>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <Icon className="w-4 h-4 text-burnt-peach-600 shrink-0" />
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function DomainPill({ domain }: { domain: string }) {
  const Icon = IRAS_DOMAIN_ICONS[domain] || ClipboardList;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-burnt-peach-100 bg-burnt-peach-50 px-2.5 py-1.5 text-xs font-semibold text-burnt-peach-700">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{domain}</span>
    </span>
  );
}

function GoalCard({ goal, completed, today }: { goal: GoalEntry; completed?: boolean; today: string }) {
  const overdue = !!goal.dueDate && goal.dueDate < today && !completed;

  return (
    <div className={`rounded-xl border p-3.5 ${completed ? 'border-burnt-peach-100 bg-burnt-peach-50/70' : overdue ? 'border-red-100 bg-red-50/70' : 'border-slate-100 bg-slate-50'}`}>
      <div className="min-w-0 space-y-1.5">
        <p className={`text-sm leading-relaxed ${completed ? 'text-slate-600 line-through decoration-slate-400' : 'text-slate-800 font-medium'}`}>
          {goal.text}
        </p>
        {goal.dueDate && (
          <div className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${overdue ? 'bg-red-100 text-red-700' : 'bg-white text-slate-500 border border-slate-100'}`}>
            {overdue ? 'Overdue' : 'Due'} {formatDisplayDate(goal.dueDate)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParticipantPortal() {
  const { token } = useParams<{ token: string }>();
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  // Ensure light mode for the portal page
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (!token) { setNotFound(true); return; }
    const unsubscribe = onSnapshot(doc(db, 'participantPortals', token), (snap) => {
      if (snap.exists()) {
        setPortal(snap.data() as PortalData);
      } else {
        setNotFound(true);
      }
    }, () => setNotFound(true));
    return () => unsubscribe();
  }, [token]);

  const handleParticipantSign = async (sig: Signature) => {
    if (!token) return;
    setSigning(true);
    setSignError(null);
    try {
      await updateDoc(doc(db, 'participantPortals', token), {
        participantSignature: sig,
      });
    } catch (err) {
      console.error('Sign error:', err);
      setSignError('Failed to submit signature. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Link Not Found</h1>
          <p className="text-slate-500 text-sm">This case plan link is invalid or has been revoked by your case manager.</p>
        </div>
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-burnt-peach-200 border-t-burnt-peach-600 rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const completedSet = new Set(portal.completedGoals || []);
  const activeGoals = (portal.goals || []).filter(g => !completedSet.has(g.id));
  const doneGoals = (portal.goals || []).filter(g => completedSet.has(g.id));

  const updatedAt = portal.updatedAt?.toDate
    ? portal.updatedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const phaseCount = Math.max(portal.milestonePhaseLabels.length, 1);
  const progressValue = Math.round((portal.currentPhase / phaseCount) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <CasePlanrLogo className="w-9 h-9 shrink-0" />
            <h1 className="min-w-0 truncate text-xl font-black tracking-tight text-slate-900">CasePlanr</h1>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-burnt-peach-600" />
            Secure Link
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8 space-y-4 sm:space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight break-words">{portal.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 min-w-0">
                <Hash className="w-4 h-4 shrink-0" />
                <span className="font-mono truncate">{portal.caseNumber}</span>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:w-auto md:min-w-[26rem]">
            <div className="space-y-1 pr-3 sm:pr-5">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Phase</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-burnt-peach-600">{portal.currentPhase}</span>
                <span className="text-slate-300 font-bold text-sm">/ {phaseCount}</span>
              </div>
            </div>

            <div className="space-y-1 px-3 sm:px-5">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Progress</p>
              <div className="space-y-1">
                <span className="text-xl font-black text-burnt-peach-600">{progressValue}%</span>
                <Progress value={progressValue} className="h-1.5 w-full max-w-[4rem] bg-slate-100" />
              </div>
            </div>

            <div className="space-y-1 pl-3 sm:pl-5">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3 h-3 shrink-0" /> Date
              </p>
              <InlineDateDisplay value={portal.phaseUpdate} />
            </div>
          </div>
        </div>

        {(portal.caseManagerName || portal.caseManagerTitle || updatedAt) && (
          <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
            {portal.caseManagerName && (
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  Managed by <span className="font-semibold text-slate-700">{portal.caseManagerName}</span>
                </span>
              </div>
            )}
            {portal.caseManagerTitle && (
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{portal.caseManagerTitle}</span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Last updated {updatedAt}</span>
              </div>
            )}
          </div>
        )}

        {portal.irasDomains.length > 0 && (
          <SectionCard icon={ClipboardList} title="Treatment Areas">
            <div className="flex flex-wrap gap-2">
              {portal.irasDomains.map(domain => (
                <DomainPill key={domain} domain={domain} />
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard icon={CheckCircle2} title="Milestone Progress">
          <div className="space-y-2.5">
            {portal.milestonePhaseLabels.map((label, i) => {
              const key = `phase${i + 1}`;
              const done = !!portal.milestones[key];
              const isCurrent = i + 1 === portal.currentPhase;
              return (
                <div key={key} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${done ? 'border-burnt-peach-100 bg-burnt-peach-50/70' : isCurrent ? 'border-burnt-peach-100 bg-burnt-peach-50' : 'border-slate-100 bg-slate-50'}`}>
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-burnt-peach-600 shrink-0" />
                    : <Circle className={`w-5 h-5 shrink-0 ${isCurrent ? 'text-burnt-peach-500' : 'text-slate-300'}`} />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={`text-sm font-semibold leading-snug ${done ? 'text-burnt-peach-700' : isCurrent ? 'text-burnt-peach-700' : 'text-slate-500'}`}>
                        Phase {i + 1}: {label}
                      </span>
                      {isCurrent && !done && (
                        <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-burnt-peach-600 shadow-sm">Current</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {activeGoals.length > 0 && (
          <SectionCard icon={Target} title="Active Goals">
            <div className="space-y-3">
              {activeGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal} today={today} />
              ))}
            </div>
          </SectionCard>
        )}

        {doneGoals.length > 0 && (
          <SectionCard icon={CheckCircle2} title="Completed Goals">
            <div className="space-y-3">
              {doneGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal} completed today={today} />
              ))}
            </div>
          </SectionCard>
        )}

        {portal.notes && (
          <SectionCard icon={FileText} title="Case Manager Observations">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium text-slate-800">
                {portal.notes}
              </p>
            </div>
          </SectionCard>
        )}

        <SectionCard icon={ShieldCheck} title="Signatures">
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-500">
              By signing below, you acknowledge that you have reviewed this case plan and understand the goals, milestones, and expectations outlined above.
            </p>

            {portal.caseManagerSignature ? (
              <SignatureDisplay sig={portal.caseManagerSignature} label="Case Manager" />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-medium text-slate-400">Case manager signature pending</p>
              </div>
            )}

            {portal.participantSignature ? (
              <SignatureDisplay sig={portal.participantSignature} label="Participant" />
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">Participant Signature</p>
                {signError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-600">
                    {signError}
                  </div>
                )}
                <SignaturePad onSign={handleParticipantSign} disabled={signing} defaultName={portal.name} />
              </div>
            )}
          </div>
        </SectionCard>

        <p className="px-4 pb-6 text-center text-[11px] font-medium text-slate-300">
          Powered by CasePlanr &middot; Confidential Case Management Record
        </p>
      </main>
    </div>
  );
}
