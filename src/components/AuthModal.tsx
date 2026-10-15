import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { User } from '../types';
import { loginAdminApi } from '../lib/api';

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
  const DEFAULT_USERNAME = 'tlsujank.co@gmail.com';
  const DEFAULT_PASSWORD = 'Iamsujan08';

  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Pre-fill username for convenience
      if (!username) {
        setUsername(DEFAULT_USERNAME);
      }
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = async (userToSubmit?: string, passToSubmit?: string) => {
    const finalUsername = (userToSubmit !== undefined ? userToSubmit : username).trim();
    const finalPassword = (passToSubmit !== undefined ? passToSubmit : password).trim();

    if (!finalUsername) {
      setError('Please enter your username or email.');
      return;
    }
    if (!finalPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await loginAdminApi(finalUsername, finalPassword);
    setIsLoading(false);

    if (res.success && res.user) {
      onSuccess(res.user);
      onClose();
    } else {
      setError(res.error || 'Invalid username or password. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const handleAutofill = () => {
    setUsername(DEFAULT_USERNAME);
    setPassword(DEFAULT_PASSWORD);
    handleLogin(DEFAULT_USERNAME, DEFAULT_PASSWORD);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="auth-modal-card"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#181d28] p-6 shadow-2xl border border-zinc-200 dark:border-[#262c36] text-[#050505] dark:text-[#f8fafc] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e4e6eb] dark:border-[#262c36]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1877f2] dark:text-[#60a5fa] border border-blue-200 dark:border-[#283548]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#050505] dark:text-[#f8fafc]">Sign In</h2>
              <p className="text-xs text-[#65676b] dark:text-[#94a3b8]">
                Personal Notes & CMS Management
              </p>
            </div>
          </div>
          <button
            id="auth-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Context Prompt */}
        {promptMessage && (
          <div
            id="auth-prompt-banner"
            className="mt-4 p-3 rounded-xl bg-[#e7f3ff] dark:bg-[#1e293b] border border-[#d8e4f8] dark:border-[#283548] text-[#1877f2] dark:text-[#60a5fa] text-xs flex items-start gap-2.5 font-medium"
          >
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#1877f2] dark:text-[#60a5fa]" />
            <span>{promptMessage}</span>
          </div>
        )}

        {/* Credentials Reminder Box */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#f0f4fd] dark:bg-[#13171f] border border-[#d8e4f8] dark:border-[#262c36] flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-[#1877f2] dark:text-[#60a5fa]">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Credentials</span>
            </div>
            <div className="mt-1 text-[11px] text-[#4b5563] dark:text-[#94a3b8] space-y-0.5">
              <div>
                User: <span className="font-semibold text-[#050505] dark:text-[#f8fafc] select-all">tlsujank.co@gmail.com</span>
              </div>
              <div>
                Pass: <span className="font-semibold text-[#050505] dark:text-[#f8fafc] select-all">Iamsujan08</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutofill}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#181d28] border border-[#1877f2]/30 dark:border-[#60a5fa]/40 text-[#1877f2] dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-[#232936] text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 hover:scale-105 active:scale-95"
            title="Auto-fill and log in immediately"
          >
            1-Click Sign In
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Username Field */}
          <div>
            <label className="block text-xs font-semibold text-[#050505] dark:text-[#f8fafc] mb-1.5">
              Username / Email
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#65676b] dark:text-[#94a3b8] absolute left-3 top-2.5" />
              <input
                id="auth-username-input"
                type="text"
                autoFocus
                placeholder="tlsujank.co@gmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#ced0d4] dark:border-[#334155] bg-[#f0f2f5] dark:bg-[#0e1217] text-[#050505] dark:text-[#f8fafc] focus:bg-white dark:focus:bg-[#0e1217] focus:border-[#1877f2] dark:focus:border-[#60a5fa] focus:outline-hidden transition-colors placeholder:text-[#8a8d91] dark:placeholder:text-[#64748b]"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-[#050505] dark:text-[#f8fafc] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#65676b] dark:text-[#94a3b8] absolute left-3 top-2.5" />
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password (Iamsujan08)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-[#ced0d4] dark:border-[#334155] bg-[#f0f2f5] dark:bg-[#0e1217] text-[#050505] dark:text-[#f8fafc] focus:bg-white dark:focus:bg-[#0e1217] focus:border-[#1877f2] dark:focus:border-[#60a5fa] focus:outline-hidden transition-colors placeholder:text-[#8a8d91] dark:placeholder:text-[#64748b]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              id="auth-error-msg"
              className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium"
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1877f2] dark:bg-[#2563eb] hover:bg-[#166fe5] dark:hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

