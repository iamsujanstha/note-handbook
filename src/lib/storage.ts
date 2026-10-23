import { Topic, Chapter, ReadingPosition } from '../types';
import { DEFAULT_NOTEBOOK_THEME_CSS } from './defaultTheme';

const TOPICS_STORAGE_KEY = 'pnotes_topics_v2';
const CHAPTERS_STORAGE_KEY = 'pnotes_chapters_v2';
const USER_STORAGE_KEY = 'pnotes_user_v1';
const ADMIN_TOKEN_STORAGE_KEY = 'pnotes_admin_token_v1';
const ADMIN_PASSKEY_STORAGE_KEY = 'pnotes_admin_passkey_v1';
const READING_POSITIONS_KEY = 'pnotes_reading_positions_v1';
const LAST_ACTIVE_CHAPTER_KEY = 'pnotes_last_active_chapter_v1';

export const INITIAL_TOPICS: Topic[] = [
  {
    id: 'topic-system-design',
    name: 'System Design',
    slug: 'system-design',
    description: 'High-availability architectures, caching, scalability, and distributed systems.',
    icon: 'Layers',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-frontend',
    name: 'Frontend Engineering',
    slug: 'frontend',
    description: 'DOM rendering, browser internals, state management, and modern Web APIs.',
    icon: 'Layout',
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-backend',
    name: 'Backend Architecture',
    slug: 'backend',
    description: 'Database indexing, concurrency, ACID guarantees, and API patterns.',
    icon: 'Server',
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-devops',
    name: 'Cloud & DevOps',
    slug: 'devops',
    description: 'Container orchestration, CI/CD pipelines, observability, and zero-downtime deployments.',
    icon: 'Cpu',
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Only parent topics are kept as default. No default chapters - admin adds chapters/titles inside.
export const INITIAL_CHAPTERS: Chapter[] = [];

// Legacy mock and default seeded chapter IDs to purge from storage so users start with a clean state
const DEFAULT_MOCK_CHAPTER_IDS = new Set([
  'chap-sys-caching',
  'chap-fe-rendering',
  'chap-be-postgres-indexing',
  'chap-sys-hashing',
  'chap-fe-web-workers',
  'chap-be-sagas',
  'chap-sys-photo-sharing',
  'chap-sys-distributed-caching',
  'chap-sys-db-sharding',
  'chap-fe-browser-rendering',
  'chap-fe-react-architecture',
  'chap-fe-web-security',
  'chap-be-postgres-internals',
  'chap-be-concurrency-locks',
  'chap-devops-kubernetes',
  // Superseded / obsolete system design test chapters
  'chap-1790522577359',
  'chap-1790585244206',
  'chap-1790585715770',
  'chap-1790586060649',
]);

export function getStoredTopics(): Topic[] {
  try {
    const raw = localStorage.getItem(TOPICS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(INITIAL_TOPICS));
      return INITIAL_TOPICS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TOPICS;
  }
}

export function saveStoredTopics(topics: Topic[]): void {
  try {
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
  } catch (err) {
    console.error('Failed to save topics to localStorage', err);
  }
}

// Bounded in-memory LRU cache for full chapter bodies to avoid keeping hundreds of multi-MB strings in React state or localStorage
interface CachedChapterBody {
  draftHtml: string;
  publishedHtml: string;
  customCss?: string;
  updatedAt?: string;
  byteSize: number;
}

const MAX_LRU_CHAPTERS = 24;
const MAX_LRU_TOTAL_BYTES = 28 * 1024 * 1024; // ~28MB max in-memory cache
const MAX_LOCALSTORAGE_INLINE_CHAPTER_CHARS = 48 * 1024; // 48KB per inline chapter in localStorage
const MAX_LOCALSTORAGE_TOTAL_CHARS = 1400 * 1024; // 1.4MB total budget for chapters in localStorage
const MAX_STORED_READING_POSITIONS = 200;

const chapterBodyLru = new Map<string, CachedChapterBody>();
let currentLruBytes = 0;

export function cacheChapterContent(chapter: Partial<Chapter> & { id: string }): void {
  if (!chapter || !chapter.id) return;
  const draft = chapter.draftHtml || chapter.publishedHtml || '';
  const pub = chapter.publishedHtml || draft;
  if (!draft && !pub && !chapter.customCss) return;

  const existing = chapterBodyLru.get(chapter.id);
  if (existing) {
    currentLruBytes = Math.max(0, currentLruBytes - existing.byteSize);
    chapterBodyLru.delete(chapter.id);
  }

  // Share string reference when draft and published are identical
  const canonicalPub = pub === draft ? draft : pub;
  const byteSize = draft.length + (canonicalPub === draft ? 0 : canonicalPub.length) + (chapter.customCss?.length || 0);

  chapterBodyLru.set(chapter.id, {
    draftHtml: draft,
    publishedHtml: canonicalPub,
    customCss: chapter.customCss,
    updatedAt: chapter.updatedAt,
    byteSize,
  });
  currentLruBytes += byteSize;

  // Evict oldest entries if over count or byte budget
  while (
    chapterBodyLru.size > MAX_LRU_CHAPTERS ||
    (currentLruBytes > MAX_LRU_TOTAL_BYTES && chapterBodyLru.size > 2)
  ) {
    const oldestKey = chapterBodyLru.keys().next().value;
    if (!oldestKey) break;
    const evicted = chapterBodyLru.get(oldestKey);
    if (evicted) {
      currentLruBytes = Math.max(0, currentLruBytes - evicted.byteSize);
    }
    chapterBodyLru.delete(oldestKey);
  }
}

export function getCachedChapterContent(chapterId: string): CachedChapterBody | null {
  const entry = chapterBodyLru.get(chapterId);
  if (!entry) return null;
  // Touch LRU order
  chapterBodyLru.delete(chapterId);
  chapterBodyLru.set(chapterId, entry);
  return entry;
}

export function evictCachedChapterContent(chapterId: string): void {
  const existing = chapterBodyLru.get(chapterId);
  if (existing) {
    currentLruBytes = Math.max(0, currentLruBytes - existing.byteSize);
    chapterBodyLru.delete(chapterId);
  }
}

/**
 * Hydrates a list of chapter summaries with any bodies currently held in the in-memory LRU cache,
 * while keeping non-active chapters lightweight if they exceed memory limits.
 */
export function hydrateChaptersFromCache(
  chapters: Chapter[],
  activeChapterId?: string | null
): Chapter[] {
  return chapters.map((c) => {
    const canonical = c.draftHtml || c.publishedHtml || '';
    if (canonical) {
      cacheChapterContent(c);
      // Keep full body on the chapter object if it's the active chapter or small (<32KB)
      if (c.id === activeChapterId || canonical.length <= 32768) {
        return {
          ...c,
          draftHtml: canonical,
          publishedHtml: canonical,
          hasContent: true,
          contentSize: canonical.length,
          isContentLoaded: true,
        };
      }
      // Strip multi-MB body from React list state for inactive chapters (it stays safely in LRU cache & server DB)
      return {
        ...c,
        draftHtml: '',
        publishedHtml: '',
        customCss: undefined,
        hasContent: true,
        contentSize: canonical.length,
        isContentLoaded: false,
      };
    }

    const cached = chapterBodyLru.get(c.id);
    if (cached && (c.id === activeChapterId || cached.byteSize <= 32768)) {
      return {
        ...c,
        draftHtml: cached.draftHtml,
        publishedHtml: cached.publishedHtml || cached.draftHtml,
        customCss: c.customCss || cached.customCss,
        hasContent: true,
        contentSize: cached.draftHtml.length,
        isContentLoaded: true,
      };
    }

    return {
      ...c,
      hasContent: c.hasContent ?? Boolean(cached || canonical),
      contentSize: c.contentSize ?? cached?.draftHtml.length ?? 0,
      isContentLoaded: Boolean(canonical),
    };
  });
}

export function getStoredChapters(): Chapter[] {
  try {
    const raw = localStorage.getItem(CHAPTERS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_CHAPTERS;
    }
    const parsed: Chapter[] = JSON.parse(raw);
    const filtered = parsed.filter((c) => !DEFAULT_MOCK_CHAPTER_IDS.has(c.id));
    if (filtered.length !== parsed.length) {
      try {
        localStorage.setItem(CHAPTERS_STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
    }
    return filtered
      .map((c) => {
        const canonical = c.draftHtml || c.publishedHtml || '';
        if (canonical) {
          cacheChapterContent(c);
        }
        const cached = !canonical ? chapterBodyLru.get(c.id) : null;
        const effectiveContent = canonical || cached?.draftHtml || '';
        return {
          ...c,
          draftHtml: effectiveContent,
          publishedHtml: effectiveContent,
          hasContent: c.hasContent ?? effectiveContent.length > 0,
          contentSize: c.contentSize ?? effectiveContent.length,
          isContentLoaded: effectiveContent.length > 0,
        };
      });
  } catch {
    return INITIAL_CHAPTERS;
  }
}

export function saveStoredChapters(chapters: Chapter[]): void {
  try {
    const activeId = getStoredLastActiveChapterId();
    let totalInlineChars = 0;

    // 1. Update in-memory LRU cache for any chapters with loaded content
    for (const c of chapters) {
      if (c.draftHtml || c.publishedHtml) {
        cacheChapterContent(c);
      }
    }

    // 2. Build quota-safe representation for localStorage (metadata always preserved; inline HTML capped to budget)
    const compact = chapters.map((c) => {
      const canonical = c.draftHtml || c.publishedHtml || '';
      const isPriority = c.id === activeId;
      const canInline =
        canonical.length > 0 &&
        (canonical.length <= MAX_LOCALSTORAGE_INLINE_CHAPTER_CHARS ||
          (isPriority && canonical.length <= 256 * 1024)) &&
        totalInlineChars + canonical.length <= MAX_LOCALSTORAGE_TOTAL_CHARS;

      if (canInline) {
        totalInlineChars += canonical.length;
      }

      return {
        id: c.id,
        topicId: c.topicId,
        title: c.title,
        slug: c.slug,
        draftHtml: canInline ? canonical : '',
        publishedHtml: '',
        status: c.status,
        tags: c.tags || [],
        order: c.order,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastPublishedAt: c.lastPublishedAt,
        includeGlobalCss: c.includeGlobalCss,
        cssMode: c.cssMode,
        customCssFileName: c.customCssFileName,
        hasContent: c.hasContent ?? canonical.length > 0,
        contentSize: c.contentSize ?? canonical.length,
        excerpt: c.excerpt,
      };
    });

    localStorage.setItem(CHAPTERS_STORAGE_KEY, JSON.stringify(compact));
  } catch (err) {
    // Fallback: store pure metadata without any HTML bodies so QuotaExceededError is completely impossible
    try {
      const metadataOnly = chapters.map((c) => ({
        id: c.id,
        topicId: c.topicId,
        title: c.title,
        slug: c.slug,
        draftHtml: '',
        publishedHtml: '',
        status: c.status,
        tags: c.tags || [],
        order: c.order,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastPublishedAt: c.lastPublishedAt,
        includeGlobalCss: c.includeGlobalCss,
        cssMode: c.cssMode,
        customCssFileName: c.customCssFileName,
        hasContent: c.hasContent ?? Boolean(c.draftHtml || c.publishedHtml),
        contentSize: c.contentSize ?? (c.draftHtml || c.publishedHtml || '').length,
      }));
      localStorage.setItem(CHAPTERS_STORAGE_KEY, JSON.stringify(metadataOnly));
    } catch {
      try {
        localStorage.removeItem(CHAPTERS_STORAGE_KEY);
      } catch {}
    }
  }
}

export function getStoredUser(): { email: string; name: string } | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: { email: string; name: string } | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save user session', err);
  }
}

export function getStoredAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save admin token', err);
  }
}

