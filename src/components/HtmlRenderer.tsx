import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { TableOfContentItem, ReadingPosition, User } from '../types';
import {
  Calendar,
  Hash,
  ArrowUp,
  ArrowDown,
  Bookmark,
  ListTree,
  X,
  Palette,
  Eye,
  ExternalLink,
  Send,
  Loader2,
} from 'lucide-react';
import {
  getStoredReadingPositions,
  saveStoredReadingPosition,
  clearStoredReadingPosition,
} from '../lib/storage';
import { BrowserHtmlFrame, BrowserHtmlFrameRef } from './BrowserHtmlFrame';
import { isMarkdownContent, convertMarkdownToHtml, parseMarkdownHeadings } from '../lib/markdown';
import { FloatingTableOfContents } from './FloatingTableOfContents';

interface HtmlRendererProps {
  user?: User | null;
  chapterId?: string;
  title: string;
  htmlContent: string;
  topicName?: string;
  tags?: string[];
  lastPublishedAt?: string;
  isDraftPreview?: boolean;
  includeGlobalCss?: boolean;
  cssMode?: 'global' | 'none' | 'custom';
  customCss?: string;
  customCssFileName?: string;
  onToggleGlobalCss?: (include: boolean) => void;
  onChangeCssMode?: (mode: 'global' | 'none' | 'custom') => void;
  onBookmarkUpdated?: () => void;
  onTogglePreviewMode?: () => void;
  onDeleteChapter?: (chapterId: string) => void;
  onPublish?: () => Promise<void> | void;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({
  user,
  chapterId,
  title,
  htmlContent,
  topicName,
  tags = [],
  lastPublishedAt,
  isDraftPreview = false,
  includeGlobalCss: initialIncludeGlobalCss = true,
  cssMode: initialCssMode,
  customCss,
  customCssFileName,
  onToggleGlobalCss,
  onChangeCssMode,
  onBookmarkUpdated,
  onTogglePreviewMode,
  onDeleteChapter,
  onPublish,
}) => {
  const frameRef = useRef<BrowserHtmlFrameRef>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentScrollTopRef = useRef<number>(0);

  const isMarkdown = useMemo(() => {
    return isMarkdownContent(htmlContent) || htmlContent.includes('markdown-body');
  }, [htmlContent]);

  const [currentCssMode, setCurrentCssMode] = useState<'global' | 'none' | 'custom'>(() => {
    if (isMarkdown) return 'none';
    if (initialCssMode) return initialCssMode;
    if (customCss) return 'custom';
    return initialIncludeGlobalCss === false ? 'none' : 'global';
  });

  useEffect(() => {
    if (isMarkdown) {
      setCurrentCssMode('none');
      return;
    }
    const mode =
      initialCssMode ||
      (customCss ? 'custom' : initialIncludeGlobalCss === false ? 'none' : 'global');
    setCurrentCssMode(mode);
  }, [initialCssMode, customCss, initialIncludeGlobalCss, chapterId, isMarkdown]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [savedMark, setSavedMark] = useState<ReadingPosition | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const [justMarked, setJustMarked] = useState(false);
  const [toc, setToc] = useState<TableOfContentItem[]>(() => parseMarkdownHeadings(htmlContent));
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isTocPinned, setIsTocPinned] = useState(() => {
    try {
      return localStorage.getItem('toc_pinned') === 'true';
    } catch {
      return false;
    }
  });

  // Dynamically re-parse active markdown/HTML content on update
  useEffect(() => {
    const parsed = parseMarkdownHeadings(htmlContent);
    if (parsed.length > 0) {
      setToc(parsed);
    }
  }, [htmlContent]);

  const handleTogglePinned = () => {
    setIsTocPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('toc_pinned', String(next));
      } catch {}
      return next;
    });
  };

  // Load saved reading position for this chapter
  useEffect(() => {
    if (chapterId) {
      const positions = getStoredReadingPositions();
      const pos = positions[chapterId];
      if (pos && pos.scrollTop > 60 && pos.progress > 2 && pos.progress < 98) {
        setSavedMark(pos);
        setResumeDismissed(false);
      } else {
        setSavedMark(null);
      }
    } else {
      setSavedMark(null);
    }
  }, [chapterId]);

  // Estimate reading time from text content
  const readingTime = useMemo(() => {
    const text = htmlContent.replace(/<[^>]*>?/gm, ' ');
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(wordCount / 200);
    return {
      minutes: Math.max(1, minutes),
      words: wordCount,
    };
  }, [htmlContent]);

  // File content always renders in clean light theme per user design requirement
  const isDocDark = false;

  // Handle iframe scroll updates
  const handleScroll = useCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number, progress: number) => {
      currentScrollTopRef.current = scrollTop;
      setReadProgress(progress);
      setShowScrollTop(scrollTop > 350);

      // Debounced automatic position saving
      if (chapterId && scrollTop > 50) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          saveStoredReadingPosition(chapterId, scrollTop, progress);
          onBookmarkUpdated?.();
        }, 500);
      }
    },
    [chapterId, onBookmarkUpdated]
  );

  // Resume reading from saved position
  const handleResume = () => {
    if (!savedMark) return;
    frameRef.current?.scrollTo(savedMark.scrollTop);
    setResumeDismissed(true);
  };

  // Clear saved bookmark mark
  const handleClearMark = () => {
    if (!chapterId) return;
    clearStoredReadingPosition(chapterId);
    setSavedMark(null);
    setResumeDismissed(true);
    onBookmarkUpdated?.();
  };

  // Mark current spot manually
  const handleMarkCurrentSpot = () => {
    if (!chapterId) return;
    const scrollTop = currentScrollTopRef.current;
    saveStoredReadingPosition(chapterId, scrollTop, readProgress);
    setJustMarked(true);
    setSavedMark({
      chapterId,
      scrollTop,
      progress: readProgress,
      updatedAt: new Date().toISOString(),
    });
    onBookmarkUpdated?.();
    setTimeout(() => setJustMarked(false), 2500);
  };

  // Jump to specific TOC section
  const handleScrollToSection = (id: string) => {
    frameRef.current?.scrollToId(id);
    setIsTocOpen(false);
  };

  // Scroll to top
  const handleScrollToTop = () => {
    frameRef.current?.scrollToTop();
  };

  // Trigger browser print
  const handlePrint = () => {
    frameRef.current?.print();
  };

  const [isPublishing, setIsPublishing] = useState(false);

  const handleReaderPublish = async () => {
    if (!onPublish) return;
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenInTab = async () => {
    const isMd = isMarkdownContent(htmlContent);
    let renderedHtml = htmlContent;
    if (isMd) {
      try {
        renderedHtml = await convertMarkdownToHtml(htmlContent, { title });
      } catch {
        renderedHtml = htmlContent;
      }
    }
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Preview'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 24px; line-height: 1.6; color: #1c1e21; background: #ffffff; }
    pre { background: #161b22; color: #e6edf3; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ced0d4; padding: 8px 12px; text-align: left; }
    th { background: #f0f2f5; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div
      id="html-renderer-container"
      className="relative w-full h-full flex flex-col flex-1 overflow-hidden transition-colors bg-white text-[#1c1e21]"
    >
      {/* 1. Top Reading Progress Indicator (Fixed line at top) */}
      <div
        id="reader-progress-container"
        className="sticky top-0 left-0 right-0 z-50 w-full bg-transparent pointer-events-none"
      >
        <div
          role="progressbar"
          aria-valuenow={readProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
          className={`w-full h-1 relative overflow-hidden ${
            isDocDark ? 'bg-white/10' : 'bg-black/5'
          }`}
        >
          <div
            id="reader-progress-bar"
            data-testid="reading-progress-bar"
            className="h-full bg-linear-to-r from-[#1877f2] via-[#00a8ff] to-[#46d2d6] transition-[width] duration-150 ease-out shadow-[0_0_8px_rgba(24,119,242,0.5)]"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      </div>

      {/* 2. Sleek Reader Utility Bar */}
      <div
        id="reader-utility-bar"
        className={`px-4 py-1.5 border-b flex items-center justify-between gap-3 text-xs shrink-0 select-none z-40 transition-colors ${
          isDocDark
            ? 'bg-[#0c1015]/90 border-[#1f2733] text-[#a0a6b5] backdrop-blur-md'
            : 'bg-[#f0f2f5]/90 border-[#e4e6eb] text-[#65676b] backdrop-blur-md'
        }`}
      >
        {/* Left: Status Indicator and reading progress */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            id="reader-publish-status-indicator"
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none transition-all ${
              isDraftPreview
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
            title={isDraftPreview ? 'Unpublished note preview' : 'Published note stored in database'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isDraftPreview ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>{isDraftPreview ? 'Unpublished' : 'Published'}</span>
          </div>

          {readProgress > 0 && (
            <span
              className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                isDocDark
                  ? 'bg-blue-500/20 text-[#60a5fa]'
                  : 'bg-blue-100 text-[#1877f2]'
              }`}
            >
              {readProgress}%
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {/* Table of Contents Button */}
          {toc.length > 0 && (
            <button
              id="reader-toggle-toc-btn"
              type="button"
              onClick={() => setIsTocOpen(!isTocOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isTocOpen
                  ? 'bg-[#1877f2] dark:bg-[#2563eb] text-white shadow-2xs'
                  : isDocDark
                  ? 'bg-white/5 hover:bg-white/10 text-[#f5f2eb] border border-transparent'
                  : 'bg-white hover:bg-[#e4e6eb] text-[#050505] border border-[#ced0d4]'
              }`}
              title="Toggle Table of Contents (Alt + T)"
              aria-label="Toggle Table of Contents"
            >
              <ListTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Contents</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  isTocOpen
                    ? 'bg-white/20 text-white'
                    : isDocDark
                    ? 'bg-blue-500/20 text-[#60a5fa]'
                    : 'bg-blue-50 text-[#1877f2]'
                }`}
              >
                {toc.length}
              </span>
            </button>
          )}

          {/* Open in Tab Button */}
          <button
            id="reader-open-in-tab-btn"
            type="button"
            onClick={handleOpenInTab}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isDocDark
                ? 'bg-white/10 hover:bg-white/20 text-[#f5f2eb] border border-white/10'
                : 'bg-white hover:bg-[#e4e6eb] text-[#050505] border border-[#ced0d4]'
            }`}
            title="Open markdown / note preview in a new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#1877f2] dark:text-[#60a5fa]" />
            <span className="hidden sm:inline">Open in Tab</span>
          </button>

          {/* Preview Option: Hide Header & Sidebar, Display Only Content */}
          {onTogglePreviewMode && (
            <button
              id="reader-preview-fullscreen-btn"
              type="button"
              onClick={onTogglePreviewMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                isDocDark
                  ? 'bg-blue-600/30 hover:bg-blue-600/50 text-[#60a5fa] border border-blue-500/30'
                  : 'bg-[#e7f3ff] hover:bg-[#d8e4f8] text-[#1877f2] border border-[#d8e4f8]'
              }`}
              title="Preview mode: hide header and sidebar, display only the content"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          )}

          {/* Single Publish Button if note is unpublished */}
          {onPublish && isDraftPreview && (
            <button
              id="reader-single-publish-btn"
              type="button"
              onClick={handleReaderPublish}
              disabled={isPublishing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1877f2] dark:bg-[#2563eb] hover:bg-[#166fe5] dark:hover:bg-[#1d4ed8] text-xs font-bold text-white transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Publish note now to database"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Publish</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. Resume Reading Banner (Floating toast if bookmark exists) */}
      {savedMark && !resumeDismissed && (
        <div className="absolute top-12 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-3 rounded-xl bg-blue-600 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bookmark className="w-4 h-4 fill-white shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight">Continue where you left off</p>
              <p className="text-[11px] text-blue-100 truncate">Saved position: {savedMark.progress}%</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleResume}
              className="px-2.5 py-1 rounded-lg bg-white text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <ArrowDown className="w-3 h-3" />
              <span>Resume</span>
            </button>
            <button
              onClick={handleClearMark}
              className="px-2 py-1 rounded-lg text-blue-100 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
              title="Clear mark"
            >
              Clear
            </button>
            <button
              onClick={() => setResumeDismissed(true)}
              className="p-1 rounded-lg text-blue-200 hover:text-white transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Dynamic Floating Table of Contents Sidebar */}
      <FloatingTableOfContents
        headings={toc}
        activeHeadingId={activeHeadingId}
        onSelectHeading={handleScrollToSection}
        onScrollToTop={handleScrollToTop}
        isDocDark={isDocDark}
        readProgress={readProgress}
        documentTitle={title}
        isOpen={isTocOpen}
        onToggleOpen={() => setIsTocOpen(!isTocOpen)}
        isPinned={isTocPinned}
        onTogglePinned={handleTogglePinned}
      />

      {/* 5. Native Browser Isolated HTML Iframe */}
      <div className={`flex-1 w-full h-full relative overflow-hidden transition-all duration-200 ${
        isTocPinned && isTocOpen ? 'xl:pr-96' : ''
      }`}>
        <BrowserHtmlFrame
          key={`${chapterId}-${currentCssMode}-${customCssFileName}`}
          ref={frameRef}
          htmlContent={htmlContent}
          title={title}
          chapterId={chapterId}
          includeGlobalCss={currentCssMode === 'global'}
          cssMode={currentCssMode}
          customCss={customCss}
          customCssFileName={customCssFileName}
          initialScrollTop={savedMark?.scrollTop}
          onScroll={handleScroll}
          onActiveHeadingChange={(id) => setActiveHeadingId(id)}
          onHeadingsExtracted={(headings) => {
            if (headings && headings.length > 0) {
              setToc(headings);
            }
          }}
          className="w-full h-full"
        />
      </div>

      {/* 6. Floating Scroll to Top Button (shown when no TOC sections exist) */}
      {showScrollTop && toc.length === 0 && (
        <button
          id="scroll-to-top-btn"
          onClick={handleScrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white shadow-xl shadow-blue-500/30 hover:scale-105 transition-all z-40 cursor-pointer"
          title="Back to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
