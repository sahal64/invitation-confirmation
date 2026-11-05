import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FormValues, Language, Submission } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Developer Environment Diagnostic Log
if (typeof window !== 'undefined') {
  if (isSupabaseConfigured()) {
    console.info('🔌 [Database] Supabase is CONNECTED. Live PostgreSQL storage active.');
  } else {
    if (import.meta.env.DEV) {
      console.warn('⚠️ [Database DEV] Supabase is NOT configured. Running in Local Storage development mode.');
    } else {
      console.error('🚨 [Database PROD ERROR] Supabase is NOT configured! Live submissions will be rejected until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
    }
  }
}

// Local Storage Fallback Keys
const LOCAL_STORAGE_KEY = 'national_day_form_submissions';
const LOCAL_AUTH_KEY = 'national_day_admin_session';

// Sample submissions are ONLY available in development mode for previewing UI layout.
// In production builds, this is strictly an empty array.
const DEFAULT_SAMPLE_SUBMISSIONS: Submission[] = import.meta.env.DEV
  ? [
      {
        id: 'sample-001-volkov',
        created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        name: 'Alexander Volkov',
        email: 'alex.volkov@heritage-intl.org',
        organisation: 'Heritage International Mission',
        job_title: 'Senior Cultural Attache & Protocol Advisor',
        join: ['YES'],
        comments: 5,
        locale: 'en',
        is_sample: true,
      },
      {
        id: 'sample-002-smirnova',
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        name: 'Екатерина Смирнова',
        email: 'e.smirnova@consulting.ru',
        organisation: 'Strategic Global Consulting LLC',
        job_title: 'Директор по стратегическим коммуникациям',
        join: ['YES'],
        comments: 4,
        locale: 'ru',
        is_sample: true,
      },
      {
        id: 'sample-003-jenkins',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        name: 'Sarah Jenkins',
        email: 'sjenkins@globaldiplomacy.com',
        organisation: 'Global Diplomacy Institute',
        job_title: 'Head of Delegation & International Relations',
        join: ['No'],
        comments: 3,
        locale: 'en',
        is_sample: true,
      },
    ]
  : [];

function getLocalSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      if (DEFAULT_SAMPLE_SUBMISSIONS.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_SUBMISSIONS));
        return DEFAULT_SAMPLE_SUBMISSIONS;
      }
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SAMPLE_SUBMISSIONS;
  }
}

function saveLocalSubmissions(submissions: Submission[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(submissions));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function clearSampleSubmissions(): void {
  const current = getLocalSubmissions().filter((s) => !s.is_sample);
  saveLocalSubmissions(current);
}

// -----------------------------------------------------------------------------
// PUBLIC FORM SUBMISSION API
// -----------------------------------------------------------------------------

export async function submitResponse(
  values: FormValues,
  locale: Language,
  recaptchaToken?: string
): Promise<{ success: boolean; id: string; error?: string }> {
  // 1. Try server endpoint /api/submit-form (verifies Google reCAPTCHA server-side)
  try {
    const response = await fetch('/api/submit-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...values,
        locale,
        recaptchaToken,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, id: result.id || 'saved' };
    }

    if (!response.ok && result.error) {
      return {
        success: false,
        id: '',
        error: result.error,
      };
    }
  } catch (err: any) {
    console.warn('API endpoint unreachable, trying direct client-side Supabase insert:', err);
  }

  // 2. Direct insertion to Supabase PostgreSQL database
  if (isSupabaseConfigured() && supabase) {
    try {
      const payload: any = {
        name: values.name.trim(),
        email: '',
        organisation: values.organisation.trim(),
        job_title: values.job_title.trim(),
        join: values.join,
        locale: locale,
        has_guest: Boolean(values.has_guest),
        guest_count: Number(values.guest_count || 0),
      };

      let { error } = await supabase
        .from('invitation_submissions')
        .insert([payload]);

      // Graceful fallback retry if any newly added columns do not exist in SQL schema yet
      while (error && error.message) {
        let changed = false;
        if (error.message.includes('organisation')) {
          delete payload.organisation;
          changed = true;
        }
        if (error.message.includes('has_guest') || error.message.includes('guest_count')) {
          delete payload.has_guest;
          delete payload.guest_count;
          changed = true;
        }
        if (error.code === '23502' || error.message.includes('email')) {
          payload.email = '';
          changed = true;
        }
        if (!changed) break;
        const retry = await supabase.from('invitation_submissions').insert([payload]);
        error = retry.error;
      }

      if (error) {
        console.error('Supabase direct insert error:', error);
        return { success: false, id: '', error: error.message };
      }

      return { success: true, id: 'db-saved' };
    } catch (err: any) {
      console.error('Supabase direct insert exception:', err);
      return { success: false, id: '', error: err.message || 'Database submission failed' };
    }
  }

  // 3. Development fallback
  if (import.meta.env.DEV) {
    console.warn('[DEV ONLY] Dev fallback for local preview.');
    const newSubmission: Submission = {
      id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      name: values.name.trim(),
      organisation: values.organisation.trim(),
      job_title: values.job_title.trim(),
      join: values.join,
      has_guest: Boolean(values.has_guest),
      guest_count: Number(values.guest_count || 0),
      locale: locale,
      is_sample: false,
    };

    const list = getLocalSubmissions();
    list.unshift(newSubmission);
    saveLocalSubmissions(list);

    await new Promise((resolve) => setTimeout(resolve, 400));
    return { success: true, id: newSubmission.id };
  }

  return {
    success: false,
    id: '',
    error: 'Unable to reach the database server. Please check your connection and retry.',
  };
}

// -----------------------------------------------------------------------------
// ADMIN DATA API (PROTECTED)
// -----------------------------------------------------------------------------

export async function fetchSubmissions(): Promise<{ data: Submission[]; error?: string }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitation_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (data as Submission[]) || [] };
    } catch (err: any) {
      return { data: [], error: err.message || 'Failed to fetch submissions' };
    }
  }

  // Development fallback
  return { data: getLocalSubmissions() };
}

export async function deleteSubmission(id: string): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('invitation_submissions')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Development fallback
  const list = getLocalSubmissions().filter((s) => s.id !== id);
  saveLocalSubmissions(list);
  return { success: true };
}

// -----------------------------------------------------------------------------
// ADMIN AUTHENTICATION API
// -----------------------------------------------------------------------------

export async function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: { email: string }; error?: string }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        user: { email: data.user?.email || email },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  }

  // Development mode only
  if (import.meta.env.DEV) {
    if (password.length >= 6) {
      const sessionUser = { email: email.trim() };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(sessionUser));
      return { success: true, user: sessionUser };
    }
    return {
      success: false,
      error: 'Dev Mode: Please enter an email and password with at least 6 characters.',
    };
  }

  return {
    success: false,
    error: 'Backend authentication service is not configured. Please contact the administrator.',
  };
}

export async function adminLogout(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(LOCAL_AUTH_KEY);
}

export async function getAdminSession(): Promise<{ isAuthenticated: boolean; email?: string }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session && data.session.user) {
        return { isAuthenticated: true, email: data.session.user.email };
      }
      return { isAuthenticated: false };
    } catch {
      return { isAuthenticated: false };
    }
  }

  // Development fallback
  if (import.meta.env.DEV) {
    const stored = localStorage.getItem(LOCAL_AUTH_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { isAuthenticated: true, email: parsed.email };
      } catch {
        return { isAuthenticated: false };
      }
    }
  }

  return { isAuthenticated: false };
}
