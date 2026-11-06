export type Language = 'en' | 'ru';

export interface GuestDetails {
  name: string;
  organisation: string;
  job_title: string;
}

export interface Submission {
  id: string;
  created_at: string;
  name: string;
  email?: string;
  organisation?: string;
  job_title: string;
  join: string[]; // ['YES'], ['No']
  has_guest?: boolean;
  guest_count?: number;
  guests?: GuestDetails[];
  comments?: number | null;
  locale: Language;
  is_sample?: boolean;
}

export interface FormValues {
  name: string;
  organisation: string;
  job_title: string;
  join: string[];
  has_guest: boolean;
  guest_count: number;
  guests?: GuestDetails[];
}

export interface FormErrors {
  name?: string;
  organisation?: string;
  job_title?: string;
  join?: string;
  has_guest?: string;
  guest_count?: string;
  guests?: Array<{
    name?: string;
    organisation?: string;
    job_title?: string;
  }>;
  recaptcha?: string;
  general?: string;
}

export interface FilterState {
  search: string;
  joinFilter: 'ALL' | 'YES' | 'No';
  localeFilter: 'ALL' | 'en' | 'ru';
  sortBy: 'created_at' | 'name' | 'organisation' | 'job_title' | 'guest_count';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface QRCodeRecord {
  id: string;
  qr_id: string;
  title: string;
  destination_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
