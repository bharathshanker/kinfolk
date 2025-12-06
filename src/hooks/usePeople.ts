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

            // 3. Map to Domain Model
            const mappedPeople: Person[] = peopleData.map(p => {
                const pHealth = healthRes.data.filter(h => h.person_id === p.id);
                const pTodos = todosRes.data.filter(t => t.person_id === p.id);
                const pNotes = notesRes.data.filter(n => n.person_id === p.id);
                const pFinance = financeRes.data.filter(f => f.person_id === p.id);
                const pShares = sharesRes.data.filter(s => s.person_id === p.id);

                const collaborators = pShares.map(s => (s.profiles as any)?.full_name || s.user_email || 'Unknown');

                return {
                    id: p.id,
                    name: p.name,
                    relation: p.relation || '',
                    avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
                    themeColor: p.theme_color || 'bg-stone-100',
                    birthday: p.birthday || '',
                    collaborators,
                    sharingPreference: (p.sharing_preference as SharingPreference) || 'ASK_EVERY_TIME',
                    health: pHealth.map(h => ({
                        id: h.id,
                        title: h.title,
                        date: h.date,
                        type: (h.type as any) || 'OTHER',
                        notes: h.notes || '',
                        attachments: h.attachments || [],
                        meta: { isShared: collaborators.length > 0, sharedWith: collaborators, lastUpdatedBy: 'You', updatedAt: new Date(h.created_at || '') }
                    })),
                    todos: pTodos.map(t => ({
                        id: t.id,
                        title: t.title,
                        description: (t as any).description || '',
                        dueDate: t.due_date || '',
                        isCompleted: t.is_completed || false,
                        priority: (t.priority as any) || 'MEDIUM',
                        meta: { isShared: collaborators.length > 0, sharedWith: collaborators, lastUpdatedBy: 'You', updatedAt: new Date(t.created_at || '') }
                    })),
                    notes: pNotes.map(n => ({
                        id: n.id,
                        title: n.title || '',
                        content: n.content || '',
                        tags: n.tags || [],
                        meta: { isShared: collaborators.length > 0, sharedWith: collaborators, lastUpdatedBy: 'You', updatedAt: new Date(n.created_at || '') }
                    })),
                    financial: pFinance.map(f => ({
                        id: f.id,
                        title: f.title,
                        amount: f.amount,
                        type: (f.type as any) || 'EXPENSE',
                        date: f.date,
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
    const addPerson = async (name: string, relation: string, birthday?: string, file?: File) => {
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
            birthday: updatedPerson.birthday === '' ? null : updatedPerson.birthday
        }).eq('id', updatedPerson.id);

        if (error) throw error;

        // For simplicity in this phase, we won't diff the arrays here.
        // We will expose specific methods for adding/toggling items.
        await fetchPeople();
    };

    const addTodo = async (personId: string, title: string, date: string, priority: string = 'MEDIUM', description: string = '') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('todos').insert({
            person_id: personId,
            title,
            due_date: date,
            priority,
            description: description || null,
            created_by: user.id
        });
        if (error) throw error;
        await fetchPeople();
    };

    const updateTodo = async (todoId: string, updates: { title?: string; dueDate?: string; priority?: string; description?: string; isCompleted?: boolean }) => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;

        const { error } = await supabase.from('todos').update(dbUpdates).eq('id', todoId);
        if (error) throw error;
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

    const addHealthRecord = async (personId: string, title: string, date: string, notes: string, type: string, files?: File[]) => {
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
            }).select();

            if (error) {
                console.error('Error inserting health record:', error);
                alert(`Failed to save health record: ${error.message}`);
                throw error;
            }

            console.log('Health record inserted successfully:', data);
            await fetchPeople();
        } catch (err: any) {
            console.error('Unexpected error in addHealthRecord:', err);
            alert(`An error occurred: ${err.message || 'Unknown error'}`);
        }
    };

    const updateHealthRecord = async (recordId: string, updates: { title?: string; date?: string; notes?: string; type?: string }) => {
        const { error } = await supabase.from('health_records').update(updates).eq('id', recordId);
        if (error) throw error;
        await fetchPeople();
    };

    const deleteHealthRecord = async (recordId: string) => {
        const { error } = await supabase.from('health_records').delete().eq('id', recordId);
        if (error) throw error;
        await fetchPeople();
    };

    const addNote = async (personId: string, title: string, content: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('notes').insert({
            person_id: personId,
            title,
            content,
            created_by: user.id
        });
        if (error) throw error;
        await fetchPeople();
    };

    const updateNote = async (noteId: string, updates: { title?: string; content?: string }) => {
        const { error } = await supabase.from('notes').update(updates).eq('id', noteId);
        if (error) throw error;
        await fetchPeople();
    };

    const deleteNote = async (noteId: string) => {
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) throw error;
        await fetchPeople();
    };

    const addFinanceRecord = async (personId: string, title: string, amount: number, type: string, date: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('financial_records').insert({
            person_id: personId,
            title,
            amount,
            type,
            date,
            created_by: user.id
        });
        if (error) throw error;
        await fetchPeople();
    };

    const updateFinanceRecord = async (recordId: string, updates: { title?: string; amount?: number; type?: string; date?: string }) => {
        const { error } = await supabase.from('financial_records').update(updates).eq('id', recordId);
        if (error) throw error;
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
        declineShare
    };
};
