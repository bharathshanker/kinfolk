
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
  userEmail?: string;
  userAvatarUrl?: string;
  sourcePersonName: string;
  sharedAt?: Date;
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
  email: string; // Email is now required for collaboration
  phone: string; // Phone number for better profile matching
  dateOfBirth: string; // Date of birth for merge key
  gender?: 'male' | 'female' | 'other'; // Gender for avatar colors and personalization
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
  inviteToken?: string;
  profileSnapshot?: ProfileSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

// Profile snapshot for collaboration request preview
export interface ProfileSnapshot {
  name: string;
  relation: string;
  avatarUrl: string;
  birthday?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'other';
}

// Profile link for bidirectional sync between two profiles
export interface ProfileLink {
  id: string;
  profileAId: string;
  profileBId: string;
  userAId: string;
  userBId: string;
  isActive: boolean;
  collaborationRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Collaborator info for display
export interface Collaborator {
  id: string; // person_share_id
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}
