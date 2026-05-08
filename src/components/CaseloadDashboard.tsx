import { useState, useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Plus, ArrowRight, CalendarDays, Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { cn } from '../lib/utils';
import { Participant, MilestonePhase, GoalEntry } from '../types';

interface Props {
  participants: Participant[];
  milestonePhases: MilestonePhase[];
  onSelectParticipant: (id: string) => void;
  onAddParticipant: () => void;
}

type Filter = 'all' | 'overdue' | 'due-soon' | 'on-track' | 'no-goals';

function activeGoals(p: Participant): GoalEntry[] {
  return p.goals.filter(g => !p.completedGoals?.includes(g.id));
}

function overdueGoals(goals: GoalEntry[]): GoalEntry[] {
  const now = new Date();
  return goals.filter(g => g.dueDate && new Date(g.dueDate + 'T23:59:59') < now);
}

function dueSoonGoals(goals: GoalEntry[]): GoalEntry[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return goals.filter(g => {
    if (!g.dueDate) return false;
    const d = new Date(g.dueDate + 'T23:59:59');
    return d >= now && d <= cutoff;
  });
}

function phaseName(phase: number, phases: MilestonePhase[]): string {
  if (phase === 0) return 'Not Started';
  return phases[phase - 1]?.label ?? `Phase ${phase}`;
}

function progressPct(phase: number, phases: MilestonePhase[]): number {
  if (!phases.length) return 0;
  return Math.round((phase / phases.length) * 100);
}

function relativeTime(ts: any): string | null {
  if (!ts) return null;
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const FILTERS: [Filter, string][] = [
  ['all',      'All'],
  ['overdue',  'Overdue'],
  ['due-soon', 'Due Soon'],
  ['on-track', 'On Track'],
  ['no-goals', 'No Goals'],
];


export default function CaseloadDashboard({ participants, milestonePhases, onSelectParticipant, onAddParticipant }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const stats = useMemo(() => {
    let totalOverdue = 0, totalDueSoon = 0, totalActive = 0, withOverdue = 0;
    for (const p of participants) {
      const active = activeGoals(p);
      const od = overdueGoals(active);
      const ds = dueSoonGoals(active);
      totalOverdue += od.length;
      totalDueSoon += ds.length;
      totalActive += active.length;
      if (od.length > 0) withOverdue++;
    }
    return { totalOverdue, totalDueSoon, totalActive, withOverdue };
  }, [participants]);

  const displayed = useMemo(() => {
    let list = participants;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.caseNumber.toLowerCase().includes(q)
      );
    }

    if (filter !== 'all') {
      list = list.filter(p => {
        const active = activeGoals(p);
        const od = overdueGoals(active);
        const ds = dueSoonGoals(active);
        if (filter === 'overdue')  return od.length > 0;
        if (filter === 'due-soon') return ds.length > 0 && od.length === 0;
        if (filter === 'on-track') return active.length > 0 && od.length === 0 && ds.length === 0;
        if (filter === 'no-goals') return active.length === 0;
        return true;
      });
    }

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, search, filter]);

  const isFiltered = search.trim() !== '' || filter !== 'all';

  return (
    <div className="px-4 py-5 md:p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">My Caseload</h2>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={onAddParticipant}
          className="bg-burnt-peach-600 hover:bg-burnt-peach-700 dark:bg-burnt-peach-500 dark:hover:bg-burnt-peach-600 text-white font-bold rounded-xl shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Case
        </Button>
      </div>

      {/* Stats strip — same divided-cell pattern as the participant detail view */}
      <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-px">
        <div className="bg-white dark:bg-slate-900 p-3 md:p-4 space-y-0.5">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cases</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{participants.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 md:p-4 space-y-0.5">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Overdue</p>
          <p className={cn('text-xl font-black', stats.totalOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white')}>
            {stats.totalOverdue}
          </p>
          {stats.withOverdue > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {stats.withOverdue} case{stats.withOverdue !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 md:p-4 space-y-0.5">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Due This Week</p>
          <p className={cn('text-xl font-black', stats.totalDueSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white')}>
            {stats.totalDueSoon}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 md:p-4 space-y-0.5">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Goals</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{stats.totalActive}</p>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-slate-200 dark:border-slate-800" />

      {/* Search + Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <Input
            placeholder="Search by name or case number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-8 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 focus-visible:ring-burnt-peach-500 h-10 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter segment */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {FILTERS.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={cn(
                'flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all',
                filter === val
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {isFiltered && (
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 text-right -mt-1">
            {displayed.length} of {participants.length} shown
          </p>
        )}
      </div>

      {/* Participant grid */}
      {displayed.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-3">
          {displayed.map(p => {
            const active = activeGoals(p);
            const od = overdueGoals(active);
            const ds = dueSoonGoals(active);
            const pct = progressPct(p.currentPhase, milestonePhases);
            const updated = relativeTime(p.updatedAt);

            return (
              <button
                key={p.id}
                onClick={() => onSelectParticipant(p.id)}
                className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight group-hover:text-burnt-peach-600 dark:group-hover:text-burnt-peach-400 transition-colors truncate">
                      {p.name}
                    </p>
                    {p.caseNumber && (
                      <p className="text-[10px] font-mono tracking-tight text-slate-400 dark:text-slate-500 mt-0.5">{p.caseNumber}</p>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 group-hover:text-burnt-peach-400 transition-colors shrink-0 mt-0.5" />
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate min-w-0">
                      {phaseName(p.currentPhase, milestonePhases)}
                    </span>
                    <span className="text-[11px] font-black text-burnt-peach-600 dark:text-burnt-peach-400 shrink-0">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1 bg-slate-100 dark:bg-slate-800" />
                </div>

                <div className="flex flex-wrap gap-1">
                  {od.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {od.length} overdue
                    </span>
                  )}
                  {ds.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                      <Clock className="w-2.5 h-2.5" />
                      {ds.length} due soon
                    </span>
                  )}
                  {od.length === 0 && ds.length === 0 && active.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 text-[10px] font-bold">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      On track
                    </span>
                  )}
                  {active.length === 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-semibold">
                      No goals yet
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  {p.phaseUpdate ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <CalendarDays className="w-3 h-3" />
                      {fmtDate(p.phaseUpdate)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300 dark:text-slate-700">No target date</span>
                  )}
                  {updated && (
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">{updated}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-6">
          <div className="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-5 h-5 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No participants match your filters.</p>
          <button
            onClick={() => { setSearch(''); setFilter('all'); }}
            className="mt-2 text-xs font-semibold text-burnt-peach-600 dark:text-burnt-peach-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
