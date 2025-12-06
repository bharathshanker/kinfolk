import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Person, HealthRecord, TodoItem, Note, SharingPreference } from '../../types';
import { Database } from '../types/supabase';

type PersonRow = Database['public']['Tables']['people']['Row'];
type HealthRow = Database['public']['Tables']['health_records']['Row'];
type TodoRow = Database['public']['Tables']['todos']['Row'];
type NoteRow = Database['public']['Tables']['notes']['Row'];
type FinanceRow = Database['public']['Tables']['financial_records']['Row'];

export const usePeople = () => {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPeople = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch People
            const { data: peopleData, error: peopleError } = await supabase
                .from('people')
                .select('*')
                .order('created_at', { ascending: false });

            if (peopleError) throw peopleError;

            // 2. Fetch related data for all people (in parallel for simplicity, or could be joined)
            // For a small family app, fetching all is fine.
            const personIds = peopleData.map(p => p.id);

            if (personIds.length === 0) {
                setPeople([]);
                return;
            }

            const [healthRes, todosRes, notesRes, financeRes, sharesRes] = await Promise.all([
                supabase.from('health_records').select('*').in('person_id', personIds),
                supabase.from('todos').select('*').in('person_id', personIds),
                supabase.from('notes').select('*').in('person_id', personIds),
                supabase.from('financial_records').select('*').in('person_id', personIds),
                supabase.from('person_shares').select('*, profiles(full_name, email)').in('person_id', personIds)
            ]);

            if (healthRes.error) throw healthRes.error;
            if (todosRes.error) throw todosRes.error;
            if (notesRes.error) throw notesRes.error;
            if (financeRes.error) throw financeRes.error;
            if (sharesRes.error) throw sharesRes.error;

            // Collect all record IDs for filtering item_shares (security: only fetch shares for our records)
            const healthRecordIds = (healthRes.data || []).map(h => h.id);
            const todoRecordIds = (todosRes.data || []).map(t => t.id);
            const noteRecordIds = (notesRes.data || []).map(n => n.id);
            const financeRecordIds = (financeRes.data || []).map(f => f.id);

            // Fetch item_shares only for records we have access to
            const itemSharesQueries = [];
            if (healthRecordIds.length > 0) {
                itemSharesQueries.push(
                    supabase.from('item_shares')
                        .select('*')
                        .eq('record_type', 'HEALTH')
                        .in('record_id', healthRecordIds)
                );
            }
            if (todoRecordIds.length > 0) {
                itemSharesQueries.push(
                    supabase.from('item_shares')
                        .select('*')
                        .eq('record_type', 'TODO')
                        .in('record_id', todoRecordIds)
                );
            }
            if (noteRecordIds.length > 0) {
                itemSharesQueries.push(
                    supabase.from('item_shares')
                        .select('*')
                        .eq('record_type', 'NOTE')
                        .in('record_id', noteRecordIds)
                );
            }
            if (financeRecordIds.length > 0) {
                itemSharesQueries.push(
                    supabase.from('item_shares')
                        .select('*')
                        .eq('record_type', 'FINANCE')
                        .in('record_id', financeRecordIds)
                );
            }

            // Execute all item_shares queries in parallel
            const itemSharesResults = itemSharesQueries.length > 0 
                ? await Promise.all(itemSharesQueries)
                : [];

            // Combine all item_shares results
            const allItemShares = itemSharesResults.flatMap(res => {
                if (res.error) {
                    console.error('Error fetching item shares:', res.error);
                    return [];
                }
                return res.data || [];
            });

            // 3. Map to Domain Model
            const mappedPeople: Person[] = peopleData.map(p => {
                const pHealth = healthRes.data.filter(h => h.person_id === p.id);
                const pTodos = todosRes.data.filter(t => t.person_id === p.id);
                const pNotes = notesRes.data.filter(n => n.person_id === p.id);
                const pFinance = financeRes.data.filter(f => f.person_id === p.id);
                const pShares = sharesRes.data.filter(s => s.person_id === p.id);

                const collaborators = pShares.map(s => (s.profiles as any)?.full_name || s.user_email || 'Unknown');

                // Get item shares for each record type (already filtered by record IDs)
                const healthItemShares = allItemShares.filter(is => is.record_type === 'HEALTH');
                const todoItemShares = allItemShares.filter(is => is.record_type === 'TODO');
                const noteItemShares = allItemShares.filter(is => is.record_type === 'NOTE');
                const financeItemShares = allItemShares.filter(is => is.record_type === 'FINANCE');

                return {
                    id: p.id,
                    name: p.name,
                    relation: p.relation || '',
                    avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
                    themeColor: p.theme_color || 'bg-stone-100',
                    birthday: p.birthday || '',
                    email: p.email || undefined,
                    linkedUserId: p.linked_user_id || undefined,
                    collaborators,
                    sharingPreference: (p.sharing_preference as SharingPreference) || 'ASK_EVERY_TIME',
                    health: pHealth.map(h => ({
                        id: h.id,
                        title: h.title,
                        date: h.date,
                        type: (h.type as any) || 'OTHER',
                        notes: h.notes || '',
                        attachments: h.attachments || [],
                        sharedWithCollaboratorIds: healthItemShares.filter(is => is.record_id === h.id).map(is => is.person_share_id),
                        meta: { isShared: collaborators.length > 0, sharedWith: collaborators, lastUpdatedBy: 'You', updatedAt: new Date(h.created_at || '') }
                    })),
                    todos: pTodos.map(t => ({
                        id: t.id,
                        title: t.title,
                        description: (t as any).description || '',
                        dueDate: t.due_date || '',
                        isCompleted: t.is_completed || false,
                        priority: (t.priority as any) || 'MEDIUM',
                        sharedWithCollaboratorIds: todoItemShares.filter(is => is.record_id === t.id).map(is => is.person_share_id),
                        meta: { isShared: collaborators.length > 0, sharedWith: collaborators, lastUpdatedBy: 'You', updatedAt: new Date(t.created_at || '') }
                    })),
                    notes: pNotes.map(n => ({
                        id: n.id,
                        title: n.title || '',
                        content: n.content || '',
                        tags: n.tags || [],
                        sharedWithCollaboratorIds: noteItemShares.filter(is => is.record_id === n.id).map(is => is.person_share_id),
                        meta: { isShared: collaborators.length > 0, sharedWith: collaborators, lastUpdatedBy: 'You', updatedAt: new Date(n.created_at || '') }
                    })),
                    financial: pFinance.map(f => ({
                        id: f.id,
                        title: f.title,
                        amount: f.amount,
                        type: (f.type as any) || 'EXPENSE',
                        date: f.date,
                        sharedWithCollaboratorIds: financeItemShares.filter(is => is.record_id === f.id).map(is => is.person_share_id),
                        meta: { isShared: collaborators.length > 0, sharedWith: collaborators, lastUpdatedBy: 'You', updatedAt: new Date(f.created_at || '') }
                    }))
                };
            });

            setPeople(mappedPeople);

        } catch (err: any) {
            console.error('Error fetching people:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchPeople();
    }, []);

    // CRUD Operations
    const addPerson = async (name: string, relation: string, birthday?: string, file?: File, email?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let avatarUrl = null;

        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`; // Temp ID not available yet, use random
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

        const { error } = await supabase.from('people').insert({
            name,
            relation,
            birthday: birthday || null,
            avatar_url: avatarUrl,
            email: email || null,
            created_by: user.id,
            theme_color: 'bg-stone-100' // Default
        });

        if (error) throw error;
        await fetchPeople();
    };

    const updatePerson = async (updatedPerson: Person) => {
        // This is complex because Person object contains nested arrays.
        // We need to identify what changed.
        // For now, let's assume this is mostly for updating the Profile fields.
        // Sub-items (todos, health) should probably have their own specific methods or we detect changes.

        // Update Profile
        const { error } = await supabase.from('people').update({
            name: updatedPerson.name,
            relation: updatedPerson.relation,
            sharing_preference: updatedPerson.sharingPreference,
            birthday: updatedPerson.birthday === '' ? null : updatedPerson.birthday,
            email: updatedPerson.email || null
        }).eq('id', updatedPerson.id);

        if (error) throw error;

        // For simplicity in this phase, we won't diff the arrays here.
        // We will expose specific methods for adding/toggling items.
        await fetchPeople();
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
                person_share_id: personShareId
            }));
            const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
            if (shareError) console.error('Error creating item shares:', shareError);
        }

        await fetchPeople();
    };

    const updateTodo = async (todoId: string, updates: { title?: string; dueDate?: string; priority?: string; description?: string; isCompleted?: boolean; sharedWithCollaboratorIds?: string[] }) => {
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
                    person_share_id: personShareId
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error updating item shares:', shareError);
            }
        }

        await fetchPeople();
    };

    const deleteTodo = async (todoId: string) => {
        const { error } = await supabase.from('todos').delete().eq('id', todoId);
        if (error) throw error;
        await fetchPeople();
    };

    const toggleTodo = async (todoId: string, isCompleted: boolean) => {
        const { error } = await supabase.from('todos').update({ is_completed: isCompleted }).eq('id', todoId);
        if (error) throw error;
        await fetchPeople();
    };

    const addHealthRecord = async (personId: string, title: string, date: string, notes: string, type: string, files?: File[], sharedWithCollaboratorIds?: string[]) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('No user found when adding health record');
                alert('You must be logged in to add health records');
                return;
            }

            console.log('Adding health record:', { personId, title, date, notes, type, filesCount: files?.length || 0 });

            let attachmentUrls: string[] = [];

            if (files && files.length > 0) {
                console.log('Uploading files to Health Records bucket...');
                for (const file of files) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${personId}/${Date.now()}_${Math.random()}.${fileExt}`;
                    console.log('Uploading file:', fileName);

                    const { error: uploadError, data: uploadData } = await supabase.storage
                        .from('Health Records')
                        .upload(fileName, file);

                    if (uploadError) {
                        console.error('Error uploading file:', uploadError);
                        alert(`Failed to upload file ${file.name}: ${uploadError.message}`);
                        continue;
                    }

                    console.log('File uploaded successfully:', uploadData);

                    const { data: { publicUrl } } = supabase.storage
                        .from('Health Records')
                        .getPublicUrl(fileName);

                    console.log('Public URL:', publicUrl);
                    attachmentUrls.push(publicUrl);
                }
            }

            console.log('Inserting health record with attachments:', attachmentUrls);

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
                    person_share_id: personShareId
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error creating item shares:', shareError);
            }

            console.log('Health record inserted successfully:', data);
            await fetchPeople();
        } catch (err: any) {
            console.error('Unexpected error in addHealthRecord:', err);
            alert(`An error occurred: ${err.message || 'Unknown error'}`);
        }
    };

    const updateHealthRecord = async (recordId: string, updates: { title?: string; date?: string; notes?: string; type?: string; sharedWithCollaboratorIds?: string[] }) => {
        const { error } = await supabase.from('health_records').update(updates).eq('id', recordId);
        if (error) throw error;

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
                    person_share_id: personShareId
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error updating item shares:', shareError);
            }
        }

        await fetchPeople();
    };

    const deleteHealthRecord = async (recordId: string) => {
        const { error } = await supabase.from('health_records').delete().eq('id', recordId);
        if (error) throw error;
        await fetchPeople();
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
                person_share_id: personShareId
            }));
            const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
            if (shareError) console.error('Error creating item shares:', shareError);
        }

        await fetchPeople();
    };

    const updateNote = async (noteId: string, updates: { title?: string; content?: string; sharedWithCollaboratorIds?: string[] }) => {
        const { error } = await supabase.from('notes').update(updates).eq('id', noteId);
        if (error) throw error;

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
                    person_share_id: personShareId
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error updating item shares:', shareError);
            }
        }

        await fetchPeople();
    };

    const deleteNote = async (noteId: string) => {
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) throw error;
        await fetchPeople();
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
                person_share_id: personShareId
            }));
            const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
            if (shareError) console.error('Error creating item shares:', shareError);
        }

        await fetchPeople();
    };

    const updateFinanceRecord = async (recordId: string, updates: { title?: string; amount?: number; type?: string; date?: string; sharedWithCollaboratorIds?: string[] }) => {
        const { error } = await supabase.from('financial_records').update(updates).eq('id', recordId);
        if (error) throw error;

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
                    person_share_id: personShareId
                }));
                const { error: shareError } = await supabase.from('item_shares').insert(itemShares);
                if (shareError) console.error('Error updating item shares:', shareError);
            }
        }

        await fetchPeople();
    };

    const deleteFinanceRecord = async (recordId: string) => {
        const { error } = await supabase.from('financial_records').delete().eq('id', recordId);
        if (error) throw error;
        await fetchPeople();
    };

    const uploadAvatar = async (personId: string, file: File) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${personId}-${Math.random()}.${fileExt}`;
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
        await fetchPeople();
    };

    const deletePerson = async (personId: string) => {
        const { error } = await supabase.from('people').delete().eq('id', personId);
        if (error) throw error;
        await fetchPeople();
    };

    // --- Sharing Functions ---

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

    // --- Collaboration Functions ---

    const linkProfileToUser = async (personId: string, userId: string) => {
        const { error } = await supabase
            .from('people')
            .update({ linked_user_id: userId })
            .eq('id', personId);

        if (error) throw error;
        await fetchPeople();
    };

    const sendCollaborationRequest = async (personId: string, targetUserId?: string, targetEmail?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

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

        const { error } = await supabase.from('collaboration_requests').insert({
            person_id: personId,
            requester_id: user.id,
            target_user_id: finalTargetUserId || null,
            target_email: targetEmail || null,
            status: 'PENDING'
        });

        if (error) throw error;
        // TODO: Send email if targetEmail provided and no user found
    };

    const fetchPendingCollaborationRequests = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('collaboration_requests')
            .select(`
                *,
                person:people!person_id(name),
                requester:profiles!requester_id(full_name, email)
            `)
            .eq('target_user_id', user.id)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching collaboration requests:', error);
            return [];
        }

        return (data || []).map(req => ({
            id: req.id,
            personId: req.person_id,
            personName: (req.person as any)?.name || 'Unknown',
            requesterId: req.requester_id,
            requesterName: (req.requester as any)?.full_name || 'Unknown',
            requesterEmail: (req.requester as any)?.email || '',
            targetUserId: req.target_user_id,
            targetEmail: req.target_email,
            status: req.status as 'PENDING' | 'ACCEPTED' | 'DECLINED',
            mergedIntoPersonId: req.merged_into_person_id,
            createdAt: new Date(req.created_at),
            updatedAt: new Date(req.updated_at)
        }));
    };

    const acceptCollaborationRequest = async (requestId: string, mergeIntoPersonId: string | null) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // First, get the request to find the person_id
        const { data: request, error: fetchError } = await supabase
            .from('collaboration_requests')
            .select('person_id')
            .eq('id', requestId)
            .single();

        if (fetchError || !request) throw new Error('Request not found');

        // Create person_share entry
        const { error: shareError } = await supabase.from('person_shares').insert({
            person_id: mergeIntoPersonId || request.person_id,
            user_id: user.id
        });

        if (shareError) throw shareError;

        // Update request status
        const { error: updateError } = await supabase
            .from('collaboration_requests')
            .update({
                status: 'ACCEPTED',
                merged_into_person_id: mergeIntoPersonId
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

    return {
        people,
        loading,
        error,
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
        sendCollaborationRequest,
        fetchPendingCollaborationRequests,
        acceptCollaborationRequest,
        declineCollaborationRequest
    };
};
