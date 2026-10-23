export type ChapterCssMode = 'global' | 'none' | 'custom';
export type ThemeMode = 'dark' | 'light';

export interface Chapter {
  id: string;
  topicId: string;
  title: string;
  slug: string;
  draftHtml: string;
  publishedHtml: string;
  status: 'draft' | 'published';
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  lastPublishedAt?: string;
  includeGlobalCss?: boolean;
  cssMode?: ChapterCssMode;
  customCss?: string;
  customCssFileName?: string;
  hasContent?: boolean;
  contentSize?: number;
  excerpt?: string;
  isContentLoaded?: boolean;
}

export interface CustomCssFileInfo {
  filename: string;
  cssContent: string;
  size: number;
  updatedAt: string;
  isGlobal?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type AuthRole = 'admin' | 'reader';

export interface User {
  email: string;
  name: string;
  role: AuthRole;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export type ViewMode = 'reader' | 'editor';

export interface TableOfContentItem {
  id: string;
  text: string;
  level: number;
}

export interface ReadingPosition {
  chapterId: string;
  scrollTop: number;
  progress: number;
  updatedAt: string;
}

export interface PaginatedChaptersResponse {
  chapters: Chapter[];
  count: number;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  time: string;
  uptimeSeconds: number;
  topicsCount: number;
  chaptersCount: number;
  database: {
    connected: boolean;
    writable: boolean;
    path: string;
    backupAvailable: boolean;
    lastModifiedAt: string | null;
  };
  counts: {
    topics: number;
    chapters: number;
    publishedChapters: number;
    draftChapters: number;
    deletedTopicTombstones: number;
    deletedChapterTombstones: number;
    customCssFiles: number;
    snapshots: number;
  };
  storage: {
    dataFileBytes: number;
    backupFileBytes: number;
    snapshotsTotalBytes: number;
    contentCharactersTotal: number;
    memoryHeapUsedBytes: number;
    memoryRssBytes: number;
  };
  sync: {
    configured: boolean;
    liveOrigin: string;
    mode: 'development' | 'production';
    lastSyncAt: string | null;
    lastSyncStatus: 'idle' | 'ok' | 'error';
  };
}

export interface SyncStatusResponse {
  configured: boolean;
  liveOrigin: string;
  isDev: boolean;
  localTopicsCount: number;
  localChaptersCount: number;
  lastSyncAt?: string | null;
  lastSyncStatus?: 'idle' | 'ok' | 'error';
}

