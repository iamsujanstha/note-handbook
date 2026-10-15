import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Topic, Chapter, ViewMode, User, ReadingPosition, TableOfContentItem, ThemeMode } from './types';
import {
  getStoredTopics,
  saveStoredTopics,
  getStoredChapters,
  saveStoredChapters,
  getStoredUser,
  setStoredUser,
  getStoredReadingPositions,
  getStoredLastActiveChapterId,
  setStoredLastActiveChapterId,
  getStoredAdminToken,
  setStoredAdminToken,
  setStoredAdminPasskey,
  clearStoredReadingPosition,
} from './lib/storage';
import {
  fetchTopics,
  saveTopicsApi,
  deleteTopicApi,
  fetchChapters,
  createChapterApi,
  updateChapterApi,
  deleteChapterApi,
  reorderChaptersApi,
  uploadHtmlChapterApi,
  verifyAdminTokenApi,
  syncToLiveSiteApi,
  publishAllChaptersApi,
  syncChaptersApi,
} from './lib/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HtmlRenderer } from './components/HtmlRenderer';
import { HtmlEditor } from './components/HtmlEditor';
import { AuthModal } from './components/AuthModal';
import { TopicModal } from './components/TopicModal';
import { DeleteChapterModal } from './components/DeleteChapterModal';
import { BrowserHtmlFrame, BrowserHtmlFrameRef } from './components/BrowserHtmlFrame';
import { FloatingTableOfContents } from './components/FloatingTableOfContents';
import { CssUploadDecisionModal } from './components/CssUploadDecisionModal';
import { isMarkdownContent, extractTitle, convertMarkdownToHtml, parseMarkdownHeadings } from './lib/markdown';
import { saveStoredGlobalCss, saveStoredCustomCssFile } from './lib/storage';
import { uploadGlobalCssApi, uploadCssFileApi } from './lib/api';
import {
  readFileWithProgress,
  formatBytes,
  FileUploadProgressState,
  initialUploadProgressState,
} from './lib/uploadProgress';
import {
  BookOpen,
  Plus,
  UploadCloud,
  FilePlus,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Edit,
  ArrowRight,
  ShieldAlert,
  Lock,
  ShieldCheck,
  Eye,
  X,
  Palette,
  FileCode,
  Upload,
  Loader2,
} from 'lucide-react';

