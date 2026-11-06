import { createClient } from '@supabase/supabase-js';

function isSafeUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getSupabaseClient(serviceRole = false) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key);
}

// Verify that the request is authenticated by an admin
async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return { isAuthorized: false, error: 'Authorization header missing' };

  const sb = getSupabaseClient(true);
  if (!sb) return { isAuthorized: false, error: 'Database service not configured' };

  try {
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) {
      return { isAuthorized: false, error: 'Invalid or expired session token' };
    }
    return { isAuthorized: true, user };
  } catch (err) {
    return { isAuthorized: false, error: err.message || 'Authentication error' };
  }
}

export default async function handler(req, res) {
  // CORS & caching headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  // Verify Admin Authentication
  const auth = await verifyAdminAuth(req);
  if (!auth.isAuthorized) {
    return res.status(401).json({ success: false, error: auth.error || 'Unauthorized' });
  }

  const sb = getSupabaseClient(true);
  if (!sb) {
    return res.status(500).json({ success: false, error: 'Database connection unavailable' });
  }

  try {
    // 1. GET: Fetch all QR codes
    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data: data || [] });
    }

    // 2. POST: Create a new QR code
    if (req.method === 'POST') {
      const { title, qr_id, destination_url, is_active } = req.body || {};

      if (!title || !destination_url) {
        return res.status(400).json({
          success: false,
          error: 'Title and Destination URL are required.',
        });
      }

      if (!isSafeUrl(destination_url)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Destination URL. Only safe http:// and https:// URLs are permitted.',
        });
      }

      // Generate or sanitize slug
      const rawSlug = qr_id || title;
      const cleanSlug = String(rawSlug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (!cleanSlug) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR identifier. Please use alphanumeric characters, dashes or underscores.',
        });
      }

      const newRecord = {
        title: String(title).trim(),
        qr_id: cleanSlug,
        destination_url: String(destination_url).trim(),
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      };

      const { data, error } = await sb
        .from('qr_codes')
        .insert([newRecord])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            success: false,
            error: `A QR code with slug "${cleanSlug}" already exists. Please choose a different identifier.`,
          });
        }
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(201).json({ success: true, data });
    }

    // 3. PUT / PATCH: Update QR code destination, title, or active status
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { id, title, destination_url, is_active } = req.body || {};

      if (!id) {
        return res.status(400).json({ success: false, error: 'QR code ID is required.' });
      }

      const updates = {};
      if (title !== undefined) updates.title = String(title).trim();
      if (destination_url !== undefined) {
        if (!isSafeUrl(destination_url)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid Destination URL. Only safe http:// and https:// URLs are permitted.',
          });
        }
        updates.destination_url = String(destination_url).trim();
      }
      if (is_active !== undefined) updates.is_active = Boolean(is_active);
      updates.updated_at = new Date().toISOString();

      const { data, error } = await sb
        .from('qr_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data });
    }

    // 4. DELETE: Remove QR code mapping
    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;

      if (!id) {
        return res.status(400).json({ success: false, error: 'QR code ID is required.' });
      }

      const { error } = await sb.from('qr_codes').delete().eq('id', id);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/qr-manage exception:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
}

