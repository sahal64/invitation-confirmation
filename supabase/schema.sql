-- ==============================================================================
-- INVITATION CONFIRMATION - NATIONAL DAY DATABASE SCHEMA & POLICIES
-- ==============================================================================

-- 1. Create Submissions Table
CREATE TABLE IF NOT EXISTS public.invitation_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    organisation TEXT DEFAULT '',
    email TEXT DEFAULT '',
    job_title TEXT NOT NULL,
    "join" TEXT[] NOT NULL,
    has_guest BOOLEAN DEFAULT false NOT NULL,
    guest_count INTEGER DEFAULT 0 NOT NULL,
    comments INTEGER CHECK (comments >= 1 AND comments <= 5),
    locale TEXT DEFAULT 'en' NOT NULL
);

-- Migrations for existing tables:
-- 1) Allow submissions without email address:
ALTER TABLE public.invitation_submissions ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.invitation_submissions ALTER COLUMN email SET DEFAULT '';

-- 2) Accompanying guest columns:
ALTER TABLE public.invitation_submissions 
ADD COLUMN IF NOT EXISTS has_guest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 0;

-- 3) Organisation column:
ALTER TABLE public.invitation_submissions 
ADD COLUMN IF NOT EXISTS organisation TEXT DEFAULT '';

-- 2. Indexes for search and sorting performance
CREATE INDEX IF NOT EXISTS idx_invitation_created_at ON public.invitation_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON public.invitation_submissions (email);
CREATE INDEX IF NOT EXISTS idx_invitation_locale ON public.invitation_submissions (locale);

-- 3. Enable Row Level Security (RLS)
-- Crucial: This guarantees that public visitors cannot query or list entries.
ALTER TABLE public.invitation_submissions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Allow Public Anonymous Users to INSERT only
-- Anyone visiting the public form can submit a response, but cannot read or query.
CREATE POLICY "Allow public insert only"
    ON public.invitation_submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 5. RLS Policy: Allow Authenticated Admins to SELECT (Read)
-- Only signed-in admin accounts in Supabase Auth can read submissions.
CREATE POLICY "Allow authenticated admins to read submissions"
    ON public.invitation_submissions
    FOR SELECT
    TO authenticated
    USING (true);

-- 6. RLS Policy: Allow Authenticated Admins to DELETE
CREATE POLICY "Allow authenticated admins to delete submissions"
    ON public.invitation_submissions
    FOR DELETE
    TO authenticated
    USING (true);

-- ==============================================================================
-- INSTRUCTIONS TO CREATE YOUR INITIAL ADMIN ACCOUNT IN SUPABASE:
--
-- 1. In your Supabase dashboard, navigate to "Authentication" -> "Users".
-- 2. Click "Add User" -> "Create User".
-- 3. Enter your admin email (e.g. admin@event.com) and a strong password.
-- 4. Mark "Auto Confirm User" so the account is immediately active.
-- 5. Set your Vite environment variables in .env:
--      VITE_SUPABASE_URL=https://your-project.supabase.co
--      VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
-- ==============================================================================

