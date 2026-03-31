import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Participant } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { BrainCircuit, Sparkles, Plus, Trash2, CheckCircle, Loader2, Pencil, Check, X } from 'lucide-react';
import { refineGoalStream } from '../services/geminiService';

export default function AIGoalRefiner({ participant }: { participant: Participant }) {
  const [roughNotes, setRoughNotes] = useState('');
  const [refinedGoal, setRefinedGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingGoalIdx, setEditingGoalIdx] = useState<number | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState('');

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

  const handleAddGoal = async () => {
    if (!refinedGoal) return;
    try {
      await updateDoc(doc(db, 'participants', participant.id), {
        goals: arrayUnion(refinedGoal),
        updatedAt: serverTimestamp()
      });
      setRefinedGoal('');
      setRoughNotes('');
    } catch (err) {
      console.error("Add Goal Error:", err);
    }
  };

  const handleDeleteGoal = async (goalToDelete: string) => {
    try {
      const newGoals = participant.goals.filter(g => g !== goalToDelete);
      await updateDoc(doc(db, 'participants', participant.id), {
        goals: newGoals,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Delete Goal Error:", err);
    }
  };

  const handleUpdateGoal = async (idx: number) => {
    if (!editingGoalValue.trim()) return;
    try {
      const newGoals = [...participant.goals];
      newGoals[idx] = editingGoalValue.trim();
      await updateDoc(doc(db, 'participants', participant.id), {
        goals: newGoals,
        updatedAt: serverTimestamp()
      });
      setEditingGoalIdx(null);
    } catch (err) {
      console.error("Update Goal Error:", err);
    }
  };

  const startEditingGoal = (idx: number, value: string) => {
    setEditingGoalIdx(idx);
    setEditingGoalValue(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Generate SMART Goals
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Transform rough notes into SMART goals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={roughNotes}
              onChange={(e) => setRoughNotes(e.target.value)}
              placeholder="e.g., Participant needs to find a job and attend 3 meetings a week for the next month."
              className="min-h-[120px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            />
            <Button 
              onClick={handleRefine} 
              disabled={loading || !roughNotes.trim()} 
              className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI is thinking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate SMART Goal
                </span>
              )}
            </Button>

            {refinedGoal && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50 relative group animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">Refined SMART Goal</h4>
                <Textarea 
                  value={refinedGoal}
                  onChange={(e) => setRefinedGoal(e.target.value)}
                  className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/50 focus-visible:ring-blue-500 min-h-[100px]"
                />
                <Button 
                  size="sm" 
                  onClick={handleAddGoal}
                  className="mt-4 w-full bg-blue-600 dark:bg-blue-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Case Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Active SMART Goals</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Current objectives for this participant.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {participant.goals.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-600">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No goals set yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {participant.goals.map((goal, idx) => (
                  <div key={idx} className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm flex flex-col gap-4 group">
                    {editingGoalIdx === idx ? (
                      <div className="space-y-3">
                        <Textarea 
                          value={editingGoalValue}
                          onChange={(e) => setEditingGoalValue(e.target.value)}
                          className="min-h-[100px] text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setEditingGoalIdx(null)}
                            className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateGoal(idx)}
                            className="bg-blue-600 dark:bg-blue-500 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{goal}</p>
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => startEditingGoal(idx, goal)}
                            className="h-8 w-8 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteGoal(goal)}
                            className="h-8 w-8 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
