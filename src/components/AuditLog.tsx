import { useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Participant, AuditLogEntry, AuditCategory } from '../types';
import { subscribeToAuditLog, deleteAuditEntry, updateAuditEntry } from '../services/auditService';
import { hearingBriefStream } from '../services/geminiService';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import {
  Plus, Trash2, Pencil, Target, CheckCircle, Circle,
  FileText, LayoutDashboard, ArrowRight, Clock, User, History, Loader2, X, Check,
  Printer, RefreshCw, Wand2
} from 'lucide-react';
import CasePlanrLogo from './CasePlanrLogo';

const PHASE_NAMES = ['', 'Orientation', 'Active Treatment', 'Relapse Prevention', 'Community Reintegration', 'Commencement Preparation'];

function buildHearingBriefPrompt(participant: Participant, entries: AuditLogEntry[]): string {
  const lines: string[] = [
    `Participant: ${participant.name}`,
    `Case Number: ${participant.caseNumber}`,
    `Current Phase: ${participant.currentPhase} – ${PHASE_NAMES[participant.currentPhase] ?? ''} (this is the phase the participant is actively working on, not a completed milestone)`,
    '',
  ];

  if (participant.irasDomains?.length) {
    lines.push(`Treatment Areas (IRAS): ${participant.irasDomains.join(', ')}`);
    lines.push('');
  }

  if (participant.goals?.length) {
    const today = new Date().toISOString().slice(0, 10);
    const completedIds = new Set(participant.completedGoals ?? []);
    const overdueGoals = participant.goals.filter(g => g.dueDate && g.dueDate < today && !completedIds.has(g.id));

    if (overdueGoals.length) {
      lines.push(`OVERDUE Goals (${overdueGoals.length}):`);
      overdueGoals.forEach(g => lines.push(`- [OVERDUE since ${g.dueDate}] ${g.text}`));
      lines.push('');
    }

    lines.push('Active Goals:');
    participant.goals.forEach(g => {
      const completed = completedIds.has(g.id);
      const dateStr = g.dueDate ? ` (Due: ${g.dueDate})` : '';
      const reviewStr = g.reviewedOn ? ` [Reviewed: ${g.reviewedOn}]` : '';
      const status = completed ? '[COMPLETED] ' : g.dueDate && g.dueDate < today ? '[OVERDUE] ' : '';
      lines.push(`- ${status}${g.text}${dateStr}${reviewStr}`);
    });
    lines.push('');
  }

  if (participant.completedGoals?.length) {
    lines.push('Completed Goals:');
    participant.completedGoals.forEach(id => {
      const goal = participant.goals?.find(g => g.id === id);
      lines.push(`- ${goal ? goal.text : id}`);
    });
    lines.push('');
  }

  if (participant.notes?.trim()) {
    lines.push('Case Manager Observations:');
    lines.push(participant.notes.trim());
    lines.push('');
  }

  const recent = entries.slice(0, 20);
  if (recent.length) {
    lines.push('Recent Activity (newest first):');
    recent.forEach(e => {
      const dateStr = e.timestamp?.toDate
        ? e.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recent';
      const detail = e.details?.newValue ? `: ${e.details.newValue.slice(0, 120)}` : '';
      lines.push(`- [${dateStr}] ${e.description}${detail}`);
    });
    lines.push('');
  }

  lines.push('Based on the above case data, write a history summary for the judge.');
  return lines.join('\n');
}

type FilterKey = 'completed_goals' | 'all_goals' | 'milestones' | 'observations' | 'profile' | 'all';

const FILTERS: { key: FilterKey; label: string; categories: AuditCategory[] | null }[] = [
  { key: 'completed_goals', label: 'Completed Goals', categories: ['goal_completed'] },
  { key: 'all_goals',       label: 'All Goals',       categories: ['goal_added', 'goal_deleted', 'goal_edited', 'goal_completed'] },
  { key: 'milestones',      label: 'Milestones',      categories: ['phase_transition'] },
  { key: 'observations',    label: 'Observations',    categories: ['observation_updated', 'iras_domain_updated'] },
  { key: 'profile',         label: 'Profile',         categories: ['participant_created', 'participant_deleted', 'participant_info_updated'] },
  { key: 'all',             label: 'All Activity',    categories: null },
];

