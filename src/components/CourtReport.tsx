import { useRef, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Participant, CurrentUser } from '../types';
import { logAuditEvent } from '../services/auditService';
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

export default function CourtReport({ participant, currentUser }: { participant: Participant; currentUser: CurrentUser }) {
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const removeDark = () => document.documentElement.classList.remove('dark');
    const restoreDark = () => {
      if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
      }
    };
    window.addEventListener('beforeprint', removeDark);
    window.addEventListener('afterprint', restoreDark);
    return () => {
      window.removeEventListener('beforeprint', removeDark);
      window.removeEventListener('afterprint', restoreDark);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div ref={reportRef} data-report-container className="print:m-0 print:p-0">
        <Card className="bg-white dark:bg-slate-900 max-w-5xl mx-auto overflow-visible print:max-w-none print:shadow-none print:border-none shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-3 items-start gap-4">
            <div className="col-span-2 space-y-1">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{participant.name} / Case Plan</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Created on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="hidden sm:flex items-center justify-center gap-2 font-bold text-lg md:text-xl text-slate-900 dark:text-slate-100">
              <CasePlanrLogo className="w-8 h-8" />
              <span>CasePlanr</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-6 md:px-10 py-1 space-y-4">
          {/* Participant Info */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 items-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="text-center py-2 sm:py-0">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Participant</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.name}</p>
            </div>
            <div className="text-center py-2 sm:py-0">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Current Phase</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.currentPhase}</p>
            </div>
            <div className="text-center py-2 sm:py-0">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Case Number</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.caseNumber}</p>
            </div>
          </section>

          {/* IRAS Domains */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-burnt-peach-600 dark:text-burnt-peach-400" />
              Target Domains
            </h3>
            <div className="flex flex-wrap gap-2">
              {participant.irasDomains && participant.irasDomains.length > 0 ? (
                participant.irasDomains.map((domain, i) => (
                  <Badge key={i} variant="outline" className="border-burnt-peach-200 dark:border-burnt-peach-900 bg-burnt-peach-50 dark:bg-burnt-peach-950/30 text-burnt-peach-700 dark:text-burnt-peach-400 font-bold px-3 py-1">
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
              <Target className="w-4 h-4 text-burnt-peach-600 dark:text-burnt-peach-400" />
              Active SMART Goals
            </h3>
            <div className="space-y-3">
              {participant.goals.length > 0 ? (
                participant.goals.map((goal) => {
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
                      logAuditEvent({
                        participantId: participant.id,
                        caseManagerUid: participant.uid,
                        category: nowCompleting ? 'goal_completed' : 'goal_uncompleted',
                        description: nowCompleting ? 'Goal Completed' : 'Goal Uncompleted',
                        details: { field: 'goal', newValue: goal.text },
                        currentUser
                      });
                    } catch (err) {
                      console.error("Update Goal Completion Error:", err);
                    }
                  };

                  return (
                    <div key={goal.id} className={`pl-4 border-l-2 py-1.5 group ${overdue ? 'border-red-300 dark:border-red-800' : 'border-burnt-peach-200 dark:border-burnt-peach-900'}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`goal-${goal.id}`}
                          checked={isCompleted}
                          onCheckedChange={handleToggleGoal}
                          className="w-4 h-4 no-print border-slate-300 dark:border-slate-700 data-[state=checked]:bg-burnt-peach-600 data-[state=checked]:border-burnt-peach-600"
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
              <FileText className="w-4 h-4 text-burnt-peach-600 dark:text-burnt-peach-400" />
              Case Manager Observations
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[100px]">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {participant.notes || "No observations recorded for this period."}
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-12 border-t border-slate-100 dark:border-slate-800 mt-12">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-8 mb-8">
              <div className="space-y-1 w-full sm:w-auto">
                <div className="w-full sm:w-48 border-b border-slate-400 dark:border-slate-600 h-8"></div>
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Case Manager Signature</p>
              </div>
              <div className="space-y-1 w-full sm:w-auto">
                <div className="w-full sm:w-48 border-b border-slate-400 dark:border-slate-600 h-8"></div>
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider text-left sm:text-right">Participant Signature</p>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-slate-50 dark:border-slate-900">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Report ID</p>
              <p className="text-[10px] font-mono text-slate-300 dark:text-slate-700">{participant.id.toUpperCase()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>

      <div className="flex flex-col items-end gap-1 no-print mt-8 max-w-5xl mx-auto">
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="w-full sm:w-auto border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </Button>
        <p className="text-[11px] text-slate-400 dark:text-slate-600">
          Choose "Save as PDF" in the print dialog to download
        </p>
      </div>
    </div>
  );
}
