export type Language = 'en' | 'ru';

export interface Submission {
  id: string;
  created_at: string;
  name: string;
  email?: string;
  job_title: string;
  join: string[]; // ['YES'], ['No']
  has_guest?: boolean;
  guest_count?: number;
  comments?: number | null;
  locale: Language;
  is_sample?: boolean;
}

export interface FormValues {
  name: string;
  job_title: string;
  join: string[];
  has_guest: boolean;
  guest_count: number;
}

export interface FormErrors {
  name?: string;
  job_title?: string;
  join?: string;
  has_guest?: string;
  guest_count?: string;
  recaptcha?: string;
  general?: string;
}

export interface FilterState {
  search: string;
  joinFilter: 'ALL' | 'YES' | 'No';
  localeFilter: 'ALL' | 'en' | 'ru';
  sortBy: 'created_at' | 'name' | 'job_title' | 'guest_count';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}
