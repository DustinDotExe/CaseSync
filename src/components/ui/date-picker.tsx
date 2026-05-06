import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE_QUICK = [
  { label: '30 days', days: 30, exactDate: undefined as string | undefined },
  { label: '90 days', days: 90, exactDate: undefined as string | undefined },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  phaseUpDate?: string;
  showQuick?: boolean;
  variant?: 'default' | 'inline';
}

export function DatePicker({ value, onChange, placeholder = 'Set due date', className, phaseUpDate, showQuick = true, variant = 'default' }: DatePickerProps) {
  const quickOptions = [
    ...BASE_QUICK,
    ...(phaseUpDate ? [{ label: 'Phase Up', days: 0, exactDate: phaseUpDate }] : []),
  ];
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = value ? parseISO(value) : undefined;

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const popH = 260;
    const popW = 256;
    const below = window.innerHeight - r.bottom >= popH || r.top < popH;
    const fitsRight = r.left + popW <= window.innerWidth - 8;
    setStyle({
      position: 'fixed',
      ...(fitsRight ? { left: r.left } : { right: window.innerWidth - r.right }),
      width: popW,
      zIndex: 9999,
      ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Trigger */}
      {variant === 'inline' ? (
        <div className="relative group flex items-center gap-2 min-w-0">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-baseline gap-1 focus:outline-none whitespace-nowrap min-w-0"
          >
            {value ? (
              <>
                <span className="text-xl font-black text-burnt-peach-600 dark:text-burnt-peach-400 hover:opacity-75 transition-opacity">
                  {format(parseISO(value), 'MMM d')}
                </span>
                <span className="text-sm font-bold text-slate-300 dark:text-slate-700">
                  '{format(parseISO(value), 'yy')}
                </span>
              </>
            ) : (
              <span className="text-xl font-black text-slate-200 dark:text-slate-700 hover:text-slate-300 dark:hover:text-slate-600 transition-colors">
                —
              </span>
            )}
          </button>
          {value && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-slate-500 dark:hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            'flex items-center gap-2 h-9 px-3 w-full rounded-lg border text-sm transition-colors bg-white dark:bg-slate-900',
            value
              ? 'border-burnt-peach-300 dark:border-burnt-peach-700 text-slate-700 dark:text-slate-300'
              : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500',
            'hover:border-burnt-peach-400 dark:hover:border-burnt-peach-600 focus:outline-none focus:ring-2 focus:ring-burnt-peach-500'
          )}
        >
          <CalendarDays className="w-4 h-4 text-burnt-peach-500 shrink-0" />
          <span className="flex-1 text-left">
            {value ? format(parseISO(value), 'MMM d, yyyy') : placeholder}
          </span>
          {value && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      )}

      {/* Quick-select */}
      {showQuick && (
        <div className="flex gap-1.5">
          {quickOptions.map(({ label, days, exactDate }) => {
            const val = exactDate ?? addDays(days);
            const active = value === val;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange(active ? '' : val)}
                className={cn(
                  'flex-1 text-[11px] font-bold py-1 rounded-lg border transition-colors',
                  active
                    ? 'bg-burnt-peach-600 dark:bg-burnt-peach-500 text-white border-burnt-peach-600 dark:border-burnt-peach-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-burnt-peach-300 dark:hover:border-burnt-peach-700 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-400'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar popover */}
      {open && createPortal(
        <div
          ref={popoverRef}
          style={style}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 origin-top"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) { onChange(format(day, 'yyyy-MM-dd')); setOpen(false); }
            }}
            defaultMonth={selected ?? new Date()}
            classNames={{
              root: 'w-full',
              months: 'w-full',
              month: 'w-full',
              month_caption: 'flex justify-center relative items-center h-8 mb-1 px-8',
              caption_label: 'text-xs font-bold text-slate-900 dark:text-slate-100 pointer-events-none select-none',
              nav: 'absolute inset-x-0 flex justify-between items-center h-8 z-10',
              button_previous: cn(
                'h-8 w-8 ml-0.5 rounded-md flex items-center justify-center transition-colors cursor-pointer',
                'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              ),
              button_next: cn(
                'h-8 w-8 mr-0.5 rounded-md flex items-center justify-center transition-colors cursor-pointer',
                'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              ),
              month_grid: 'w-full',
              weekdays: 'grid grid-cols-7 mb-0.5',
              weekday: 'text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-0.5',
              week: 'grid grid-cols-7',
              day: 'flex items-center justify-center p-0.5',
              day_button: cn(
                'h-7 w-7 rounded-md text-xs font-medium transition-colors',
                'flex items-center justify-center',
                'text-slate-700 dark:text-slate-300',
                'hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/40 hover:text-burnt-peach-700 dark:hover:text-burnt-peach-300'
              ),
              outside: 'opacity-30',
              disabled: 'opacity-30 cursor-not-allowed',
              hidden: 'invisible',
            }}
            modifiersClassNames={{
              selected: '!bg-burnt-peach-600 dark:!bg-burnt-peach-500 !text-white hover:!bg-burnt-peach-700',
              today: 'ring-1 ring-burnt-peach-400 dark:ring-burnt-peach-600',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeft className="w-4 h-4 pointer-events-none" />
                  : <ChevronRight className="w-4 h-4 pointer-events-none" />,
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
