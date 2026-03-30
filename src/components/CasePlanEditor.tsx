import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Participant } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Save, Mic, Sparkles, Loader2, MicOff } from 'lucide-react';
import { refineNotesStream } from '../services/geminiService';

const IRAS_DOMAINS = [
  "Criminal History",
  "Education, Employment, and Financial",
  "Family and Social Support",
  "Substance Use",
  "Peer Associations",
  "Criminal Attitudes and Behaviors"
];

export default function CasePlanEditor({ participant }: { participant: Participant }) {
  const [notes, setNotes] = useState(participant.notes);
  const [milestones, setMilestones] = useState(participant.milestones);
  const [irasDomains, setIrasDomains] = useState(participant.irasDomains || []);
  const [saving, setSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [notes]);

  useEffect(() => {
    setNotes(participant.notes);
    setMilestones(participant.milestones);
    setIrasDomains(participant.irasDomains || []);
  }, [participant.id]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSttSupported(false);
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setNotes((prev: string) => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please check your browser permissions.');
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!sttSupported) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handleAIRefine = async () => {
    if (!notes.trim()) return;
    setIsRefining(true);
    try {
      const stream = refineNotesStream(notes);
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setNotes(fullText);
      }
    } catch (err) {
      console.error("AI Refinement Error:", err);
      alert("AI refinement failed. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleToggleIrasDomain = async (domain: string) => {
    const isSelected = irasDomains.includes(domain);
    const newDomains = isSelected 
      ? irasDomains.filter(d => d !== domain)
      : [...irasDomains, domain];
    
    setIrasDomains(newDomains);

    try {
      await updateDoc(doc(db, 'participants', participant.id), {
        irasDomains: newDomains,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Update IRAS Error:", err);
    }
  };

  const handleToggleMilestone = async (phase: keyof typeof milestones) => {
    const newMilestones = { ...milestones, [phase]: !milestones[phase] };
    setMilestones(newMilestones);
    
    // Auto-calculate phase based on milestones
    let newPhase = 1;
    if (newMilestones.phase5) newPhase = 5;
    else if (newMilestones.phase4) newPhase = 4;
    else if (newMilestones.phase3) newPhase = 3;
    else if (newMilestones.phase2) newPhase = 2;

    try {
      await updateDoc(doc(db, 'participants', participant.id), {
        milestones: newMilestones,
        currentPhase: newPhase,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Update Error:", err);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'participants', participant.id), {
        notes,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Save Error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* IRAS Domains Selection */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Target Domains</CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Select the criminogenic needs being addressed in this case plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {IRAS_DOMAINS.map((domain) => {
              const isSelected = irasDomains.includes(domain);
              const domainId = `iras-${domain.replace(/\s+/g, '-').toLowerCase()}`;
              return (
                <div key={domain} className="flex items-center space-x-3 group">
                  <Checkbox 
                    id={domainId} 
                    checked={isSelected}
                    onCheckedChange={() => handleToggleIrasDomain(domain)}
                    className="w-5 h-5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label 
                    htmlFor={domainId}
                    className={`text-sm font-medium cursor-pointer transition-colors ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    {domain}
                  </Label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Milestone Tracker</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Track progress through phases 1-5.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((phase) => {
            const phaseKey = `phase${phase}` as keyof typeof milestones;
            const isCompleted = milestones[phaseKey];
            return (
              <div key={phase} className="flex items-center space-x-3 group">
                <Checkbox 
                  id={`phase-${phase}`} 
                  checked={isCompleted}
                  onCheckedChange={() => handleToggleMilestone(phaseKey)}
                  className="w-5 h-5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label 
                  htmlFor={`phase-${phase}`}
                  className={`text-sm font-medium cursor-pointer transition-colors ${isCompleted ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  Phase {phase}: {getPhaseName(phase)}
                </Label>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Case Manager Observations</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Detailed observations and progress logs.</CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={toggleListening} 
              className={`${isListening ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 animate-pulse' : 'text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-800'}`}
              title={isListening ? "Stop Recording" : "Speech to Text"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleAIRefine} 
              disabled={isRefining || !notes.trim()}
              className="text-blue-600 dark:text-blue-200 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              title="AI Refine"
            >
              {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
            <Button size="sm" onClick={handleSaveNotes} disabled={saving} className="bg-blue-600 dark:bg-blue-500 text-white">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Textarea 
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter detailed notes about the participant's progress, challenges, and court appearances..."
              className="min-h-[150px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus-visible:ring-blue-500 pr-10 resize-none overflow-hidden"
            />
            {isListening && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[10px] font-bold text-red-500 animate-pulse bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded-full border border-red-100 dark:border-red-900/50">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                LISTENING...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
  );
}

function getPhaseName(phase: number) {
  const names = [
    "Orientation & Stabilization",
    "Active Treatment",
    "Relapse Prevention",
    "Community Reintegration",
    "Commencement Preparation"
  ];
  return names[phase - 1];
}
