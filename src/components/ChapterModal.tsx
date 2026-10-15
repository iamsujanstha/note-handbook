import React, { useState, useEffect, useRef } from 'react';
import { X, FilePlus, Tag, BookOpen, Upload, FileText, CheckCircle2, Palette } from 'lucide-react';
import { Topic } from '../types';
import { extractTitle, isMarkdownContent } from '../lib/markdown';
import { UploadButton } from './UploadButton';
import { readFileWithProgress } from '../lib/uploadProgress';

interface ChapterModalProps {
  isOpen: boolean;
  topic: Topic | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    tags: string[];
    initialHtml?: string;
    publishImmediately?: boolean;
    includeGlobalCss?: boolean;
    cssMode?: 'global' | 'none' | 'custom';
    customCss?: string;
    customCssFileName?: string;
  }) => void;
}

export const ChapterModal: React.FC<ChapterModalProps> = ({
  isOpen,
  topic,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [includeGlobalCss, setIncludeGlobalCss] = useState(true);
  const [attachedContent, setAttachedContent] = useState<string>('');
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTagInput(topic?.name || '');
      setPublishImmediately(true);
      setIncludeGlobalCss(true);
      setAttachedContent('');
      setAttachedFileName('');
      setIsUploading(false);
      setUploadProgress(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, topic, onClose]);

  if (!isOpen || !topic) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const text = await readFileWithProgress(
        file,
        (pct) => {
          setUploadProgress(pct);
        },
        450
      );

      if (text) {
        const isMd = file.name.endsWith('.md') || file.name.endsWith('.markdown') || isMarkdownContent(text);
        if (isMd) {
          setIncludeGlobalCss(false);
        }
        const extracted = extractTitle(text, file.name);
        if (extracted && (!title || title.trim() === '')) {
          setTitle(extracted);
        }
        setAttachedContent(text);
        setAttachedFileName(file.name);
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1200);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const isMd =
      (attachedFileName && (attachedFileName.endsWith('.md') || attachedFileName.endsWith('.markdown'))) ||
      (attachedContent ? isMarkdownContent(attachedContent) : false);

    onSave({
      title: title.trim(),
      tags: tags.length > 0 ? tags : [topic.name],
      initialHtml: attachedContent || undefined,
      publishImmediately,
      includeGlobalCss: isMd ? false : includeGlobalCss,
      cssMode: isMd ? 'none' : (includeGlobalCss ? 'global' : 'none'),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="chapter-modal-card"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#181d28] p-6 shadow-2xl border border-zinc-200 dark:border-[#262c36] text-[#050505] dark:text-[#f8fafc] animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#e4e6eb] dark:border-[#262c36]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#e7f3ff] dark:bg-[#1e293b] text-[#1877f2] dark:text-[#60a5fa] border border-[#d8e4f8] dark:border-[#283548]">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#050505] dark:text-[#f8fafc]">Add Chapter</h2>
              <div className="flex items-center gap-1 text-xs text-[#65676b] dark:text-[#94a3b8] mt-0.5">
                <BookOpen className="w-3 h-3 text-[#1877f2] dark:text-[#60a5fa]" />
                <span>Inside topic: <strong className="text-[#050505] dark:text-[#f8fafc]">{topic.name}</strong></span>
              </div>
            </div>
          </div>
          <button
            id="chapter-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="chapter-title-input"
              className="block text-xs font-semibold text-[#050505] dark:text-[#f8fafc] mb-1.5"
            >
              Chapter Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              id="chapter-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Caching Strategies"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#ccd0d5] dark:border-[#334155] bg-white dark:bg-[#0e1217] text-xs font-medium text-[#050505] dark:text-[#f8fafc] focus:outline-hidden focus:border-[#1877f2] dark:focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1877f2]/20 transition-all placeholder:text-[#8a8d91] dark:placeholder:text-[#64748b]"
            />
          </div>

          <div>
            <label
              htmlFor="chapter-tags-input"
              className="block text-xs font-semibold text-[#050505] dark:text-[#f8fafc] mb-1.5"
            >
              Tags (comma separated)
            </label>
            <div className="relative">
              <input
                id="chapter-tags-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. Architecture, Redis, Scale"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ccd0d5] dark:border-[#334155] bg-white dark:bg-[#0e1217] text-xs font-medium text-[#050505] dark:text-[#f8fafc] focus:outline-hidden focus:border-[#1877f2] dark:focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1877f2]/20 transition-all placeholder:text-[#8a8d91] dark:placeholder:text-[#64748b]"
              />
              <Tag className="w-3.5 h-3.5 text-[#65676b] dark:text-[#94a3b8] absolute left-3 top-3" />
            </div>
          </div>

          {/* Optional .md or .html File Import */}
          <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-[#13171f] border border-[#e4e6eb] dark:border-[#262c36]">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.html,.htm,text/markdown,text/html,text/plain"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-[#050505] dark:text-[#f8fafc]">Import note file (optional)</span>
                <span className="block text-[11px] text-[#65676b] dark:text-[#94a3b8] truncate">
                  {attachedFileName ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      Loaded {attachedFileName}
                    </span>
                  ) : (
                    'Supports .md (Markdown + Mermaid) or .html'
                  )}
                </span>
              </div>
              <UploadButton
                id="chapter-file-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                isUploading={isUploading}
                progress={uploadProgress}
                label={attachedFileName ? 'Change' : 'Choose File'}
                uploadingLabel="Uploading"
                doneLabel="Loaded!"
                size="sm"
                className="shrink-0"
              />
            </div>
          </div>

          {/* Upload & Publish Directly to Users Checkbox */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#e7f3ff]/70 dark:bg-[#1e293b]/70 border border-[#d8e4f8] dark:border-[#283548]">
            <input
              id="chapter-publish-immediately-checkbox"
              type="checkbox"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-[#1877f2] focus:ring-[#1877f2] cursor-pointer"
            />
            <label
              htmlFor="chapter-publish-immediately-checkbox"
              className="text-xs font-semibold text-[#050505] dark:text-[#f8fafc] cursor-pointer select-none"
            >
              Upload & publish to all users immediately
              <span className="block text-[11px] font-normal text-[#65676b] dark:text-[#94a3b8] mt-0.5">
                Saved on the server and immediately visible in reader mode to all visitors.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e4e6eb] dark:border-[#262c36]">
            <button
              id="chapter-modal-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#65676b] dark:text-[#94a3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="chapter-modal-submit-btn"
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1877f2] dark:bg-[#2563eb] hover:bg-[#166fe5] dark:hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {publishImmediately ? 'Create & Publish' : 'Create Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
