
import React, { useState, useEffect } from 'react';
import { Person, RecordType, HealthRecord, TodoItem, Note, FinancialRecord, User, SharingPreference, SharedFromInfo } from '../types';
import { Avatar, Button, Card, Icon, Badge, Modal, Toggle, Input, TextArea } from './Shared';
import { HealthDashboard } from './health/HealthDashboard';
import { generateAvatarUrl } from '../src/utils/avatars';

// Shared By Badge Component
const SharedByBadge: React.FC<{ sharedFrom: SharedFromInfo }> = ({ sharedFrom }) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs">
      <div className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
        {sharedFrom.userName.charAt(0).toUpperCase()}
      </div>
      <span className="text-indigo-600 font-medium">
        Shared by {sharedFrom.userName.split(' ')[0]}
      </span>
    </div>
  );
};

// --- Feed/Summary View Types and Helpers ---

interface ActivityItem {
  type: 'todo' | 'health' | 'note' | 'finance';
  title: string;
  date: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  status?: string;
  amount?: number;
}

// Format relative time (e.g., "2 hours ago", "3 days ago")
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Get activity feed from all records
const getActivityFeed = (person: Person): ActivityItem[] => {
  const activities: ActivityItem[] = [];

  person.todos.forEach(t => activities.push({
    type: 'todo',
    title: t.title,
    date: t.dueDate,
    icon: t.isCompleted ? 'task_alt' : 'radio_button_unchecked',
    iconColor: t.isCompleted ? 'text-green-600' : 'text-amber-600',
    bgColor: t.isCompleted ? 'bg-green-50' : 'bg-amber-50',
    status: t.isCompleted ? 'Completed' : `Due ${formatRelativeTime(t.dueDate)}`
  }));

  person.health.forEach(h => activities.push({
    type: 'health',
    title: h.title,
    date: h.date,
    icon: 'monitor_heart',
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
    status: h.type.charAt(0) + h.type.slice(1).toLowerCase()
  }));

  person.notes.forEach(n => activities.push({
    type: 'note',
    title: n.title,
    date: n.meta.updatedAt ? new Date(n.meta.updatedAt).toISOString() : new Date().toISOString(),
    icon: 'edit_note',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50'
  }));

  person.financial.forEach(f => activities.push({
    type: 'finance',
    title: f.title,
    date: f.date,
    icon: 'account_balance_wallet',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    status: f.type.charAt(0) + f.type.slice(1).toLowerCase(),
    amount: f.amount
  }));

  return activities
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);
};

// Calculate quick stats
const getStats = (person: Person) => {
  const pendingTodos = person.todos.filter(t => !t.isCompleted);
  const sortedPendingTodos = [...pendingTodos].sort((a, b) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
  const sortedHealth = [...person.health].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    todos: {
      pending: pendingTodos.length,
      total: person.todos.length,
      nextDue: sortedPendingTodos[0]?.dueDate
    },
    health: {
      count: person.health.length,
      lastVisit: sortedHealth[0]?.date
    },
    notes: {
      count: person.notes.length
    },
    finance: {
      total: person.financial.reduce((sum, f) => sum + f.amount, 0),
      owed: person.financial.filter(f => f.type === 'OWED').reduce((sum, f) => sum + f.amount, 0),
      lent: person.financial.filter(f => f.type === 'LENT').reduce((sum, f) => sum + f.amount, 0)
    }
  };
};

// Stat Card Component
const StatCard: React.FC<{
  icon: string;
  iconColor: string;
  bgColor: string;
  title: string;
  value: string;
  subtitle?: string;
  onClick?: () => void;
}> = ({ icon, iconColor, bgColor, title, value, subtitle, onClick }) => (
  <button
    onClick={onClick}
    className={`${bgColor} p-4 rounded-2xl text-left transition-all hover:scale-[1.02] hover:shadow-md w-full`}
  >
    <div className="flex items-start justify-between mb-2">
      <div className={`w-10 h-10 rounded-xl ${bgColor} border border-white/50 flex items-center justify-center`}>
        <Icon name={icon} className={`text-xl ${iconColor}`} />
      </div>
    </div>
    <p className="text-xs font-medium text-brown-500 uppercase tracking-wider">{title}</p>
    <p className={`text-2xl font-bold ${iconColor.replace('text-', 'text-').replace('-600', '-800')}`}>{value}</p>
    {subtitle && <p className="text-xs text-brown-500 mt-1">{subtitle}</p>}
  </button>
);

