export type Language = 'en' | 'ru';

export interface Submission {
  id: string;
  created_at: string;
  name: string;
  email: string;
  job_title: string;
  join: string[]; // ['YES'], ['No'], or ['YES', 'No']
  has_guest?: boolean;
  guest_count?: number;
  comments: number | null; // 1 to 5 rating
  locale: Language;
  is_sample?: boolean;
}

export interface FormValues {
  name: string;
  email: string;
  job_title: string;
  join: string[];
  has_guest: boolean;
  guest_count: number;
  comments: number | null;
}

export interface FormErrors {
  name?: string;
  email?: string;
  job_title?: string;
  join?: string;
  has_guest?: string;
  guest_count?: string;
  comments?: string;
  recaptcha?: string;
  general?: string;
}

export interface FilterState {
  search: string;
  joinFilter: 'ALL' | 'YES' | 'No';
  localeFilter: 'ALL' | 'en' | 'ru';
  sortBy: 'created_at' | 'name' | 'email' | 'comments';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}
