import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          callback?: (response: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact';
          hl?: string;
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    onRecaptchaApiLoaded?: () => void;
  }
}

export interface RecaptchaWidgetRef {
  reset: () => void;
  getResponse: () => string;
}

interface RecaptchaWidgetProps {
  currentLang: Language;
  onSuccess: (token: string) => void;
  onExpire: () => void;
  onError?: (error?: string) => void;
  hasError?: boolean;
  errorMessage?: string;
}

export const RecaptchaWidget = forwardRef<RecaptchaWidgetRef, RecaptchaWidgetProps>(
  ({ currentLang, onSuccess, onExpire, onError, hasError, errorMessage }, ref) => {
    const t = translations[currentLang];
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current !== null && window.grecaptcha) {
          try {
            window.grecaptcha.reset(widgetIdRef.current);
          } catch (e) {
            console.error('reCAPTCHA reset error:', e);
          }
        }
      },
      getResponse: () => {
        if (widgetIdRef.current !== null && window.grecaptcha) {
          return window.grecaptcha.getResponse(widgetIdRef.current);
        }
        return '';
      },
    }));

    // Render widget once grecaptcha is ready and container is mounted
    const renderWidget = () => {
      if (!window.grecaptcha || !containerRef.current || widgetIdRef.current !== null) {
        return;
      }

      if (!siteKey) {
        setLoadError(t.valRecaptchaConfigError || 'reCAPTCHA site key is not configured.');
        return;
      }

      try {
        const id = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            onSuccess(token);
          },
          'expired-callback': () => {
            onExpire();
          },
          'error-callback': () => {
            if (onError) onError('reCAPTCHA execution error');
          },
          theme: 'light',
          size: 'normal',
          hl: currentLang === 'ru' ? 'ru' : 'en',
        });
        widgetIdRef.current = id;
      } catch (err: any) {
        console.error('reCAPTCHA render error:', err);
      }
    };

    // Load Google reCAPTCHA v2 script
    useEffect(() => {
      if (!siteKey) {
        setLoadError(t.valRecaptchaConfigError || 'reCAPTCHA site key is not configured in .env');
        return;
      }

      const scriptId = 'google-recaptcha-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaApiLoaded&render=explicit&hl=${currentLang === 'ru' ? 'ru' : 'en'}`;
        script.async = true;
        script.defer = true;

        window.onRecaptchaApiLoaded = () => {
          renderWidget();
        };

        script.onerror = () => {
          setLoadError('Failed to load Google reCAPTCHA script. Please check your network connection.');
          if (onError) onError('Failed to load Google reCAPTCHA');
        };

        document.head.appendChild(script);
      } else if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
        window.grecaptcha.ready(() => {
          renderWidget();
        });
      }

      return () => {
        // cleanup if component unmounts
      };
    }, [currentLang, siteKey]);

    return (
      <div className="space-y-2">
        <div
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all bg-white min-h-[86px] overflow-hidden ${
            hasError || loadError
              ? 'border-rose-400 ring-2 ring-rose-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          {loadError ? (
            <div className="flex items-center gap-2 text-rose-600 text-xs py-2 px-3 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
          ) : (
            <div ref={containerRef} className="recaptcha-container my-1" />
          )}
        </div>

        {hasError && errorMessage && !loadError && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }
);

RecaptchaWidget.displayName = 'RecaptchaWidget';