export function getStoredAdminPasskey(): string | null {
  try {
    return localStorage.getItem(ADMIN_PASSKEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminPasskey(passkey: string | null): void {
  try {
    if (passkey) {
      localStorage.setItem(ADMIN_PASSKEY_STORAGE_KEY, passkey);
    } else {
      localStorage.removeItem(ADMIN_PASSKEY_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save admin passkey', err);
  }
}

export function getStoredReadingPositions(): Record<string, ReadingPosition> {
  try {
    const raw = localStorage.getItem(READING_POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredReadingPosition(chapterId: string, scrollTop: number, progress: number): void {
  try {
    const positions = getStoredReadingPositions();
    positions[chapterId] = {
      chapterId,
      scrollTop: Math.round(scrollTop),
      progress: Math.min(100, Math.max(0, Math.round(progress))),
      updatedAt: new Date().toISOString(),
    };
    const keys = Object.keys(positions);
    if (keys.length > MAX_STORED_READING_POSITIONS) {
      const sorted = keys.sort(
        (a, b) =>
          new Date(positions[b].updatedAt || 0).getTime() -
          new Date(positions[a].updatedAt || 0).getTime()
      );
      for (let i = MAX_STORED_READING_POSITIONS; i < sorted.length; i++) {
        delete positions[sorted[i]];
      }
    }
    localStorage.setItem(READING_POSITIONS_KEY, JSON.stringify(positions));
  } catch (err) {
    console.error('Failed to save reading position', err);
  }
}

export function clearStoredReadingPosition(chapterId: string): void {
  try {
    const positions = getStoredReadingPositions();
    delete positions[chapterId];
    localStorage.setItem(READING_POSITIONS_KEY, JSON.stringify(positions));
  } catch (err) {
    console.error('Failed to clear reading position', err);
  }
}

export function getStoredLastActiveChapterId(): string | null {
  try {
    const id = localStorage.getItem(LAST_ACTIVE_CHAPTER_KEY);
    if (id && DEFAULT_MOCK_CHAPTER_IDS.has(id)) {
      localStorage.removeItem(LAST_ACTIVE_CHAPTER_KEY);
      return null;
    }
    return id;
  } catch {
    return null;
  }
}

export function setStoredLastActiveChapterId(chapterId: string): void {
  try {
    localStorage.setItem(LAST_ACTIVE_CHAPTER_KEY, chapterId);
  } catch (err) {
    console.error('Failed to save last active chapter ID', err);
  }
}

const GLOBAL_THEME_CSS_KEY = 'pnotes_global_theme_css_v1';
const CUSTOM_CSS_FILES_KEY = 'pnotes_custom_css_files_v1';

export function getStoredGlobalCss(): string {
  try {
    const raw = localStorage.getItem(GLOBAL_THEME_CSS_KEY) || '';
    if (!raw || raw.includes('/* test upload */') || raw.trim() === 'body { background: #050608; }') {
      return DEFAULT_NOTEBOOK_THEME_CSS;
    }
    return raw;
  } catch {
    return DEFAULT_NOTEBOOK_THEME_CSS;
  }
}

export function saveStoredGlobalCss(css: string): void {
  try {
    localStorage.setItem(GLOBAL_THEME_CSS_KEY, css);
  } catch (err) {
    console.error('Failed to save global theme CSS', err);
  }
}

export function getStoredCustomCssFiles(): Record<string, { filename: string; cssContent: string; size: number; updatedAt: string; isGlobal?: boolean }> {
  try {
    const raw = localStorage.getItem(CUSTOM_CSS_FILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredCustomCssFile(file: { filename: string; cssContent: string; size: number; updatedAt: string; isGlobal?: boolean }): void {
  try {
    const files = getStoredCustomCssFiles();
    files[file.filename] = file;
    localStorage.setItem(CUSTOM_CSS_FILES_KEY, JSON.stringify(files));
  } catch (err) {
    console.error('Failed to save custom css file to localStorage', err);
  }
}

export function deleteStoredCustomCssFile(filename: string): void {
  try {
    const files = getStoredCustomCssFiles();
    delete files[filename];
    localStorage.setItem(CUSTOM_CSS_FILES_KEY, JSON.stringify(files));
  } catch (err) {
    console.error('Failed to delete custom css file from localStorage', err);
  }
}
