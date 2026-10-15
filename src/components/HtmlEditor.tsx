import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Chapter, ChapterCssMode, TableOfContentItem } from '../types';
import { BrowserHtmlFrame, BrowserHtmlFrameRef } from './BrowserHtmlFrame';
import { isMarkdownContent, extractTitle, convertMarkdownToHtml, parseMarkdownHeadings } from '../lib/markdown';
import { FloatingTableOfContents } from './FloatingTableOfContents';
import { uploadCssFileApi, uploadGlobalCssApi, fetchCssFilesApi } from '../lib/api';
import { saveStoredCustomCssFile, saveStoredGlobalCss } from '../lib/storage';
import { UploadButton } from './UploadButton';
import {
  readFileWithProgress,
  formatBytes,
  FileUploadProgressState,
  initialUploadProgressState,
} from '../lib/uploadProgress';
import {
  FileCode,
  Eye,
  Columns,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Trash2,
  Palette,
  ChevronDown,
  Check,
  Loader2,
  Database,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

interface HtmlEditorProps {
  chapter: Chapter;
  topicName?: string;
  onSaveDraft: (
    draftHtml: string,
    title: string,
    tags: string[],
    includeGlobalCss?: boolean,
    cssMode?: ChapterCssMode,
    customCss?: string,
    customCssFileName?: string
  ) => void;
  onPublish: (
    html: string,
    title: string,
    tags: string[],
    rawDraft?: string,
    includeGlobalCss?: boolean,
    cssMode?: ChapterCssMode,
    customCss?: string,
    customCssFileName?: string
  ) => void;
  onCancel?: () => void;
  onDeleteChapter?: (chapterId: string) => void;
  onTogglePreviewMode?: (currentDraft?: string, currentTitle?: string) => void;
}

export const HtmlEditor: React.FC<HtmlEditorProps> = ({
  chapter,
  topicName,
  onSaveDraft,
  onPublish,
  onCancel,
  onDeleteChapter,
  onTogglePreviewMode,
}) => {
  const [title, setTitle] = useState(chapter.title);
  const [draftHtml, setDraftHtml] = useState(chapter.draftHtml || chapter.publishedHtml || '');
  const [cssMode, setCssMode] = useState<ChapterCssMode>(() => {
    if (chapter.cssMode) return chapter.cssMode;
    if (chapter.customCss) return 'custom';
    return chapter.includeGlobalCss === false ? 'none' : 'global';
  });
  const [customCss, setCustomCss] = useState<string>(chapter.customCss || '');
  const [customCssFileName, setCustomCssFileName] = useState<string>(chapter.customCssFileName || '');
  const [viewLayout, setViewLayout] = useState<'split' | 'edit' | 'preview'>('split');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [uploadProgressState, setUploadProgressState] = useState<FileUploadProgressState>(initialUploadProgressState);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorFrameRef = useRef<BrowserHtmlFrameRef>(null);

  // Dynamic Floating Table of Contents state for live preview
  const [editorToc, setEditorToc] = useState<TableOfContentItem[]>(() => parseMarkdownHeadings(draftHtml));
  const [editorActiveHeadingId, setEditorActiveHeadingId] = useState<string>('');
  const [editorReadProgress, setEditorReadProgress] = useState<number>(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isTocPinned, setIsTocPinned] = useState(() => {
    try {
      return localStorage.getItem('toc_pinned') === 'true';
    } catch {
      return false;
    }
  });

  // Dynamically re-parse Markdown/HTML headings as author edits
  useEffect(() => {
    const headings = parseMarkdownHeadings(draftHtml);
    setEditorToc(headings);
  }, [draftHtml]);

  // Auto-detect whether the content is Markdown or HTML
  const isMarkdown = useMemo(() => isMarkdownContent(draftHtml), [draftHtml]);

  // Markdown formatting helper for keyboard shortcuts
  const wrapSelection = (before: string, after: string = before, placeholder: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end);

    const textToInsert = selectedText || placeholder;
    const replacement = `${before}${textToInsert}${after}`;
    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    setDraftHtml(nextVal);
    setHasUnsavedChanges(true);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
      }
    }, 0);
  };

  // Keyboard shortcut listener for standard markdown hotkeys
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        wrapSelection('**', '**', 'bold text');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        wrapSelection('*', '*', 'italic text');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        wrapSelection('[', '](https://example.com)', 'link text');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        wrapSelection('`', '`', 'code');
      }
    }
  };

  // Open note preview in a standalone new browser tab
  const handleOpenInTab = async () => {
    let contentToPreview = draftHtml;
    if (isMarkdown) {
      try {
        contentToPreview = await convertMarkdownToHtml(draftHtml, { title });
      } catch {
        contentToPreview = draftHtml;
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
  ${contentToPreview}
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

  // Track unsaved modifications
  useEffect(() => {
    const initialMode =
      chapter.cssMode ||
      (chapter.customCss ? 'custom' : chapter.includeGlobalCss === false ? 'none' : 'global');
    const isDifferent =
      draftHtml !== chapter.draftHtml ||
      title !== chapter.title ||
      cssMode !== initialMode ||
      customCss !== (chapter.customCss || '') ||
      customCssFileName !== (chapter.customCssFileName || '');
    setHasUnsavedChanges(isDifferent);
  }, [draftHtml, title, cssMode, customCss, customCssFileName, chapter]);

  // Keep ref to latest values to guarantee flushing on unmount or before switching chapters
  const latestValuesRef = useRef({
    chapterId: chapter.id,
    draftHtml,
    title,
    tags: chapter.tags || [],
    includeGlobalCss: cssMode === 'global',
    cssMode,
    customCss,
    customCssFileName,
    hasUnsavedChanges,
    onSaveDraft,
  });

  useEffect(() => {
    latestValuesRef.current = {
      chapterId: chapter.id,
      draftHtml,
      title,
      tags: chapter.tags || [],
      includeGlobalCss: cssMode === 'global',
      cssMode,
      customCss,
      customCssFileName,
      hasUnsavedChanges,
      onSaveDraft,
    };
  }, [chapter.id, chapter.tags, draftHtml, title, cssMode, customCss, customCssFileName, hasUnsavedChanges, onSaveDraft]);

  const lastChapterIdRef = useRef(chapter.id);

  // Synchronize state when switching chapters so no content is shared and data is never desynchronized
  useEffect(() => {
    const isNewChapter = chapter.id !== lastChapterIdRef.current;
    if (isNewChapter) {
      // If previous chapter had unsaved changes, flush them immediately
      const prev = latestValuesRef.current;
      if (prev.hasUnsavedChanges && prev.chapterId === lastChapterIdRef.current) {
        prev.onSaveDraft(
          prev.draftHtml,
          prev.title,
          prev.tags,
          prev.includeGlobalCss,
          prev.cssMode,
          prev.customCss,
          prev.customCssFileName
        );
      }
      lastChapterIdRef.current = chapter.id;
      setTitle(chapter.title);
      setDraftHtml(chapter.draftHtml || chapter.publishedHtml || '');
      const mode =
        chapter.cssMode ||
        (chapter.customCss ? 'custom' : chapter.includeGlobalCss === false ? 'none' : 'global');
      setCssMode(mode);
      setCustomCss(chapter.customCss || '');
      setCustomCssFileName(chapter.customCssFileName || '');
      setHasUnsavedChanges(false);
    } else if (!hasUnsavedChanges) {
      // If user is not currently in the middle of unsaved typing, stay in sync with external updates
      setTitle(chapter.title);
      setDraftHtml(chapter.draftHtml || chapter.publishedHtml || '');
      const mode =
        chapter.cssMode ||
        (chapter.customCss ? 'custom' : chapter.includeGlobalCss === false ? 'none' : 'global');
      setCssMode(mode);
      setCustomCss(chapter.customCss || '');
      setCustomCssFileName(chapter.customCssFileName || '');
    }
  }, [chapter.id, chapter.title, chapter.draftHtml, chapter.publishedHtml, chapter.updatedAt, hasUnsavedChanges]);

  // Flush unsaved changes on unmount (e.g. switching from CMS Editor to Reader View)
  useEffect(() => {
    return () => {
      const latest = latestValuesRef.current;
      if (latest.hasUnsavedChanges) {
        latest.onSaveDraft(
          latest.draftHtml,
          latest.title,
          latest.tags,
          latest.includeGlobalCss,
          latest.cssMode,
          latest.customCss,
          latest.customCssFileName
        );
      }
    };
  }, []);

  // File loading helper for .md, .markdown, .html, .htm, .css
  const loadFileContent = async (file: File) => {
    setUploadProgressState({
      isUploading: true,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      bytesLoaded: 0,
      bytesTotal: file.size || 1,
      phase: 'reading',
    });

    const isCss = file.name.endsWith('.css') || file.type === 'text/css';

    try {
      // 1. Read file with smooth progress reporting (0% to 100%, or 0% to 50% if uploading CSS to server)
      const text = await readFileWithProgress(
        file,
        (pct, loaded, total) => {
          const displayPct = isCss ? Math.round(pct * 0.5) : pct;
          setUploadProgressState((prev) => ({
            ...prev,
            progress: displayPct,
            bytesLoaded: loaded,
            bytesTotal: total,
            phase: 'reading',
          }));
        },
        500
      );

      if (!text) {
        setUploadProgressState(initialUploadProgressState);
        return;
      }

      if (isCss) {
        setUploadProgressState((prev) => ({ ...prev, phase: 'uploading' }));
        try {
          // Permanently save to server & storage (setAsGlobal: false so it does NOT apply to all HTML!)
          await uploadCssFileApi(text, file.name, false, (pct, loaded, total) => {
            const displayPct = 50 + Math.round(pct * 0.5);
            setUploadProgressState((prev) => ({
              ...prev,
              progress: Math.min(displayPct, 99),
              bytesLoaded: loaded,
              bytesTotal: total,
              phase: 'uploading',
            }));
          });

          saveStoredCustomCssFile({
            filename: file.name,
            cssContent: text,
            size: text.length,
            updatedAt: new Date().toISOString(),
            isGlobal: false,
          });

          // Set specifically for this note
          setCustomCss(text);
          setCustomCssFileName(file.name);
          setCssMode('custom');
          setHasUnsavedChanges(true);
          setUploadProgressState((prev) => ({ ...prev, progress: 100, phase: 'done' }));
          setImportNotification(`Saved "${file.name}"! Applied to this note only (not all notes).`);
          setTimeout(() => {
            setImportNotification(null);
            setUploadProgressState(initialUploadProgressState);
          }, 3500);
        } catch {
          setUploadProgressState((prev) => ({
            ...prev,
            phase: 'error',
            errorMessage: 'Failed to upload CSS file',
          }));
          setImportNotification('Failed to upload CSS file');
          setTimeout(() => setUploadProgressState(initialUploadProgressState), 3000);
        }
        return;
      }

      const isMdFile = file.name.endsWith('.md') || file.name.endsWith('.markdown') || isMarkdownContent(text);
      const extractedTitle = extractTitle(text, file.name);

      if (
        extractedTitle &&
        (!title ||
          title.trim() === 'Untitled' ||
          title.toLowerCase().startsWith('new chapter') ||
          /^chapter\s+\d+$/i.test(title.trim()))
      ) {
        setTitle(extractedTitle);
      }

      if (isMdFile) {
        setCssMode('none');
      }

      setDraftHtml(text);
      setHasUnsavedChanges(true);
      setUploadProgressState((prev) => ({ ...prev, progress: 100, phase: 'done' }));
      setImportNotification(
        `Imported "${file.name}" (GitHub Markdown)`
      );
      setTimeout(() => {
        setImportNotification(null);
        setUploadProgressState(initialUploadProgressState);
      }, 2000);
    } catch (err: any) {
      setUploadProgressState((prev) => ({
        ...prev,
        phase: 'error',
        errorMessage: err?.message || 'Failed to read file',
      }));
      setImportNotification('Failed to read file');
      setTimeout(() => setUploadProgressState(initialUploadProgressState), 3000);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFileContent(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      loadFileContent(file);
    }
  };

  const handlePublishClick = async () => {
    setIsPublishing(true);
    try {
      // If Markdown, compile to high-fidelity HTML for instant reader rendering, while preserving draftHtml as markdown
      let finalHtmlToPublish = draftHtml;
      if (isMarkdown) {
        try {
          finalHtmlToPublish = await convertMarkdownToHtml(draftHtml, { title });
        } catch (err) {
          console.warn('Markdown publish compile error:', err);
        }
      }
      await onPublish(
        finalHtmlToPublish,
        title,
        chapter.tags || [],
        draftHtml,
        isMarkdown ? false : cssMode === 'global',
        isMarkdown ? 'none' : cssMode,
        isMarkdown ? undefined : customCss,
        isMarkdown ? undefined : customCssFileName
      );
      setHasUnsavedChanges(false);
    } finally {
      setIsPublishing(false);
    }
  };

  // Listen for publish trigger
  useEffect(() => {
    const handleTriggerPublish = () => {
      handlePublishClick();
    };
    window.addEventListener('CMS_TRIGGER_PUBLISH_LIVE', handleTriggerPublish);
    return () => {
      window.removeEventListener('CMS_TRIGGER_PUBLISH_LIVE', handleTriggerPublish);
    };
  }, [handlePublishClick]);

  const isCurrentlyPublished = chapter.status === 'published' && !hasUnsavedChanges;

  return (
    <div
      className="relative flex flex-col h-full w-full bg-white dark:bg-[#0e1217] text-zinc-900 dark:text-[#f8fafc] transition-colors"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.html,.htm,.css,text/markdown,text/html,text/css,text/plain"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1877f2]/10 backdrop-blur-xs border-2 border-dashed border-[#1877f2] rounded-xl m-2 pointer-events-none animate-in fade-in duration-100">
          <div className="p-4 bg-white dark:bg-[#181d28] rounded-2xl shadow-xl border border-blue-200 dark:border-[#262c36] flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-[#1877f2] dark:text-[#60a5fa] animate-bounce" />
            <span className="font-bold text-sm text-[#050505] dark:text-[#f8fafc]">Drop .html, .md, or .css file here</span>
            <span className="text-xs text-[#65676b] dark:text-[#94a3b8]">Notes or stylesheet will be imported instantly</span>
          </div>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#e4e6eb] dark:border-[#262c36] bg-[#f0f2f5] dark:bg-[#13171f]">
        <div className="flex-1 min-w-[240px]">
          <input
            id="chapter-title-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="Chapter Title..."
            className="w-full text-xl sm:text-2xl font-bold bg-transparent border-none text-[#050505] dark:text-[#f8fafc] focus:outline-hidden focus:ring-0 placeholder:text-[#65676b] dark:placeholder:text-[#64748b]"
          />
          {importNotification && (
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              <CheckCircle2 className="w-3 h-3" />
              <span>{importNotification}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Status Indicator, Layout Switcher, Open in Tab, Upload, Preview, Single Publish Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Indicator: Published vs Unpublished */}
          <div
            id="chapter-publish-status-indicator"
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border select-none transition-all shadow-2xs ${
              isCurrentlyPublished
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
            title={
              isCurrentlyPublished
                ? 'This note is published and stored in database'
                : 'Unpublished changes — click Publish to save to database'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCurrentlyPublished ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span>{isCurrentlyPublished ? 'Published' : 'Unpublished'}</span>
          </div>

          {/* View Switcher: Source & Split */}
          <div className="hidden sm:flex items-center bg-white dark:bg-[#181d28] border border-[#ced0d4] dark:border-[#262c36] rounded-xl p-1 text-xs shadow-2xs">
            <button
              id="layout-edit-btn"
              onClick={() => setViewLayout('edit')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'edit'
                  ? 'bg-[#1877f2] dark:bg-[#2563eb] text-white shadow-xs font-semibold'
                  : 'text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Source</span>
            </button>
            <button
              id="layout-split-btn"
              onClick={() => setViewLayout('split')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'split'
                  ? 'bg-[#1877f2] dark:bg-[#2563eb] text-white shadow-xs font-semibold'
                  : 'text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>

          {/* Open in Tab Button (Markdown / Note preview in new tab) */}
          <button
            id="editor-open-in-tab-btn"
            type="button"
            onClick={handleOpenInTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ced0d4] dark:border-[#262c36] bg-white dark:bg-[#181d28] hover:bg-[#e4e6eb] dark:hover:bg-[#232936] text-xs font-semibold text-[#050505] dark:text-[#f8fafc] transition-colors shadow-2xs cursor-pointer"
            title="Open markdown / note preview in a new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#1877f2] dark:text-[#60a5fa]" />
            <span>Open in Tab</span>
          </button>

          {/* Upload .html / .md / .css Button */}
          <UploadButton
            id="editor-upload-file-btn"
            onClick={() => fileInputRef.current?.click()}
            isUploading={uploadProgressState.isUploading}
            progress={uploadProgressState.progress}
            label="Upload File"
            uploadingLabel="Uploading"
            doneLabel="Uploaded!"
            title="Upload .html, .md, or .css stylesheet into note"
          />

          {/* Preview Option: Hide Header & Sidebar, Display Only Content */}
          {onTogglePreviewMode && (
            <button
              id="editor-full-preview-btn"
              type="button"
              onClick={() => onTogglePreviewMode(draftHtml, title)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d8e4f8] dark:border-[#283548] bg-[#e7f3ff] dark:bg-[#1e293b] hover:bg-[#d4e9ff] dark:hover:bg-[#283548] text-xs font-semibold text-[#1877f2] dark:text-[#60a5fa] transition-colors shadow-2xs cursor-pointer"
              title="Preview note content (hide header and sidebar, display only content)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          )}

          {/* Single Publish Button: Stores in database when clicked! */}
          <button
            id="editor-single-publish-btn"
            type="button"
            onClick={handlePublishClick}
            disabled={isPublishing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1877f2] dark:bg-[#2563eb] hover:bg-[#166fe5] dark:hover:bg-[#1d4ed8] active:scale-95 text-xs font-bold text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Publish chapter and store permanently in database"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publish</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Work Area: Split Panels */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Pane: Raw Editor */}
        {(viewLayout === 'edit' || viewLayout === 'split') && (
          <div
            className={`flex flex-col h-full bg-[#f8fafc] dark:bg-[#0e1217] ${
              viewLayout === 'split' ? 'w-1/2 border-r border-[#e4e6eb] dark:border-[#262c36]' : 'w-full'
            }`}
          >
            <div className="px-4 py-2 bg-[#f0f2f5] dark:bg-[#13171f] border-b border-[#e4e6eb] dark:border-[#262c36] text-[11px] font-mono text-[#65676b] dark:text-[#94a3b8] flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-[#050505] dark:text-[#f8fafc] shrink-0">
                  {isMarkdown ? "Markdown Source" : "HTML Source"}
                </span>
                {uploadProgressState.isUploading && (
                  <span
                    id="html-source-upload-pill"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#e7f3ff] dark:bg-[#1e293b] text-[#1877f2] dark:text-[#60a5fa] font-semibold text-[10.5px] border border-[#d8e4f8] dark:border-[#283548] animate-in fade-in truncate"
                    title={`Uploading ${uploadProgressState.fileName}: ${Math.round(uploadProgressState.progress)}%`}
                  >
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    <span className="truncate">Uploading {uploadProgressState.fileName}:</span>
                    <span className="tabular-nums font-mono font-bold">{Math.round(uploadProgressState.progress)}%</span>
                  </span>
                )}
              </div>
              <span className="font-medium text-[#65676b] dark:text-[#94a3b8] shrink-0 ml-2">
                {draftHtml.length.toLocaleString()} characters
              </span>
            </div>
            <div className="relative flex-1 flex flex-col min-h-0">
              {/* While file is being uploaded, show clear, prominent progress overlay in the HTML source area */}
              {uploadProgressState.isUploading && (
                <div
                  id="html-source-upload-overlay"
                  className="absolute inset-0 z-30 bg-[#f8fafc]/95 dark:bg-[#0e1217]/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-in fade-in duration-150 select-none"
                >
                  <div className="w-full max-w-md p-5 bg-white dark:bg-[#181d28] rounded-2xl border border-[#d8e4f8] dark:border-[#262c36] shadow-xl flex flex-col gap-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#e7f3ff] dark:bg-[#1e293b] text-[#1877f2] dark:text-[#60a5fa] flex items-center justify-center border border-[#d8e4f8] dark:border-[#283548] shrink-0">
                          <Upload className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#050505] dark:text-[#f8fafc] truncate">
                            {uploadProgressState.fileName}
                          </p>
                          <p className="text-[11px] text-[#65676b] dark:text-[#94a3b8]">
                            Uploading into HTML Source • {formatBytes(uploadProgressState.bytesLoaded)} of {formatBytes(uploadProgressState.bytesTotal)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-black font-mono text-[#1877f2] dark:text-[#60a5fa]">
                          {Math.round(uploadProgressState.progress)}%
                        </span>
                      </div>
                    </div>

                    {/* High Precision Progress Bar Track */}
                    <div className="w-full h-2.5 rounded-full bg-[#e4e6eb] dark:bg-[#262c36] overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-[#1877f2] via-[#2563eb] to-[#3b82f6] rounded-full transition-all duration-150 ease-out"
                        style={{ width: `${Math.min(Math.max(uploadProgressState.progress, 0), 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#65676b] dark:text-[#94a3b8]">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-[#1877f2] dark:text-[#60a5fa]" />
                        {uploadProgressState.phase === 'uploading' ? 'Saving stylesheet to server...' : 'Reading and parsing into editor...'}
                      </span>
                      <span className="font-mono text-[#1877f2] dark:text-[#60a5fa] font-semibold">{Math.round(uploadProgressState.progress)}% done</span>
                    </div>
                  </div>
                </div>
              )}

              <textarea
                id="raw-html-textarea"
                ref={textareaRef}
                value={draftHtml}
                onChange={(e) => setDraftHtml(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Paste or write Markdown (.md) or raw HTML here..."
                className="flex-1 w-full p-4 pb-4 font-mono text-xs leading-relaxed bg-[#f8fafc] dark:bg-[#0e1217] text-[#050505] dark:text-[#f8fafc] border-none focus:outline-hidden resize-none selection:bg-[#1877f2]/20 selection:text-[#1877f2]"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Right Pane: Live Preview with Mermaid Diagrams (File content stays light) */}
        {(viewLayout === 'preview' || viewLayout === 'split') && (() => {
          return (
            <div className={`flex flex-col h-full overflow-hidden bg-white text-[#1c1e21] ${viewLayout === 'split' ? 'w-1/2' : 'w-full'}`}>
              <div className="px-4 py-2 border-b text-[11px] font-mono flex justify-between items-center shrink-0 z-10 bg-[#f0f2f5] dark:bg-[#13171f] border-[#e4e6eb] dark:border-[#262c36] text-[#65676b] dark:text-[#94a3b8]">
                <span className="font-bold text-[#050505] dark:text-[#f8fafc]">
                  Live Browser Render
                </span>
                <span className="text-[11px] text-[#65676b] dark:text-[#94a3b8]">
                  {isMarkdown
                    ? 'Markdown Preview'
                    : cssMode === 'custom'
                    ? `Custom CSS: ${customCssFileName || 'custom.css'}`
                    : cssMode === 'global'
                    ? 'Global Theme'
                    : 'Raw HTML'}
                </span>
              </div>
              <div className="flex-1 w-full h-full relative overflow-hidden">
                {/* Dynamic Floating Table of Contents in Live Preview */}
                <FloatingTableOfContents
                  headings={editorToc}
                  activeHeadingId={editorActiveHeadingId}
                  onSelectHeading={(id) => {
                    editorFrameRef.current?.scrollToId(id);
                    if (!isTocPinned) setIsTocOpen(false);
                  }}
                  onScrollToTop={() => editorFrameRef.current?.scrollToTop()}
                  isDocDark={false}
                  readProgress={editorReadProgress}
                  documentTitle={title || 'Chapter Preview'}
                  isOpen={isTocOpen}
                  onToggleOpen={() => setIsTocOpen(!isTocOpen)}
                  isPinned={isTocPinned}
                  onTogglePinned={() => {
                    setIsTocPinned((prev) => {
                      const next = !prev;
                      try {
                        localStorage.setItem('toc_pinned', String(next));
                      } catch {}
                      return next;
                    });
                  }}
                />

                <BrowserHtmlFrame
                  ref={editorFrameRef}
                  key={`${chapter.id}-${isMarkdown ? 'none' : cssMode}-${customCssFileName}`}
                  chapterId={chapter.id}
                  htmlContent={draftHtml}
                  title={title || 'Chapter Preview'}
                  includeGlobalCss={!isMarkdown && cssMode === 'global'}
                  cssMode={isMarkdown ? 'none' : cssMode}
                  customCss={isMarkdown ? undefined : customCss}
                  customCssFileName={isMarkdown ? undefined : customCssFileName}
                  onScroll={(_top, _height, _client, progress) => {
                    setEditorReadProgress(progress);
                  }}
                  onActiveHeadingChange={(id) => {
                    setEditorActiveHeadingId(id);
                  }}
                  onHeadingsExtracted={(h) => {
                    if (h && h.length > 0) {
                      setEditorToc(h);
                    }
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
