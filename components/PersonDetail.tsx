
import React, { useState, useEffect } from 'react';
import { Person, RecordType, HealthRecord, TodoItem, Note, FinancialRecord, User, SharingPreference } from '../types';
import { Avatar, Button, Card, Icon, Badge, Modal, Toggle, Input, TextArea } from './Shared';
import { ShareButton } from './ShareComponents';

interface PersonDetailProps {
  person: Person;
  currentUser: User | null;
  initialTab?: RecordType;
  onBack: () => void;
  onUpdatePerson: (updatedPerson: Person) => void;
  onDeletePerson: (personId: string) => void;
  onAddTodo: (personId: string, title: string, date: string, priority?: string, description?: string) => void;
  onUpdateTodo: (todoId: string, updates: { title?: string; dueDate?: string; priority?: string; description?: string; isCompleted?: boolean }) => void;
  onDeleteTodo: (todoId: string) => void;
  onToggleTodo: (todoId: string, isCompleted: boolean) => void;
  onAddHealth: (personId: string, title: string, date: string, notes: string, type: string, files?: File[]) => void;
  onUpdateHealth: (recordId: string, updates: { title?: string; date?: string; notes?: string; type?: string }) => void;
  onDeleteHealth: (recordId: string) => void;
  onAddNote: (personId: string, title: string, content: string) => void;
  onUpdateNote: (noteId: string, updates: { title?: string; content?: string }) => void;
  onDeleteNote: (noteId: string) => void;
  onAddFinance: (personId: string, title: string, amount: number, type: string, date: string) => void;
  onUpdateFinance: (recordId: string, updates: { title?: string; amount?: number; type?: string; date?: string }) => void;
  onDeleteFinance: (recordId: string) => void;
  onUploadAvatar: (personId: string, file: File) => Promise<void>;
  // Sharing
  onShareRecord?: (recordType: 'TODO' | 'HEALTH' | 'NOTE' | 'FINANCE', recordId: string, sourcePersonId: string, email: string) => Promise<void>;
  onUnshareRecord?: (shareId: string) => Promise<void>;
}

