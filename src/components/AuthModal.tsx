import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Mail,
  ArrowLeft,
} from 'lucide-react';
import { User } from '../types';
import { requestTotpApi, verifyTotpApi } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  promptMessage?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  promptMessage,
}) => {
  // Two-step flow: 'email' first, then 'totp'
  const [step, setStep] = useState<'email' | 'totp'>('email');
  const [email, setEmail] = useState('');
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // 6-digit OTP code state
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 30-second TOTP countdown
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    if (!isOpen) return;

    setStep('email');
    setEmail('');
    setError(null);
    setIsLoading(false);
    setDigits(['', '', '', '', '', '']);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus email input when modal opens
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-focus first digit input when transitioning to TOTP step
  useEffect(() => {
    if (!isOpen || step !== 'totp') return;
    setTimeout(() => {
      digitInputRefs.current[0]?.focus();
    }, 100);
  }, [isOpen, step]);

  // Live timer calculating the remaining seconds in current 30s TOTP cycle
  useEffect(() => {
    if (!isOpen || step !== 'totp') return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setSecondsRemaining(remaining === 0 ? 30 : remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step]);

  if (!isOpen) return null;

  // Step 1: Validate Email & proceed to 6-digit TOTP screen
  const handleEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      emailInputRef.current?.focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await requestTotpApi(trimmedEmail);
    setIsLoading(false);

    if (res.success) {
      setEmail(trimmedEmail);
      setDigits(['', '', '', '', '', '']);
      setError(null);
      setStep('totp');
    } else {
      setError(
        res.error || 'Unauthorized email address. Please enter your registered administrator email.'
      );
      emailInputRef.current?.focus();
    }
  };

  // Handle entering digits in Step 2
  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // If multiple digits pasted or typed
    if (clean.length > 1) {
      const charArr = clean.slice(0, 6).split('');
      const next = [...digits];
      charArr.forEach((c, i) => {
        if (index + i < 6) {
          next[index + i] = c;
        }
      });
      setDigits(next);
      const nextFocus = Math.min(index + charArr.length, 5);
      digitInputRefs.current[nextFocus]?.focus();

      if (next.every((d) => d !== '')) {
        handleVerifyTotp(next.join(''));
      }
      return;
    }

    const next = [...digits];
    next[index] = clean[0];
    setDigits(next);

    // Auto-advance to next box
    if (index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    // Auto verify if all 6 digits populated
    if (index === 5 && next.every((d) => d !== '')) {
      handleVerifyTotp(next.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        digitInputRefs.current[index - 1]?.focus();
      } else {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter' && digits.every((d) => d !== '')) {
      handleVerifyTotp(digits.join(''));
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...digits];
    pasted.split('').forEach((c, i) => {
      if (i < 6) next[i] = c;
    });
    setDigits(next);

    if (pasted.length === 6) {
      digitInputRefs.current[5]?.focus();
      handleVerifyTotp(pasted);
    } else {
      digitInputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  // Submit TOTP verification
  const handleVerifyTotp = async (codeToSubmit?: string) => {
    const fullCode = (codeToSubmit !== undefined ? codeToSubmit : digits.join('')).trim();

    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits from Google Authenticator.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await verifyTotpApi(email.trim().toLowerCase(), fullCode);
    setIsLoading(false);

    if (res.success && res.user) {
      onSuccess(res.user);
      onClose();
    } else {
      setError(
        res.error ||
          'Invalid or expired 6-digit code. Please verify against Google Authenticator and try again.'
      );
      digitInputRefs.current[0]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden p-3 sm:p-4 flex items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="auth-modal-card"
        style={{ maxWidth: '460px', width: '100%' }}
        className="relative mx-auto rounded-2xl bg-white dark:bg-[#181d28] p-6 sm:p-7 shadow-2xl border border-zinc-200 dark:border-[#262c36] text-[#050505] dark:text-[#f8fafc] max-h-[92vh] overflow-y-auto box-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#e4e6eb] dark:border-[#262c36]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1877f2] dark:text-[#60a5fa] border border-blue-200 dark:border-[#283548] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[#050505] dark:text-[#f8fafc] truncate">
                  Google Authenticator Sign In
                </h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#1877f2] dark:text-[#60a5fa] border border-blue-200 dark:border-blue-800 shrink-0">
                  2FA
                </span>
              </div>
              {step === 'email' ? (
                <p className="text-xs text-[#65676b] dark:text-[#94a3b8] truncate">
                  Enter your account email to continue
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[#65676b] dark:text-[#94a3b8] truncate font-mono">
                    {email}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDigits(['', '', '', '', '', '']);
                      setStep('email');
                      setTimeout(() => emailInputRef.current?.focus(), 80);
                    }}
                    className="text-[11px] font-semibold text-[#1877f2] dark:text-[#60a5fa] hover:underline cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            id="auth-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors cursor-pointer shrink-0 ml-2"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Context Prompt */}
        {promptMessage && (
          <div
            id="auth-prompt-banner"
            className="mt-3.5 p-3 rounded-xl bg-[#e7f3ff] dark:bg-[#1e293b] border border-[#d8e4f8] dark:border-[#283548] text-[#1877f2] dark:text-[#60a5fa] text-xs flex items-start gap-2.5 font-medium"
          >
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#1877f2] dark:text-[#60a5fa]" />
            <span className="break-words">{promptMessage}</span>
          </div>
        )}

        {step === 'email' ? (
          /* ================= STEP 1: EMAIL INPUT ================= */
          <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="auth-email-input"
                className="block text-xs font-bold uppercase tracking-wider text-[#65676b] dark:text-[#94a3b8]"
              >
                Email Address
              </label>
              <div className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl border border-[#ced0d4] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0e1217] focus-within:ring-2 focus-within:ring-[#1877f2]/30 dark:focus-within:ring-[#60a5fa]/30 focus-within:border-[#1877f2] dark:focus-within:border-[#60a5fa] transition-all box-border">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-[#1877f2] dark:text-[#60a5fa] shrink-0 flex items-center justify-center">
                  <Mail className="w-4 h-4 shrink-0" />
                </div>
                <input
                  ref={emailInputRef}
                  id="auth-email-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full bg-transparent border-0 text-sm text-[#050505] dark:text-[#f8fafc] placeholder-[#65676b]/70 dark:placeholder-[#94a3b8]/60 focus:outline-hidden p-0 m-0"
                />
              </div>
            </div>

            {error && (
              <div
                id="auth-error-msg"
                className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium text-center"
              >
                {error}
              </div>
            )}

            <button
              id="auth-continue-email-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#1877f2] hover:bg-[#166fe5] active:bg-[#1466d3] text-white text-sm font-bold tracking-wide transition-all shadow-md shadow-blue-500/20 border-2 border-blue-400 hover:border-blue-300 dark:border-blue-400 dark:hover:border-blue-300 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 box-border"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>
        ) : (
          /* ================= STEP 2: GOOGLE AUTHENTICATOR CODE INPUT ================= */
          <div className="mt-5 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-[#050505] dark:text-[#f8fafc] flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#1877f2] dark:text-[#60a5fa]" />
                Enter 6-digit Google Authenticator code
              </h3>
              <p className="text-xs text-[#65676b] dark:text-[#94a3b8]">
                Open Google Authenticator on your phone and enter your 6-digit code.
              </p>
            </div>

            {/* 6-Digit OTP Boxes */}
            <div
              className="my-4 mx-auto w-full"
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                maxWidth: '100%',
              }}
              onPaste={handleDigitPaste}
            >
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    digitInputRefs.current[idx] = el;
                  }}
                  id={`totp-digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete="one-time-code"
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  style={{
                    width: '52px',
                    height: '56px',
                    minWidth: '40px',
                    maxWidth: '56px',
                    flexShrink: 0,
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                  }}
                  className={`rounded-xl border-2 transition-all p-0 box-border text-center ${
                    digit
                      ? 'border-[#1877f2] dark:border-[#60a5fa] bg-blue-50/70 dark:bg-blue-950/40 text-[#1877f2] dark:text-[#60a5fa] shadow-2xs'
                      : 'border-[#ced0d4] dark:border-[#334155] bg-[#f0f2f5] dark:bg-[#0e1217] text-[#050505] dark:text-[#f8fafc]'
                  } focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/30 dark:focus:ring-[#60a5fa]/30 focus:border-[#1877f2] dark:focus:border-[#60a5fa]`}
                />
              ))}
            </div>

            {/* Live 30s Refresh Indicator */}
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#65676b] dark:text-[#94a3b8]">
              <div className="w-2.5 h-2.5 rounded-full border border-blue-500 border-t-transparent animate-spin shrink-0" />
              <span>
                Code refreshes in{' '}
                <strong className="text-[#050505] dark:text-[#f8fafc]">{secondsRemaining}s</strong>
              </span>
            </div>

            {error && (
              <div
                id="auth-error-msg"
                className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium text-center"
              >
                {error}
              </div>
            )}

            {/* Verify & Sign In + Back Buttons */}
            <div className="space-y-2">
              <button
                id="auth-verify-totp-btn"
                type="button"
                onClick={() => handleVerifyTotp()}
                disabled={isLoading || digits.some((d) => d === '')}
                className="w-full py-3 px-4 rounded-xl bg-[#1877f2] hover:bg-[#166fe5] active:bg-[#1466d3] text-white text-sm font-bold tracking-wide transition-all shadow-md shadow-blue-500/20 border-2 border-blue-400 hover:border-blue-300 dark:border-blue-400 dark:hover:border-blue-300 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 box-border"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Verify &amp; Sign In</span>
                  </>
                )}
              </button>

              <button
                id="auth-back-to-email-btn"
                type="button"
                onClick={() => {
                  setError(null);
                  setDigits(['', '', '', '', '', '']);
                  setStep('email');
                  setTimeout(() => emailInputRef.current?.focus(), 80);
                }}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Use a different email</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
