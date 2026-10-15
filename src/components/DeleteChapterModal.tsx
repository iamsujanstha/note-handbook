import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, FileText, Tag, Loader2 } from 'lucide-react';
import { Chapter } from '../types';

interface DeleteChapterModalProps {
  isOpen: boolean;
  chapter: Chapter | null;
  topicName?: string;
  onClose: () => void;
  onConfirm: (chapterId: string) => Promise<void> | void;
}

export const DeleteChapterModal: React.FC<DeleteChapterModalProps> = ({
  isOpen,
  chapter,
  topicName,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsDeleting(false);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isDeleting) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !chapter) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(chapter.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="delete-chapter-modal-card"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#181d28] p-6 shadow-2xl border border-zinc-200 dark:border-[#262c36] text-[#050505] dark:text-[#f8fafc] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#e4e6eb] dark:border-[#262c36]">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#050505] dark:text-[#f8fafc]">Delete Chapter</h2>
              <p className="text-xs text-[#65676b] dark:text-[#94a3b8]">Permanent action • Cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors cursor-pointer disabled:opacity-50"
            title="Cancel and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chapter Details Summary Card */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#13171f] border border-[#e4e6eb] dark:border-[#262c36] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#050505] dark:text-[#f8fafc] truncate">
              <FileText className="w-4 h-4 text-[#1877f2] dark:text-[#60a5fa] shrink-0" />
              <span className="truncate">{chapter.title}</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                chapter.status === 'published'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {chapter.status === 'published' ? 'Published Note' : 'Draft Note'}
            </span>
          </div>

          {topicName && (
            <div className="text-[11px] text-[#65676b] dark:text-[#94a3b8] flex items-center gap-1">
              <span>Parent Topic:</span>
              <span className="font-semibold text-[#050505] dark:text-[#f8fafc]">{topicName}</span>
            </div>
          )}

          {chapter.tags && chapter.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-1">
              {chapter.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#1877f2] dark:text-[#60a5fa] bg-[#e7f3ff] dark:bg-[#1e293b] px-2 py-0.5 rounded-md border border-transparent dark:border-[#283548]"
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Warning text */}
        <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Are you sure you want to delete this chapter? All notes, markdown diagrams, draft revisions, and bookmarks for this chapter will be permanently deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#65676b] dark:text-[#94a3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] hover:text-[#050505] dark:hover:text-[#f8fafc] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            id="confirm-delete-chapter-btn"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-xs shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Chapter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
