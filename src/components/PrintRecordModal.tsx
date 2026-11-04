import React from 'react';
import { Submission, Language } from '../types';
import { translations } from '../i18n/translations';
import { Printer, X, Star, Calendar, CheckCircle2, XCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Screen only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{t.detailsTitle}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
              {submission.id.slice(0, 8)}...
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printPdf}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Card */}
        <div id="printable-record" className="p-8 sm:p-10 bg-white">
          {/* Top Event Letterhead */}
          <div className="border-b-2 border-emerald-600 pb-6 mb-6 flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                {t.nationalDayBadge}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {t.formTitle}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-600 font-medium">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>{t.formDescription}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                Official Slip
              </span>
            </div>
          </div>

          {/* Submission Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 block font-medium">{t.submissionId}</span>
              <span className="font-mono text-slate-800 text-[11px] break-all">{submission.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">{t.submittedAt}</span>
              <span className="font-semibold text-slate-800">
                {new Date(submission.created_at).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US')}
              </span>
            </div>
          </div>

          {/* Response Fields */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.nameLabel}</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{submission.name}</div>
            </div>

            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.emailLabel}</div>
              <div className="text-sm font-semibold text-emerald-700 mt-0.5 font-mono">{submission.email}</div>
            </div>

            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.jobTitleLabel}</div>
              <div className="text-sm text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">{submission.job_title}</div>
            </div>

            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.joinLabel}</div>
              <div className="mt-1 flex items-center gap-2">
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
                {submission.join.length > 1 && (
                  <span className="text-xs text-slate-500">[{submission.join.join(', ')}]</span>
                )}
              </div>
            </div>

            {isAttending && (
              <div className="border-b border-slate-100 pb-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.colGuest}</div>
                <div className="mt-1 text-sm font-semibold text-slate-800">
                  {submission.has_guest && (submission.guest_count || 0) > 0
                    ? `Yes (${submission.guest_count} ${submission.guest_count === 1 ? 'Guest' : 'Guests'})`
                    : 'No additional guests'}
                </div>
              </div>
            )}

            <div className="pb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.ratingLabel}</div>
              <div className="mt-1">
                {submission.comments !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (submission.comments || 0)
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      ({submission.comments} / 5)
                    </span>
                  </div>
                ) : (
                  <span className="text-xs italic text-slate-400">
                    {currentLang === 'ru' ? 'Оценка не указана' : 'No rating provided'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span>Verified Event Record &bull; National Day 2026</span>
            <span>Interface Language: {submission.locale.toUpperCase()}</span>
          </div>
        </div>

        {/* Modal actions - Screen only */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {t.close}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printPdf}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

