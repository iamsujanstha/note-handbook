import React, { useState, useEffect, useMemo } from 'react';
import { Topic, Chapter, ViewMode, User, ReadingPosition } from '../types';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Layers,
  Server,
  Layout,
  MoreVertical,
  Trash2,
  Edit2,
  FolderPlus,
  Upload,
  GripVertical,
  Lock,
  Bookmark,
  X,
  PanelLeftClose,
  Loader2,
  Search,
} from 'lucide-react';
import { FileUploadProgressState } from '../lib/uploadProgress';
import { buildSeoHashUrl } from '../lib/seo';

const INITIAL_CHAPTERS_PER_TOPIC = 40;
const CHAPTERS_PAGE_STEP = 50;
const INITIAL_TOPICS_WINDOW = 50;
const TOPICS_PAGE_STEP = 50;

interface SidebarProps {
  topics: Topic[];
  chapters: Chapter[];
  activeChapterId: string | null;
  viewMode: ViewMode;
  user: User | null;
  readingPositions?: Record<string, ReadingPosition>;
  onSelectChapter: (chapterId: string) => void;
  onCreateTopic: () => void;
  onEditTopic: (topic: Topic) => void;
  onDeleteTopic: (topicId: string) => void;
  onCreateChapter: (topicId: string) => void;
  onDeleteChapter: (chapterId: string) => void;
  onRenameChapter?: (chapterId: string, newTitle: string) => void;
  onReorderChapters: (
    topicId: string,
    sourceChapterId: string,
    targetChapterId: string,
    position: 'above' | 'below'
  ) => void;
  onMoveChapter: (chapterId: string, direction: 'up' | 'down') => void;
  onQuickUpload: (topicId: string) => void;
  onRequireAuth: (promptMessage?: string) => void;
  onCloseSidebar?: () => void;
  quickUploadState?: FileUploadProgressState;
  targetTopicIdForUpload?: string | null;
  loadingChapterId?: string | null;
  onPrefetchChapter?: (chapterId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  topics,
  chapters,
  activeChapterId,
  viewMode,
  user,
  readingPositions = {},
  onSelectChapter,
  onCreateTopic,
  onEditTopic,
  onDeleteTopic,
  onCreateChapter,
  onDeleteChapter,
  onRenameChapter,
  onReorderChapters,
  onMoveChapter,
  onQuickUpload,
  onRequireAuth,
  onCloseSidebar,
  quickUploadState,
  targetTopicIdForUpload,
  loadingChapterId,
  onPrefetchChapter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [topicChapterLimits, setTopicChapterLimits] = useState<Record<string, number>>({});
  const [visibleTopicsLimit, setVisibleTopicsLimit] = useState<number>(INITIAL_TOPICS_WINDOW);

  // O(T + C) pre-grouped and sorted chapter map so rendering hundreds/thousands of chapters stays instant
  const chaptersByTopic = useMemo(() => {
    const map = new Map<string, Chapter[]>();
    for (const c of chapters) {
      let list = map.get(c.topicId);
      if (!list) {
        list = [];
        map.set(c.topicId, list);
      }
      list.push(c);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [chapters]);

  // Filtered topics & chapters when searchQuery is active
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredTopics = useMemo(() => {
    if (!normalizedQuery) return topics;
    return topics.filter((t) => {
      if (t.name.toLowerCase().includes(normalizedQuery)) return true;
      const list = chaptersByTopic.get(t.id) || [];
      return list.some(
        (c) =>
          c.title.toLowerCase().includes(normalizedQuery) ||
          (c.slug && c.slug.toLowerCase().includes(normalizedQuery)) ||
          (Array.isArray(c.tags) && c.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)))
      );
    });
  }, [topics, chaptersByTopic, normalizedQuery]);

  // Default expanded: topics with chapters start expanded, empty topics start collapsed
  const [expandedTopicIds, setExpandedTopicIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    topics.forEach((t) => {
      map[t.id] = (chaptersByTopic.get(t.id)?.length || 0) > 0;
    });
    return map;
  });

