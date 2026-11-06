import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Form Submission Server Middleware for Vite Dev Server
function formApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'form-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 0. Dynamic QR Code Redirect Endpoint: /qr/:qrId
        const qrMatch = req.url && req.url.match(/^\/qr\/([^/?#]+)/i);
        if (qrMatch && req.method === 'GET') {
          const qrId = qrMatch[1].trim().toLowerCase();

          res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          );
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');

          const supabaseUrl =
            env.VITE_SUPABASE_URL ||
            env.SUPABASE_URL ||
            process.env.VITE_SUPABASE_URL ||
            process.env.SUPABASE_URL ||
            '';
          const supabaseKey =
            env.SUPABASE_SECRET_KEY ||
            env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_SECRET_KEY ||
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            env.VITE_SUPABASE_ANON_KEY ||
            process.env.VITE_SUPABASE_ANON_KEY ||
            '';

          if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
            try {
              const { createClient } = await import('@supabase/supabase-js');
              const supabase = createClient(supabaseUrl, supabaseKey);

              const { data } = await supabase
                .from('qr_codes')
                .select('id, qr_id, destination_url, is_active')
                .eq('qr_id', qrId)
                .maybeSingle();

              if (data) {
                if (!data.is_active) {
                  res.statusCode = 302;
                  res.setHeader('Location', `/?qr_status=inactive&slug=${encodeURIComponent(qrId)}`);
                  res.end();
                  return;
                }

                if (
                  data.destination_url &&
                  (data.destination_url.startsWith('http://') || data.destination_url.startsWith('https://'))
                ) {
                  // HTTP 302 Temporary Redirect to the latest destination URL
                  res.statusCode = 302;
                  res.setHeader('Location', data.destination_url);
                  res.end();
                  return;
                }
              }
            } catch (err) {
              console.error('Vite dev server QR lookup error:', err);
            }
          }

          if (qrId === 'national-day-2026') {
            res.statusCode = 302;
            res.setHeader('Location', '/');
            res.end();
            return;
          }

          res.statusCode = 302;
          res.setHeader('Location', `/?qr_status=not_found&slug=${encodeURIComponent(qrId)}`);
          res.end();
          return;
        }

        if (req.url === '/api/submit-form' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { name, organisation, job_title, join, locale, recaptchaToken } = payload;

              // 1. Basic field validation
              if (!name || !organisation || !job_title || !join) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Required fields are missing.',
                  })
                );
                return;
              }

              // 2. Google reCAPTCHA server-side verification
              const secretKey =
                env.RECAPTCHA_SECRET_KEY ||
                process.env.RECAPTCHA_SECRET_KEY ||
                '';

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
                    console.warn('❌ [Server] Google reCAPTCHA rejected:', googleData['error-codes']);
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: 'Google reCAPTCHA verification failed. Please try again.',
                        errorCodes: googleData['error-codes'],
                      })
                    );
                    return;
                  }
                  console.info('✅ [Server] Google reCAPTCHA verified successfully for:', name);
                } catch (netErr) {
                  console.warn('⚠️ [Server] reCAPTCHA verification request error:', netErr);
                }
              }

              // 3. Save to PostgreSQL database if Supabase configured
              const supabaseUrl =
                env.VITE_SUPABASE_URL ||
                env.SUPABASE_URL ||
                process.env.VITE_SUPABASE_URL ||
                process.env.SUPABASE_URL ||
                '';
              const supabaseKey =
                env.SUPABASE_SECRET_KEY ||
                env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.SUPABASE_SECRET_KEY ||
                process.env.SUPABASE_SERVICE_ROLE_KEY ||
                env.VITE_SUPABASE_ANON_KEY ||
                process.env.VITE_SUPABASE_ANON_KEY ||
                '';

              if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
                const { createClient } = await import('@supabase/supabase-js');
                const sb = createClient(supabaseUrl, supabaseKey);

                const payloadData: any = {
                  name: String(name || '').trim(),
                  email: '',
                  organisation: String(organisation || '').trim(),
                  job_title: String(job_title || '').trim(),
                  join: Array.isArray(join) ? join : [join],
                  has_guest: Boolean(payload.has_guest),
                  guest_count: Number(payload.guest_count || 0),
                  guests: Array.isArray(payload.guests)
                    ? payload.guests.map((g: any) => ({
                        name: String(g.name || '').trim(),
                        organisation: String(g.organisation || '').trim(),
                        job_title: String(g.job_title || '').trim(),
                      }))
                    : [],
                  locale: locale || 'en',
                };

                let insertResult = await sb
                  .from('invitation_submissions')
                  .insert([payloadData])
                  .select('id')
                  .single();

                // Graceful fallback retry if any newly added columns do not exist in SQL schema yet
                while (insertResult.error && insertResult.error.message) {
                  let changed = false;
                  if (insertResult.error.message.includes('guests')) {
                    delete payloadData.guests;
                    changed = true;
                  }
                  if (insertResult.error.message.includes('organisation')) {
                    delete payloadData.organisation;
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
                  insertResult = await sb
                    .from('invitation_submissions')
                    .insert([payloadData])
                    .select('id')
                    .single();
                }

                if (insertResult.error) {
                  console.error('❌ [Server] Database insertion error:', insertResult.error);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: insertResult.error.message }));
                  return;
                }

                console.info('✅ [Server] Successfully saved submission to Supabase:', insertResult.data?.id);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, id: insertResult.data?.id || 'saved' }));
                return;
              }

              console.warn('⚠️ [Server] Supabase not configured in dev server. Bypassing database save.');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  id: `dev-verified-${Date.now()}`,
                })
              );
            } catch (err: any) {
              console.error('Server submission error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'Form submission failed due to an internal server error.',
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), formApiPlugin(env)],
  };
});
