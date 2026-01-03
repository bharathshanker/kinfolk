import React, { useState, useEffect } from 'react';
import { Person, TodoItem, HealthRecord, RecordType, CollaborationRequest, ProfileSnapshot } from '../types';
import { Card, Icon, Avatar, Badge, Button, Modal, Input } from './Shared';
import { generateAvatarUrl } from '../src/utils/avatars';

interface NewsfeedProps {
  people: Person[];
  onSelectPerson: (id: string, tab?: RecordType) => void;
  onAddPerson: () => void;
  pendingCollaborationRequests?: CollaborationRequest[];
  onAcceptCollaborationRequest?: (requestId: string, mergeIntoPersonId: string | null, createNew?: boolean) => Promise<void>;
  onDeclineCollaborationRequest?: (requestId: string) => Promise<void>;
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
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
      <img 
        src={avatarUrl} 
        alt={personName}
        className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover"
      />
      <div className="flex-1">
        <h4 className="font-bold text-stone-800 text-lg">{snapshot?.name || personName}</h4>
        {snapshot?.relation && (
          <p className="text-sm text-stone-500">{snapshot.relation}</p>
        )}
        {snapshot?.birthday && (
          <p className="text-xs text-stone-400 mt-1">
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
      // Auto-create profile and accept in one step
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
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5 mb-6 shadow-sm">
      <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-4 text-lg">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <Icon name="group_add" className="text-indigo-600" />
        </div>
        Collaboration Requests
        <Badge text={`${requests.length}`} color="bg-indigo-500 text-white" />
      </h3>

      <div className="space-y-4">
        {requests.map(request => (
          <div key={request.id} className="bg-white rounded-xl p-5 border border-indigo-100 shadow-sm">
            {/* Requester Info */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                {request.requesterName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">
                  <span className="text-indigo-600">{request.requesterName}</span> wants to collaborate
                </p>
                <p className="text-xs text-stone-400">{request.requesterEmail}</p>
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
                  // Merge Confirmation
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3 mb-4">
                      <Icon name="info" className="text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Confirm Merge</p>
                        <p className="text-xs text-amber-700 mt-1">
                          You are about to link <strong>{request.profileSnapshot?.name || request.personName}</strong> with your profile <strong>{people.find(p => p.id === selectedPersonId)?.name}</strong>.
                        </p>
                        <p className="text-xs text-amber-700 mt-2">
                          Items shared by either of you will be visible to both. This action creates a bidirectional collaboration.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setShowMergeConfirm(false)}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handleMergeAndAccept(request.id)}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? 'Merging...' : 'Confirm & Merge'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Action Options
                  <div className="space-y-4">
                    <p className="text-sm text-stone-600 font-medium">
                      How would you like to handle this collaboration?
                    </p>

                    {/* Option 1: Create New Profile */}
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <Icon name="person_add" className="text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-stone-800">Create as New Profile</p>
                          <p className="text-xs text-stone-500 mt-1">
                            Add this person to your circle as a new profile. Perfect if you don't already have a profile for them.
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAcceptWithNewProfile(request.id)}
                            disabled={isLoading}
                            className="mt-3"
                          >
                            {isLoading ? 'Creating...' : 'Create New Profile'}
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
                              If you already have a profile for this person, link them together for shared updates.
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
                                  disabled={isLoading}
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

                    {/* Cancel / Decline */}
                    <div className="flex gap-2 pt-2 border-t border-stone-100">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setActiveRequest(null);
                          setSelectedPersonId(null);
                        }}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDecline(request.id)}
                        disabled={isLoading}
                        className="flex-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        Decline Request
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDecline(request.id)}
                  className="text-stone-500"
                  disabled={isLoading}
                >
                  Decline
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveRequest(request.id)}
                  disabled={isLoading}
                >
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
  onDeclineCollaborationRequest
}) => {
  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
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
    const updates: { id: string; text: string; time: string; personId: string; icon: string; color: string; timestamp: number; recordType: RecordType }[] = [];

    // New Health Records
    p.health.forEach(h => {
      if (new Date(h.meta.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
        updates.push({
          id: `h-${h.id}`,
          text: `${p.name}: Added health record "${h.title}"`,
          time: new Date(h.meta.updatedAt).toLocaleDateString(),
          personId: p.id,
          icon: 'medical_services',
          color: 'bg-rose-100 text-rose-600',
          timestamp: new Date(h.meta.updatedAt).getTime(),
          recordType: RecordType.HEALTH
        });
      }
    });

    // Completed Todos
    p.todos.filter(t => t.isCompleted).forEach(t => {
      if (new Date(t.meta.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
        updates.push({
          id: `t-${t.id}`,
          text: `${p.name}: Completed "${t.title}"`,
          time: new Date(t.meta.updatedAt).toLocaleDateString(),
          personId: p.id,
          icon: 'check_circle',
          color: 'bg-sky-100 text-sky-600',
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
      // Set the birthday to this year
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      // If birthday has passed this year, check next year
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1);
      }
      const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...p, daysUntil, nextBirthday: thisYearBday };
    })
    .filter(p => p.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const nextBirthday = upcomingBirthdays[0];


  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">

      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 font-sans animate-fade-in">{getGreeting()}</h1>
          <p className="text-stone-500 mt-1">Here's what's happening with your people.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-stone-800">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
        <Card className="p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-white to-rose-50 border-rose-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-xl">
              <Icon name="groups" className="text-rose-600 text-2xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{totalPeople}</p>
              <p className="text-xs text-stone-500 font-medium">People</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-white to-sky-50 border-sky-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-100 rounded-xl">
              <Icon name="task_alt" className="text-sky-600 text-2xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{pendingTodosCount}</p>
              <p className="text-xs text-stone-500 font-medium">Pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-white to-purple-50 border-purple-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Icon name="favorite" className="text-purple-600 text-2xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{recentHealthRecordsCount}</p>
              <p className="text-xs text-stone-500 font-medium">Health</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-white to-amber-50 border-amber-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Icon name="cake" className="text-amber-600 text-2xl" />
            </div>
            <div>
              {nextBirthday ? (
                <>
                  <p className="text-2xl font-bold text-stone-800">{nextBirthday.daysUntil}</p>
                  <p className="text-xs text-stone-500 font-medium truncate">days to {nextBirthday.name}'s</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-stone-800">-</p>
                  <p className="text-xs text-stone-500 font-medium">No upcoming</p>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Horizontal Scroll People */}
      <section>
        {people.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-rose-50 to-pink-50 border-rose-100">
            <div className="w-20 h-20 mx-auto mb-4 bg-rose-100 rounded-full flex items-center justify-center">
              <Icon name="group_add" className="text-rose-400 text-4xl" />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">Start Your Circle</h3>
            <p className="text-stone-500 text-sm mb-6 max-w-md mx-auto">
              Add your first person to begin tracking their information, health records, and important dates all in one place.
            </p>
            <Button variant="primary" onClick={onAddPerson}>
              <Icon name="add" className="mr-2" />
              Add Your First Person
            </Button>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {people.map(person => (
              <div key={person.id} className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group" onClick={() => onSelectPerson(person.id)}>
                <div className={`p-1 rounded-full ${person.themeColor} group-hover:ring-4 ring-offset-2 ring-stone-200 transition-all duration-200 group-hover:scale-110`}>
                  <Avatar src={person.avatarUrl} alt={person.name} size="w-16 h-16" />
                </div>
                <span className="text-xs font-semibold text-stone-600 group-hover:text-stone-900 transition-colors">{person.name}</span>
              </div>
            ))}
            <div
              className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
              onClick={onAddPerson}
            >
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center border-2 border-dashed border-stone-300 group-hover:border-rose-400 group-hover:bg-rose-50 transition-all duration-200 group-hover:scale-110">
                <Icon name="add" className="text-stone-400 group-hover:text-rose-500 transition-colors" />
              </div>
              <span className="text-xs font-semibold text-stone-400 group-hover:text-rose-600 transition-colors">Add New</span>
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
      <section className="space-y-6">
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <Icon name="dynamic_feed" className="text-stone-400" />
          Updates & Upcoming
        </h2>

        {/* Highlight Cards */}
        {recentUpdates.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-sky-50 to-blue-50 border-sky-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-sky-100 rounded-full flex items-center justify-center">
              <Icon name="update" className="text-sky-400 text-3xl" />
            </div>
            <h3 className="text-base font-bold text-stone-800 mb-2">No Recent Activity</h3>
            <p className="text-stone-500 text-sm max-w-sm mx-auto">
              Start adding health records, completing todos, or updating profiles to see activity here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Updates */}
            {recentUpdates.map(update => (
              <Card
                key={update.id}
                className="flex items-start gap-4 hover:shadow-lg cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-stone-200"
                onClick={() => onSelectPerson(update.personId, update.recordType)}
              >
                <div className={`p-2 rounded-xl ${update.color} transition-transform duration-200 hover:scale-110`}>
                  <Icon name={update.icon} />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">{update.text}</p>
                  <p className="text-xs text-stone-400 mt-1">{update.time}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Combined Todos List */}
        <Card className="p-0 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="p-4 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-stone-700 flex items-center gap-2">
              <Icon name="checklist" className="text-stone-400" />
              Upcoming Priorities
            </h3>
            <Badge text={`${allTodos.length} Pending`} color={allTodos.length > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"} />
          </div>
          <div className="divide-y divide-stone-100">
            {allTodos.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Icon name="task_alt" className="text-emerald-500 text-3xl" />
                </div>
                <p className="text-stone-600 font-semibold mb-1">All caught up!</p>
                <p className="text-stone-400 text-sm">No pending tasks at the moment</p>
              </div>
            ) : (
              allTodos.slice(0, 5).map(todo => (
                <div
                  key={todo.id}
                  className="p-4 flex items-center gap-3 hover:bg-gradient-to-r hover:from-stone-50 hover:to-transparent transition-all duration-200 cursor-pointer group"
                  onClick={() => onSelectPerson(todo.person.id, RecordType.TODO)}
                >
                  <div className={`w-2 h-2 rounded-full ${todo.priority === 'HIGH' ? 'bg-red-400 animate-pulse' : 'bg-stone-300'}`} />
                  <div className="flex-1">
                    <p className="text-stone-800 font-medium text-sm group-hover:text-stone-900 transition-colors">{todo.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar src={todo.person.avatarUrl} alt={todo.person.name} size="w-4 h-4" />
                      <span className="text-xs text-stone-500">{todo.person.name}</span>
                      <span className="text-xs text-stone-300">•</span>
                      <span className="text-xs text-stone-500">Due {new Date(todo.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-stone-300 group-hover:border-emerald-500 group-hover:bg-emerald-50 group-hover:scale-110 transition-all duration-200" />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Birthdays */}
        {upcomingBirthdays.length > 0 && (
          <Card className="p-0 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4 border-b border-stone-100 bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-700 flex items-center gap-2">
                <Icon name="cake" className="text-rose-400" />
                Upcoming Birthdays
              </h3>
              <Badge text={`${upcomingBirthdays.length}`} color="bg-rose-500 text-white" />
            </div>
            <div className="divide-y divide-stone-100">
              {upcomingBirthdays.map(person => (
                <div
                  key={person.id}
                  className="p-4 flex items-center gap-3 hover:bg-gradient-to-r hover:from-rose-50 hover:to-transparent transition-all duration-200 cursor-pointer group"
                  onClick={() => onSelectPerson(person.id)}
                >
                  <div className="relative">
                    <Avatar src={person.avatarUrl} alt={person.name} size="w-10 h-10" className="ring-2 ring-rose-100 group-hover:ring-rose-300 transition-all" />
                    {person.daysUntil <= 3 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-white text-xs">!</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-stone-800 font-medium text-sm group-hover:text-stone-900 transition-colors">{person.name}</p>
                    <p className="text-xs text-stone-500">
                      {person.daysUntil === 0 ? '🎂 Today!' :
                        person.daysUntil === 1 ? '🎂 Tomorrow!' :
                          `In ${person.daysUntil} days`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-500 group-hover:text-rose-600 transition-colors">
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