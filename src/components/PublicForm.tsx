import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FormValues, FormErrors, Language, GuestDetails } from '../types';
import { translations } from '../i18n/translations';
import { submitResponse } from '../services/supabase';
import { getOrganisations } from '../services/organisations';
import { RecaptchaWidget, RecaptchaWidgetRef } from './RecaptchaWidget';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  Users,
  RotateCcw,
  Search,
  X,
  Check,
  Building2,
  User,
  Briefcase,
} from 'lucide-react';

interface PublicFormProps {
  currentLang: Language;
}

const INITIAL_VALUES: FormValues = {
  name: '',
  organisation: '',
  job_title: '',
  join: [],
  has_guest: false,
  guest_count: 0,
  guests: [],
};

function syncGuestsArray(currentGuests: GuestDetails[] = [], targetCount: number): GuestDetails[] {
  if (targetCount <= 0) return [];
  const result: GuestDetails[] = [];
  for (let i = 0; i < targetCount; i++) {
    if (currentGuests[i]) {
      result.push({
        name: currentGuests[i].name || '',
        organisation: currentGuests[i].organisation || '',
        job_title: currentGuests[i].job_title || '',
      });
    } else {
      result.push({ name: '', organisation: '', job_title: '' });
    }
  }
  return result;
}

export const PublicForm: React.FC<PublicFormProps> = ({ currentLang }) => {
  const t = translations[currentLang];

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Dynamic QR Redirect Notice state (when visitor scans an inactive or unknown QR code)
  const [qrNotice, setQrNotice] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('qr_status');
      const slug = params.get('slug');
      if (status === 'inactive') {
        return `The scanned QR code (${slug ? `/qr/${slug}` : 'QR code'}) is currently inactive. You have been directed to the official RSVP form.`;
      }
      if (status === 'not_found') {
        return `The scanned QR code was not found. You have been directed to the official RSVP form.`;
      }
      if (status === 'invalid_destination') {
        return `The QR code destination is being updated. You have been directed to the official RSVP form.`;
      }
    }
    return null;
  });

  // Dynamic Organisations list
  const [organisationsList, setOrganisationsList] = useState<string[]>(() => getOrganisations());

  useEffect(() => {
    const handleUpdate = () => {
      setOrganisationsList(getOrganisations());
    };
    window.addEventListener('organisations-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('organisations-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Organisation selection state: '', preset name, or 'other'
  const [organisationOption, setOrganisationOption] = useState<string>('');
  const [customOrganisation, setCustomOrganisation] = useState<string>('');
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const orgSearchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
    };
    if (isOrgDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOrgDropdownOpen]);

  // Filtered organisations based on user search query
  const filteredOrganisations = useMemo(() => {
    if (!orgSearchQuery.trim()) return organisationsList;
    const q = orgSearchQuery.toLowerCase().trim();
    return organisationsList.filter((org) => org.toLowerCase().includes(q));
  }, [organisationsList, orgSearchQuery]);

  const toggleOrgDropdown = () => {
    setIsOrgDropdownOpen((prev) => {
      const next = !prev;
      if (next) {
        setOrgSearchQuery('');
        setTimeout(() => orgSearchInputRef.current?.focus(), 60);
      }
      return next;
    });
  };

  const handleSelectOrganisation = (org: string) => {
    handleOrganisationChange(org);
    setIsOrgDropdownOpen(false);
    setOrgSearchQuery('');
  };

  const handleSelectOther = () => {
    handleOrganisationChange('other');
    setIsOrgDropdownOpen(false);
    setOrgSearchQuery('');
  };

  // Accompany Guest selection state: '', '1', '2', '3', '4', '5', 'custom'
  const [guestOption, setGuestOption] = useState<string>('');
  const [customGuestCount, setCustomGuestCount] = useState<string>('');

  // Google reCAPTCHA state
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaWidgetRef>(null);

  // Validate fields
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!values.name.trim()) {
      newErrors.name = t.valNameRequired;
    }

    if (!organisationOption) {
      newErrors.organisation = t.valOrganisationRequired;
    } else if (organisationOption === 'other') {
      if (!customOrganisation.trim()) {
        newErrors.organisation = t.valOrganisationOtherRequired;
      }
    } else {
      if (!values.organisation.trim()) {
        newErrors.organisation = t.valOrganisationRequired;
      }
    }

    if (!values.job_title.trim()) {
      newErrors.job_title = t.valJobTitleRequired;
    }

    // Join expects exactly one choice (either YES or No)
    if (!values.join || values.join.length !== 1 || !['YES', 'No'].includes(values.join[0])) {
      newErrors.join = t.valJoinRequired;
    }

    // If attending and bringing guests, validate guest count and each guest's details
    if (values.join.includes('YES') && values.has_guest) {
      if (!guestOption) {
        newErrors.guest_count = t.valGuestCountRequired;
      } else if (guestOption === 'custom') {
        const trimmed = customGuestCount.trim();
        const parsed = parseInt(trimmed, 10);
        if (!trimmed || isNaN(parsed)) {
          newErrors.guest_count = t.valCustomGuestCountRequired;
        } else if (parsed <= 5) {
          newErrors.guest_count = t.valCustomGuestCountMin;
        } else if (parsed > 50) {
          newErrors.guest_count = t.valCustomGuestCountMax;
        }
      } else {
        if (!values.guest_count || values.guest_count < 1) {
          newErrors.guest_count = t.valGuestCountRequired;
        }
      }

      // Validate all mandatory fields for every accompanying guest
      if (values.guest_count > 0 && Array.isArray(values.guests)) {
        const guestErrorsList: Array<{ name?: string; organisation?: string; job_title?: string }> = [];
        let hasAnyGuestError = false;

        for (let i = 0; i < values.guest_count; i++) {
          const g = values.guests[i] || { name: '', organisation: '', job_title: '' };
          const errObj: { name?: string; organisation?: string; job_title?: string } = {};

          if (!g.name || !g.name.trim()) {
            errObj.name = t.valGuestNameRequired;
            hasAnyGuestError = true;
          }
          if (!g.organisation || !g.organisation.trim()) {
            errObj.organisation = t.valGuestOrgRequired;
            hasAnyGuestError = true;
          }
          if (!g.job_title || !g.job_title.trim()) {
            errObj.job_title = t.valGuestJobTitleRequired;
            hasAnyGuestError = true;
          }
          guestErrorsList[i] = errObj;
        }

        if (hasAnyGuestError) {
          newErrors.guests = guestErrorsList;
        }
      }
    }

    // reCAPTCHA check
    if (!recaptchaToken) {
      newErrors.recaptcha = t.valRecaptchaRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handles organisation dropdown selection
  const handleOrganisationChange = (selected: string) => {
    setOrganisationOption(selected);
    if (selected === 'other') {
      setValues((prev) => ({ ...prev, organisation: customOrganisation.trim() }));
    } else {
      setCustomOrganisation('');
      setValues((prev) => ({ ...prev, organisation: selected }));
    }
    if (errors.organisation) {
      setErrors((prev) => ({ ...prev, organisation: undefined }));
    }
  };

  // Handles custom organisation text input when "Others" is chosen
  const handleCustomOrganisationChange = (val: string) => {
    setCustomOrganisation(val);
    setValues((prev) => ({ ...prev, organisation: val }));
    if (errors.organisation) {
      setErrors((prev) => ({ ...prev, organisation: undefined }));
    }
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
        guests: [],
      }));
      setGuestOption('');
      setCustomGuestCount('');
    } else {
      setValues((prev) => ({
        ...prev,
        join: [],
        has_guest: false,
        guest_count: 0,
        guests: [],
      }));
      setGuestOption('');
      setCustomGuestCount('');
    }

    if (errors.join) {
      setErrors((prev) => ({ ...prev, join: undefined }));
    }
  };

  // Handles "Will you be accompanied by a guest?"
  const handleHasGuestSelect = (hasGuest: boolean) => {
    if (hasGuest) {
      const nextOption = guestOption || '1';
      let nextCount = Number(nextOption);
      if (nextOption === 'custom') {
        const parsed = parseInt(customGuestCount.trim(), 10);
        nextCount = !isNaN(parsed) && parsed > 5 && parsed <= 50 ? parsed : 0;
      }

      setValues((prev) => ({
        ...prev,
        has_guest: true,
        guest_count: nextCount,
        guests: syncGuestsArray(prev.guests, nextCount),
      }));
      setGuestOption(nextOption);
    } else {
      setValues((prev) => ({
        ...prev,
        has_guest: false,
        guest_count: 0,
        guests: [],
      }));
      setGuestOption('');
      setCustomGuestCount('');
    }

    if (errors.has_guest || errors.guest_count || errors.guests) {
      setErrors((prev) => ({ ...prev, has_guest: undefined, guest_count: undefined, guests: undefined }));
    }
  };

  // Handles number of guests dropdown
  const handleGuestDropdownChange = (selected: string) => {
    setGuestOption(selected);

    if (selected === 'custom') {
      const parsed = parseInt(customGuestCount.trim(), 10);
      if (!isNaN(parsed) && parsed > 5 && parsed <= 50) {
        setValues((prev) => ({
          ...prev,
          guest_count: parsed,
          guests: syncGuestsArray(prev.guests, parsed),
        }));
      } else {
        setValues((prev) => ({
          ...prev,
          guest_count: 0,
          guests: [],
        }));
      }
    } else {
      // When an existing option (1-5) is selected, hide custom input and clear its value
      setCustomGuestCount('');
      const count = Number(selected);
      setValues((prev) => ({
        ...prev,
        guest_count: count,
        guests: syncGuestsArray(prev.guests, count),
      }));
    }

    if (errors.guest_count || errors.guests) {
      setErrors((prev) => ({ ...prev, guest_count: undefined, guests: undefined }));
    }
  };

  // Handles custom number of guests input
  const handleCustomGuestCountChange = (val: string) => {
    setCustomGuestCount(val);
    const parsed = parseInt(val.trim(), 10);
    if (!isNaN(parsed) && parsed > 5 && parsed <= 50) {
      setValues((prev) => ({
        ...prev,
        guest_count: parsed,
        guests: syncGuestsArray(prev.guests, parsed),
      }));
      if (errors.guest_count || errors.guests) {
        setErrors((prev) => ({ ...prev, guest_count: undefined, guests: undefined }));
      }
    } else {
      setValues((prev) => ({
        ...prev,
        guest_count: 0,
        guests: [],
      }));
    }
  };

  // Handles individual guest field changes
  const handleGuestFieldChange = (index: number, field: keyof GuestDetails, val: string) => {
    setValues((prev) => {
      const updated = [...(prev.guests || [])];
      while (updated.length <= index) {
        updated.push({ name: '', organisation: '', job_title: '' });
      }
      updated[index] = {
        ...updated[index],
        [field]: val,
      };
      return {
        ...prev,
        guests: updated,
      };
    });

    if (errors.guests && errors.guests[index] && errors.guests[index][field]) {
      setErrors((prev) => {
        if (!prev.guests) return prev;
        const nextGuestsErrors = [...prev.guests];
        if (nextGuestsErrors[index]) {
          nextGuestsErrors[index] = {
            ...nextGuestsErrors[index],
            [field]: undefined,
          };
        }
        return {
          ...prev,
          guests: nextGuestsErrors,
        };
      });
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
        setOrganisationOption('');
        setCustomOrganisation('');
        setIsOrgDropdownOpen(false);
        setOrgSearchQuery('');
        setGuestOption('');
        setCustomGuestCount('');
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
      setOrganisationOption('');
      setCustomOrganisation('');
      setIsOrgDropdownOpen(false);
      setOrgSearchQuery('');
      setGuestOption('');
      setCustomGuestCount('');
      setErrors({});
      setRecaptchaToken(null);
      recaptchaRef.current?.reset();
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-[#5C3B5E]/5 border border-white/80 sm:border-[#BAA2BA]/30 overflow-hidden">
          {/* Header decorative accent stripe */}
          <div className="h-3.5 bg-gradient-to-r from-[#7D5A7E] via-[#9E7B9E] to-[#BAA2BA]" />
          
          <div className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-[#BAA2BA]/20 text-[#754F76] rounded-full flex items-center justify-center ring-8 ring-[#BAA2BA]/15">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
              {t.formTitle}
            </h1>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-6">
              <span>{t.formDescription}</span>
            </div>

            <p className="text-base sm:text-lg text-[#5C3B5E] font-semibold mb-8 bg-[#BAA2BA]/15 py-3 px-6 rounded-xl border border-[#BAA2BA]/30 inline-block">
              {t.confirmationMessage}
            </p>

            <div>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8C6B8D] to-[#754F76] hover:from-[#7D5C7E] hover:to-[#684369] text-white font-semibold text-sm transition-all shadow-md shadow-[#8C6B8D]/20 hover:shadow-lg hover:-translate-y-0.5"
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
      {/* Notice for visitors scanning an inactive or unknown QR code */}
      {qrNotice && (
        <div className="mb-6 bg-amber-50/95 backdrop-blur-md border border-amber-200/90 text-amber-950 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-medium">
              <span className="font-bold block text-amber-900 mb-0.5">QR Notice</span>
              <span>{qrNotice}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setQrNotice(null)}
            className="p-1 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors flex-shrink-0"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Main Card: Event Header & Details */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-[#5C3B5E]/5 border border-white/80 sm:border-[#BAA2BA]/25 overflow-hidden relative">
          {/* Top Decorative Banner */}
          <div className="h-3.5 bg-gradient-to-r from-[#7D5A7E] via-[#9E7B9E] to-[#BAA2BA]" />
          
          <div className="p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A577B] mb-3 px-2.5 py-1 rounded-full bg-[#BAA2BA]/15 border border-[#BAA2BA]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#8C6B8D]" />
              <span>{t.nationalDayBadge}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
              {t.formTitle}
            </h1>

            <div className="flex items-center gap-2 text-slate-600 font-medium text-sm sm:text-base mb-6 bg-slate-50/90 px-3.5 py-2 rounded-lg border border-slate-200/70">
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

        {/* Question 1: Full Name */}
        <div
          className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-xs border p-6 transition-all duration-200 ${
            errors.name ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200/90 hover:border-[#BAA2BA]/60'
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
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D] text-slate-900 placeholder:text-slate-400 text-sm sm:text-base transition-colors"
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

        {/* Question 2: Organisation Name Searchable Dropdown with "Others" custom input */}
        <div
          ref={orgDropdownRef}
          className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-xs border p-6 transition-all duration-200 relative ${
            isOrgDropdownOpen ? 'z-20' : 'z-auto'
          } ${
            errors.organisation ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200/90 hover:border-[#BAA2BA]/60'
          }`}
        >
          <label className="block text-base font-semibold text-slate-900 mb-1">
            {t.organisationLabel} <span className="text-rose-500 font-bold">*</span>
          </label>

          {/* Searchable Select Trigger Button */}
          <div className={`mt-3 relative ${isOrgDropdownOpen ? 'z-30' : 'z-auto'}`}>
            <button
              type="button"
              onClick={toggleOrgDropdown}
              aria-haspopup="listbox"
              aria-expanded={isOrgDropdownOpen}
              className={`w-full px-4 py-2.5 rounded-lg border text-left flex items-center justify-between transition-colors bg-white ${
                isOrgDropdownOpen
                  ? 'border-[#8C6B8D] ring-2 ring-[#9E7B9E]/25'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <Building2
                  className={`w-4 h-4 flex-shrink-0 ${
                    organisationOption ? 'text-[#8C6B8D]' : 'text-slate-400'
                  }`}
                />
                <span
                  className={`text-sm sm:text-base truncate ${
                    organisationOption ? 'text-slate-900 font-medium' : 'text-slate-400'
                  }`}
                >
                  {organisationOption === 'other'
                    ? t.organisationOtherOption
                    : organisationOption || t.organisationSelectPlaceholder}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {organisationOption && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrganisationChange('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        handleOrganisationChange('');
                      }
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                {isOrgDropdownOpen ? (
                  <ChevronUp className="w-4 h-4 text-[#8C6B8D]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {/* Dropdown Popover Menu with Live Search Filter */}
            {isOrgDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                {/* Search input header */}
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={orgSearchInputRef}
                      type="text"
                      value={orgSearchQuery}
                      onChange={(e) => setOrgSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsOrgDropdownOpen(false);
                        }
                      }}
                      placeholder={t.searchOrganisationsPlaceholder}
                      className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D] placeholder:text-slate-400 text-slate-800"
                    />
                    {orgSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrgSearchQuery('');
                          orgSearchInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtered Organisations List */}
                <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                  {filteredOrganisations.length > 0 ? (
                    filteredOrganisations.map((org) => {
                      const isSelected = organisationOption === org;
                      return (
                        <button
                          key={org}
                          type="button"
                          onClick={() => handleSelectOrganisation(org)}
                          className={`w-full px-3 py-2 text-left rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#BAA2BA]/20 text-[#5C3B5E] font-bold'
                              : 'text-slate-700 hover:bg-[#BAA2BA]/10 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate">{org}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#8C6B8D] flex-shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-6 px-3 text-center">
                      <p className="text-xs text-slate-500 font-medium">
                        {t.noOrganisationsFound}
                      </p>
                    </div>
                  )}

                  {/* "Others" Option permanently pinned at bottom */}
                  <div className="pt-1 mt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSelectOther}
                      className={`w-full px-3 py-2 text-left rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-between ${
                        organisationOption === 'other'
                          ? 'bg-[#BAA2BA]/20 text-[#5C3B5E] font-bold'
                          : 'text-[#7A577B] hover:bg-[#BAA2BA]/15'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span>{t.organisationOtherOption}</span>
                        <span className="text-[11px] font-normal text-slate-400">(specify manually)</span>
                      </span>
                      {organisationOption === 'other' && (
                        <Check className="w-4 h-4 text-[#8C6B8D] flex-shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* If "Others" is selected, display custom organisation input field */}
          {organisationOption === 'other' && (
            <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
              <label htmlFor="custom-organisation-input" className="block text-xs font-semibold text-slate-700 mb-1">
                {t.organisationOtherPlaceholder} <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="custom-organisation-input"
                type="text"
                value={customOrganisation}
                onChange={(e) => handleCustomOrganisationChange(e.target.value)}
                placeholder={t.organisationPlaceholder}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D] text-slate-900 placeholder:text-slate-400 text-sm sm:text-base transition-colors"
                autoFocus
                aria-required="true"
              />
            </div>
          )}

          {errors.organisation && (
            <p id="organisation-error" className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.organisation}</span>
            </p>
          )}
        </div>

        {/* Question 3: Job Title */}
        <div
          className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-xs border p-6 transition-all duration-200 ${
            errors.job_title ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200/90 hover:border-[#BAA2BA]/60'
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
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D] text-slate-900 placeholder:text-slate-400 text-sm sm:text-base transition-colors resize-y"
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

        {/* Question 3: Attendance Confirmation Dropdown */}
        <div
          className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-xs border p-6 transition-all duration-200 ${
            errors.join ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200/90 hover:border-[#BAA2BA]/60'
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
              className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D] text-slate-900 text-sm sm:text-base appearance-none bg-white font-medium transition-colors cursor-pointer"
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

        {/* Question 3b: Accompanying Guest Question (Only appears if attending YES) */}
        {values.join.includes('YES') && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xs border border-slate-200/90 p-6 transition-all duration-200">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#8C6B8D]" />
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
                    ? 'bg-[#BAA2BA]/20 border-[#8C6B8D] text-[#5C3B5E] ring-2 ring-[#BAA2BA]/25 font-bold'
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
                    ? 'bg-[#BAA2BA]/20 border-[#8C6B8D] text-[#5C3B5E] ring-2 ring-[#BAA2BA]/25 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {t.hasGuestYes}
              </button>
            </div>

            {/* Question 3c: Number of Guests Dropdown (Only appears if bringing guest) */}
            {values.has_guest && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <label htmlFor="guest-count-select" className="block text-sm font-semibold text-slate-800 mb-2">
                  {t.guestCountLabel} <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative max-w-xs">
                  <select
                    id="guest-count-select"
                    value={guestOption}
                    onChange={(e) => handleGuestDropdownChange(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D] text-slate-900 text-sm appearance-none bg-white font-medium cursor-pointer"
                  >
                    <option value="" disabled>
                      {t.guestCountPlaceholder}
                    </option>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={String(num)}>
                        {t.guestCountOption(num)}
                      </option>
                    ))}
                    <option value="custom">{t.guestCountCustomOption}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Custom Number Input when 'Custom' is selected */}
                {guestOption === 'custom' && (
                  <div className="mt-3">
                    <label htmlFor="custom-guest-count-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t.customGuestCountLabel} <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      id="custom-guest-count-input"
                      type="number"
                      min="6"
                      step="1"
                      value={customGuestCount}
                      onChange={(e) => handleCustomGuestCountChange(e.target.value)}
                      placeholder={t.customGuestCountPlaceholder}
                      className={`w-full max-w-xs px-4 py-2.5 rounded-xl border ${
                        errors.guest_count
                          ? 'border-rose-400 ring-2 ring-rose-100'
                          : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D]'
                      } text-slate-900 text-sm font-medium transition-colors`}
                      aria-required="true"
                      aria-invalid={Boolean(errors.guest_count)}
                    />
                  </div>
                )}

                {errors.guest_count && (
                  <p className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.guest_count}</span>
                  </p>
                )}

                {/* Dynamically Generated Guest Sections */}
                {values.guest_count > 0 && values.guests && values.guests.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-200/90 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#8C6B8D]" />
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                          {t.guestsDetailsHeader} ({values.guests.length})
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#BAA2BA]/20 text-[#684769] border border-[#BAA2BA]/30">
                        All fields required
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t.guestsDetailsSubtitle}
                    </p>

                    <div className="space-y-4 pt-1">
                      {values.guests.map((guest, idx) => {
                        const guestError = errors.guests?.[idx];
                        return (
                          <div
                            key={idx}
                            className="p-4 sm:p-5 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-3.5 shadow-xs"
                          >
                            {/* Guest Header Badge */}
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#8C6B8D] to-[#754F76] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                  {t.guestSectionTitle(idx + 1)}
                                </span>
                              </div>
                            </div>

                            {/* Guest Field 1: Full Name */}
                            <div>
                              <label htmlFor={`guest-${idx}-name`} className="block text-xs font-semibold text-slate-700 mb-1">
                                {t.guestNameLabel(idx + 1)} <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                  <User className="w-4 h-4" />
                                </div>
                                <input
                                  id={`guest-${idx}-name`}
                                  type="text"
                                  value={guest.name}
                                  onChange={(e) => handleGuestFieldChange(idx, 'name', e.target.value)}
                                  placeholder={t.guestNamePlaceholder}
                                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border ${
                                    guestError?.name
                                      ? 'border-rose-400 ring-2 ring-rose-100'
                                      : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D]'
                                  } text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm bg-white transition-colors`}
                                />
                              </div>
                              {guestError?.name && (
                                <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  <span>{guestError.name}</span>
                                </p>
                              )}
                            </div>

                            {/* Guest Field 2: Organisation */}
                            <div>
                              <label htmlFor={`guest-${idx}-org`} className="block text-xs font-semibold text-slate-700 mb-1">
                                {t.guestOrgLabel(idx + 1)} <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <input
                                  id={`guest-${idx}-org`}
                                  type="text"
                                  value={guest.organisation}
                                  onChange={(e) => handleGuestFieldChange(idx, 'organisation', e.target.value)}
                                  placeholder={t.guestOrgPlaceholder}
                                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border ${
                                    guestError?.organisation
                                      ? 'border-rose-400 ring-2 ring-rose-100'
                                      : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D]'
                                  } text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm bg-white transition-colors`}
                                />
                              </div>
                              {guestError?.organisation && (
                                <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  <span>{guestError.organisation}</span>
                                </p>
                              )}
                            </div>

                            {/* Guest Field 3: Job Title */}
                            <div>
                              <label htmlFor={`guest-${idx}-job`} className="block text-xs font-semibold text-slate-700 mb-1">
                                {t.guestJobTitleLabel(idx + 1)} <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                  <Briefcase className="w-4 h-4" />
                                </div>
                                <input
                                  id={`guest-${idx}-job`}
                                  type="text"
                                  value={guest.job_title}
                                  onChange={(e) => handleGuestFieldChange(idx, 'job_title', e.target.value)}
                                  placeholder={t.guestJobTitlePlaceholder}
                                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border ${
                                    guestError?.job_title
                                      ? 'border-rose-400 ring-2 ring-rose-100'
                                      : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9E7B9E]/35 focus:border-[#8C6B8D]'
                                  } text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm bg-white transition-colors`}
                                />
                              </div>
                              {guestError?.job_title && (
                                <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  <span>{guestError.job_title}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                : 'bg-gradient-to-r from-[#8C6B8D] to-[#754F76] hover:from-[#7D5C7E] hover:to-[#684369] active:scale-95 shadow-lg shadow-[#8C6B8D]/25'
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

