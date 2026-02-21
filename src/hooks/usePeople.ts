import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Person, HealthRecord, TodoItem, Note, SharingPreference, SharedFromInfo, ProfileLink, Collaborator, ProfileSnapshot } from '../../types';
import { Database } from '../types/supabase';
import { generateAvatarUrl } from '../utils/avatars';

type PersonRow = Database['public']['Tables']['people']['Row'];
type HealthRow = Database['public']['Tables']['health_records']['Row'];
type TodoRow = Database['public']['Tables']['todos']['Row'];
type NoteRow = Database['public']['Tables']['notes']['Row'];
type FinanceRow = Database['public']['Tables']['financial_records']['Row'];

// ============================================
// Optimistic State Helpers (module-level pure functions)
// Build domain objects from raw DB rows to avoid full refetch after mutations
// ============================================
const buildOptimisticMeta = (row: any, collaborators: string[]) => ({
    isShared: false,
    sharedWith: collaborators,
    lastUpdatedBy: 'You',
    updatedAt: new Date(row.created_at || Date.now())
});

const mapRawTodo = (row: any, collaborators: string[], sharedWithCollaboratorIds: string[] = []) => ({
    id: row.id, title: row.title || '',
    date: row.due_date || '', description: row.description || '',
    dueDate: row.due_date || '', isCompleted: row.is_completed || false,
    priority: row.priority || 'MEDIUM',
    meta: buildOptimisticMeta(row, collaborators), sharedFrom: undefined, sharedWithCollaboratorIds
});

const mapRawHealthRecord = (row: any, collaborators: string[], sharedWithCollaboratorIds: string[] = []) => ({
    id: row.id, title: row.title || '', date: row.date || '',
    type: row.type || 'OTHER', notes: row.notes || '', attachments: row.attachments || [],
    meta: buildOptimisticMeta(row, collaborators), sharedFrom: undefined, sharedWithCollaboratorIds
});

const mapRawNote = (row: any, collaborators: string[], sharedWithCollaboratorIds: string[] = []) => ({
    id: row.id, title: row.title || '', date: row.created_at || '',
    content: row.content || '', tags: row.tags || [],
    meta: buildOptimisticMeta(row, collaborators), sharedFrom: undefined, sharedWithCollaboratorIds
});

const mapRawFinanceRecord = (row: any, collaborators: string[], sharedWithCollaboratorIds: string[] = []) => ({
    id: row.id, title: row.title || '', date: row.date || '',
    amount: row.amount || 0, type: row.type || 'EXPENSE',
    meta: buildOptimisticMeta(row, collaborators), sharedFrom: undefined, sharedWithCollaboratorIds
});