function getCategoryIcon(category: string) {
  switch (category) {
    case 'participant_created':      return <Plus className="w-3.5 h-3.5" />;
    case 'participant_deleted':      return <Trash2 className="w-3.5 h-3.5" />;
    case 'participant_info_updated': return <Pencil className="w-3.5 h-3.5" />;
    case 'phase_transition':         return <ArrowRight className="w-3.5 h-3.5" />;
    case 'goal_added':               return <Target className="w-3.5 h-3.5" />;
    case 'goal_deleted':             return <Trash2 className="w-3.5 h-3.5" />;
    case 'goal_edited':              return <Pencil className="w-3.5 h-3.5" />;
    case 'goal_completed':           return <CheckCircle className="w-3.5 h-3.5" />;
    case 'goal_uncompleted':         return <Circle className="w-3.5 h-3.5" />;
    case 'observation_updated':      return <FileText className="w-3.5 h-3.5" />;
    case 'iras_domain_updated':      return <LayoutDashboard className="w-3.5 h-3.5" />;
    default:                         return <Clock className="w-3.5 h-3.5" />;
  }
}

function getActionColors(action: string) {
  switch (action) {
    case 'created': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'deleted': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    default:        return 'bg-burnt-peach-100 dark:bg-burnt-peach-900/30 text-burnt-peach-700 dark:text-burnt-peach-400';
  }
}

