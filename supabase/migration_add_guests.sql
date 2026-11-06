-- ==============================================================================
-- SUPABASE MIGRATION: Add Dynamic Accompanying Guests Support
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- Add 'guests' JSONB column to invitation_submissions if not already present
ALTER TABLE public.invitation_submissions 
ADD COLUMN IF NOT EXISTS guests JSONB DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.invitation_submissions.guests IS 'Array of accompanying guests, each containing name, organisation, and job_title';

