import { createClient } from '@supabase/supabase-js';

const ENGLISH_ONLY_REGEX = /^[A-Za-z0-9\s.,\-'&()/:+"!?@#%*;_]+$/;
const isEnglishOnly = (val) => {
  const trimmed = String(val || '').trim();
  if (!trimmed) return true;
  return ENGLISH_ONLY_REGEX.test(trimmed);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Registration closed guard
  return res.status(403).json({
    success: false,
    error: 'Event registration has concluded. Submissions are no longer accepted.',
  });

  try {
    const { name, organisation, job_title, join, locale, recaptchaToken } = req.body || {};

    if (!name || !organisation || !job_title || !join) {
      return res.status(400).json({ success: false, error: 'Required fields are missing' });
    }

    const guests = Array.isArray(req.body?.guests) ? req.body.guests : [];
    const textValues = [
      name,
      organisation,
      job_title,
      ...guests.flatMap((g) => [g?.name, g?.organisation, g?.job_title]),
    ];
    if (textValues.some((v) => !isEnglishOnly(v))) {
      return res.status(400).json({
        success: false,
        error: 'Please enter all details in English characters only.',
      });
    }

    // 1. Verify Google reCAPTCHA
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
    if (secretKey && recaptchaToken) {
      try {
        const verifyParams = new URLSearchParams();
        verifyParams.append('secret', secretKey);
        verifyParams.append('response', recaptchaToken);

        const googleRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          body: verifyParams,
        });
        const googleData = await googleRes.json();

        if (!googleData.success) {
          return res.status(403).json({
            success: false,
            error: 'Google reCAPTCHA verification failed. Please try again.',
          });
        }
      } catch (netErr) {
        console.error('reCAPTCHA siteverify error:', netErr);
      }
    }

    // 2. Save to Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      '';

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const payloadData = {
        name: String(name || '').trim(),
        email: '',
        organisation: String(organisation || '').trim(),
        job_title: String(job_title || '').trim(),
        join: Array.isArray(join) ? join : [join],
        has_guest: Boolean(req.body?.has_guest),
        guest_count: Number(req.body?.guest_count || 0),
        guests: Array.isArray(req.body?.guests)
          ? req.body.guests.map((g) => ({
              name: String(g.name || '').trim(),
              organisation: String(g.organisation || '').trim(),
              job_title: String(g.job_title || '').trim(),
            }))
          : [],
        locale: locale || 'en',
      };

      let insertResult = await supabase
        .from('invitation_submissions')
        .insert([payloadData])
        .select('id')
        .single();

      // Retry only for optional guest/email columns — never drop organisation
      while (insertResult.error && insertResult.error.message) {
        let changed = false;
        if (insertResult.error.message.includes('guests')) {
          delete payloadData.guests;
          changed = true;
        }
        if (insertResult.error.message.includes('has_guest') || insertResult.error.message.includes('guest_count')) {
          delete payloadData.has_guest;
          delete payloadData.guest_count;
          changed = true;
        }
        if (insertResult.error.code === '23502' || insertResult.error.message.includes('email')) {
          payloadData.email = '';
          changed = true;
        }
        if (!changed) break;
        insertResult = await supabase
          .from('invitation_submissions')
          .insert([payloadData])
          .select('id')
          .single();
      }

      if (insertResult.error) {
        console.error('Supabase insert error on Vercel:', insertResult.error);
        return res.status(500).json({ success: false, error: insertResult.error.message });
      }

      return res.status(200).json({ success: true, id: insertResult.data?.id });
    }

    return res.status(200).json({ success: true, id: `saved-${Date.now()}` });
  } catch (err) {
    console.error('Vercel API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

