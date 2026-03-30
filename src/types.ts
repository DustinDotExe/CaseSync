export interface Milestones {
  phase1: boolean;
  phase2: boolean;
  phase3: boolean;
  phase4: boolean;
  phase5: boolean;
}

export interface Participant {
  id: string;
  name: string;
  caseNumber: string;
  currentPhase: number;
  goals: string[];
  notes: string;
  milestones: Milestones;
  irasDomains: string[];
  completedGoals?: string[];
  uid: string;
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'case_manager' | 'admin';
}
