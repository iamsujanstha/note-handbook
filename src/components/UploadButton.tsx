import React from 'react';
import { Upload, Check, Loader2 } from 'lucide-react';

interface UploadButtonProps {
  id?: string;
  onClick?: () => void;
  isUploading: boolean;
  progress: number; // 0 - 100
  label?: string;
  uploadingLabel?: string;
  doneLabel?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
  variant?: 'default' | 'primary' | 'subtle';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  id,
  onClick,
  isUploading,
  progress,
  label = 'Upload File',
  uploadingLabel = 'Uploading',
  doneLabel = 'Uploaded!',
  className = '',
  disabled = false,
  title,
  variant = 'default',
  size = 'md',
  icon,
}) => {
  const isDone = isUploading && progress >= 100;

  // Base styling per variant
  const variantStyles = {
    default: 'border border-[#ced0d4] dark:border-[#262c36] bg-white dark:bg-[#181d28] text-[#050505] dark:text-[#f0f3f6] hover:bg-[#f0f2f5] dark:hover:bg-[#222938] shadow-2xs',
    primary: 'bg-[#1877f2] dark:bg-[#2563eb] hover:bg-[#166fe5] dark:hover:bg-[#1d4ed8] text-white border-transparent shadow-xs',
    subtle: 'border border-transparent bg-[#f0f2f5] dark:bg-[#181d28] hover:bg-[#e4e6eb] dark:hover:bg-[#222938] text-[#050505] dark:text-[#f0f3f6]',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2',
  };

  return (
    <button
      id={id}
      type="button"
      onClick={isUploading ? undefined : onClick}
      disabled={disabled || isUploading}
      title={title || (isUploading ? `Uploading ${progress}%` : label)}
      aria-label={isUploading ? `Uploading ${progress}%` : label}
      aria-busy={isUploading}
      className={`relative overflow-hidden inline-flex items-center justify-center font-semibold rounded-lg transition-all select-none cursor-pointer ${
        sizeStyles[size]
      } ${variantStyles[variant]} ${
        isUploading ? 'cursor-wait border-[#1877f2]/50 shadow-inner' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Background Progress Fill Fill-Bar */}
      {isUploading && (
        <span
          className="absolute inset-y-0 left-0 bg-[#1877f2]/20 dark:bg-[#1877f2]/35 transition-all duration-150 ease-out pointer-events-none"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      )}

      {/* Bottom Accent Progress Track */}
      {isUploading && (
        <span
          className="absolute bottom-0 left-0 h-[2.5px] bg-[#1877f2] transition-all duration-150 ease-out pointer-events-none"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      )}

      {/* Button Content */}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {isUploading ? (
          isDone ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-75 duration-150" />
              <span className="text-emerald-700 font-bold">{doneLabel} (100%)</span>
            </>
          ) : (
            <>
              <Loader2 className="w-3.5 h-3.5 text-[#1877f2] animate-spin shrink-0" />
              <span className="tabular-nums font-bold text-[#1877f2]">
                {uploadingLabel} {Math.round(progress)}%
              </span>
            </>
          )
        ) : (
          <>
            {icon || <Upload className="w-3.5 h-3.5 text-[#1877f2] shrink-0" />}
            <span>{label}</span>
          </>
        )}
      </span>
    </button>
  );
};
