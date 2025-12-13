import React, { useState, useEffect } from 'react';
import { ProfileSnapshot } from '../types';
import { Icon, Button, Modal, Input } from './Shared';
import { supabase } from '../src/lib/supabase';

interface InvitePageProps {
  token: string;
  onAccept: (requestId: string, mergeIntoPersonId: string | null, createNew?: boolean) => Promise<void>;
  onClose: () => void;
  people: Array<{ id: string; name: string; relation: string }>;
  isLoggedIn: boolean;
  onLogin: () => void;
}

interface InviteDetails {
  id: string;
  personId: string;
  personName: string;
  personAvatarUrl?: string;
  personRelation?: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterAvatarUrl?: string;
  profileSnapshot?: ProfileSnapshot;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export const InvitePage: React.FC<InvitePageProps> = ({
  token,
  onAccept,
  onClose,
  people,
  isLoggedIn,
  onLogin
}) => {
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('collaboration_requests')
          .select(`
            *,
            person:people!person_id(name, avatar_url, relation),
            requester:profiles!requester_id(full_name, email, avatar_url)
          `)
          .eq('invite_token', token)
          .single();

        if (error) {
          setError('This invite link is invalid or has expired.');
          return;
        }

        if (data.status !== 'PENDING') {
          setError('This collaboration request has already been ' + data.status.toLowerCase() + '.');
          return;
        }

        setInviteDetails({
          id: data.id,
          personId: data.person_id,
          personName: (data.person as any)?.name || data.profile_snapshot?.name || 'Unknown',
          personAvatarUrl: (data.person as any)?.avatar_url || data.profile_snapshot?.avatarUrl,
          personRelation: (data.person as any)?.relation || data.profile_snapshot?.relation,
          requesterId: data.requester_id,
          requesterName: (data.requester as any)?.full_name || 'Unknown',
          requesterEmail: (data.requester as any)?.email || '',
          requesterAvatarUrl: (data.requester as any)?.avatar_url,
          profileSnapshot: data.profile_snapshot,
          status: data.status
        });
      } catch (err: any) {
        console.error('Error fetching invite:', err);
        setError('Failed to load invite details.');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  const handleAcceptWithNewProfile = async () => {
    if (!inviteDetails) return;
    
    setIsAccepting(true);
    try {
      await onAccept(inviteDetails.id, null, true);
      onClose();
    } catch (err) {
      console.error('Error accepting invite:', err);
      alert('Failed to accept invite. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleMergeAndAccept = async () => {
    if (!inviteDetails || !selectedPersonId) return;
    
    setIsAccepting(true);
    try {
      await onAccept(inviteDetails.id, selectedPersonId, false);
      onClose();
    } catch (err) {
      console.error('Error accepting invite:', err);
      alert('Failed to accept invite. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-stone-500">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Icon name="error" className="text-3xl text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">Invite Not Found</h2>
          <p className="text-stone-500 mb-6">{error}</p>
          <Button variant="primary" onClick={onClose}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!inviteDetails) return null;

  const avatarUrl = inviteDetails.personAvatarUrl || 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${inviteDetails.personName}`;

  // Not logged in - show preview and login prompt
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
              <Icon name="group_add" className="text-3xl text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Collaboration Invite</h1>
          </div>

          {/* Requester Info */}
          <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              {inviteDetails.requesterName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-stone-800">{inviteDetails.requesterName}</p>
              <p className="text-xs text-stone-500">invited you to collaborate</p>
            </div>
          </div>

          {/* Profile Preview */}
          <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 mb-6">
            <div className="flex items-center gap-4">
              <img 
                src={avatarUrl} 
                alt={inviteDetails.personName}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div>
                <h3 className="text-xl font-bold text-stone-800">{inviteDetails.personName}</h3>
                {inviteDetails.personRelation && (
                  <p className="text-stone-500">{inviteDetails.personRelation}</p>
                )}
                {inviteDetails.profileSnapshot?.birthday && (
                  <p className="text-xs text-stone-400 mt-1">
                    <Icon name="cake" className="text-xs mr-1" />
                    {new Date(inviteDetails.profileSnapshot.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Login Prompt */}
          <div className="text-center">
            <p className="text-stone-500 mb-4">Sign in or create an account to accept this invitation.</p>
            <Button variant="primary" onClick={onLogin} className="w-full">
              Sign In to Accept
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - show accept options
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <Icon name="group_add" className="text-3xl text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">Accept Collaboration</h1>
        </div>

        {/* Requester Info */}
        <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            {inviteDetails.requesterName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-stone-800">{inviteDetails.requesterName}</p>
            <p className="text-xs text-stone-500">{inviteDetails.requesterEmail}</p>
          </div>
        </div>

        {/* Profile Preview */}
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={avatarUrl} 
              alt={inviteDetails.personName}
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
            />
            <div>
              <h3 className="text-xl font-bold text-stone-800">{inviteDetails.personName}</h3>
              {inviteDetails.personRelation && (
                <p className="text-stone-500">{inviteDetails.personRelation}</p>
              )}
            </div>
          </div>
        </div>

        {showMergeConfirm && selectedPersonId ? (
          // Merge Confirmation
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
            <div className="flex items-start gap-3 mb-4">
              <Icon name="info" className="text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Confirm Merge</p>
                <p className="text-xs text-amber-700 mt-1">
                  You are about to link <strong>{inviteDetails.personName}</strong> with your profile <strong>{people.find(p => p.id === selectedPersonId)?.name}</strong>.
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  Items shared by either of you will be visible to both. This creates a bidirectional collaboration.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowMergeConfirm(false)}
                disabled={isAccepting}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleMergeAndAccept}
                disabled={isAccepting}
                className="flex-1"
              >
                {isAccepting ? 'Merging...' : 'Confirm & Merge'}
              </Button>
            </div>
          </div>
        ) : (
          // Action Options
          <div className="space-y-4">
            {/* Option 1: Create New Profile */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Icon name="person_add" className="text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-800">Create as New Profile</p>
                  <p className="text-xs text-stone-500 mt-1">
                    Add this person to your circle as a new profile.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAcceptWithNewProfile}
                    disabled={isAccepting}
                    className="mt-3"
                  >
                    {isAccepting ? 'Creating...' : 'Create New Profile'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Option 2: Merge with Existing */}
            {people.length > 0 && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                    <Icon name="merge" className="text-stone-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">Merge with Existing Profile</p>
                    <p className="text-xs text-stone-500 mt-1">
                      If you already have a profile for this person, link them together.
                    </p>
                    <div className="mt-3">
                      <select
                        value={selectedPersonId || ''}
                        onChange={e => setSelectedPersonId(e.target.value || null)}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                      >
                        <option value="">Select a profile...</option>
                        {people.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.relation})
                          </option>
                        ))}
                      </select>
                      {selectedPersonId && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowMergeConfirm(true)}
                          disabled={isAccepting}
                          className="mt-2 w-full"
                        >
                          Merge Profiles
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel */}
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isAccepting}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

