-- ==============================================================================
-- DYNAMIC QR CODE MANAGEMENT MIGRATION FOR SUPABASE POSTGRESQL
-- Table: qr_codes
-- ==============================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id TEXT NOT NULL,
    title TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_qr_codes_qr_id UNIQUE (qr_id)
);

-- 2. Indexes for high-performance public lookups and filtering
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_id ON public.qr_codes (qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_is_active ON public.qr_codes (is_active);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read active qr codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Allow authenticated admins to read all qr codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Allow authenticated admins to insert qr codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Allow authenticated admins to update qr codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Allow authenticated admins to delete qr codes" ON public.qr_codes;

-- 4. Policy: Public / Anon users can ONLY read active QR codes (for 302 redirects)
CREATE POLICY "Allow public read active qr codes"
    ON public.qr_codes
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- 5. Policy: Authenticated Admins can read all QR codes (active & inactive)
CREATE POLICY "Allow authenticated admins to read all qr codes"
    ON public.qr_codes
    FOR SELECT
    TO authenticated
    USING (true);

-- 6. Policy: Authenticated Admins can insert new QR codes
CREATE POLICY "Allow authenticated admins to insert qr codes"
    ON public.qr_codes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 7. Policy: Authenticated Admins can update QR codes
CREATE POLICY "Allow authenticated admins to update qr codes"
    ON public.qr_codes
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Policy: Authenticated Admins can delete QR codes
CREATE POLICY "Allow authenticated admins to delete qr codes"
    ON public.qr_codes
    FOR DELETE
    TO authenticated
    USING (true);

-- 9. Trigger to auto-update updated_at on modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qr_codes_updated_at ON public.qr_codes;
CREATE TRIGGER trigger_qr_codes_updated_at
    BEFORE UPDATE ON public.qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 10. Initial seed record for National Day 2026
INSERT INTO public.qr_codes (qr_id, title, destination_url, is_active)
VALUES (
    'national-day-2026',
    'National Day 2026 Official RSVP',
    'https://invitation-confirmation.vercel.app/',
    true
)
ON CONFLICT (qr_id) DO NOTHING;

