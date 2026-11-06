import { createClient } from '@supabase/supabase-js';

// Safe URL validator: Only permits http: and https: protocols
function isSafeUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // Always disable caching for dynamic redirects so destination updates take effect immediately
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Extract qrId from route parameter or URL path
  let qrId = req.query?.qrId;
  if (!qrId && req.url) {
    const match = req.url.match(/\/qr\/([^/?#]+)/i);
    if (match) {
      qrId = match[1];
    }
  }

  if (!qrId || typeof qrId !== 'string') {
    return res.redirect(302, '/?qr_status=invalid');
  }

  // Clean slug
  const cleanQrId = qrId.trim().toLowerCase();

  // Supabase Credentials (server-side environment variables)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  try {
    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('qr_codes')
        .select('id, qr_id, destination_url, is_active')
        .eq('qr_id', cleanQrId)
        .maybeSingle();

      if (error) {
        console.error('Supabase QR lookup error:', error);
      }

      if (data) {
        if (!data.is_active) {
          return res.redirect(302, `/?qr_status=inactive&slug=${encodeURIComponent(cleanQrId)}`);
        }

        if (data.destination_url && isSafeUrl(data.destination_url)) {
          // HTTP 302 Temporary Redirect to the latest destination URL
          return res.redirect(302, data.destination_url);
        } else {
          return res.redirect(302, `/?qr_status=invalid_destination&slug=${encodeURIComponent(cleanQrId)}`);
        }
      }
    }

    // Default fallback if not found in database or default sample
    if (cleanQrId === 'national-day-2026') {
      return res.redirect(302, '/');
    }

    return res.redirect(302, `/?qr_status=not_found&slug=${encodeURIComponent(cleanQrId)}`);
  } catch (err) {
    console.error('QR redirect handler exception:', err);
    return res.redirect(302, `/?qr_status=error&slug=${encodeURIComponent(cleanQrId)}`);
  }
}

