import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updateProfile, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Moon, Monitor, Sun, LogOut, Check, ChevronLeft, Plus, Pencil, Trash2, X, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { StoredTemplateCategory, MilestonePhase, DEFAULT_MILESTONE_PHASES } from '../types';
import { DEFAULT_STORED_TEMPLATES } from './AIGoalRefiner';

interface UserSettingsProps {
  onClose: () => void;
  user: { uid: string; displayName: string | null; email: string | null };
  userTitle: string;
  isDark: boolean;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  themePreference: 'light' | 'dark' | 'system';
  paletteColor: 'orange' | 'blue' | 'red' | 'green' | 'purple';
  onPaletteChange: (color: 'orange' | 'blue' | 'red' | 'green' | 'purple') => void;
  goalTemplates: StoredTemplateCategory[];
  onGoalTemplatesChange: (templates: StoredTemplateCategory[]) => void;
  milestonePhases: MilestonePhase[];
  onMilestonePhasesChange: (phases: MilestonePhase[]) => void;
}

const PALETTES: { value: 'orange' | 'blue' | 'red' | 'green' | 'purple'; label: string; swatch: string }[] = [
  { value: 'orange', label: 'Orange', swatch: '#ea580c' },
  { value: 'blue',   label: 'Blue',   swatch: '#2563eb' },
  { value: 'red',    label: 'Red',    swatch: '#dc2626' },
  { value: 'green',  label: 'Green',  swatch: '#16a34a' },
  { value: 'purple', label: 'Purple', swatch: '#9333ea' },
];

const THEME_OPTIONS: { value: 'light' | 'dark' | 'system'; label: string; Icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {children}
    </div>
  );
}

