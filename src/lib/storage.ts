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

export function getStoredChapters(): Chapter[] {
  try {
    const raw = localStorage.getItem(CHAPTERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CHAPTERS_STORAGE_KEY, JSON.stringify(INITIAL_CHAPTERS));
      return INITIAL_CHAPTERS;
    }
    const parsed: Chapter[] = JSON.parse(raw);
    // Filter out old default mock chapters and ensure draftHtml and publishedHtml are strictly synchronized
    let modified = false;
    const userChapters = parsed
      .filter((c) => !DEFAULT_MOCK_CHAPTER_IDS.has(c.id))
      .map((c) => {
        const canonical = c.draftHtml || c.publishedHtml || '';
        if (c.draftHtml !== canonical || c.publishedHtml !== canonical) {
          modified = true;
          return {
            ...c,
            draftHtml: canonical,
            publishedHtml: canonical,
          };
        }
        return c;
      });

    if (modified || userChapters.length !== parsed.length) {
      localStorage.setItem(CHAPTERS_STORAGE_KEY, JSON.stringify(userChapters));
    }
    return userChapters;
  } catch {
    return INITIAL_CHAPTERS;
  }
}

export function saveStoredChapters(chapters: Chapter[]): void {
  try {
    // Ensure all stored chapters have matching draftHtml and publishedHtml
    const synchronized = chapters.map((c) => {
      const canonical = c.draftHtml || c.publishedHtml || '';
      return {
        ...c,
        draftHtml: canonical,
        publishedHtml: canonical,
      };
    });
    localStorage.setItem(CHAPTERS_STORAGE_KEY, JSON.stringify(synchronized));
  } catch (err) {
    console.error('Failed to save chapters to localStorage', err);
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