  // When topics change or user signs in, expand topics that have chapters
  useEffect(() => {
    setExpandedTopicIds((prev) => {
      const map: Record<string, boolean> = { ...prev };
      topics.forEach((t) => {
        if (map[t.id] === undefined) {
          map[t.id] = (chaptersByTopic.get(t.id)?.length || 0) > 0;
        }
      });
      return map;
    });
  }, [user, topics, chaptersByTopic]);

  // When active chapter changes, ensure its parent topic is expanded and its index is within the visible window
  useEffect(() => {
    if (activeChapterId) {
      const activeChap = chapters.find((c) => c.id === activeChapterId);
      if (activeChap) {
        setExpandedTopicIds((prev) => ({
          ...prev,
          [activeChap.topicId]: true,
        }));
        const topicChaps = chaptersByTopic.get(activeChap.topicId) || [];
        const activeIdx = topicChaps.findIndex((c) => c.id === activeChapterId);
        if (activeIdx >= INITIAL_CHAPTERS_PER_TOPIC) {
          setTopicChapterLimits((prev) => {
            const currentLimit = prev[activeChap.topicId] || INITIAL_CHAPTERS_PER_TOPIC;
            if (activeIdx >= currentLimit) {
              return { ...prev, [activeChap.topicId]: activeIdx + 20 };
            }
            return prev;
          });
        }
      }
    }
  }, [activeChapterId, chapters, chaptersByTopic]);

  const [openMenuTopicId, setOpenMenuTopicId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleCommitRename = (chapterId: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed && onRenameChapter) {
      onRenameChapter(chapterId, trimmed);
    }
    setEditingChapterId(null);
  };

  // Drag and drop reordering states
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{
    chapterId: string;
    position: 'above' | 'below';
  } | null>(null);