function SectionHeader({ label, description, action }: {
  label: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
      <div>
        <h2 className="text-sm font-bold text-accent-600 dark:text-accent-400 tracking-wide">{label}</h2>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default function UserSettings({
  onClose, user, userTitle, isDark,
  onThemeChange, themePreference, paletteColor, onPaletteChange,
  goalTemplates, onGoalTemplatesChange,
  milestonePhases, onMilestonePhasesChange,
}: UserSettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [title, setTitle] = useState(userTitle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const hasPasswordProvider = auth.currentUser?.providerData.some(p => p.providerId === 'password') ?? false;

  const [localTemplates, setLocalTemplates] = useState<StoredTemplateCategory[]>(goalTemplates);
  const [localPhases, setLocalPhases] = useState<MilestonePhase[]>(milestonePhases);
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [addingToCat, setAddingToCat] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    setLocalTemplates(goalTemplates);
    setLocalPhases(milestonePhases);
    setDisplayName(user.displayName || '');
    setTitle(userTitle);
  }, []);

  const persistTemplates = async (updated: StoredTemplateCategory[]) => {
    setLocalTemplates(updated);
    onGoalTemplatesChange(updated);
    try {
      await updateDoc(doc(db, 'users', user.uid), { goalTemplates: updated, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('Save templates error:', err);
    }
  };

  const persistPhases = async (updated: MilestonePhase[]) => {
    setLocalPhases(updated);
    onMilestonePhasesChange(updated);
    try {
      await updateDoc(doc(db, 'users', user.uid), { milestonePhases: updated, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('Save milestone phases error:', err);
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

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setResetSending(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      console.error('Password reset error:', err);
    } finally {
      setResetSending(false);
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

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">

      {/* Page header */}
      <div className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 -ml-1 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">Settings</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-3 sm:space-y-4">

        {/* Account */}
        <Section>
          <SectionHeader label="Account" />
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</Label>
              <Input
                value={user.email || ''}
                disabled
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-accent-500"
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Job Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-accent-500"
                  placeholder="e.g. Court Case Manager"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                onClick={handleSaveProfile}
                disabled={saving || !displayName.trim() || !title.trim()}
                size="sm"
                className="bg-accent-600 hover:bg-accent-700 text-white px-5 rounded-xl w-full sm:w-auto"
              >
                {saved ? <><Check className="w-3.5 h-3.5 mr-1.5" />Saved</> : saving ? 'Saving…' : 'Save Profile'}
              </Button>
            </div>

          </div>
        </Section>

        {/* Password Reset */}
        {hasPasswordProvider && (
          <Section>
            <SectionHeader label="Password" />
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">Send a reset link to {user.email}</p>
              <Button
                size="sm"
                onClick={handlePasswordReset}
                disabled={resetSending || resetSent}
                className={cn(
                  'rounded-xl text-white px-5 w-full sm:w-auto',
                  resetSent
                    ? 'bg-green-600 hover:bg-green-600'
                    : 'bg-accent-600 hover:bg-accent-700'
                )}
              >
                {resetSent ? <><Check className="w-3.5 h-3.5 mr-1.5" />Email sent</> : resetSending ? 'Sending…' : 'Reset Password'}
              </Button>
            </div>
          </Section>
        )}

        {/* Appearance */}
        <Section>
          <SectionHeader label="Appearance" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-300 shrink-0">Mode</span>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
                {THEME_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => onThemeChange(value)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm transition-all',
                      themePreference === value
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-300 shrink-0">Accent Color</span>
              <div className="flex items-center gap-2.5 sm:gap-3">
                {PALETTES.map(({ value, label, swatch }) => (
                  <button
                    key={value}
                    onClick={() => onPaletteChange(value)}
                    title={label}
                    className="w-6 h-6 rounded-full transition-all focus:outline-none"
                    style={{
                      backgroundColor: swatch,
                      boxShadow: paletteColor === value ? `0 0 0 2px white, 0 0 0 4px ${swatch}` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* My Goal Templates */}
        <Section>
          <SectionHeader
            label="My Goal Templates"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => persistTemplates(DEFAULT_STORED_TEMPLATES)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 gap-1 shrink-0 h-7 px-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset to Agency Templates</span>
              </Button>
            }
          />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {localTemplates.map((cat, catIdx) => (
              <div key={cat.domain}>
                <button
                  onClick={() => setExpandedCats(p => ({ ...p, [catIdx]: !p[catIdx] }))}
                  className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-300">{cat.domain}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{cat.templates.length}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", expandedCats[catIdx] && "rotate-180")} />
                  </div>
                </button>

                {expandedCats[catIdx] && (
                  <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                    {cat.templates.map((tmpl, tmplIdx) => {
                      const key = `${catIdx}-${tmplIdx}`;
                      return (
                        <div key={tmplIdx} className="px-4 sm:px-6 py-3">
                          {editingKey === key ? (
                            <div className="space-y-2">
                              <Input
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                                placeholder="Label"
                                className="h-8 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-accent-500"
                                autoFocus
                              />
                              <Textarea
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Notes"
                                className="text-sm min-h-[64px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-accent-500 resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)} className="text-sm text-slate-500">
                                  <X className="w-3 h-3 mr-1" /> Cancel
                                </Button>
                                <Button size="sm" onClick={() => saveEditTemplate(catIdx, tmplIdx)} className="text-sm bg-accent-600 hover:bg-accent-700 text-white">
                                  <Check className="w-3 h-3 mr-1" /> Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 group">
                              <span className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{tmpl.label}</span>
                              <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => startEditTemplate(catIdx, tmplIdx)} className="h-7 w-7 text-slate-400 hover:text-accent-600 dark:hover:text-accent-400">
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteTemplate(catIdx, tmplIdx)} className="h-7 w-7 text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {addingToCat === catIdx ? (
                      <div className="px-4 sm:px-6 py-3 space-y-2">
                        <Input
                          value={newLabel}
                          onChange={e => setNewLabel(e.target.value)}
                          placeholder="Label"
                          className="h-8 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-accent-500"
                          autoFocus
                        />
                        <Textarea
                          value={newNotes}
                          onChange={e => setNewNotes(e.target.value)}
                          placeholder="Notes (optional)"
                          className="text-sm min-h-[56px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-accent-500 resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => { setAddingToCat(null); setNewLabel(''); setNewNotes(''); }} className="text-sm text-slate-500">
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" onClick={() => addTemplate(catIdx)} disabled={!newLabel.trim()} className="text-sm bg-accent-600 hover:bg-accent-700 text-white">
                            <Check className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingToCat(catIdx); setEditingKey(null); setNewLabel(''); setNewNotes(''); }}
                        className="w-full flex items-center gap-1.5 px-4 sm:px-6 py-3 text-sm text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/20 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add template
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* My Milestones */}
        <Section>
          <SectionHeader
            label="My Milestones"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => persistPhases(DEFAULT_MILESTONE_PHASES)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 gap-1 shrink-0 h-7 px-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset to Agency Templates</span>
              </Button>
            }
          />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {localPhases.map((phase, i) => (
              <div key={i} className="flex items-center gap-3 px-4 sm:px-6 py-3">
                <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                  {i + 1}
                </span>
                <Input
                  value={phase.label}
                  onChange={e => {
                    const updated = localPhases.map((p, pi) => pi === i ? { label: e.target.value } : p);
                    setLocalPhases(updated);
                  }}
                  onBlur={e => {
                    const updated = localPhases.map((p, pi) => pi === i ? { label: e.target.value } : p);
                    persistPhases(updated);
                  }}
                  className="h-8 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800 rounded-lg px-2 -mx-2 transition-colors"
                  placeholder={`Phase ${i + 1} name`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => persistPhases(localPhases.filter((_, pi) => pi !== i))}
                  disabled={localPhases.length <= 1}
                  className="h-7 w-7 shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {localPhases.length < 10 && (
              <button
                onClick={() => persistPhases([...localPhases, { label: '' }])}
                className="w-full flex items-center gap-2 px-4 sm:px-6 py-3 text-sm text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add phase
              </button>
            )}
          </div>
        </Section>

        {/* Sign out */}
        <Section>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 group hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors rounded-2xl"
          >
            <LogOut className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
            <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">Sign out</span>
          </button>
        </Section>

        {/* Legal */}
        <div className="flex items-center justify-center gap-4 pb-4">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 dark:text-slate-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors">
            Privacy Policy
          </a>
          <span className="text-slate-300 dark:text-slate-700 select-none">&middot;</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 dark:text-slate-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors">
            Terms of Service
          </a>
        </div>

      </div>
    </div>
  );
}