// Activity Feed Item Component
const ActivityFeedItem: React.FC<{ item: ActivityItem }> = ({ item }) => (
  <div className="flex items-center gap-3 py-3 border-b border-brown-100 last:border-0">
    <div className={`w-9 h-9 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
      <Icon name={item.icon} className={`text-lg ${item.iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-brown-800 truncate">{item.title}</p>
      <div className="flex items-center gap-2 text-xs text-brown-500">
        <span className="capitalize">{item.type}</span>
        {item.status && (
          <>
            <span className="text-brown-300">•</span>
            <span>{item.status}</span>
          </>
        )}
        {item.amount !== undefined && (
          <>
            <span className="text-brown-300">•</span>
            <span className="font-medium">${item.amount.toLocaleString()}</span>
          </>
        )}
      </div>
    </div>
    <span className="text-xs text-brown-400 flex-shrink-0">{formatRelativeTime(item.date)}</span>
  </div>
);

interface PersonDetailProps {
  person: Person;
  currentUser: User | null;
  initialTab?: RecordType;
  onBack: () => void;
  onUpdatePerson: (updatedPerson: Person) => void;
  onDeletePerson: (personId: string) => void;
  onAddTodo: (personId: string, title: string, date: string, priority?: string, description?: string, sharedWithCollaboratorIds?: string[]) => void;
  onUpdateTodo: (todoId: string, updates: { title?: string; dueDate?: string; priority?: string; description?: string; isCompleted?: boolean; sharedWithCollaboratorIds?: string[] }) => void;
  onDeleteTodo: (todoId: string) => void;
  onToggleTodo: (todoId: string, isCompleted: boolean) => void;
  onAddHealth: (personId: string, title: string, date: string, notes: string, type: string, files?: File[], sharedWithCollaboratorIds?: string[]) => void;
  onUpdateHealth: (recordId: string, updates: { title?: string; date?: string; notes?: string; type?: string; sharedWithCollaboratorIds?: string[] }) => void;
  onDeleteHealth: (recordId: string) => void;
  onAddNote: (personId: string, title: string, content: string, sharedWithCollaboratorIds?: string[]) => void;
  onUpdateNote: (noteId: string, updates: { title?: string; content?: string; sharedWithCollaboratorIds?: string[] }) => void;
  onDeleteNote: (noteId: string) => void;
  onAddFinance: (personId: string, title: string, amount: number, type: string, date: string, sharedWithCollaboratorIds?: string[]) => void;
  onUpdateFinance: (recordId: string, updates: { title?: string; amount?: number; type?: string; date?: string; sharedWithCollaboratorIds?: string[] }) => void;
  onDeleteFinance: (recordId: string) => void;
  onUploadAvatar: (personId: string, file: File) => Promise<void>;
  // Sharing
  onShareRecord?: (recordType: 'TODO' | 'HEALTH' | 'NOTE' | 'FINANCE', recordId: string, sourcePersonId: string, email: string) => Promise<void>;
  onUnshareRecord?: (shareId: string) => Promise<void>;
  // Collaboration
  onLinkToUser?: (personId: string, userId: string) => Promise<void>;
  onSendCollaborationRequest?: (personId: string, targetUserId?: string, targetEmail?: string) => Promise<string | void>;
  onGenerateInviteLink?: (personId: string) => Promise<string>;
  onRemoveCollaborator?: (personId: string, collaboratorUserId: string) => Promise<void>;
}

// --- Edit Profile Modal ---
const EditProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  onUpdate: (updatedPerson: Person) => void;
  onDelete: () => void;
  onLinkToUser?: (personId: string, userId: string) => Promise<void>;
}> = ({ isOpen, onClose, person, onUpdate, onDelete, onLinkToUser }) => {
  const [name, setName] = useState(person.name);
  const [relation, setRelation] = useState(person.relation);
  const [birthday, setBirthday] = useState(person.birthday || '');
  const [email, setEmail] = useState(person.email || '');
  const [phone, setPhone] = useState(person.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(person.dateOfBirth || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(person.gender || 'other');
  const [linkSearchEmail, setLinkSearchEmail] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState<Array<{ id: string; email: string; full_name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Search for users by email
  const searchUsers = async (searchEmail: string) => {
    if (!searchEmail || searchEmail.length < 3) {
      setLinkSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { supabase } = await import('../src/lib/supabase');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', `%${searchEmail}%`)
        .limit(5);
      if (!error && data) {
        setLinkSearchResults(data);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(linkSearchEmail);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [linkSearchEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...person,
      name,
      relation,
      birthday,
      email: email || '',
      phone: phone || '',
      dateOfBirth: dateOfBirth || '',
      gender
    });
    onClose();
  };

  const handleLinkToUser = async (userId: string) => {
    if (onLinkToUser) {
      await onLinkToUser(person.id, userId);
      onUpdate({
        ...person,
        linkedUserId: userId
      });
      setLinkSearchEmail('');
      setLinkSearchResults([]);
    }
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Person">
        <div className="space-y-4">
          <p className="text-brown-600">Are you sure you want to delete <strong>{person.name}</strong>? This will also delete all their health records, todos, notes, and financial records.</p>
          <p className="text-red-500 text-sm font-medium">This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={onDelete}>Delete Forever</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
        <Input label="Relation" value={relation} onChange={e => setRelation(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
        <Input label="Phone Number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
        <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
        <div>
          <label className="block text-xs font-bold text-brown-500 uppercase tracking-wider mb-1.5">Gender</label>
          <select
            value={gender}
            onChange={e => setGender(e.target.value as 'male' | 'female' | 'other')}
            className="w-full bg-brown-50 border border-brown-200 rounded-xl px-4 py-2.5 text-brown-800 focus:outline-none focus:ring-2 focus:ring-brown-800/10 focus:border-brown-400 transition-all"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Input label="Birthday (for reminders)" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
        
        {/* Link to Account Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-brown-500 uppercase mb-1">Link to Account</label>
          {person.linkedUserId ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <Icon name="check_circle" className="inline mr-2" />
              Profile is linked to an account
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Search by email..."
                value={linkSearchEmail}
                onChange={e => setLinkSearchEmail(e.target.value)}
                type="email"
              />
              {isSearching && (
                <div className="text-xs text-brown-400">Searching...</div>
              )}
              {linkSearchResults.length > 0 && (
                <div className="border border-brown-200 rounded-xl overflow-hidden">
                  {linkSearchResults.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleLinkToUser(user.id)}
                      className="w-full p-3 text-left hover:bg-brown-50 border-b border-brown-100 last:border-b-0 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {(user.full_name || user.email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brown-800">{user.full_name || 'No name'}</p>
                        <p className="text-xs text-brown-500">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} type="button">Delete Person</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// --- Edit Todo Modal ---
const EditTodoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  todo: TodoItem;
  person: Person;
  onUpdate: (updates: { title?: string; dueDate?: string; priority?: string; description?: string; sharedWithCollaboratorIds?: string[] }) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, todo, person, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(todo.title);
  const [dueDate, setDueDate] = useState(todo.dueDate);
  const [priority, setPriority] = useState(todo.priority);
  const [description, setDescription] = useState(todo.description || '');
  const [share, setShare] = useState((todo.sharedWithCollaboratorIds?.length || 0) > 0);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>(todo.sharedWithCollaboratorIds || []);
  const [acceptedCollaborators, setAcceptedCollaborators] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchCollaborators = async () => {
        try {
          const { supabase } = await import('../src/lib/supabase');
          const { data, error } = await supabase
            .from('person_shares')
            .select('id, user_id, user_email, profiles(full_name, email)')
            .eq('person_id', person.id)
            .not('user_id', 'is', null);

          if (!error && data) {
            setAcceptedCollaborators(data.map(share => ({
              id: share.id,
              name: (share.profiles as any)?.full_name || share.user_email || 'Unknown',
              email: (share.profiles as any)?.email || share.user_email
            })));
          }
        } catch (err) {
          console.error('Error fetching collaborators:', err);
        }
      };
      fetchCollaborators();
    }
  }, [isOpen, person.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ 
      title, 
      dueDate, 
      priority, 
      description,
      sharedWithCollaboratorIds: share ? selectedCollaboratorIds : undefined
    });
    onClose();
  };

  const toggleCollaborator = (collabId: string) => {
    setSelectedCollaboratorIds(prev =>
      prev.includes(collabId)
        ? prev.filter(id => id !== collabId)
        : [...prev, collabId]
    );
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Task">
        <div className="space-y-4">
          <p className="text-brown-600">Are you sure you want to delete this task?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { onDelete(); onClose(); }}>Delete</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <div>
          <label className="block text-xs font-bold text-brown-500 uppercase mb-1">Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
            className="w-full p-3 bg-brown-50 border border-brown-200 rounded-xl text-sm outline-none focus:border-brown-400 transition-colors"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <TextArea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add more details..." />
        
        <div className="pt-4 border-t border-brown-100">
          <Toggle
            checked={share}
            onChange={setShare}
            label="Share with Collaborators?"
          />
          {share && acceptedCollaborators.length > 0 && (
            <div className="mt-3 pl-[52px]">
              <p className="text-xs font-bold text-brown-500 uppercase mb-2">Select Collaborators</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {acceptedCollaborators.map(collab => (
                  <label
                    key={collab.id}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                      selectedCollaboratorIds.includes(collab.id)
                        ? 'bg-indigo-100 border-2 border-indigo-300'
                        : 'bg-brown-50 border border-brown-200 hover:border-indigo-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollaboratorIds.includes(collab.id)}
                      onChange={() => toggleCollaborator(collab.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {collab.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brown-800">{collab.name}</p>
                      {collab.email && <p className="text-xs text-brown-500">{collab.email}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          {share && acceptedCollaborators.length === 0 && (
            <p className="text-xs text-brown-400 mt-2 pl-[52px]">
              No accepted collaborators yet.
            </p>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} type="button">Delete</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// --- Edit Health Modal ---
const EditHealthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  record: HealthRecord;
  person: Person;
  onUpdate: (updates: { title?: string; date?: string; notes?: string; type?: string; sharedWithCollaboratorIds?: string[] }) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, record, person, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(record.title);
  const [date, setDate] = useState(record.date);
  const [notes, setNotes] = useState(record.notes);
  const [type, setType] = useState(record.type);
  const [share, setShare] = useState((record.sharedWithCollaboratorIds?.length || 0) > 0);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>(record.sharedWithCollaboratorIds || []);
  const [acceptedCollaborators, setAcceptedCollaborators] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchCollaborators = async () => {
        try {
          const { supabase } = await import('../src/lib/supabase');
          const { data, error } = await supabase
            .from('person_shares')
            .select('id, user_id, user_email, profiles(full_name, email)')
            .eq('person_id', person.id)
            .not('user_id', 'is', null);

          if (!error && data) {
            setAcceptedCollaborators(data.map(share => ({
              id: share.id,
              name: (share.profiles as any)?.full_name || share.user_email || 'Unknown',
              email: (share.profiles as any)?.email || share.user_email
            })));
          }
        } catch (err) {
          console.error('Error fetching collaborators:', err);
        }
      };
      fetchCollaborators();
    }
  }, [isOpen, person.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ 
      title, 
      date, 
      notes, 
      type,
      sharedWithCollaboratorIds: share ? selectedCollaboratorIds : undefined
    });
    onClose();
  };

  const toggleCollaborator = (collabId: string) => {
    setSelectedCollaboratorIds(prev =>
      prev.includes(collabId)
        ? prev.filter(id => id !== collabId)
        : [...prev, collabId]
    );
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Health Record">
        <div className="space-y-4">
          <p className="text-brown-600">Are you sure you want to delete this health record?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { onDelete(); onClose(); }}>Delete</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Health Record">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <div>
          <label className="block text-xs font-bold text-brown-500 uppercase mb-1">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as 'CHECKUP' | 'MEDICATION' | 'VACCINE' | 'OTHER')}
            className="w-full p-3 bg-brown-50 border border-brown-200 rounded-xl text-sm outline-none focus:border-brown-400 transition-colors"
          >
            <option value="CHECKUP">Checkup</option>
            <option value="MEDICATION">Medication</option>
            <option value="VACCINE">Vaccine</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <TextArea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        
        <div className="pt-4 border-t border-brown-100">
          <Toggle
            checked={share}
            onChange={setShare}
            label="Share with Collaborators?"
          />
          {share && acceptedCollaborators.length > 0 && (
            <div className="mt-3 pl-[52px]">
              <p className="text-xs font-bold text-brown-500 uppercase mb-2">Select Collaborators</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {acceptedCollaborators.map(collab => (
                  <label
                    key={collab.id}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                      selectedCollaboratorIds.includes(collab.id)
                        ? 'bg-indigo-100 border-2 border-indigo-300'
                        : 'bg-brown-50 border border-brown-200 hover:border-indigo-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollaboratorIds.includes(collab.id)}
                      onChange={() => toggleCollaborator(collab.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {collab.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brown-800">{collab.name}</p>
                      {collab.email && <p className="text-xs text-brown-500">{collab.email}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          {share && acceptedCollaborators.length === 0 && (
            <p className="text-xs text-brown-400 mt-2 pl-[52px]">
              No accepted collaborators yet.
            </p>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} type="button">Delete</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// --- Edit Note Modal ---
const EditNoteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  person: Person;
  onUpdate: (updates: { title?: string; content?: string; sharedWithCollaboratorIds?: string[] }) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, note, person, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [share, setShare] = useState((note.sharedWithCollaboratorIds?.length || 0) > 0);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>(note.sharedWithCollaboratorIds || []);
  const [acceptedCollaborators, setAcceptedCollaborators] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchCollaborators = async () => {
        try {
          const { supabase } = await import('../src/lib/supabase');
          const { data, error } = await supabase
            .from('person_shares')
            .select('id, user_id, user_email, profiles(full_name, email)')
            .eq('person_id', person.id)
            .not('user_id', 'is', null);

          if (!error && data) {
            setAcceptedCollaborators(data.map(share => ({
              id: share.id,
              name: (share.profiles as any)?.full_name || share.user_email || 'Unknown',
              email: (share.profiles as any)?.email || share.user_email
            })));
          }
        } catch (err) {
          console.error('Error fetching collaborators:', err);
        }
      };
      fetchCollaborators();
    }
  }, [isOpen, person.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ 
      title, 
      content,
      sharedWithCollaboratorIds: share ? selectedCollaboratorIds : undefined
    });
    onClose();
  };

  const toggleCollaborator = (collabId: string) => {
    setSelectedCollaboratorIds(prev =>
      prev.includes(collabId)
        ? prev.filter(id => id !== collabId)
        : [...prev, collabId]
    );
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Note">
        <div className="space-y-4">
          <p className="text-brown-600">Are you sure you want to delete this note?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { onDelete(); onClose(); }}>Delete</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <TextArea label="Content" value={content} onChange={e => setContent(e.target.value)} />
        
        <div className="pt-4 border-t border-brown-100">
          <Toggle
            checked={share}
            onChange={setShare}
            label="Share with Collaborators?"
          />
          {share && acceptedCollaborators.length > 0 && (
            <div className="mt-3 pl-[52px]">
              <p className="text-xs font-bold text-brown-500 uppercase mb-2">Select Collaborators</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {acceptedCollaborators.map(collab => (
                  <label
                    key={collab.id}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                      selectedCollaboratorIds.includes(collab.id)
                        ? 'bg-indigo-100 border-2 border-indigo-300'
                        : 'bg-brown-50 border border-brown-200 hover:border-indigo-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollaboratorIds.includes(collab.id)}
                      onChange={() => toggleCollaborator(collab.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {collab.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brown-800">{collab.name}</p>
                      {collab.email && <p className="text-xs text-brown-500">{collab.email}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          {share && acceptedCollaborators.length === 0 && (
            <p className="text-xs text-brown-400 mt-2 pl-[52px]">
              No accepted collaborators yet.
            </p>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} type="button">Delete</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// --- Edit Finance Modal ---
const EditFinanceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  record: FinancialRecord;
  person: Person;
  onUpdate: (updates: { title?: string; amount?: number; type?: string; date?: string; sharedWithCollaboratorIds?: string[] }) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, record, person, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(record.title);
  const [amount, setAmount] = useState(record.amount.toString());
  const [type, setType] = useState(record.type);
  const [date, setDate] = useState(record.date);
  const [share, setShare] = useState((record.sharedWithCollaboratorIds?.length || 0) > 0);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>(record.sharedWithCollaboratorIds || []);
  const [acceptedCollaborators, setAcceptedCollaborators] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchCollaborators = async () => {
        try {
          const { supabase } = await import('../src/lib/supabase');
          const { data, error } = await supabase
            .from('person_shares')
            .select('id, user_id, user_email, profiles(full_name, email)')
            .eq('person_id', person.id)
            .not('user_id', 'is', null);

          if (!error && data) {
            setAcceptedCollaborators(data.map(share => ({
              id: share.id,
              name: (share.profiles as any)?.full_name || share.user_email || 'Unknown',
              email: (share.profiles as any)?.email || share.user_email
            })));
          }
        } catch (err) {
          console.error('Error fetching collaborators:', err);
        }
      };
      fetchCollaborators();
    }
  }, [isOpen, person.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ 
      title, 
      amount: parseFloat(amount), 
      type, 
      date,
      sharedWithCollaboratorIds: share ? selectedCollaboratorIds : undefined
    });
    onClose();
  };

  const toggleCollaborator = (collabId: string) => {
    setSelectedCollaboratorIds(prev =>
      prev.includes(collabId)
        ? prev.filter(id => id !== collabId)
        : [...prev, collabId]
    );
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Financial Record">
        <div className="space-y-4">
          <p className="text-brown-600">Are you sure you want to delete this financial record?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { onDelete(); onClose(); }}>Delete</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Financial Record">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-brown-500 uppercase mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full p-3 bg-brown-50 border border-brown-200 rounded-xl text-sm outline-none focus:border-brown-400 transition-colors"
            >
              <option value="EXPENSE">Expense</option>
              <option value="GIFT">Gift</option>
              <option value="OWED">Owed</option>
              <option value="LENT">Lent</option>
            </select>
          </div>
        </div>
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        
        <div className="pt-4 border-t border-brown-100">
          <Toggle
            checked={share}
            onChange={setShare}
            label="Share with Collaborators?"
          />
          {share && acceptedCollaborators.length > 0 && (
            <div className="mt-3 pl-[52px]">
              <p className="text-xs font-bold text-brown-500 uppercase mb-2">Select Collaborators</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {acceptedCollaborators.map(collab => (
                  <label
                    key={collab.id}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                      selectedCollaboratorIds.includes(collab.id)
                        ? 'bg-indigo-100 border-2 border-indigo-300'
                        : 'bg-brown-50 border border-brown-200 hover:border-indigo-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollaboratorIds.includes(collab.id)}
                      onChange={() => toggleCollaborator(collab.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {collab.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brown-800">{collab.name}</p>
                      {collab.email && <p className="text-xs text-brown-500">{collab.email}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          {share && acceptedCollaborators.length === 0 && (
            <p className="text-xs text-brown-400 mt-2 pl-[52px]">
              No accepted collaborators yet.
            </p>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} type="button">Delete</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export const PersonDetail: React.FC<PersonDetailProps> = ({
  person,
  currentUser,
  initialTab,
  onBack,
  onUpdatePerson,
  onDeletePerson,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onToggleTodo,
  onAddHealth,
  onUpdateHealth,
  onDeleteHealth,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddFinance,
  onUpdateFinance,
  onDeleteFinance,
  onUploadAvatar,
  onShareRecord,
  onUnshareRecord,
  onLinkToUser,
  onSendCollaborationRequest,
  onGenerateInviteLink,
  onRemoveCollaborator
}) => {
  const [activeTab, setActiveTab] = useState<RecordType>(initialTab || RecordType.PROFILE);
  const [isUploading, setIsUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Sync activeTab with initialTab prop when it changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Add Item State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addType, setAddType] = useState<RecordType | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Edit Item States
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editingHealth, setEditingHealth] = useState<HealthRecord | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingFinance, setEditingFinance] = useState<FinancialRecord | null>(null);

  const tabs = [
    { id: RecordType.PROFILE, label: 'Feed', icon: 'dashboard' },
    { id: RecordType.HEALTH, label: 'Health', icon: 'monitor_heart' },
    { id: RecordType.TODO, label: 'Todos', icon: 'check_circle' },
    { id: RecordType.FINANCE, label: 'Finance', icon: 'account_balance_wallet' },
    { id: RecordType.NOTE, label: 'Notes', icon: 'edit_note' },
  ];

  const renderShareToggle = (isShared: boolean) => (
    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${isShared ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-brown-50 text-brown-400 border-brown-100'}`}>
      <Icon name={isShared ? 'group' : 'lock'} className="text-[14px]" />
      {isShared ? 'Shared' : 'Private'}
    </div>
  );

  const openAddModal = (type: RecordType) => {
    setAddType(type);
    setShowAddItemModal(true);
  };

  const handleDeletePerson = () => {
    onDeletePerson(person.id);
    onBack();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-400';
      case 'MEDIUM': return 'bg-amber-400';
      case 'LOW': return 'bg-green-400';
      default: return 'bg-brown-300';
    }
  };

  const heroGradient = person.themeColor?.includes('plum')
    ? 'from-plum-50 via-cream to-plum-100'
    : person.themeColor?.includes('coral')
      ? 'from-coral-50 via-turmeric-50 to-cream'
      : 'from-turmeric-50 via-cream to-plum-50';

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6">
      {/* Back link */}
      <div className="pt-2">
        <button onClick={onBack} className="flex items-center text-brown-500 hover:text-brown-800 text-sm font-semibold">
          <Icon name="arrow_back" className="text-lg mr-1" /> Back to Dashboard
        </button>
      </div>

      {/* Hero */}
      <div className={`relative rounded-4xl bg-gradient-to-br ${heroGradient} border border-turmeric-100 shadow-warm-xl overflow-hidden p-6 md:p-8`}>
        <div className="absolute inset-0 decorative-dots opacity-[0.08]" />
        <div className="absolute right-6 -top-6 w-32 h-32 bg-plum-200/30 rounded-full blur-3xl" />
        <div className="absolute -left-10 bottom-0 w-32 h-32 bg-coral-200/25 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative group">
            <Avatar
              src={person.avatarUrl}
              alt={person.name}
              size="w-32 h-32"
              className={`border-4 border-white/80 shadow-warm-xl ${isUploading ? 'opacity-50' : ''}`}
            />
            {isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-800"></div>
              </div>
            ) : (
              <label className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                <Icon name="photo_camera" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      setIsUploading(true);
                      try {
                        await onUploadAvatar(person.id, e.target.files[0]);
                      } catch (error) {
                        console.error("Upload failed:", error);
                        alert("Failed to upload image. Please try again.");
                      } finally {
                        setIsUploading(false);
                      }
                    }
                  }}
                />
              </label>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-title font-extrabold text-brown-900 heading-display">{person.name}</h1>
              <Badge text={person.relation} variant="turmeric" />
              <button onClick={() => setShowEditProfileModal(true)} className="text-brown-500 hover:text-brown-800">
                <Icon name="edit" className="text-xl" />
              </button>
              <button onClick={() => setShowShareModal(true)} className="text-brown-500 hover:text-indigo-600 relative">
                <Icon name="group" className="text-xl" />
                {person.collaborators.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {person.collaborators.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-caption text-brown-600">
              {person.birthday && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/70 border border-white/60 text-coral-700">
                  <Icon name="cake" className="text-sm" /> {person.birthday}
                </span>
              )}
              {person.email && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/70 border border-white/60">
                  <Icon name="mail" className="text-sm" /> {person.email}
                </span>
              )}
              {person.phone && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/70 border border-white/60">
                  <Icon name="call" className="text-sm" /> {person.phone}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button variant="primary" size="sm" onClick={() => { setActiveTab(RecordType.TODO); openAddModal(RecordType.TODO); }}>
                <Icon name="add_task" /> Add Task
              </Button>
              <Button variant="plum" size="sm" onClick={() => { setActiveTab(RecordType.HEALTH); openAddModal(RecordType.HEALTH); }}>
                <Icon name="monitor_heart" /> Add Health
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setActiveTab(RecordType.NOTE); openAddModal(RecordType.NOTE); }}>
                <Icon name="edit_note" /> New Note
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-cream/90 backdrop-blur-md border-b border-turmeric-100 py-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold transition-all whitespace-nowrap border ${activeTab === tab.id
                ? 'bg-gradient-to-r from-turmeric-400 to-plum-400 text-white shadow-glow-turmeric shadow-lg scale-[1.02]'
                : 'bg-white/80 text-brown-600 border-brown-100 hover:bg-brown-50'
                }`}
            >
              <Icon name={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-2">
          {activeTab === RecordType.PROFILE && (() => {
            const stats = getStats(person);
            const activities = getActivityFeed(person);
            return (
              <div className="space-y-6">
                {/* Quick Stats Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    icon="check_circle"
                    iconColor="text-amber-600"
                    bgColor="bg-amber-50"
                    title="Todos"
                    value={stats.todos.pending > 0 ? `${stats.todos.pending}` : '0'}
                    subtitle={stats.todos.nextDue ? `Next: ${formatRelativeTime(stats.todos.nextDue)}` : stats.todos.total > 0 ? 'All done!' : 'No tasks yet'}
                    onClick={() => setActiveTab(RecordType.TODO)}
                  />
                  <StatCard
                    icon="monitor_heart"
                    iconColor="text-rose-600"
                    bgColor="bg-rose-50"
                    title="Health"
                    value={`${stats.health.count}`}
                    subtitle={stats.health.lastVisit ? `Last: ${formatRelativeTime(stats.health.lastVisit)}` : 'No records yet'}
                    onClick={() => setActiveTab(RecordType.HEALTH)}
                  />
                  <StatCard
                    icon="edit_note"
                    iconColor="text-blue-600"
                    bgColor="bg-blue-50"
                    title="Notes"
                    value={`${stats.notes.count}`}
                    subtitle={stats.notes.count === 1 ? '1 note' : `${stats.notes.count} notes`}
                    onClick={() => setActiveTab(RecordType.NOTE)}
                  />
                  <StatCard
                    icon="account_balance_wallet"
                    iconColor="text-emerald-600"
                    bgColor="bg-emerald-50"
                    title="Finance"
                    value={stats.finance.total > 0 ? `$${stats.finance.total.toLocaleString()}` : '$0'}
                    subtitle={stats.finance.owed > 0 ? `Owed: $${stats.finance.owed}` : stats.finance.lent > 0 ? `Lent: $${stats.finance.lent}` : 'No transactions'}
                    onClick={() => setActiveTab(RecordType.FINANCE)}
                  />
                </div>

                {/* Activity Timeline */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-brown-400 uppercase tracking-wider">Recent Activity</h3>
                    {person.collaborators.length > 0 && (
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
                      >
                        <div className="flex -space-x-1">
                          {person.collaborators.slice(0, 3).map((c, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-indigo-200 border border-white flex items-center justify-center text-[10px] font-bold text-indigo-700">
                              {c[0]}
                            </div>
                          ))}
                        </div>
                        <span>{person.collaborators.length} collaborator{person.collaborators.length !== 1 ? 's' : ''}</span>
                      </button>
                    )}
                  </div>

                  {activities.length > 0 ? (
                    <div className="divide-y divide-brown-100">
                      {activities.map((item, idx) => (
                        <ActivityFeedItem key={idx} item={item} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-brown-100 flex items-center justify-center mx-auto mb-4">
                        <Icon name="history" className="text-3xl text-brown-400" />
                      </div>
                      <p className="text-brown-500 mb-2">No activity yet</p>
                      <p className="text-sm text-brown-400">Add todos, health records, notes, or finances to see them here</p>
                    </div>
                  )}
                </Card>
              </div>
            );
          })()}

          {activeTab === RecordType.HEALTH && (
            <div className="space-y-8">
              <HealthDashboard personId={person.id} personName={person.name} />
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-stone-800">Health Records</h3>
                  <Button variant="primary" onClick={() => openAddModal(RecordType.HEALTH)}>
                    <Icon name="add" /> Add Record
                  </Button>
                </div>
                {person.health.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-stone-200">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                      <Icon name="monitor_heart" className="text-2xl" />
                    </div>
                    <p className="text-stone-500">No health records yet.</p>
                  </div>
                ) : (
                  person.health.map(record => (
                    <Card
                      key={record.id}
                      className={`p-4 hover:shadow-md transition-shadow cursor-pointer group ${record.sharedFrom ? 'border-l-4 border-l-indigo-400' : ''}`}
                      onClick={() => setEditingHealth(record)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                            <Icon name="medical_services" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-stone-800">{record.title}</h4>
                              {record.sharedFrom && <SharedByBadge sharedFrom={record.sharedFrom} />}
                            </div>
                            <p className="text-sm text-stone-500">{record.date} • {record.type}</p>
                            {record.notes && <p className="mt-2 text-stone-600 text-sm bg-stone-50 p-2 rounded-lg">{record.notes}</p>}
                            {record.attachments && record.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {record.attachments.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100 transition-colors" onClick={e => e.stopPropagation()}>
                                    <Icon name="attachment" className="text-sm" />
                                    <span>Attachment {i + 1}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon name="chevron_right" className="text-stone-300 group-hover:text-stone-500" />
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === RecordType.TODO && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brown-800">Todos & Tasks</h3>
                <Button variant="primary" onClick={() => openAddModal(RecordType.TODO)}>
                  <Icon name="add" /> Add Task
                </Button>
              </div>
              {person.todos.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-brown-200">
                  <p className="text-brown-500">No tasks yet.</p>
                </div>
              ) : (
                person.todos.map(todo => (
                  <div
                    key={todo.id}
                    className={`flex items-center gap-4 p-4 bg-white rounded-2xl border transition-all ${todo.isCompleted ? 'border-brown-100 opacity-60' : 'border-brown-200 shadow-sm'} ${todo.sharedFrom ? 'border-l-4 border-l-indigo-400' : ''}`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleTodo(todo.id, !todo.isCompleted); }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${todo.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-brown-300 hover:border-green-500'
                        }`}
                    >
                      {todo.isCompleted && <Icon name="check" className="text-sm" />}
                    </button>
                    <div className="flex-1 cursor-pointer" onClick={() => setEditingTodo(todo)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} />
                        <h4 className={`font-medium ${todo.isCompleted ? 'line-through text-brown-400' : 'text-brown-800'}`}>
                          {todo.title}
                        </h4>
                        {todo.sharedFrom && <SharedByBadge sharedFrom={todo.sharedFrom} />}
                      </div>
                      {todo.description && (
                        <p className="text-xs text-brown-500 mt-1 line-clamp-1">{todo.description}</p>
                      )}
                      <p className="text-xs text-brown-400 mt-1">Due {todo.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingTodo(todo)} className="text-brown-400 hover:text-brown-600 p-1.5">
                        <Icon name="edit" className="text-lg" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === RecordType.NOTE && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brown-800">Notes & Memories</h3>
                <Button variant="primary" onClick={() => openAddModal(RecordType.NOTE)}>
                  <Icon name="add" /> Add Note
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {person.notes.map(note => (
                  <Card
                    key={note.id}
                    className={`p-4 bg-yellow-50 border-yellow-100 hover:shadow-md transition-shadow cursor-pointer ${note.sharedFrom ? 'border-l-4 border-l-indigo-400' : ''}`}
                    onClick={() => setEditingNote(note)}
                  >
                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                      <h4 className="font-bold text-brown-800">{note.title}</h4>
                      {note.sharedFrom && <SharedByBadge sharedFrom={note.sharedFrom} />}
                    </div>
                    <p className="text-brown-600 text-sm whitespace-pre-wrap line-clamp-4">{note.content}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === RecordType.FINANCE && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brown-800">Financial Records</h3>
                <Button variant="primary" onClick={() => openAddModal(RecordType.FINANCE)}>
                  <Icon name="add" /> Add Record
                </Button>
              </div>
              {person.financial && person.financial.length > 0 ? (
                person.financial.map(record => (
                  <Card
                    key={record.id}
                    className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${record.sharedFrom ? 'border-l-4 border-l-indigo-400' : ''}`}
                    onClick={() => setEditingFinance(record)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${record.type === 'EXPENSE' ? 'bg-red-100 text-red-600' :
                          record.type === 'GIFT' ? 'bg-purple-100 text-purple-600' :
                            record.type === 'OWED' ? 'bg-green-100 text-green-600' :
                              'bg-blue-100 text-blue-600'
                          }`}>
                          <Icon name={
                            record.type === 'EXPENSE' ? 'receipt_long' :
                              record.type === 'GIFT' ? 'card_giftcard' :
                                record.type === 'OWED' ? 'arrow_downward' :
                                  'arrow_upward'
                          } />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-brown-800">{record.title}</h4>
                            {record.sharedFrom && <SharedByBadge sharedFrom={record.sharedFrom} />}
                          </div>
                          <p className="text-xs text-brown-500">{record.date} • {record.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${record.type === 'EXPENSE' || record.type === 'LENT' ? 'text-red-500' : 'text-green-500'
                          }`}>
                          {record.type === 'EXPENSE' || record.type === 'LENT' ? '-' : '+'}
                          ${record.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-brown-200">
                  <p className="text-brown-500">No financial records yet.</p>
                </div>
              )}
            </div>
          )}

        {/* Modals */}
        <ShareSettingsModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          person={person}
          onUpdatePerson={onUpdatePerson}
          onSendCollaborationRequest={onSendCollaborationRequest}
          onGenerateInviteLink={onGenerateInviteLink}
          onRemoveCollaborator={onRemoveCollaborator}
        />

        <AddItemModal
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          type={activeTab}
          person={person}
          currentUser={currentUser}
          onAddTodo={onAddTodo}
          onAddHealth={onAddHealth}
          onAddNote={onAddNote}
          onAddFinance={onAddFinance}
        />

        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          person={person}
          onUpdate={onUpdatePerson}
          onDelete={handleDeletePerson}
          onLinkToUser={onLinkToUser}
        />

        {/* Edit Modals */}
        {editingTodo && (
          <EditTodoModal
            isOpen={true}
            onClose={() => setEditingTodo(null)}
            todo={editingTodo}
            person={person}
            onUpdate={(updates) => onUpdateTodo(editingTodo.id, updates)}
            onDelete={() => onDeleteTodo(editingTodo.id)}
          />
        )}

        {editingHealth && (
          <EditHealthModal
            isOpen={true}
            onClose={() => setEditingHealth(null)}
            record={editingHealth}
            person={person}
            onUpdate={(updates) => onUpdateHealth(editingHealth.id, updates)}
            onDelete={() => onDeleteHealth(editingHealth.id)}
          />
        )}

        {editingNote && (
          <EditNoteModal
            isOpen={true}
            onClose={() => setEditingNote(null)}
            note={editingNote}
            person={person}
            onUpdate={(updates) => onUpdateNote(editingNote.id, updates)}
            onDelete={() => onDeleteNote(editingNote.id)}
          />
        )}

        {editingFinance && (
          <EditFinanceModal
            isOpen={true}
            onClose={() => setEditingFinance(null)}
            record={editingFinance}
            person={person}
            onUpdate={(updates) => onUpdateFinance(editingFinance.id, updates)}
            onDelete={() => onDeleteFinance(editingFinance.id)}
          />
        )}
      </div>
    </div>
  );
};

// --- Sub-components for Modals ---

const ShareSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  onUpdatePerson: (p: Person) => void;
  onSendCollaborationRequest?: (personId: string, targetUserId?: string, targetEmail?: string) => Promise<string | void>;
  onGenerateInviteLink?: (personId: string) => Promise<string>;
  onRemoveCollaborator?: (personId: string, collaboratorUserId: string) => Promise<void>;
}> = ({ isOpen, onClose, person, onUpdatePerson, onSendCollaborationRequest, onGenerateInviteLink, onRemoveCollaborator }) => {
  const [activeTab, setActiveTab] = useState<'link' | 'existing' | 'email'>('link');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [profileEmail, setProfileEmail] = useState(person.email || '');
  const [collaboratorDetails, setCollaboratorDetails] = useState<Array<{id: string; name: string; email?: string; userId?: string}>>([]);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);

  // Fetch user's own profiles and collaborator details
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const { supabase } = await import('../src/lib/supabase');
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // 1. Fetch collaborator details (from person_shares)
          const { data: sharesData, error: sharesError } = await supabase
            .from('person_shares')
            .select('id, user_id, user_email, profiles(id, full_name, email)')
            .eq('person_id', person.id)
            .not('user_id', 'is', null);

          // 2. Fetch linked profiles (from profile_links)
          const { data: linksData, error: linksError } = await supabase
            .from('profile_links')
            .select('id, user_a_id, user_b_id, profile_a_id, profile_b_id, profiles!user_a_id(id, full_name, email), profiles_b:profiles!user_b_id(id, full_name, email)')
            .or(`profile_a_id.eq.${person.id},profile_b_id.eq.${person.id}`)
            .eq('is_active', true);

          let allCollaborators: Array<{id: string; name: string; email?: string; userId?: string}> = [];

          if (!sharesError && sharesData) {
            allCollaborators = sharesData.map(s => ({
              id: s.id,
              name: (s.profiles as any)?.full_name || s.user_email || 'Unknown',
              email: (s.profiles as any)?.email || s.user_email,
              userId: s.user_id || undefined
            }));
          }

          if (!linksError && linksData) {
            linksData.forEach(link => {
              // The collaborator is whoever is NOT the person being viewed
              const otherUser = link.profile_a_id === person.id ? (link as any).profiles_b : (link as any).profiles;
              if (otherUser && !allCollaborators.some(c => c.userId === otherUser.id)) {
                allCollaborators.push({
                  id: link.id,
                  name: otherUser.full_name || 'Unknown',
                  email: otherUser.email,
                  userId: otherUser.id
                });
              }
            });
          }

          // 3. Fetch collaboration requests (to filter dropdown)
          const { data: requestsData, error: requestsError } = await supabase
            .from('collaboration_requests')
            .select('target_user_id, target_email, status')
            .eq('person_id', person.id);
          const safeRequestsData = requestsError ? [] : (requestsData || []);

          setCollaboratorDetails(allCollaborators);

          // 4. Fetch other profiles (to invite)
          const { data: profilesData, error: profilesError } = await supabase
            .from('people')
            .select('*')
            .eq('created_by', user.id)
            .neq('id', person.id)
            .order('name');

          if (!profilesError && profilesData) {
            const filteredProfiles = profilesData.filter(p => {
              // Filter out if already a collaborator
              const isCollab = allCollaborators.some(c => c.userId === p.linked_user_id || (c.email && c.email === p.email));
              if (isCollab) return false;

              // Filter out if there's an existing request (pending or accepted)
              const hasRequest = safeRequestsData.some(req => 
                (req.target_user_id && req.target_user_id === p.linked_user_id) || 
                (req.target_email && req.target_email === p.email)
              );
              return !hasRequest;
            });
            
            setAvailableProfiles(filteredProfiles.map(p => ({
              id: p.id,
              name: p.name,
              relation: p.relation || '',
              avatarUrl: p.avatar_url || generateAvatarUrl(p.name),
              themeColor: p.theme_color || 'bg-brown-100',
              birthday: p.birthday || '',
              email: p.email || undefined,
              linkedUserId: p.linked_user_id || undefined,
              collaborators: [],
              sharingPreference: (p.sharing_preference as any) || 'ASK_EVERY_TIME',
              health: [],
              todos: [],
              financial: [],
              notes: []
            })));
          }
        } catch (err) {
          console.error('Error fetching data:', err);
        }
      };
      fetchData();
      setProfileEmail(person.email || '');
    }
  }, [isOpen, person.id, person.email]);

  const handleTogglePref = (val: boolean) => {
    onUpdatePerson({
      ...person,
      sharingPreference: val ? 'ALWAYS_SHARE' : 'ASK_EVERY_TIME'
    });
  };

  // Check if profile has email before allowing sharing
  const checkEmailAndProceed = async (action: () => Promise<void>) => {
    if (!person.email && !profileEmail) {
      setShowEmailPrompt(true);
      return;
    }
    
    // If email was just added, save it first (await to ensure persistence)
    if (profileEmail && profileEmail !== person.email) {
      await onUpdatePerson({
        ...person,
        email: profileEmail
      });
    }
    
    await action();
  };

  const handleSaveEmailAndContinue = async () => {
    if (!profileEmail) {
      alert('Please enter an email address');
      return;
    }
    
    onUpdatePerson({
      ...person,
      email: profileEmail
    });
    setShowEmailPrompt(false);
  };

  const handleGenerateLink = async () => {
    if (!onGenerateInviteLink) return;
    
    await checkEmailAndProceed(async () => {
      setIsLoading(true);
      try {
        const link = await onGenerateInviteLink(person.id);
        setShareLink(link);
        setLinkCopied(false);
      } catch (err: any) {
        console.error('Error generating link:', err);
        if (err.message?.includes('email')) {
          setShowEmailPrompt(true);
        } else {
          alert('Failed to generate invite link. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInviteExistingProfile = async () => {
    if (!selectedProfileId || !onSendCollaborationRequest) return;
    const selectedProfile = availableProfiles.find(p => p.id === selectedProfileId);
    if (!selectedProfile) return;

    await checkEmailAndProceed(async () => {
      setIsLoading(true);
      try {
        if (selectedProfile.linkedUserId) {
          await onSendCollaborationRequest(person.id, selectedProfile.linkedUserId);
          alert('Collaboration request sent! They will see it in their collaboration requests.');
        } else if (selectedProfile.email) {
          await onSendCollaborationRequest(person.id, undefined, selectedProfile.email);
          alert('Collaboration request created! They will see it when they sign up with this email.');
        } else {
          alert('This profile needs an email address to receive collaboration requests.');
          return;
        }
        setSelectedProfileId('');
      } catch (err: any) {
        console.error('Error sending collaboration request:', err);
        if (err.message?.includes('email')) {
          setShowEmailPrompt(true);
        } else {
          alert('Failed to send collaboration request. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleInviteNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !onSendCollaborationRequest) return;

    await checkEmailAndProceed(async () => {
      setIsLoading(true);
      try {
        await onSendCollaborationRequest(person.id, undefined, newUserEmail);
        setNewUserEmail('');
        alert('Invitation sent! They will see the collaboration request when they sign up.');
      } catch (err: any) {
        console.error('Error sending invitation:', err);
        if (err.message?.includes('email')) {
          setShowEmailPrompt(true);
        } else {
          alert('Failed to send invitation. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleRemoveCollaborator = async (collaboratorId: string, userId: string) => {
    if (!onRemoveCollaborator) return;
    
    setIsLoading(true);
    try {
      await onRemoveCollaborator(person.id, userId);
      setCollaboratorDetails(prev => prev.filter(c => c.id !== collaboratorId));
      setShowRemoveConfirm(null);
    } catch (err) {
      console.error('Error removing collaborator:', err);
      alert('Failed to remove collaborator. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email prompt modal
  if (showEmailPrompt) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowEmailPrompt(false)} title="Email Required">
        <div className="space-y-4">
          <p className="text-brown-600">
            To share this profile, you need to add an email address. This helps collaborators identify and connect with this profile.
          </p>
          <Input 
            label="Email for this profile" 
            type="email" 
            value={profileEmail} 
            onChange={e => setProfileEmail(e.target.value)} 
            placeholder="email@example.com"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowEmailPrompt(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveEmailAndContinue} disabled={!profileEmail}>
              Save & Continue
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Remove confirmation modal
  if (showRemoveConfirm) {
    const collaborator = collaboratorDetails.find(c => c.id === showRemoveConfirm);
    return (
      <Modal isOpen={isOpen} onClose={() => setShowRemoveConfirm(null)} title="Remove Collaborator">
        <div className="space-y-4">
          <p className="text-brown-600">
            Are you sure you want to remove <strong>{collaborator?.name}</strong> as a collaborator?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <strong>Note:</strong> Items that were already shared will remain visible to both of you, but future items will no longer be synced.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowRemoveConfirm(null)}>Cancel</Button>
            <Button 
              variant="danger" 
              onClick={() => collaborator?.userId && handleRemoveCollaborator(showRemoveConfirm, collaborator.userId)}
              disabled={isLoading}
            >
              {isLoading ? 'Removing...' : 'Remove Collaborator'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sharing: ${person.name}`}>
      <div className="space-y-6">
        {/* Profile Email Status */}
        {!person.email && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Icon name="warning" className="text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Email required for sharing</p>
                <p className="text-xs text-amber-600 mt-1">Add an email to this profile to enable collaboration.</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowEmailPrompt(true)}
                  className="mt-2 text-amber-700"
                >
                  Add Email
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Default Preference */}
        <div className="bg-brown-50 p-4 rounded-xl border border-brown-100">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-brown-800">Default Sharing Preference</span>
          </div>
          <p className="text-xs text-brown-500 mb-4">When adding new items, should they be shared by default?</p>
          <Toggle
            checked={person.sharingPreference === 'ALWAYS_SHARE'}
            onChange={handleTogglePref}
            label={person.sharingPreference === 'ALWAYS_SHARE' ? "Always Share New Items" : "Ask Me Every Time"}
          />
        </div>

        {/* Current Collaborators */}
        <div>
          <h4 className="font-bold text-brown-700 mb-3">Current Collaborators</h4>
          <div className="space-y-2">
            {collaboratorDetails.length === 0 && <p className="text-sm text-brown-400 italic">No one else has access yet.</p>}
            {collaboratorDetails.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-white border border-brown-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-medium text-brown-700">{c.name}</span>
                    {c.email && <p className="text-xs text-brown-400">{c.email}</p>}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowRemoveConfirm(c.id)} 
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Methods */}
        <div>
          <h4 className="font-bold text-brown-700 mb-3">Invite Collaborators</h4>
          
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-brown-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'link'
                  ? 'bg-white text-brown-800 shadow-sm'
                  : 'text-brown-500 hover:text-brown-700'
              }`}
            >
              <Icon name="link" className="mr-1" />
              Share Link
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('existing')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'existing'
                  ? 'bg-white text-brown-800 shadow-sm'
                  : 'text-brown-500 hover:text-brown-700'
              }`}
            >
              <Icon name="person" className="mr-1" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'email'
                  ? 'bg-white text-brown-800 shadow-sm'
                  : 'text-brown-500 hover:text-brown-700'
              }`}
            >
              <Icon name="email" className="mr-1" />
              Email
            </button>
          </div>

          {/* Share Link Tab */}
          {activeTab === 'link' && (
            <div className="space-y-3">
              <p className="text-sm text-brown-500">
                Generate a shareable link that anyone can use to collaborate on this profile.
              </p>
              
              {shareLink ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 p-3 bg-brown-50 border border-brown-200 rounded-xl text-sm outline-none"
                    />
                    <Button variant="primary" onClick={handleCopyLink}>
                      <Icon name={linkCopied ? 'check' : 'content_copy'} />
                      {linkCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-xs text-brown-400">
                    Share this link via WhatsApp, SMS, or any messaging app. When they open it, they can join your circle.
                  </p>
                  <Button variant="ghost" onClick={() => setShareLink('')} className="w-full">
                    Generate New Link
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleGenerateLink}
                  disabled={isLoading || !person.email}
                  className="w-full"
                >
                  {isLoading ? 'Generating...' : 'Generate Invite Link'}
                </Button>
              )}
            </div>
          )}

          {/* Existing Profiles Tab */}
          {activeTab === 'existing' && (
            <div className="space-y-3">
              {availableProfiles.length === 0 ? (
                <p className="text-sm text-brown-400 italic">No other profiles available. Create more profiles to invite them.</p>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-brown-500 uppercase mb-1">Select Profile</label>
                    <select
                      value={selectedProfileId}
                      onChange={e => setSelectedProfileId(e.target.value)}
                      className="w-full p-3 bg-brown-50 border border-brown-200 rounded-xl text-sm outline-none focus:border-brown-400 transition-colors"
                    >
                      <option value="">Choose a profile...</option>
                      {availableProfiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name} ({profile.relation}) {profile.email ? `- ${profile.email}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedProfileId && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
                      {(() => {
                        const selected = availableProfiles.find(p => p.id === selectedProfileId);
                        if (!selected?.email && !selected?.linkedUserId) {
                          return <p className="text-amber-700">⚠️ This profile needs an email address to receive collaboration requests.</p>;
                        } else if (selected?.linkedUserId) {
                          return <p className="text-indigo-700">✓ They will receive a collaboration request in their app.</p>;
                        } else {
                          return <p className="text-indigo-700">📧 They will see the collaboration request when they sign up with {selected.email}.</p>;
                        }
                      })()}
                    </div>
                  )}
                  <Button
                    variant="primary"
                    onClick={handleInviteExistingProfile}
                    disabled={!selectedProfileId || isLoading || !person.email}
                    className="w-full"
                  >
                    {isLoading ? 'Sending...' : 'Send Collaboration Request'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <form onSubmit={handleInviteNewUser} className="space-y-3">
              <p className="text-sm text-brown-500">
                Enter their email address. They'll receive a collaboration request when they sign up.
              </p>
              <Input
                placeholder="email@example.com"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                type="email"
              />
              <Button 
                type="submit" 
                variant="primary" 
                disabled={!newUserEmail || isLoading || !person.email} 
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
};

const AddItemModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  type: RecordType | null;
  person: Person;
  currentUser: User | null;
  onAddTodo: (personId: string, title: string, date: string, priority?: string, description?: string, sharedWithCollaboratorIds?: string[]) => void;
  onAddHealth: (personId: string, title: string, date: string, notes: string, type: string, files?: File[], sharedWithCollaboratorIds?: string[]) => void;
  onAddNote: (personId: string, title: string, content: string, sharedWithCollaboratorIds?: string[]) => void;
  onAddFinance: (personId: string, title: string, amount: number, type: string, date: string, sharedWithCollaboratorIds?: string[]) => void;
}> = ({ isOpen, onClose, type, person, currentUser, onAddTodo, onAddHealth, onAddNote, onAddFinance }) => {
  if (!type) return null;

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [financeType, setFinanceType] = useState('EXPENSE');
  const [healthType, setHealthType] = useState('OTHER');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [share, setShare] = useState(person.sharingPreference === 'ALWAYS_SHARE');
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([]);
  const [acceptedCollaborators, setAcceptedCollaborators] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [files, setFiles] = useState<File[]>([]);

  // Fetch accepted collaborators
  useEffect(() => {
    if (isOpen) {
      const fetchCollaborators = async () => {
        try {
          const { supabase } = await import('../src/lib/supabase');
          const { data, error } = await supabase
            .from('person_shares')
            .select('id, user_id, user_email, profiles(full_name, email)')
            .eq('person_id', person.id)
            .not('user_id', 'is', null);

          if (!error && data) {
            const collabs = data.map(share => ({
              id: share.id,
              name: (share.profiles as any)?.full_name || share.user_email || 'Unknown',
              email: (share.profiles as any)?.email || share.user_email
            }));
            setAcceptedCollaborators(collabs);
            
            // Pre-select all collaborators if sharing preference is ALWAYS_SHARE
            if (person.sharingPreference === 'ALWAYS_SHARE') {
              setSelectedCollaboratorIds(collabs.map(c => c.id));
              setShare(true);
            }
          }
        } catch (err) {
          console.error('Error fetching collaborators:', err);
        }
      };
      fetchCollaborators();
    }
  }, [isOpen, person.id, person.sharingPreference]);


  // Reset form on open
  React.useEffect(() => {
    if (isOpen) {
      setTitle('');
      setNotes('');
      setAmount('');
      setFinanceType('EXPENSE');
      setHealthType('OTHER');
      setPriority('MEDIUM');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setShare(person.sharingPreference === 'ALWAYS_SHARE');
      // Selected collaborators will be set by the fetch effect
      if (person.sharingPreference !== 'ALWAYS_SHARE') {
        setSelectedCollaboratorIds([]);
      }
      setFiles([]);
    }
  }, [isOpen, person.sharingPreference]);

  const handleSubmit = () => {
    if (!title) return;

    const collaboratorIds = share ? selectedCollaboratorIds : undefined;

    if (type === RecordType.TODO) {
      onAddTodo(person.id, title, date, priority, description, collaboratorIds);
    } else if (type === RecordType.HEALTH) {
      onAddHealth(person.id, title, date, notes, healthType, files, collaboratorIds);
    } else if (type === RecordType.NOTE) {
      onAddNote(person.id, title, notes, collaboratorIds);
    } else if (type === RecordType.FINANCE) {
      onAddFinance(person.id, title, parseFloat(amount), financeType, date, collaboratorIds);
    }

    onClose();
  };

  const toggleCollaborator = (collabId: string) => {
    setSelectedCollaboratorIds(prev =>
      prev.includes(collabId)
        ? prev.filter(id => id !== collabId)
        : [...prev, collabId]
    );
  };

  const getTitle = () => {
    switch (type) {
      case RecordType.TODO: return "Add New Task";
      case RecordType.HEALTH: return "Add Health Record";
      case RecordType.NOTE: return "Create Note";
      case RecordType.FINANCE: return "Add Expense/Gift";
      default: return "Add Item";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Buy Vitamins" autoFocus />

        {(type === RecordType.TODO || type === RecordType.HEALTH || type === RecordType.FINANCE) && (
          <Input label={type === RecordType.TODO ? "Due Date" : "Date"} type="date" value={date} onChange={e => setDate(e.target.value)} />
        )}

        {type === RecordType.TODO && (
          <>
            <div>
              <label className="block text-xs font-bold text-brown-500 uppercase mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full p-3 bg-brown-50 border border-brown-200 rounded-xl text-sm outline-none focus:border-brown-400 transition-colors"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <TextArea label="Description (Optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add more details..." />
          </>
        )}

        {type === RecordType.FINANCE && (
          <div className="flex gap-2">
            <div className="flex-1">
              <Input label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-brown-500 uppercase mb-1">Type</label>
              <select
                value={financeType}
                onChange={e => setFinanceType(e.target.value)}
                className="w-full p-3 bg-brown-50 border border-brown-200 rounded-xl text-sm outline-none focus:border-brown-400 transition-colors"
              >
                <option value="EXPENSE">Expense</option>
                <option value="GIFT">Gift</option>
                <option value="OWED">Owed</option>
                <option value="LENT">Lent</option>
              </select>
            </div>
          </div>
        )}

        {type === RecordType.HEALTH && (
          <>
            <div>
              <label className="block text-xs font-bold text-brown-500 uppercase mb-1">Type</label>
              <select
                value={healthType}
                onChange={e => setHealthType(e.target.value)}
                className="w-full p-3 bg-brown-50 border border-brown-200 rounded-xl text-sm outline-none focus:border-brown-400 transition-colors"
              >
                <option value="CHECKUP">Checkup</option>
                <option value="MEDICATION">Medication</option>
                <option value="VACCINE">Vaccine</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <TextArea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter details..." />
          </>
        )}

        {type === RecordType.NOTE && (
          <TextArea label="Content" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter details..." />
        )}

        {type === RecordType.HEALTH && (
          <div>
            <label className="block text-xs font-bold text-brown-500 uppercase mb-1.5">Attachments</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {files.map((f, i) => (
                <div key={i} className="bg-brown-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                  <span className="truncate max-w-[150px]">{f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-brown-400 hover:text-brown-600">
                    <Icon name="close" className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-brown-50 border border-brown-200 rounded-lg text-sm text-brown-600 hover:bg-brown-100 transition-colors">
              <Icon name="attach_file" />
              <span>Attach Files</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files) {
                    setFiles([...files, ...Array.from(e.target.files)]);
                  }
                }}
              />
            </label>
          </div>
        )}

        <div className="pt-4 border-t border-brown-100">
          <Toggle
            checked={share}
            onChange={(val) => {
              setShare(val);
              // When toggling ON, select all collaborators by default
              if (val && acceptedCollaborators.length > 0) {
                setSelectedCollaboratorIds(acceptedCollaborators.map(c => c.id));
              }
            }}
            label="Share with Collaborators?"
          />
          {share && acceptedCollaborators.length > 0 && (
            <div className="mt-3 pl-[52px]">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-brown-500 uppercase">Select Collaborators</p>
                <span className="text-xs text-indigo-600">
                  {selectedCollaboratorIds.length} of {acceptedCollaborators.length} selected
                </span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {acceptedCollaborators.map(collab => (
                  <label
                    key={collab.id}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                      selectedCollaboratorIds.includes(collab.id)
                        ? 'bg-indigo-100 border-2 border-indigo-300'
                        : 'bg-brown-50 border border-brown-200 hover:border-indigo-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollaboratorIds.includes(collab.id)}
                      onChange={() => toggleCollaborator(collab.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {collab.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brown-800">{collab.name}</p>
                      {collab.email && <p className="text-xs text-brown-500">{collab.email}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          {share && acceptedCollaborators.length === 0 && (
            <p className="text-xs text-brown-400 mt-2 pl-[52px]">
              No accepted collaborators yet. Add collaborators from the profile sharing settings.
            </p>
          )}
          {!share && (
            <p className="text-xs text-brown-400 mt-2 pl-[52px]">
              Only you will see this.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!title}>Save Item</Button>
        </div>
      </div >
    </Modal >
  );
};
