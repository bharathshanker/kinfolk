
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { Person, User as AppUser, RecordType } from './types';
import { Newsfeed } from './components/Newsfeed';
import { PersonDetail } from './components/PersonDetail';
import { ChatBot } from './components/ChatBot';
import { InvitePage } from './components/InvitePage';
import { Icon, Avatar, Button, Card, Input } from './components/Shared';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { supabase } from './src/lib/supabase';
import { usePeople } from './src/hooks/usePeople';
import { Modal } from './components/Shared';
import { generateAvatarFromEmail } from './src/utils/avatars';

// --- Add Person Modal ---
const AddPersonModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, relation: string, birthday: string, file?: File, email?: string, phone?: string, dateOfBirth?: string, gender?: 'male' | 'female' | 'other') => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [birthday, setBirthday] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other');
  const [file, setFile] = useState<File | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && relation && email) {
      onAdd(name, relation, birthday, file, email, phone, dateOfBirth, gender);
      setName('');
      setRelation('');
      setBirthday('');
      setEmail('');
      setPhone('');
      setDateOfBirth('');
      setGender('other');
      setFile(undefined);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Person">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center mb-4">
          <label className="relative w-24 h-24 rounded-full bg-gradient-to-br from-turmeric-100 to-turmeric-200 flex items-center justify-center cursor-pointer border-3 border-dashed border-turmeric-300 hover:border-turmeric-400 transition-colors overflow-hidden shadow-warm">
            {file ? (
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Icon name="add_a_photo" className="text-turmeric-500 text-2xl" />
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
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mom" autoFocus required />
        <Input label="Relation" value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. Mother" required />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
        <Input label="Phone Number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" required />
        <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
        <div>
          <label className="block text-xs font-bold text-brown-500 uppercase tracking-wider mb-2">Gender</label>
          <select
            value={gender}
            onChange={e => setGender(e.target.value as 'male' | 'female' | 'other')}
            className="w-full px-4 py-3 bg-cream border-2 border-brown-100 rounded-2xl focus:outline-none focus:border-turmeric-400 focus:ring-4 focus:ring-turmeric-100 transition-all text-brown-800"
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Input label="Birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={!name || !relation || !email || !phone || !dateOfBirth}>Add Person</Button>
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
              avatar_url: generateAvatarFromEmail(email),
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-turmeric-200/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-32 right-20 w-40 h-40 bg-plum-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-coral-200/25 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md bg-white rounded-4xl shadow-warm-xl p-8 border border-turmeric-100 text-center animate-fade-in-up relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-turmeric-400 to-coral-400 mb-6 shadow-glow-turmeric animate-float">
          <Icon name="diversity_3" className="text-4xl text-white" />
        </div>
        <h1 className="text-3xl font-bold text-brown-800 mb-2 heading-display">Welcome to Kinfolk</h1>
        <p className="text-brown-500 mb-8">{isSignUp ? 'Create your family circle' : 'Sign in to your circle'}</p>

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

          {error && <div className="p-3 bg-coral-50 text-coral-700 text-sm rounded-2xl border border-coral-200">{error}</div>}

          <Button variant="primary" type="submit" className="w-full justify-center py-3.5 text-lg" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brown-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-brown-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border-2 border-brown-200 rounded-2xl hover:bg-brown-50 hover:border-brown-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-warm hover:shadow-warm-md"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            <span className="font-semibold text-brown-700">Google</span>
          </button>
        </div>

        <div className="mt-8 text-sm text-brown-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 font-bold text-turmeric-600 hover:text-turmeric-700 transition-colors"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

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
    generateInviteLink,
    sendCollaborationRequest,
    fetchPendingCollaborationRequests,
    acceptCollaborationRequest,
    declineCollaborationRequest,
    removeCollaborator
  } = usePeople();
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RecordType>(RecordType.PROFILE);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [pendingCollaborationRequests, setPendingCollaborationRequests] = useState<Array<any>>([]);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // Check for invite token in URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/invite\/([a-zA-Z0-9]+)$/);
    if (match) {
      setInviteToken(match[1]);
    }

    const handlePopState = () => {
      const newPath = window.location.pathname;
      const newMatch = newPath.match(/^\/invite\/([a-zA-Z0-9]+)$/);
      setInviteToken(newMatch ? newMatch[1] : null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const pendingToken = sessionStorage.getItem('pendingInviteToken');
    if (pendingToken && user) {
      sessionStorage.removeItem('pendingInviteToken');
      setInviteToken(pendingToken);
    }
  }, [user]);

  const refreshCollaborationRequests = React.useCallback(async () => {
    if (user && fetchPendingCollaborationRequests) {
      const requests = await fetchPendingCollaborationRequests();
      setPendingCollaborationRequests(requests);
    }
  }, [user, fetchPendingCollaborationRequests]);

  React.useEffect(() => {
    refreshCollaborationRequests();
  }, [refreshCollaborationRequests]);

  const handleAcceptCollaborationRequest = async (requestId: string, mergeIntoPersonId: string | null, createNewProfile: boolean = false) => {
    if (acceptCollaborationRequest) {
      await acceptCollaborationRequest(requestId, mergeIntoPersonId, createNewProfile);
      await refreshCollaborationRequests();
    }
  };

  const handleDeclineCollaborationRequest = async (requestId: string) => {
    if (declineCollaborationRequest) {
      await declineCollaborationRequest(requestId);
      await refreshCollaborationRequests();
    }
  };

  const handleCloseInvite = () => {
    setInviteToken(null);
    window.history.pushState({}, '', '/');
  };

  const handleSelectPerson = (personId: string, tab?: RecordType) => {
    setActivePersonId(personId);
    setActiveTab(tab || RecordType.PROFILE);
  };

  const activePerson = people.find(p => p.id === activePersonId);

  if (authLoading || peopleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-turmeric-400 to-coral-400 flex items-center justify-center shadow-glow-turmeric animate-pulse">
            <Icon name="diversity_3" className="text-3xl text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-turmeric-500"></div>
        </div>
      </div>
    );
  }

  if (inviteToken) {
    return (
      <InvitePage
        token={inviteToken}
        onAccept={handleAcceptCollaborationRequest}
        onClose={handleCloseInvite}
        people={people.map(p => ({ id: p.id, name: p.name, relation: p.relation }))}
        isLoggedIn={!!user}
        onLogin={() => {
          sessionStorage.setItem('pendingInviteToken', inviteToken);
        }}
      />
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const currentUser: AppUser = {
    id: user.id,
    name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatarUrl: user.user_metadata.avatar_url || generateAvatarFromEmail(user.email || ''),
  };

  return (
    <div className="min-h-screen bg-gradient-warm font-sans text-brown-800 selection:bg-turmeric-200">

      {/* Top Mobile Bar */}
      {!activePersonId && (
        <div className="md:hidden p-4 flex justify-between items-center glass sticky top-0 z-10 border-b border-turmeric-100">
          <span className="font-extrabold text-xl tracking-tight text-brown-800 flex items-center gap-2 heading-display">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-turmeric-400 to-coral-400 flex items-center justify-center shadow-warm">
              <Icon name="diversity_3" className="text-white text-lg" />
            </div>
            Kinfolk
          </span>
          <div className="flex gap-2">
            <button onClick={() => signOut()} className="p-1">
              <Avatar src={currentUser.avatarUrl} alt="User" size="w-9 h-9" glowOnHover />
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="flex h-screen overflow-hidden">

        {/* Desktop Sidebar */}
        <nav className="hidden md:flex w-72 flex-col bg-white/80 backdrop-blur-md border-r border-turmeric-100 p-6 h-full z-20">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-turmeric-400 to-coral-400 flex items-center justify-center shadow-warm">
              <Icon name="diversity_3" className="text-white text-xl" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-brown-800 heading-display">Kinfolk</span>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-turmeric-50 to-coral-50 rounded-2xl flex items-center gap-3 border border-turmeric-100 shadow-warm">
            <Avatar src={currentUser.avatarUrl} alt={currentUser.name} glowOnHover />
            <div className="overflow-hidden flex-1">
              <p className="text-xs text-brown-400 font-bold uppercase tracking-wider">Logged in as</p>
              <p className="font-bold text-brown-800 truncate">{currentUser.name}</p>
            </div>
            <button onClick={() => signOut()} className="text-brown-400 hover:text-coral-500 transition-colors p-2 hover:bg-coral-50 rounded-xl">
              <Icon name="logout" className="text-lg" />
            </button>
          </div>

          <div className="space-y-1 flex-1 overflow-y-auto">
            <button
              onClick={() => setActivePersonId(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-semibold ${!activePersonId ? 'bg-gradient-to-r from-turmeric-100 to-coral-100 text-brown-800 shadow-warm' : 'text-brown-500 hover:bg-brown-50'}`}
            >
              <Icon name="dashboard" className={!activePersonId ? 'text-turmeric-600' : ''} />
              Dashboard
            </button>
            <div className="pt-5 pb-2 px-4 text-xs font-bold text-brown-400 uppercase tracking-wider">Your Circle</div>
            {people.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePersonId(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all font-medium ${activePersonId === p.id ? 'bg-gradient-to-r from-turmeric-100 to-coral-100 text-brown-800 shadow-warm' : 'text-brown-500 hover:bg-brown-50'}`}
              >
                <img src={p.avatarUrl} className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-warm" />
                {p.name}
              </button>
            ))}
            <button
              onClick={() => setShowAddPersonModal(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-brown-400 hover:text-turmeric-600 hover:bg-turmeric-50 transition-all font-medium border-2 border-dashed border-brown-200 hover:border-turmeric-300 mt-3"
            >
              <div className="w-7 h-7 rounded-full bg-brown-100 flex items-center justify-center group-hover:bg-turmeric-100">
                <Icon name="add" className="text-sm" />
              </div>
              Add Person
            </button>
          </div>

          <button
            onClick={() => setIsChatOpen(true)}
            className="mt-auto flex items-center justify-center gap-2 bg-gradient-to-r from-plum-500 to-plum-600 text-white p-4 rounded-2xl shadow-warm hover:shadow-glow-plum hover:-translate-y-0.5 transition-all group"
          >
            <Icon name="auto_awesome" className="group-hover:animate-wiggle" />
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
                onGenerateInviteLink={generateInviteLink}
                onRemoveCollaborator={removeCollaborator}
              />
            ) : (
              <Newsfeed
                people={people}
                onSelectPerson={handleSelectPerson}
                onAddPerson={() => setShowAddPersonModal(true)}
                pendingCollaborationRequests={pendingCollaborationRequests}
                onAcceptCollaborationRequest={handleAcceptCollaborationRequest}
                onDeclineCollaborationRequest={handleDeclineCollaborationRequest}
                currentUserName={currentUser.name}
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
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-plum-500 to-plum-600 text-white rounded-2xl shadow-glow-plum flex items-center justify-center z-40 active:scale-95 transition-transform hover:-translate-y-1"
        >
          <Icon name="auto_awesome" className="text-2xl" />
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