export default function App() {
  // State: Data
  const [topics, setTopics] = useState<Topic[]>(() => getStoredTopics());
  const [chapters, setChapters] = useState<Chapter[]>(() => getStoredChapters());
  const [user, setUser] = useState<User | null>(() => getStoredUser() as User | null);

  // State: Navigation & Mode
  const [readingPositions, setReadingPositions] = useState<Record<string, ReadingPosition>>(() =>
    getStoredReadingPositions()
  );
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => {
    const initialChaps = getStoredChapters();
    const lastActiveId = getStoredLastActiveChapterId();

    // Check if previous session left off on a valid chapter
    if (lastActiveId) {
      const match = initialChaps.find((c) => c.id === lastActiveId);
      if (match) return match.id;
    }

    return initialChaps.length > 0 ? initialChaps[0].id : null;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('reader');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewDraftOverride, setPreviewDraftOverride] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Dynamic Floating Table of Contents state for Preview Mode overlay
  const previewFrameRef = useRef<BrowserHtmlFrameRef>(null);
  const [previewToc, setPreviewToc] = useState<TableOfContentItem[]>([]);
  const [previewActiveHeadingId, setPreviewActiveHeadingId] = useState<string>('');
  const [previewReadProgress, setPreviewReadProgress] = useState(0);
  const [previewIsTocOpen, setPreviewIsTocOpen] = useState(false);
  const [previewIsTocPinned, setPreviewIsTocPinned] = useState(() => {
    try {
      return localStorage.getItem('toc_pinned') === 'true';
    } catch {
      return false;
    }
  });

  // State: Theme (Dark mode is default like AI Studio editor)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark'; // Dark mode is default
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_theme', theme);
    } catch {}
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // State: Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState<Topic | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cssUploadModalData, setCssUploadModalData] = useState<{
    isOpen: boolean;
    filename: string;
    cssContent: string;
    fileSize: number;
  } | null>(null);

  // Decision handlers for uploaded CSS file
  const handleApplyUploadedCssToCurrentNote = async () => {
    if (!cssUploadModalData) return;
    const currentChap = chapters.find((c) => c.id === activeChapterId);
    if (activeChapterId && currentChap) {
      const updates: Partial<Chapter> = {
        cssMode: 'custom',
        customCss: cssUploadModalData.cssContent,
        customCssFileName: cssUploadModalData.filename,
        includeGlobalCss: false,
        updatedAt: new Date().toISOString(),
      };
      setChapters((prev) =>
        prev.map((c) => (c.id === activeChapterId ? { ...c, ...updates } : c))
      );
      await updateChapterApi(activeChapterId, updates);
      showToast(`Applied "${cssUploadModalData.filename}" to "${currentChap.title}" only!`);
    } else {
      showToast(`Saved "${cssUploadModalData.filename}" permanently in Stylesheet Library.`);
    }
    setCssUploadModalData(null);
  };

  const handleApplyUploadedCssToAllNotes = async () => {
    if (!cssUploadModalData) return;
    try {
      await uploadGlobalCssApi(cssUploadModalData.cssContent, 'notes-theme.css');
      saveStoredGlobalCss(cssUploadModalData.cssContent);
      window.dispatchEvent(
        new CustomEvent('NOTES_GLOBAL_CSS_UPDATED', {
          detail: { css: cssUploadModalData.cssContent },
        })
      );
      showToast(`Applied "${cssUploadModalData.filename}" as Global Theme for all notes!`);
    } catch {
      showToast('Failed to set global CSS theme');
    }
    setCssUploadModalData(null);
  };

  const handleKeepUploadedCssInLibrary = () => {
    if (!cssUploadModalData) return;
    showToast(`Saved "${cssUploadModalData.filename}" permanently in Stylesheet Library.`);
    setCssUploadModalData(null);
  };

  // Quick upload file input ref
  const quickUploadInputRef = useRef<HTMLInputElement>(null);
  const [targetTopicIdForUpload, setTargetTopicIdForUpload] = useState<string | null>(null);
  const [quickUploadState, setQuickUploadState] = useState<FileUploadProgressState>(initialUploadProgressState);

  // Verify existing admin session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = getStoredAdminToken();
    if (storedToken) {
      verifyAdminTokenApi(storedToken).then((res) => {
        if (res.valid && res.user) {
          setUser(res.user);
          setStoredUser(res.user);
        } else {
          setUser(null);
          setStoredUser(null);
          setStoredAdminToken(null);
        }
      });
    } else if (user) {
      setUser(null);
      setStoredUser(null);
    }
  }, []);

  // Initial server sync: Load uploaded/published topics & chapters so all users see current content
  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchTopics(), fetchChapters()])
      .then(([serverTopics, serverChapters]) => {
        if (!isMounted) return;
        if (serverTopics && serverTopics.length > 0) {
          setTopics(serverTopics);
        }
        if (Array.isArray(serverChapters)) {
          const normalizedServerChapters = serverChapters.map((c) => {
            const draft = c.draftHtml !== undefined ? c.draftHtml : (c.publishedHtml || '');
            const published = c.publishedHtml !== undefined ? c.publishedHtml : (c.draftHtml || draft);
            return {
              ...c,
              draftHtml: draft,
              publishedHtml: published,
            };
          });

          setChapters((prev) => {
            if (normalizedServerChapters.length === 0) {
              if (prev.length > 0) {
                // Server has no chapters yet, but local state has chapters: push them to server!
                for (const c of prev) {
                  createChapterApi(c).catch(() => {});
                }
              }
              return prev;
            }

            // Server database is the authoritative single source of truth across all devices!
            saveStoredChapters(normalizedServerChapters);
            return normalizedServerChapters;
          });

          setActiveChapterId((currentId) => {
            if (currentId && normalizedServerChapters.some((c) => c.id === currentId)) {
              return currentId;
            }
            return normalizedServerChapters.length > 0 ? normalizedServerChapters[0].id : null;
          });
        }
      })
      .catch((err) => {
        console.warn('Initial server sync fallback to local storage:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync to LocalStorage on changes
  useEffect(() => {
    saveStoredTopics(topics);
  }, [topics]);

  useEffect(() => {
    saveStoredChapters(chapters);
  }, [chapters]);

  useEffect(() => {
    if (activeChapterId) {
      setStoredLastActiveChapterId(activeChapterId);
    }
  }, [activeChapterId]);

  const handleRefreshBookmarks = () => {
    setReadingPositions(getStoredReadingPositions());
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAuthWithMessage = (msg?: string) => {
    setAuthPromptMessage(msg || 'Sign in to access more chapters and full knowledge base topics.');
    setIsAuthOpen(true);
  };

  // Find currently active chapter
  const activeChapter = useMemo(() => {
    return chapters.find((c) => c.id === activeChapterId) || null;
  }, [chapters, activeChapterId]);

  // Find topic for active chapter
  const activeTopic = useMemo(() => {
    if (!activeChapter) return null;
    return topics.find((t) => t.id === activeChapter.topicId) || null;
  }, [topics, activeChapter]);

  // Mode toggle handler with Auth enforcement for Editor mode
  const handleToggleViewMode = (newMode: ViewMode) => {
    if (newMode === 'editor' && !user) {
      handleOpenAuthWithMessage('Sign in to access the CMS Editor and publish notes.');
      return;
    }
    setViewMode(newMode);
  };

  // Auth success
  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setStoredUser(authenticatedUser);
    setViewMode('editor');
    setAuthPromptMessage(null);
    showToast(`Welcome, ${authenticatedUser.name}! CMS Publishing mode activated.`);
  };

  // Logout - reset to first topic for security
  const handleLogout = () => {
    setUser(null);
    setStoredUser(null);
    setStoredAdminToken(null);
    setViewMode('reader');
    if (topics.length > 0) {
      const firstTopicChap = chapters.find((c) => c.topicId === topics[0].id);
      if (firstTopicChap) {
        setActiveChapterId(firstTopicChap.id);
      }
    }
    showToast('Signed out. Switched to Preview mode.');
  };

  // Topics CRUD
  const handleSaveTopic = async ({ name, description }: { name: string; description?: string }) => {
    let updatedTopics: Topic[];
    if (topicToEdit) {
      updatedTopics = topics.map((t) =>
        t.id === topicToEdit.id
          ? {
              ...t,
              name,
              description,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      setTopics(updatedTopics);
      showToast(`Topic "${name}" updated.`);
    } else {
      const newTopic: Topic = {
        id: `topic-${Date.now()}`,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        order: topics.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedTopics = [...topics, newTopic];
      setTopics(updatedTopics);
      showToast(`Topic "${name}" created.`);
    }
    setTopicToEdit(null);
    await saveTopicsApi(updatedTopics);
  };

  const handleDeleteTopic = async (topicId: string) => {
    const topic = topics.find((t) => t.id === topicId);
    if (!window.confirm(`Are you sure you want to delete topic "${topic?.name}" and all its chapters?`)) {
      return;
    }
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    setChapters((prev) => prev.filter((c) => c.topicId !== topicId));
    if (activeTopic?.id === topicId) {
      setActiveChapterId(null);
    }
    showToast(`Topic and associated chapters removed.`);
    await deleteTopicApi(topicId);
  };

  // Chapter Title Rename handler
  const handleRenameChapter = async (chapterId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const now = new Date().toISOString();
    let latestList: Chapter[] = [];
    setChapters((prev) => {
      const updated = prev.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              title: trimmed,
              slug,
              updatedAt: now,
            }
          : c
      );
      latestList = updated;
      saveStoredChapters(updated);
      return updated;
    });
    showToast(`Renamed chapter to "${trimmed}".`);
    const updateResult = await updateChapterApi(chapterId, {
      title: trimmed,
      slug,
      updatedAt: now,
    });
    if (!updateResult && latestList.length > 0) {
      await syncChaptersApi(latestList, topics);
    }
    const freshAfterRename = await fetchChapters();
    if (Array.isArray(freshAfterRename) && freshAfterRename.length > 0) {
      setChapters(freshAfterRename);
      saveStoredChapters(freshAfterRename);
    }
  };

  // Chapter Creation: Directly creates chapter with default name without showing popup
  const handleCreateChapter = async (topicId: string) => {
    if (!user) {
      handleOpenAuthWithMessage('Sign in as Admin to add chapters.');
      return;
    }
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    // Find next sequential default title for chapters in this topic (e.g. Chapter 1, Chapter 2, etc.)
    const topicChapters = chapters.filter((c) => c.topicId === topicId);
    let nextNum = topicChapters.length + 1;
    let defaultTitle = `Chapter ${nextNum}`;
    while (topicChapters.some((c) => c.title.trim().toLowerCase() === defaultTitle.toLowerCase())) {
      nextNum++;
      defaultTitle = `Chapter ${nextNum}`;
    }

    const newChapterId = `chap-${Date.now()}`;
    const slug = defaultTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const now = new Date().toISOString();
    const defaultDraft = `# ${defaultTitle}\n\nStart writing notes for ${defaultTitle}...`;

    const newChapter: Chapter = {
      id: newChapterId,
      topicId,
      title: defaultTitle,
      slug,
      draftHtml: defaultDraft,
      publishedHtml: defaultDraft,
      status: 'published',
      tags: [topic.name],
      order: topicChapters.length + 1,
      createdAt: now,
      updatedAt: now,
      lastPublishedAt: now,
      includeGlobalCss: false,
      cssMode: 'none',
    };

    setChapters((prev) => {
      const updated = [...prev, newChapter];
      saveStoredChapters(updated);
      return updated;
    });
    setActiveChapterId(newChapterId);
    setViewMode('editor');
    showToast(`Added "${defaultTitle}". Edit and click "Publish" to save.`);

    await createChapterApi(newChapter);
    const freshAfterCreate = await fetchChapters();
    if (Array.isArray(freshAfterCreate) && freshAfterCreate.length > 0) {
      setChapters(freshAfterCreate);
      saveStoredChapters(freshAfterCreate);
    }

    // Focus and select the chapter title input in the editor so user can immediately edit it
    setTimeout(() => {
      const titleInput = document.getElementById('chapter-title-input') as HTMLInputElement | null;
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 80);
  };

  // Chapter Deletion: Open modal confirmation dialog
  const handleRequestDeleteChapter = (chapterId: string) => {
    if (!user) {
      handleOpenAuthWithMessage('Sign in as Admin to delete chapters.');
      return;
    }
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) {
      setChapterToDelete(chapter);
    }
  };

  const handleConfirmDeleteChapter = async (chapterId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    const chapterTitle = chapter?.title || 'Chapter';

    // Clear saved reading bookmark for this chapter
    clearStoredReadingPosition(chapterId);

    // Remove from local state
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));

    if (activeChapterId === chapterId) {
      const remaining = chapters.filter((c) => c.id !== chapterId);
      // Prefer next chapter in the same topic
      const sameTopicRemaining = remaining.filter((c) => c.topicId === chapter?.topicId);
      if (sameTopicRemaining.length > 0) {
        setActiveChapterId(sameTopicRemaining[0].id);
      } else if (remaining.length > 0) {
        setActiveChapterId(remaining[0].id);
      } else {
        setActiveChapterId(null);
      }
    }

    showToast(`Chapter "${chapterTitle}" deleted.`);
    setChapterToDelete(null);

    // Persist deletion on server and refresh authoritative state from DB
    await deleteChapterApi(chapterId);
    const freshAfterDelete = await fetchChapters();
    if (Array.isArray(freshAfterDelete)) {
      setChapters(freshAfterDelete);
      saveStoredChapters(freshAfterDelete);
    }
  };

  // Drag and drop reordering of chapters within a topic
  const handleReorderChapters = async (
    topicId: string,
    sourceChapterId: string,
    targetChapterId: string,
    position: 'above' | 'below'
  ) => {
    if (sourceChapterId === targetChapterId) return;

    let finalOrderedIds: string[] = [];

    setChapters((prev) => {
      // Extract all chapters for the topic, sorted by current order
      const topicChapters = prev
        .filter((c) => c.topicId === topicId)
        .sort((a, b) => a.order - b.order);

      const sourceIndex = topicChapters.findIndex((c) => c.id === sourceChapterId);
      const targetIndex = topicChapters.findIndex((c) => c.id === targetChapterId);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      // Extract moved chapter
      const [movedChapter] = topicChapters.splice(sourceIndex, 1);

      // Determine new insertion index in the remaining array
      const currentTargetIndex = topicChapters.findIndex((c) => c.id === targetChapterId);
      const insertIndex = position === 'below' ? currentTargetIndex + 1 : currentTargetIndex;

      topicChapters.splice(insertIndex, 0, movedChapter);

      // Re-assign 1-based order numbers
      const updatedTopicChapters = topicChapters.map((c, index) => ({
        ...c,
        order: index + 1,
        updatedAt: new Date().toISOString(),
      }));

      finalOrderedIds = updatedTopicChapters.map((c) => c.id);

      const topicMap = new Map(updatedTopicChapters.map((c) => [c.id, c]));
      return prev.map((c) => (topicMap.has(c.id) ? topicMap.get(c.id)! : c));
    });

    const topic = topics.find((t) => t.id === topicId);
    showToast(`Updated chapter order in "${topic?.name || 'Topic'}".`);
    if (finalOrderedIds.length > 0) {
      await reorderChaptersApi(topicId, finalOrderedIds);
      const freshAfterReorder = await fetchChapters();
      if (Array.isArray(freshAfterReorder) && freshAfterReorder.length > 0) {
        setChapters(freshAfterReorder);
        saveStoredChapters(freshAfterReorder);
      }
    }
  };

  // Manual one-step chapter reordering (Move Up / Down)
  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    let finalOrderedIds: string[] = [];

    setChapters((prev) => {
      const topicChapters = prev
        .filter((c) => c.topicId === chapter.topicId)
        .sort((a, b) => a.order - b.order);

      const currentIndex = topicChapters.findIndex((c) => c.id === chapterId);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= topicChapters.length) return prev;

      // Swap elements
      const temp = topicChapters[currentIndex];
      topicChapters[currentIndex] = topicChapters[targetIndex];
      topicChapters[targetIndex] = temp;

      // Re-assign sequential order numbers
      const updatedTopicChapters = topicChapters.map((c, index) => ({
        ...c,
        order: index + 1,
        updatedAt: new Date().toISOString(),
      }));

      finalOrderedIds = updatedTopicChapters.map((c) => c.id);

      const topicMap = new Map(updatedTopicChapters.map((c) => [c.id, c]));
      return prev.map((c) => (topicMap.has(c.id) ? topicMap.get(c.id)! : c));
    });

    showToast(`Moved "${chapter.title}" ${direction}.`);
    if (finalOrderedIds.length > 0) {
      await reorderChaptersApi(chapter.topicId, finalOrderedIds);
      const freshAfterMove = await fetchChapters();
      if (Array.isArray(freshAfterMove) && freshAfterMove.length > 0) {
        setChapters(freshAfterMove);
        saveStoredChapters(freshAfterMove);
      }
    }
  };

  // Save Draft (Local state preservation — only stored in database when user clicks Publish!)
  const handleSaveDraft = async (
    draftHtml: string,
    title: string,
    tags: string[],
    includeGlobalCss?: boolean,
    cssMode?: 'global' | 'none' | 'custom',
    customCss?: string,
    customCssFileName?: string
  ) => {
    if (!activeChapterId) return;
    const now = new Date().toISOString();
    const updates: Partial<Chapter> = {
      draftHtml,
      title,
      tags,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      updatedAt: now,
      status: 'draft',
      ...(includeGlobalCss !== undefined ? { includeGlobalCss } : {}),
      ...(cssMode !== undefined ? { cssMode } : {}),
      ...(customCss !== undefined ? { customCss } : {}),
      ...(customCssFileName !== undefined ? { customCssFileName } : {}),
    };
    setChapters((prev) => {
      const updated = prev.map((c) =>
        c.id === activeChapterId
          ? {
              ...c,
              ...updates,
            }
          : c
      );
      saveStoredChapters(updated);
      return updated;
    });
  };

  // Publish Chapter (Only store in database when user clicks Publish!)
  const handlePublish = async (
    html: string,
    title: string,
    tags: string[],
    rawDraft?: string,
    includeGlobalCss?: boolean,
    cssMode?: 'global' | 'none' | 'custom',
    customCss?: string,
    customCssFileName?: string
  ) => {
    if (!activeChapterId) return;
    const now = new Date().toISOString();
    const currentChapter = chapters.find((c) => c.id === activeChapterId);
    const content = rawDraft || html || currentChapter?.draftHtml || '';

    const updates: Partial<Chapter> = {
      draftHtml: content,
      publishedHtml: html || content,
      title,
      tags,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status: 'published',
      lastPublishedAt: now,
      updatedAt: now,
      ...(includeGlobalCss !== undefined ? { includeGlobalCss } : {}),
      ...(cssMode !== undefined ? { cssMode } : {}),
      ...(customCss !== undefined ? { customCss } : {}),
      ...(customCssFileName !== undefined ? { customCssFileName } : {}),
    };

    let updatedList: Chapter[] = [];
    setChapters((prev) => {
      const list = prev.map((c) =>
        c.id === activeChapterId ? { ...c, ...updates } : c
      );
      updatedList = list;
      saveStoredChapters(list);
      return list;
    });

    try {
      // 1. Upload directly to DB
      const res = await updateChapterApi(activeChapterId, updates);
      if (!res && updatedList.length > 0) {
        await syncChaptersApi(updatedList, topics);
      }

      // 2. Fetch directly from DB so client state is authoritative with zero data loss
      const freshChapters = await fetchChapters();
      if (Array.isArray(freshChapters) && freshChapters.length > 0) {
        setChapters(freshChapters);
        saveStoredChapters(freshChapters);
      }
      showToast(`Published "${title}" live & verified in database!`);
    } catch (err) {
      console.error('Failed to save chapter to DB:', err);
      showToast(`Error saving to database. Retrying backup sync...`);
      await syncChaptersApi(updatedList, topics);
      const freshChapters = await fetchChapters();
      if (Array.isArray(freshChapters) && freshChapters.length > 0) {
        setChapters(freshChapters);
        saveStoredChapters(freshChapters);
      }
    }
  };

  const [isPublishingLive, setIsPublishingLive] = useState(false);

  // Trigger publish from Sidebar button
  const handlePublishToLive = async () => {
    if (!user) {
      handleOpenAuthWithMessage('Sign in as Admin to publish notes live.');
      return;
    }

    setIsPublishingLive(true);

    try {
      // If currently in Editor mode, trigger the editor's publish flow (which gets active text & compiles markdown)
      if (viewMode === 'editor') {
        window.dispatchEvent(new CustomEvent('CMS_TRIGGER_PUBLISH_LIVE'));
        setIsPublishingLive(false);
        return;
      }

      // If active chapter is selected
      if (activeChapter) {
        const now = new Date().toISOString();
        const content = activeChapter.draftHtml || activeChapter.publishedHtml || '';

        const updates: Partial<Chapter> = {
          draftHtml: content,
          publishedHtml: content,
          status: 'published',
          lastPublishedAt: now,
          updatedAt: now,
        };

        setChapters((prev) => {
          const updatedChapters = prev.map((c) =>
            c.id === activeChapter.id ? { ...c, ...updates } : c
          );
          saveStoredChapters(updatedChapters);
          return updatedChapters;
        });

        await updateChapterApi(activeChapter.id, updates);
        const freshChapters = await fetchChapters();
        if (Array.isArray(freshChapters) && freshChapters.length > 0) {
          setChapters(freshChapters);
          saveStoredChapters(freshChapters);
        }
        showToast(`🚀 Published "${activeChapter.title}" live! Verified from database.`);
      } else {
        // Publish and sync all chapters
        const allPublished = chapters.map((c) => {
          const canonical = c.draftHtml || c.publishedHtml || '';
          return {
            ...c,
            draftHtml: canonical,
            publishedHtml: canonical,
            status: 'published' as const,
            lastPublishedAt: c.lastPublishedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        setChapters(allPublished);
        saveStoredChapters(allPublished);
        await publishAllChaptersApi();
        const freshChapters = await fetchChapters();
        if (Array.isArray(freshChapters) && freshChapters.length > 0) {
          setChapters(freshChapters);
          saveStoredChapters(freshChapters);
        }
        showToast('🚀 All notes are published and verified from database!');
      }
    } catch (err) {
      console.error('Error publishing to live:', err);
      showToast('Error publishing note to live');
    } finally {
      setIsPublishingLive(false);
    }
  };

  // Quick HTML File Upload into a Topic
  const handleQuickUploadTrigger = (topicId: string) => {
    setTargetTopicIdForUpload(topicId);
    quickUploadInputRef.current?.click();
  };

  const handleQuickFileUploaded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetTopicIdForUpload) return;

    setQuickUploadState({
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
      const rawText = await readFileWithProgress(
        file,
        (pct, loaded, total) => {
          const displayPct = isCss ? Math.round(pct * 0.45) : Math.round(pct * 0.5);
          setQuickUploadState((prev) => ({
            ...prev,
            progress: displayPct,
            bytesLoaded: loaded,
            bytesTotal: total,
            phase: 'reading',
          }));
        },
        500
      );

      if (!rawText) {
        setQuickUploadState(initialUploadProgressState);
        return;
      }

      // If user uploaded a .css file, fix permanently to server disk & local cache, and let user decide!
      if (isCss) {
        setQuickUploadState((prev) => ({ ...prev, phase: 'uploading' }));
        try {
          await uploadCssFileApi(rawText, file.name, false, (pct, loaded, total) => {
            const displayPct = 45 + Math.round(pct * 0.55);
            setQuickUploadState((prev) => ({
              ...prev,
              progress: Math.min(displayPct, 99),
              bytesLoaded: loaded,
              bytesTotal: total,
              phase: 'uploading',
            }));
          });

          saveStoredCustomCssFile({
            filename: file.name,
            cssContent: rawText,
            size: file.size || rawText.length,
            updatedAt: new Date().toISOString(),
            isGlobal: false,
          });

          setQuickUploadState((prev) => ({ ...prev, progress: 100, phase: 'done' }));
          setTimeout(() => setQuickUploadState(initialUploadProgressState), 1200);

          setCssUploadModalData({
            isOpen: true,
            filename: file.name,
            cssContent: rawText,
            fileSize: file.size || rawText.length,
          });
        } catch {
          setQuickUploadState(initialUploadProgressState);
          showToast('Failed to upload CSS file');
        }
        return;
      }

      const isMd =
        file.name.endsWith('.md') ||
        file.name.endsWith('.markdown') ||
        isMarkdownContent(rawText);

      let docTitle = '';
      let contentToSaveAsHtml = rawText;
      let draftContent = rawText;

      if (isMd) {
        docTitle = extractTitle(rawText, file.name);
        try {
          contentToSaveAsHtml = await convertMarkdownToHtml(rawText, { title: docTitle });
        } catch (err) {
          console.warn('Error converting uploaded markdown to HTML:', err);
          contentToSaveAsHtml = rawText;
        }
        draftContent = rawText; // keep raw markdown for clean editing
      } else {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawText, 'text/html');
        docTitle =
          doc.querySelector('title')?.innerText ||
          doc.querySelector('h1')?.innerText ||
          file.name.replace(/\.[^/.]+$/, '');

        // If it's a full HTML document authored by the user, preserve entire HTML intact
        const isFullDoc =
          /<!doctype\s+html/i.test(rawText) ||
          (/<html[\s>]/i.test(rawText) && /<body[\s>]/i.test(rawText));

        if (isFullDoc) {
          contentToSaveAsHtml = rawText;
        } else if (doc.head && doc.body) {
          // Preserve both style tags AND stylesheet link tags (such as notes-theme.css)
          const headElements = Array.from(
            doc.head.querySelectorAll('style, link[rel="stylesheet"]')
          )
            .map((s) => s.outerHTML)
            .join('\n');
          contentToSaveAsHtml = headElements
            ? `${headElements}\n${doc.body.innerHTML}`
            : doc.body.innerHTML;
        } else if (doc.body) {
          contentToSaveAsHtml = doc.body.innerHTML;
        }
        draftContent = rawText;
      }

      const topic = topics.find((t) => t.id === targetTopicIdForUpload);
      const newChapterId = `chap-${Date.now()}`;
      const now = new Date().toISOString();
      const newChapter: Chapter = {
        id: newChapterId,
        topicId: targetTopicIdForUpload,
        title: docTitle,
        slug: docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        draftHtml: draftContent,
        publishedHtml: contentToSaveAsHtml, // auto-publish on direct upload
        status: 'published',
        tags: [topic?.name || (isMd ? 'Markdown' : 'Imported')],
        order: chapters.filter((c) => c.topicId === targetTopicIdForUpload).length + 1,
        createdAt: now,
        updatedAt: now,
        lastPublishedAt: now,
        includeGlobalCss: !isMd,
        cssMode: isMd ? 'none' : 'global',
      };

      setChapters((prev) => [...prev, newChapter]);
      setActiveChapterId(newChapterId);
      setViewMode('reader');

      setQuickUploadState((prev) => ({ ...prev, phase: 'uploading' }));

      const uploadRes = await uploadHtmlChapterApi(
        targetTopicIdForUpload,
        docTitle,
        contentToSaveAsHtml,
        [topic?.name || (isMd ? 'Markdown' : 'Imported')],
        (pct, loaded, total) => {
          const displayPct = 50 + Math.round(pct * 0.5);
          setQuickUploadState((prev) => ({
            ...prev,
            progress: Math.min(displayPct, 99),
            bytesLoaded: loaded,
            bytesTotal: total,
            phase: 'uploading',
          }));
        },
        {
          id: newChapterId,
          includeGlobalCss: !isMd,
          cssMode: isMd ? 'none' : 'global',
        }
      );

      if (uploadRes) {
        // Always fetch authoritative chapters directly from DB to verify persistence and prevent data loss
        const freshChapters = await fetchChapters();
        if (Array.isArray(freshChapters) && freshChapters.length > 0) {
          setChapters(freshChapters);
          saveStoredChapters(freshChapters);
        } else {
          setChapters((prev) => {
            const updated = prev.map((c) => (c.id === newChapterId ? uploadRes : c));
            saveStoredChapters(updated);
            return updated;
          });
        }
      }

      setQuickUploadState((prev) => ({ ...prev, progress: 100, phase: 'done' }));
      showToast(`Uploaded and published "${docTitle}" (${isMd ? 'Markdown with Mermaid' : 'HTML'}) live!`);
      setTimeout(() => setQuickUploadState(initialUploadProgressState), 1500);
    } catch (err: any) {
      setQuickUploadState(initialUploadProgressState);
      showToast(err?.message || 'Failed to upload note');
    } finally {
      // Reset input
      if (quickUploadInputRef.current) {
        quickUploadInputRef.current.value = '';
      }
    }
  };

  // Export / Backup as JSON
  const handleExportJson = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      topics,
      chapters,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Full notes backup exported.');
  };

  // Import JSON backup
  const handleImportJson = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.topics) && Array.isArray(data.chapters)) {
        setTopics(data.topics);
        setChapters(data.chapters);
        if (data.chapters.length > 0) {
          setActiveChapterId(data.chapters[0].id);
        }
        showToast(`Imported ${data.topics.length} topics and ${data.chapters.length} chapters!`);
      } else {
        alert('Invalid backup format. Expected { topics: [], chapters: [] }');
      }
    } catch (err) {
      alert('Failed to parse backup JSON.');
    }
  };

  // Export current chapter as standalone .html file
  const handleExportCurrentHtml = () => {
    if (!activeChapter) return;
    const content = activeChapter.draftHtml || activeChapter.publishedHtml || '';
    const shouldIncludeTheme = activeChapter.includeGlobalCss !== false;
    const themeStylesheetLink = shouldIncludeTheme
      ? '  <link rel="stylesheet" href="notes-theme.css">\n'
      : '';
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeChapter.title}</title>
${themeStylesheetLink}  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 840px; margin: 40px auto; padding: 0 24px; line-height: 1.7; color: #1c1e21; background-color: #ffffff; }
    h1, h2, h3, h4 { font-weight: 700; color: #050505; }
    h1 { border-bottom: 2px solid #e4e6eb; padding-bottom: 12px; }
    pre { background: #18191a; color: #e4e6eb; padding: 16px; border-radius: 10px; overflow-x: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #f0f2f5; color: #1877f2; padding: 2px 6px; border-radius: 6px; }
    pre code { background: none; color: inherit; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ced0d4; padding: 10px 14px; text-align: left; }
    th { background: #f0f2f5; color: #050505; }
    .note-callout { padding: 14px 18px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #1877f2; background: #e7f3ff; color: #1c1e21; }
  </style>
</head>
<body>
  <h1>${activeChapter.title}</h1>
  ${content}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeChapter.slug || 'chapter-note'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${activeChapter.title}.html"`);
  };

  const handleOpenPreview = (draftOverride?: string) => {
    if (typeof draftOverride === 'string') {
      setPreviewDraftOverride(draftOverride);
    } else {
      setPreviewDraftOverride(null);
    }
    setIsPreviewMode(true);
  };

  const handleClosePreview = () => {
    setIsPreviewMode(false);
    setPreviewDraftOverride(null);
  };

  // Keyboard shortcut: Escape exits preview mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreviewMode) {
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewMode]);

  // Keep preview TOC synchronized with active chapter Markdown / HTML
  useEffect(() => {
    if (activeChapter) {
      const content = previewDraftOverride || activeChapter.draftHtml || activeChapter.publishedHtml || '';
      const parsed = parseMarkdownHeadings(content);
      setPreviewToc(parsed);
    }
  }, [activeChapter?.id, activeChapter?.draftHtml, activeChapter?.publishedHtml, previewDraftOverride, isPreviewMode]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-[#0e1217] text-[#050505] dark:text-[#f0f3f6]">
      {/* Hidden File Input for Topic Quick Upload (.md, .html, .css, etc.) */}
      <input
        ref={quickUploadInputRef}
        type="file"
        accept=".md,.markdown,.html,.htm,.css,text/markdown,text/html,text/css,text/plain"
        className="hidden"
        onChange={handleQuickFileUploaded}
      />

      {/* Main App Header - Completely Hidden when in Preview Mode */}
      {!isPreviewMode && (
        <Header
          viewMode={viewMode}
          user={user}
          activeChapter={activeChapter}
          onToggleViewMode={handleToggleViewMode}
          onOpenAuth={() =>
            handleOpenAuthWithMessage('Sign in to unlock all topics, chapters, and export tools.')
          }
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onExportCurrentHtml={handleExportCurrentHtml}
          isPreviewMode={isPreviewMode}
          onTogglePreviewMode={() => (isPreviewMode ? handleClosePreview() : handleOpenPreview())}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1877f2] text-white text-xs font-semibold shadow-xl shadow-blue-500/25 border border-blue-400 animate-in fade-in duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* When Preview Mode is Active: All Header and Sidebar are completely hidden, ONLY displaying content! */}
      {isPreviewMode && activeChapter ? (() => {
        const rawContent = previewDraftOverride || activeChapter.draftHtml || activeChapter.publishedHtml || '';

        return (
          <div
            id="pure-content-preview-container"
            className="flex-1 w-full h-full overflow-hidden flex flex-col relative select-text animate-in fade-in duration-150 bg-white text-[#1c1e21]"
          >
            {/* Minimal Floating Top Bar */}
            <div className="absolute top-3.5 right-4 z-50 flex items-center justify-end pointer-events-none">
              {/* Exit Preview Button: subtle, non-distracting, aligned with light background */}
              <div className="pointer-events-auto">
                <button
                  id="exit-preview-btn"
                  onClick={handleClosePreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md transition-all cursor-pointer shadow-2xs bg-white/85 hover:bg-white text-[#65676b] hover:text-[#050505] border border-[#e4e6eb] hover:border-[#ced0d4]"
                  title="Exit preview and return to normal view (Esc)"
                >
                  <X className="w-3.5 h-3.5 opacity-70" />
                  <span>Exit Preview</span>
                  <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.2 rounded font-mono bg-black/5 text-[#65676b]">
                    Esc
                  </kbd>
                </button>
              </div>
            </div>

            {/* Dynamic Floating Table of Contents for Preview */}
            <FloatingTableOfContents
              headings={previewToc}
              activeHeadingId={previewActiveHeadingId}
              onSelectHeading={(id) => {
                previewFrameRef.current?.scrollToId(id);
                if (!previewIsTocPinned) setPreviewIsTocOpen(false);
              }}
              onScrollToTop={() => previewFrameRef.current?.scrollToTop()}
              isDocDark={false}
              readProgress={previewReadProgress}
              documentTitle={activeChapter.title}
              isOpen={previewIsTocOpen}
              onToggleOpen={() => setPreviewIsTocOpen(!previewIsTocOpen)}
              isPinned={previewIsTocPinned}
              onTogglePinned={() => {
                setPreviewIsTocPinned((prev) => {
                  const next = !prev;
                  try {
                    localStorage.setItem('toc_pinned', String(next));
                  } catch {}
                  return next;
                });
              }}
            />

            {/* 100% Pure HTML Content (rendered directly in native isolated iframe) */}
            <div
              className={`flex-1 w-full h-full overflow-hidden transition-all duration-200 ${
                previewIsTocPinned && previewIsTocOpen ? 'xl:pr-96' : ''
              }`}
            >
              <BrowserHtmlFrame
                ref={previewFrameRef}
                key={`${activeChapter.id}-${activeChapter.includeGlobalCss !== false}-${activeChapter.cssMode}-${activeChapter.customCssFileName}`}
                htmlContent={rawContent}
                title={activeChapter.title}
                chapterId={activeChapter.id}
                includeGlobalCss={activeChapter.includeGlobalCss !== false}
                cssMode={activeChapter.cssMode}
                customCss={activeChapter.customCss}
                customCssFileName={activeChapter.customCssFileName}
                onScroll={(_top, _height, _client, progress) => {
                  setPreviewReadProgress(progress);
                }}
                onActiveHeadingChange={(id) => {
                  setPreviewActiveHeadingId(id);
                }}
                onHeadingsExtracted={(h) => {
                  if (h && h.length > 0) {
                    setPreviewToc(h);
                  }
                }}
                className="w-full h-full"
              />
            </div>
          </div>
        );
      })() : (
        /* Workspace Body: Sidebar + Main Content Stage (Visible when NOT in preview mode) */
        <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Drawer */}
        <div
          className={`transition-all duration-300 ease-in-out z-30 h-full overflow-hidden shrink-0 ${
            sidebarOpen
              ? 'w-72 sm:w-80 translate-x-0'
              : 'w-0 -translate-x-full pointer-events-none'
          } absolute lg:relative shadow-md lg:shadow-none bg-[#f0f2f5]`}
        >
          <div className="w-72 sm:w-80 h-full">
            <Sidebar
              topics={topics}
              chapters={chapters}
              activeChapterId={activeChapterId}
              viewMode={viewMode}
              user={user}
              readingPositions={readingPositions}
              onSelectChapter={(id) => {
                setActiveChapterId(id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              onCreateTopic={() => {
                if (!user) {
                  handleOpenAuthWithMessage('Sign in to create topics and publish notes.');
                  return;
                }
                setTopicToEdit(null);
                setIsTopicModalOpen(true);
              }}
              onEditTopic={(topic) => {
                if (!user) {
                  handleOpenAuthWithMessage('Sign in to edit topics.');
                  return;
                }
                setTopicToEdit(topic);
                setIsTopicModalOpen(true);
              }}
              onDeleteTopic={(topicId) => {
                if (!user) {
                  handleOpenAuthWithMessage('Sign in to manage topics.');
                  return;
                }
                handleDeleteTopic(topicId);
              }}
              onCreateChapter={(topicId) => {
                if (!user) {
                  handleOpenAuthWithMessage('Sign in to create chapters.');
                  return;
                }
                handleCreateChapter(topicId);
              }}
              onDeleteChapter={(chapterId) => {
                handleRequestDeleteChapter(chapterId);
              }}
              onRenameChapter={handleRenameChapter}
              onReorderChapters={handleReorderChapters}
              onMoveChapter={handleMoveChapter}
              onQuickUpload={(topicId) => {
                if (!user) {
                  handleOpenAuthWithMessage('Sign in to upload HTML notes.');
                  return;
                }
                handleQuickUploadTrigger(topicId);
              }}
              onRequireAuth={handleOpenAuthWithMessage}
              onCloseSidebar={() => setSidebarOpen(false)}
              quickUploadState={quickUploadState}
              targetTopicIdForUpload={targetTopicIdForUpload}
            />
          </div>
        </div>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/30 z-20 backdrop-blur-2xs"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Stage: File content stays clean light background */}
        <main
          id="reader-main-scroll-container"
          className={`flex-1 h-full overflow-y-auto flex flex-col relative ${
            viewMode === 'editor' ? 'bg-white dark:bg-[#0e1217]' : 'bg-white'
          } transition-colors`}
        >
          {activeChapter ? (
            viewMode === 'editor' ? (
              <HtmlEditor
                key={activeChapter.id}
                chapter={activeChapter}
                topicName={activeTopic?.name}
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
                onCancel={() => setViewMode('reader')}
                onDeleteChapter={handleRequestDeleteChapter}
                onTogglePreviewMode={(draft) => handleOpenPreview(draft)}
              />
            ) : (
              <HtmlRenderer
                key={`${activeChapter.id}-${activeChapter.includeGlobalCss !== false}-${activeChapter.cssMode}-${activeChapter.customCssFileName}`}
                user={user}
                chapterId={activeChapter.id}
                title={activeChapter.title}
                htmlContent={activeChapter.draftHtml || activeChapter.publishedHtml || ''}
                topicName={activeTopic?.name}
                tags={activeChapter.tags}
                lastPublishedAt={activeChapter.lastPublishedAt}
                isDraftPreview={activeChapter.status === 'draft'}
                includeGlobalCss={activeChapter.includeGlobalCss !== false}
                cssMode={activeChapter.cssMode}
                customCss={activeChapter.customCss}
                customCssFileName={activeChapter.customCssFileName}
                onToggleGlobalCss={async (include) => {
                  const newMode = include ? 'global' : 'none';
                  setChapters((prev) =>
                    prev.map((c) =>
                      c.id === activeChapter.id
                        ? { ...c, includeGlobalCss: include, cssMode: newMode }
                        : c
                    )
                  );
                  await updateChapterApi(activeChapter.id, {
                    includeGlobalCss: include,
                    cssMode: newMode,
                  });
                  showToast(
                    include
                      ? 'Applied Global Theme CSS to note'
                      : 'Switched to raw unstyled HTML (Theme CSS excluded)'
                  );
                }}
                onChangeCssMode={async (mode) => {
                  setChapters((prev) =>
                    prev.map((c) =>
                      c.id === activeChapter.id
                        ? {
                            ...c,
                            cssMode: mode,
                            includeGlobalCss: mode === 'global',
                          }
                        : c
                    )
                  );
                  await updateChapterApi(activeChapter.id, {
                    cssMode: mode,
                    includeGlobalCss: mode === 'global',
                  });
                  showToast(
                    mode === 'custom'
                      ? `Applied custom CSS (${activeChapter.customCssFileName || 'custom.css'}) to this note`
                      : mode === 'global'
                      ? 'Applied Global Theme CSS'
                      : 'Switched to raw unstyled HTML'
                  );
                }}
                onBookmarkUpdated={handleRefreshBookmarks}
                onTogglePreviewMode={() => handleOpenPreview()}
                onDeleteChapter={user ? handleRequestDeleteChapter : undefined}
                onPublish={user ? () => handlePublish(
                  activeChapter.draftHtml || activeChapter.publishedHtml || '',
                  activeChapter.title,
                  activeChapter.tags,
                  activeChapter.draftHtml,
                  activeChapter.includeGlobalCss,
                  activeChapter.cssMode,
                  activeChapter.customCss,
                  activeChapter.customCssFileName
                ) : undefined}
              />
            )
          ) : (
            /* Empty State when no chapter is selected or list is empty */
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center max-w-xl mx-auto animate-in fade-in duration-200">
              <div className="relative mb-4">
                <img
                  src="/favicon.svg"
                  alt="Personal Notes CMS"
                  className="w-16 h-16 rounded-2xl shadow-md p-1 bg-white dark:bg-[#181d28] border border-[#e4e6eb] dark:border-[#262c36]"
                />
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[#050505] dark:text-[#f8fafc] tracking-tight">
                {topics.length === 0 ? 'Welcome to Personal Notes' : 'Select or Create Chapter Notes'}
              </h2>

              {/* Quick Knowledge Base Stats */}
              <div className="flex items-center gap-4 my-5 px-4 py-2 rounded-xl bg-[#f0f2f5] dark:bg-[#13171f] border border-[#e4e6eb] dark:border-[#262c36] text-xs">
                <div>
                  <span className="font-bold text-[#050505] dark:text-[#f8fafc]">{topics.length}</span>{' '}
                  <span className="text-[#65676b] dark:text-[#94a3b8]">Parent Topics</span>
                </div>
                <span className="text-[#ced0d4] dark:text-[#475569]">•</span>
                <div>
                  <span className="font-bold text-[#1877f2] dark:text-[#60a5fa]">{chapters.length}</span>{' '}
                  <span className="text-[#65676b] dark:text-[#94a3b8]">Total Chapters</span>
                </div>
                {Object.keys(readingPositions).length > 0 && (
                  <>
                    <span className="text-[#ced0d4] dark:text-[#475569]">•</span>
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{Object.keys(readingPositions).length}</span>{' '}
                      <span className="text-[#65676b] dark:text-[#94a3b8]">Bookmarked</span>
                    </div>
                  </>
                )}
              </div>

              {/* List of parent topics to quickly add a chapter title */}
              {topics.length > 0 && (
                <div className="w-full space-y-2 text-left">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#65676b] dark:text-[#94a3b8] uppercase tracking-wider px-1">
                    <span>Parent Topics</span>
                    <span>Action</span>
                  </div>
                  <div className="space-y-2.5">
                    {topics.map((topic) => {
                      const topicChaptersCount = chapters.filter((c) => c.topicId === topic.id).length;
                      return (
                        <div
                          key={topic.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#13171f] border border-[#e4e6eb] dark:border-[#262c36] shadow-2xs hover:border-[#ccd0d5] dark:hover:border-[#334155] hover:shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="p-2 rounded-lg bg-[#e7f3ff] dark:bg-[#1e293b] text-[#1877f2] dark:text-[#60a5fa] shrink-0 border border-[#d8e4f8] dark:border-[#283548]">
                              <BookOpen className="w-4 h-4" />
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-xs sm:text-sm text-[#050505] dark:text-[#f8fafc] block truncate">
                                {topic.name}
                              </span>
                              <span className="text-[11px] text-[#65676b] dark:text-[#94a3b8]">
                                {topicChaptersCount === 0
                                  ? 'No chapters yet'
                                  : `${topicChaptersCount} chapter${topicChaptersCount > 1 ? 's' : ''}`}
                              </span>
                            </div>
                          </div>
                          <button
                            id={`empty-add-chap-${topic.id}`}
                            onClick={() => handleCreateChapter(topic.id)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1877f2] dark:bg-[#2563eb] hover:bg-[#166fe5] dark:hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Chapter</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
                <button
                  id="empty-state-create-topic-btn"
                  onClick={() => {
                    if (!user) {
                      handleOpenAuthWithMessage('Sign in to add new topics.');
                      return;
                    }
                    setTopicToEdit(null);
                    setIsTopicModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#ced0d4] dark:border-[#262c36] bg-white dark:bg-[#181d28] text-[#050505] dark:text-[#f8fafc] text-xs font-semibold hover:bg-[#f0f2f5] dark:hover:bg-[#232936] transition-colors shadow-2xs cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#1877f2] dark:text-[#60a5fa]" />
                  <span>Add Parent Topic</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        promptMessage={authPromptMessage || undefined}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthPromptMessage(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* Topic Creation / Edit Modal */}
      <TopicModal
        isOpen={isTopicModalOpen}
        topicToEdit={topicToEdit}
        onClose={() => {
          setIsTopicModalOpen(false);
          setTopicToEdit(null);
        }}
        onSave={handleSaveTopic}
      />

      {/* Delete Chapter Confirmation Modal */}
      <DeleteChapterModal
        isOpen={!!chapterToDelete}
        chapter={chapterToDelete}
        topicName={topics.find((t) => t.id === chapterToDelete?.topicId)?.name}
        onClose={() => setChapterToDelete(null)}
        onConfirm={handleConfirmDeleteChapter}
      />


      {/* Decision Modal when user uploads a .css file */}
      {cssUploadModalData && (
        <CssUploadDecisionModal
          isOpen={cssUploadModalData.isOpen}
          filename={cssUploadModalData.filename}
          cssContent={cssUploadModalData.cssContent}
          fileSize={cssUploadModalData.fileSize}
          activeChapterTitle={activeChapter?.title}
          onApplyToCurrentNote={handleApplyUploadedCssToCurrentNote}
          onApplyToAllNotes={handleApplyUploadedCssToAllNotes}
          onKeepInLibrary={handleKeepUploadedCssInLibrary}
          onClose={() => setCssUploadModalData(null)}
        />
      )}
      {/* Real-Time Quick Upload Progress HUD Toast */}
      {quickUploadState.isUploading && (
        <div
          id="global-upload-progress-hud"
          className="fixed bottom-6 right-6 z-50 w-80 p-4 rounded-2xl bg-white border border-[#d8e4f8] shadow-2xl flex flex-col gap-2.5 animate-in slide-in-from-bottom-5 duration-200 select-none pointer-events-auto"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#e7f3ff] text-[#1877f2] flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4 animate-bounce" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#050505] truncate">
                  {quickUploadState.fileName}
                </p>
                <p className="text-[11px] text-[#65676b]">
                  {formatBytes(quickUploadState.bytesLoaded)} of {formatBytes(quickUploadState.bytesTotal)}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#1877f2]">
              {Math.round(quickUploadState.progress)}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#e4e6eb] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1877f2] to-[#2563eb] rounded-full transition-all duration-150"
              style={{ width: `${Math.min(Math.max(quickUploadState.progress, 0), 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10.5px] text-[#65676b]">
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-[#1877f2]" />
              {quickUploadState.phase === 'uploading' ? 'Publishing to live site...' : 'Reading note contents...'}
            </span>
            <span className="font-mono font-semibold text-[#1877f2]">{Math.round(quickUploadState.progress)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
