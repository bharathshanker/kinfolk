import React, { useState, useEffect } from 'react';
import { Person, TodoItem, HealthRecord, RecordType, CollaborationRequest, ProfileSnapshot } from '../types';
import { Card, Icon, Avatar, Badge, Button, Modal, Input, EmptyState } from './Shared';
import { generateAvatarUrl } from '../src/utils/avatars';

interface NewsfeedProps {
  people: Person[];
  onSelectPerson: (id: string, tab?: RecordType) => void;
  onAddPerson: () => void;
  pendingCollaborationRequests?: CollaborationRequest[];
  onAcceptCollaborationRequest?: (requestId: string, mergeIntoPersonId: string | null, createNew?: boolean) => Promise<void>;
  onDeclineCollaborationRequest?: (requestId: string) => Promise<void>;
  currentUserName?: string;
}

// Profile Preview Card for Collaboration Request
const ProfilePreviewCard: React.FC<{
  snapshot?: ProfileSnapshot;
  personName: string;
  requesterName: string;
  requesterEmail: string;
}> = ({ snapshot, personName, requesterName, requesterEmail }) => {
  const avatarUrl = snapshot?.avatarUrl || generateAvatarUrl(personName);

  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-plum-50 to-plum-100 rounded-2xl border border-plum-200">
      <img
        src={avatarUrl}
        alt={personName}
        className="w-16 h-16 rounded-full border-3 border-white shadow-warm object-cover"
      />
      <div className="flex-1">
        <h4 className="font-bold text-brown-800 text-lg">{snapshot?.name || personName}</h4>
        {snapshot?.relation && (
          <p className="text-sm text-brown-500">{snapshot.relation}</p>
        )}
        {snapshot?.birthday && (
          <p className="text-xs text-brown-400 mt-1">
            <Icon name="cake" className="text-xs mr-1" />
            {new Date(snapshot.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
};

// Collaboration Requests Shelf Component
const CollaborationRequestsShelf: React.FC<{
  requests: CollaborationRequest[];
  people: Person[];
  onAccept: (requestId: string, mergeIntoPersonId: string | null, createNew?: boolean) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
  onCreateNewProfile: () => void;
}> = ({ requests, people, onAccept, onDecline, onCreateNewProfile }) => {
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);

  if (requests.length === 0) return null;

  const handleAcceptWithNewProfile = async (requestId: string) => {
    setIsLoading(true);
    try {
      await onAccept(requestId, null, true);
      setActiveRequest(null);
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert('Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeAndAccept = async (requestId: string) => {
    if (!selectedPersonId) return;

    setIsLoading(true);
    try {
      await onAccept(requestId, selectedPersonId, false);
      setActiveRequest(null);
      setSelectedPersonId(null);
      setShowMergeConfirm(false);
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert('Failed to merge profiles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (requestId: string) => {
    setIsLoading(true);
    try {
      await onDecline(requestId);
      setActiveRequest(null);
    } catch (error) {
      console.error('Failed to decline request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-plum-50 to-plum-100 border border-plum-200 rounded-3xl p-6 mb-6 shadow-warm">
      <h3 className="font-bold text-plum-800 flex items-center gap-3 mb-5 text-lg heading-display">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-plum-400 to-plum-500 flex items-center justify-center shadow-warm">
          <Icon name="group_add" className="text-white" />
        </div>
        Collaboration Requests
        <Badge text={`${requests.length}`} variant="plum" />
      </h3>

      <div className="space-y-4">
        {requests.map(request => (
          <div key={request.id} className="bg-white rounded-2xl p-5 border border-plum-100 shadow-warm">
            {/* Requester Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-plum-300 to-plum-400 text-white flex items-center justify-center font-bold text-sm shadow-warm">
                {request.requesterName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-brown-800">
                  <span className="text-plum-600 font-bold">{request.requesterName}</span> wants to collaborate
                </p>
                <p className="text-xs text-brown-400">{request.requesterEmail}</p>
              </div>
            </div>

            {/* Profile Preview */}
            <ProfilePreviewCard
              snapshot={request.profileSnapshot}
              personName={request.personName}
              requesterName={request.requesterName}
              requesterEmail={request.requesterEmail}
            />

            {activeRequest === request.id ? (
              <div className="mt-4">
                {showMergeConfirm && selectedPersonId ? (
                  <div className="p-4 bg-turmeric-50 border border-turmeric-200 rounded-2xl">
                    <div className="flex items-start gap-3 mb-4">
                      <Icon name="info" className="text-turmeric-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-turmeric-800">Confirm Merge</p>
                        <p className="text-xs text-turmeric-700 mt-1">
                          You are about to link <strong>{request.profileSnapshot?.name || request.personName}</strong> with your profile <strong>{people.find(p => p.id === selectedPersonId)?.name}</strong>.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setShowMergeConfirm(false)} disabled={isLoading} className="flex-1">
                        Back
                      </Button>
                      <Button variant="primary" onClick={() => handleMergeAndAccept(request.id)} disabled={isLoading} className="flex-1">
                        {isLoading ? 'Merging...' : 'Confirm & Merge'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-brown-600 font-medium">How would you like to handle this collaboration?</p>

                    <div className="p-4 bg-turmeric-50 border border-turmeric-100 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-turmeric-400 to-turmeric-500 flex items-center justify-center shrink-0 shadow-warm">
                          <Icon name="person_add" className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-brown-800">Create as New Profile</p>
                          <p className="text-xs text-brown-500 mt-1">Add this person to your circle as a new profile.</p>
                          <Button variant="primary" size="sm" onClick={() => handleAcceptWithNewProfile(request.id)} disabled={isLoading} className="mt-3">
                            {isLoading ? 'Creating...' : 'Create New Profile'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {people.length > 0 && (
                      <div className="p-4 bg-brown-50 border border-brown-200 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-brown-200 flex items-center justify-center shrink-0">
                            <Icon name="merge" className="text-brown-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-brown-800">Merge with Existing Profile</p>
                            <p className="text-xs text-brown-500 mt-1">Link with an existing profile for shared updates.</p>
                            <div className="mt-3">
                              <select
                                value={selectedPersonId || ''}
                                onChange={e => setSelectedPersonId(e.target.value || null)}
                                className="w-full p-3 bg-white border-2 border-brown-200 rounded-xl text-sm outline-none focus:border-turmeric-400 transition-colors"
                              >
                                <option value="">Select a profile...</option>
                                {people.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.relation})</option>
                                ))}
                              </select>
                              {selectedPersonId && (
                                <Button variant="secondary" size="sm" onClick={() => setShowMergeConfirm(true)} disabled={isLoading} className="mt-2 w-full">
                                  Merge Profiles
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-brown-100">
                      <Button variant="ghost" onClick={() => { setActiveRequest(null); setSelectedPersonId(null); }} disabled={isLoading} className="flex-1">
                        Cancel
                      </Button>
                      <Button variant="danger" onClick={() => handleDecline(request.id)} disabled={isLoading} className="flex-1">
                        Decline Request
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleDecline(request.id)} className="text-brown-500" disabled={isLoading}>
                  Decline
                </Button>
                <Button variant="plum" size="sm" onClick={() => setActiveRequest(request.id)} disabled={isLoading}>
                  <Icon name="visibility" className="mr-1" />
                  Review & Accept
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Newsfeed: React.FC<NewsfeedProps> = ({
  people,
  onSelectPerson,
  onAddPerson,
  pendingCollaborationRequests = [],
  onAcceptCollaborationRequest,
  onDeclineCollaborationRequest,
  currentUserName
}) => {
  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'wb_sunny';
    if (hour < 18) return 'wb_twilight';
    return 'dark_mode';
  };

  // Aggregate upcoming items
  const allTodos = people.flatMap(p => p.todos.map(t => ({ ...t, person: p })))
    .filter(t => !t.isCompleted)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Calculate stats
  const totalPeople = people.length;
  const pendingTodosCount = allTodos.length;
  const recentHealthRecordsCount = people.reduce((count, p) => {
    return count + p.health.filter(h =>
      new Date(h.meta.updatedAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length;
  }, 0);

  // Derive recent updates from actual data
  const recentUpdates = people.flatMap(p => {
    const updates: { id: string; text: string; time: string; personId: string; icon: string; color: string; bgColor: string; timestamp: number; recordType: RecordType }[] = [];

    p.health.forEach(h => {
      if (new Date(h.meta.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
        updates.push({
          id: `h-${h.id}`,
          text: `${p.name}: Added health record "${h.title}"`,
          time: new Date(h.meta.updatedAt).toLocaleDateString(),
          personId: p.id,
          icon: 'medical_services',
          color: 'text-plum-600',
          bgColor: 'bg-plum-100',
          timestamp: new Date(h.meta.updatedAt).getTime(),
          recordType: RecordType.HEALTH
        });
      }
    });

    p.todos.filter(t => t.isCompleted).forEach(t => {
      if (new Date(t.meta.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
        updates.push({
          id: `t-${t.id}`,
          text: `${p.name}: Completed "${t.title}"`,
          time: new Date(t.meta.updatedAt).toLocaleDateString(),
          personId: p.id,
          icon: 'check_circle',
          color: 'text-turmeric-600',
          bgColor: 'bg-turmeric-100',
          timestamp: new Date(t.meta.updatedAt).getTime(),
          recordType: RecordType.TODO
        });
      }
    });

    return updates;
  }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);

  // Calculate upcoming birthdays (next 30 days)
  const today = new Date();
  const upcomingBirthdays = people
    .filter(p => p.birthday)
    .map(p => {
      const bday = new Date(p.birthday);
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1);
      }
      const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...p, daysUntil, nextBirthday: thisYearBday };
    })
    .filter(p => p.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const nextBirthday = upcomingBirthdays[0];
  const firstName = currentUserName ? currentUserName.split(' ')[0] : 'there';

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">

      {/* Welcome Header */}
      <div className="hero-panel relative shadow-warm-xl p-6 md:p-8 mb-8 animate-fade-in">
        <div className="absolute -top-10 -right-6 w-36 h-36 bg-gradient-to-br from-plum-200/30 to-coral-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-6 -left-8 w-32 h-32 bg-gradient-to-br from-turmeric-200/35 to-coral-200/25 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-turmeric-100 shadow-warm-sm">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-turmeric-400 to-coral-400 flex items-center justify-center shadow-warm">
                <Icon name={getGreetingIcon()} className="text-white text-xl" />
              </div>
              <span className="text-caption text-brown-600 font-semibold">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <p className="handwritten text-hero text-brown-800">{getGreeting()}, {firstName}</p>
              <span className="text-gradient-sunset text-xs font-extrabold tracking-[0.3em] uppercase">Welcome Home</span>
            </div>
            <p className="text-brown-600 mt-2 text-body">Here's a cozy snapshot of your circle today.</p>
          </div>

          <div className="flex flex-col gap-3 bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-4 shadow-warm-md w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-plum-400 to-plum-500 text-white flex items-center justify-center shadow-warm">
                <Icon name="groups" />
              </div>
              <div>
                <p className="text-heading font-bold text-brown-800">{totalPeople} in your circle</p>
                <p className="text-caption text-brown-500">Keep them close</p>
              </div>
            </div>
            {nextBirthday ? (
              <div className="flex items-center gap-3 bg-gradient-to-r from-coral-50 to-turmeric-50 rounded-2xl px-3 py-2 border border-coral-100 shadow-warm-sm">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-coral-400 to-coral-500 flex items-center justify-center text-white shadow-warm">
                  <Icon name="cake" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-coral-700">{nextBirthday.name}'s birthday</p>
                  <p className="text-micro text-brown-500">{nextBirthday.daysUntil === 0 ? 'Today!' : `In ${nextBirthday.daysUntil} day${nextBirthday.daysUntil === 1 ? '' : 's'}`}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-caption text-brown-500">
                <Icon name="favorite" className="text-plum-500" />
                No birthdays within 30 days
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
        <Card className="p-5 hover:shadow-warm-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-white to-turmeric-50 border-turmeric-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-turmeric-400 to-turmeric-500 rounded-2xl shadow-warm">
              <Icon name="groups" className="text-white text-2xl" />
            </div>
            <div>
              <p className="text-3xl font-bold text-brown-800">{totalPeople}</p>
              <p className="text-xs text-brown-500 font-semibold uppercase tracking-wide">People</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 hover:shadow-warm-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-white to-coral-50 border-coral-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-coral-400 to-coral-500 rounded-2xl shadow-warm">
              <Icon name="task_alt" className="text-white text-2xl" />
            </div>
            <div>
              <p className="text-3xl font-bold text-brown-800">{pendingTodosCount}</p>
              <p className="text-xs text-brown-500 font-semibold uppercase tracking-wide">Pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 hover:shadow-warm-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-white to-plum-50 border-plum-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-plum-400 to-plum-500 rounded-2xl shadow-warm">
              <Icon name="favorite" className="text-white text-2xl" />
            </div>
            <div>
              <p className="text-3xl font-bold text-brown-800">{recentHealthRecordsCount}</p>
              <p className="text-xs text-brown-500 font-semibold uppercase tracking-wide">Health</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 hover:shadow-warm-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-white to-turmeric-50 border-turmeric-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-turmeric-500 to-coral-400 rounded-2xl shadow-warm">
              <Icon name="cake" className="text-white text-2xl" />
            </div>
            <div>
              {nextBirthday ? (
                <>
                  <p className="text-3xl font-bold text-brown-800">{nextBirthday.daysUntil}</p>
                  <p className="text-xs text-brown-500 font-semibold uppercase tracking-wide truncate">days to {nextBirthday.name}'s</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-brown-800">-</p>
                  <p className="text-xs text-brown-500 font-semibold uppercase tracking-wide">No upcoming</p>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Your Circle - People Avatars */}
      <section className="animate-fade-in-up stagger-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading font-bold text-brown-800 flex items-center gap-2 heading-display">
            <Icon name="diversity_3" className="text-turmeric-500" />
            Your Circle
          </h2>
          {people.length > 0 && (
            <Button variant="ghost" onClick={onAddPerson} className="text-brown-500 hover:text-turmeric-600">
              <Icon name="add" className="text-lg" /> Add
            </Button>
          )}
        </div>

        {people.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-turmeric-50 to-coral-50 border-turmeric-200">
            <EmptyState
              icon="group_add"
              title="Start Your Circle"
              description="Add your first person to begin tracking their information, health records, and important dates all in one place."
              action={
                <Button variant="primary" onClick={onAddPerson} size="lg">
                  <Icon name="add" className="mr-2" />
                  Add Your First Person
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="relative p-5 md:p-6 rounded-4xl bg-gradient-to-r from-turmeric-50 via-cream to-plum-50 border border-turmeric-100 shadow-warm overflow-hidden">
            <div className="absolute -left-10 top-2 w-32 h-32 rounded-full bg-turmeric-200/25 blur-3xl" />
            <div className="absolute right-0 -bottom-6 w-36 h-36 rounded-full bg-plum-200/25 blur-3xl" />
            <div className="relative flex gap-5 overflow-x-auto pb-4 no-scrollbar">
              {people.map((person, index) => (
                <div
                  key={person.id}
                  className="flex flex-col items-center gap-3 min-w-[90px] cursor-pointer group animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.08}s` }}
                  onClick={() => onSelectPerson(person.id)}
                >
                  <div className="relative transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="p-1.5 rounded-full bg-gradient-to-br from-turmeric-300 to-coral-300 group-hover:from-turmeric-400 group-hover:to-coral-400 transition-all duration-300 group-hover:scale-110 shadow-warm group-hover:shadow-glow-turmeric">
                      <Avatar src={person.avatarUrl} alt={person.name} size="w-16 h-16" />
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-2 bg-turmeric-300/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-sm font-semibold text-brown-600 group-hover:text-turmeric-600 transition-colors text-center">{person.name}</span>
                </div>
              ))}
              <div
                className="flex flex-col items-center gap-3 min-w-[90px] cursor-pointer group"
                onClick={onAddPerson}
              >
                <div className="w-[72px] h-[72px] rounded-full bg-brown-100 flex items-center justify-center border-2 border-dashed border-brown-300 group-hover:border-turmeric-400 group-hover:bg-turmeric-50 transition-all duration-300 group-hover:scale-110">
                  <Icon name="add" className="text-2xl text-brown-400 group-hover:text-turmeric-500 transition-colors" />
                </div>
                <span className="text-sm font-semibold text-brown-400 group-hover:text-turmeric-600 transition-colors">Add New</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Collaboration Requests Shelf */}
      {pendingCollaborationRequests.length > 0 && onAcceptCollaborationRequest && onDeclineCollaborationRequest && (
        <CollaborationRequestsShelf
          requests={pendingCollaborationRequests}
          people={people}
          onAccept={onAcceptCollaborationRequest}
          onDecline={onDeclineCollaborationRequest}
          onCreateNewProfile={onAddPerson}
        />
      )}

      {/* Feed */}
      <section className="space-y-6 animate-fade-in-up stagger-2">
        <h2 className="text-lg font-bold text-brown-800 flex items-center gap-2 heading-display">
          <Icon name="dynamic_feed" className="text-coral-500" />
          Updates & Upcoming
        </h2>

        {/* Recent Updates */}
        {recentUpdates.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-saffron to-parchment border-turmeric-100">
            <EmptyState
              icon="update"
              title="No Recent Activity"
              description="Start adding health records, completing todos, or updating profiles to see activity here."
            />
          </Card>
        ) : (
          <Card className="p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="timeline" className="text-coral-500" />
              <p className="text-heading font-bold text-brown-800">Recent Moments</p>
            </div>
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 border-l-2 border-turmeric-100" />
              <div className="space-y-4">
                {recentUpdates.map(update => (
                  <div
                    key={update.id}
                    className="relative cursor-pointer group"
                    onClick={() => onSelectPerson(update.personId, update.recordType)}
                  >
                    <div className="absolute -left-6 top-2 w-3 h-3 rounded-full bg-white border-2 border-turmeric-400 shadow-[0_4px_12px_rgba(249,168,37,0.35)] group-hover:scale-110 transition-transform" />
                    <div className="flex items-start gap-3 rounded-2xl p-3 hover:bg-turmeric-50/60 transition-colors">
                      <div className={`p-3 rounded-2xl ${update.bgColor} shadow-warm-sm`}>
                        <Icon name={update.icon} className={update.color} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-brown-800">{update.text}</p>
                        <p className="text-xs text-brown-400 mt-1">{update.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Combined Todos List */}
        <Card className="p-0 overflow-hidden hover:shadow-warm-lg transition-shadow duration-300">
          <div className="p-5 border-b border-turmeric-100 bg-gradient-to-r from-turmeric-50 to-coral-50 flex justify-between items-center">
            <h3 className="font-bold text-brown-700 flex items-center gap-2 heading-display">
              <Icon name="checklist" className="text-turmeric-500" />
              Upcoming Priorities
            </h3>
            <Badge
              text={`${allTodos.length} Pending`}
              variant={allTodos.length > 0 ? "coral" : "turmeric"}
            />
          </div>
          <div className="divide-y divide-brown-100">
            {allTodos.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-turmeric-100 to-turmeric-200 rounded-full flex items-center justify-center animate-float">
                  <Icon name="task_alt" className="text-turmeric-500 text-3xl" />
                </div>
                <p className="text-brown-700 font-bold mb-1">All caught up!</p>
                <p className="text-brown-400 text-sm">No pending tasks at the moment</p>
              </div>
            ) : (
              allTodos.slice(0, 5).map(todo => (
                <div
                  key={todo.id}
                  className="p-4 flex items-center gap-4 hover:bg-gradient-to-r hover:from-turmeric-50/50 hover:to-transparent transition-all duration-200 cursor-pointer group"
                  onClick={() => onSelectPerson(todo.person.id, RecordType.TODO)}
                >
                  <div className={`w-3 h-3 rounded-full ${todo.priority === 'HIGH' ? 'bg-coral-500 animate-pulse' : 'bg-brown-300'}`} />
                  <div className="flex-1">
                    <p className="text-brown-800 font-medium text-sm group-hover:text-brown-900 transition-colors">{todo.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar src={todo.person.avatarUrl} alt={todo.person.name} size="w-5 h-5" />
                      <span className="text-xs text-brown-500 font-medium">{todo.person.name}</span>
                      <span className="text-xs text-brown-300">•</span>
                      <span className="text-xs text-brown-500">Due {new Date(todo.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-brown-300 group-hover:border-turmeric-500 group-hover:bg-turmeric-50 group-hover:scale-110 transition-all duration-200" />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Birthdays */}
        {upcomingBirthdays.length > 0 && (
          <Card className="p-0 overflow-hidden hover:shadow-warm-lg transition-shadow duration-300">
            <div className="p-5 border-b border-coral-100 bg-gradient-to-r from-coral-50 via-turmeric-50 to-plum-50 flex justify-between items-center">
              <h3 className="font-bold text-brown-700 flex items-center gap-2 heading-display">
                <Icon name="cake" className="text-coral-500" />
                Upcoming Birthdays
              </h3>
              <Badge text={`${upcomingBirthdays.length}`} variant="coral" />
            </div>
            <div className="divide-y divide-brown-100">
              {upcomingBirthdays.map(person => (
                <div
                  key={person.id}
                  className="p-4 flex items-center gap-4 hover:bg-gradient-to-r hover:from-coral-50/50 hover:to-transparent transition-all duration-200 cursor-pointer group"
                  onClick={() => onSelectPerson(person.id)}
                >
                  <div className="relative">
                    <Avatar src={person.avatarUrl} alt={person.name} size="w-12 h-12" className="ring-2 ring-coral-200 group-hover:ring-coral-400 transition-all" />
                    {person.daysUntil <= 3 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-coral-400 to-coral-500 rounded-full flex items-center justify-center animate-pulse shadow-warm">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-brown-800 font-medium text-sm group-hover:text-brown-900 transition-colors">{person.name}</p>
                    <p className="text-xs text-brown-500">
                      {person.daysUntil === 0 ? 'Today!' :
                        person.daysUntil === 1 ? 'Tomorrow!' :
                          `In ${person.daysUntil} days`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-coral-500 group-hover:text-coral-600 transition-colors">
                      {person.nextBirthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
};
