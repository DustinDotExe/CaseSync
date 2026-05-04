export interface CurrentUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export type AuditCategory =
  | 'participant_created'
  | 'participant_deleted'
  | 'participant_info_updated'
  | 'phase_transition'
  | 'goal_added'
  | 'goal_deleted'
  | 'goal_edited'
  | 'goal_completed'
  | 'goal_uncompleted'
  | 'observation_updated'
  | 'iras_domain_updated';

export interface AuditLogEntry {
  id: string;
  participantId: string;
  caseManagerUid: string;
  action: 'created' | 'deleted' | 'updated';
  category: AuditCategory;
  description: string;
  details?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
  } | null;
  changedBy: {
    uid: string;
    displayName: string;
    email: string;
  };
  timestamp: any;
}

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

export interface StoredGoalTemplate {
  label: string;
  notes: string;
}

export interface StoredTemplateCategory {
  domain: string;
  shortLabel: string;
  templates: StoredGoalTemplate[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'case_manager' | 'admin';
}
