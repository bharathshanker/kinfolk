-- Profile Collaboration System Migration
-- Adds email/linked_user_id to people, collaboration_requests table, and item_shares table

-- 1. Add email and linked_user_id columns to people table
ALTER TABLE public.people 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Create collaboration_requests table
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Which profile is being shared
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE NOT NULL,
  
  -- Who is requesting collaboration
  requester_id uuid REFERENCES public.profiles(id) NOT NULL,
  
  -- Who is being invited (the profile owner or linked user)
  target_user_id uuid REFERENCES public.profiles(id),
  target_email text, -- For users not yet registered
  
  -- Status
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  
  -- Where the collaborator merged this into (their own profile)
  merged_into_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Prevent duplicate requests
  UNIQUE(person_id, requester_id, target_user_id)
);

ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create item_shares table (many-to-many between records and person_shares)
CREATE TABLE IF NOT EXISTS public.item_shares (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Record identification (polymorphic reference)
  record_type text NOT NULL CHECK (record_type IN ('TODO', 'HEALTH', 'NOTE', 'FINANCE')),
  record_id uuid NOT NULL,
  
  -- Which person_share (collaborator) this is shared with
  person_share_id uuid REFERENCES public.person_shares(id) ON DELETE CASCADE NOT NULL,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Prevent duplicate shares
  UNIQUE(record_type, record_id, person_share_id)
);

ALTER TABLE public.item_shares ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for collaboration_requests

-- Users can view requests they created or received
CREATE POLICY "Users can view their collaboration requests"
  ON public.collaboration_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR 
    target_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.id = person_id AND p.created_by = auth.uid()
    )
  );

-- Users can create requests for profiles they own
CREATE POLICY "Users can create collaboration requests"
  ON public.collaboration_requests FOR INSERT
  WITH CHECK (
    requester_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.people 
      WHERE id = person_id AND created_by = auth.uid()
    )
  );

-- Users can update requests they received
CREATE POLICY "Users can update collaboration requests they received"
  ON public.collaboration_requests FOR UPDATE
  USING (target_user_id = auth.uid());

-- Users can delete requests they created
CREATE POLICY "Users can delete their collaboration requests"
  ON public.collaboration_requests FOR DELETE
  USING (requester_id = auth.uid());

-- 5. RLS Policies for item_shares

-- Users can view item shares for person_shares they have access to
CREATE POLICY "Users can view item shares for their collaborations"
  ON public.item_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.person_shares ps
      WHERE ps.id = person_share_id AND ps.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.item_shares is2
      JOIN public.person_shares ps2 ON ps2.id = is2.person_share_id
      JOIN public.people p ON p.id = ps2.person_id
      WHERE is2.record_type = item_shares.record_type
        AND is2.record_id = item_shares.record_id
        AND p.created_by = auth.uid()
    )
  );

-- Users can create item shares for records they own
CREATE POLICY "Users can create item shares for their records"
  ON public.item_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todos t
      WHERE t.id = record_id AND record_type = 'TODO'
        AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = t.person_id AND p.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.health_records h
      WHERE h.id = record_id AND record_type = 'HEALTH'
        AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = h.person_id AND p.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = record_id AND record_type = 'NOTE'
        AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = n.person_id AND p.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.financial_records f
      WHERE f.id = record_id AND record_type = 'FINANCE'
        AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = f.person_id AND p.created_by = auth.uid())
    )
  );

-- Users can delete item shares for records they own
CREATE POLICY "Users can delete item shares for their records"
  ON public.item_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.todos t
      WHERE t.id = record_id AND record_type = 'TODO'
        AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = t.person_id AND p.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.health_records h
      WHERE h.id = record_id AND record_type = 'HEALTH'
        AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = h.person_id AND p.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = record_id AND record_type = 'NOTE'
        AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = n.person_id AND p.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.financial_records f
      WHERE f.id = record_id AND record_type = 'FINANCE'
        AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = f.person_id AND p.created_by = auth.uid())
    )
  );

-- 6. Helper function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on collaboration_requests
CREATE TRIGGER update_collaboration_requests_updated_at
  BEFORE UPDATE ON public.collaboration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

