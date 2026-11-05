import React from 'react';
import { Submission, Language } from '../types';
import { translations } from '../i18n/translations';
import { Printer, X, Calendar, CheckCircle2, XCircle, Building2, Briefcase, Users, Mail, Clock, Hash, Globe2 } from 'lucide-react';

interface PrintRecordModalProps {
  submission: Submission | null;
  currentLang: Language;
  onClose: () => void;
}

export const PrintRecordModal: React.FC<PrintRecordModalProps> = ({
  submission,
  currentLang,
  onClose,
}) => {
  if (!submission) return null;
  const t = translations[currentLang];

  const handlePrint = () => {
    window.print();
  };

  const isAttending = submission.join.includes('YES');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-150">
        {/* Header - Screen only */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/80 no-print flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{t.detailsTitle}</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-mono font-medium flex-shrink-0">
              #{submission.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t.printPdf}</span>
              <span className="xs:hidden">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Card */}
        <div id="printable-record" className="p-4 sm:p-8 bg-white overflow-y-auto flex-1">
          {/* Top Event Letterhead */}
          <div className="border-b-2 border-emerald-600 pb-4 sm:pb-5 mb-4 sm:mb-6 flex flex-col xs:flex-row items-start justify-between gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200/60">
                <span>{t.nationalDayBadge}</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1 leading-snug">
                {t.formTitle}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{t.formDescription}</span>
              </div>
            </div>
            <div className="xs:text-right flex-shrink-0">
              <span className="inline-block text-[10px] sm:text-[11px] font-mono uppercase px-2 sm:px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                Official Slip
              </span>
            </div>
          </div>

          {/* Submission Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-6 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-100 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] block font-medium uppercase tracking-wider">{t.submissionId}</span>
                <span className="font-mono text-slate-800 text-xs font-semibold break-all">{submission.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] block font-medium uppercase tracking-wider">{t.submittedAt}</span>
                <span className="font-semibold text-slate-800 text-xs">
                  {new Date(submission.created_at).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US')}
                </span>
              </div>
            </div>
          </div>

          {/* Response Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Full Name */}
            <div className="bg-slate-50/50 p-3 sm:p-3.5 rounded-xl border border-slate-100">
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.nameLabel}</div>
              <div className="text-sm sm:text-base font-bold text-slate-900 mt-1 break-words">{submission.name}</div>
            </div>

            {/* Organisation */}
            <div className="bg-slate-50/50 p-3 sm:p-3.5 rounded-xl border border-slate-100">
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.organisationLabel}</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-800 mt-1 break-words">{submission.organisation || '-'}</div>
            </div>

            {/* Job Title */}
            <div className="bg-slate-50/50 p-3 sm:p-3.5 rounded-xl border border-slate-100 sm:col-span-2">
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.jobTitleLabel}</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-800 font-medium mt-1 whitespace-pre-wrap break-words">{submission.job_title}</div>
            </div>

            {/* Attendance Status */}
            <div className="bg-slate-50/50 p-3 sm:p-3.5 rounded-xl border border-slate-100">
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t.joinLabel}</div>
              {isAttending ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{t.joinYes} (Attending)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>{t.joinNo} (Declined)</span>
                </span>
              )}
            </div>

            {/* Guest Count */}
            <div className="bg-slate-50/50 p-3 sm:p-3.5 rounded-xl border border-slate-100">
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.colGuest}</span>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800">
                {!isAttending
                  ? '-'
                  : (Number(submission.guest_count) || 0) > 0
                  ? `Yes (${submission.guest_count} ${submission.guest_count === 1 ? 'Guest' : 'Guests'})`
                  : 'No additional guests'}
              </div>
            </div>

            {/* Optional Email if exists */}
            {submission.email && (
              <div className="bg-slate-50/50 p-3 sm:p-3.5 rounded-xl border border-slate-100 sm:col-span-2">
                <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.emailLabel}</span>
                </div>
                <div className="text-xs font-mono text-emerald-800 mt-1 break-all">{submission.email}</div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1.5 text-[10px] sm:text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span>Verified Event Record &bull; National Day 2026</span>
            </span>
            <span className="flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Language: {submission.locale.toUpperCase()}</span>
            </span>
          </div>
        </div>

        {/* Modal actions - Screen only */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 sm:gap-3 no-print flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-initial px-4 py-2 sm:py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors text-center"
          >
            {t.close}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors text-center active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printPdf}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


