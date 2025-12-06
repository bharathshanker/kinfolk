-- Add description column to todos for additional context
ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS description TEXT;
