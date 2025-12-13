import React, { useState, useEffect } from 'react';
import { Person, TodoItem, HealthRecord, RecordType, CollaborationRequest } from '../types';
import { Card, Icon, Avatar, Badge, Button, Modal, Input } from './Shared';

interface NewsfeedProps {
  people: Person[];
  onSelectPerson: (id: string, tab?: RecordType) => void;
  onAddPerson: () => void;
  pendingCollaborationRequests?: CollaborationRequest[];
  onAcceptCollaborationRequest?: (requestId: string, mergeIntoPersonId: string | null) => Promise<void>;
  onDeclineCollaborationRequest?: (requestId: string) => Promise<void>;
}

// Collaboration Requests Shelf Component
const CollaborationRequestsShelf: React.FC<{
  requests: CollaborationRequest[];
  people: Person[];
  onAccept: (requestId: string, mergeIntoPersonId: string | null) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
  onCreateNewProfile: () => void;
}> = ({ requests, people, onAccept, onDecline, onCreateNewProfile }) => {
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (requests.length === 0) return null;

  const handleAccept = async (requestId: string) => {
    setIsLoading(true);
    try {
      await onAccept(requestId, selectedPersonId);
      setActiveRequest(null);
      setSelectedPersonId(null);
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert('Failed to accept request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = (requestId: string) => {
    // Open the add person modal - after the user creates a profile,
    // they can return here and merge with the newly created profile.
    // We do NOT auto-accept - keep the panel visible so user can complete the flow.
    onCreateNewProfile();
    // Reset active request but keep showing the collaboration requests shelf
    // so user can select the newly created profile from the merge dropdown
    setActiveRequest(null);
    alert('Create your new profile. Once done, return here and select it from the "Merge with existing" dropdown to complete the collaboration.');
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
      <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-3">
        <Icon name="notifications" className="text-indigo-500" />
        Collaboration Requests ({requests.length})
      </h3>

      <div className="space-y-3">
        {requests.map(request => (
          <div key={request.id} className="bg-white rounded-xl p-4 border border-indigo-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-stone-800 font-medium">
                  <span className="text-indigo-600">{request.requesterName}</span> wants to collaborate on
                </p>
                <p className="text-sm text-stone-500 mt-1">
                  <strong>{request.personName}</strong> profile
                </p>
              </div>
            </div>

            {activeRequest === request.id ? (
              <div className="mt-4 p-3 bg-stone-50 rounded-xl">
                <p className="text-sm text-stone-600 mb-3">
                  How would you like to handle this?
                </p>
                <div className="space-y-2 mb-4">
                  <Button
                    variant="primary"
                    onClick={() => handleCreateNew(request.id)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Create New Profile
                  </Button>
                  <div className="relative">
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Or merge with existing:</label>
                    <select
                      value={selectedPersonId || ''}
                      onChange={e => setSelectedPersonId(e.target.value || null)}
                      className="w-full p-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-indigo-400"
                    >
                      <option value="">Select a profile...</option>
                      {people.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.relation})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedPersonId && (
                    <Button
                      variant="primary"
                      onClick={() => handleAccept(request.id)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Merging...' : 'Merge & Accept'}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
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
                    onClick={() => onDecline(request.id)}
                    disabled={isLoading}
                    className="flex-1 text-red-400 hover:text-red-600"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDecline(request.id)}
                  className="text-stone-500"
                >
                  Decline
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveRequest(request.id)}
                >
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
  // Aggregate upcoming items
  const allTodos = people.flatMap(p => p.todos.map(t => ({ ...t, person: p })))
    .filter(t => !t.isCompleted)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

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


  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">

      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 font-sans">Good Morning</h1>
          <p className="text-stone-500 mt-1">Here's what's happening with your people.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-stone-800">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Horizontal Scroll People */}
      <section>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {people.map(person => (
            <div key={person.id} className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group" onClick={() => onSelectPerson(person.id)}>
              <div className={`p-1 rounded-full ${person.themeColor} group-hover:ring-2 ring-offset-2 ring-stone-200 transition-all`}>
                <Avatar src={person.avatarUrl} alt={person.name} size="w-16 h-16" />
              </div>
              <span className="text-xs font-semibold text-stone-600 group-hover:text-stone-900">{person.name}</span>
            </div>
          ))}
          <div
            className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
            onClick={onAddPerson}
          >
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center border-2 border-dashed border-stone-300 group-hover:border-stone-400 group-hover:bg-stone-200 transition-all">
              <Icon name="add" className="text-stone-400 group-hover:text-stone-600" />
            </div>
            <span className="text-xs font-semibold text-stone-400 group-hover:text-stone-600">Add New</span>
          </div>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Updates */}
          {recentUpdates.map(update => (
            <Card key={update.id} className="flex items-start gap-4 hover:bg-stone-50/50" onClick={() => onSelectPerson(update.personId, update.recordType)}>
              <div className={`p-2 rounded-xl ${update.color}`}>
                <Icon name={update.icon} />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">{update.text}</p>
                <p className="text-xs text-stone-400 mt-1">{update.time}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Combined Todos List */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
            <h3 className="font-semibold text-stone-700">Upcoming Priorities</h3>
            <Badge text={`${allTodos.length} Pending`} />
          </div>
          <div className="divide-y divide-stone-100">
            {allTodos.length === 0 ? (
              <div className="p-8 text-center text-stone-400">All caught up! 🎉</div>
            ) : (
              allTodos.slice(0, 5).map(todo => (
                <div key={todo.id} className="p-4 flex items-center gap-3 hover:bg-stone-50 transition-colors cursor-pointer" onClick={() => onSelectPerson(todo.person.id, RecordType.TODO)}>
                  <div className={`w-2 h-2 rounded-full ${todo.priority === 'HIGH' ? 'bg-red-400' : 'bg-stone-300'}`} />
                  <div className="flex-1">
                    <p className="text-stone-800 font-medium text-sm line-through-active">{todo.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar src={todo.person.avatarUrl} alt={todo.person.name} size="w-4 h-4" />
                      <span className="text-xs text-stone-500">{todo.person.name}</span>
                      <span className="text-xs text-stone-300">•</span>
                      <span className="text-xs text-stone-500">Due {new Date(todo.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-stone-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all" />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Birthdays */}
        {upcomingBirthdays.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-stone-100 bg-gradient-to-r from-rose-50 to-pink-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-700 flex items-center gap-2">
                <Icon name="cake" className="text-rose-400" />
                Upcoming Birthdays
              </h3>
              <Badge text={`${upcomingBirthdays.length}`} color="bg-rose-100 text-rose-600" />
            </div>
            <div className="divide-y divide-stone-100">
              {upcomingBirthdays.map(person => (
                <div key={person.id} className="p-4 flex items-center gap-3 hover:bg-stone-50 transition-colors cursor-pointer" onClick={() => onSelectPerson(person.id)}>
                  <Avatar src={person.avatarUrl} alt={person.name} size="w-10 h-10" />
                  <div className="flex-1">
                    <p className="text-stone-800 font-medium text-sm">{person.name}</p>
                    <p className="text-xs text-stone-500">
                      {person.daysUntil === 0 ? '🎂 Today!' :
                        person.daysUntil === 1 ? '🎂 Tomorrow!' :
                          `In ${person.daysUntil} days`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-rose-500">
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