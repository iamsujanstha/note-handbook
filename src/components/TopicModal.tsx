import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Tag } from 'lucide-react';
import { Topic } from '../types';

interface TopicModalProps {
  isOpen: boolean;
  topicToEdit?: Topic | null;
  onClose: () => void;
  onSave: (topicData: { name: string; description?: string }) => void;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  isOpen,
  topicToEdit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (topicToEdit) {
      setName(topicToEdit.name);
      setDescription(topicToEdit.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [topicToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        id="topic-modal-card"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#181d28] p-6 shadow-2xl border border-zinc-200 dark:border-[#262c36] text-[#050505] dark:text-[#f8fafc] animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#e4e6eb] dark:border-[#262c36]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#e7f3ff] dark:bg-[#1e293b] text-[#1877f2] dark:text-[#60a5fa] border border-[#d8e4f8] dark:border-[#283548]">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#050505] dark:text-[#f8fafc]">
                {topicToEdit ? 'Edit Topic' : 'Create New Topic'}
              </h2>
              <p className="text-xs text-[#65676b] dark:text-[#94a3b8]">
                Topics group related chapters and notes
              </p>
            </div>
          </div>
          <button
            id="topic-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#050505] dark:text-[#f8fafc] mb-1">
              Topic Name *
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-[#1877f2] dark:text-[#60a5fa] absolute left-3 top-3" />
              <input
                id="topic-name-input"
                type="text"
                required
                placeholder="e.g. Distributed Systems, Frontend, AI Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#ced0d4] dark:border-[#334155] bg-[#f0f2f5] dark:bg-[#0e1217] text-[#050505] dark:text-[#f8fafc] focus:outline-hidden focus:bg-white dark:focus:bg-[#0e1217] focus:border-[#1877f2] dark:focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1877f2]/20 transition-all placeholder:text-[#8a8d91] dark:placeholder:text-[#64748b]"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#050505] dark:text-[#f8fafc] mb-1">
              Short Description (Optional)
            </label>
            <textarea
              id="topic-desc-input"
              rows={2}
              placeholder="Brief summary of what this topic covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#ced0d4] dark:border-[#334155] bg-[#f0f2f5] dark:bg-[#0e1217] text-[#050505] dark:text-[#f8fafc] focus:outline-hidden focus:bg-white dark:focus:bg-[#0e1217] focus:border-[#1877f2] dark:focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1877f2]/20 resize-none transition-all placeholder:text-[#8a8d91] dark:placeholder:text-[#64748b]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              id="topic-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#65676b] dark:text-[#94a3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="topic-save-btn"
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1877f2] dark:bg-[#2563eb] hover:bg-[#166fe5] dark:hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              {topicToEdit ? 'Save Changes' : 'Create Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