// --- Edit Profile Modal ---
const EditProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  onUpdate: (updatedPerson: Person) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, person, onUpdate, onDelete }) => {
  const [name, setName] = useState(person.name);
  const [relation, setRelation] = useState(person.relation);
  const [birthday, setBirthday] = useState(person.birthday || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...person,
      name,
      relation,
      birthday
    });
    onClose();
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Person">
        <div className="space-y-4">
          <p className="text-stone-600">Are you sure you want to delete <strong>{person.name}</strong>? This will also delete all their health records, todos, notes, and financial records.</p>
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
        <Input label="Birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
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
  onUpdate: (updates: { title?: string; dueDate?: string; priority?: string; description?: string }) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, todo, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(todo.title);
  const [dueDate, setDueDate] = useState(todo.dueDate);
  const [priority, setPriority] = useState(todo.priority);
  const [description, setDescription] = useState(todo.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ title, dueDate, priority, description });
    onClose();
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Task">
        <div className="space-y-4">
          <p className="text-stone-600">Are you sure you want to delete this task?</p>
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
          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 transition-colors"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <TextArea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add more details..." />
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
  onUpdate: (updates: { title?: string; date?: string; notes?: string; type?: string }) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, record, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(record.title);
  const [date, setDate] = useState(record.date);
  const [notes, setNotes] = useState(record.notes);
  const [type, setType] = useState(record.type);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ title, date, notes, type });
    onClose();
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Health Record">
        <div className="space-y-4">
          <p className="text-stone-600">Are you sure you want to delete this health record?</p>
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
          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as 'CHECKUP' | 'MEDICATION' | 'VACCINE' | 'OTHER')}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 transition-colors"
          >
            <option value="CHECKUP">Checkup</option>
            <option value="MEDICATION">Medication</option>
            <option value="VACCINE">Vaccine</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <TextArea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
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
  onUpdate: (updates: { title?: string; content?: string }) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, note, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ title, content });
    onClose();
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Note">
        <div className="space-y-4">
          <p className="text-stone-600">Are you sure you want to delete this note?</p>
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
  onUpdate: (updates: { title?: string; amount?: number; type?: string; date?: string }) => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, record, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(record.title);
  const [amount, setAmount] = useState(record.amount.toString());
  const [type, setType] = useState(record.type);
  const [date, setDate] = useState(record.date);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ title, amount: parseFloat(amount), type, date });
    onClose();
  };

  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Delete Financial Record">
        <div className="space-y-4">
          <p className="text-stone-600">Are you sure you want to delete this financial record?</p>
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
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 transition-colors"
            >
              <option value="EXPENSE">Expense</option>
              <option value="GIFT">Gift</option>
              <option value="OWED">Owed</option>
              <option value="LENT">Lent</option>
            </select>
          </div>
        </div>
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
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
  onUnshareRecord
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
    { id: RecordType.PROFILE, label: 'Profile', icon: 'face' },
    { id: RecordType.HEALTH, label: 'Health', icon: 'monitor_heart' },
    { id: RecordType.TODO, label: 'Todos', icon: 'check_circle' },
    { id: RecordType.FINANCE, label: 'Finance', icon: 'account_balance_wallet' },
    { id: RecordType.NOTE, label: 'Notes', icon: 'edit_note' },
  ];

  const renderShareToggle = (isShared: boolean) => (
    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${isShared ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-stone-50 text-stone-400 border-stone-100'}`}>
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
      default: return 'bg-stone-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-cream/95 backdrop-blur-md z-10 pt-4 pb-2 mb-4 border-b border-stone-100">
        <button onClick={onBack} className="flex items-center text-stone-500 hover:text-stone-800 mb-4 text-sm font-semibold">
          <Icon name="arrow_back" className="text-lg mr-1" /> Back to Dashboard
        </button>

        <div className="flex items-center gap-6 mb-8">
          <div className="relative group">
            <Avatar
              src={person.avatarUrl}
              alt={person.name}
              size="w-32 h-32"
              className={`border-4 border-white shadow-lg ${isUploading ? 'opacity-50' : ''}`}
            />
            {isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800"></div>
              </div>
            ) : (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
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
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-stone-800">{person.name}</h1>
              <button onClick={() => setShowEditProfileModal(true)} className="text-stone-400 hover:text-stone-600">
                <Icon name="edit" className="text-xl" />
              </button>
            </div>
            <p className="text-stone-500 text-lg">{person.relation}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                ? 'bg-stone-800 text-white shadow-md'
                : 'bg-white text-stone-600 hover:bg-stone-100'
                }`}
            >
              <Icon name={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="mt-8">
          {activeTab === RecordType.PROFILE && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Basic Info</h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-stone-100">
                    <span className="text-stone-500">Relation</span>
                    <span className="font-medium text-stone-800">{person.relation}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-stone-100">
                    <span className="text-stone-500">Birthday</span>
                    <span className="font-medium text-stone-800">{person.birthday || 'Not set'}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-indigo-50 border-indigo-100">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Shared With</h3>
                  <button onClick={() => setShowShareModal(true)} className="text-indigo-600 text-sm font-medium hover:underline">
                    Manage
                  </button>
                </div>

                <div className="flex -space-x-2 mb-4">
                  {person.collaborators.length > 0 ? (
                    person.collaborators.map((c, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-indigo-200 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-700" title={c}>
                        {c[0]}
                      </div>
                    ))
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-indigo-300 flex items-center justify-center text-indigo-400">
                      <Icon name="add" className="text-sm" />
                    </div>
                  )}
                </div>

                <p className="text-sm text-indigo-800 mb-4">
                  {person.collaborators.length > 0
                    ? `Shared with ${person.collaborators.length} others.`
                    : 'This profile is private to you.'}
                </p>

                <div className="flex items-center gap-2 text-indigo-600 text-sm">
                  <Icon name={person.sharingPreference === 'ALWAYS_SHARE' ? 'visibility' : 'visibility_off'} />
                  <span>
                    {person.sharingPreference === 'ALWAYS_SHARE'
                      ? 'Always share updates'
                      : 'Ask before sharing is ON'}
                  </span>
                </div>
              </Card>
            </div>
          )}

          {activeTab === RecordType.HEALTH && (
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
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => setEditingHealth(record)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                          <Icon name="medical_services" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-800">{record.title}</h4>
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
                        {onShareRecord && onUnshareRecord && (
                          <ShareButton
                            recordType={RecordType.HEALTH}
                            recordId={record.id}
                            personId={person.id}
                            shares={record.shares}
                            collaborators={person.collaborators}
                            onShare={(type, id, email) => onShareRecord('HEALTH', id, person.id, email)}
                            onUnshare={onUnshareRecord}
                          />
                        )}
                        <Icon name="chevron_right" className="text-stone-300 group-hover:text-stone-500" />
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === RecordType.TODO && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-stone-800">Todos & Tasks</h3>
                <Button variant="primary" onClick={() => openAddModal(RecordType.TODO)}>
                  <Icon name="add" /> Add Task
                </Button>
              </div>
              {person.todos.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-stone-200">
                  <p className="text-stone-500">No tasks yet.</p>
                </div>
              ) : (
                person.todos.map(todo => (
                  <div
                    key={todo.id}
                    className={`flex items-center gap-4 p-4 bg-white rounded-2xl border transition-all ${todo.isCompleted ? 'border-stone-100 opacity-60' : 'border-stone-200 shadow-sm'
                      }`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleTodo(todo.id, !todo.isCompleted); }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${todo.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-stone-300 hover:border-green-500'
                        }`}
                    >
                      {todo.isCompleted && <Icon name="check" className="text-sm" />}
                    </button>
                    <div className="flex-1 cursor-pointer" onClick={() => setEditingTodo(todo)}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} />
                        <h4 className={`font-medium ${todo.isCompleted ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                          {todo.title}
                        </h4>
                      </div>
                      {todo.description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-1">{todo.description}</p>
                      )}
                      <p className="text-xs text-stone-400 mt-1">Due {todo.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {onShareRecord && onUnshareRecord && (
                        <ShareButton
                          recordType={RecordType.TODO}
                          recordId={todo.id}
                          personId={person.id}
                          shares={todo.shares}
                          collaborators={person.collaborators}
                          onShare={(type, id, email) => onShareRecord('TODO', id, person.id, email)}
                          onUnshare={onUnshareRecord}
                        />
                      )}
                      <button onClick={() => setEditingTodo(todo)} className="text-stone-400 hover:text-stone-600 p-1.5">
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
                <h3 className="font-bold text-stone-800">Notes & Memories</h3>
                <Button variant="primary" onClick={() => openAddModal(RecordType.NOTE)}>
                  <Icon name="add" /> Add Note
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {person.notes.map(note => (
                  <Card
                    key={note.id}
                    className="p-4 bg-yellow-50 border-yellow-100 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setEditingNote(note)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-stone-800">{note.title}</h4>
                      {onShareRecord && onUnshareRecord && (
                        <ShareButton
                          recordType={RecordType.NOTE}
                          recordId={note.id}
                          personId={person.id}
                          shares={note.shares}
                          collaborators={person.collaborators}
                          onShare={(type, id, email) => onShareRecord('NOTE', id, person.id, email)}
                          onUnshare={onUnshareRecord}
                        />
                      )}
                    </div>
                    <p className="text-stone-600 text-sm whitespace-pre-wrap line-clamp-4">{note.content}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === RecordType.FINANCE && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-stone-800">Financial Records</h3>
                <Button variant="primary" onClick={() => openAddModal(RecordType.FINANCE)}>
                  <Icon name="add" /> Add Record
                </Button>
              </div>
              {person.financial && person.financial.length > 0 ? (
                person.financial.map(record => (
                  <Card
                    key={record.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
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
                          <h4 className="font-bold text-stone-800">{record.title}</h4>
                          <p className="text-xs text-stone-500">{record.date} • {record.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${record.type === 'EXPENSE' || record.type === 'LENT' ? 'text-red-500' : 'text-green-500'
                          }`}>
                          {record.type === 'EXPENSE' || record.type === 'LENT' ? '-' : '+'}
                          ${record.amount.toFixed(2)}
                        </span>
                        {onShareRecord && onUnshareRecord && (
                          <ShareButton
                            recordType={RecordType.FINANCE}
                            recordId={record.id}
                            personId={person.id}
                            shares={record.shares}
                            collaborators={person.collaborators}
                            onShare={(type, id, email) => onShareRecord('FINANCE', id, person.id, email)}
                            onUnshare={onUnshareRecord}
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-stone-200">
                  <p className="text-stone-500">No financial records yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <ShareSettingsModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          person={person}
          onUpdatePerson={onUpdatePerson}
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
        />

        {/* Edit Modals */}
        {editingTodo && (
          <EditTodoModal
            isOpen={true}
            onClose={() => setEditingTodo(null)}
            todo={editingTodo}
            onUpdate={(updates) => onUpdateTodo(editingTodo.id, updates)}
            onDelete={() => onDeleteTodo(editingTodo.id)}
          />
        )}

        {editingHealth && (
          <EditHealthModal
            isOpen={true}
            onClose={() => setEditingHealth(null)}
            record={editingHealth}
            onUpdate={(updates) => onUpdateHealth(editingHealth.id, updates)}
            onDelete={() => onDeleteHealth(editingHealth.id)}
          />
        )}

        {editingNote && (
          <EditNoteModal
            isOpen={true}
            onClose={() => setEditingNote(null)}
            note={editingNote}
            onUpdate={(updates) => onUpdateNote(editingNote.id, updates)}
            onDelete={() => onDeleteNote(editingNote.id)}
          />
        )}

        {editingFinance && (
          <EditFinanceModal
            isOpen={true}
            onClose={() => setEditingFinance(null)}
            record={editingFinance}
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
}> = ({ isOpen, onClose, person, onUpdatePerson }) => {
  const [email, setEmail] = useState('');

  const handleTogglePref = (val: boolean) => {
    onUpdatePerson({
      ...person,
      sharingPreference: val ? 'ALWAYS_SHARE' : 'ASK_EVERY_TIME'
    });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Mock invitation
    const newName = email.split('@')[0];
    onUpdatePerson({
      ...person,
      collaborators: [...person.collaborators, newName]
    });
    setEmail('');
  };

  const removeCollaborator = (name: string) => {
    onUpdatePerson({
      ...person,
      collaborators: person.collaborators.filter(c => c !== name)
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sharing: ${person.name}`}>
      <div className="space-y-6">
        {/* Default Preference */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-stone-800">Default Sharing Preference</span>
          </div>
          <p className="text-xs text-stone-500 mb-4">When adding new items, should they be shared by default?</p>
          <Toggle
            checked={person.sharingPreference === 'ALWAYS_SHARE'}
            onChange={handleTogglePref}
            label={person.sharingPreference === 'ALWAYS_SHARE' ? "Always Share New Items" : "Ask Me Every Time"}
          />
        </div>

        {/* Collaborators List */}
        <div>
          <h4 className="font-bold text-stone-700 mb-3">Current Collaborators</h4>
          <div className="space-y-2">
            {person.collaborators.length === 0 && <p className="text-sm text-stone-400 italic">No one else has access yet.</p>}
            {person.collaborators.map(c => (
              <div key={c} className="flex justify-between items-center p-3 bg-white border border-stone-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">{c.charAt(0)}</div>
                  <span className="font-medium text-stone-700">{c}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeCollaborator(c)} className="text-red-400 hover:text-red-600 hover:bg-red-50">Remove</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Form */}
        <div>
          <h4 className="font-bold text-stone-700 mb-3">Invite Family Member</h4>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              placeholder="email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
            />
            <Button type="submit" variant="primary" disabled={!email}>Invite</Button>
          </form>
          <p className="text-xs text-stone-400 mt-2">They will receive an email to join your circle.</p>
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
  onAddTodo: (personId: string, title: string, date: string, priority?: string, description?: string) => void;
  onAddHealth: (personId: string, title: string, date: string, notes: string, type: string, files?: File[]) => void;
  onAddNote: (personId: string, title: string, content: string) => void;
  onAddFinance: (personId: string, title: string, amount: number, type: string, date: string) => void;
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
  const [files, setFiles] = useState<File[]>([]);


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
      setFiles([]);
    }
  }, [isOpen, person.sharingPreference]);

  const handleSubmit = () => {
    if (!title) return;

    if (type === RecordType.TODO) {
      onAddTodo(person.id, title, date, priority, description);
    } else if (type === RecordType.HEALTH) {
      onAddHealth(person.id, title, date, notes, healthType, files);
    } else if (type === RecordType.NOTE) {
      onAddNote(person.id, title, notes);
    } else if (type === RecordType.FINANCE) {
      onAddFinance(person.id, title, parseFloat(amount), financeType, date);
    }

    onClose();
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
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 transition-colors"
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
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Type</label>
              <select
                value={financeType}
                onChange={e => setFinanceType(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 transition-colors"
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
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Type</label>
              <select
                value={healthType}
                onChange={e => setHealthType(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 transition-colors"
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
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5">Attachments</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {files.map((f, i) => (
                <div key={i} className="bg-stone-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                  <span className="truncate max-w-[150px]">{f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-stone-400 hover:text-stone-600">
                    <Icon name="close" className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-100 transition-colors">
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

        <div className="pt-4 border-t border-stone-100">
          <Toggle
            checked={share}
            onChange={setShare}
            label={`Share with ${person.collaborators.length > 0 ? person.collaborators.join(' & ') : 'Collaborators'}?`}
          />
          <p className="text-xs text-stone-400 mt-2 pl-[52px]">
            {share ? 'Everyone in the circle will see this.' : 'Only you will see this.'}
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!title}>Save Item</Button>
        </div>
      </div >
    </Modal >
  );
};
