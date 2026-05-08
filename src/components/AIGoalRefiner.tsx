import { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Participant, CurrentUser, StoredTemplateCategory, GoalEntry } from '../types';
import { logAuditEvent } from '../services/auditService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Wand2, Plus, Trash2, CheckCircle, Loader2, Pencil, Check, X, BookOpen, ChevronDown, ChevronUp, Pill, Briefcase, Home, Users, Brain, Scale, Heart, DollarSign, Activity, GripVertical, CalendarDays, CalendarCheck } from 'lucide-react';
import { DatePicker } from './ui/date-picker';
import { refineGoalStream } from '../services/geminiService';

function formatGoalDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(iso: string): boolean {
  return new Date(iso + 'T23:59:59') < new Date();
}

function isDueSoon(iso: string): boolean {
  const due = new Date(iso + 'T23:59:59');
  const now = new Date();
  return due > now && due <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
}


interface GoalTemplate {
  label: string;
  notes: string;
}

interface TemplateCategory {
  domain: string;
  shortLabel: string;
  Icon: React.ElementType;
  templates: GoalTemplate[];
}

const GOAL_TEMPLATES: TemplateCategory[] = [
  {
    domain: "Substance Use",
    shortLabel: "Substance",
    Icon: Pill,
    templates: [
      {
        label: "Attend support meetings",
        notes: "Participant needs to attend AA/NA meetings at least 3 times per week and check in with a sponsor weekly to support sobriety."
      },
      {
        label: "Complete treatment program",
        notes: "Participant needs to complete an outpatient substance use treatment program and submit weekly drug screen results to the court."
      },
      {
        label: "Relapse prevention plan",
        notes: "Participant needs to develop a written relapse prevention plan identifying personal triggers, coping strategies, and emergency support contacts."
      }
    ]
  },
  {
    domain: "Education, Employment, and Financial",
    shortLabel: "Employment",
    Icon: Briefcase,
    templates: [
      {
        label: "Gain stable employment",
        notes: "Participant needs to obtain stable employment within 60 days by applying to at least 3 positions per week and reporting job search activity to case manager."
      },
      {
        label: "Complete education or GED",
        notes: "Participant needs to enroll in and complete an adult education or GED program within 6 months to improve long-term employment prospects."
      },
      {
        label: "Financial stability plan",
        notes: "Participant needs to develop and follow a monthly budget, reduce outstanding debt, and maintain consistent savings to achieve financial stability."
      }
    ]
  },
  {
    domain: "Family and Social Support",
    shortLabel: "Family",
    Icon: Home,
    templates: [
      {
        label: "Family counseling",
        notes: "Participant needs to attend family counseling sessions twice monthly to improve communication and rebuild family relationships damaged by criminal behavior."
      },
      {
        label: "Secure stable housing",
        notes: "Participant needs to secure and maintain stable housing within 30 days, with written verification of address provided to case manager monthly."
      },
      {
        label: "Parenting skills",
        notes: "Participant needs to complete a certified parenting skills course and demonstrate improved parent-child interaction during observed family visits."
      }
    ]
  },
  {
    domain: "Peer Associations",
    shortLabel: "Peers",
    Icon: Users,
    templates: [
      {
        label: "Reduce pro-criminal contact",
        notes: "Participant needs to identify and reduce contact with pro-criminal peers and replace that time with prosocial activities or support group attendance."
      },
      {
        label: "Build prosocial network",
        notes: "Participant needs to join a community organization, faith community, or volunteer group to build a positive social support network within 60 days."
      }
    ]
  },
  {
    domain: "Criminal Attitudes and Behaviors",
    shortLabel: "Attitudes",
    Icon: Brain,
    templates: [
      {
        label: "Cognitive behavioral therapy",
        notes: "Participant needs to complete a cognitive behavioral therapy program addressing criminal thinking errors, distorted beliefs, and high-risk decision making."
      },
      {
        label: "Anger management",
        notes: "Participant needs to complete a certified anger management course and demonstrate consistent use of de-escalation techniques in daily situations."
      }
    ]
  },
  {
    domain: "Criminal History",
    shortLabel: "Compliance",
    Icon: Scale,
    templates: [
      {
        label: "Probation compliance",
        notes: "Participant needs to maintain full compliance with all probation conditions, attend all scheduled check-ins on time, and report any issues to case manager immediately."
      },
      {
        label: "Community service hours",
        notes: "Participant needs to complete all required community service hours by the court-ordered deadline and provide signed documentation of completion."
      },
      {
        label: "Restitution payment plan",
        notes: "Participant needs to establish and maintain a consistent restitution payment plan, making monthly payments until the full balance is paid."
      }
    ]
  },
  {
    domain: "Mental Health",
    shortLabel: "Mental Health",
    Icon: Heart,
    templates: [
      {
        label: "Engage in therapy",
        notes: "Participant needs to attend individual mental health therapy sessions at least twice monthly with a licensed therapist and provide attendance verification."
      },
      {
        label: "Medication management",
        notes: "Participant needs to consistently take prescribed psychiatric medications, attend all medication management appointments, and report any side effects to their provider."
      },
      {
        label: "Crisis safety plan",
        notes: "Participant needs to work with their therapist to develop a written crisis safety plan identifying warning signs, coping strategies, and emergency contacts."
      }
    ]
  },
  {
    domain: "Financial",
    shortLabel: "Financial",
    Icon: DollarSign,
    templates: [
      {
        label: "Open a bank account",
        notes: "Participant needs to open a checking or savings account at a local bank or credit union within 30 days to support financial stability and track income."
      },
      {
        label: "Enroll in benefits",
        notes: "Participant needs to apply for eligible public benefits (SNAP, Medicaid, housing assistance) within 30 days to reduce financial barriers to stability."
      },
      {
        label: "Debt reduction plan",
        notes: "Participant needs to contact creditors, establish a realistic debt repayment schedule, and make consistent monthly payments to reduce outstanding balances."
      }
    ]
  },
  {
    domain: "Physical Health",
    shortLabel: "Physical Health",
    Icon: Activity,
    templates: [
      {
        label: "Establish primary care",
        notes: "Participant needs to establish care with a primary care physician within 45 days, attend an initial wellness exam, and follow through on any referrals."
      },
      {
        label: "Manage chronic condition",
        notes: "Participant needs to consistently attend specialist appointments, follow prescribed treatment for their chronic health condition, and report any health changes to case manager."
      },
      {
        label: "Physical wellness routine",
        notes: "Participant needs to develop and maintain a weekly physical wellness routine including regular exercise or recreational activity to support overall health and stress reduction."
      }
    ]
  }
];

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  "Substance Use": Pill,
  "Education, Employment, and Financial": Briefcase,
  "Family and Social Support": Home,
  "Peer Associations": Users,
  "Criminal Attitudes and Behaviors": Brain,
  "Criminal History": Scale,
  "Mental Health": Heart,
  "Financial": DollarSign,
  "Physical Health": Activity,
};

