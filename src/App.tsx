import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { ScrollArea } from './components/ui/scroll-area';
import { LogOut, Plus, User, FileText, Scale, Search, Filter, LayoutDashboard, Target, Trash2, Moon, Sun, Menu, Hash, Pencil, Check, X } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from './components/ui/sheet';
import { Participant } from './types';
import CasePlanEditor from './components/CasePlanEditor';
import AIGoalRefiner from './components/AIGoalRefiner';
import CourtReport from './components/CourtReport';
import { cn } from './lib/utils';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ name: '', caseNumber: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isEditingParticipant, setIsEditingParticipant] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedCaseNumber, setEditedCaseNumber] = useState('');
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
    if (user) {
      const q = query(collection(db, 'participants'), where('uid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
        setParticipants(data);
      }, (err) => {
        console.error("Firestore Error:", err);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const selectedParticipant = participants.find(p => p.id === selectedParticipantId) || null;

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

  const handleLogout = () => signOut(auth);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newParticipant.name || !newParticipant.caseNumber) return;

    try {
      await addDoc(collection(db, 'participants'), {
        ...newParticipant,
        currentPhase: 1,
        goals: [],
        notes: '',
        milestones: {
          phase1: false,
          phase2: false,
          phase3: false,
          phase4: false,
          phase5: false
        },
        irasDomains: [],
        uid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewParticipant({ name: '', caseNumber: '' });
      setIsAdding(false);
    } catch (err) {
      console.error("Add Error:", err);
    }
  };

  const handleDeleteParticipant = async () => {
    if (!selectedParticipantId) return;
    
    try {
      await deleteDoc(doc(db, 'participants', selectedParticipantId));
      setSelectedParticipantId(null);
      setIsDeleting(false);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const handleUpdateParticipant = async () => {
    if (!selectedParticipant || !editedName.trim() || !editedCaseNumber.trim()) return;
    try {
      await updateDoc(doc(db, 'participants', selectedParticipant.id), {
        name: editedName.trim(),
        caseNumber: editedCaseNumber.trim(),
        updatedAt: serverTimestamp()
      });
      setIsEditingParticipant(false);
    } catch (err) {
      console.error("Update Error:", err);
    }
  };

  const startEditingParticipant = () => {
    if (selectedParticipant) {
      setEditedName(selectedParticipant.name);
      setEditedCaseNumber(selectedParticipant.caseNumber);
      setIsEditingParticipant(true);
    }
  };

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.caseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Participants</h2>
          <Button size="icon" variant="ghost" onClick={() => setIsAdding(true)} className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input 
            placeholder="Search by name or case..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 focus-visible:ring-blue-500 h-10 rounded-xl"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1 pb-6">
        <div className="space-y-2 px-4">
          {isAdding && (
            <Card className="mb-4 border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 shadow-inner overflow-hidden animate-in slide-in-from-top-2">
              <CardContent className="p-4">
                <form onSubmit={handleAddParticipant} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-black tracking-widest">Full Name</Label>
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
                    <Label htmlFor="case" className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-black tracking-widest">Case Number</Label>
                    <Input 
                      id="case" 
                      value={newParticipant.caseNumber} 
                      onChange={e => setNewParticipant(prev => ({ ...prev, caseNumber: e.target.value }))}
                      className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono"
                      placeholder="2024-CR-0000"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" size="sm" className="flex-1 bg-blue-600 dark:bg-blue-500 text-white font-bold">Create Profile</Button>
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
              onClick={() => setSelectedParticipantId(p.id)}
              className={cn(
                "w-full text-left p-4 rounded-2xl transition-all duration-200 group relative border",
                selectedParticipantId === p.id 
                  ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-100 dark:shadow-blue-900/20" 
                  : "hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-100 dark:hover:border-slate-700"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "font-bold text-sm leading-tight",
                  selectedParticipantId === p.id ? "text-white" : "text-slate-800 dark:text-slate-200"
                )}>{p.name}</span>
                <Badge className={cn(
                  "text-[9px] h-4 px-1.5 font-black uppercase tracking-tighter",
                  selectedParticipantId === p.id 
                    ? "bg-white/20 text-white border-white/20" 
                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
                )}>
                  P{p.currentPhase}
                </Badge>
              </div>
              <div className={cn(
                "text-[10px] font-mono tracking-tight",
                selectedParticipantId === p.id ? "text-blue-200" : "text-slate-400 dark:text-slate-500"
              )}>{p.caseNumber}</div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  if (loading) return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
      <div className="h-safe-top bg-white w-full shrink-0"></div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="text-slate-400 font-medium animate-pulse">Initializing CaseSync...</div>
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
      <div className="h-safe-top bg-white w-full shrink-0"></div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CaseSync</h1>
        </div>
        <div className="space-y-2 text-center mb-10">
          <h2 className="text-xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Sign in to begin building your case plans with ease. Currently in testing for Johnson County Problem Solving Courts.
          </p>
        </div>
        <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]">
          Sign in with Google
        </Button>
        {loginError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
            {loginError}
          </div>
        )}
        <p className="mt-8 text-center text-xs text-slate-400">
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
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden text-slate-500" />}>
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
              <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                <SheetTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-600" />
                  <span className="font-black tracking-tight">CaseSync</span>
                </SheetTitle>
              </SheetHeader>
              {renderSidebarContent()}
            </SheetContent>
          </Sheet>

          <div className="bg-blue-600 p-2 rounded-lg shadow-md shadow-blue-100 dark:shadow-blue-900/20 hidden md:block">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">CaseSync</h1>
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
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Court Case Manager</span>
          </div>
          <div className="hidden md:block h-8 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            <LogOut className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shadow-sm z-10">
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
                          className="text-2xl font-black h-12 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500"
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
                            className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-full h-8 w-8"
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
                          className="h-8 w-40 font-mono text-xs bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500"
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
                
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Current Phase</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{selectedParticipant.currentPhase}</span>
                      <span className="text-slate-300 dark:text-slate-700 font-bold">/ 5</span>
                    </div>
                  </div>
                  <div className="h-10 w-[1px] bg-slate-100 dark:bg-slate-800"></div>
                  <div className="w-32 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      <span>Progress</span>
                      <span>{Math.round((selectedParticipant.currentPhase / 5) * 100)}%</span>
                    </div>
                    <Progress value={(selectedParticipant.currentPhase / 5) * 100} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              </div>

              <Tabs defaultValue="plan" className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 h-14 rounded-2xl shadow-sm inline-flex w-auto">
                  <TabsTrigger value="plan" className="data-[state=active]:bg-blue-600 dark:data-[state=active]:bg-blue-500 data-[state=active]:text-white px-4 md:px-8 rounded-xl font-bold transition-all">
                    <LayoutDashboard className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="data-[state=active]:bg-blue-600 dark:data-[state=active]:bg-blue-500 data-[state=active]:text-white px-4 md:px-8 rounded-xl font-bold transition-all">
                    <Target className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Goals</span>
                  </TabsTrigger>
                  <TabsTrigger value="report" className="data-[state=active]:bg-blue-600 dark:data-[state=active]:bg-blue-500 data-[state=active]:text-white px-4 md:px-8 rounded-xl font-bold transition-all">
                    <FileText className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Case Plan</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="plan" className="mt-6 outline-none">
                  <CasePlanEditor participant={selectedParticipant} />
                </TabsContent>

                <TabsContent value="ai" className="mt-6 outline-none">
                  <AIGoalRefiner participant={selectedParticipant} />
                </TabsContent>

                <TabsContent value="report" className="mt-6 outline-none">
                  <CourtReport participant={selectedParticipant} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="relative bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                  <Scale className="w-20 h-20 text-blue-600 dark:text-blue-500" />
                </div>
              </div>
              <div className="text-center max-w-sm space-y-3">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">CaseSync</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Select a participant from the sidebar to begin managing their milestones, goals, and court documentation.
                </p>
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
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Delete Profile?</h3>
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
    </div>
  );
}
