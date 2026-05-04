import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { User, Sun, Moon, Monitor, LogOut, Check, Palette, ChevronDown, Plus, Pencil, Trash2, X, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { StoredTemplateCategory } from '../types';
import { DEFAULT_STORED_TEMPLATES } from './AIGoalRefiner';

interface UserSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { uid: string; displayName: string | null; email: string | null };
  userTitle: string;
  isDark: boolean;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  themePreference: 'light' | 'dark' | 'system';
  paletteColor: 'orange' | 'blue' | 'red' | 'green';
  onPaletteChange: (color: 'orange' | 'blue' | 'red' | 'green') => void;
  goalTemplates: StoredTemplateCategory[];
  onGoalTemplatesChange: (templates: StoredTemplateCategory[]) => void;
}

const PALETTES: { value: 'orange' | 'blue' | 'red' | 'green'; label: string; swatch: string }[] = [
  { value: 'orange', label: 'Orange', swatch: '#ea580c' },
  { value: 'blue',   label: 'Blue',   swatch: '#2563eb' },
  { value: 'red',    label: 'Red',    swatch: '#dc2626' },
  { value: 'green',  label: 'Green',  swatch: '#16a34a' },
];

const THEME_OPTIONS: { value: 'light' | 'dark' | 'system'; label: string; Icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export default function UserSettings({
  open, onOpenChange, user, userTitle, isDark,
  onThemeChange, themePreference, paletteColor, onPaletteChange,
  goalTemplates, onGoalTemplatesChange,
}: UserSettingsProps) {
  // ── Profile ──────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [title, setTitle] = useState(userTitle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Collapsible sections ─────────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  // ── Templates ────────────────────────────────────────────────────────────
  const [localTemplates, setLocalTemplates] = useState<StoredTemplateCategory[]>(goalTemplates);
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null); // "catIdx-tmplIdx"
  const [editLabel, setEditLabel] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [addingToCat, setAddingToCat] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    if (open) {
      setLocalTemplates(goalTemplates);
      setDisplayName(user.displayName || '');
      setTitle(userTitle);
      setEditingKey(null);
      setAddingToCat(null);
    }
  }, [open]);

  const persistTemplates = async (updated: StoredTemplateCategory[]) => {
    setLocalTemplates(updated);
    onGoalTemplatesChange(updated);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        goalTemplates: updated,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Save templates error:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim() || !title.trim()) return;
    setSaving(true);
    try {
      if (displayName !== user.displayName) {
        await updateProfile(auth.currentUser!, { displayName: displayName.trim() });
      }
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        title: title.trim(),
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  const startEditTemplate = (catIdx: number, tmplIdx: number) => {
    setEditingKey(`${catIdx}-${tmplIdx}`);
    setEditLabel(localTemplates[catIdx].templates[tmplIdx].label);
    setEditNotes(localTemplates[catIdx].templates[tmplIdx].notes);
    setAddingToCat(null);
  };

  const saveEditTemplate = async (catIdx: number, tmplIdx: number) => {
    if (!editLabel.trim()) return;
    const updated = localTemplates.map((cat, ci) =>
      ci !== catIdx ? cat : {
        ...cat,
        templates: cat.templates.map((t, ti) =>
          ti !== tmplIdx ? t : { label: editLabel.trim(), notes: editNotes.trim() }
        ),
      }
    );
    setEditingKey(null);
    await persistTemplates(updated);
  };

  const deleteTemplate = async (catIdx: number, tmplIdx: number) => {
    const updated = localTemplates.map((cat, ci) =>
      ci !== catIdx ? cat : { ...cat, templates: cat.templates.filter((_, ti) => ti !== tmplIdx) }
    );
    await persistTemplates(updated);
  };

  const addTemplate = async (catIdx: number) => {
    if (!newLabel.trim()) return;
    const updated = localTemplates.map((cat, ci) =>
      ci !== catIdx ? cat : {
        ...cat,
        templates: [...cat.templates, { label: newLabel.trim(), notes: newNotes.trim() }],
      }
    );
    setAddingToCat(null);
    setNewLabel('');
    setNewNotes('');
    await persistTemplates(updated);
  };

  const resetTemplates = async () => {
    await persistTemplates(DEFAULT_STORED_TEMPLATES);
  };

  // ── Section header ────────────────────────────────────────────────────────
  const SectionHeader = ({ id, icon: Icon, label }: { id: string; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => toggle(id)}
      className="w-full flex items-center justify-between py-3 text-left group"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-burnt-peach-600" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{label}</span>
      </div>
      <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-200', expanded[id] && 'rotate-180')} />
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <SheetTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-slate-100 dark:divide-slate-800">

          {/* ── Account ─────────────────────────────────────────────────── */}
          <div>
            <SectionHeader id="account" icon={User} label="Account" />
            {expanded.account && (
              <div className="pb-5 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</Label>
                  <Input value={user.email || ''} disabled className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Display Name</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-burnt-peach-500" placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Job Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-burnt-peach-500" placeholder="e.g. Court Case Manager" />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving || !displayName.trim() || !title.trim()} className="w-full bg-burnt-peach-600 hover:bg-burnt-peach-700 text-white font-bold rounded-xl">
                  {saved ? <><Check className="w-4 h-4" /> Saved</> : saving ? 'Saving…' : 'Save Profile'}
                </Button>
              </div>
            )}
          </div>

          {/* ── Appearance ──────────────────────────────────────────────── */}
          <div>
            <SectionHeader id="appearance" icon={Sun} label="Appearance" />
            {expanded.appearance && (
              <div className="pb-5 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mode</p>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map(({ value, label, Icon }) => (
                      <button key={value} onClick={() => onThemeChange(value)}
                        className={cn('flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all',
                          themePreference === value
                            ? 'border-burnt-peach-600 bg-burnt-peach-50 dark:bg-burnt-peach-950/30 text-burnt-peach-600 dark:text-burnt-peach-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        )}>
                        <Icon className="w-5 h-5" />{label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Color</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {PALETTES.map(({ value, label, swatch }) => (
                      <button key={value} onClick={() => onPaletteChange(value)} title={label}
                        className={cn('flex flex-col items-center gap-2 py-3 px-1 rounded-xl border-2 text-xs font-bold transition-all',
                          paletteColor === value
                            ? 'border-slate-800 dark:border-white bg-slate-50 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        )}>
                        <span className="w-6 h-6 rounded-full block" style={{ backgroundColor: swatch, boxShadow: paletteColor === value ? `0 0 0 2px white, 0 0 0 4px ${swatch}` : undefined }} />
                        <span className="text-slate-600 dark:text-slate-400">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Goal Templates ───────────────────────────────────────────── */}
          <div>
            <SectionHeader id="templates" icon={Check} label="Goal Templates" />
            {expanded.templates && (
              <div className="pb-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Customize the templates shown in the Goals tab.</p>
                  <Button variant="ghost" size="sm" onClick={resetTemplates} className="h-7 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 gap-1 shrink-0">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </Button>
                </div>

                <div className="space-y-2">
                  {localTemplates.map((cat, catIdx) => (
                    <div key={cat.domain} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {/* category header */}
                      <button
                        onClick={() => setExpandedCats(p => ({ ...p, [catIdx]: !p[catIdx] }))}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cat.domain}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{cat.templates.length}</span>
                          <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', expandedCats[catIdx] && 'rotate-180')} />
                        </div>
                      </button>

                      {/* template list */}
                      {expandedCats[catIdx] && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {cat.templates.map((tmpl, tmplIdx) => {
                            const key = `${catIdx}-${tmplIdx}`;
                            return (
                              <div key={tmplIdx} className="px-3 py-2.5 bg-white dark:bg-slate-900">
                                {editingKey === key ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={editLabel}
                                      onChange={e => setEditLabel(e.target.value)}
                                      placeholder="Label"
                                      className="h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-burnt-peach-500"
                                      autoFocus
                                    />
                                    <Textarea
                                      value={editNotes}
                                      onChange={e => setEditNotes(e.target.value)}
                                      placeholder="Notes"
                                      className="text-xs min-h-[72px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-burnt-peach-500 resize-none"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)} className="h-7 text-xs text-slate-500">
                                        <X className="w-3 h-3" /> Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => saveEditTemplate(catIdx, tmplIdx)} className="h-7 text-xs bg-burnt-peach-600 hover:bg-burnt-peach-700 text-white">
                                        <Check className="w-3 h-3" /> Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">{tmpl.label}</span>
                                    <div className="flex gap-1 shrink-0">
                                      <Button variant="ghost" size="icon" onClick={() => startEditTemplate(catIdx, tmplIdx)} className="h-6 w-6 text-slate-400 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-400">
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => deleteTemplate(catIdx, tmplIdx)} className="h-6 w-6 text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* add template form */}
                          {addingToCat === catIdx ? (
                            <div className="px-3 py-3 bg-white dark:bg-slate-900 space-y-2">
                              <Input
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                placeholder="Label"
                                className="h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-burnt-peach-500"
                                autoFocus
                              />
                              <Textarea
                                value={newNotes}
                                onChange={e => setNewNotes(e.target.value)}
                                placeholder="Notes (optional)"
                                className="text-xs min-h-[64px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-burnt-peach-500 resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => { setAddingToCat(null); setNewLabel(''); setNewNotes(''); }} className="h-7 text-xs text-slate-500">
                                  <X className="w-3 h-3" /> Cancel
                                </Button>
                                <Button size="sm" onClick={() => addTemplate(catIdx)} disabled={!newLabel.trim()} className="h-7 text-xs bg-burnt-peach-600 hover:bg-burnt-peach-700 text-white">
                                  <Check className="w-3 h-3" /> Add
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAddingToCat(catIdx); setEditingKey(null); setNewLabel(''); setNewNotes(''); }}
                              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-400 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/20 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add template
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Session ──────────────────────────────────────────────────── */}
          <div>
            <SectionHeader id="session" icon={LogOut} label="Session" />
            {expanded.session && (
              <div className="pb-5">
                <Button variant="ghost" onClick={() => signOut(auth)} className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold rounded-xl">
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              </div>
            )}
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
