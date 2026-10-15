import React, { useState } from 'react';
import {
  FileCode,
  Globe,
  FileText,
  Layers,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export interface CssUploadDecisionModalProps {
  isOpen: boolean;
  filename: string;
  cssContent: string;
  fileSize: number;
  activeChapterTitle?: string;
  onApplyToCurrentNote: () => void;
  onApplyToAllNotes: () => void;
  onKeepInLibrary: () => void;
  onClose: () => void;
}

export const CssUploadDecisionModal: React.FC<CssUploadDecisionModalProps> = ({
  isOpen,
  filename,
  cssContent,
  fileSize,
  activeChapterTitle,
  onApplyToCurrentNote,
  onApplyToAllNotes,
  onKeepInLibrary,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<'current' | 'global' | 'library'>(
    activeChapterTitle ? 'current' : 'library'
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedOption === 'current') {
      onApplyToCurrentNote();
    } else if (selectedOption === 'global') {
      onApplyToAllNotes();
    } else {
      onKeepInLibrary();
    }
  };

  const formattedSize = fileSize > 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${fileSize} B`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="css-upload-decision-modal"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#e4e6eb]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#050505]">CSS Stylesheet Uploaded</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> Saved Permanently
                </span>
              </div>
              <p className="text-xs text-[#65676b] mt-0.5">
                Saved to your library — it will not be removed when you refresh the app.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#65676b] hover:text-[#050505] hover:bg-[#f0f2f5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Details Badge */}
        <div className="mt-4 p-3 rounded-xl bg-[#f8fafc] border border-[#e4e6eb] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode className="w-4 h-4 text-[#1877f2] shrink-0" />
            <span className="font-mono text-xs font-semibold text-[#050505] truncate">
              {filename}
            </span>
          </div>
          <span className="text-[11px] text-[#65676b] font-mono shrink-0">{formattedSize}</span>
        </div>

        {/* Question: Where to apply? */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-[#050505] mb-2 uppercase tracking-wide">
            How would you like to apply this stylesheet?
          </label>

          <div className="space-y-2.5">
            {/* Option 1: Apply to Current Note Only */}
            <div
              onClick={() => setSelectedOption('current')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                selectedOption === 'current'
                  ? 'border-[#1877f2] bg-[#e7f3ff]/40 shadow-xs ring-1 ring-[#1877f2]/20'
                  : 'border-[#ced0d4] bg-white hover:bg-[#f0f2f5]'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="radio"
                  name="css-apply-option"
                  checked={selectedOption === 'current'}
                  onChange={() => setSelectedOption('current')}
                  className="w-4 h-4 text-[#1877f2] focus:ring-[#1877f2] cursor-pointer"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1877f2]" />
                  <span className="text-xs font-bold text-[#050505]">
                    Apply to this note only
                  </span>
                  <span className="text-[10px] bg-blue-100 text-[#1877f2] px-1.5 py-0.2 rounded font-semibold">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-[#65676b] mt-0.5 leading-relaxed">
                  Only styles <strong>&quot;{activeChapterTitle || 'Active Note'}&quot;</strong>.
                  All other notes keep their current appearance.
                </p>
              </div>
            </div>

            {/* Option 2: Apply to All Notes (Global Theme) */}
            <div
              onClick={() => setSelectedOption('global')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                selectedOption === 'global'
                  ? 'border-[#1877f2] bg-[#e7f3ff]/40 shadow-xs ring-1 ring-[#1877f2]/20'
                  : 'border-[#ced0d4] bg-white hover:bg-[#f0f2f5]'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="radio"
                  name="css-apply-option"
                  checked={selectedOption === 'global'}
                  onChange={() => setSelectedOption('global')}
                  className="w-4 h-4 text-[#1877f2] focus:ring-[#1877f2] cursor-pointer"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-[#050505]">
                    Apply to ALL notes (Global Theme)
                  </span>
                </div>
                <p className="text-[11px] text-[#65676b] mt-0.5 leading-relaxed">
                  Replaces the global <code className="text-purple-700">notes-theme.css</code> theme so all notes using the global theme adopt this styling.
                </p>
              </div>
            </div>

            {/* Option 3: Keep in Stylesheet Library (Decide later) */}
            <div
              onClick={() => setSelectedOption('library')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                selectedOption === 'library'
                  ? 'border-[#1877f2] bg-[#e7f3ff]/40 shadow-xs ring-1 ring-[#1877f2]/20'
                  : 'border-[#ced0d4] bg-white hover:bg-[#f0f2f5]'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="radio"
                  name="css-apply-option"
                  checked={selectedOption === 'library'}
                  onChange={() => setSelectedOption('library')}
                  className="w-4 h-4 text-[#1877f2] focus:ring-[#1877f2] cursor-pointer"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-zinc-700" />
                  <span className="text-xs font-bold text-[#050505]">
                    Just keep in library (Decide later)
                  </span>
                </div>
                <p className="text-[11px] text-[#65676b] mt-0.5 leading-relaxed">
                  Permanently saved in your Stylesheet Library. You can select it anytime per-note or set as global later.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-[#e4e6eb]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#ccd0d5] text-xs font-semibold text-[#050505] hover:bg-[#f0f2f5] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-css-decision-btn"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Confirm & Apply</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
