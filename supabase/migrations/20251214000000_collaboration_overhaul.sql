-- Collaboration Feature Overhaul Migration
-- Adxds profile linking, invite tokens, and fixes item sharing visibility
-- Run this entire file in one transaction

BEGIN;

-- ============================================
-- 1. ADD INVITE TOKEN & PROFILE SNAPSHOT TO COLLABORATION_REQUESTS
-- ============================================

-- Add invite_token for shareable links
ALTER TABLE public.collaboration_requests 
  ADD COLUMN IF NOT EXISTS invite_token text;

-- Add unique constraint separately (in case column already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'collaboration_requests_invite_token_key'
  ) THEN
    ALTER TABLE public.collaboration_requests ADD CONSTRAINT collaboration_requests_invite_token_key UNIQUE (invite_token);
  END IF;
END $$;

-- Add profile_snapshot to store profile preview data for the receiver
ALTER TABLE public.collaboration_requests 
  ADD COLUMN IF NOT EXISTS profile_snapshot jsonb;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_invite_token 
  ON public.collaboration_requests(invite_token);

-- ============================================
-- 2. CREATE PROFILE_LINKS TABLE FOR BIDIRECTIONAL SYNC
-- ============================================

-- Drop if exists and recreate to ensure correct schema
DROP TABLE IF EXISTS public.profile_links CASCADE;