function formatTimestamp(timestamp: any): string {
  if (!timestamp) return 'Just now';
  const date: Date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullTimestamp(timestamp: any): string {
  if (!timestamp) return '';
  const date: Date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AuditLog({ participant }: { participant: Participant }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('completed_goals');

  useEffect(() => {
    const removeDark = () => document.documentElement.classList.remove('dark');
    const restoreDark = () => {
      if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    };
    window.addEventListener('beforeprint', removeDark);
    window.addEventListener('afterprint', restoreDark);
    return () => {
      window.removeEventListener('beforeprint', removeDark);
      window.removeEventListener('afterprint', restoreDark);
    };
  }, []);

  // delete state
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editNewValue, setEditNewValue] = useState('');
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);

  // error banner
  const [error, setError] = useState<string | null>(null);

  // history summary
  const [briefText, setBriefText] = useState('');
  const [briefStreaming, setBriefStreaming] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefVisible, setBriefVisible] = useState(false);
  const [briefEditing, setBriefEditing] = useState(false);
  const [sentToObs, setSentToObs] = useState(false);

  const generateBrief = async () => {
    setBriefText('');
    setBriefError(null);
    setBriefVisible(true);
    setBriefStreaming(true);
    setBriefEditing(false);
    setSentToObs(false);
    try {
      for await (const chunk of hearingBriefStream(buildHearingBriefPrompt(participant, entries))) {
        setBriefText(prev => prev + chunk);
      }
    } catch (err: any) {
      setBriefError(`Failed to generate brief: ${err?.message ?? 'unknown error'}`);
    } finally {
      setBriefStreaming(false);
    }
  };

  const sendToObservations = async () => {
    if (!briefText.trim()) return;
    try {
      await updateDoc(doc(db, 'participants', participant.id), {
        notes: briefText.trim(),
        updatedAt: serverTimestamp(),
      });
      setSentToObs(true);
      setTimeout(() => setSentToObs(false), 2500);
    } catch (err: any) {
      console.error('Failed to send to observations:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const uid = auth.currentUser?.uid ?? '';
    const unsubscribe = subscribeToAuditLog(
      participant.id,
      uid,
      (newEntries) => {
        setEntries(newEntries);
        setLoading(false);
      },
      (err: any) => {
        setLoading(false);
        setError(`Could not load activity log: ${err?.code ?? err?.message ?? 'unknown error'}`);
      }
    );
    return () => unsubscribe();
  }, [participant.id]);

  const toDateInputValue = (timestamp: any): string => {
    if (!timestamp) return '';
    const d: Date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const startEdit = (entry: AuditLogEntry) => {
    setConfirmingDelete(null);
    setEditingId(entry.id);
    setEditDescription(entry.description);
    setEditNewValue(entry.details?.newValue ?? '');
    setEditDate(toDateInputValue(entry.timestamp));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDescription('');
    setEditNewValue('');
    setEditDate('');
  };

  const saveEdit = async (entry: AuditLogEntry) => {
    if (!editDescription.trim()) return;
    setSaving(true);
    try {
      const updatedDetails = entry.details
        ? { ...entry.details, newValue: editNewValue || undefined }
        : null;
      // Use noon to avoid UTC/local timezone date drift
      const date = editDate ? new Date(editDate + 'T12:00:00') : undefined;
      await updateAuditEntry(entry.id, editDescription.trim(), updatedDetails, date);
      cancelEdit();
    } catch (err: any) {
      console.error('Failed to update audit entry:', err);
      setError(`Failed to save changes: ${err?.code ?? err?.message ?? 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAuditEntry(id);
      setConfirmingDelete(null);
    } catch (err: any) {
      console.error('Failed to delete audit entry:', err);
      setError(`Failed to delete entry: ${err?.code ?? err?.message ?? 'unknown error'}`);
      setConfirmingDelete(null);
    }
  };

  const filterDef = FILTERS.find(f => f.key === activeFilter)!;
  const visible = (filterDef.categories
    ? entries.filter(e => filterDef.categories!.includes(e.category))
    : entries
  ).filter(e => e.category !== 'goal_uncompleted' && !e.description?.startsWith('Milestone Unchecked'));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-burnt-peach-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
    <div ref={cardRef} data-report-container className="print:m-0 print:p-0">
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg max-w-5xl mx-auto print:max-w-none print:shadow-none print:border-none">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-white dark:bg-slate-900 space-y-4">
        {/* Title row */}
        <div className="grid grid-cols-3 items-start gap-4">
          <div className="col-span-2 space-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {participant.name} / Case Plan History
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Created on {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="hidden sm:flex items-center justify-center gap-2 font-bold text-lg md:text-xl text-slate-900 dark:text-slate-100">
            <CasePlanrLogo className="w-8 h-8" />
            <span>CasePlanr</span>
          </div>
        </div>

        <Separator className="bg-slate-100 dark:bg-slate-800" />

        {/* Participant info strip */}
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

        <Separator className="bg-slate-100 dark:bg-slate-800" />

        {/* Activity Log label */}
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-burnt-peach-600 dark:text-burnt-peach-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">History</span>
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
            — {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {briefVisible && (
          <div className="rounded-lg border border-burnt-peach-200 dark:border-burnt-peach-800/60 bg-burnt-peach-50 dark:bg-burnt-peach-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-burnt-peach-700 dark:text-burnt-peach-400 uppercase tracking-wider">
                Narrative Summary
              </div>
              <div className="no-print flex items-center gap-1">
                {!briefStreaming && briefText && (
                  <>
                    <button
                      onClick={() => setBriefEditing(e => !e)}
                      title={briefEditing ? 'Done editing' : 'Edit'}
                      className="p-1 rounded text-burnt-peach-400 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-300 hover:bg-burnt-peach-100 dark:hover:bg-burnt-peach-900/30 transition-colors"
                    >
                      {briefEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={sendToObservations}
                      title="Send to Case Manager Observations"
                      className="no-print flex items-center gap-1 px-2 py-1 rounded text-burnt-peach-400 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-300 hover:bg-burnt-peach-100 dark:hover:bg-burnt-peach-900/30 transition-colors text-[10px] font-semibold uppercase tracking-wide"
                    >
                      {sentToObs ? (
                        <><Check className="w-3.5 h-3.5" /><span>Sent</span></>
                      ) : (
                        <><FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">To Observations</span></>
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={generateBrief}
                  disabled={briefStreaming}
                  title="Regenerate"
                  className="p-1 rounded text-burnt-peach-400 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-300 hover:bg-burnt-peach-100 dark:hover:bg-burnt-peach-900/30 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setBriefVisible(false)}
                  title="Dismiss"
                  className="p-1 rounded text-burnt-peach-400 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-300 hover:bg-burnt-peach-100 dark:hover:bg-burnt-peach-900/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {briefError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{briefError}</p>
            ) : briefEditing ? (
              <Textarea
                value={briefText}
                onChange={e => setBriefText(e.target.value)}
                className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 min-h-[100px] bg-white dark:bg-slate-900 border-burnt-peach-200 dark:border-burnt-peach-700 resize-none"
                autoFocus
              />
            ) : (
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {briefText}
                {briefStreaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-burnt-peach-400 animate-pulse rounded-sm align-middle" />}
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-3 items-center gap-4">
          <div className="col-span-2 flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${
                  activeFilter === f.key
                    ? 'bg-burnt-peach-600 dark:bg-burnt-peach-500 text-white border-burnt-peach-600 dark:border-burnt-peach-500'
                    : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-burnt-peach-300 dark:hover:border-burnt-peach-700 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={generateBrief}
              disabled={briefStreaming || loading}
              className="no-print shrink-0 h-7 text-xs font-semibold gap-1.5 px-2 border-burnt-peach-400 dark:border-burnt-peach-500 text-burnt-peach-600 dark:text-burnt-peach-400 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30 hover:text-burnt-peach-700 dark:hover:text-burnt-peach-300"
            >
              {briefStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Generate Summary</span>
              <span className="sm:hidden">Summary</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error && (
          <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <History className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No entries for this filter.</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try a different category or switch to All Activity.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((entry) => (
                <div key={entry.id} className="px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">

                  {editingId === entry.id ? (
                    /* ── inline edit mode ───────────────────────── */
                    <div className="space-y-2">
                      <Input
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        placeholder="Description"
                        className="h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-burnt-peach-500"
                        autoFocus
                      />
                      {entry.details?.newValue !== undefined && (
                        <Textarea
                          value={editNewValue}
                          onChange={e => setEditNewValue(e.target.value)}
                          placeholder="Value"
                          className="text-xs min-h-[64px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-burnt-peach-500 resize-none"
                        />
                      )}
                      <Input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-burnt-peach-500"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs text-slate-500">
                          <X className="w-3 h-3" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(entry)}
                          disabled={saving || !editDescription.trim()}
                          className="h-7 text-xs bg-burnt-peach-600 hover:bg-burnt-peach-700 text-white"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── normal view mode ───────────────────────── */
                    <div className="flex gap-4">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getActionColors(entry.action)}`}
                        title={entry.action}
                      >
                        {getCategoryIcon(entry.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                          {entry.description}
                        </p>

                        {entry.details?.newValue && (
                          <p className={`mt-1.5 text-sm leading-relaxed ${
                            entry.category === 'goal_completed'
                              ? 'text-slate-600 dark:text-slate-300'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {entry.details.newValue}
                          </p>
                        )}

                        {entry.details?.oldValue && entry.details?.newValue && entry.category !== 'goal_completed' && (
                          <div className="mt-1.5 flex items-start gap-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 w-fit max-w-full text-slate-500 dark:text-slate-400">
                            <span className="break-all">{entry.details.oldValue}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
                            <span className="break-all">{entry.details.newValue}</span>
                          </div>
                        )}

                        {entry.details?.oldValue && !entry.details?.newValue && (
                          <p className="mt-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 break-all text-slate-500 dark:text-slate-400">
                            {entry.details.oldValue}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          <User className="w-3 h-3" />
                          <span>{entry.changedBy.displayName}</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span title={formatFullTimestamp(entry.timestamp)}>{formatTimestamp(entry.timestamp)}</span>
                        </div>
                      </div>

                      {/* action buttons */}
                      <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5 no-print">
                        {confirmingDelete === entry.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmingDelete(null)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(entry)}
                              title="Edit entry"
                              className="p-1 rounded text-slate-400 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setConfirmingDelete(entry.id); }}
                              title="Delete entry"
                              className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
        )}
      </CardContent>
    </Card>
    </div>

    <div className="flex flex-col items-end gap-1 no-print mt-4 max-w-5xl mx-auto">
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
