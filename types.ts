
export enum RecordType {
  PROFILE = 'PROFILE',
  HEALTH = 'HEALTH',
  TODO = 'TODO',
  FINANCE = 'FINANCE',
  NOTE = 'NOTE',
}

export type SharingPreference = 'ALWAYS_SHARE' | 'ASK_EVERY_TIME';

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
}

export interface SharedMeta {
  isShared: boolean;
  sharedWith: string[]; // List of user names/IDs
  lastUpdatedBy: string;
  updatedAt: Date;
}

// Per-record share tracking
export interface RecordShare {
  id: string;
  recordType: RecordType;
  recordId: string;
  sharedBy: string;
  sharedByName?: string;
  sharedWithUserId?: string;
  sharedWithEmail?: string;
  mergedIntoPersonId?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Date;
}

// For records received from others
export interface SharedFromInfo {
  userId: string;
  userName: string;
  sourcePersonName: string;
}

export interface HealthRecord {
  id: string;
  title: string;
  date: string;
  type: 'CHECKUP' | 'MEDICATION' | 'VACCINE' | 'OTHER';
  notes: string;
  attachments?: string[];
  meta: SharedMeta;
  // Sharing
  shares?: RecordShare[];
  sharedFrom?: SharedFromInfo;
  sharedWithCollaboratorIds?: string[]; // person_share_ids
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  isCompleted: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  meta: SharedMeta;
  // Sharing
  shares?: RecordShare[];
  sharedFrom?: SharedFromInfo;
  sharedWithCollaboratorIds?: string[]; // person_share_ids
}

export interface FinancialRecord {
  id: string;
  title: string;
  amount: number;
  type: 'OWED' | 'LENT' | 'GIFT' | 'EXPENSE';
  date: string;
  meta: SharedMeta;
  // Sharing
  shares?: RecordShare[];
  sharedFrom?: SharedFromInfo;
  sharedWithCollaboratorIds?: string[]; // person_share_ids
}

export interface Note {
  id: string;
  title: string;
  content: string; // Supports markdown
  tags: string[];
  meta: SharedMeta;
  // Sharing
  shares?: RecordShare[];
  sharedFrom?: SharedFromInfo;
  sharedWithCollaboratorIds?: string[]; // person_share_ids
}

export interface Person {
  id: string;
  name: string;
  relation: string;
  avatarUrl: string;
  themeColor: string; // e.g., "bg-rose-100"
  birthday: string;
  email?: string; // Optional email for the profile
  linkedUserId?: string; // Optional link to registered app user
  collaborators: string[]; // People who also have access to this profile
  sharingPreference: SharingPreference;
  health: HealthRecord[];
  todos: TodoItem[];
  financial: FinancialRecord[];
  notes: Note[];
}

// Pending share notification (for inbox)
export interface PendingShare {
  id: string;
  recordType: RecordType;
  recordId: string;
  sourcePersonName: string;
  sourcePersonId: string;
  sharedByName: string;
  sharedByEmail: string;
  sharedById: string;
  recordTitle: string;
  createdAt: Date;
}

export interface AppState {
  people: Person[];
  currentUser: User | null;
  pendingShares?: PendingShare[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

// Collaboration request for profile-level sharing
export interface CollaborationRequest {
  id: string;
  personId: string;
  personName: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  targetUserId?: string;
  targetEmail?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  mergedIntoPersonId?: string;
  createdAt: Date;
  updatedAt: Date;
}
