import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { logAuditEvent } from './services/auditService';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { ScrollArea } from './components/ui/scroll-area';
import { Plus, User, FileText, Search, LayoutDashboard, Target, Trash2, Moon, Sun, Menu, Hash, Pencil, Check, X, History, Settings, ChevronRight, CalendarDays } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from './components/ui/sheet';
import { Participant, CurrentUser, StoredTemplateCategory, MilestonePhase, DEFAULT_MILESTONE_PHASES, normalizeGoals } from './types';
import CasePlanEditor from './components/CasePlanEditor';
import AIGoalRefiner, { DEFAULT_STORED_TEMPLATES } from './components/AIGoalRefiner';
import CourtReport from './components/CourtReport';
import AuditLog from './components/AuditLog';
import UserSettings from './components/UserSettings';
import CasePlanrLogo from './components/CasePlanrLogo';
import { DatePicker } from './components/ui/date-picker';
import { cn } from './lib/utils';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ name: '', caseNumber: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authJobTitle, setAuthJobTitle] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'phase'>('name');
  const [isEditingParticipant, setIsEditingParticipant] = useState(false);
  const [activeTab, setActiveTab] = useState('plan');
  const [editedName, setEditedName] = useState('');
  const [editedCaseNumber, setEditedCaseNumber] = useState('');
  const [userTitle, setUserTitle] = useState('Court Case Manager');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalTemplates, setGoalTemplates] = useState<StoredTemplateCategory[]>(DEFAULT_STORED_TEMPLATES);
  const [milestonePhases, setMilestonePhases] = useState<MilestonePhase[]>(DEFAULT_MILESTONE_PHASES);
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('themePreference') as 'light' | 'dark' | 'system' | null;
    return stored || 'system';
  });
  const [paletteColor, setPaletteColor] = useState<'orange' | 'blue' | 'red' | 'green' | 'purple'>(() => {
    const stored = localStorage.getItem('paletteColor') as 'orange' | 'blue' | 'red' | 'green' | 'purple' | null;
    return stored || 'blue';
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
             localStorage.getItem('theme') === 'dark' ||
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const headerColorLight = '#ffffff';
    const headerColorDark = '#0f172a'; // Slate 900

    // Force light mode for the sign-in section
    const shouldBeDark = user ? isDark : false;

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      // Update theme-color meta tag
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', headerColorDark);
      // Update apple-mobile-web-app-status-bar-style
      const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (appleMeta) appleMeta.setAttribute('content', 'black-translucent');
      document.body.style.backgroundColor = headerColorDark;
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      // Update theme-color meta tag
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', headerColorLight);
      // Update apple-mobile-web-app-status-bar-style
      const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (appleMeta) appleMeta.setAttribute('content', 'default');
      document.body.style.backgroundColor = headerColorLight;
    }
  }, [isDark, user]);

  useEffect(() => {
    document.documentElement.dataset.palette = paletteColor;
  }, [paletteColor]);

  useEffect(() => {
    setSelectedParticipantId(null);
    setActiveTab('plan');
    setSettingsOpen(false);
    setSidebarOpen(false);
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserTitle(data.title || 'Court Case Manager');
          if (data.goalTemplates?.length) setGoalTemplates(data.goalTemplates);
          if (data.milestonePhases?.length) setMilestonePhases(data.milestonePhases);
        } else {
          // Initialize user doc if it doesn't exist
          setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: 'case_manager',
            title: 'Court Case Manager',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }).catch(err => console.error("Error initializing user doc:", err));
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'participants'), where('uid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(docSnap => {
          const raw = { id: docSnap.id, ...docSnap.data() } as any;
          const { goals, completedGoals } = normalizeGoals(raw.goals, raw.completedGoals);
          return { ...raw, goals, completedGoals } as Participant;
        });
        setParticipants(data);
      }, (err) => {
        console.error("Firestore Error:", err);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const selectedParticipant = participants.find(p => p.id === selectedParticipantId) || null;
  const currentUser: CurrentUser = user
    ? { uid: user.uid, displayName: user.displayName, email: user.email }
    : { uid: '', displayName: null, email: null };

  const handleLogin = async () => {
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login Error:", err);
      let message = "Login failed. Please check your connection and try again.";
      if (err.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized in Firebase. Please add it to the 'Authorized domains' list in the Firebase Console.";
      } else if (err.code === 'auth/popup-blocked') {
        message = "Login popup was blocked by your browser. Please allow popups for this site.";
      }
      setLoginError(message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (authMode === 'signup' && !authDisplayName.trim()) {
      setLoginError('Please enter your full name.');
      return;
    }
    if (authMode === 'signup' && authPassword !== authConfirmPassword) {
      setLoginError('Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(credential.user, { displayName: authDisplayName.trim() });
        await setDoc(doc(db, 'users', credential.user.uid), {
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: authDisplayName.trim(),
          role: 'case_manager',
          title: authJobTitle.trim() || 'Court Case Manager',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err: any) {
      let message = 'Authentication failed. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later or reset your password.';
      }
      setLoginError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, authEmail);
      setResetEmailSent(true);
    } catch (err: any) {
      let message = 'Failed to send reset email. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        message = 'No account found with that email address.';
      }
      setLoginError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newParticipant.name || !newParticipant.caseNumber) return;

    try {
      const docRef = await addDoc(collection(db, 'participants'), {
        ...newParticipant,
        currentPhase: 1,
        goals: [],
        notes: '',
        milestones: Object.fromEntries(milestonePhases.map((_, i) => [`phase${i + 1}`, false])),
        irasDomains: [],
        uid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      logAuditEvent({
        participantId: docRef.id,
        caseManagerUid: user.uid,
        category: 'participant_created',
        description: `Created participant profile for ${newParticipant.name}`,
        details: { field: 'caseNumber', newValue: newParticipant.caseNumber },
        currentUser: { uid: user.uid, displayName: user.displayName, email: user.email }
      });
      setNewParticipant({ name: '', caseNumber: '' });
      setIsAdding(false);
      setSelectedParticipantId(docRef.id);
      setActiveTab('plan');
      setSidebarOpen(false);
    } catch (err) {
      console.error("Add Error:", err);
    }
  };

  const handleDeleteParticipant = async () => {
    if (!selectedParticipantId || !selectedParticipant || !user) return;

    try {
      // Log before delete so the entry persists in auditLog collection
      await logAuditEvent({
        participantId: selectedParticipantId,
        caseManagerUid: user.uid,
        category: 'participant_deleted',
        description: `Deleted participant profile for ${selectedParticipant.name}`,
        details: { field: 'caseNumber', oldValue: selectedParticipant.caseNumber },
        currentUser: { uid: user.uid, displayName: user.displayName, email: user.email }
      });
      await deleteDoc(doc(db, 'participants', selectedParticipantId));
      setSelectedParticipantId(null);
      setIsDeleting(false);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const handleUpdateParticipant = async () => {
    if (!selectedParticipant || !editedName.trim() || !editedCaseNumber.trim() || !user) return;
    const nameChanged = editedName.trim() !== selectedParticipant.name;
    const caseChanged = editedCaseNumber.trim() !== selectedParticipant.caseNumber;
    try {
      await updateDoc(doc(db, 'participants', selectedParticipant.id), {
        name: editedName.trim(),
        caseNumber: editedCaseNumber.trim(),
        updatedAt: serverTimestamp()
      });
      if (nameChanged) {
        logAuditEvent({
          participantId: selectedParticipant.id,
          caseManagerUid: user.uid,
          category: 'participant_info_updated',
          description: 'Participant Name Updated',
          details: { field: 'name', oldValue: selectedParticipant.name, newValue: editedName.trim() },
          currentUser: { uid: user.uid, displayName: user.displayName, email: user.email }
        });
      }
      if (caseChanged) {
        logAuditEvent({
          participantId: selectedParticipant.id,
          caseManagerUid: user.uid,
          category: 'participant_info_updated',
          description: 'Case Number Updated',
          details: { field: 'caseNumber', oldValue: selectedParticipant.caseNumber, newValue: editedCaseNumber.trim() },
          currentUser: { uid: user.uid, displayName: user.displayName, email: user.email }
        });
      }
      setIsEditingParticipant(false);
    } catch (err) {
      console.error("Update Error:", err);
    }
  };
  
  const handlePhaseUpdateChange = async (date: string) => {
    if (!selectedParticipant || !user) return;
    try {
      await updateDoc(doc(db, 'participants', selectedParticipant.id), {
        phaseUpdate: date || null,
        updatedAt: serverTimestamp()
      });
      logAuditEvent({
        participantId: selectedParticipant.id,
        caseManagerUid: user.uid,
        category: 'participant_info_updated',
        description: date ? 'Phase Up Date Set' : 'Phase Up Date Cleared',
        details: { field: 'phaseUpdate', oldValue: selectedParticipant.phaseUpdate || '', newValue: date },
        currentUser: { uid: user.uid, displayName: user.displayName, email: user.email }
      });
    } catch (err) {
      console.error("Phase Update Error:", err);
    }
  };

  const handlePaletteChange = (color: 'orange' | 'blue' | 'red' | 'green' | 'purple') => {
    setPaletteColor(color);
    localStorage.setItem('paletteColor', color);
  };

  const handleThemeChange = (pref: 'light' | 'dark' | 'system') => {
    setThemePreference(pref);
    localStorage.setItem('themePreference', pref);
    if (pref === 'system') {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      setIsDark(pref === 'dark');
    }
  };

  const startEditingParticipant = () => {
    if (selectedParticipant) {
      setEditedName(selectedParticipant.name);
      setEditedCaseNumber(selectedParticipant.caseNumber);
      setIsEditingParticipant(true);
    }
  };

  const getLastName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase();
  };

  const filteredParticipants = participants
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.caseNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'phase') {
        if (a.currentPhase !== b.currentPhase) return a.currentPhase - b.currentPhase;
      }
      return getLastName(a.name).localeCompare(getLastName(b.name));
    });

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Participants</h2>
          <Button size="icon" variant="ghost" onClick={() => setIsAdding(true)} className="h-8 w-8 text-burnt-peach-600 dark:text-burnt-peach-400 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-900/20 rounded-full">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search by name or case..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 focus-visible:ring-burnt-peach-500 h-10 rounded-xl"
          />
        </div>

        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setSortBy('name')}
            className={cn(
              "flex-1 text-xs font-semibold py-1 rounded-md transition-all",
              sortBy === 'name'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Last Name
          </button>
          <button
            onClick={() => setSortBy('phase')}
            className={cn(
              "flex-1 text-xs font-semibold py-1 rounded-md transition-all",
              sortBy === 'phase'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Phase
          </button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto pb-6 custom-scrollbar">
        <div className="space-y-2 px-4">
          {isAdding && (
            <Card className="mb-4 border-burnt-peach-200 dark:border-burnt-peach-900 bg-burnt-peach-50/30 dark:bg-burnt-peach-900/10 shadow-inner overflow-hidden animate-in slide-in-from-top-2">
              <CardContent className="p-4">
                <form onSubmit={handleAddParticipant} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">Full Name</Label>
                    <Input 
                      id="name" 
                      value={newParticipant.name} 
                      onChange={e => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                      className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      placeholder="e.g. John Smith"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="case" className="text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">Case Number</Label>
                    <Input 
                      id="case" 
                      value={newParticipant.caseNumber} 
                      onChange={e => setNewParticipant(prev => ({ ...prev, caseNumber: e.target.value }))}
                      className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono"
                      placeholder="2024-CR-0000"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" size="sm" className="flex-1 bg-burnt-peach-600 dark:bg-burnt-peach-500 text-white font-bold">Create Profile</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="font-bold text-slate-500 dark:text-slate-400">Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {filteredParticipants.length === 0 && !isAdding && (
            <div className="text-center py-20 px-6">
              <div className="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-slate-200 dark:text-slate-700" />
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No participants found.</p>
            </div>
          )}

          {filteredParticipants.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelectedParticipantId(p.id); setActiveTab('plan'); }}
              className={cn(
                "w-full text-left p-4 rounded-2xl transition-all duration-200 group relative border",
                selectedParticipantId === p.id 
                  ? "bg-burnt-peach-600 border-burnt-peach-600 shadow-lg shadow-burnt-peach-100 dark:shadow-burnt-peach-900/20" 
                  : "hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-100 dark:hover:border-slate-700"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "font-bold text-sm leading-tight",
                  selectedParticipantId === p.id ? "text-white" : "text-slate-800 dark:text-slate-200"
                )}>{p.name}</span>
                <Badge className={cn(
                  "text-[10px] h-4 px-1.5 font-bold uppercase tracking-tight",
                  selectedParticipantId === p.id 
                    ? "bg-white/20 text-white border-white/20" 
                    : "bg-burnt-peach-50 dark:bg-burnt-peach-900/30 text-burnt-peach-600 dark:text-burnt-peach-400 border-burnt-peach-100 dark:border-burnt-peach-900/50"
                )}>
                  P{p.currentPhase}
                </Badge>
              </div>
              <div className={cn(
                "text-[10px] font-mono tracking-tight",
                selectedParticipantId === p.id ? "text-burnt-peach-200" : "text-slate-400 dark:text-slate-500"
              )}>{p.caseNumber}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const startAddingParticipant = () => {
    setIsAdding(true);
    setSidebarOpen(true);
  };

  if (loading) return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
      <div className="h-safe-top bg-white w-full shrink-0"></div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-burnt-peach-200 border-t-burnt-peach-600 rounded-full animate-spin"></div>
          <div className="text-slate-400 font-medium animate-pulse">Initializing CasePlanr...</div>
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
      <div className="h-safe-top bg-white w-full shrink-0"></div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <CasePlanrLogo className="w-12 h-12 drop-shadow-lg" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">CasePlanr</h1>
          </div>

          {authMode === 'reset' ? (
            resetEmailSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Check your email</h2>
                <p className="text-slate-500 text-sm">
                  We sent a password reset link to <strong>{authEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setResetEmailSent(false); setLoginError(null); }}
                  className="text-burnt-peach-600 text-sm font-semibold hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-1 text-center mb-2">
                  <h2 className="text-xl font-bold text-slate-800">Reset Password</h2>
                  <p className="text-slate-500 text-sm">Enter your email and we'll send a reset link.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reset-email" className="text-slate-700 font-semibold text-sm">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
                    {loginError}
                  </div>
                )}
                <Button type="submit" disabled={authLoading} className="w-full bg-burnt-peach-600 hover:bg-burnt-peach-700 text-white h-11 font-bold rounded-xl transition-all active:scale-[0.98]">
                  {authLoading ? 'Sending...' : 'Send Reset Email'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setLoginError(null); }}
                  className="text-sm text-slate-500 hover:text-slate-700 w-full text-center"
                >
                  ← Back to sign in
                </button>
              </form>
            )
          ) : (
            <>
              <div className="text-center mb-5">
                <p className="text-slate-500 text-sm leading-relaxed text-balance">
                  {authMode === 'signin'
                    ? 'Manage cases, track milestones, and document progress — all in one place.'
                    : 'Create an account to get started with CasePlanr.'}
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {authMode === 'signup' && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="auth-name" className="text-slate-700 font-semibold text-sm">Full Name</Label>
                      <Input
                        id="auth-name"
                        type="text"
                        placeholder="Jane Smith"
                        value={authDisplayName}
                        onChange={e => setAuthDisplayName(e.target.value)}
                        required
                        className="h-11"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="auth-title" className="text-slate-700 font-semibold text-sm">Job Title</Label>
                      <Input
                        id="auth-title"
                        type="text"
                        placeholder="Court Case Manager"
                        value={authJobTitle}
                        onChange={e => setAuthJobTitle(e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-slate-400 pt-0.5">You can update this anytime in Settings.</p>
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label htmlFor="auth-email" className="text-slate-700 font-semibold text-sm">Email</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="auth-password" className="text-slate-700 font-semibold text-sm">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <Label htmlFor="auth-confirm" className="text-slate-700 font-semibold text-sm">Confirm Password</Label>
                    <Input
                      id="auth-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={authConfirmPassword}
                      onChange={e => setAuthConfirmPassword(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                )}
                {authMode === 'signin' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('reset'); setLoginError(null); }}
                      className="text-xs text-burnt-peach-600 hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
                    {loginError}
                  </div>
                )}
                <Button type="submit" disabled={authLoading} className="w-full bg-burnt-peach-600 hover:bg-burnt-peach-700 text-white h-11 font-bold rounded-xl transition-all active:scale-[0.98]">
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-3">
                {authMode === 'signin' ? (
                  <>Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setLoginError(null); setAuthDisplayName(''); setAuthJobTitle(''); }}
                      className="text-burnt-peach-600 font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signin'); setLoginError(null); setAuthDisplayName(''); setAuthJobTitle(''); }}
                      className="text-burnt-peach-600 font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider">or</span>
                </div>
              </div>

              <Button
                onClick={handleLogin}
                variant="outline"
                className="w-full h-11 font-semibold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
            </>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            Secure, encrypted access for authorized personnel only.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden transition-colors duration-300">
      <div className="h-safe-top bg-white dark:bg-slate-900 w-full shrink-0"></div>
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden text-slate-500" />}>
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
              <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                <SheetTitle className="flex items-center gap-2">
                  <CasePlanrLogo className="w-6 h-6" />
                  <span className="font-black tracking-tight">CasePlanr</span>
                </SheetTitle>
              </SheetHeader>
              {renderSidebarContent()}
            </SheetContent>
          </Sheet>

          <CasePlanrLogo className="w-9 h-9 drop-shadow-md hidden md:block" />
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">CasePlanr</h1>
          <Badge variant="outline" className="hidden sm:inline-flex ml-2 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-mono text-[10px]">v1.0.0</Badge>
        </div>
        
        <div className="flex items-center gap-2 md:gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <div className="hidden md:block h-8 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.displayName}</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{userTitle}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shadow-sm z-10 overflow-hidden">
          {renderSidebarContent()}
        </aside>

        {/* Main Content */}
        <section className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar transition-colors duration-300">
          {selectedParticipant ? (
            <div className="max-w-5xl mx-auto p-4 md:p-10 space-y-6 md:space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {isEditingParticipant ? (
                      <div className="flex items-center gap-3 flex-1">
                        <Input 
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="text-2xl font-black h-12 bg-white dark:bg-slate-900 border-burnt-peach-200 dark:border-burnt-peach-800 focus-visible:ring-burnt-peach-500"
                          autoFocus
                          placeholder="Participant Name"
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={handleUpdateParticipant}
                            className="h-10 w-10 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
                          >
                            <Check className="w-5 h-5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setIsEditingParticipant(false)}
                            className="h-10 w-10 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{selectedParticipant.name}</h2>
                        <div className="flex items-center gap-1 ml-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={startEditingParticipant}
                            className="text-slate-400 dark:text-slate-500 hover:text-burnt-peach-600 dark:hover:text-burnt-peach-400 hover:bg-burnt-peach-50 dark:hover:bg-burnt-peach-950/30 rounded-full h-8 w-8"
                            title="Edit Profile"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsDeleting(true)}
                            className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full h-8 w-8"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-4 h-4" />
                      {isEditingParticipant ? (
                        <Input 
                          value={editedCaseNumber}
                          onChange={(e) => setEditedCaseNumber(e.target.value)}
                          className="h-8 w-40 font-mono text-xs bg-white dark:bg-slate-900 border-burnt-peach-200 dark:border-burnt-peach-800 focus-visible:ring-burnt-peach-500"
                          placeholder="Case Number"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateParticipant();
                            if (e.key === 'Escape') setIsEditingParticipant(false);
                          }}
                        />
                      ) : (
                        <span className="font-mono">{selectedParticipant.caseNumber}</span>
                      )}
                    </div>
                    <div className="hidden md:flex w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                    <div className="hidden md:flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      <span>Assigned to {user.displayName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
                  <div className="space-y-1 pr-3 sm:pr-5">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Phase</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-black text-burnt-peach-600 dark:text-burnt-peach-400">{selectedParticipant.currentPhase}</span>
                      <span className="text-slate-300 dark:text-slate-700 font-bold text-sm">/ {milestonePhases.length}</span>
                    </div>
                  </div>
                  <div className="space-y-1 px-3 sm:px-5">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Progress</p>
                    <div className="space-y-1">
                      <span className="text-xl font-black text-burnt-peach-600 dark:text-burnt-peach-400">{Math.round((selectedParticipant.currentPhase / milestonePhases.length) * 100)}%</span>
                      <Progress value={(selectedParticipant.currentPhase / milestonePhases.length) * 100} className="h-1.5 w-full max-w-[4rem] bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="space-y-1 pl-3 sm:pl-5">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 shrink-0" /> Date
                    </p>
                    <DatePicker
                      value={selectedParticipant.phaseUpdate || ''}
                      onChange={handlePhaseUpdateChange}
                      placeholder="—"
                      showQuick={false}
                      variant="inline"
                    />
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-[3.5px] h-14 rounded-2xl shadow-sm inline-flex w-auto">
                  <TabsTrigger value="plan" className="dark:data-active:bg-slate-800 dark:data-active:border-transparent dark:data-active:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)] px-4 md:px-8 rounded-xl font-bold transition-all">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden md:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="dark:data-active:bg-slate-800 dark:data-active:border-transparent dark:data-active:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)] px-4 md:px-8 rounded-xl font-bold transition-all">
                    <Target className="w-4 h-4" />
                    <span className="hidden md:inline">Goals</span>
                  </TabsTrigger>
                  <TabsTrigger value="report" className="dark:data-active:bg-slate-800 dark:data-active:border-transparent dark:data-active:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)] px-4 md:px-8 rounded-xl font-bold transition-all">
                    <FileText className="w-4 h-4" />
                    <span className="hidden md:inline">Case Plan</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="dark:data-active:bg-slate-800 dark:data-active:border-transparent dark:data-active:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)] px-4 md:px-8 rounded-xl font-bold transition-all">
                    <History className="w-4 h-4" />
                    <span className="hidden md:inline">History</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="plan" className="mt-6 outline-none">
                  <CasePlanEditor participant={selectedParticipant} currentUser={currentUser} milestonePhases={milestonePhases} />
                </TabsContent>

                <TabsContent value="ai" className="mt-6 outline-none">
                  <AIGoalRefiner participant={selectedParticipant} currentUser={currentUser} goalTemplates={goalTemplates} />
                </TabsContent>

                <TabsContent value="report" className="mt-6 outline-none">
                  <CourtReport participant={selectedParticipant} currentUser={currentUser} />
                </TabsContent>

                <TabsContent value="history" className="mt-6 outline-none">
                  <AuditLog participant={selectedParticipant} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-10">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-burnt-peach-100 dark:bg-burnt-peach-900/20 rounded-full blur-3xl opacity-40 animate-pulse"></div>
                <CasePlanrLogo className="relative w-28 h-28 drop-shadow-xl" />
              </div>
              <div className="text-center max-w-md space-y-4">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Welcome to CasePlanr</h3>
                </div>
                <div className="hidden sm:flex flex-wrap justify-center items-center gap-y-1.5 py-1">
                  {["Goals", "Case Plans", "Milestones", "Audit Logs"].map((feature, i, arr) => (
                    <span key={feature} className="inline-flex items-center gap-1 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {feature}
                      </span>
                      {i < arr.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      )}
                    </span>
                  ))}
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select a participant from the sidebar to begin managing their milestones, goals, and court documentation.
                </p>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-xs font-black text-slate-800 dark:text-white tracking-tight">OR:</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                </div>
                <Button
                  onClick={startAddingParticipant}
                  className="bg-burnt-peach-600 hover:bg-burnt-peach-700 dark:bg-burnt-peach-500 dark:hover:bg-burnt-peach-600 text-white font-bold rounded-xl shadow-lg shadow-burnt-peach-100 dark:shadow-burnt-peach-900/20 px-6"
                >
                  <Plus className="w-4 h-4" />
                  Create New Case Plan
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <CardContent className="p-8 space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Delete Profile?</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  Are you sure you want to delete <span className="text-slate-900 dark:text-white font-bold">{selectedParticipant?.name}</span>? 
                  This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsDeleting(false)}
                  className="flex-1 font-bold text-slate-500 dark:text-slate-400"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteParticipant}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-100 dark:shadow-red-900/20"
                >
                  Delete Permanently
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {user && (
        <UserSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={{ uid: user.uid, displayName: user.displayName, email: user.email }}
          userTitle={userTitle}
          isDark={isDark}
          themePreference={themePreference}
          onThemeChange={handleThemeChange}
          paletteColor={paletteColor}
          onPaletteChange={handlePaletteChange}
          goalTemplates={goalTemplates}
          onGoalTemplatesChange={setGoalTemplates}
          milestonePhases={milestonePhases}
          onMilestonePhasesChange={setMilestonePhases}
        />
      )}
    </div>
  );
}
