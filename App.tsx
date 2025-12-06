
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Person, User as AppUser, RecordType } from './types';
import { Newsfeed } from './components/Newsfeed';
import { PersonDetail } from './components/PersonDetail';
import { ChatBot } from './components/ChatBot';
import { Icon, Avatar, Button, Card, Input } from './components/Shared';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { supabase } from './src/lib/supabase';
import { usePeople } from './src/hooks/usePeople';
import { Modal } from './components/Shared';

// --- Login Screen ---
// --- Add Person Modal ---
const AddPersonModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, relation: string, birthday: string, file?: File, email?: string) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [birthday, setBirthday] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && relation) {
      onAdd(name, relation, birthday, file, email || undefined);
      setName('');
      setRelation('');
      setBirthday('');
      setEmail('');
      setFile(undefined);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Person">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center mb-4">
          <label className="relative w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center cursor-pointer border-2 border-dashed border-stone-300 hover:border-stone-400 transition-colors overflow-hidden">
            {file ? (
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Icon name="add_a_photo" className="text-stone-400 text-2xl" />
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mom" autoFocus />
        <Input label="Relation" value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. Mother" />
        <Input label="Birthday (Optional)" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
        <Input label="Email (Optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={!name || !relation}>Add Person</Button>
        </div>
      </form>
    </Modal>
  );
};

// --- Login Screen ---
const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-stone-100 text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-100 mb-6 text-rose-500">
          <Icon name="spa" className="text-4xl" />
        </div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Welcome to Kinfolk</h1>
        <p className="text-stone-500 mb-8">{isSignUp ? 'Create your family circle' : 'Sign in to your circle'}</p>

        <form onSubmit={handleAuth} className="space-y-4 text-left">
          {isSignUp && (
            <Input
              label="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="hello@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <div className="p-3 bg-red-50 text-red-500 text-sm rounded-xl">{error}</div>}

          <Button variant="primary" type="submit" className="w-full justify-center py-3 text-lg" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-stone-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            <span className="font-medium text-stone-700">Google</span>
          </button>
        </div>

        <div className="mt-8 text-sm text-stone-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 font-bold text-rose-500 hover:text-rose-600"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
// --- Main App ---
const AppContent: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const {
    people,
    loading: peopleLoading,
    addPerson,
    updatePerson,
    deletePerson,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    addHealthRecord,
    updateHealthRecord,
    deleteHealthRecord,
    addNote,
    updateNote,
    deleteNote,
    addFinanceRecord,
    updateFinanceRecord,
    deleteFinanceRecord,
    uploadAvatar,
    shareRecord,
    unshareRecord,
    linkProfileToUser,
    sendCollaborationRequest,
    fetchPendingCollaborationRequests,
    acceptCollaborationRequest,
    declineCollaborationRequest
  } = usePeople();
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RecordType>(RecordType.PROFILE);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [pendingCollaborationRequests, setPendingCollaborationRequests] = useState<Array<any>>([]);

  // Fetch pending collaboration requests
  const refreshCollaborationRequests = React.useCallback(async () => {
    if (user && fetchPendingCollaborationRequests) {
      const requests = await fetchPendingCollaborationRequests();
      setPendingCollaborationRequests(requests);
    }
  }, [user, fetchPendingCollaborationRequests]);

  React.useEffect(() => {
    refreshCollaborationRequests();
  }, [refreshCollaborationRequests]);

  const handleAcceptCollaborationRequest = async (requestId: string, mergeIntoPersonId: string | null) => {
    if (acceptCollaborationRequest) {
      await acceptCollaborationRequest(requestId, mergeIntoPersonId);
      await refreshCollaborationRequests();
    }
  };

  const handleDeclineCollaborationRequest = async (requestId: string) => {
    if (declineCollaborationRequest) {
      await declineCollaborationRequest(requestId);
      await refreshCollaborationRequests();
    }
  };

  // Handler for selecting a person with optional tab
  const handleSelectPerson = (personId: string, tab?: RecordType) => {
    setActivePersonId(personId);
    setActiveTab(tab || RecordType.PROFILE);
  };

  // Derive the active person object
  const activePerson = people.find(p => p.id === activePersonId);

  if (authLoading || peopleLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-cream"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Map Supabase user to AppUser format for display
  const currentUser: AppUser = {
    id: user.id,
    name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatarUrl: user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
  };

  return (
    <div className="min-h-screen bg-cream font-sans text-stone-800 selection:bg-rose-200">

      {/* Top Mobile Bar */}
      {!activePersonId && (
        <div className="md:hidden p-4 flex justify-between items-center bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-stone-100">
          <span className="font-extrabold text-xl tracking-tight text-stone-800 flex items-center gap-1">
            <Icon name="spa" className="text-rose-400" />
            Kinfolk
          </span>
          <div className="flex gap-2">
            <button onClick={() => signOut()} className="p-2 text-stone-400">
              <Avatar src={currentUser.avatarUrl} alt="User" size="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="flex h-screen overflow-hidden">

        {/* Desktop Sidebar */}
        <nav className="hidden md:flex w-64 flex-col bg-white border-r border-stone-100 p-6 h-full z-20">
          <div className="mb-8 flex items-center gap-2 px-2">
            <Icon name="spa" className="text-rose-400 text-3xl" />
            <span className="font-extrabold text-2xl tracking-tight text-stone-800">Kinfolk</span>
          </div>

          <div className="mb-6 p-3 bg-stone-50 rounded-xl flex items-center gap-3 border border-stone-100">
            <Avatar src={currentUser.avatarUrl} alt={currentUser.name} />
            <div className="overflow-hidden">
              <p className="text-xs text-stone-400 font-bold uppercase">Logged in as</p>
              <p className="font-bold text-stone-800 truncate">{currentUser.name}</p>
            </div>
            <button onClick={() => signOut()} className="ml-auto text-stone-400 hover:text-stone-600">
              <Icon name="logout" className="text-lg" />
            </button>
          </div>

          <div className="space-y-1 flex-1">
            <button
              onClick={() => setActivePersonId(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${!activePersonId ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50'}`}
            >
              <Icon name="dashboard" />
              Dashboard
            </button>
            <div className="pt-4 pb-2 px-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Your Circle</div>
            {people.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePersonId(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all font-medium ${activePersonId === p.id ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50'}`}
              >
                <img src={p.avatarUrl} className="w-6 h-6 rounded-full object-cover" />
                {p.name}
              </button>
            ))}
            <button
              onClick={() => setShowAddPersonModal(true)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-all font-medium border border-dashed border-stone-200 mt-2"
            >
              <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center">
                <Icon name="add" className="text-sm" />
              </div>
              Add Person
            </button>
          </div>

          <button
            onClick={() => setIsChatOpen(true)}
            className="mt-auto flex items-center justify-center gap-2 bg-gradient-to-r from-stone-800 to-stone-700 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all group"
          >
            <Icon name="network_intelligence" className="group-hover:animate-pulse" />
            <span className="font-bold">Ask Kinfolk AI</span>
          </button>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
          <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto">
            {activePerson ? (
              <PersonDetail
                person={activePerson}
                currentUser={currentUser}
                initialTab={activeTab}
                onBack={() => setActivePersonId(null)}
                onUpdatePerson={updatePerson}
                onDeletePerson={deletePerson}
                onAddTodo={addTodo}
                onUpdateTodo={updateTodo}
                onDeleteTodo={deleteTodo}
                onToggleTodo={toggleTodo}
                onAddHealth={addHealthRecord}
                onUpdateHealth={updateHealthRecord}
                onDeleteHealth={deleteHealthRecord}
                onAddNote={addNote}
                onUpdateNote={updateNote}
                onDeleteNote={deleteNote}
                onAddFinance={addFinanceRecord}
                onUpdateFinance={updateFinanceRecord}
                onDeleteFinance={deleteFinanceRecord}
                onUploadAvatar={uploadAvatar}
                onShareRecord={shareRecord}
                onUnshareRecord={unshareRecord}
                onLinkToUser={linkProfileToUser}
                onSendCollaborationRequest={sendCollaborationRequest}
              />
            ) : (
              <Newsfeed
                people={people}
                onSelectPerson={handleSelectPerson}
                onAddPerson={() => setShowAddPersonModal(true)}
                pendingCollaborationRequests={pendingCollaborationRequests}
                onAcceptCollaborationRequest={handleAcceptCollaborationRequest}
                onDeclineCollaborationRequest={handleDeclineCollaborationRequest}
              />
            )}
          </div>
        </main>
      </div>

      {/* Chat Bot Overlay */}
      <ChatBot
        people={people}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onAddTodo={addTodo}
        onAddHealth={addHealthRecord}
        onAddNote={addNote}
        onAddFinance={addFinanceRecord}
      />

      {/* Mobile Floating Action Button for Chat */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-stone-800 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-transform"
        >
          <Icon name="network_intelligence" className="text-2xl" />
        </button>
      )}

      <AddPersonModal
        isOpen={showAddPersonModal}
        onClose={() => setShowAddPersonModal(false)}
        onAdd={addPerson}
      />

      {/* Add Material Symbols Font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </React.StrictMode>
);
