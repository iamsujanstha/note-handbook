import React from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Sparkles,
  FileText,
  Code2,
  Download,
} from 'lucide-react';

interface ScribdLockOverlayProps {
  chapterTitle: string;
  topicName?: string;
  firstChapter?: { id: string; title: string } | null;
  onUnlockClick: () => void;
  onSelectChapter?: (chapterId: string) => void;
  isDark?: boolean;
}

export const ScribdLockOverlay: React.FC<ScribdLockOverlayProps> = ({
  chapterTitle,
  onUnlockClick,
}) => {
  return (
    <div
      id="scribd-paywall-modal-card"
      className="w-full max-w-xl mx-auto rounded-2xl bg-white dark:bg-[#0f141c] text-[#050505] dark:text-[#f8fafc] p-6 sm:p-7 shadow-2xl border border-[#e4e6eb] dark:border-[#263142] ring-1 ring-black/5 dark:ring-white/10 relative transition-all overflow-hidden"
    >
      {/* Headline */}
      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#050505] dark:text-[#f8fafc] leading-tight">
        Unlock the Full Chapter &amp; Complete Notes
      </h2>

      {/* Subtitle */}
      <p className="text-xs sm:text-sm text-[#65676b] dark:text-[#94a3b8] leading-relaxed mt-2.5">
        You are viewing the preview of{' '}
        <strong className="text-[#050505] dark:text-[#f8fafc] font-semibold">
          &ldquo;{chapterTitle}&rdquo;
        </strong>
        . Sign in with Google Authenticator to read the complete unabridged technical notes, code implementations, and interactive system diagrams.
      </p>

      {/* 2x2 Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
        {/* Feature 1 */}
        <div className="p-3.5 rounded-xl border border-[#e4e6eb] dark:border-[#222a38] bg-[#f8fafc] dark:bg-[#151c27] flex items-start gap-3 transition-colors">
          <div className="p-2 rounded-lg bg-blue-500/10 text-[#1877f2] dark:text-[#60a5fa] shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#050505] dark:text-[#f8fafc] truncate">
              Full Unabridged Content
            </h4>
            <p className="text-[11px] text-[#65676b] dark:text-[#94a3b8] leading-snug mt-0.5">
              Complete technical case studies, deep dives, benchmarks, and architectural designs.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="p-3.5 rounded-xl border border-[#e4e6eb] dark:border-[#222a38] bg-[#f8fafc] dark:bg-[#151c27] flex items-start gap-3 transition-colors">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#050505] dark:text-[#f8fafc] truncate">
              Interactive Mermaid Diagrams
            </h4>
            <p className="text-[11px] text-[#65676b] dark:text-[#94a3b8] leading-snug mt-0.5">
              Zoomable system sequences, flowchart topologies, and entity relationship diagrams.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="p-3.5 rounded-xl border border-[#e4e6eb] dark:border-[#222a38] bg-[#f8fafc] dark:bg-[#151c27] flex items-start gap-3 transition-colors">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#050505] dark:text-[#f8fafc] truncate">
              Custom Themes &amp; Dark Mode
            </h4>
            <p className="text-[11px] text-[#65676b] dark:text-[#94a3b8] leading-snug mt-0.5">
              Switch between high-contrast notebook stylesheets or load custom user CSS files.
            </p>
          </div>
        </div>

        {/* Feature 4 */}
        <div className="p-3.5 rounded-xl border border-[#e4e6eb] dark:border-[#222a38] bg-[#f8fafc] dark:bg-[#151c27] flex items-start gap-3 transition-colors">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <Download className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#050505] dark:text-[#f8fafc] truncate">
              Full HTML &amp; JSON Export
            </h4>
            <p className="text-[11px] text-[#65676b] dark:text-[#94a3b8] leading-snug mt-0.5">
              Download standalone HTML notes or export backup bundles for offline reading.
            </p>
          </div>
        </div>
      </div>

      {/* Primary CTA Button (Full Width with Solid Border) */}
      <button
        id="scribd-unlock-signin-btn"
        type="button"
        onClick={onUnlockClick}
        className="w-full py-3.5 px-5 rounded-xl bg-[#1877f2] hover:bg-[#166fe5] active:bg-[#1466d3] text-white font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 border-2 border-blue-400 hover:border-blue-300 dark:border-blue-400 dark:hover:border-blue-300 transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.005] active:scale-[0.995]"
      >
        <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
        <span>Sign In with Google Authenticator to Unlock</span>
        <ArrowRight className="w-4 h-4 shrink-0" />
      </button>
    </div>
  );
};
