// ==============================================================================
// STANDALONE NODE.JS PRODUCTION SERVER
// Serves static dist files and handles form submissions with Google reCAPTCHA
// ==============================================================================

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  // 1. API: /api/submit-form endpoint
  if (req.url === '/api/submit-form' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { name, email, job_title, join, comments, locale, recaptchaToken } = payload;

        if (!name || !email || !job_title || !join) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Required fields are missing' }));
        }

        // Verify with Google reCAPTCHA
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
              res.writeHead(403, { 'Content-Type': 'application/json' });
              return res.end(
                JSON.stringify({
                  success: false,
                  error: 'Google reCAPTCHA verification failed. Please try again.',
                })
              );
            }
          } catch (netErr) {
            console.error('reCAPTCHA siteverify error:', netErr);
          }
        }

        // Save to Supabase
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseKey =
          process.env.SUPABASE_SECRET_KEY ||
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.VITE_SUPABASE_ANON_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          '';

        if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, supabaseKey);

          const payloadData = {
            name: String(name || '').trim(),
            email: String(email || '').trim(),
            job_title: String(job_title || '').trim(),
            join: Array.isArray(join) ? join : [join],
            has_guest: Boolean(payload.has_guest),
            guest_count: Number(payload.guest_count || 0),
            comments: comments ? Number(comments) : null,
            locale: locale || 'en',
          };

          let insertResult = await supabase
            .from('invitation_submissions')
            .insert([payloadData])
            .select('id')
            .single();

          if (insertResult.error && insertResult.error.message && (insertResult.error.message.includes('has_guest') || insertResult.error.message.includes('guest_count'))) {
            delete payloadData.has_guest;
            delete payloadData.guest_count;
            insertResult = await supabase
              .from('invitation_submissions')
              .insert([payloadData])
              .select('id')
              .single();
          }

          if (insertResult.error) {
            console.error('Supabase insertion error:', insertResult.error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: insertResult.error.message }));
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, id: insertResult.data?.id }));
        }

        // Fallback response if Supabase is unconfigured
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, id: `local-${Date.now()}` }));
      } catch (err) {
        console.error('Submission server error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Server error processing submission' }));
      }
    });
    return;
  }

  // 2. Health check endpoint
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }

  // 3. Static File Serving (SPA Fallback)
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const headers = { 'Content-Type': contentType };
    if (ext === '.html') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }

    res.writeHead(200, headers);
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Production server running on http://localhost:${PORT}`);
});