export const DEFAULT_STORED_TEMPLATES: StoredTemplateCategory[] = GOAL_TEMPLATES.map(
  ({ domain, shortLabel, templates }) => ({ domain, shortLabel, templates })
);

export default function AIGoalRefiner({ participant, currentUser, goalTemplates }: { participant: Participant; currentUser: CurrentUser; goalTemplates?: StoredTemplateCategory[] | null }) {
  const [roughNotes, setRoughNotes] = useState('');
  const [refinedGoal, setRefinedGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState('');
  const [editingGoalDueDate, setEditingGoalDueDate] = useState('');
  const [pendingGoalText, setPendingGoalText] = useState<string | null>(null);
  const [pendingDueDate, setPendingDueDate] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  const effectiveTemplates = (goalTemplates ?? DEFAULT_STORED_TEMPLATES).map(cat => ({
    ...cat,
    Icon: DOMAIN_ICONS[cat.domain] ?? BookOpen,
  }));
  const currentDomain = activeDomain ?? effectiveTemplates[0]?.domain ?? '';

  const handleRefine = async () => {
    if (!roughNotes.trim()) return;
    setLoading(true);
    setRefinedGoal('');
    
    try {
      const stream = refineGoalStream(roughNotes);
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setRefinedGoal(fullText);
      }
    } catch (err) {
      console.error("Refine Error:", err);
      setRefinedGoal("Error refining goal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = () => {
    if (!refinedGoal) return;
    setPendingGoalText(refinedGoal);
  };

  const commitAddGoal = async () => {
    if (!pendingGoalText) return;
    const entry: GoalEntry = {
      id: crypto.randomUUID(),
      text: pendingGoalText,
      ...(pendingDueDate ? { dueDate: pendingDueDate } : {}),
    };
    try {
      await updateDoc(doc(db, 'participants', participant.id), {
        goals: [...participant.goals, entry],
        updatedAt: serverTimestamp()
      });
      logAuditEvent({
        participantId: participant.id,
        caseManagerUid: participant.uid,
        category: 'goal_added',
        description: 'Goal Added',
        details: { newValue: entry.text.length > 120 ? entry.text.slice(0, 120) + '…' : entry.text },
        currentUser
      });
      setPendingGoalText(null);
      setPendingDueDate('');
      setRoughNotes('');
      setRefinedGoal('');
    } catch (err) {
      console.error("Add Goal Error:", err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const goalToDelete = participant.goals.find(g => g.id === goalId);
    try {
      const newGoals = participant.goals.filter(g => g.id !== goalId);
      const newCompleted = (participant.completedGoals ?? []).filter(id => id !== goalId);
      await updateDoc(doc(db, 'participants', participant.id), {
        goals: newGoals,
        completedGoals: newCompleted,
        updatedAt: serverTimestamp()
      });
      logAuditEvent({
        participantId: participant.id,
        caseManagerUid: participant.uid,
        category: 'goal_deleted',
        description: 'Goal Removed',
        details: { oldValue: goalToDelete ? (goalToDelete.text.length > 120 ? goalToDelete.text.slice(0, 120) + '…' : goalToDelete.text) : '' },
        currentUser
      });
    } catch (err) {
      console.error("Delete Goal Error:", err);
    }
  };

  const handleUpdateGoal = async (goalId: string) => {
    if (!editingGoalValue.trim()) return;
    const oldGoal = participant.goals.find(g => g.id === goalId);
    try {
      const newGoals = participant.goals.map(g =>
        g.id === goalId
          ? { ...g, text: editingGoalValue.trim(), dueDate: editingGoalDueDate || undefined }
          : g
      );
      await updateDoc(doc(db, 'participants', participant.id), {
        goals: newGoals,
        updatedAt: serverTimestamp()
      });
      logAuditEvent({
        participantId: participant.id,
        caseManagerUid: participant.uid,
        category: 'goal_edited',
        description: 'Goal Edited',
        details: {
          oldValue: oldGoal ? (oldGoal.text.length > 80 ? oldGoal.text.slice(0, 80) + '…' : oldGoal.text) : '',
          newValue: editingGoalValue.length > 80 ? editingGoalValue.slice(0, 80) + '…' : editingGoalValue
        },
        currentUser
      });
      setEditingGoalId(null);
    } catch (err) {
      console.error("Update Goal Error:", err);
    }
  };

  const handleReorderGoals = async (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = [...participant.goals];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    await updateDoc(doc(db, 'participants', participant.id), {
      goals: reordered,
      updatedAt: serverTimestamp()
    });
  };

  const startEditingGoal = (goal: GoalEntry) => {
    setEditingGoalId(goal.id);
    setEditingGoalValue(goal.text);
    setEditingGoalDueDate(goal.dueDate ?? '');
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  Generate <span className="hidden sm:inline">SMART </span>Goals
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">Create your own or transform rough notes into SMART goals.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const opening = !showTemplates;
                  setShowTemplates(opening);
                  if (opening) {
                    setTimeout(() => {
                      if (templatesRef.current) {
                        const rect = templatesRef.current.getBoundingClientRect();
                        const scrollEl = templatesRef.current.closest('.overflow-y-auto');
                        if (scrollEl) {
                          scrollEl.scrollBy({ top: rect.top - 80, behavior: 'smooth' });
                        }
                      }
                    }, 50);
                  }
                }}
                className="shrink-0 text-burnt-peach-600 dark:text-burnt-peach-400 border-burnt-peach-200 dark:border-burnt-peach-800 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30 gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Templates
                {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showTemplates && (
              <div ref={templatesRef} className="rounded-xl border border-burnt-peach-100 dark:border-burnt-peach-900/50 bg-burnt-peach-50/50 dark:bg-burnt-peach-950/20 p-3 animate-in slide-in-from-top-2 duration-200">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-burnt-peach-600 dark:text-burnt-peach-400 mb-3">
                  Select a template to pre-fill your notes
                </p>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {effectiveTemplates.map(cat => (
                    <button
                      key={cat.domain}
                      onClick={() => setActiveDomain(cat.domain)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all shadow-sm ${
                        currentDomain === cat.domain
                          ? 'bg-burnt-peach-600 text-white border-burnt-peach-600 dark:bg-burnt-peach-500 dark:border-burnt-peach-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-burnt-peach-300 dark:hover:border-burnt-peach-700 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-400'
                      }`}
                    >
                      <cat.Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10px] font-bold leading-tight">{cat.shortLabel}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {effectiveTemplates.find(c => c.domain === currentDomain)?.templates.map(t => (
                    <button
                      key={t.label}
                      onClick={() => {
                        setRoughNotes(t.notes);
                        setShowTemplates(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-burnt-peach-300 dark:hover:border-burnt-peach-700 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30 transition-all leading-relaxed"
                    >
                      <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">{t.label}</span>
                      {t.notes}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Textarea
              value={roughNotes}
              onChange={(e) => setRoughNotes(e.target.value)}
              placeholder="e.g., Participant needs to find a job and attend 3 meetings a week for the next month."
              className="min-h-[120px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => { if (roughNotes.trim()) setPendingGoalText(roughNotes.trim()); }}
                disabled={loading || !roughNotes.trim()}
                className="w-full bg-burnt-peach-600 dark:bg-burnt-peach-500 hover:bg-burnt-peach-700 dark:hover:bg-burnt-peach-600 text-white"
              >
                <Plus className="w-4 h-4" />
                Add to Case Plan
              </Button>
              <Button 
                onClick={handleRefine} 
                disabled={loading || !roughNotes.trim()} 
                className="w-full bg-burnt-peach-600 dark:bg-burnt-peach-500 hover:bg-burnt-peach-700 dark:hover:bg-burnt-peach-600 text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI is thinking...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    Refine Goal
                  </span>
                )}
              </Button>
            </div>

            {(loading || refinedGoal) && (
              <div className="mt-6 p-4 bg-burnt-peach-50 dark:bg-burnt-peach-900/20 rounded-lg border border-burnt-peach-100 dark:border-burnt-peach-900/50 animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-bold text-burnt-peach-600 dark:text-burnt-peach-400 uppercase mb-3">Refined SMART Goal</h4>
                {loading && !refinedGoal ? (
                  <div className="space-y-2 animate-pulse py-1">
                    <div className="h-2.5 bg-burnt-peach-200 dark:bg-burnt-peach-900/60 rounded-full w-full" />
                    <div className="h-2.5 bg-burnt-peach-200 dark:bg-burnt-peach-900/60 rounded-full w-5/6" />
                    <div className="h-2.5 bg-burnt-peach-200 dark:bg-burnt-peach-900/60 rounded-full w-4/6" />
                    <div className="h-2.5 bg-burnt-peach-200 dark:bg-burnt-peach-900/60 rounded-full w-3/4" />
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={refinedGoal}
                      onChange={(e) => setRefinedGoal(e.target.value)}
                      className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 border-burnt-peach-100 dark:border-burnt-peach-900/50 focus-visible:ring-burnt-peach-500 min-h-[100px]"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddGoal}
                      className="mt-4 w-full bg-burnt-peach-600 dark:bg-burnt-peach-500 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Case Plan
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Active <span className="hidden sm:inline">SMART </span>Goals</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Current objectives for this participant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="pr-4">
            {participant.goals.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-600">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No goals set yet.</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleReorderGoals}>
                <Droppable droppableId="goals">
                  {(provided) => (
                    <div className="space-y-4" ref={provided.innerRef} {...provided.droppableProps}>
                      {participant.goals.map((goal, idx) => (
                        <Draggable key={goal.id} draggableId={goal.id} index={idx} isDragDisabled={editingGoalId === goal.id}>
                          {(drag, snapshot) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              className={`p-4 bg-white dark:bg-slate-950 border rounded-lg shadow-sm flex flex-col gap-4 group transition-shadow ${snapshot.isDragging ? 'border-burnt-peach-300 dark:border-burnt-peach-700 shadow-lg' : 'border-slate-100 dark:border-slate-800'}`}
                            >
                              {editingGoalId === goal.id ? (
                                <div className="space-y-3">
                                  <Textarea
                                    value={editingGoalValue}
                                    onChange={(e) => setEditingGoalValue(e.target.value)}
                                    className="min-h-[100px] text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border-burnt-peach-200 dark:border-burnt-peach-800 focus-visible:ring-burnt-peach-500"
                                    autoFocus
                                  />
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                      <CalendarDays className="w-3 h-3" /> Due Date
                                    </label>
                                    <DatePicker
                                      value={editingGoalDueDate}
                                      onChange={setEditingGoalDueDate}
                                      placeholder="No due date"
                                      phaseUpDate={participant.phaseUpdate}
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingGoalId(null)}
                                      className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                      <X className="w-4 h-4" />
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateGoal(goal.id)}
                                      className="bg-burnt-peach-600 dark:bg-burnt-peach-500 text-white"
                                    >
                                      <Check className="w-4 h-4" />
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <div {...drag.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 shrink-0 self-center">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{goal.text}</p>
                                    {(goal.dueDate || goal.reviewedOn) && (
                                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                        {goal.dueDate && (
                                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${isOverdue(goal.dueDate) ? 'text-red-500 dark:text-red-400' : isDueSoon(goal.dueDate) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                            <CalendarDays className="w-3 h-3 shrink-0" />
                                            Due: {formatGoalDate(goal.dueDate)}
                                            {isOverdue(goal.dueDate) && (
                                              <span className="ml-0.5 px-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold uppercase text-[10px]">Overdue</span>
                                            )}
                                            {isDueSoon(goal.dueDate) && (
                                              <span className="ml-0.5 px-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold uppercase text-[10px]">Due Soon</span>
                                            )}
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
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => startEditingGoal(goal)}
                                      className="h-8 w-8 text-slate-300 dark:text-slate-600 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-400 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteGoal(goal.id)}
                                      className="h-8 w-8 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </CardContent>
      </Card>
    </div>

    {pendingGoalText && (
      <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200 p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Set a Due Date</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Optional — you can always update this later.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">{pendingGoalText}</p>
          </div>

          <DatePicker
            value={pendingDueDate}
            onChange={setPendingDueDate}
            placeholder="Set due date (optional)"
            phaseUpDate={participant.phaseUpdate}
          />

          <div className="flex gap-3 pt-1">
            <Button
              variant="ghost"
              onClick={() => { setPendingGoalText(null); setPendingDueDate(''); }}
              className="flex-1 text-slate-500 dark:text-slate-400"
            >
              Cancel
            </Button>
            <Button
              onClick={commitAddGoal}
              className="flex-1 bg-burnt-peach-600 hover:bg-burnt-peach-700 dark:bg-burnt-peach-500 dark:hover:bg-burnt-peach-600 text-white font-bold"
            >
              <Plus className="w-4 h-4" />
              Add to Case Plan
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
