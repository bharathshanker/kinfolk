-- Per-Record Sharing Schema
-- Allows sharing individual records (todos, health, notes, finance) with specific users

-- 1. Record Shares Table
-- Tracks which records are shared with whom
CREATE TABLE public.record_shares (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Record identification (polymorphic reference)
  record_type text NOT NULL CHECK (record_type IN ('TODO', 'HEALTH', 'NOTE', 'FINANCE')),
  record_id uuid NOT NULL,
  
  -- Original owner's person_id (for context)
  source_person_id uuid REFERENCES public.people(id) ON DELETE CASCADE NOT NULL,
  
  -- Who shared it
  shared_by uuid REFERENCES public.profiles(id) NOT NULL,
  
  -- Who it's shared with
  shared_with_user_id uuid REFERENCES public.profiles(id),
  shared_with_email text, -- For pending invites (before they sign up)
  
  -- Receiver's profile merge choice (null until they choose)
  -- This is the person_id in the receiver's account where this record will appear
  merged_into_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  
  -- Status of the share
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Prevent duplicate shares
  UNIQUE(record_type, record_id, shared_with_user_id)
);

ALTER TABLE public.record_shares ENABLE ROW LEVEL SECURITY;

-- 2. Pending Shares View (for notification bell)
-- Shows shares that haven't been accepted/merged yet
CREATE OR REPLACE VIEW public.pending_shares AS
SELECT 
  rs.*,
  p.name as source_person_name,
  pr.full_name as shared_by_name,
  pr.email as shared_by_email
FROM public.record_shares rs
LEFT JOIN public.people p ON rs.source_person_id = p.id
LEFT JOIN public.profiles pr ON rs.shared_by = pr.id
WHERE rs.status = 'PENDING';

-- 3. RLS Policies for record_shares

-- Users can view shares they created or received
CREATE POLICY "Users can view their shares"
  ON public.record_shares FOR SELECT
  USING (
    shared_by = auth.uid() OR 
    shared_with_user_id = auth.uid()
  );

-- Users can create shares for records they have access to
CREATE POLICY "Users can create shares for their records"
  ON public.record_shares FOR INSERT
  WITH CHECK (
    shared_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.people 
      WHERE id = source_person_id AND created_by = auth.uid()
    )
  );

-- Users can update shares they created or received
CREATE POLICY "Users can update their shares"
  ON public.record_shares FOR UPDATE
  USING (
    shared_by = auth.uid() OR 
    shared_with_user_id = auth.uid()
  );

-- Users can delete shares they created
CREATE POLICY "Users can delete their shares"
  ON public.record_shares FOR DELETE
  USING (shared_by = auth.uid());

-- 4. Update RLS for sub-resources to include shared records

-- Helper function: Check if user can view a record via sharing
CREATE OR REPLACE FUNCTION public.has_shared_access_to_record(
  target_record_type text,
  target_record_id uuid
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.record_shares
    WHERE record_type = target_record_type
      AND record_id = target_record_id
      AND shared_with_user_id = auth.uid()
      AND status = 'ACCEPTED'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Todos RLS to include shared records
DROP POLICY IF EXISTS "View todos if access to person." ON public.todos;
CREATE POLICY "View todos if access to person or shared."
  ON public.todos FOR SELECT
  USING (
    has_access_to_person(person_id) OR
    has_shared_access_to_record('TODO', id)
  );

-- Update Health Records RLS to include shared records
DROP POLICY IF EXISTS "View health records if access to person." ON public.health_records;
CREATE POLICY "View health records if access to person or shared."
  ON public.health_records FOR SELECT
  USING (
    has_access_to_person(person_id) OR
    has_shared_access_to_record('HEALTH', id)
  );

-- Update Notes RLS to include shared records
DROP POLICY IF EXISTS "View notes if access to person." ON public.notes;
CREATE POLICY "View notes if access to person or shared."
  ON public.notes FOR SELECT
  USING (
    has_access_to_person(person_id) OR
    has_shared_access_to_record('NOTE', id)
  );

-- Update Financial Records RLS to include shared records (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_records') THEN
    EXECUTE 'DROP POLICY IF EXISTS "View finance if access to person." ON public.financial_records';
    EXECUTE 'CREATE POLICY "View finance if access to person or shared."
      ON public.financial_records FOR SELECT
      USING (
        has_access_to_person(person_id) OR
        has_shared_access_to_record(''FINANCE'', id)
      )';
  END IF;
END $$;
