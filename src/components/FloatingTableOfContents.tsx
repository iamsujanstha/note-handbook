import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TableOfContentItem } from '../types';
import {
  ListTree,
  Search,
  X,
  ArrowUp,
  Check,
  Copy,
  Pin,
  PinOff,
  ChevronRight,
  Hash,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';

interface FloatingTableOfContentsProps {
  headings: TableOfContentItem[];
  activeHeadingId?: string;
  onSelectHeading: (id: string) => void;
  onScrollToTop?: () => void;
  isDocDark?: boolean;
  readProgress?: number;
  documentTitle?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  isPinned?: boolean;
  onTogglePinned?: () => void;
  className?: string;
}

export const FloatingTableOfContents: React.FC<FloatingTableOfContentsProps> = ({
  headings,
  activeHeadingId,
  onSelectHeading,
  onScrollToTop,
  isDocDark = false,
  readProgress = 0,
  documentTitle,
  isOpen,
  onToggleOpen,
  isPinned = false,
  onTogglePinned,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'major' | 'sub'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut listener: Alt + T to toggle open/closed, Esc to close when unpinned
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        onToggleOpen();
      } else if (e.key === 'Escape' && isOpen && !isPinned) {
        onToggleOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPinned, onToggleOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll active heading into view within TOC container
  useEffect(() => {
    if (activeHeadingId && activeItemRef.current && listContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeHeadingId]);

  // Filter headings by search query and level filter
  const filteredHeadings = useMemo(() => {
    return headings.filter((item) => {
      // Level filter
      if (levelFilter === 'major' && item.level > 2) return false;
      if (levelFilter === 'sub' && item.level <= 2) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          item.text.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [headings, levelFilter, searchQuery]);

  // Current active heading text
  const currentActiveHeading = useMemo(() => {
    if (!activeHeadingId) return null;
    return headings.find((h) => h.id === activeHeadingId);
  }, [headings, activeHeadingId]);

  // Copy direct anchor link to clipboard
  const handleCopyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  // If there are no headings in the document, don't show the floating trigger
  if (headings.length === 0) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Trigger Pill (when closed or as persistent quick action) */}
      {!isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 ${className}`}
        >
          <button
            id="floating-toc-trigger-btn"
            type="button"
            onClick={onToggleOpen}
            className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 border backdrop-blur-xl ${
              isDocDark
                ? 'bg-[#121721]/90 text-[#f5f2eb] border-[#242c39] hover:border-[#38bdf8]/50 shadow-black/40 hover:shadow-cyan-500/10'
                : 'bg-white/95 text-[#050505] border-[#ced0d4] hover:border-[#1877f2]/50 shadow-black/10 hover:shadow-blue-500/10'
            }`}
            title="Open Table of Contents (Alt + T)"
            aria-label="Open Table of Contents"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#1877f2]/10 text-[#1877f2] group-hover:bg-[#1877f2] group-hover:text-white transition-colors">
              <ListTree className="w-3.5 h-3.5" />
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-bold tracking-tight">Contents</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isDocDark
                      ? 'bg-blue-500/20 text-[#60a5fa]'
                      : 'bg-blue-50 text-[#1877f2]'
                  }`}
                >
                  {headings.length}
                </span>
              </div>
              {currentActiveHeading && (
                <span className="text-[10px] text-[#65676b] dark:text-[#8b949e] truncate max-w-[130px] font-medium mt-0.5">
                  {currentActiveHeading.text}
                </span>
              )}
            </div>

            {/* Mini Progress Ring/Badge */}
            {readProgress > 0 && (
              <span className="text-[10.5px] font-mono font-bold text-[#1877f2] dark:text-[#38bdf8] shrink-0 pl-1 border-l border-black/10 dark:border-white/10">
                {readProgress}%
              </span>
            )}
          </button>

          {/* Quick scroll to top button next to closed trigger */}
          {onScrollToTop && readProgress > 15 && (
            <button
              id="floating-toc-quick-top-btn"
              type="button"
              onClick={onScrollToTop}
              className={`p-2.5 rounded-2xl shadow-xl transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 border backdrop-blur-xl ${
                isDocDark
                  ? 'bg-[#121721]/90 text-[#f5f2eb] border-[#242c39] hover:border-[#38bdf8]/50 hover:text-[#38bdf8] shadow-black/40'
                  : 'bg-white/95 text-[#050505] border-[#ced0d4] hover:border-[#1877f2]/50 hover:text-[#1877f2] shadow-black/10'
              }`}
              title="Scroll back to top"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 2. Floating TOC Sidebar Panel */}
      {isOpen && (
        <aside
          id="floating-toc-sidebar"
          role="navigation"
          aria-label="Table of Contents"
          className={`fixed top-14 right-4 bottom-4 w-84 sm:w-92 z-50 rounded-2xl shadow-2xl border flex flex-col backdrop-blur-2xl animate-in fade-in slide-in-from-right-4 duration-200 overflow-hidden ${
            isDocDark
              ? 'bg-[#0c1017]/95 border-[#242c39] text-[#f5f2eb] shadow-black/60 ring-1 ring-white/5'
              : 'bg-white/95 border-[#ced0d4] text-[#050505] shadow-black/15 ring-1 ring-black/5'
          } ${className}`}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-black/10 dark:border-white/10 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-[#1877f2]/10 text-[#1877f2] flex items-center justify-center shrink-0">
                  <ListTree className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold leading-tight truncate">
                    Table of Contents
                  </h2>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#65676b] dark:text-[#8b949e]">
                    <span>{headings.length} sections</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[#1877f2] dark:text-[#38bdf8] font-semibold">
                      {readProgress}% read
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Action Controls */}
              <div className="flex items-center gap-1 shrink-0">
                {onTogglePinned && (
                  <button
                    type="button"
                    onClick={onTogglePinned}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isPinned
                        ? 'bg-[#1877f2] text-white shadow-2xs'
                        : 'text-[#65676b] dark:text-[#8b949e] hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                    }`}
                    title={isPinned ? 'Unpin TOC sidebar' : 'Pin TOC sidebar'}
                    aria-label={isPinned ? 'Unpin TOC sidebar' : 'Pin TOC sidebar'}
                  >
                    {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onToggleOpen}
                  className="p-1.5 rounded-lg text-[#65676b] dark:text-[#8b949e] hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="Close Table of Contents (Esc)"
                  aria-label="Close Table of Contents"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reading Progress Visual Track */}
            <div className="w-full h-1 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-[#1877f2] via-[#00a8ff] to-[#46d2d6] transition-all duration-200"
                style={{ width: `${readProgress}%` }}
              />
            </div>

            {/* Search Filter Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#65676b] dark:text-[#8b949e] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sections..."
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border transition-colors focus:outline-hidden focus:ring-1 focus:ring-[#1877f2] ${
                  isDocDark
                    ? 'bg-[#161b22] border-[#30363d] text-[#e6edf3] placeholder:text-[#6e7681]'
                    : 'bg-[#f0f2f5] border-[#ced0d4] text-[#050505] placeholder:text-[#65676b]'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#65676b] hover:text-[#050505] dark:hover:text-white"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Depth Level Filter Segmented Control */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[11px]">
              <button
                type="button"
                onClick={() => setLevelFilter('all')}
                className={`flex-1 py-1 px-2 rounded-md font-medium text-center transition-all cursor-pointer ${
                  levelFilter === 'all'
                    ? 'bg-white dark:bg-[#1f2937] text-[#1877f2] dark:text-[#38bdf8] shadow-2xs font-semibold'
                    : 'text-[#65676b] dark:text-[#8b949e] hover:text-black dark:hover:text-white'
                }`}
              >
                All Levels
              </button>
              <button
                type="button"
                onClick={() => setLevelFilter('major')}
                className={`flex-1 py-1 px-2 rounded-md font-medium text-center transition-all cursor-pointer ${
                  levelFilter === 'major'
                    ? 'bg-white dark:bg-[#1f2937] text-[#1877f2] dark:text-[#38bdf8] shadow-2xs font-semibold'
                    : 'text-[#65676b] dark:text-[#8b949e] hover:text-black dark:hover:text-white'
                }`}
              >
                H1–H2 Only
              </button>
              <button
                type="button"
                onClick={() => setLevelFilter('sub')}
                className={`flex-1 py-1 px-2 rounded-md font-medium text-center transition-all cursor-pointer ${
                  levelFilter === 'sub'
                    ? 'bg-white dark:bg-[#1f2937] text-[#1877f2] dark:text-[#38bdf8] shadow-2xs font-semibold'
                    : 'text-[#65676b] dark:text-[#8b949e] hover:text-black dark:hover:text-white'
                }`}
              >
                Subsections (H3+)
              </button>
            </div>
          </div>

          {/* Heading Items List */}
          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs select-none scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
          >
            {filteredHeadings.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Search className="w-6 h-6 mx-auto mb-2 text-[#65676b] opacity-40" />
                <p className="font-semibold text-xs text-[#050505] dark:text-[#e6edf3]">
                  No matching sections
                </p>
                <p className="text-[11px] text-[#65676b] dark:text-[#8b949e] mt-1">
                  Try adjusting your search query or level filter.
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 px-3 py-1 rounded-lg bg-[#1877f2] text-white text-[11px] font-semibold hover:bg-[#166fe5] cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              filteredHeadings.map((item, idx) => {
                const isActive = activeHeadingId === item.id;
                const isH1 = item.level === 1;
                const isH2 = item.level === 2;
                const isH3 = item.level === 3;
                const isH4Plus = item.level >= 4;

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="group relative flex items-center rounded-xl transition-all"
                  >
                    <button
                      ref={isActive ? activeItemRef : null}
                      type="button"
                      onClick={() => onSelectHeading(item.id)}
                      className={`w-full text-left py-1.5 pr-8 rounded-xl transition-all flex items-start gap-2 cursor-pointer ${
                        isH1
                          ? 'pl-2.5 font-bold text-xs'
                          : isH2
                          ? 'pl-4 font-semibold text-xs'
                          : isH3
                          ? 'pl-6 text-[11.5px] opacity-90'
                          : 'pl-8 text-[11px] opacity-75'
                      } ${
                        isActive
                          ? isDocDark
                            ? 'bg-[#1877f2]/20 text-[#38bdf8] font-bold shadow-2xs'
                            : 'bg-[#e7f3ff] text-[#1877f2] font-bold shadow-2xs'
                          : isDocDark
                          ? 'text-[#c9d1d9] hover:bg-white/5 hover:text-white'
                          : 'text-[#333] hover:bg-[#f0f2f5] hover:text-black'
                      }`}
                      title={item.text}
                    >
                      {/* Active Indicator Bar or Level Bullet */}
                      <div className="mt-1 shrink-0 flex items-center justify-center">
                        {isActive ? (
                          <span className="w-1.5 h-3.5 rounded-full bg-[#1877f2] dark:bg-[#38bdf8] animate-in fade-in zoom-in-75 duration-150" />
                        ) : (
                          <span
                            className={`rounded-full ${
                              isH1
                                ? 'w-2 h-2 bg-[#1877f2] opacity-70'
                                : isH2
                                ? 'w-1.5 h-1.5 bg-[#65676b] opacity-60'
                                : 'w-1 h-1 bg-[#65676b] opacity-40'
                            }`}
                          />
                        )}
                      </div>

                      {/* Heading Text */}
                      <span className="truncate flex-1 leading-snug">
                        {item.text}
                      </span>
                    </button>

                    {/* Copy Direct Anchor Button (appears on hover) */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, item.id)}
                      className={`absolute right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer ${
                        copiedId === item.id
                          ? 'opacity-100 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'hover:bg-black/10 dark:hover:bg-white/15 text-[#65676b] hover:text-[#050505] dark:text-[#8b949e] dark:hover:text-white'
                      }`}
                      title={copiedId === item.id ? 'Copied link!' : 'Copy section link'}
                      aria-label="Copy section link"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Controls: Back to top & Keyboard Hints */}
          <div className="p-2.5 px-3.5 border-t border-black/10 dark:border-white/10 shrink-0 flex items-center justify-between text-[11px] text-[#65676b] dark:text-[#8b949e]">
            {onScrollToTop ? (
              <button
                type="button"
                onClick={onScrollToTop}
                className="flex items-center gap-1 hover:text-[#1877f2] dark:hover:text-[#38bdf8] font-medium transition-colors cursor-pointer"
                title="Scroll back to document top"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Top of note</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1 text-[10px] font-mono opacity-80">
              <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">Alt</kbd>
              <span>+</span>
              <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">T</kbd>
              <span>toggle</span>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