  const toggleTopic = (topicId: string) => {
    setExpandedTopicIds((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  const getTopicIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Layers':
        return <Layers className="w-4 h-4 text-[#1877f2]" />;
      case 'Server':
        return <Server className="w-4 h-4 text-emerald-600" />;
      case 'Layout':
      default:
        return <Layout className="w-4 h-4 text-[#1877f2]" />;
    }
  };

  return (
    <aside className="w-72 sm:w-80 h-full flex flex-col bg-[#f0f2f5] dark:bg-[#0e1217] border-r border-[#e4e6eb] dark:border-[#262c36] select-none transition-colors">
      {/* Topic Header */}
      <div className="p-3 border-b border-[#e4e6eb] dark:border-[#262c36] flex items-center justify-between bg-white/70 dark:bg-[#13171f]/80 backdrop-blur-xs">
        <span className="text-xs font-bold text-[#050505] dark:text-[#f8fafc] uppercase tracking-wider">
          Topics
        </span>
        <div className="flex items-center gap-1.5">
          {viewMode === 'editor' && user && (
            <button
              id="sidebar-create-topic-btn"
              onClick={onCreateTopic}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#1877f2] dark:text-[#60a5fa] hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b] border border-[#d8e4f8] dark:border-[#283548] bg-white dark:bg-[#181d28] transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Add New Topic"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Topic</span>
            </button>
          )}
          {onCloseSidebar && (
            <button
              id="sidebar-collapse-top-btn"
              onClick={onCloseSidebar}
              className="p-1.5 rounded-xl text-[#65676b] dark:text-[#94a3b8] hover:text-[#1877f2] dark:hover:text-[#60a5fa] hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b] transition-all cursor-pointer shrink-0"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter / Search Bar for large datasets */}
      {(chapters.length > 5 || topics.length > 4 || searchQuery.length > 0) && (
        <div className="px-2.5 pt-2 pb-1 bg-white/40 dark:bg-[#13171f]/40 border-b border-[#e4e6eb]/60 dark:border-[#262c36]/60">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#65676b] dark:text-[#94a3b8] absolute left-2.5 pointer-events-none" />
            <input
              id="sidebar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics & chapters..."
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-white dark:bg-[#181d28] border border-[#e4e6eb] dark:border-[#262c36] text-[#050505] dark:text-[#f8fafc] placeholder-[#8a8d91] dark:placeholder-[#64748b] focus:outline-hidden focus:border-[#1877f2] dark:focus:border-[#3b82f6] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-0.5 text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] cursor-pointer"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Topics & Chapters Tree (with progressive scroll windowing) */}
      <div
        className="flex-1 overflow-y-auto p-2.5 space-y-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (
            filteredTopics.length > visibleTopicsLimit &&
            el.scrollTop + el.clientHeight >= el.scrollHeight - 240
          ) {
            setVisibleTopicsLimit((prev) => Math.min(filteredTopics.length, prev + TOPICS_PAGE_STEP));
          }
        }}
      >
        {filteredTopics.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-[#65676b] dark:text-[#94a3b8]">
              {normalizedQuery ? `No matches for "${searchQuery}"` : 'No topics or chapters found'}
            </p>
          </div>
        ) : (
          filteredTopics.slice(0, visibleTopicsLimit).map((topic) => {
            const allTopicChapters = chaptersByTopic.get(topic.id) || [];
            const topicMatchesDirectly =
              normalizedQuery && topic.name.toLowerCase().includes(normalizedQuery);
            const topicChapters =
              normalizedQuery && !topicMatchesDirectly
                ? allTopicChapters.filter(
                    (c) =>
                      c.title.toLowerCase().includes(normalizedQuery) ||
                      (c.slug && c.slug.toLowerCase().includes(normalizedQuery)) ||
                      (Array.isArray(c.tags) &&
                        c.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)))
                  )
                : allTopicChapters;

            const isExpanded = normalizedQuery
              ? true
              : expandedTopicIds[topic.id] !== false;

            const visibleLimit = topicChapterLimits[topic.id] || INITIAL_CHAPTERS_PER_TOPIC;
            const visibleChapters =
              topicChapters.length > visibleLimit
                ? topicChapters.slice(0, visibleLimit)
                : topicChapters;
            const remainingChaptersCount = Math.max(0, topicChapters.length - visibleChapters.length);

            const handleTopicHeaderClick = () => {
              toggleTopic(topic.id);
            };

            return (
              <div key={topic.id} className="rounded-xl overflow-hidden">
                {/* Topic Header Row */}
                <div
                  id={`sidebar-topic-${topic.id}`}
                  onClick={handleTopicHeaderClick}
                  className="group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-all text-xs font-semibold shadow-2xs hover:shadow-xs hover:bg-white dark:hover:bg-[#181d28] text-[#050505] dark:text-[#f8fafc] bg-white/40 dark:bg-[#181d28]/40"
                >
                  <div className="flex items-center gap-2 flex-1 truncate">
                    <span className="text-[#65676b] dark:text-[#94a3b8] group-hover:text-[#1877f2] dark:group-hover:text-[#60a5fa] transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60">
                      {getTopicIcon(topic.icon)}
                    </div>
                    <span className="truncate font-bold text-xs text-[#050505] dark:text-[#f8fafc]">{topic.name}</span>

                    <span className="text-[10px] font-semibold text-[#1877f2] dark:text-[#60a5fa] px-2 py-0.2 rounded-full bg-[#e7f3ff] dark:bg-[#1e293b] border border-[#d8e4f8] dark:border-[#283548]">
                      {topicChapters.length}
                    </span>

                    {quickUploadState?.isUploading && targetTopicIdForUpload === topic.id && (
                      <span
                        id={`topic-upload-progress-${topic.id}`}
                        className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold text-[#1877f2] dark:text-[#60a5fa] bg-[#e7f3ff] dark:bg-[#1e293b] px-2 py-0.5 rounded-full border border-[#d8e4f8] dark:border-[#283548] animate-pulse"
                        title={`Uploading file: ${Math.round(quickUploadState.progress)}%`}
                      >
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        <span>{Math.round(quickUploadState.progress)}%</span>
                      </span>
                    )}
                  </div>

                  {/* Actions for Topic (Menu for authenticated admin) */}
                  {user ? (
                    <div
                      className="flex items-center gap-0.5 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <button
                          id={`topic-menu-btn-${topic.id}`}
                          onClick={() =>
                            setOpenMenuTopicId(openMenuTopicId === topic.id ? null : topic.id)
                          }
                          className="p-1 rounded-md text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-[#e4e6eb] dark:hover:bg-[#232936] transition-colors cursor-pointer"
                          title="Topic options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openMenuTopicId === topic.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#181d28] border border-[#e4e6eb] dark:border-[#262c36] text-[#050505] dark:text-[#f8fafc] rounded-xl shadow-lg z-20 py-1 text-xs font-normal">
                            <button
                              onClick={() => {
                                onCreateChapter(topic.id);
                                setOpenMenuTopicId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f0f2f5] dark:hover:bg-[#232936] text-[#050505] dark:text-[#f8fafc] cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-[#1877f2] dark:text-[#60a5fa]" />
                              <span>Add Chapter</span>
                            </button>
                            <button
                              disabled={quickUploadState?.isUploading}
                              onClick={() => {
                                onQuickUpload(topic.id);
                                setOpenMenuTopicId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left flex items-center justify-between gap-2 hover:bg-[#f0f2f5] dark:hover:bg-[#232936] text-[#050505] dark:text-[#f8fafc] cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Upload className={`w-3 h-3 text-emerald-600 dark:text-emerald-400 ${quickUploadState?.isUploading && targetTopicIdForUpload === topic.id ? 'animate-bounce' : ''}`} />
                                <span>{quickUploadState?.isUploading && targetTopicIdForUpload === topic.id ? `Uploading (${Math.round(quickUploadState.progress)}%)` : 'Upload File'}</span>
                              </div>
                              {quickUploadState?.isUploading && targetTopicIdForUpload === topic.id && (
                                <span className="text-[10px] font-mono font-bold text-[#1877f2] dark:text-[#60a5fa] tabular-nums">
                                  {Math.round(quickUploadState.progress)}%
                                </span>
                              )}
                            </button>
                            <div className="my-1 border-t border-[#e4e6eb] dark:border-[#262c36]" />
                            <button
                              onClick={() => {
                                onEditTopic(topic);
                                setOpenMenuTopicId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f0f2f5] dark:hover:bg-[#232936] text-[#050505] dark:text-[#f8fafc] cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-[#1877f2] dark:text-[#60a5fa]" />
                              <span>Edit Topic</span>
                            </button>
                            <button
                              onClick={() => {
                                onDeleteTopic(topic.id);
                                setOpenMenuTopicId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Chapters List with prominent left padding to parent */}
                {isExpanded && (
                  <div className="ml-5 pl-3.5 border-l-2 border-[#1877f2]/30 dark:border-[#3b82f6]/30 space-y-1 my-1.5">
                    {topicChapters.length === 0 ? (
                      <div className="py-1 px-1">
                        {user ? (
                          <button
                            id={`add-first-chapter-${topic.id}`}
                            onClick={() => onCreateChapter(topic.id)}
                            className="w-full py-1.5 px-2.5 rounded-lg border border-dashed border-[#b0d5ff] dark:border-[#283548] bg-[#f0f7ff] dark:bg-[#1e293b]/70 hover:bg-[#e1efff] dark:hover:bg-[#1e293b] text-[#1877f2] dark:text-[#60a5fa] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer group"
                          >
                            <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            <span>Add Chapter</span>
                          </button>
                        ) : (
                          <div className="text-[11px] text-[#8a8d91] dark:text-[#64748b] italic py-0.5 px-1">
                            No notes in this topic yet
                          </div>
                        )}
                      </div>
                    ) : (
                      visibleChapters.map((chapter, chapterIndex) => {
                        const isActive = activeChapterId === chapter.id;
                        const isDraggingThis = draggedChapterId === chapter.id;
                        const isDragTarget = dragOverInfo?.chapterId === chapter.id;
                        const dragPosition = dragOverInfo?.position;
                        const isFirstChapterInTopic = chapterIndex === 0;
                        const isChapterLocked = !user && !isFirstChapterInTopic;
                        const handleChapterClick = () => {
                          onSelectChapter(chapter.id);
                        };

                        return (
                          <React.Fragment key={chapter.id}>
                            {/* Visual Drop Target Indicator: Above */}
                            {user && isDragTarget && dragPosition === 'above' && (
                              <div className="py-0.5 flex items-center justify-start pointer-events-none">
                                <div className="h-0.5 w-full bg-[#1877f2] dark:bg-[#3b82f6] rounded-full relative flex items-center shadow-xs">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#1877f2] dark:bg-[#3b82f6] -ml-1 ring-2 ring-white dark:ring-[#0e1217]" />
                                </div>
                              </div>
                            )}

                            <div
                              id={`chapter-item-${chapter.id}`}
                              draggable={!!user}
                              onDragStart={(e) => {
                                if (!user) {
                                  e.preventDefault();
                                  return;
                                }
                                e.dataTransfer.setData('text/plain', chapter.id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedChapterId(chapter.id);
                                setDraggedTopicId(topic.id);
                              }}
                              onDragOver={(e) => {
                                if (
                                  user &&
                                  draggedChapterId &&
                                  draggedChapterId !== chapter.id &&
                                  draggedTopicId === topic.id
                                ) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = 'move';
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const midY = rect.top + rect.height / 2;
                                  const position = e.clientY < midY ? 'above' : 'below';
                                  if (
                                    !dragOverInfo ||
                                    dragOverInfo.chapterId !== chapter.id ||
                                    dragOverInfo.position !== position
                                  ) {
                                    setDragOverInfo({ chapterId: chapter.id, position });
                                  }
                                }
                              }}
                              onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                  if (dragOverInfo?.chapterId === chapter.id) {
                                    setDragOverInfo(null);
                                  }
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (
                                  user &&
                                  draggedChapterId &&
                                  draggedChapterId !== chapter.id &&
                                  draggedTopicId === topic.id
                                ) {
                                  const position = dragOverInfo?.position || 'below';
                                  onReorderChapters(topic.id, draggedChapterId, chapter.id, position);
                                }
                                setDraggedChapterId(null);
                                setDraggedTopicId(null);
                                setDragOverInfo(null);
                              }}
                              onDragEnd={() => {
                                setDraggedChapterId(null);
                                setDraggedTopicId(null);
                                setDragOverInfo(null);
                              }}
                              onMouseEnter={() => {
                                onPrefetchChapter?.(chapter.id);
                              }}
                              onClick={handleChapterClick}
                              className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-all select-none ${
                                isDraggingThis
                                  ? 'opacity-40 border-2 border-dashed border-[#1877f2] bg-blue-50/50 dark:bg-blue-950/50 scale-[0.98]'
                                  : isActive
                                  ? 'bg-[#1877f2] dark:bg-[#2563eb] text-white font-semibold shadow-xs shadow-blue-500/25'
                                  : 'text-[#4b4c4f] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-[#e7f3ff]/70 dark:hover:bg-[#1e293b]/70 font-medium'
                              }`}
                            >
                              <div className={`flex items-center gap-1.5 truncate flex-1 min-w-0 transition-[padding] ${user ? 'group-hover:pr-14' : ''}`}>
                                {/* Grip Drag Handle - only for logged in user */}
                                {user && (
                                  <div
                                    id={`chapter-drag-handle-${chapter.id}`}
                                    className={`p-0.5 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0 ${
                                      isActive
                                        ? 'text-white/70 hover:text-white'
                                        : 'text-[#65676b]/40 dark:text-[#94a3b8]/40 group-hover:text-[#1877f2] dark:group-hover:text-[#60a5fa]'
                                    }`}
                                    title="Drag to reorder chapter"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                )}

                                {/* Locked icon, loading spinner, or file text icon */}
                                {loadingChapterId === chapter.id ? (
                                  <Loader2
                                    className={`w-3.5 h-3.5 shrink-0 animate-spin ${
                                      isActive ? 'text-white' : 'text-[#1877f2] dark:text-[#60a5fa]'
                                    }`}
                                    aria-label="Loading chapter content..."
                                  />
                                ) : isChapterLocked ? (
                                  <div
                                    className={`p-1 rounded-md shrink-0 flex items-center justify-center transition-colors ${
                                      isActive
                                        ? 'bg-white/15 text-white ring-1 ring-white/30'
                                        : 'bg-slate-500/10 text-[#65676b] dark:text-[#94a3b8] ring-1 ring-slate-500/20 group-hover:bg-slate-500/15'
                                    }`}
                                    title="Locked chapter • Sign in with Google Authenticator for full notes"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <FileText
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      isActive
                                        ? 'text-white'
                                        : 'text-[#1877f2] dark:text-[#60a5fa] opacity-80 group-hover:opacity-100'
                                    }`}
                                  />
                                )}

                                {editingChapterId === chapter.id ? (
                                  <input
                                    id={`sidebar-chapter-input-${chapter.id}`}
                                    type="text"
                                    value={editingTitle}
                                    autoFocus
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCommitRename(chapter.id);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setEditingChapterId(null);
                                      }
                                    }}
                                    onBlur={() => handleCommitRename(chapter.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 min-w-0 px-1.5 py-0.5 text-xs font-semibold rounded-md border border-[#1877f2] dark:border-[#3b82f6] bg-white dark:bg-[#0e1217] text-[#050505] dark:text-[#f8fafc] focus:outline-hidden ring-1 ring-[#1877f2]"
                                  />
                                ) : (
                                  <a
                                    href={buildSeoHashUrl(topic, chapter)}
                                    className="truncate no-underline text-inherit"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleChapterClick();
                                    }}
                                    onDoubleClick={(e) => {
                                      if (user) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditingChapterId(chapter.id);
                                        setEditingTitle(chapter.title);
                                      }
                                    }}
                                    title={user ? `${chapter.title} (Double-click to rename)` : chapter.title}
                                  >
                                    {chapter.title}
                                  </a>
                                )}

                                {readingPositions[chapter.id] && readingPositions[chapter.id].progress > 0 && (
                                  <span
                                    id={`chapter-bookmark-badge-${chapter.id}`}
                                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0 ml-1 transition-colors ${
                                      isActive
                                        ? 'bg-blue-700 dark:bg-blue-800 text-white'
                                        : 'bg-[#e7f3ff] dark:bg-[#1e293b] text-[#1877f2] dark:text-[#60a5fa] border border-[#d8e4f8] dark:border-[#283548]'
                                    }`}
                                    title={`Saved reading mark at ${readingPositions[chapter.id].progress}%`}
                                  >
                                    <Bookmark className="w-2.5 h-2.5 fill-current" />
                                    <span>{readingPositions[chapter.id].progress}%</span>
                                  </span>
                                )}
                              </div>

                              {/* Action buttons: Absolute positioned so chapter name is fully visible */}
                              {user && (
                                <div
                                  className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center gap-0.5 rounded-lg px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs pointer-events-none group-hover:pointer-events-auto ${
                                    isActive
                                      ? 'bg-[#1466d3] dark:bg-[#1d4ed8] text-white shadow-sm ring-1 ring-white/20'
                                      : 'bg-white/95 dark:bg-[#181d28]/95 text-[#65676b] dark:text-[#94a3b8] border border-[#e4e6eb] dark:border-[#262c36] shadow-xs backdrop-blur-xs'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Rename button */}
                                  {editingChapterId !== chapter.id && (
                                    <button
                                      id={`chapter-rename-btn-${chapter.id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingChapterId(chapter.id);
                                        setEditingTitle(chapter.title);
                                      }}
                                      className={`p-1 rounded-md transition-all cursor-pointer ${
                                        isActive
                                          ? 'hover:bg-blue-600 text-white'
                                          : 'hover:bg-[#d8e4f8] dark:hover:bg-[#283548] text-[#65676b] dark:text-[#94a3b8] hover:text-[#1877f2] dark:hover:text-[#60a5fa]'
                                      }`}
                                      title={`Rename "${chapter.title}"`}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}

                                  {/* Delete action */}
                                  <button
                                    id={`chapter-delete-btn-${chapter.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteChapter(chapter.id);
                                    }}
                                    className={`p-1 rounded-md transition-all cursor-pointer ${
                                      isActive
                                        ? 'hover:bg-red-600 text-white hover:text-white'
                                        : 'hover:bg-red-50 dark:hover:bg-red-950/40 text-[#65676b] dark:text-[#94a3b8] hover:text-red-600 dark:hover:text-red-400'
                                    }`}
                                    title={`Delete chapter "${chapter.title}"`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Visual Drop Target Indicator: Below */}
                            {user && isDragTarget && dragPosition === 'below' && (
                              <div className="py-0.5 flex items-center justify-start pointer-events-none">
                                <div className="h-0.5 w-full bg-[#1877f2] dark:bg-[#3b82f6] rounded-full relative flex items-center shadow-xs">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#1877f2] dark:bg-[#3b82f6] -ml-1 ring-2 ring-white dark:ring-[#0e1217]" />
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}

                    {/* Lazy-load more chapters button when topic has >40 chapters */}
                    {remainingChaptersCount > 0 && (
                      <div className="pt-1 flex items-center gap-1.5">
                        <button
                          id={`load-more-chapters-${topic.id}`}
                          onClick={() =>
                            setTopicChapterLimits((prev) => ({
                              ...prev,
                              [topic.id]: (prev[topic.id] || INITIAL_CHAPTERS_PER_TOPIC) + CHAPTERS_PAGE_STEP,
                            }))
                          }
                          className="flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold text-[#1877f2] dark:text-[#60a5fa] bg-[#e7f3ff]/60 dark:bg-[#1e293b]/60 hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b] border border-[#d8e4f8] dark:border-[#283548] transition-colors cursor-pointer text-center"
                        >
                          Show {Math.min(CHAPTERS_PAGE_STEP, remainingChaptersCount)} more ({remainingChaptersCount} remaining)
                        </button>
                      </div>
                    )}

                    {/* Quick Add Chapter button at the bottom of the list for Admin */}
                    {user && topicChapters.length > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={() => onCreateChapter(topic.id)}
                          className="w-full py-1.5 px-2 rounded-lg text-[11px] font-medium text-[#65676b] dark:text-[#94a3b8] hover:text-[#1877f2] dark:hover:text-[#60a5fa] hover:bg-[#e7f3ff]/60 dark:hover:bg-[#1e293b]/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Add chapter under this topic"
                        >
                          <Plus className="w-3 h-3 text-[#1877f2] dark:text-[#60a5fa]" />
                          <span>Add chapter</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Load more topics button if >50 topics */}
        {filteredTopics.length > visibleTopicsLimit && (
          <div className="pt-2 pb-4 text-center">
            <button
              id="load-more-topics-btn"
              onClick={() =>
                setVisibleTopicsLimit((prev) => Math.min(filteredTopics.length, prev + TOPICS_PAGE_STEP))
              }
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1877f2] dark:text-[#60a5fa] bg-white dark:bg-[#181d28] border border-[#d8e4f8] dark:border-[#283548] shadow-2xs hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
            >
              Show more topics ({filteredTopics.length - visibleTopicsLimit} remaining)
            </button>
          </div>
        )}
      </div>

    </aside>
  );
};
