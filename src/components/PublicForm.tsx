import React, { useState, useRef } from 'react';
import { FormValues, FormErrors, Language } from '../types';
import { translations } from '../i18n/translations';
import { submitResponse } from '../services/supabase';
import { RecaptchaWidget, RecaptchaWidgetRef } from './RecaptchaWidget';
import { CheckCircle2, AlertCircle, Star, Sparkles, Send, ChevronDown, Users, RotateCcw } from 'lucide-react';

interface PublicFormProps {
  currentLang: Language;
}

const INITIAL_VALUES: FormValues = {
  name: '',
  email: '',
  job_title: '',
  join: [],
  has_guest: false,
  guest_count: 0,
  comments: null,
};

export const PublicForm: React.FC<PublicFormProps> = ({ currentLang }) => {
  const t = translations[currentLang];

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Google reCAPTCHA state
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaWidgetRef>(null);

  // Validate fields
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!values.name.trim()) {
      newErrors.name = t.valNameRequired;
    }

    if (!values.email.trim()) {
      newErrors.email = t.valEmailRequired;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email.trim())) {
        newErrors.email = t.valEmailInvalid;
      }
    }

    if (!values.job_title.trim()) {
      newErrors.job_title = t.valJobTitleRequired;
    }

    // Join expects exactly one choice (either YES or No)
    if (!values.join || values.join.length !== 1 || !['YES', 'No'].includes(values.join[0])) {
      newErrors.join = t.valJoinRequired;
    }

    // If attending, validate guest count if bringing guest
    if (values.join.includes('YES') && values.has_guest) {
      if (!values.guest_count || values.guest_count < 1) {
        newErrors.guest_count = t.valGuestCountRequired;
      }
    }

    // reCAPTCHA check
    if (!recaptchaToken) {
      newErrors.recaptcha = t.valRecaptchaRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handles attendance dropdown selection
  const handleJoinChange = (selected: string) => {
    if (selected === 'YES') {
      setValues((prev) => ({
        ...prev,
        join: ['YES'],
      }));
    } else if (selected === 'No') {
      setValues((prev) => ({
        ...prev,
        join: ['No'],
        has_guest: false,
        guest_count: 0,
      }));
    } else {
      setValues((prev) => ({
        ...prev,
        join: [],
        has_guest: false,
        guest_count: 0,
      }));
    }

    if (errors.join) {
      setErrors((prev) => ({ ...prev, join: undefined }));
    }
  };

  // Handles "Will you be accompanied by a guest?"
  const handleHasGuestSelect = (hasGuest: boolean) => {
    setValues((prev) => ({
      ...prev,
      has_guest: hasGuest,
      guest_count: hasGuest ? (prev.guest_count > 0 ? prev.guest_count : 1) : 0,
    }));

    if (errors.has_guest || errors.guest_count) {
      setErrors((prev) => ({ ...prev, has_guest: undefined, guest_count: undefined }));
    }
  };

  // Handles number of guests dropdown
  const handleGuestCountChange = (count: number) => {
    setValues((prev) => ({
      ...prev,
      guest_count: count,
    }));

    if (errors.guest_count) {
      setErrors((prev) => ({ ...prev, guest_count: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    if (!recaptchaToken) {
      setErrors((prev) => ({ ...prev, recaptcha: t.valRecaptchaRequired }));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitResponse(values, currentLang, recaptchaToken);
      if (res.success) {
        setIsSubmitted(true);
        setValues(INITIAL_VALUES);
        setRecaptchaToken(null);
        recaptchaRef.current?.reset();
        setErrors({});
      } else {
        setErrors({ general: res.error || t.valGeneralError });
        setRecaptchaToken(null);
        recaptchaRef.current?.reset();
      }
    } catch {
      setErrors({ general: t.valGeneralError });
      setRecaptchaToken(null);
      recaptchaRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    if (window.confirm(t.clearConfirm)) {
      setValues(INITIAL_VALUES);
      setErrors({});
      setRecaptchaToken(null);
      recaptchaRef.current?.reset();
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl shadow-emerald-950/5 border border-slate-200/80 overflow-hidden">
          {/* Header decorative accent stripe */}
          <div className="h-3 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500" />
          
          <div className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
              {t.formTitle}
            </h1>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-6">
              <span>{t.formDescription}</span>
            </div>

            <p className="text-lg text-emerald-800 font-medium mb-8 bg-emerald-50 py-3 px-6 rounded-xl border border-emerald-200/60 inline-block">
              {t.confirmationMessage}
            </p>

            <div>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.submitAnotherButton}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PUBLIC FORM VIEW
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Main Card: Event Header & Details */}
        <div className="bg-white rounded-2xl shadow-xl shadow-emerald-950/5 border border-slate-200/80 overflow-hidden relative">
          {/* Top Decorative Banner */}
          <div className="h-3.5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-500" />
          
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
              <Sparkles className="w-4 h-4" />
              <span>{t.nationalDayBadge}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
              {t.formTitle}
            </h1>

            <div className="flex items-center gap-2 text-slate-600 font-medium text-sm sm:text-base mb-6 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200/70">
              <span className="font-semibold text-slate-800">{t.formDescription}</span>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-rose-600 font-medium">
              <span>* {t.requiredHint}</span>
            </div>
          </div>
        </div>

        {/* General Error Banner */}
        {errors.general && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Question 1: Name */}
        <div
          className={`bg-white rounded-xl shadow-sm border p-6 transition-all duration-200 ${
            errors.name ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <label htmlFor="name-input" className="block text-base font-semibold text-slate-900 mb-1">
            {t.nameLabel} <span className="text-rose-500 font-bold">*</span>
          </label>
          <div className="mt-3">
            <input
              id="name-input"
              type="text"
              value={values.name}
              onChange={(e) => {
                setValues({ ...values, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base transition-colors"
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
          </div>
          {errors.name && (
            <p id="name-error" className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        {/* Question 2: Email */}
        <div
          className={`bg-white rounded-xl shadow-sm border p-6 transition-all duration-200 ${
            errors.email ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <label htmlFor="email-input" className="block text-base font-semibold text-slate-900 mb-1">
            {t.emailLabel} <span className="text-rose-500 font-bold">*</span>
          </label>
          <div className="mt-3">
            <input
              id="email-input"
              type="email"
              value={values.email}
              onChange={(e) => {
                setValues({ ...values, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              placeholder={t.emailPlaceholder}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base transition-colors"
              aria-required="true"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.email}</span>
            </p>
          )}
        </div>

        {/* Question 3: Job Title */}
        <div
          className={`bg-white rounded-xl shadow-sm border p-6 transition-all duration-200 ${
            errors.job_title ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <label htmlFor="job-title-input" className="block text-base font-semibold text-slate-900 mb-1">
            {t.jobTitleLabel} <span className="text-rose-500 font-bold">*</span>
          </label>
          <div className="mt-3">
            <textarea
              id="job-title-input"
              rows={3}
              value={values.job_title}
              onChange={(e) => {
                setValues({ ...values, job_title: e.target.value });
                if (errors.job_title) setErrors({ ...errors, job_title: undefined });
              }}
              placeholder={t.jobTitlePlaceholder}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base transition-colors resize-y"
              aria-required="true"
              aria-invalid={Boolean(errors.job_title)}
              aria-describedby={errors.job_title ? 'job-title-error' : undefined}
            />
          </div>
          {errors.job_title && (
            <p id="job-title-error" className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.job_title}</span>
            </p>
          )}
        </div>

        {/* Question 4: Attendance Confirmation Dropdown */}
        <div
          className={`bg-white rounded-xl shadow-sm border p-6 transition-all duration-200 ${
            errors.join ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <label htmlFor="join-attendance-select" className="block text-base font-semibold text-slate-900 mb-3">
            {t.joinLabel} <span className="text-rose-500 font-bold">*</span>
          </label>
          <div className="relative">
            <select
              id="join-attendance-select"
              value={values.join[0] || ''}
              onChange={(e) => handleJoinChange(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm sm:text-base appearance-none bg-white font-medium transition-colors cursor-pointer"
              aria-required="true"
              aria-invalid={Boolean(errors.join)}
            >
              <option value="" disabled>
                {t.joinSelectPlaceholder}
              </option>
              <option value="YES">{t.joinYes}</option>
              <option value="No">{t.joinNo}</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
          {errors.join && (
            <p className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.join}</span>
            </p>
          )}
        </div>

        {/* Question 4b: Accompanying Guest Question (Only appears if attending YES) */}
        {values.join.includes('YES') && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all duration-200">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-emerald-600" />
              <label className="text-base font-semibold text-slate-900">
                {t.hasGuestLabel}
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <button
                type="button"
                onClick={() => handleHasGuestSelect(false)}
                className={`py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all ${
                  !values.has_guest
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-100'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {t.hasGuestNo}
              </button>
              <button
                type="button"
                onClick={() => handleHasGuestSelect(true)}
                className={`py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all ${
                  values.has_guest
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-100'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {t.hasGuestYes}
              </button>
            </div>

            {/* Question 4c: Number of Guests Dropdown (Only appears if bringing guest) */}
            {values.has_guest && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <label htmlFor="guest-count-select" className="block text-sm font-semibold text-slate-800 mb-2">
                  {t.guestCountLabel} <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative max-w-xs">
                  <select
                    id="guest-count-select"
                    value={values.guest_count || ''}
                    onChange={(e) => handleGuestCountChange(Number(e.target.value))}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm appearance-none bg-white font-medium cursor-pointer"
                  >
                    <option value="" disabled>
                      {t.guestCountPlaceholder}
                    </option>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {t.guestCountOption(num)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                {errors.guest_count && (
                  <p className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.guest_count}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Question 5: Rating (1 to 5 Stars) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 p-6 transition-all duration-200">
          <div className="flex items-center justify-between mb-1">
            <span className="block text-base font-semibold text-slate-900">
              {t.ratingLabel}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {currentLang === 'ru' ? 'Необязательно' : 'Optional'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">{t.ratingHint}</p>

          <div className="flex items-center gap-2 sm:gap-4 py-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const isActive = (hoveredStar !== null ? hoveredStar >= star : values.comments !== null && values.comments >= star);
              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => {
                    // Toggle if already selected
                    if (values.comments === star) {
                      setValues({ ...values, comments: null });
                    } else {
                      setValues({ ...values, comments: star });
                    }
                  }}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label={t.starsCount(star)}
                >
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                      isActive
                        ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                        : 'text-slate-300 hover:text-slate-400'
                    }`}
                  />
                  <span className={`text-xs font-semibold ${isActive ? 'text-amber-700' : 'text-slate-500'}`}>
                    {star}
                  </span>
                </button>
              );
            })}
            {values.comments !== null && (
              <button
                type="button"
                onClick={() => setValues({ ...values, comments: null })}
                className="ml-auto text-xs font-medium text-slate-400 hover:text-slate-600 underline"
              >
                {currentLang === 'ru' ? 'Сбросить' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* Google reCAPTCHA v2 Security Challenge */}
        <RecaptchaWidget
          ref={recaptchaRef}
          currentLang={currentLang}
          onSuccess={(token) => {
            setRecaptchaToken(token);
            if (errors.recaptcha) {
              setErrors((prev) => ({ ...prev, recaptcha: undefined }));
            }
          }}
          onExpire={() => {
            setRecaptchaToken(null);
            setErrors((prev) => ({ ...prev, recaptcha: t.valRecaptchaExpired }));
          }}
          onError={() => {
            setRecaptchaToken(null);
            setErrors((prev) => ({ ...prev, recaptcha: t.valRecaptchaFailed }));
          }}
          hasError={Boolean(errors.recaptcha)}
          errorMessage={errors.recaptcha}
        />

        {/* Action Buttons: Submit & Subtle Secondary Clear Form */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !recaptchaToken}
            title={!recaptchaToken ? t.valRecaptchaRequired : t.submitButton}
            className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white transition-all ${
              isSubmitting || !recaptchaToken
                ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-700/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>{t.submittingButton}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t.submitButton}</span>
              </>
            )}
          </button>

          {/* Subtle Secondary Action with Confirmation Dialog */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-2 px-1 focus:outline-none focus:underline"
          >
            {t.clearButton}
          </button>
        </div>
      </form>
    </div>
  );
};

