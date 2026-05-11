import { useRef, useEffect, type ReactNode } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Participant, CurrentUser, ParticipantPortal, Signature } from '../types';
import { logAuditEvent, retractAuditEntry } from '../services/auditService';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Printer, FileText, Target, LayoutDashboard, CalendarDays, CalendarCheck } from 'lucide-react';

function formatGoalDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(iso: string): boolean {
  return new Date(iso + 'T23:59:59') < new Date();
}
import CasePlanrLogo from './CasePlanrLogo';

function formatSignedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PrintSignatureSlot({ sig, label, align = 'left' }: { sig?: Signature; label: string; align?: 'left' | 'right' }) {
  return (
    <div className={`space-y-1 w-[42%] max-w-[15rem] ${align === 'right' ? 'ml-auto text-right' : ''}`}>
      <div className={`border-b border-slate-300 h-10 flex items-end ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {sig?.type === 'drawn' && sig.imageData ? (
          <img src={sig.imageData} alt={`${label} signature`} className="max-h-8 max-w-[92%] object-contain" />
        ) : sig ? (
          <span className="signature-script text-2xl font-normal text-slate-800 leading-none">{sig.name}</span>
        ) : null}
      </div>
      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
      {sig && (
        <p className="text-[10px] font-semibold text-slate-500">
          Date signed: {formatSignedDate(sig.signedAt)}
        </p>
      )}
    </div>
  );
}

export default function CourtReport({
  participant,
  currentUser,
  portalDoc,
  actions,
}: {
  participant: Participant;
  currentUser: CurrentUser;
  portalDoc?: ParticipantPortal | null;
  actions?: ReactNode;
}) {
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getSigBlock = () =>
      reportRef.current?.querySelector('[data-signature-block]') as HTMLElement | null;

    const beforePrint = () => {
      document.documentElement.classList.remove('dark');
      const sig = getSigBlock();
      if (sig) sig.style.display = 'block';
    };
    const afterPrint = () => {
      if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
      }
      const sig = getSigBlock();
      if (sig) sig.style.display = '';
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div ref={reportRef} data-report-container className="print:m-0 print:p-0">
        <Card className="bg-white dark:bg-slate-900 max-w-5xl mx-auto overflow-visible print:max-w-none print:shadow-none print:border-none shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-white dark:bg-slate-900 space-y-3">
          <div className="grid grid-cols-3 items-start gap-4">
            <div className="col-span-2 space-y-1">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {participant.name} /<br className="sm:hidden print:hidden" /> Case Plan
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Created on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="hidden sm:flex items-center justify-center gap-2 font-bold text-lg md:text-xl text-slate-900 dark:text-slate-100">
              <CasePlanrLogo className="w-8 h-8" />
              <span>CasePlanr</span>
            </div>
          </div>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          {/* Participant info strip */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-0 items-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="text-center py-1.5 pt-0 sm:py-0">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Participant</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.name}</p>
            </div>
            <div className="text-center py-1.5 sm:py-0">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Current Phase</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.currentPhase}</p>
            </div>
            <div className="text-center py-1.5 pb-0 sm:py-0">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Case Number</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.caseNumber}</p>
            </div>
          </section>

          <Separator className="bg-slate-100 dark:bg-slate-800" />
        </CardHeader>

        <CardContent className="px-6 md:px-10 space-y-4">
          {/* IRAS Domains */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              Target Domains
            </h3>
            <div className="flex flex-wrap gap-2">
              {participant.irasDomains && participant.irasDomains.length > 0 ? (
                participant.irasDomains.map((domain, i) => (
                  <Badge key={i} variant="outline" className="border-accent-200 dark:border-accent-900 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400 font-bold px-3 py-1">
                    {domain}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No target domains selected.</p>
              )}
            </div>
          </section>

          <Separator className="bg-slate-100 dark:bg-slate-800" />
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              Active SMART Goals
            </h3>
            <div className="space-y-3">
              {participant.goals.length > 0 ? (
                [...participant.goals]
                  .sort((a, b) => {
                    const aCompleted = (participant.completedGoals || []).includes(a.id);
                    const bCompleted = (participant.completedGoals || []).includes(b.id);
                    if (aCompleted === bCompleted) return 0;
                    return aCompleted ? -1 : 1;
                  })
                  .map((goal) => {
                  const isCompleted = (participant.completedGoals || []).includes(goal.id);
                  const overdue = !isCompleted && goal.dueDate && isOverdue(goal.dueDate);

                  const handleToggleGoal = async () => {
                    const currentCompleted = participant.completedGoals || [];
                    const nowCompleting = !isCompleted;
                    const newCompleted = nowCompleting
                      ? [...currentCompleted, goal.id]
                      : currentCompleted.filter(id => id !== goal.id);

                    try {
                      await updateDoc(doc(db, 'participants', participant.id), {
                        completedGoals: newCompleted,
                        updatedAt: serverTimestamp()
                      });
                      if (nowCompleting) {
                        logAuditEvent({
                          participantId: participant.id,
                          caseManagerUid: participant.uid,
                          category: 'goal_completed',
                          description: 'Goal Completed',
                          details: { field: 'goal', newValue: goal.text },
                          currentUser
                        });
                      } else {
                        retractAuditEntry(
                          participant.id,
                          participant.uid,
                          e => e.category === 'goal_completed' && e.details?.newValue === goal.text
                        );
                      }
                    } catch (err) {
                      console.error("Update Goal Completion Error:", err);
                    }
                  };

                  return (
                    <div key={goal.id} className={`pl-4 border-l-2 py-1.5 group ${overdue ? 'border-red-300 dark:border-red-800' : 'border-accent-200 dark:border-accent-900'}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`goal-${goal.id}`}
                          checked={isCompleted}
                          onCheckedChange={handleToggleGoal}
                          className="w-4 h-4 no-print border-slate-300 dark:border-slate-700 data-[state=checked]:bg-accent-600 data-[state=checked]:border-accent-600"
                        />
                        <span
                          aria-hidden="true"
                          data-checked={isCompleted ? 'true' : 'false'}
                          className="case-plan-print-checkbox hidden print:inline-flex"
                        />
                        <Label
                          htmlFor={`goal-${goal.id}`}
                          className={`text-sm leading-relaxed cursor-pointer transition-colors ${isCompleted ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {goal.text}
                        </Label>
                        {overdue && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold uppercase text-[10px]">Overdue</span>
                        )}
                      </div>
                      {(goal.dueDate || goal.reviewedOn) && (
                        <div className="flex flex-wrap items-center gap-4 mt-1 pl-7">
                          {goal.dueDate && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${overdue ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                              <CalendarDays className="w-3 h-3 shrink-0" />
                              Due: {formatGoalDate(goal.dueDate)}
                            </span>
                          )}
                          {goal.reviewedOn && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                              <CalendarCheck className="w-3 h-3 shrink-0" />
                              Reviewed: {formatGoalDate(goal.reviewedOn)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No specific goals recorded for this period.</p>
              )}
            </div>
          </section>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          {/* Notes Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              Case Manager Observations
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[100px] print:bg-white print:border-none print:p-0">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed print:text-slate-700">
                {participant.notes || "No observations recorded for this period."}
              </p>
            </div>
          </section>

          {/* Signature block — hidden on screen, shown by [data-signature-block] rule in print CSS */}
          <div data-signature-block className="hidden mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              By signing below, I acknowledge that I have reviewed this plan, understand what is expected of me, and agree to fulfill the outlined goals, objectives, and tasks to the best of my ability.
            </p>
            <div className="flex flex-row justify-between items-end gap-6">
              <PrintSignatureSlot sig={portalDoc?.caseManagerSignature} label="Case Manager Signature" />
              <PrintSignatureSlot sig={portalDoc?.participantSignature} label="Participant Signature" align="right" />
            </div>
            {participant.shareToken && (
              <p className="mt-4 text-center text-[10px] font-semibold text-slate-400 tracking-wide">
                Document ID: {participant.shareToken}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 no-print mt-8 max-w-5xl mx-auto">
        {actions}
        <Button
          onClick={() => window.print()}
          className="w-full sm:w-auto bg-accent-600 hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-600 text-white font-semibold shadow-sm shadow-accent-100 dark:shadow-accent-900/20 transition-all active:scale-[0.98]"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </Button>
      </div>
    </div>
  );
}