export const usePeople = () => {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [profileLinks, setProfileLinks] = useState<ProfileLink[]>([]);

    const fetchPeople = useCallback(async (options: { showLoader?: boolean } = {}) => {
        const { showLoader = false } = options;
        try {
            if (showLoader) {
                setLoading(true);
            }
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setPeople([]);
                setError(null);
                setLoading(false);
                return;
            }

            // 1. Fetch People (all accessible to user via RLS)
            const { data: peopleData, error: peopleError } = await supabase
                .from('people')
                .select('id, name, relation, avatar_url, theme_color, birthday, email, phone, date_of_birth, gender, linked_user_id, sharing_preference, created_by, created_at')
                .order('created_at', { ascending: false });

            if (peopleError) throw peopleError;

            // 2. Fetch profile links for bidirectional sync
            const { data: linksData, error: linksError } = await supabase
                .from('profile_links')
                .select('id, profile_a_id, profile_b_id, user_a_id, user_b_id, is_active, collaboration_request_id, created_at, updated_at')
                .eq('is_active', true);

            if (!linksError && linksData) {
                setProfileLinks(linksData.map(l => ({
                    id: l.id,
                    profileAId: l.profile_a_id,
                    profileBId: l.profile_b_id,
                    userAId: l.user_a_id,
                    userBId: l.user_b_id,
                    isActive: l.is_active,
                    collaborationRequestId: l.collaboration_request_id,
                    createdAt: new Date(l.created_at),
                    updatedAt: new Date(l.updated_at)
                })));
            }

            // Hide linked duplicates: when a non-owned profile is linked to an owned profile,
            // we show only the owned one in the circle, but still surface shared items via remapping below.
            const allPeople = peopleData || [];
            const ownedPersonIds = new Set(allPeople.filter(p => p.created_by === user.id).map(p => p.id));
            const linkedToOwnedNonOwned = new Set<string>();
            (linksData || []).forEach((l: any) => {
                if (ownedPersonIds.has(l.profile_a_id) && !ownedPersonIds.has(l.profile_b_id)) {
                    linkedToOwnedNonOwned.add(l.profile_b_id);
                }
                if (ownedPersonIds.has(l.profile_b_id) && !ownedPersonIds.has(l.profile_a_id)) {
                    linkedToOwnedNonOwned.add(l.profile_a_id);
                }
            });

            const visiblePeopleData = allPeople.filter(p => p.created_by === user.id || !linkedToOwnedNonOwned.has(p.id));

            // 3. Fetch related data for all people (including hidden linked ones)
            const personIds = allPeople.map(p => p.id);

            const [healthRes, todosRes, notesRes, financeRes, sharesRes] = await Promise.all([
                supabase.from('health_records').select('id, person_id, title, date, type, notes, attachments, created_by, created_at, creator:profiles!created_by(id, full_name, email)').in('person_id', personIds),
                supabase.from('todos').select('id, person_id, title, due_date, description, is_completed, priority, created_by, created_at, creator:profiles!created_by(id, full_name, email)').in('person_id', personIds),
                supabase.from('notes').select('id, person_id, title, content, tags, created_by, created_at, creator:profiles!created_by(id, full_name, email)').in('person_id', personIds),
                supabase.from('financial_records').select('id, person_id, title, amount, type, date, created_by, created_at, creator:profiles!created_by(id, full_name, email)').in('person_id', personIds),
                supabase.from('person_shares').select('id, person_id, user_id, user_email, profiles(id, full_name, email)').in('person_id', personIds)
            ]);

            if (healthRes.error) throw healthRes.error;
            if (todosRes.error) throw todosRes.error;
            if (notesRes.error) throw notesRes.error;
            if (financeRes.error) throw financeRes.error;
            if (sharesRes.error) throw sharesRes.error;

            // 4. Fetch item_shares for all record types (to know what we shared with others)
            // Single consolidated query instead of 4 separate queries - reduces egress by ~50% for this operation
            const healthRecordIds = (healthRes.data || []).map(h => h.id);
            const todoRecordIds = (todosRes.data || []).map(t => t.id);
            const noteRecordIds = (notesRes.data || []).map(n => n.id);
            const financeRecordIds = (financeRes.data || []).map(f => f.id);

            const allOwnedRecordIds = [...healthRecordIds, ...todoRecordIds, ...noteRecordIds, ...financeRecordIds];
            let allItemShares: any[] = [];
            if (allOwnedRecordIds.length > 0) {
                const { data: itemSharesData, error: itemSharesError } = await supabase
                    .from('item_shares')
                    .select('id, record_type, record_id, person_share_id, created_by, created_at, profiles:created_by(id, full_name, email)')
                    .in('record_id', allOwnedRecordIds);
                if (itemSharesError) {
                    console.error('Error fetching item shares:', itemSharesError);
                } else {
                    allItemShares = itemSharesData || [];
                }
            }

            // 5. Fetch items shared WITH this user via item_shares (fallback for non-linked sharing)
            // Get person_shares where this user is the collaborator
            const { data: myPersonShares } = await supabase
                .from('person_shares')
                .select('id, person_id')
                .eq('user_id', user.id);

            const myPersonShareIds = (myPersonShares || []).map(ps => ps.id);
            
            // Fetch items shared with me
            let sharedWithMeItems: any[] = [];
            if (myPersonShareIds.length > 0) {
                const { data: sharedItems, error: sharedError } = await supabase
                    .from('item_shares')
                    .select('id, record_type, record_id, person_share_id, created_by, created_at, profiles:created_by(id, full_name, email, avatar_url)')
                    .in('person_share_id', myPersonShareIds);
                
                if (!sharedError && sharedItems) {
                    sharedWithMeItems = sharedItems;
                }
            }

            // Fetch the actual records for items shared with me
            const sharedTodoIds = sharedWithMeItems.filter(i => i.record_type === 'TODO').map(i => i.record_id);
            const sharedHealthIds = sharedWithMeItems.filter(i => i.record_type === 'HEALTH').map(i => i.record_id);
            const sharedNoteIds = sharedWithMeItems.filter(i => i.record_type === 'NOTE').map(i => i.record_id);
            const sharedFinanceIds = sharedWithMeItems.filter(i => i.record_type === 'FINANCE').map(i => i.record_id);

            const sharedRecordsPromises = [];
            if (sharedTodoIds.length > 0) {
                sharedRecordsPromises.push(
                    supabase.from('todos').select('id, person_id, title, due_date, description, is_completed, priority, created_by, created_at, creator:profiles!created_by(id, full_name, email)').in('id', sharedTodoIds)
                );
            }
            if (sharedHealthIds.length > 0) {
                sharedRecordsPromises.push(
                    supabase.from('health_records').select('id, person_id, title, date, type, notes, attachments, created_by, created_at, creator:profiles!created_by(id, full_name, email)').in('id', sharedHealthIds)
                );
            }
            if (sharedNoteIds.length > 0) {
                sharedRecordsPromises.push(
                    supabase.from('notes').select('id, person_id, title, content, tags, created_by, created_at, creator:profiles!created_by(id, full_name, email)').in('id', sharedNoteIds)
                );
            }
            if (sharedFinanceIds.length > 0) {
                sharedRecordsPromises.push(
                    supabase.from('financial_records').select('id, person_id, title, amount, type, date, created_by, created_at, creator:profiles!created_by(id, full_name, email)').in('id', sharedFinanceIds)
                );
            }

            const sharedRecordsResults = sharedRecordsPromises.length > 0
                ? await Promise.all(sharedRecordsPromises)
                : [];

            // Build a map of shared records by ID
            const sharedTodos: any[] = [];
            const sharedHealth: any[] = [];
            const sharedNotes: any[] = [];
            const sharedFinance: any[] = [];

            sharedRecordsResults.forEach(res => {
                if (res.error) return;
                const data = res.data || [];
                if (data.length === 0) return;
                
                // Determine type by checking which fields exist
                if ('is_completed' in data[0]) {
                    sharedTodos.push(...data);
                } else if ('type' in data[0] && ('notes' in data[0] || 'attachments' in data[0])) {
                    sharedHealth.push(...data);
                } else if ('content' in data[0] && 'tags' in data[0]) {
                    sharedNotes.push(...data);
                } else if ('amount' in data[0]) {
                    sharedFinance.push(...data);
                }
            });

            // Helper to get sharedFrom info for an item
            const getSharedFromInfo = (recordType: string, recordId: string): SharedFromInfo | undefined => {
                const itemShare = sharedWithMeItems.find(
                    i => i.record_type === recordType && i.record_id === recordId
                );
                if (!itemShare || !itemShare.profiles) return undefined;
                
                const profile = itemShare.profiles as any;
                return {
                    userId: profile.id,
                    userName: profile.full_name || 'Unknown',
                    userEmail: profile.email,
                    userAvatarUrl: profile.avatar_url,
                    sourcePersonName: '', // Will be filled from the record's people relation
                    sharedAt: new Date(itemShare.created_at)
                };
            };

            // 6. Map to Domain Model
            const mappedPeople: Person[] = visiblePeopleData.map(p => {
                // Collect items from this person AND all linked counterparts
                const relevantPersonIds = [p.id, ...linksData
                    ?.filter(l => l.profile_a_id === p.id || l.profile_b_id === p.id)
                    .map(l => l.profile_a_id === p.id ? l.profile_b_id : l.profile_a_id) || []];

                const pHealth = healthRes.data.filter(h => relevantPersonIds.includes(h.person_id));
                const pTodos = todosRes.data.filter(t => relevantPersonIds.includes(t.person_id));
                const pNotes = notesRes.data.filter(n => relevantPersonIds.includes(n.person_id));
                const pFinance = financeRes.data.filter(f => relevantPersonIds.includes(f.person_id));
                
                // Get person shares only for the LOCAL person p
                const pShares = sharesRes.data.filter(s => s.person_id === p.id);

                // Build collaborators list with full info
                const collaborators = pShares
                    .filter(s => s.user_id)
                    .map(s => {
                        const profile = s.profiles as any;
                        return profile?.full_name || s.user_email || 'Unknown';
                    });

                // Get item shares for each record type (for items owned by user)
                const healthItemShares = allItemShares.filter(is => is.record_type === 'HEALTH');
                const todoItemShares = allItemShares.filter(is => is.record_type === 'TODO');
                const noteItemShares = allItemShares.filter(is => is.record_type === 'NOTE');
                const financeItemShares = allItemShares.filter(is => is.record_type === 'FINANCE');

                // Find shared items that are shared with me explicitly (fallback for non-linked sharing)
                const personSharesForPerson = myPersonShares?.filter(ps => relevantPersonIds.includes(ps.person_id)) || [];
                const personShareIdsForPerson = personSharesForPerson.map(ps => ps.id);
                
                const sharedTodosForPerson = sharedTodos.filter(t => {
                    const itemShare = sharedWithMeItems.find(
                        i => i.record_type === 'TODO' && i.record_id === t.id && personShareIdsForPerson.includes(i.person_share_id)
                    );
                    return !!itemShare;
                });

                const sharedHealthForPerson = sharedHealth.filter(h => {
                    const itemShare = sharedWithMeItems.find(
                        i => i.record_type === 'HEALTH' && i.record_id === h.id && personShareIdsForPerson.includes(i.person_share_id)
                    );
                    return !!itemShare;
                });

                const sharedNotesForPerson = sharedNotes.filter(n => {
                    const itemShare = sharedWithMeItems.find(
                        i => i.record_type === 'NOTE' && i.record_id === n.id && personShareIdsForPerson.includes(i.person_share_id)
                    );
                    return !!itemShare;
                });

                const sharedFinanceForPerson = sharedFinance.filter(f => {
                    const itemShare = sharedWithMeItems.find(
                        i => i.record_type === 'FINANCE' && i.record_id === f.id && personShareIdsForPerson.includes(i.person_share_id)
                    );
                    return !!itemShare;
                });

                // Helper to create domain objects with proper attribution
                const mapRecord = (record: any, type: 'HEALTH' | 'TODO' | 'NOTE' | 'FINANCE') => {
                    const creator = record.creator as any;
                    const isOwned = record.created_by === user.id;
                    
                    let sharedFrom: SharedFromInfo | undefined = undefined;
                    if (!isOwned && creator) {
                        sharedFrom = {
                            userId: creator.id,
                            userName: creator.full_name || 'Unknown',
                            userEmail: creator.email,
                            userAvatarUrl: creator.avatar_url,
                            sourcePersonName: '', // Optional
                            sharedAt: new Date(record.created_at)
                        };
                    } else if (!isOwned) {
                        // Fallback to explicit sharing info if creator join failed
                        sharedFrom = getSharedFromInfo(type, record.id);
                    }

                    // Base record mapping
                    const base = {
                        id: record.id,
                        title: record.title || '',
                        date: record.date || record.due_date || '',
                        meta: {
                            isShared: !isOwned || allItemShares.some(is => is.record_id === record.id),
                            sharedWith: collaborators,
                            lastUpdatedBy: isOwned ? 'You' : (sharedFrom?.userName || 'Collaborator'),
                            updatedAt: new Date(record.created_at || '')
                        },
                        sharedFrom
                    };

                    if (type === 'HEALTH') {
                        return {
                            ...base,
                            type: (record.type as any) || 'OTHER',
                            notes: record.notes || '',
                            attachments: record.attachments || [],
                            sharedWithCollaboratorIds: healthItemShares.filter(is => is.record_id === record.id).map(is => is.person_share_id)
                        };
                    } else if (type === 'TODO') {
                        return {
                            ...base,
                            description: record.description || '',
                            dueDate: record.due_date || '',
                            isCompleted: record.is_completed || false,
                            priority: (record.priority as any) || 'MEDIUM',
                            sharedWithCollaboratorIds: todoItemShares.filter(is => is.record_id === record.id).map(is => is.person_share_id)
                        };
                    } else if (type === 'NOTE') {
                        return {
                            ...base,
                            content: record.content || '',
                            tags: record.tags || [],
                            sharedWithCollaboratorIds: noteItemShares.filter(is => is.record_id === record.id).map(is => is.person_share_id)
                        };
                    } else if (type === 'FINANCE') {
                        return {
                            ...base,
                            amount: record.amount || 0,
                            type: (record.type as any) || 'EXPENSE',
                            sharedWithCollaboratorIds: financeItemShares.filter(is => is.record_id === record.id).map(is => is.person_share_id)
                        };
                    }
                    return base;
                };

                // Merge and deduplicate items
                const deduplicate = (items: any[]) => {
                    const seen = new Set();
                    return items.filter(item => {
                        if (seen.has(item.id)) return false;
                        seen.add(item.id);
                        return true;
                    });
                };

                return {
                    id: p.id,
                    name: p.name,
                    relation: p.relation || '',
                    avatarUrl: p.avatar_url || generateAvatarUrl(p.name, p.gender as 'male' | 'female' | 'other'),
                    themeColor: p.theme_color || 'bg-brown-100',
                    birthday: p.birthday || '',
                    email: p.email || '',
                    phone: p.phone || '',
                    dateOfBirth: p.date_of_birth || '',
                    gender: (p.gender as 'male' | 'female' | 'other') || undefined,
                    linkedUserId: p.linked_user_id || undefined,
                    collaborators,
                    sharingPreference: (p.sharing_preference as SharingPreference) || 'ASK_EVERY_TIME',
                    health: deduplicate([...pHealth.map(h => mapRecord(h, 'HEALTH')), ...sharedHealthForPerson.map(h => mapRecord(h, 'HEALTH'))]),
                    todos: deduplicate([...pTodos.map(t => mapRecord(t, 'TODO')), ...sharedTodosForPerson.map(t => mapRecord(t, 'TODO'))]),
                    notes: deduplicate([...pNotes.map(n => mapRecord(n, 'NOTE')), ...sharedNotesForPerson.map(n => mapRecord(n, 'NOTE'))]),
                    financial: deduplicate([...pFinance.map(f => mapRecord(f, 'FINANCE')), ...sharedFinanceForPerson.map(f => mapRecord(f, 'FINANCE'))])
                };
            });

            setPeople(mappedPeople);

        } catch (err: any) {
            console.error('Error fetching people:', err);
            setError(err.message);
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, []);

    // Fetch on mount and whenever auth state changes
    useEffect(() => {
        fetchPeople({ showLoader: true });

        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            // Ignore token refresh/initial session events to avoid periodic heavy refetches.
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                fetchPeople();
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [fetchPeople]);

    // Debounced fetch to coalesce rapid realtime events into a single refresh.
    // Multiple table changes within 2 seconds are batched into one fetchPeople call.
    const debouncedFetchPeople = useCallback(() => {
        if (realtimeDebounceRef.current) {
            clearTimeout(realtimeDebounceRef.current);
        }
        realtimeDebounceRef.current = setTimeout(() => {
            realtimeDebounceRef.current = null;
            fetchPeople();
        }, 2000);
    }, [fetchPeople]);

    // Real-time subscriptions for live updates.
    // Record tables (todos, health_records, notes, financial_records) use targeted state updates
    // to avoid full refetches. Structural tables (item_shares, person_shares, profile_links)
    // fall back to debouncedFetchPeople since those changes affect complex cross-cutting state.
    useEffect(() => {
        let subscriptions: any[] = [];
        let cancelled = false;

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            // Targeted handler for todos
            subscriptions.push(
                supabase.channel('todos-changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload: any) => {
                        const { eventType, new: newRow, old: oldRow } = payload;
                        if (eventType === 'DELETE') {
                            setPeople(prev => prev.map(p => ({ ...p, todos: p.todos.filter(t => t.id !== oldRow.id) })));
                        } else if (eventType === 'UPDATE') {
                            setPeople(prev => prev.map(p => ({
                                ...p,
                                todos: p.todos.map(t => t.id === newRow.id ? { ...t, title: newRow.title ?? t.title, dueDate: newRow.due_date ?? t.dueDate, date: newRow.due_date ?? t.date, priority: newRow.priority ?? t.priority, description: newRow.description ?? t.description, isCompleted: newRow.is_completed ?? t.isCompleted } : t)
                            })));
                        } else if (eventType === 'INSERT') {
                            setPeople(prev => prev.map(p => {
                                if (p.id !== newRow.person_id || p.todos.find(t => t.id === newRow.id)) return p;
                                return { ...p, todos: [...p.todos, mapRawTodo(newRow, p.collaborators)] };
                            }));
                        }
                    })
                    .subscribe()
            );

            // Targeted handler for health_records
            subscriptions.push(
                supabase.channel('health-changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'health_records' }, (payload: any) => {
                        const { eventType, new: newRow, old: oldRow } = payload;
                        if (eventType === 'DELETE') {
                            setPeople(prev => prev.map(p => ({ ...p, health: p.health.filter(h => h.id !== oldRow.id) })));
                        } else if (eventType === 'UPDATE') {
                            setPeople(prev => prev.map(p => ({
                                ...p,
                                health: p.health.map(h => h.id === newRow.id ? { ...h, title: newRow.title ?? h.title, date: newRow.date ?? h.date, notes: newRow.notes ?? h.notes, type: newRow.type ?? h.type } : h)
                            })));
                        } else if (eventType === 'INSERT') {
                            setPeople(prev => prev.map(p => {
                                if (p.id !== newRow.person_id || p.health.find(h => h.id === newRow.id)) return p;
                                return { ...p, health: [...p.health, mapRawHealthRecord(newRow, p.collaborators)] };
                            }));
                        }
                    })
                    .subscribe()
            );

            // Targeted handler for notes
            subscriptions.push(
                supabase.channel('notes-changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload: any) => {
                        const { eventType, new: newRow, old: oldRow } = payload;
                        if (eventType === 'DELETE') {
                            setPeople(prev => prev.map(p => ({ ...p, notes: p.notes.filter(n => n.id !== oldRow.id) })));
                        } else if (eventType === 'UPDATE') {
                            setPeople(prev => prev.map(p => ({
                                ...p,
                                notes: p.notes.map(n => n.id === newRow.id ? { ...n, title: newRow.title ?? n.title, content: newRow.content ?? n.content } : n)
                            })));
                        } else if (eventType === 'INSERT') {
                            setPeople(prev => prev.map(p => {
                                if (p.id !== newRow.person_id || p.notes.find(n => n.id === newRow.id)) return p;
                                return { ...p, notes: [...p.notes, mapRawNote(newRow, p.collaborators)] };
                            }));
                        }
                    })
                    .subscribe()
            );

            // Targeted handler for financial_records
            subscriptions.push(
                supabase.channel('finance-changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_records' }, (payload: any) => {
                        const { eventType, new: newRow, old: oldRow } = payload;
                        if (eventType === 'DELETE') {
                            setPeople(prev => prev.map(p => ({ ...p, financial: p.financial.filter(f => f.id !== oldRow.id) })));
                        } else if (eventType === 'UPDATE') {
                            setPeople(prev => prev.map(p => ({
                                ...p,
                                financial: p.financial.map(f => f.id === newRow.id ? { ...f, title: newRow.title ?? f.title, amount: newRow.amount ?? f.amount, type: newRow.type ?? f.type, date: newRow.date ?? f.date } : f)
                            })));
                        } else if (eventType === 'INSERT') {
                            setPeople(prev => prev.map(p => {
                                if (p.id !== newRow.person_id || p.financial.find(f => f.id === newRow.id)) return p;
                                return { ...p, financial: [...p.financial, mapRawFinanceRecord(newRow, p.collaborators)] };
                            }));
                        }
                    })
                    .subscribe()
            );

            // Structural tables: full refetch (rare events, complex cross-cutting state)
            const structuralTables = [
                { channel: 'item-shares-changes', table: 'item_shares' },
                { channel: 'person-shares-changes', table: 'person_shares' },
                { channel: 'profile-links-changes', table: 'profile_links' },
            ];
            structuralTables.forEach(({ channel, table }) => {
                subscriptions.push(
                    supabase.channel(channel)
                        .on('postgres_changes', { event: '*', schema: 'public', table }, () => debouncedFetchPeople())
                        .subscribe()
                );
            });
        };

        setupRealtime();

        return () => {
            cancelled = true;
            if (realtimeDebounceRef.current) {
                clearTimeout(realtimeDebounceRef.current);
                realtimeDebounceRef.current = null;
            }
            subscriptions.forEach(sub => {
                supabase.removeChannel(sub);
            });
        };
    }, [debouncedFetchPeople]);

    // ============================================
    // CRUD Operations
    // ============================================

    const addPerson = async (name: string, relation: string, birthday?: string, file?: File, email?: string, phone?: string, dateOfBirth?: string, gender?: 'male' | 'female' | 'other') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let avatarUrl = null;

        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                avatarUrl = publicUrl;
            }
        }

        const { data: newPersonData, error } = await supabase.from('people').insert({
            name,
            relation,
            birthday: birthday || null,
            avatar_url: avatarUrl,
            email: email || '',
            phone: phone || '',
            date_of_birth: dateOfBirth || '',
            gender: gender || 'other',
            created_by: user.id,
            theme_color: 'bg-brown-100'
        }).select().single();

        if (error) throw error;
        if (newPersonData) {
            const newPerson: Person = {
                id: newPersonData.id,
                name: newPersonData.name,
                relation: newPersonData.relation || '',
                avatarUrl: newPersonData.avatar_url || generateAvatarUrl(newPersonData.name, newPersonData.gender as 'male' | 'female' | 'other'),
                themeColor: newPersonData.theme_color || 'bg-brown-100',
                birthday: newPersonData.birthday || '',
                email: newPersonData.email || '',
                phone: newPersonData.phone || '',
                dateOfBirth: newPersonData.date_of_birth || '',
                gender: (newPersonData.gender as 'male' | 'female' | 'other') || undefined,
                collaborators: [],
                sharingPreference: 'ASK_EVERY_TIME',
                health: [], todos: [], notes: [], financial: []
            };
            setPeople(prev => [newPerson, ...prev]);
        }
    };

    const updatePerson = async (updatedPerson: Person) => {
        const { error } = await supabase.from('people').update({
            name: updatedPerson.name,
            relation: updatedPerson.relation,
            sharing_preference: updatedPerson.sharingPreference,
            birthday: updatedPerson.birthday === '' ? null : updatedPerson.birthday,
            email: updatedPerson.email || null,
            phone: updatedPerson.phone || '',
            date_of_birth: updatedPerson.dateOfBirth || null,
            gender: updatedPerson.gender || 'other'
        }).eq('id', updatedPerson.id);

        if (error) throw error;
        setPeople(prev => prev.map(p => p.id === updatedPerson.id ? { ...p, ...updatedPerson } : p));
    };

    const addTodo = async (personId: string, title: string, date: string, priority: string = 'MEDIUM', description: string = '', sharedWithCollaboratorIds?: string[]) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: todoData, error } = await supabase.from('todos').insert({
            person_id: personId,
            title,
            due_date: date,
            priority,
            description: description || null,
            created_by: user.id
        }).select().single();
        if (error) throw error;

        // Create item_shares if collaborators are specified
        if (sharedWithCollaboratorIds && sharedWithCollaboratorIds.length > 0 && todoData) {
            const itemShares = sharedWithCollaboratorIds.map(personShareId => ({
                record_type: 'TODO',
                record_id: todoData.id,
                person_share_id: personShareId,
                created_by: user.id
            }));
            const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
            if (shareError) console.error('Error creating item shares:', shareError);
        }

        if (todoData) {
            setPeople(prev => prev.map(p =>
                p.id === personId
                    ? { ...p, todos: [...p.todos, mapRawTodo(todoData, p.collaborators, sharedWithCollaboratorIds || [])] }
                    : p
            ));
        }
    };

    const updateTodo = async (todoId: string, updates: { title?: string; dueDate?: string; priority?: string; description?: string; isCompleted?: boolean; sharedWithCollaboratorIds?: string[] }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;

        const { error } = await supabase.from('todos').update(dbUpdates).eq('id', todoId);
        if (error) throw error;

        // Update item_shares if sharedWithCollaboratorIds is provided
        if (updates.sharedWithCollaboratorIds !== undefined) {
            // Delete existing shares
            await supabase.from('item_shares')
                .delete()
                .eq('record_type', 'TODO')
                .eq('record_id', todoId);

            // Insert new shares
            if (updates.sharedWithCollaboratorIds.length > 0) {
                const itemShares = updates.sharedWithCollaboratorIds.map(personShareId => ({
                    record_type: 'TODO',
                    record_id: todoId,
                    person_share_id: personShareId,
                    created_by: user.id
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error updating item shares:', shareError);
            }
        }

        setPeople(prev => prev.map(p => ({
            ...p,
            todos: p.todos.map(t =>
                t.id === todoId
                    ? {
                        ...t,
                        title: updates.title ?? t.title,
                        dueDate: updates.dueDate ?? t.dueDate,
                        date: updates.dueDate ?? t.date,
                        priority: updates.priority ?? t.priority,
                        description: updates.description ?? t.description,
                        isCompleted: updates.isCompleted ?? t.isCompleted,
                        sharedWithCollaboratorIds: updates.sharedWithCollaboratorIds ?? t.sharedWithCollaboratorIds
                    }
                    : t
            )
        })));
    };

    const deleteTodo = async (todoId: string) => {
        const { error } = await supabase.from('todos').delete().eq('id', todoId);
        if (error) throw error;
        setPeople(prev => prev.map(p => ({ ...p, todos: p.todos.filter(t => t.id !== todoId) })));
    };

    const toggleTodo = async (todoId: string, isCompleted: boolean) => {
        const { error } = await supabase.from('todos').update({ is_completed: isCompleted }).eq('id', todoId);
        if (error) throw error;
        setPeople(prev => prev.map(p => ({
            ...p,
            todos: p.todos.map(t => t.id === todoId ? { ...t, isCompleted } : t)
        })));
    };

    const addHealthRecord = async (personId: string, title: string, date: string, notes: string, type: string, files?: File[], sharedWithCollaboratorIds?: string[]) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('No user found when adding health record');
                alert('You must be logged in to add health records');
                return;
            }

            let attachmentUrls: string[] = [];

            if (files && files.length > 0) {
                for (const file of files) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${personId}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;

                    const { error: uploadError, data: uploadData } = await supabase.storage
                        .from('Health Records')
                        .upload(fileName, file);

                    if (uploadError) {
                        console.error('Error uploading file:', uploadError);
                        alert(`Failed to upload file ${file.name}: ${uploadError.message}`);
                        continue;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('Health Records')
                        .getPublicUrl(fileName);

                    attachmentUrls.push(publicUrl);
                }
            }

            const { error, data } = await supabase.from('health_records').insert({
                person_id: personId,
                title,
                date,
                notes,
                type,
                attachments: attachmentUrls,
                created_by: user.id
            }).select().single();

            if (error) {
                console.error('Error inserting health record:', error);
                alert(`Failed to save health record: ${error.message}`);
                throw error;
            }

            // Create item_shares if collaborators are specified
            if (sharedWithCollaboratorIds && sharedWithCollaboratorIds.length > 0 && data) {
                const itemShares = sharedWithCollaboratorIds.map(personShareId => ({
                    record_type: 'HEALTH',
                    record_id: data.id,
                    person_share_id: personShareId,
                    created_by: user.id
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error creating item shares:', shareError);
            }

            if (data) {
                setPeople(prev => prev.map(p =>
                    p.id === personId
                        ? { ...p, health: [...p.health, mapRawHealthRecord(data, p.collaborators, sharedWithCollaboratorIds || [])] }
                        : p
                ));
            }
        } catch (err: any) {
            console.error('Unexpected error in addHealthRecord:', err);
            alert(`An error occurred: ${err.message || 'Unknown error'}`);
        }
    };

    const updateHealthRecord = async (recordId: string, updates: { title?: string; date?: string; notes?: string; type?: string; sharedWithCollaboratorIds?: string[] }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.type !== undefined) dbUpdates.type = updates.type;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('health_records').update(dbUpdates).eq('id', recordId);
            if (error) throw error;
        }

        // Update item_shares if sharedWithCollaboratorIds is provided
        if (updates.sharedWithCollaboratorIds !== undefined) {
            await supabase.from('item_shares')
                .delete()
                .eq('record_type', 'HEALTH')
                .eq('record_id', recordId);

            if (updates.sharedWithCollaboratorIds.length > 0) {
                const itemShares = updates.sharedWithCollaboratorIds.map(personShareId => ({
                    record_type: 'HEALTH',
                    record_id: recordId,
                    person_share_id: personShareId,
                    created_by: user.id
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error updating item shares:', shareError);
            }
        }

        setPeople(prev => prev.map(p => ({
            ...p,
            health: p.health.map(h =>
                h.id === recordId
                    ? {
                        ...h,
                        title: updates.title ?? h.title,
                        date: updates.date ?? h.date,
                        notes: updates.notes ?? h.notes,
                        type: updates.type ?? h.type,
                        sharedWithCollaboratorIds: updates.sharedWithCollaboratorIds ?? h.sharedWithCollaboratorIds
                    }
                    : h
            )
        })));
    };

    const deleteHealthRecord = async (recordId: string) => {
        const { error } = await supabase.from('health_records').delete().eq('id', recordId);
        if (error) throw error;
        setPeople(prev => prev.map(p => ({ ...p, health: p.health.filter(h => h.id !== recordId) })));
    };

    const addNote = async (personId: string, title: string, content: string, sharedWithCollaboratorIds?: string[]) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: noteData, error } = await supabase.from('notes').insert({
            person_id: personId,
            title,
            content,
            created_by: user.id
        }).select().single();
        if (error) throw error;

        // Create item_shares if collaborators are specified
        if (sharedWithCollaboratorIds && sharedWithCollaboratorIds.length > 0 && noteData) {
            const itemShares = sharedWithCollaboratorIds.map(personShareId => ({
                record_type: 'NOTE',
                record_id: noteData.id,
                person_share_id: personShareId,
                created_by: user.id
            }));
            const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
            if (shareError) console.error('Error creating item shares:', shareError);
        }

        if (noteData) {
            setPeople(prev => prev.map(p =>
                p.id === personId
                    ? { ...p, notes: [...p.notes, mapRawNote(noteData, p.collaborators, sharedWithCollaboratorIds || [])] }
                    : p
            ));
        }
    };

    const updateNote = async (noteId: string, updates: { title?: string; content?: string; sharedWithCollaboratorIds?: string[] }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.content !== undefined) dbUpdates.content = updates.content;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('notes').update(dbUpdates).eq('id', noteId);
            if (error) throw error;
        }

        // Update item_shares if sharedWithCollaboratorIds is provided
        if (updates.sharedWithCollaboratorIds !== undefined) {
            await supabase.from('item_shares')
                .delete()
                .eq('record_type', 'NOTE')
                .eq('record_id', noteId);

            if (updates.sharedWithCollaboratorIds.length > 0) {
                const itemShares = updates.sharedWithCollaboratorIds.map(personShareId => ({
                    record_type: 'NOTE',
                    record_id: noteId,
                    person_share_id: personShareId,
                    created_by: user.id
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error updating item shares:', shareError);
            }
        }

        setPeople(prev => prev.map(p => ({
            ...p,
            notes: p.notes.map(n =>
                n.id === noteId
                    ? {
                        ...n,
                        title: updates.title ?? n.title,
                        content: updates.content ?? n.content,
                        sharedWithCollaboratorIds: updates.sharedWithCollaboratorIds ?? n.sharedWithCollaboratorIds
                    }
                    : n
            )
        })));
    };

    const deleteNote = async (noteId: string) => {
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) throw error;
        setPeople(prev => prev.map(p => ({ ...p, notes: p.notes.filter(n => n.id !== noteId) })));
    };

    const addFinanceRecord = async (personId: string, title: string, amount: number, type: string, date: string, sharedWithCollaboratorIds?: string[]) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: financeData, error } = await supabase.from('financial_records').insert({
            person_id: personId,
            title,
            amount,
            type,
            date,
            created_by: user.id
        }).select().single();
        if (error) throw error;

        // Create item_shares if collaborators are specified
        if (sharedWithCollaboratorIds && sharedWithCollaboratorIds.length > 0 && financeData) {
            const itemShares = sharedWithCollaboratorIds.map(personShareId => ({
                record_type: 'FINANCE',
                record_id: financeData.id,
                person_share_id: personShareId,
                created_by: user.id
            }));
            const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
            if (shareError) console.error('Error creating item shares:', shareError);
        }

        if (financeData) {
            setPeople(prev => prev.map(p =>
                p.id === personId
                    ? { ...p, financial: [...p.financial, mapRawFinanceRecord(financeData, p.collaborators, sharedWithCollaboratorIds || [])] }
                    : p
            ));
        }
    };

    const updateFinanceRecord = async (recordId: string, updates: { title?: string; amount?: number; type?: string; date?: string; sharedWithCollaboratorIds?: string[] }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.date !== undefined) dbUpdates.date = updates.date;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('financial_records').update(dbUpdates).eq('id', recordId);
            if (error) throw error;
        }

        // Update item_shares if sharedWithCollaboratorIds is provided
        if (updates.sharedWithCollaboratorIds !== undefined) {
            await supabase.from('item_shares')
                .delete()
                .eq('record_type', 'FINANCE')
                .eq('record_id', recordId);

            if (updates.sharedWithCollaboratorIds.length > 0) {
                const itemShares = updates.sharedWithCollaboratorIds.map(personShareId => ({
                    record_type: 'FINANCE',
                    record_id: recordId,
                    person_share_id: personShareId,
                    created_by: user.id
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error updating item shares:', shareError);
            }
        }

        setPeople(prev => prev.map(p => ({
            ...p,
            financial: p.financial.map(f =>
                f.id === recordId
                    ? {
                        ...f,
                        title: updates.title ?? f.title,
                        amount: updates.amount ?? f.amount,
                        type: updates.type ?? f.type,
                        date: updates.date ?? f.date,
                        sharedWithCollaboratorIds: updates.sharedWithCollaboratorIds ?? f.sharedWithCollaboratorIds
                    }
                    : f
            )
        })));
    };

    const deleteFinanceRecord = async (recordId: string) => {
        const { error } = await supabase.from('financial_records').delete().eq('id', recordId);
        if (error) throw error;
        setPeople(prev => prev.map(p => ({ ...p, financial: p.financial.filter(f => f.id !== recordId) })));
    };

    const uploadAvatar = async (personId: string, file: File) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${personId}-${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        const { error: updateError } = await supabase
            .from('people')
            .update({ avatar_url: publicUrl })
            .eq('id', personId);

        if (updateError) throw updateError;
        setPeople(prev => prev.map(p => p.id === personId ? { ...p, avatarUrl: publicUrl } : p));
    };

    const deletePerson = async (personId: string) => {
        const { error } = await supabase.from('people').delete().eq('id', personId);
        if (error) throw error;
        await fetchPeople();
    };

    // ============================================
    // Sharing Functions
    // ============================================

    const shareRecord = async (
        recordType: 'TODO' | 'HEALTH' | 'NOTE' | 'FINANCE',
        recordId: string,
        sourcePersonId: string,
        shareWithEmail: string
    ) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', shareWithEmail)
            .single();

        const { error } = await supabase.from('record_shares').insert({
            record_type: recordType,
            record_id: recordId,
            source_person_id: sourcePersonId,
            shared_by: user.id,
            shared_with_user_id: existingUser?.id || null,
            shared_with_email: shareWithEmail,
            status: 'PENDING'
        });

        if (error) throw error;
        await fetchPeople();
    };

    const unshareRecord = async (shareId: string) => {
        const { error } = await supabase.from('record_shares').delete().eq('id', shareId);
        if (error) throw error;
        await fetchPeople();
    };

    const getPendingShares = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('record_shares')
            .select(`
                *,
                source_person:people!source_person_id(name),
                sharer:profiles!shared_by(full_name, email)
            `)
            .eq('shared_with_user_id', user.id)
            .eq('status', 'PENDING');

        if (error) {
            console.error('Error fetching pending shares:', error);
            return [];
        }

        return data || [];
    };

    const acceptShare = async (shareId: string, mergeIntoPersonId: string | null) => {
        const { error } = await supabase
            .from('record_shares')
            .update({
                status: 'ACCEPTED',
                merged_into_person_id: mergeIntoPersonId
            })
            .eq('id', shareId);

        if (error) throw error;
        await fetchPeople();
    };

    const declineShare = async (shareId: string) => {
        const { error } = await supabase
            .from('record_shares')
            .update({ status: 'DECLINED' })
            .eq('id', shareId);

        if (error) throw error;
    };

    // ============================================
    // Collaboration Functions
    // ============================================

    const linkProfileToUser = async (personId: string, userId: string) => {
        const { error } = await supabase
            .from('people')
            .update({ linked_user_id: userId })
            .eq('id', personId);

        if (error) throw error;
        await fetchPeople();
    };

    // Generate a unique invite token
    const generateInviteToken = async (): Promise<string> => {
        const { data, error } = await supabase.rpc('generate_invite_token');
        if (error) {
            // Fallback to client-side generation using crypto API
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            const randomValues = crypto.getRandomValues(new Uint32Array(12));
            let result = '';
            for (let i = 0; i < 12; i++) {
                result += chars.charAt(randomValues[i] % chars.length);
            }
            return result;
        }
        return data;
    };

    // Generate invite link for a person profile
    const generateInviteLink = async (personId: string): Promise<string> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get person details for snapshot
        const { data: person, error: personError } = await supabase
            .from('people')
            .select('id, name, relation, avatar_url, birthday, email, phone, date_of_birth, gender')
            .eq('id', personId)
            .single();

        if (personError || !person) throw new Error('Person not found');

        // Check if person has email (required for collaboration)
        if (!person.email) {
            throw new Error('Profile must have an email address before sharing. Please add an email to this profile.');
        }

        // Generate unique token
        const inviteToken = await generateInviteToken();

        // Create profile snapshot
        const profileSnapshot: ProfileSnapshot = {
            name: person.name,
            relation: person.relation || '',
            avatarUrl: person.avatar_url || generateAvatarUrl(person.name, person.gender as 'male' | 'female' | 'other'),
            birthday: person.birthday || undefined,
            email: person.email || '',
            phone: person.phone || '',
            dateOfBirth: person.date_of_birth || '',
            gender: (person.gender as 'male' | 'female' | 'other') || undefined
        };

        // Create collaboration request with invite token
        const { error } = await supabase.from('collaboration_requests').insert({
            person_id: personId,
            requester_id: user.id,
            target_email: person.email, // Use person's email as target
            invite_token: inviteToken,
            profile_snapshot: profileSnapshot,
            status: 'PENDING'
        });

        if (error) throw error;

        // Return the invite link
        const baseUrl = window.location.origin;
        return `${baseUrl}/invite/${inviteToken}`;
    };

    const sendCollaborationRequest = async (personId: string, targetUserId?: string, targetEmail?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get person details for snapshot
        const { data: person, error: personError } = await supabase
            .from('people')
            .select('id, name, relation, avatar_url, birthday, email, phone, date_of_birth, gender')
            .eq('id', personId)
            .single();

        if (personError || !person) throw new Error('Person not found');

        // If targetUserId is provided, use it; otherwise try to find user by email
        let finalTargetUserId = targetUserId;
        if (!finalTargetUserId && targetEmail) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', targetEmail)
                .single();
            finalTargetUserId = profile?.id;
        }

        // Generate unique token for shareable link
        const inviteToken = await generateInviteToken();

        // Create profile snapshot
        const profileSnapshot: ProfileSnapshot = {
            name: person.name,
            relation: person.relation || '',
            avatarUrl: person.avatar_url || generateAvatarUrl(person.name, person.gender as 'male' | 'female' | 'other'),
            birthday: person.birthday || undefined,
            email: person.email || '',
            phone: person.phone || '',
            dateOfBirth: person.date_of_birth || '',
            gender: (person.gender as 'male' | 'female' | 'other') || undefined
        };

        const { error } = await supabase.from('collaboration_requests').insert({
            person_id: personId,
            requester_id: user.id,
            target_user_id: finalTargetUserId || null,
            target_email: targetEmail || null,
            invite_token: inviteToken,
            profile_snapshot: profileSnapshot,
            status: 'PENDING'
        });

        if (error) throw error;

        return inviteToken;
    };

    const fetchPendingCollaborationRequests = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Build a lookup of "my saved contacts" so we can display requester names
        // the same way a phone shows a contact name for an incoming message.
        const { data: myContacts, error: contactsError } = await supabase
            .from('people')
            .select('name, email, linked_user_id')
            .eq('created_by', user.id);

        const contactNameByLinkedUserId = new Map<string, string>();
        const contactNameByEmail = new Map<string, string>();
        if (!contactsError && myContacts) {
            myContacts.forEach((p: any) => {
                if (p?.linked_user_id) contactNameByLinkedUserId.set(p.linked_user_id, p.name);
                if (p?.email) contactNameByEmail.set(String(p.email).toLowerCase(), p.name);
            });
        }

        // Fetch requests where user is the target (by ID or email)
        const { data, error } = await supabase
            .from('collaboration_requests')
            .select(`
                *,
                person:people!person_id(name, avatar_url, relation),
                requester:profiles!requester_id(full_name, email, avatar_url)
            `)
            .or(`target_user_id.eq.${user.id},target_email.eq.${user.email}`)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching collaboration requests:', error);
            return [];
        }

        return (data || []).map(req => {
            const requesterProfile = (req.requester as any) || {};
            const requesterEmail = (requesterProfile.email || '').toString();
            const requesterId = (req.requester_id || '').toString();
            const preferredRequesterName =
                contactNameByLinkedUserId.get(requesterId) ||
                (requesterEmail ? contactNameByEmail.get(requesterEmail.toLowerCase()) : undefined) ||
                requesterProfile.full_name ||
                'Unknown';

            return {
                id: req.id,
                personId: req.person_id,
                // Prefer snapshot because receivers typically cannot read the sender's people row pre-acceptance (RLS).
                personName: req.profile_snapshot?.name || (req.person as any)?.name || 'Shared profile details unavailable',
                requesterId: req.requester_id,
                requesterName: preferredRequesterName,
                requesterEmail,
                targetUserId: req.target_user_id,
                targetEmail: req.target_email,
                status: req.status as 'PENDING' | 'ACCEPTED' | 'DECLINED',
                mergedIntoPersonId: req.merged_into_person_id,
                inviteToken: req.invite_token,
                profileSnapshot: req.profile_snapshot as ProfileSnapshot | undefined,
                createdAt: new Date(req.created_at),
                updatedAt: new Date(req.updated_at)
            };
        });
    };

    // Fetch collaboration request by invite token (for invite landing page)
    const fetchCollaborationRequestByToken = async (token: string) => {
    const { data, error } = await supabase
        .rpc('get_collaboration_request_by_token', { p_token: token });

    if (error) {
        console.error('Error fetching collaboration request by token:', error);
        return null;
    }

    const row = data && data[0];
    if (!row) return null;

    return {
        id: row.id,
        personId: row.person_id,
        personName: row.profile_snapshot?.name || (row.person as any)?.name || 'Shared profile details unavailable',
        personAvatarUrl: row.profile_snapshot?.avatarUrl || (row.person as any)?.avatar_url,
        personRelation: row.profile_snapshot?.relation || (row.person as any)?.relation,
        requesterId: row.requester_id,
        requesterName: (row.requester as any)?.full_name || 'Unknown',
        requesterEmail: (row.requester as any)?.email || '',
        requesterAvatarUrl: (row.requester as any)?.avatar_url,
        targetUserId: row.target_user_id,
        targetEmail: row.target_email,
        status: row.status as 'PENDING' | 'ACCEPTED' | 'DECLINED',
        profileSnapshot: row.profile_snapshot as ProfileSnapshot | undefined,
        createdAt: new Date(row.created_at)
    };
    };

    const acceptCollaborationRequest = async (requestId: string, mergeIntoPersonId: string | null, createNewProfile: boolean = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // First, get the request to find the person_id and requester info
        const { data: request, error: fetchError } = await supabase
            .from('collaboration_requests')
            .select('id, person_id, requester_id, target_user_id, target_email, status, profile_snapshot, person:people!person_id(id, name, relation, avatar_url, email, birthday), requester:profiles!requester_id(id, full_name, email, avatar_url)')
            .eq('id', requestId)
            .single();

        if (fetchError || !request) throw new Error('Request not found');

        // Merge rule: if mergeIntoPersonId is provided, we ALWAYS link into that profile and never create a new one.
        const shouldCreateNewProfile = createNewProfile && !mergeIntoPersonId;
        let targetPersonId = mergeIntoPersonId;

        // If creating new profile, create it first
        if (shouldCreateNewProfile) {
            const snapshot = request.profile_snapshot as ProfileSnapshot;
            const { data: newPerson, error: createError } = await supabase
                .from('people')
                .insert({
                    name: snapshot?.name || (request.person as any)?.name || 'New Profile',
                    relation: snapshot?.relation || (request.person as any)?.relation || '',
                    avatar_url: snapshot?.avatarUrl || (request.person as any)?.avatar_url,
                    email: snapshot?.email || null,
                    birthday: snapshot?.birthday || null,
                    created_by: user.id,
                    theme_color: 'bg-brown-100'
                })
                .select()
                .single();

            if (createError) throw createError;
            targetPersonId = newPerson.id;
        }

        // Create bidirectional person_share entries
        // 1. Share requester's person with current user
        const { error: shareError1 } = await supabase.from('person_shares').insert({
            person_id: request.person_id,
            user_id: user.id,
            user_email: user.email
        });
        if (shareError1 && !shareError1.message.includes('duplicate')) {
            console.error('Error creating person_share for acceptor:', shareError1);
            throw new Error('Failed to create sharing access. Please try again.');
        }

        // 2. If we have a target person, share it with the requester (bidirectional)
        if (targetPersonId) {
            const { error: shareError2 } = await supabase.from('person_shares').insert({
                person_id: targetPersonId,
                user_id: request.requester_id,
                user_email: (request.requester as any)?.email
            });
            if (shareError2 && !shareError2.message.includes('duplicate')) {
                console.error('Error creating person_share for requester:', shareError2);
                throw new Error('Failed to create bidirectional sharing. Please try again.');
            }

            // 3. Create profile_links for bidirectional sync
            const { error: linkError } = await supabase.from('profile_links').insert({
                profile_a_id: request.person_id,
                profile_b_id: targetPersonId,
                user_a_id: request.requester_id,
                user_b_id: user.id,
                collaboration_request_id: requestId,
                is_active: true
            });
            if (linkError && !linkError.message.includes('duplicate')) {
                console.error('Error creating profile_link:', linkError);
                throw new Error('Failed to link profiles. Please try again.');
            }
        }

        // Update request status
        const { error: updateError } = await supabase
            .from('collaboration_requests')
            .update({
                status: 'ACCEPTED',
                merged_into_person_id: targetPersonId,
                target_user_id: user.id
            })
            .eq('id', requestId);

        if (updateError) throw updateError;
        await fetchPeople();
    };

    const declineCollaborationRequest = async (requestId: string) => {
        const { error } = await supabase
            .from('collaboration_requests')
            .update({ status: 'DECLINED' })
            .eq('id', requestId);

        if (error) throw error;
        await fetchPeople();
    };

    // Remove a collaborator (deactivate profile link but preserve history)
    const removeCollaborator = async (personId: string, collaboratorUserId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Deactivate profile links
        const { error: linkError } = await supabase
            .from('profile_links')
            .update({ is_active: false })
            .or(`and(profile_a_id.eq.${personId},user_b_id.eq.${collaboratorUserId}),and(profile_b_id.eq.${personId},user_a_id.eq.${collaboratorUserId})`);

        if (linkError) console.error('Error deactivating profile links:', linkError);

        // Remove person_share entry
        const { error: shareError } = await supabase
            .from('person_shares')
            .delete()
            .eq('person_id', personId)
            .eq('user_id', collaboratorUserId);

        if (shareError) throw shareError;
        await fetchPeople();
    };

    // Get collaborators for a person with full details
    const getCollaboratorsForPerson = async (personId: string): Promise<Collaborator[]> => {
        const { data, error } = await supabase
            .from('person_shares')
            .select('id, user_id, user_email, profiles(id, full_name, email, avatar_url)')
            .eq('person_id', personId)
            .not('user_id', 'is', null);

        if (error) {
            console.error('Error fetching collaborators:', error);
            return [];
        }

        return (data || []).map(share => ({
            id: share.id,
            userId: share.user_id!,
            name: (share.profiles as any)?.full_name || share.user_email || 'Unknown',
            email: (share.profiles as any)?.email || share.user_email,
            avatarUrl: (share.profiles as any)?.avatar_url
        }));
    };

    // Auto-create self-profile on first login
    const createSelfProfileIfNeeded = useCallback(async (): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('[Self-Profile] No authenticated user found');
                return false;
            }

            // Check if user already has a self-profile (linked to their user_id AND created by them)
            const { data: existingLinkedProfile, error: linkedError } = await supabase
                .from('people')
                .select('id')
                .eq('linked_user_id', user.id)
                .eq('created_by', user.id)
                .single();

            if (linkedError && linkedError.code !== 'PGRST116') {
                // PGRST116 = no rows returned, which is expected for new users
                console.error('[Self-Profile] Error checking for linked profile:', linkedError);
            }

            if (existingLinkedProfile) {
                // Self-profile already exists
                console.log('[Self-Profile] Already exists:', existingLinkedProfile.id);
                return true;
            }

            // Also check if user has a "Self" relation profile that just needs linking
            const { data: existingSelfRelation } = await supabase
                .from('people')
                .select('id')
                .eq('created_by', user.id)
                .eq('relation', 'Self')
                .single();

            if (existingSelfRelation) {
                // Update existing Self profile to link it to user
                console.log('[Self-Profile] Found unlinked Self profile, linking:', existingSelfRelation.id);
                const { error: updateError } = await supabase
                    .from('people')
                    .update({ linked_user_id: user.id })
                    .eq('id', existingSelfRelation.id);

                if (updateError) {
                    console.error('[Self-Profile] Error linking existing profile:', updateError);
                    return false;
                }
                await fetchPeople();
                return true;
            }

            // Create new self-profile
            const fullName = user.user_metadata.full_name || user.email?.split('@')[0] || 'Me';
            console.log('[Self-Profile] Creating new self-profile for:', fullName);

            const { error: insertError } = await supabase.from('people').insert({
                name: fullName,
                relation: 'Self',
                email: user.email || null,
                phone: null,
                date_of_birth: null,
                gender: null,
                avatar_url: user.user_metadata.avatar_url || null,
                linked_user_id: user.id,
                created_by: user.id,
                theme_color: 'bg-rose-100',
                sharing_preference: 'ASK_EVERY_TIME'
            });

            if (insertError) {
                console.error('[Self-Profile] Error creating self-profile:', insertError);
                return false;
            }

            console.log('[Self-Profile] Successfully created self-profile');
            await fetchPeople();
            return true;
        } catch (err) {
            console.error('[Self-Profile] Unexpected error:', err);
            return false;
        }
    }, [fetchPeople]);

    // Track if self-profile creation is in progress to prevent duplicates
    const selfProfileCreationInProgress = useRef(false);

    // Auto-create self-profile when auth state changes (user logs in)
    useEffect(() => {
        let hasRun = false;

        const runSelfProfileCreation = async () => {
            // Prevent multiple simultaneous runs
            if (selfProfileCreationInProgress.current || hasRun) {
                return;
            }
            selfProfileCreationInProgress.current = true;
            hasRun = true;

            try {
                await createSelfProfileIfNeeded();
            } finally {
                selfProfileCreationInProgress.current = false;
            }
        };

        // Listen for auth state changes to trigger self-profile creation
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                // Only on actual sign-in, not initial session
                setTimeout(runSelfProfileCreation, 500);
            }
        });

        // Run once on mount for existing sessions
        runSelfProfileCreation();

        return () => subscription.unsubscribe();
    }, [createSelfProfileIfNeeded]);

    return {
        people,
        loading,
        error,
        profileLinks,
        refresh: fetchPeople,
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
        // Sharing
        shareRecord,
        unshareRecord,
        getPendingShares,
        acceptShare,
        declineShare,
        // Collaboration
        linkProfileToUser,
        generateInviteLink,
        sendCollaborationRequest,
        fetchPendingCollaborationRequests,
        fetchCollaborationRequestByToken,
        acceptCollaborationRequest,
        declineCollaborationRequest,
        removeCollaborator,
        getCollaboratorsForPerson,
        // Self-profile management
        createSelfProfileIfNeeded
    };
};
