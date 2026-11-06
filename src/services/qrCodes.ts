import { QRCodeRecord } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_QR_STORAGE_KEY = 'national_day_qr_codes';

// Default initial permanent QR mapping
const DEFAULT_QR_CODES: QRCodeRecord[] = [
  {
    id: 'qr-seed-001-national-day',
    qr_id: 'national-day-2026',
    title: "UAE's 55th National Day Official RSVP",
    destination_url: 'https://invitation-confirmation.vercel.app/',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'qr-seed-002-vip-delegates',
    qr_id: 'vip-protocol-access',
    title: 'VIP & Diplomatic Delegation Fast-Track',
    destination_url: 'https://invitation-confirmation.vercel.app/?access=vip',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

function getLocalQRCodes(): QRCodeRecord[] {
  if (typeof window === 'undefined') return DEFAULT_QR_CODES;
  try {
    const raw = localStorage.getItem(LOCAL_QR_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_QR_STORAGE_KEY, JSON.stringify(DEFAULT_QR_CODES));
      return DEFAULT_QR_CODES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_QR_CODES;
  } catch {
    return DEFAULT_QR_CODES;
  }
}

function saveLocalQRCodes(records: QRCodeRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_QR_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save QR codes to localStorage:', err);
  }
}

export function isSafeHttpUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function slugifyQrId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Returns the permanent QR redirect URL that is encoded into the physical QR code.
 * Example: https://invitation-confirmation.vercel.app/qr/national-day-2026
 */
export function getPermanentQRUrl(qr_id: string): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}/qr/${qr_id}`;
  }
  return `https://invitation-confirmation.vercel.app/qr/${qr_id}`;
}

export async function fetchQRCodes(): Promise<{ data: QRCodeRecord[]; error?: string }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetchQRCodes error, using local fallback:', error.message);
        return { data: getLocalQRCodes(), error: error.message };
      }

      if (data && data.length > 0) {
        saveLocalQRCodes(data as QRCodeRecord[]);
        return { data: data as QRCodeRecord[] };
      }

      // If database is empty, seed with initial QR codes
      const local = getLocalQRCodes();
      return { data: local };
    } catch (err: any) {
      console.warn('Supabase fetchQRCodes exception, using local fallback:', err);
      return { data: getLocalQRCodes(), error: err.message };
    }
  }

  return { data: getLocalQRCodes() };
}

export async function createQRCode(payload: {
  title: string;
  qr_id?: string;
  destination_url: string;
  is_active?: boolean;
}): Promise<{ success: boolean; data?: QRCodeRecord; error?: string }> {
  const title = payload.title.trim();
  const destination_url = payload.destination_url.trim();

  if (!title) {
    return { success: false, error: 'QR Code title is required.' };
  }

  if (!destination_url) {
    return { success: false, error: 'Destination URL is required.' };
  }

  if (!isSafeHttpUrl(destination_url)) {
    return {
      success: false,
      error: 'Please enter a valid HTTP or HTTPS destination URL (e.g. https://...).',
    };
  }

  const cleanSlug = slugifyQrId(payload.qr_id || title);
  if (!cleanSlug) {
    return { success: false, error: 'Please enter a valid unique identifier (slug).' };
  }

  const newRecord: QRCodeRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `qr-${Date.now()}`,
    qr_id: cleanSlug,
    title,
    destination_url,
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .insert([
          {
            title: newRecord.title,
            qr_id: newRecord.qr_id,
            destination_url: newRecord.destination_url,
            is_active: newRecord.is_active,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return {
            success: false,
            error: `A QR code with identifier "${cleanSlug}" already exists. Please choose a different identifier.`,
          };
        }
        return { success: false, error: error.message };
      }

      // Update local storage cache
      const list = getLocalQRCodes();
      saveLocalQRCodes([data as QRCodeRecord, ...list.filter((q) => q.id !== data.id)]);
      return { success: true, data: data as QRCodeRecord };
    } catch (err: any) {
      console.warn('Supabase createQRCode exception, fallback to local:', err);
    }
  }

  // Local storage fallback for dev preview
  const list = getLocalQRCodes();
  if (list.some((q) => q.qr_id === cleanSlug)) {
    return {
      success: false,
      error: `A QR code with identifier "${cleanSlug}" already exists. Please choose a different identifier.`,
    };
  }

  const updatedList = [newRecord, ...list];
  saveLocalQRCodes(updatedList);
  return { success: true, data: newRecord };
}

export async function updateQRCode(
  id: string,
  updates: Partial<Pick<QRCodeRecord, 'title' | 'destination_url' | 'is_active'>>
): Promise<{ success: boolean; data?: QRCodeRecord; error?: string }> {
  if (updates.destination_url !== undefined) {
    const trimmed = updates.destination_url.trim();
    if (!trimmed || !isSafeHttpUrl(trimmed)) {
      return {
        success: false,
        error: 'Please enter a valid HTTP or HTTPS destination URL (e.g. https://...).',
      };
    }
    updates.destination_url = trimmed;
  }

  if (updates.title !== undefined) {
    const trimmed = updates.title.trim();
    if (!trimmed) {
      return { success: false, error: 'QR Code title cannot be empty.' };
    }
    updates.title = trimmed;
  }

  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .update({
          ...updates,
          updated_at: timestamp,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local storage cache
      const list = getLocalQRCodes().map((q) => (q.id === id ? (data as QRCodeRecord) : q));
      saveLocalQRCodes(list);
      return { success: true, data: data as QRCodeRecord };
    } catch (err: any) {
      console.warn('Supabase updateQRCode exception, fallback to local:', err);
    }
  }

  // Local storage fallback
  const list = getLocalQRCodes();
  const existing = list.find((q) => q.id === id);
  if (!existing) {
    return { success: false, error: 'QR Code record not found.' };
  }

  const updated: QRCodeRecord = {
    ...existing,
    ...updates,
    updated_at: timestamp,
  };

  const updatedList = list.map((q) => (q.id === id ? updated : q));
  saveLocalQRCodes(updatedList);
  return { success: true, data: updated };
}

export async function deleteQRCode(id: string): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('qr_codes').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      const list = getLocalQRCodes().filter((q) => q.id !== id);
      saveLocalQRCodes(list);
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase deleteQRCode exception, fallback to local:', err);
    }
  }

  // Local storage fallback
  const list = getLocalQRCodes().filter((q) => q.id !== id);
  saveLocalQRCodes(list);
  return { success: true };
}

export async function toggleQRCodeStatus(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateQRCode(id, { is_active });
}