-- This table links two profiles (from different users) that represent the same person
-- When profiles are linked, items shared on one appear on the other
CREATE TABLE public.profile_links (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- The two linked profiles (order doesn't matter)
  profile_a_id uuid REFERENCES public.people(id) ON DELETE CASCADE NOT NULL,
  profile_b_id uuid REFERENCES public.people(id) ON DELETE CASCADE NOT NULL,
  
  -- User who owns profile_a
  user_a_id uuid REFERENCES public.profiles(id) NOT NULL,
  -- User who owns profile_b
  user_b_id uuid REFERENCES public.profiles(id) NOT NULL,
  
  -- Whether the link is still active (false = removed collaboration)
  is_active boolean DEFAULT true,
  
  -- Reference to the collaboration request that created this link
  collaboration_request_id uuid REFERENCES public.collaboration_requests(id) ON DELETE SET NULL,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Prevent duplicate links (in either direction)
  CONSTRAINT unique_profile_link UNIQUE(profile_a_id, profile_b_id),
  CONSTRAINT different_profiles CHECK (profile_a_id != profile_b_id)
);

ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

-- Create indexes for fast lookups
CREATE INDEX idx_profile_links_profile_a ON public.profile_links(profile_a_id);
CREATE INDEX idx_profile_links_profile_b ON public.profile_links(profile_b_id);
CREATE INDEX idx_profile_links_users ON public.profile_links(user_a_id, user_b_id);

-- ============================================
-- 3. ADD CREATED_BY TO ITEM_SHARES
-- ============================================

-- Track who created/shared each item
ALTER TABLE public.item_shares 
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- ============================================
-- 4. UPDATE HAS_ACCESS_TO_PERSON FUNCTION
-- ============================================

-- Drop and recreate the function to include linked profiles
CREATE OR REPLACE FUNCTION public.has_access_to_person(target_person_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN 
    -- User created this person
    EXISTS (
      SELECT 1 FROM public.people
      WHERE id = target_person_id AND created_by = auth.uid()
    ) 
    OR 
    -- User has a person_share for this person
    EXISTS (
      SELECT 1 FROM public.person_shares
      WHERE person_id = target_person_id AND user_id = auth.uid()
    )
    OR
    -- User has a linked profile (active bidirectional link)
    EXISTS (
      SELECT 1 FROM public.profile_links pl
      WHERE pl.is_active = true
        AND (
          (pl.profile_a_id = target_person_id AND pl.user_b_id = auth.uid())
          OR
          (pl.profile_b_id = target_person_id AND pl.user_a_id = auth.uid())
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. RLS POLICIES FOR PROFILE_LINKS
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their profile links" ON public.profile_links;
DROP POLICY IF EXISTS "Users can create profile links" ON public.profile_links;
DROP POLICY IF EXISTS "Users can update their profile links" ON public.profile_links;

-- Users can view their own profile links
CREATE POLICY "Users can view their profile links"
  ON public.profile_links FOR SELECT
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Users can create profile links (via collaboration acceptance)
CREATE POLICY "Users can create profile links"
  ON public.profile_links FOR INSERT
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Users can update their own profile links (e.g., deactivate)
CREATE POLICY "Users can update their profile links"
  ON public.profile_links FOR UPDATE
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- ============================================
-- 6. UPDATE COLLABORATION_REQUESTS RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view their collaboration requests" ON public.collaboration_requests;
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

-- Secure function to fetch a collaboration request by invite token
-- This avoids broad RLS exposure while allowing invite landing page access
CREATE OR REPLACE FUNCTION public.get_collaboration_request_by_token(p_token text)
RETURNS SETOF public.collaboration_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.collaboration_requests
  WHERE invite_token = p_token
  LIMIT 1;
END;
$$;

-- ============================================
-- 7. FUNCTION TO GET LINKED PROFILE IDS FOR A USER
-- ============================================

CREATE OR REPLACE FUNCTION public.get_linked_profile_ids(user_uuid uuid)
RETURNS TABLE(profile_id uuid, linked_to_profile_id uuid, other_user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.profile_a_id as profile_id,
    pl.profile_b_id as linked_to_profile_id,
    pl.user_b_id as other_user_id
  FROM public.profile_links pl
  WHERE pl.user_a_id = user_uuid AND pl.is_active = true
  UNION ALL
  SELECT 
    pl.profile_b_id as profile_id,
    pl.profile_a_id as linked_to_profile_id,
    pl.user_a_id as other_user_id
  FROM public.profile_links pl
  WHERE pl.user_b_id = user_uuid AND pl.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNCTION TO MATCH PENDING REQUESTS BY EMAIL ON USER SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.link_pending_requests_to_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Update any pending collaboration requests that were sent to this email
  UPDATE public.collaboration_requests
  SET target_user_id = NEW.id
  WHERE target_email = NEW.email
    AND target_user_id IS NULL
    AND status = 'PENDING';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table (fires when new user signs up)
DROP TRIGGER IF EXISTS on_profile_created_link_requests ON public.profiles;
CREATE TRIGGER on_profile_created_link_requests
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_pending_requests_to_user();

-- ============================================
-- 9. FUNCTION TO GENERATE UNIQUE INVITE TOKEN
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. UPDATE ITEM_SHARES RLS TO INCLUDE LINKED PROFILES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view item shares for their collaborations" ON public.item_shares;
DROP POLICY IF EXISTS "Users can create item shares for their records" ON public.item_shares;
DROP POLICY IF EXISTS "Users can delete item shares for their records" ON public.item_shares;

-- Users can view item shares for profiles they have access to (including linked)
CREATE POLICY "Users can view item shares for their collaborations"
  ON public.item_shares FOR SELECT
  USING (
    -- Direct person_share access
    EXISTS (
      SELECT 1 FROM public.person_shares ps
      WHERE ps.id = person_share_id AND ps.user_id = auth.uid()
    ) 
    OR
    -- Owner of the record's profile
    EXISTS (
      SELECT 1 FROM public.person_shares ps
      JOIN public.people p ON p.id = ps.person_id
      WHERE ps.id = person_share_id AND p.created_by = auth.uid()
    )
    OR
    -- Linked profile access
    EXISTS (
      SELECT 1 FROM public.person_shares ps
      JOIN public.profile_links pl ON (
        (pl.profile_a_id = ps.person_id AND pl.user_b_id = auth.uid())
        OR (pl.profile_b_id = ps.person_id AND pl.user_a_id = auth.uid())
      )
      WHERE ps.id = person_share_id AND pl.is_active = true
    )
  );

-- Users can create item shares for records on profiles they own or have access to
CREATE POLICY "Users can create item shares for their records"
  ON public.item_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todos t
      JOIN public.people p ON p.id = t.person_id
      WHERE t.id = record_id AND record_type = 'TODO'
        AND (p.created_by = auth.uid() OR has_access_to_person(p.id))
    ) OR
    EXISTS (
      SELECT 1 FROM public.health_records h
      JOIN public.people p ON p.id = h.person_id
      WHERE h.id = record_id AND record_type = 'HEALTH'
        AND (p.created_by = auth.uid() OR has_access_to_person(p.id))
    ) OR
    EXISTS (
      SELECT 1 FROM public.notes n
      JOIN public.people p ON p.id = n.person_id
      WHERE n.id = record_id AND record_type = 'NOTE'
        AND (p.created_by = auth.uid() OR has_access_to_person(p.id))
    ) OR
    EXISTS (
      SELECT 1 FROM public.financial_records f
      JOIN public.people p ON p.id = f.person_id
      WHERE f.id = record_id AND record_type = 'FINANCE'
        AND (p.created_by = auth.uid() OR has_access_to_person(p.id))
    )
  );

-- Users can delete item shares they created or for records they own
CREATE POLICY "Users can delete item shares for their records"
  ON public.item_shares FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.todos t
      JOIN public.people p ON p.id = t.person_id
      WHERE t.id = record_id AND record_type = 'TODO' AND p.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.health_records h
      JOIN public.people p ON p.id = h.person_id
      WHERE h.id = record_id AND record_type = 'HEALTH' AND p.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.notes n
      JOIN public.people p ON p.id = n.person_id
      WHERE n.id = record_id AND record_type = 'NOTE' AND p.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.financial_records f
      JOIN public.people p ON p.id = f.person_id
      WHERE f.id = record_id AND record_type = 'FINANCE' AND p.created_by = auth.uid()
    )
  );

-- ============================================
-- 11. TRIGGER TO UPDATE UPDATED_AT ON PROFILE_LINKS
-- ============================================

-- Drop if exists first
DROP TRIGGER IF EXISTS update_profile_links_updated_at ON public.profile_links;

CREATE TRIGGER update_profile_links_updated_at
  BEFORE UPDATE ON public.profile_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 12. VIEW FOR GETTING SHARED ITEMS WITH SHARER INFO
-- ============================================

DROP VIEW IF EXISTS public.shared_items_view;

CREATE VIEW public.shared_items_view AS
SELECT 
  ish.id as item_share_id,
  ish.record_type,
  ish.record_id,
  ish.person_share_id,
  ish.created_by as shared_by_user_id,
  ish.created_at as shared_at,
  ps.person_id,
  ps.user_id as collaborator_user_id,
  pr.full_name as shared_by_name,
  pr.email as shared_by_email
FROM public.item_shares ish
JOIN public.person_shares ps ON ps.id = ish.person_share_id
LEFT JOIN public.profiles pr ON pr.id = ish.created_by;

COMMIT;
