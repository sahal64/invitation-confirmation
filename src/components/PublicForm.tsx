import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FormValues, FormErrors, Language, GuestDetails } from '../types';
import { translations } from '../i18n/translations';
import { submitResponse } from '../services/supabase';
import { getOrganisations } from '../services/organisations';
import { RecaptchaWidget, RecaptchaWidgetRef } from './RecaptchaWidget';
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users,
  RotateCcw,
  Search,
  X,
  Check,
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
      <div className="max-w-[600px] mx-auto px-4 py-12">
        <div 
          className="relative rounded-[32px] border border-white/85 shadow-[0_44px_70px_-26px_rgba(140,70,15,0.4)] backdrop-blur-[22px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 236, 205, 0.5))' }}
        >
          {/* Glare Layer 1 */}
          <div 
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(112deg, rgba(255, 255, 255, 0.55) 0% 30%, rgba(255, 255, 255, 0) 30% 100%)',
            }}
          />
          {/* Glare Layer 2 (Highlight edge line) */}
          <div 
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(112deg, transparent 0% 33%, rgba(255, 255, 255, 0.22) 33% 36%, transparent 36% 100%)',
            }}
          />

          <div className="relative z-10 p-8 sm:p-[44px] text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-white/80 text-emerald-600 rounded-full flex items-center justify-center ring-8 ring-emerald-100/60 shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h1 className="text-[26px] sm:text-[32px] font-extrabold text-[#3B1F0E] leading-tight mb-2">
              {t.formTitle}
            </h1>

            <p className="text-[15px] text-[#6B4A33] font-medium mb-6">
              {t.formDescription}
            </p>

            <div>
              <p className="text-base sm:text-lg text-emerald-900 font-semibold mb-8 bg-white/85 py-3.5 px-6 rounded-2xl border border-emerald-200/80 inline-block shadow-sm">
                {t.confirmationMessage}
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="h-14 rounded-2xl px-9 font-bold text-white transition-all bg-[linear-gradient(135deg,#D26E2A,#A8481B)] shadow-[0_12px_24px_-10px_rgba(120,60,10,0.5)] hover:brightness-110 active:scale-95 inline-flex items-center gap-2"
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

  // PUBLIC FORM VIEW - GLASS GLOSS REFERENCE DESIGN
  return (
    <div className="max-w-[600px] mx-auto px-4 py-8 sm:py-12">
      <form onSubmit={handleSubmit} noValidate>
        {/* Glass Gloss Frosted Card */}
        <div 
          className="relative rounded-[32px] border border-white/85 shadow-[0_44px_70px_-26px_rgba(140,70,15,0.4)] backdrop-blur-[22px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 236, 205, 0.5))' }}
        >
          {/* Glare Layer 1 (Diagonal light sweep) */}
          <div 
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(112deg, rgba(255, 255, 255, 0.55) 0% 30%, rgba(255, 255, 255, 0) 30% 100%)',
            }}
          />
          {/* Glare Layer 2 (Thin highlight line on glare edge) */}
          <div 
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(112deg, transparent 0% 33%, rgba(255, 255, 255, 0.22) 33% 36%, transparent 36% 100%)',
            }}
          />

          {/* Content Container sits above glare layers */}
          <div className="relative z-10 p-6 sm:p-[44px] space-y-6">
            {/* Header Area */}
            <div>
              {/* Title */}
              <h1 className="text-[26px] sm:text-[32px] font-extrabold text-[#3B1F0E] leading-tight mb-2">
                {t.formTitle}
              </h1>

              {/* Date line */}
              <p className="text-[15px] text-[#6B4A33] font-medium">
                {t.formDescription}
              </p>

              {/* General Error Banner */}
              {errors.general && (
                <div className="mt-4 bg-rose-50/90 border border-rose-200 rounded-xl p-4 text-rose-800 text-sm flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span>{errors.general}</span>
                </div>
              )}
            </div>

            {/* Field 1: Full Name */}
            <div>
              <label htmlFor="name-input" className="block text-[14px] sm:text-[15px] font-semibold text-[#3B1F0E] mb-2">
                {t.nameLabel} <span className="text-[#9A4A1B] font-bold">*</span>
              </label>
              <input
                id="name-input"
                type="text"
                value={values.name}
                onChange={(e) => {
                  setValues({ ...values, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder={t.namePlaceholder}
                className={`w-full h-[52px] rounded-[14px] bg-white/80 border ${
                  errors.name
                    ? 'border-rose-400 bg-white ring-4 ring-rose-200/50'
                    : 'border-[#9A4A1B]/20 hover:border-[#9A4A1B]/40 focus:border-[#C8622A] focus:bg-white focus:ring-4 focus:ring-[#F4B968]/40'
                } px-[18px] text-[15px] text-[#3B1F0E] placeholder:text-[#7A5A44]/60 transition-all outline-none shadow-xs`}
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Field 2: Organisation Name */}
            <div ref={orgDropdownRef} className="relative">
              <label className="block text-[14px] sm:text-[15px] font-semibold text-[#3B1F0E] mb-2">
                {t.organisationLabel} <span className="text-[#9A4A1B] font-bold">*</span>
              </label>

              {/* Select Trigger */}
              <div className={`relative ${isOrgDropdownOpen ? 'z-30' : 'z-auto'}`}>
                <button
                  type="button"
                  onClick={toggleOrgDropdown}
                  aria-haspopup="listbox"
                  aria-expanded={isOrgDropdownOpen}
                  className={`w-full h-[52px] rounded-[14px] bg-white/80 border ${
                    errors.organisation
                      ? 'border-rose-400 bg-white ring-4 ring-rose-200/50'
                      : isOrgDropdownOpen
                      ? 'border-[#C8622A] bg-white ring-4 ring-[#F4B968]/40'
                      : 'border-[#9A4A1B]/20 hover:border-[#9A4A1B]/40'
                  } px-[18px] text-[15px] text-left flex items-center justify-between transition-all outline-none shadow-xs`}
                >
                  <span
                    className={`truncate pr-2 ${
                      organisationOption ? 'text-[#3B1F0E] font-medium' : 'text-[#7A5A44]/60'
                    }`}
                  >
                    {organisationOption === 'other'
                      ? t.organisationOtherOption
                      : organisationOption || t.organisationSelectPlaceholder}
                  </span>

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
                        className="p-1 rounded-md text-[#7A5A44] hover:text-[#3B1F0E] hover:bg-slate-100 transition-colors"
                        title="Clear selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isOrgDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#C8622A]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#7A5A44]" />
                    )}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isOrgDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                    <div className="p-3 border-b border-slate-100 bg-amber-50/40">
                      <div className="relative">
                        <Search className="w-4 h-4 text-[#7A5A44] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                          className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-[#3B1F0E] placeholder:text-[#7A5A44]/60 focus:outline-none focus:border-[#C8622A] focus:ring-2 focus:ring-[#F4B968]/40"
                        />
                        {orgSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrgSearchQuery('');
                              orgSearchInputRef.current?.focus();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#7A5A44] hover:text-[#3B1F0E] rounded"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                      {filteredOrganisations.length > 0 ? (
                        filteredOrganisations.map((org) => {
                          const isSelected = organisationOption === org;
                          return (
                            <button
                              key={org}
                              type="button"
                              onClick={() => handleSelectOrganisation(org)}
                              className={`w-full px-3.5 py-2.5 text-left rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#FCE8D3] text-[#9A4A1B] font-bold'
                                  : 'text-[#3B1F0E] hover:bg-amber-500/10'
                              }`}
                            >
                              <span className="truncate">{org}</span>
                              {isSelected && <Check className="w-4 h-4 text-[#9A4A1B] flex-shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-6 px-3 text-center">
                          <p className="text-xs text-[#7A5A44] font-medium">
                            {t.noOrganisationsFound}
                          </p>
                        </div>
                      )}

                      <div className="pt-1 mt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleSelectOther}
                          className={`w-full px-3.5 py-2.5 text-left rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                            organisationOption === 'other'
                              ? 'bg-[#FCE8D3] text-[#9A4A1B] font-bold'
                              : 'text-[#9A4A1B] hover:bg-amber-500/10'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span>{t.organisationOtherOption}</span>
                            <span className="text-[11px] font-normal text-slate-400">(specify manually)</span>
                          </span>
                          {organisationOption === 'other' && (
                            <Check className="w-4 h-4 text-[#9A4A1B] flex-shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {organisationOption === 'other' && (
                <div className="mt-3 animate-in fade-in duration-200">
                  <label htmlFor="custom-organisation-input" className="block text-xs font-semibold text-[#7A5A44] mb-1.5">
                    {t.organisationOtherPlaceholder} <span className="text-[#9A4A1B] font-bold">*</span>
                  </label>
                  <input
                    id="custom-organisation-input"
                    type="text"
                    value={customOrganisation}
                    onChange={(e) => handleCustomOrganisationChange(e.target.value)}
                    placeholder={t.organisationPlaceholder}
                    className="w-full h-[52px] rounded-[14px] bg-white/80 border border-[#9A4A1B]/20 hover:border-[#9A4A1B]/40 focus:border-[#C8622A] focus:bg-white focus:ring-4 focus:ring-[#F4B968]/40 px-[18px] text-[15px] text-[#3B1F0E] placeholder:text-[#7A5A44]/60 transition-all outline-none shadow-xs"
                    autoFocus
                    aria-required="true"
                  />
                </div>
              )}

              {errors.organisation && (
                <p id="organisation-error" className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.organisation}</span>
                </p>
              )}
            </div>

            {/* Field 3: Job Title */}
            <div>
              <label htmlFor="job-title-input" className="block text-[14px] sm:text-[15px] font-semibold text-[#3B1F0E] mb-2">
                {t.jobTitleLabel} <span className="text-[#9A4A1B] font-bold">*</span>
              </label>
              <textarea
                id="job-title-input"
                rows={2}
                value={values.job_title}
                onChange={(e) => {
                  setValues({ ...values, job_title: e.target.value });
                  if (errors.job_title) setErrors({ ...errors, job_title: undefined });
                }}
                placeholder={t.jobTitlePlaceholder}
                className={`w-full py-3.5 rounded-[14px] bg-white/80 border ${
                  errors.job_title
                    ? 'border-rose-400 bg-white ring-4 ring-rose-200/50'
                    : 'border-[#9A4A1B]/20 hover:border-[#9A4A1B]/40 focus:border-[#C8622A] focus:bg-white focus:ring-4 focus:ring-[#F4B968]/40'
                } px-[18px] text-[15px] text-[#3B1F0E] placeholder:text-[#7A5A44]/60 transition-all outline-none shadow-xs resize-y`}
                aria-required="true"
                aria-invalid={Boolean(errors.job_title)}
                aria-describedby={errors.job_title ? 'job-title-error' : undefined}
              />
              {errors.job_title && (
                <p id="job-title-error" className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.job_title}</span>
                </p>
              )}
            </div>

            {/* Field 4: Attendance Confirmation Dropdown */}
            <div>
              <label htmlFor="join-attendance-select" className="block text-[14px] sm:text-[15px] font-semibold text-[#3B1F0E] mb-2">
                {t.joinLabel} <span className="text-[#9A4A1B] font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  id="join-attendance-select"
                  value={values.join[0] || ''}
                  onChange={(e) => handleJoinChange(e.target.value)}
                  className={`w-full h-[52px] rounded-[14px] bg-white/80 border ${
                    errors.join
                      ? 'border-rose-400 bg-white ring-4 ring-rose-200/50'
                      : 'border-[#9A4A1B]/20 hover:border-[#9A4A1B]/40 focus:border-[#C8622A] focus:bg-white focus:ring-4 focus:ring-[#F4B968]/40'
                  } px-[18px] pr-10 text-[15px] ${
                    values.join[0] ? 'text-[#3B1F0E]' : 'text-[#7A5A44]/60'
                  } appearance-none cursor-pointer transition-all outline-none shadow-xs font-medium`}
                  aria-required="true"
                  aria-invalid={Boolean(errors.join)}
                >
                  <option value="" disabled>
                    {t.joinSelectPlaceholder}
                  </option>
                  <option value="YES">{t.joinYes}</option>
                  <option value="No">{t.joinNo}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#7A5A44]">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {errors.join && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.join}</span>
                </p>
              )}
            </div>

            {/* Field 5: Accompanying Guest Question (Only appears if attending YES) */}
            {values.join.includes('YES') && (
              <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 p-5 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#9A4A1B]" />
                  <label className="text-[14px] sm:text-[15px] font-semibold text-[#3B1F0E]">
                    {t.hasGuestLabel}
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  <button
                    type="button"
                    onClick={() => handleHasGuestSelect(false)}
                    className={`h-11 rounded-xl font-bold text-sm transition-all ${
                      !values.has_guest
                        ? 'bg-[linear-gradient(135deg,#D26E2A,#A8481B)] text-white shadow-md shadow-amber-900/20'
                        : 'bg-white/80 border border-[#9A4A1B]/20 text-[#3B1F0E] hover:bg-white'
                    }`}
                  >
                    {t.hasGuestNo}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHasGuestSelect(true)}
                    className={`h-11 rounded-xl font-bold text-sm transition-all ${
                      values.has_guest
                        ? 'bg-[linear-gradient(135deg,#D26E2A,#A8481B)] text-white shadow-md shadow-amber-900/20'
                        : 'bg-white/80 border border-[#9A4A1B]/20 text-[#3B1F0E] hover:bg-white'
                    }`}
                  >
                    {t.hasGuestYes}
                  </button>
                </div>

                {/* Guest Count Dropdown */}
                {values.has_guest && (
                  <div className="pt-4 border-t border-amber-900/10 space-y-3">
                    <label htmlFor="guest-count-select" className="block text-sm font-semibold text-[#3B1F0E]">
                      {t.guestCountLabel} <span className="text-[#9A4A1B] font-bold">*</span>
                    </label>
                    <div className="relative max-w-xs">
                      <select
                        id="guest-count-select"
                        value={guestOption}
                        onChange={(e) => handleGuestDropdownChange(e.target.value)}
                        className="w-full h-11 rounded-xl bg-white/90 border border-[#9A4A1B]/20 px-4 pr-10 text-sm text-[#3B1F0E] appearance-none cursor-pointer outline-none focus:border-[#C8622A] focus:ring-2 focus:ring-[#F4B968]/40 font-medium"
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
                      <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[#7A5A44]">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Custom Number Input */}
                    {guestOption === 'custom' && (
                      <div className="mt-2">
                        <label htmlFor="custom-guest-count-input" className="block text-xs font-semibold text-[#7A5A44] mb-1">
                          {t.customGuestCountLabel} <span className="text-[#9A4A1B] font-bold">*</span>
                        </label>
                        <input
                          id="custom-guest-count-input"
                          type="number"
                          min="6"
                          step="1"
                          value={customGuestCount}
                          onChange={(e) => handleCustomGuestCountChange(e.target.value)}
                          placeholder={t.customGuestCountPlaceholder}
                          className={`w-full max-w-xs h-11 rounded-xl bg-white/90 border ${
                            errors.guest_count
                              ? 'border-rose-400 ring-2 ring-rose-200'
                              : 'border-[#9A4A1B]/20 focus:border-[#C8622A] focus:ring-2 focus:ring-[#F4B968]/40'
                          } px-4 text-sm text-[#3B1F0E] font-medium transition-all outline-none`}
                          aria-required="true"
                          aria-invalid={Boolean(errors.guest_count)}
                        />
                      </div>
                    )}

                    {errors.guest_count && (
                      <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.guest_count}</span>
                      </p>
                    )}

                    {/* Dynamic Guest Cards */}
                    {values.guest_count > 0 && values.guests && values.guests.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-amber-900/10 space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-sm font-bold text-[#3B1F0E] tracking-tight">
                            {t.guestsDetailsHeader} ({values.guests.length})
                          </h4>
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/75 text-[#9A4A1B] border border-white/60">
                            All fields required
                          </span>
                        </div>

                        <div className="space-y-4 pt-1">
                          {values.guests.map((guest, idx) => {
                            const guestError = errors.guests?.[idx];
                            return (
                              <div
                                key={idx}
                                className="p-4 sm:p-5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md shadow-xs space-y-3.5"
                              >
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                  <span className="w-5 h-5 rounded-full bg-[linear-gradient(135deg,#D26E2A,#A8481B)] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-[#3B1F0E] uppercase tracking-wide">
                                    {t.guestSectionTitle(idx + 1)}
                                  </span>
                                </div>

                                {/* Guest Name */}
                                <div>
                                  <label htmlFor={`guest-${idx}-name`} className="block text-xs font-semibold text-[#7A5A44] mb-1">
                                    {t.guestNameLabel(idx + 1)} <span className="text-[#9A4A1B] font-bold">*</span>
                                  </label>
                                  <input
                                    id={`guest-${idx}-name`}
                                    type="text"
                                    value={guest.name}
                                    onChange={(e) => handleGuestFieldChange(idx, 'name', e.target.value)}
                                    placeholder={t.guestNamePlaceholder}
                                    className={`w-full h-11 px-3.5 rounded-xl bg-white/90 border ${
                                      guestError?.name
                                        ? 'border-rose-400 ring-2 ring-rose-200'
                                        : 'border-[#9A4A1B]/20 focus:border-[#C8622A] focus:ring-2 focus:ring-[#F4B968]/40'
                                    } text-sm text-[#3B1F0E] placeholder:text-[#7A5A44]/60 transition-all outline-none`}
                                  />
                                  {guestError?.name && (
                                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                      <span>{guestError.name}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Guest Organisation */}
                                <div>
                                  <label htmlFor={`guest-${idx}-org`} className="block text-xs font-semibold text-[#7A5A44] mb-1">
                                    {t.guestOrgLabel(idx + 1)} <span className="text-[#9A4A1B] font-bold">*</span>
                                  </label>
                                  <input
                                    id={`guest-${idx}-org`}
                                    type="text"
                                    value={guest.organisation}
                                    onChange={(e) => handleGuestFieldChange(idx, 'organisation', e.target.value)}
                                    placeholder={t.guestOrgPlaceholder}
                                    className={`w-full h-11 px-3.5 rounded-xl bg-white/90 border ${
                                      guestError?.organisation
                                        ? 'border-rose-400 ring-2 ring-rose-200'
                                        : 'border-[#9A4A1B]/20 focus:border-[#C8622A] focus:ring-2 focus:ring-[#F4B968]/40'
                                    } text-sm text-[#3B1F0E] placeholder:text-[#7A5A44]/60 transition-all outline-none`}
                                  />
                                  {guestError?.organisation && (
                                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                      <span>{guestError.organisation}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Guest Job Title */}
                                <div>
                                  <label htmlFor={`guest-${idx}-job`} className="block text-xs font-semibold text-[#7A5A44] mb-1">
                                    {t.guestJobTitleLabel(idx + 1)} <span className="text-[#9A4A1B] font-bold">*</span>
                                  </label>
                                  <input
                                    id={`guest-${idx}-job`}
                                    type="text"
                                    value={guest.job_title}
                                    onChange={(e) => handleGuestFieldChange(idx, 'job_title', e.target.value)}
                                    placeholder={t.guestJobTitlePlaceholder}
                                    className={`w-full h-11 px-3.5 rounded-xl bg-white/90 border ${
                                      guestError?.job_title
                                        ? 'border-rose-400 ring-2 ring-rose-200'
                                        : 'border-[#9A4A1B]/20 focus:border-[#C8622A] focus:ring-2 focus:ring-[#F4B968]/40'
                                    } text-sm text-[#3B1F0E] placeholder:text-[#7A5A44]/60 transition-all outline-none`}
                                  />
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

            {/* reCAPTCHA glass panel */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 p-3 sm:p-4 shadow-xs">
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
            </div>

            {/* Submit & Clear Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !recaptchaToken}
                title={!recaptchaToken ? t.valRecaptchaRequired : t.submitButton}
                className={`h-14 rounded-2xl px-9 font-bold text-white transition-all ${
                  isSubmitting || !recaptchaToken
                    ? 'opacity-50 cursor-not-allowed shadow-none bg-[linear-gradient(135deg,#D26E2A,#A8481B)]'
                    : 'bg-[linear-gradient(135deg,#D26E2A,#A8481B)] shadow-[0_12px_24px_-10px_rgba(120,60,10,0.5)] hover:brightness-110 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{t.submittingButton}</span>
                  </div>
                ) : (
                  <span>{t.submitButton}</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className="text-sm font-medium text-[#7A5A44] hover:text-[#3B1F0E] transition-colors py-2 px-1 focus:outline-none focus:underline"
              >
                {t.clearButton}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
