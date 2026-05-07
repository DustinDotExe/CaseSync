export interface CurrentUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export interface GoalEntry {
  id: string;
  text: string;
  dueDate?: string;    // YYYY-MM-DD
  reviewedOn?: string; // YYYY-MM-DD
}

function stableId(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
    h >>>= 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function normalizeGoals(
  rawGoals: (string | GoalEntry)[] | undefined,
  rawCompleted: string[] | undefined
): { goals: GoalEntry[]; completedGoals: string[] } {
  const goals: GoalEntry[] = (rawGoals ?? []).map((g) =>
    typeof g === 'string' ? { id: stableId(g), text: g } : g
  );
  // Migrate completedGoals from text strings to IDs
  const completedGoals = (rawCompleted ?? []).map((c) => {
    const matchByText = goals.find((g) => g.text === c);
    return matchByText ? matchByText.id : c;
  });
  return { goals, completedGoals };
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

export interface MilestonePhase {
  label: string;
}

export const DEFAULT_MILESTONE_PHASES: MilestonePhase[] = [
  { label: 'Orientation & Stabilization' },
  { label: 'Active Treatment' },
  { label: 'Relapse Prevention' },
  { label: 'Community Reintegration' },
  { label: 'Commencement Preparation' },
];

export type Milestones = Record<string, boolean>;

export interface Participant {
  id: string;
  name: string;
  caseNumber: string;
  currentPhase: number;
  goals: GoalEntry[];
  notes: string;
  milestones: Milestones;
  irasDomains: string[];
  completedGoals?: string[]; // contains GoalEntry IDs
  phaseUpdate?: string; // YYYY-MM-DD target date for phase advancement
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
