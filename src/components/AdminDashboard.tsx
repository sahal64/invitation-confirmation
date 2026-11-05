import React, { useState, useEffect, useMemo } from 'react';
import { Submission, Language, FilterState } from '../types';
import { translations } from '../i18n/translations';
import {
  adminLogin,
  adminLogout,
  getAdminSession,
  fetchSubmissions,
  isSupabaseConfigured,
  clearSampleSubmissions,
} from '../services/supabase';
import { exportToCSV, exportToExcel } from '../utils/export';
import { PrintRecordModal } from './PrintRecordModal';
import {
  Search,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  LogOut,
  Users,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
  KeyRound,
  AlertCircle,
  Trash2,
  Calendar,
  Briefcase,
  Mail,
  Building2,
} from 'lucide-react';

interface AdminDashboardProps {
  currentLang: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const hasSupabase = isSupabaseConfigured();

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Data State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Filters, Search, Sort & Pagination
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    joinFilter: 'ALL',
    localeFilter: 'ALL',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    pageSize: 8,
  });

  // Check existing session on mount
  useEffect(() => {
    async function checkAuth() {
      const session = await getAdminSession();
      if (session.isAuthenticated) {
        setIsAuthenticated(true);
        setAdminEmail(session.email || '');
        loadData();
      } else {
        setIsAuthenticated(false);
        setLoadingData(false);
      }
    }
    checkAuth();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    setDataError('');
    const res = await fetchSubmissions();
    if (res.error) {
      setDataError(res.error);
    }
    setSubmissions(res.data);
    setLoadingData(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const res = await adminLogin(loginEmail, loginPassword);
    if (res.success) {
      setIsAuthenticated(true);
      setAdminEmail(res.user?.email || loginEmail.trim());
      await loadData();
    } else {
      setLoginError(res.error || 'Failed to authenticate');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setAdminEmail('');
    setLoginPassword('');
  };

  const handleClearSampleData = () => {
    if (window.confirm(currentLang === 'ru' ? 'Удалить все тестовые ответы?' : 'Remove all sample preview records?')) {
      clearSampleSubmissions();
      loadData();
    }
  };

  // Has sample data?
  const hasSampleData = useMemo(() => {
    return submissions.some((s) => s.is_sample);
  }, [submissions]);

  // Filter, Search, and Sort Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Search
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        !filters.search ||
        sub.name.toLowerCase().includes(searchLower) ||
        (sub.organisation || '').toLowerCase().includes(searchLower) ||
        (sub.email || '').toLowerCase().includes(searchLower) ||
        sub.job_title.toLowerCase().includes(searchLower);

      // Join Filter
      let matchesJoin = true;
      if (filters.joinFilter === 'YES') {
        matchesJoin = sub.join.includes('YES');
      } else if (filters.joinFilter === 'No') {
        matchesJoin = sub.join.includes('No');
      }

      // Locale Filter
      let matchesLocale = true;
      if (filters.localeFilter !== 'ALL') {
        matchesLocale = sub.locale === filters.localeFilter;
      }

      return matchesSearch && matchesJoin && matchesLocale;
    });
  }, [submissions, filters.search, filters.joinFilter, filters.localeFilter]);

  const sortedSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'created_at') {
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (filters.sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (filters.sortBy === 'organisation') {
        comparison = (a.organisation || '').localeCompare(b.organisation || '');
      } else if (filters.sortBy === 'job_title') {
        comparison = a.job_title.localeCompare(b.job_title);
      } else if (filters.sortBy === 'guest_count') {
        comparison = (a.guest_count || 0) - (b.guest_count || 0);
      }
      return filters.sortOrder === 'desc' ? comparison : -comparison;
    });
  }, [filteredSubmissions, filters.sortBy, filters.sortOrder]);

  // Pagination
  const totalRecords = sortedSubmissions.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / filters.pageSize));
  const currentPage = Math.min(filters.page, totalPages);
  const startIndex = (currentPage - 1) * filters.pageSize;
  const paginatedSubmissions = sortedSubmissions.slice(startIndex, startIndex + filters.pageSize);

  // Statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const attending = submissions.filter((s) => s.join.includes('YES')).length;
    const declined = submissions.filter((s) => s.join.includes('No')).length;
    const totalGuests = submissions
      .filter((s) => s.join.includes('YES') && s.has_guest)
      .reduce((sum, s) => sum + (s.guest_count || 0), 0);

    return { total, attending, declined, totalGuests };
  }, [submissions]);

  // Handle Sort Toggle
  const toggleSort = (field: 'created_at' | 'name' | 'organisation' | 'job_title' | 'guest_count') => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  // ---------------------------------------------------------------------------
  // AUTHENTICATION VIEW (IF NOT SIGNED IN)
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200 overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-slate-900 via-emerald-800 to-slate-900" />
          <div className="p-8">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800 mb-6 ring-4 ring-slate-50">
              <Lock className="w-6 h-6 text-emerald-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t.adminLoginTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 mb-6">
              {t.adminLoginSubtitle}
            </p>

            {loginError && (
              <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.adminEmailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.adminPasswordLabel}
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {loginLoading ? (
                  <span>{t.adminLoggingIn}</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>{t.adminLoginButton}</span>
                  </>
                )}
              </button>
            </form>

            {/* Dev helper only visible in local development if Supabase is not configured */}
            {import.meta.env.DEV && !hasSupabase && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-3">
                  <strong>Developer Notice:</strong> Supabase environment variables are unset. Running in local test mode.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('dev.admin@event.local');
                    setLoginPassword('password123');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                >
                  Fill Dev Credentials (dev.admin@event.local)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 space-y-6">
      {/* Top Banner & Profile Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t.adminTitle}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t.adminSubtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            {/* Shows actual authenticated email, or Administrator */}
            <span className="text-xs font-semibold text-slate-800 block">
              {adminEmail || t.administrator}
            </span>
            <span className="text-[11px] text-slate-400">Authenticated Session</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.adminLogoutButton}</span>
          </button>
        </div>
      </div>

      {/* Developer Diagnostic Alert (DEV MODE ONLY) */}
      {import.meta.env.DEV && !hasSupabase && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Developer Mode:</strong> Supabase environment variables not configured. Submissions are stored in local storage for local testing. Set <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> to connect live database.
            </span>
          </div>
        </div>
      )}

      {/* Database Error Banner */}
      {dataError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>
              <strong>Database Notice:</strong> {dataError}
            </span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t.totalSubmissions}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {stats.total}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold">
            <span>{t.attendingCount}</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2 flex items-baseline gap-2">
            <span>{stats.attending}</span>
            {stats.totalGuests > 0 && (
              <span className="text-xs font-semibold text-emerald-600">
                (+{stats.totalGuests} {currentLang === 'ru' ? 'гостей' : 'guests'})
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold">
            <span>{t.notAttendingCount}</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-700 mt-2">
            {stats.declined}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
              />
            </div>

            {/* Export Actions & Sample Data Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              {hasSampleData && (
                <button
                  onClick={handleClearSampleData}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors"
                  title="Remove mock/sample submissions"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t.removeSampleData}</span>
                </button>
              )}

              <button
                onClick={() => exportToCSV(sortedSubmissions, currentLang)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
                title={t.exportCsv}
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>{t.exportCsv}</span>
              </button>

              <button
                onClick={() => exportToExcel(sortedSubmissions, currentLang)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                title={t.exportExcel}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>{t.exportExcel}</span>
              </button>
            </div>
          </div>

          {/* Secondary Filters Bar */}
          <div className="flex items-center gap-4 text-xs flex-wrap pt-1">
            {/* Attendance Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">{t.filterJoin}:</span>
              <select
                value={filters.joinFilter}
                onChange={(e) => setFilters({ ...filters, joinFilter: e.target.value as any, page: 1 })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">{t.filterAll}</option>
                <option value="YES">YES (Attending)</option>
                <option value="No">No (Declined)</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">{t.filterLanguage}:</span>
              <select
                value={filters.localeFilter}
                onChange={(e) => setFilters({ ...filters, localeFilter: e.target.value as any, page: 1 })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Languages</option>
                <option value="en">English (EN)</option>
                <option value="ru">Russian (RU)</option>
              </select>
            </div>

            {/* Active records count */}
            <div className="ml-auto text-slate-400 text-xs">
              {t.showingRecords(
                totalRecords === 0 ? 0 : startIndex + 1,
                Math.min(startIndex + filters.pageSize, totalRecords),
                totalRecords
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE RESPONSIVE CARDS VIEW (< 640px) - DATE & DETAILS NEVER CUT OFF     */}
        {/* ========================================================================= */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {loadingData ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading submissions...
            </div>
          ) : paginatedSubmissions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {t.noSubmissionsFound}
            </div>
          ) : (
            paginatedSubmissions.map((sub) => {
              const isAttending = sub.join.includes('YES');
              return (
                <div key={sub.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                  {/* Top Bar: Prominent Date & Time + Attendance Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {new Date(sub.created_at).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        &bull;{' '}
                        {new Date(sub.created_at).toLocaleTimeString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {isAttending ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>YES</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex-shrink-0">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>No</span>
                      </span>
                    )}
                  </div>

                  {/* Respondent Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{sub.name}</span>
                      {sub.is_sample && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          {t.sampleBadge}
                        </span>
                      )}
                    </div>
                    {sub.email && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-mono mt-0.5">
                        <Mail className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span className="break-all">{sub.email}</span>
                      </div>
                    )}
                    {sub.organisation && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium mt-1">
                        <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="line-clamp-1">{sub.organisation}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                      <Briefcase className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="line-clamp-2">{sub.job_title}</span>
                    </div>
                  </div>

                  {/* Guests & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      {sub.has_guest && (sub.guest_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Users className="w-3 h-3 text-blue-500" />
                          <span>+{sub.guest_count} guests</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No guests</span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                        {sub.locale}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedSubmission(sub)}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t.viewDetails}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP TABLE VIEW (≥ 640px)                                              */}
        {/* ========================================================================= */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th
                  onClick={() => toggleSort('created_at')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.colDate}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors min-w-[150px]"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.colName}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('organisation')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.colOrganisation}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('job_title')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.colJobTitle}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[100px]">{t.colJoin}</th>
                <th
                  onClick={() => toggleSort('guest_count')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors min-w-[90px]"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.colGuest}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[70px]">{t.colLanguage}</th>
                <th className="py-3 px-4 text-right min-w-[110px]">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loadingData ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading submissions...
                  </td>
                </tr>
              ) : paginatedSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {t.noSubmissionsFound}
                  </td>
                </tr>
              ) : (
                paginatedSubmissions.map((sub) => {
                  const isAttending = sub.join.includes('YES');
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {new Date(sub.created_at).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(sub.created_at).toLocaleTimeString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{sub.name}</span>
                          {sub.is_sample && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              {t.sampleBadge}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[180px] truncate" title={sub.organisation}>
                        {sub.organisation || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate" title={sub.job_title}>
                        {sub.job_title}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isAttending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>YES</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>No</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {sub.has_guest && (sub.guest_count || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span>+{sub.guest_count}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          {sub.locale}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t.viewDetails}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
            disabled={currentPage <= 1}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              currentPage <= 1
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.prevPage}</span>
          </button>

          <span className="text-xs font-medium text-slate-600">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
            disabled={currentPage >= totalPages}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              currentPage >= totalPages
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <span>{t.nextPage}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable / Detail Modal */}
      <PrintRecordModal
        submission={selectedSubmission}
        currentLang={currentLang}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
};
