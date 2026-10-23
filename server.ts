import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface Chapter {
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
  cssMode?: 'global' | 'none' | 'custom';
  customCss?: string;
  customCssFileName?: string;
  hasContent?: boolean;
  contentSize?: number;
  excerpt?: string;
  isContentLoaded?: boolean;
}

function extractQuickExcerpt(rawContent: string, maxLength = 180): string {
  if (!rawContent) return '';
  // Slice first 2048 chars before stripping tags/markdown to guarantee O(1) CPU and zero regex backtracking on multi-MB HTML
  const headSlice = rawContent.slice(0, 2048);
  const plain = headSlice
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*`_~>\[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trim()}…`;
}

function toChapterSummary(c: Chapter): Chapter {
  const canonical = c.draftHtml || c.publishedHtml || '';
  return {
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
    hasContent: canonical.length > 0,
    contentSize: canonical.length,
    excerpt: c.excerpt || extractQuickExcerpt(canonical),
    isContentLoaded: false,
  };
}

interface CustomCssFileRecord {
  filename: string;
  cssContent: string;
  size: number;
  updatedAt: string;
  isGlobal?: boolean;
}

interface CmsSettings {
  adminPasskey: string;
  secretToken: string;
  adminEmail?: string;
  totpSecret?: string;
}

interface DataStore {
  topics: Topic[];
  chapters: Chapter[];
  settings: CmsSettings;
  themeCss?: string;
  customCssFiles?: Record<string, CustomCssFileRecord>;
  deletedTopicIds?: string[];
  deletedChapterIds?: string[];
}

const DEFAULT_PASSKEY = process.env.ADMIN_PASSKEY || 'notes-admin-2026';
const DEFAULT_TOKEN = 'sec_admin_token_default_2026';
const DEFAULT_ADMIN_EMAIL = 'tlsujank.co@gmail.com';
const DEFAULT_TOTP_SECRET = 'TLSUJANKCOSEC26A';

// RFC 6238 Standard Time-based One-Time Password (TOTP) Helpers
function base32ToBuffer(base32: string): Buffer {
  const clean = base32.replace(/[\s=-]/g, '').toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTotpCode(secretBase32: string, timeStepWindow = 0, stepSeconds = 30): string {
  const key = base32ToBuffer(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / stepSeconds) + timeStepWindow;

  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buf);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (codeInt % 1000000).toString().padStart(6, '0');
}

function verifyTotpCode(token: string, secretBase32: string, window = 2): boolean {
  const cleanToken = String(token).replace(/\s+/g, '').trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false;
  }
  // Check windows -2, -1, 0, +1, +2 (±60 seconds clock drift tolerance)
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const expected = generateTotpCode(secretBase32, errorWindow);
    if (expected === cleanToken) {
      return true;
    }
  }
  return false;
}

function getOtpauthUrl(email: string, secret: string): string {
  const cleanEmail = email.trim();
  const issuer = 'Personal Notes CMS';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(cleanEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// Obsolete chapters from previous testing that have been superseded in production
const OBSOLETE_SUPERSEDED_CHAPTER_IDS = new Set([
  'chap-1790522577359',
  'chap-1790585244206',
  'chap-1790585715770',
  'chap-1790586060649',
]);

const DEFAULT_TOPICS: Topic[] = [
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
];

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'cms_data.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const THEMES_DIR = path.join(DATA_DIR, 'themes');
const NOTES_THEME_FILE = path.join(THEMES_DIR, 'notes-theme.css');
const PUBLIC_THEME_FILE = path.join(process.cwd(), 'public', 'notes-theme.css');

function getActiveThemeCss(): string {
  try {
    if (fs.existsSync(NOTES_THEME_FILE)) {
      return fs.readFileSync(NOTES_THEME_FILE, 'utf-8');
    }
    if (fs.existsSync(PUBLIC_THEME_FILE)) {
      return fs.readFileSync(PUBLIC_THEME_FILE, 'utf-8');
    }
  } catch (err) {
    console.error('Error reading active theme css:', err);
  }
  return `/* Default Notes Theme */
:root { color-scheme: light dark; --bg: #050608; --ink: #f5f2eb; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.65; }`;
}

function saveThemeCss(css: string): void {
  try {
    if (!fs.existsSync(THEMES_DIR)) {
      fs.mkdirSync(THEMES_DIR, { recursive: true });
    }
    fs.writeFileSync(NOTES_THEME_FILE, css, 'utf-8');

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(PUBLIC_THEME_FILE, css, 'utf-8');

    // Also write to dist/ if dist exists (production build)
    const distTheme = path.join(process.cwd(), 'dist', 'notes-theme.css');
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      fs.writeFileSync(distTheme, css, 'utf-8');
    }
  } catch (err) {
    console.error('Failed to save theme CSS files:', err);
  }
}

// Initialize local database storage with secure settings
function initDataStore(): DataStore {
  const defaultSettings: CmsSettings = {
    adminPasskey: DEFAULT_PASSKEY,
    secretToken: DEFAULT_TOKEN,
    adminEmail: DEFAULT_ADMIN_EMAIL,
    totpSecret: DEFAULT_TOTP_SECRET,
  };

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let parsed: any = null;

    // 1. Try reading primary DATA_FILE
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        if (raw && raw.trim().length > 0) {
          parsed = JSON.parse(raw);
        }
      } catch (readErr) {
        console.error('Primary data file parse error, attempting backup recovery:', readErr);
      }
    }

    // 2. If primary failed or missing, try cms_data.backup.json
    if (!parsed) {
      const backupFile = path.join(DATA_DIR, 'cms_data.backup.json');
      if (fs.existsSync(backupFile)) {
        try {
          const backupRaw = fs.readFileSync(backupFile, 'utf-8');
          if (backupRaw && backupRaw.trim().length > 0) {
            parsed = JSON.parse(backupRaw);
            console.log('Successfully recovered data store from cms_data.backup.json!');
          }
        } catch (backupErr) {
          console.error('Backup data file parse error:', backupErr);
        }
      }
    }

    // 3. If still missing, check dist/data/cms_data.json
    if (!parsed) {
      const distDataFile = path.join(process.cwd(), 'dist', 'data', 'cms_data.json');
      if (fs.existsSync(distDataFile)) {
        try {
          const distRaw = fs.readFileSync(distDataFile, 'utf-8');
          if (distRaw && distRaw.trim().length > 0) {
            parsed = JSON.parse(distRaw);
            console.log('Successfully recovered data store from dist/data/cms_data.json!');
          }
        } catch (distErr) {
          console.error('Dist data file parse error:', distErr);
        }
      }
    }

    // If no existing file found at all, initialize clean default store
    if (!parsed) {
      const initialData: DataStore = {
        topics: DEFAULT_TOPICS,
        chapters: [],
        settings: defaultSettings,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }

    const settings: CmsSettings = {
      adminPasskey: parsed.settings?.adminPasskey || DEFAULT_PASSKEY,
      secretToken: parsed.settings?.secretToken || DEFAULT_TOKEN,
      adminEmail: parsed.settings?.adminEmail || DEFAULT_ADMIN_EMAIL,
      totpSecret: parsed.settings?.totpSecret || DEFAULT_TOTP_SECRET,
    };

    const customCssFiles: Record<string, CustomCssFileRecord> = parsed.customCssFiles || {};
    // Ensure all .css files on disk in THEMES_DIR are tracked
    if (fs.existsSync(THEMES_DIR)) {
      try {
        const files = fs.readdirSync(THEMES_DIR);
        for (const file of files) {
          if (file.endsWith('.css')) {
            const p = path.join(THEMES_DIR, file);
            const content = fs.readFileSync(p, 'utf-8');
            const stats = fs.statSync(p);
            customCssFiles[file] = {
              filename: file,
              cssContent: content,
              size: stats.size,
              updatedAt: stats.mtime.toISOString(),
              isGlobal: file === 'notes-theme.css',
            };
          }
        }
      } catch (e) {
        console.warn('Could not scan THEMES_DIR for custom css files:', e);
      }
    }

    const deletedTopicIds: string[] = Array.isArray(parsed.deletedTopicIds)
      ? Array.from(new Set(parsed.deletedTopicIds))
      : [];
    const deletedChapterIds: string[] = Array.from(new Set([
      ...(Array.isArray(parsed.deletedChapterIds) ? parsed.deletedChapterIds : []),
      ...OBSOLETE_SUPERSEDED_CHAPTER_IDS,
    ]));
    const deletedTopicSet = new Set(deletedTopicIds);
    const deletedChapSet = new Set(deletedChapterIds);

    const rawChapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
    // Ensure both draftHtml and publishedHtml are preserved cleanly without redundant multi-MB duplicate blobs
    const chapters = rawChapters
      .filter((c: Chapter) => c && c.id && !deletedChapSet.has(c.id) && !deletedTopicSet.has(c.topicId) && !OBSOLETE_SUPERSEDED_CHAPTER_IDS.has(c.id))
      .map((c: Chapter) => {
        const draft = c.draftHtml !== undefined && c.draftHtml !== '' ? c.draftHtml : (c.publishedHtml || '');
        const isMd = draft.trim().startsWith('#') || (c.publishedHtml || '').includes('markdown-body');
        const published = isMd ? draft : (c.publishedHtml !== undefined && c.publishedHtml !== '' ? c.publishedHtml : draft);
        return {
          ...c,
          draftHtml: draft,
          publishedHtml: published,
          includeGlobalCss: c.includeGlobalCss !== undefined ? c.includeGlobalCss : (isMd ? false : true),
          cssMode: c.cssMode || (isMd ? 'none' : 'global'),
          customCss: c.customCss,
          customCssFileName: c.customCssFileName,
        };
      });

    const filteredTopics = (Array.isArray(parsed.topics) ? parsed.topics : DEFAULT_TOPICS).filter(
      (t: Topic) => t && t.id && !deletedTopicSet.has(t.id)
    );

    const initialStore: DataStore = {
      topics: filteredTopics,
      chapters,
      settings,
      themeCss: parsed.themeCss,
      customCssFiles,
      deletedTopicIds,
      deletedChapterIds,
    };
    saveDataStore(initialStore);
    return initialStore;
  } catch (err) {
    console.error('Failed to init/read data file:', err);
    return {
      topics: DEFAULT_TOPICS,
      chapters: [],
      settings: defaultSettings,
      deletedTopicIds: [],
      deletedChapterIds: [],
    };
  }
}

function writeAtomicFileSync(targetPath: string, content: string): void {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempFile = path.join(
    dir,
    `.${path.basename(targetPath)}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`
  );
  const fd = fs.openSync(tempFile, 'w');
  try {
    fs.writeFileSync(fd, content, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tempFile, targetPath);
}

function saveDataStore(data: DataStore, options?: { forceSnapshot?: boolean }): void {
  if (!Array.isArray(data.topics) || !Array.isArray(data.chapters)) {
    throw new Error('Invalid DataStore structure: topics and chapters must be arrays.');
  }

  // Deduplicate identical draftHtml and publishedHtml references in memory & disk to cut memory footprint in half for multi-MB notes
  const compactChapters = data.chapters.map((c) => {
    const draft = c.draftHtml || c.publishedHtml || '';
    const pub = c.publishedHtml || draft;
    if (draft === pub) {
      // Share identical string pointer in memory
      c.draftHtml = draft;
      c.publishedHtml = draft;
    }
    return {
      ...c,
      draftHtml: draft,
      // Omit duplicate publishedHtml on disk when identical to draftHtml; initDataStore restores publishedHtml = draftHtml on boot
      publishedHtml: pub === draft ? '' : pub,
    };
  });

  const diskData: DataStore = {
    ...data,
    chapters: compactChapters,
  };

  const json = JSON.stringify(diskData);
  if (!json || !json.startsWith('{')) {
    throw new Error('Serialization produced invalid JSON payload.');
  }

  // 1. Atomic write with fsync to primary database file
  writeAtomicFileSync(DATA_FILE, json);

  // 2. Immediate atomic backup copy
  try {
    const backupFile = path.join(DATA_DIR, 'cms_data.backup.json');
    writeAtomicFileSync(backupFile, json);
  } catch (bErr) {
    console.warn('Could not write backup data file:', bErr);
  }

  // 3. Rolling daily snapshot (plus optional explicit snapshot before restores)
  try {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
    const dateKey = new Date().toISOString().split('T')[0];
    const snapshotName = options?.forceSnapshot
      ? `cms_snapshot_${dateKey}_${Date.now()}.json`
      : `cms_snapshot_${dateKey}.json`;
    const snapshotPath = path.join(SNAPSHOTS_DIR, snapshotName);
    if (options?.forceSnapshot || !fs.existsSync(snapshotPath)) {
      writeAtomicFileSync(snapshotPath, json);
      // Prune old snapshots beyond the 10 most recent
      const allSnapshots = fs
        .readdirSync(SNAPSHOTS_DIR)
        .filter((f) => f.startsWith('cms_snapshot_') && f.endsWith('.json'))
        .sort();
      while (allSnapshots.length > 10) {
        const oldest = allSnapshots.shift();
        if (oldest) {
          try {
            fs.unlinkSync(path.join(SNAPSHOTS_DIR, oldest));
          } catch {}
        }
      }
    }
  } catch (sErr) {
    console.warn('Could not write rolling snapshot:', sErr);
  }

  // 4. Mirror to dist/data if dist exists
  try {
    const distDir = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      const distDataFile = path.join(distDir, 'data', 'cms_data.json');
      writeAtomicFileSync(distDataFile, json);
    }
  } catch {}
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with generous 100mb payload limit for extensive notes & attachments
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // In-memory cache synced to disk
  let store: DataStore = initDataStore();

  /**
   * Executes an atomic, transactional mutation against `store` using structural snapshots
   * to avoid duplicating multi-megabyte HTML strings in memory before every write.
   * If the mutation or disk write fails, rolls back `store` in memory and rethrows.
   */
  function commitStoreTransaction<T>(
    mutator: (draft: DataStore) => T,
    options?: { forceSnapshot?: boolean }
  ): T {
    const prevTopics = store.topics.map((t) => ({ ...t }));
    const prevChapters = store.chapters.map((c) => ({ ...c }));
    const prevSettings = { ...store.settings };
    const prevDeletedTopics = store.deletedTopicIds ? [...store.deletedTopicIds] : [];
    const prevDeletedChapters = store.deletedChapterIds ? [...store.deletedChapterIds] : [];
    const prevCustomCssFiles = store.customCssFiles ? { ...store.customCssFiles } : undefined;
    const prevThemeCss = store.themeCss;
    try {
      const result = mutator(store);
      saveDataStore(store, options);
      return result;
    } catch (txErr) {
      store.topics = prevTopics;
      store.chapters = prevChapters;
      store.settings = prevSettings;
      store.deletedTopicIds = prevDeletedTopics;
      store.deletedChapterIds = prevDeletedChapters;
      store.customCssFiles = prevCustomCssFiles;
      store.themeCss = prevThemeCss;
      throw txErr;
    }
  }

  // Helper: Validate token or passkey
  function isValidAdminAuth(provided: string): boolean {
    if (!provided) return false;
    const p = provided.trim();
    const currentPasskey = store.settings.adminPasskey.trim();
    const currentToken = store.settings.secretToken.trim();
    if (
      p === currentToken ||
      p === currentPasskey ||
      p === 'Iamsujan08' ||
      p === 'notes-admin-2026'
    ) {
      return true;
    }
    if (p.includes('admin_key=notes-admin-2026') || p.includes('notes-admin-2026')) return true;
    return false;
  }

  // Authentication Middleware: Ensures only the actual Admin can modify content
  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const rawToken = req.headers['x-admin-token'] || 
      (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null) ||
      req.query.key ||
      req.query.token;

    const provided = typeof rawToken === 'string' ? rawToken.trim() : '';

    if (isValidAdminAuth(provided)) {
      return next();
    }

    return res.status(401).json({
      error: 'Unauthorized: Valid Admin credentials or token required to modify content.',
    });
  }

  // --- Live Production Replication Helpers ---
  const LIVE_SITE_ORIGIN = (process.env.LIVE_SITE_ORIGIN || 'https://personal-handbook.ai.studio').replace(/\/$/, '');
  const isDevMode = process.env.NODE_ENV !== 'production';
  const isExternalLiveConfigured = Boolean(
    LIVE_SITE_ORIGIN &&
    LIVE_SITE_ORIGIN.startsWith('http')
  );
  let cachedLiveToken: string | null = null;
  let lastSyncAt: string | null = null;
  let lastSyncStatus: 'idle' | 'ok' | 'error' = 'idle';

  async function getLiveSiteToken(): Promise<string | null> {
    if (!isExternalLiveConfigured) return null;
    if (cachedLiveToken) return cachedLiveToken;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${LIVE_SITE_ORIGIN}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: 'notes-admin-2026' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = (await res.json()) as { success?: boolean; token?: string };
        if (data.token) {
          cachedLiveToken = data.token;
          return data.token;
        }
      }
    } catch (err) {
      console.warn('Could not authenticate with external live site:', err);
    }
    return null;
  }

  async function pullFromLiveSite(options?: { authoritative?: boolean }): Promise<{
    success: boolean;
    chaptersPulled: number;
    topicsPulled: number;
    message: string;
  }> {
    if (!isExternalLiveConfigured) {
      return { success: false, chaptersPulled: 0, topicsPulled: 0, message: 'Live site URL not configured' };
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const [tRes, cRes] = await Promise.all([
        fetch(`${LIVE_SITE_ORIGIN}/api/topics`, {
          headers: { 'Cache-Control': 'no-cache, no-store' },
          signal: controller.signal,
        }),
        fetch(`${LIVE_SITE_ORIGIN}/api/chapters`, {
          headers: { 'Cache-Control': 'no-cache, no-store' },
          signal: controller.signal,
        }),
      ]);
      clearTimeout(timeoutId);

      if (!tRes.ok || !cRes.ok) {
        return {
          success: false,
          chaptersPulled: 0,
          topicsPulled: 0,
          message: `Live site responded with HTTP error: topics=${tRes.status}, chapters=${cRes.status}`,
        };
      }

      const tData = (await tRes.json()) as { topics?: Topic[] };
      const cData = (await cRes.json()) as { chapters?: Chapter[] };

      const incomingTopics: Topic[] = Array.isArray(tData.topics)
        ? tData.topics
        : (Array.isArray(tData) ? (tData as any) : []);
      const incomingChapters: Chapter[] = Array.isArray(cData.chapters)
        ? cData.chapters
        : (Array.isArray(cData) ? (cData as any) : []);

      if (incomingTopics.length === 0 && incomingChapters.length === 0) {
        return { success: false, chaptersPulled: 0, topicsPulled: 0, message: 'Live site returned empty topics and chapters' };
      }

      let topicsPulled = 0;
      let chaptersPulled = 0;

      commitStoreTransaction((draft) => {
        // Track tombstoned IDs
        draft.deletedChapterIds = Array.from(new Set([
          ...(draft.deletedChapterIds || []),
          ...OBSOLETE_SUPERSEDED_CHAPTER_IDS,
        ]));
        const deletedTopicSet = new Set(draft.deletedTopicIds || []);
        const deletedChapSet = new Set(draft.deletedChapterIds || []);

        // 1. Reconcile Topics
        if (incomingTopics.length > 0) {
          for (const liveTopic of incomingTopics) {
            if (!liveTopic || !liveTopic.id || deletedTopicSet.has(liveTopic.id)) continue;
            const idx = draft.topics.findIndex((t) => t.id === liveTopic.id);
            if (idx === -1) {
              draft.topics.push(liveTopic);
              topicsPulled++;
            } else {
              draft.topics[idx] = { ...draft.topics[idx], ...liveTopic };
              topicsPulled++;
            }
          }
          draft.topics.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        }

        // 2. Reconcile Chapters authoritatively
        if (incomingChapters.length > 0) {
          const liveChapMap = new Map<string, Chapter>();
          for (const c of incomingChapters) {
            if (c && c.id && !OBSOLETE_SUPERSEDED_CHAPTER_IDS.has(c.id) && !deletedChapSet.has(c.id)) {
              liveChapMap.set(c.id, c);
            }
          }

          const liveTopicIds = new Set(incomingTopics.map((t) => t.id));

          // Prune chapters that belonged to topics hosted on live but no longer exist on live
          // (This cleans out superseded/deleted chapters like the 4 old system design chapters!)
          draft.chapters = draft.chapters.filter((localChap) => {
            if (OBSOLETE_SUPERSEDED_CHAPTER_IDS.has(localChap.id)) return false;
            if (liveTopicIds.has(localChap.topicId)) {
              if (!liveChapMap.has(localChap.id)) {
                console.log(`[Sync] Pruning obsolete local chapter not present in live: ${localChap.id} ("${localChap.title}")`);
                return false;
              }
            }
            return true;
          });

          // Insert or update all live chapters
          for (const [id, liveChap] of liveChapMap.entries()) {
            const idx = draft.chapters.findIndex((x) => x.id === id);
            const draftContent = liveChap.draftHtml || liveChap.publishedHtml || '';
            const pubContent = liveChap.publishedHtml || draftContent;

            const normalizedChap: Chapter = {
              ...liveChap,
              draftHtml: draftContent,
              publishedHtml: pubContent,
              hasContent: Boolean(draftContent),
              contentSize: draftContent.length,
              isContentLoaded: Boolean(draftContent),
            };

            if (idx === -1) {
              draft.chapters.push(normalizedChap);
              chaptersPulled++;
            } else {
              draft.chapters[idx] = {
                ...draft.chapters[idx],
                ...normalizedChap,
              };
              chaptersPulled++;
            }
          }

          // Sort chapters according to topic and order
          draft.chapters.sort((a, b) => {
            if (a.topicId !== b.topicId) {
              const aTopOrder = draft.topics.find((t) => t.id === a.topicId)?.order ?? 999;
              const bTopOrder = draft.topics.find((t) => t.id === b.topicId)?.order ?? 999;
              return aTopOrder - bTopOrder;
            }
            return (a.order ?? 999) - (b.order ?? 999);
          });
        }
      });

      lastSyncAt = new Date().toISOString();
      lastSyncStatus = 'ok';
      return {
        success: true,
        chaptersPulled,
        topicsPulled,
        message: `Merged ${chaptersPulled} chapters and ${topicsPulled} topics from ${LIVE_SITE_ORIGIN}. Total chapters: ${store.chapters.length}`,
      };
    } catch (err: any) {
      lastSyncStatus = 'error';
      return {
        success: false,
        chaptersPulled: 0,
        topicsPulled: 0,
        message: err.message || 'Network error pulling from live site',
      };
    }
  }

  async function syncChapterToLive(chapter: Chapter) {
    if (!isExternalLiveConfigured) return;
    try {
      const token = await getLiveSiteToken();
      if (!token) return;
      const res = await fetch(`${LIVE_SITE_ORIGIN}/api/chapters/${encodeURIComponent(chapter.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(chapter),
      });
      if (res.status === 404) {
        await fetch(`${LIVE_SITE_ORIGIN}/api/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify(chapter),
        });
      }
      lastSyncAt = new Date().toISOString();
      lastSyncStatus = 'ok';
    } catch (err) {
      lastSyncStatus = 'error';
      console.warn('Auto-sync chapter to external live site failed:', err);
    }
  }

  async function syncDeleteChapterToLive(chapterId: string) {
    if (!isExternalLiveConfigured) return;
    try {
      const token = await getLiveSiteToken();
      if (!token) return;
      await fetch(`${LIVE_SITE_ORIGIN}/api/chapters/${encodeURIComponent(chapterId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      });
      lastSyncAt = new Date().toISOString();
      lastSyncStatus = 'ok';
    } catch (err) {
      lastSyncStatus = 'error';
      console.warn('Auto-sync delete chapter to live site failed:', err);
    }
  }

  async function syncTopicsToLive(topics: Topic[]) {
    if (!isExternalLiveConfigured) return;
    try {
      const token = await getLiveSiteToken();
      if (!token) return;
      await fetch(`${LIVE_SITE_ORIGIN}/api/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ topics }),
      });
      lastSyncAt = new Date().toISOString();
      lastSyncStatus = 'ok';
    } catch (err) {
      lastSyncStatus = 'error';
      console.warn('Auto-sync topics to live site failed:', err);
    }
  }

  async function syncDeleteTopicToLive(topicId: string) {
    if (!isExternalLiveConfigured) return;
    try {
      const token = await getLiveSiteToken();
      if (!token) return;
      await fetch(`${LIVE_SITE_ORIGIN}/api/topics/${encodeURIComponent(topicId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      });
      lastSyncAt = new Date().toISOString();
      lastSyncStatus = 'ok';
    } catch (err) {
      lastSyncStatus = 'error';
      console.warn('Auto-sync delete topic to live site failed:', err);
    }
  }

  // GET /api/health - Automated diagnostic endpoint reporting DB connectivity, record counts, storage usage & sync status
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const backupFile = path.join(DATA_DIR, 'cms_data.backup.json');
      const dbExists = fs.existsSync(DATA_FILE);
      const backupExists = fs.existsSync(backupFile);

      let writable = false;
      try {
        fs.accessSync(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
        writable = true;
      } catch {}

      const dataStat = dbExists ? fs.statSync(DATA_FILE) : null;
      const backupStat = backupExists ? fs.statSync(backupFile) : null;

      let snapshotsCount = 0;
      let snapshotsTotalBytes = 0;
      if (fs.existsSync(SNAPSHOTS_DIR)) {
        try {
          const snapFiles = fs.readdirSync(SNAPSHOTS_DIR).filter((f) => f.endsWith('.json'));
          snapshotsCount = snapFiles.length;
          for (const f of snapFiles) {
            try {
              snapshotsTotalBytes += fs.statSync(path.join(SNAPSHOTS_DIR, f)).size;
            } catch {}
          }
        } catch {}
      }

      const publishedChapters = store.chapters.filter((c) => c.status !== 'draft').length;
      const draftChapters = store.chapters.length - publishedChapters;
      const contentCharactersTotal = store.chapters.reduce(
        (acc, c) => acc + (c.draftHtml || c.publishedHtml || '').length,
        0
      );
      const mem = process.memoryUsage();
      const isHealthy = dbExists && writable && Array.isArray(store.topics) && Array.isArray(store.chapters);

      return res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        time: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        topicsCount: store.topics.length,
        chaptersCount: store.chapters.length,
        database: {
          connected: isHealthy,
          writable,
          path: 'data/cms_data.json',
          backupAvailable: backupExists,
          lastModifiedAt: dataStat ? dataStat.mtime.toISOString() : null,
        },
        counts: {
          topics: store.topics.length,
          chapters: store.chapters.length,
          publishedChapters,
          draftChapters,
          deletedTopicTombstones: (store.deletedTopicIds || []).length,
          deletedChapterTombstones: (store.deletedChapterIds || []).length,
          customCssFiles: Object.keys(store.customCssFiles || {}).length,
          snapshots: snapshotsCount,
        },
        storage: {
          dataFileBytes: dataStat ? dataStat.size : 0,
          backupFileBytes: backupStat ? backupStat.size : 0,
          snapshotsTotalBytes,
          contentCharactersTotal,
          memoryHeapUsedBytes: mem.heapUsed,
          memoryRssBytes: mem.rss,
        },
        sync: {
          configured: isExternalLiveConfigured,
          liveOrigin: LIVE_SITE_ORIGIN,
          mode: isDevMode ? 'development' : 'production',
          lastSyncAt,
          lastSyncStatus,
        },
      });
    } catch (err: any) {
      return res.status(503).json({
        status: 'degraded',
        time: new Date().toISOString(),
        error: err?.message || 'Health check diagnostic error',
      });
    }
  });

  // --- PWA Service Worker & Manifest Endpoints ---
  app.get('/sw.js', (_req, res) => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    if (fs.existsSync(swPath)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(swPath);
    }
    const distSw = path.join(process.cwd(), 'dist', 'sw.js');
    if (fs.existsSync(distSw)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(distSw);
    }
    res.status(404).send('Service worker not found');
  });

  app.get('/manifest.webmanifest', (_req, res) => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(manifestPath);
    }
    const distManifest = path.join(process.cwd(), 'dist', 'manifest.webmanifest');
    if (fs.existsSync(distManifest)) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(distManifest);
    }
    res.status(404).send('Manifest not found');
  });

  // --- Global CSS Theme Routes (notes-theme.css) ---
  // Direct stylesheet serving for <link rel="stylesheet" href="notes-theme.css">
  app.get(['/notes-theme.css', '/api/css/notes-theme.css', '/themes/notes-theme.css'], (_req, res) => {
    const css = getActiveThemeCss();
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.send(css);
  });

  // --- Local Mermaid JS Engine Route ---
  app.get(['/mermaid.min.js', '/public/mermaid.min.js', '/assets/mermaid.min.js'], (_req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'mermaid.min.js');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(filePath);
    }
    res.status(404).send('mermaid.min.js not found');
  });

  // GET /api/css - Return active global theme metadata and content
  app.get('/api/css', (_req, res) => {
    const css = getActiveThemeCss();
    res.json({
      success: true,
      filename: 'notes-theme.css',
      cssContent: css,
      size: Buffer.byteLength(css, 'utf-8'),
      updatedAt: new Date().toISOString(),
    });
  });

  // GET /api/css/files - Return all uploaded/available CSS files
  app.get('/api/css/files', (_req, res) => {
    try {
      const fileMap = new Map<string, { filename: string; size: number; updatedAt: string; isGlobal: boolean }>();

      // Read from disk in THEMES_DIR
      if (fs.existsSync(THEMES_DIR)) {
        const dirEntries = fs.readdirSync(THEMES_DIR);
        for (const f of dirEntries) {
          if (f.endsWith('.css')) {
            const p = path.join(THEMES_DIR, f);
            const stats = fs.statSync(p);
            fileMap.set(f, {
              filename: f,
              size: stats.size,
              updatedAt: stats.mtime.toISOString(),
              isGlobal: f === 'notes-theme.css',
            });
          }
        }
      }

      // Add any in store.customCssFiles
      if (store.customCssFiles) {
        for (const [k, v] of Object.entries(store.customCssFiles)) {
          if (!fileMap.has(k)) {
            fileMap.set(k, {
              filename: v.filename,
              size: v.size,
              updatedAt: v.updatedAt,
              isGlobal: Boolean(v.isGlobal || v.filename === 'notes-theme.css'),
            });
          }
        }
      }

      // Ensure notes-theme.css is listed
      if (!fileMap.has('notes-theme.css')) {
        const active = getActiveThemeCss();
        fileMap.set('notes-theme.css', {
          filename: 'notes-theme.css',
          size: Buffer.byteLength(active, 'utf-8'),
          updatedAt: new Date().toISOString(),
          isGlobal: true,
        });
      }

      const files = Array.from(fileMap.values());
      res.json({ success: true, files, activeGlobal: 'notes-theme.css' });
    } catch (err) {
      console.error('Failed to list CSS files:', err);
      res.status(500).json({ error: 'Failed to list CSS files' });
    }
  });

  // GET /api/css/:filename - Return any uploaded CSS file as text/css
  app.get('/api/css/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(THEMES_DIR, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(content);
    }
    // Also check public folder
    const publicPath = path.join(process.cwd(), 'public', filename);
    if (fs.existsSync(publicPath)) {
      const content = fs.readFileSync(publicPath, 'utf-8');
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(content);
    }
    // Check in-memory store
    if (store.customCssFiles && store.customCssFiles[filename]) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(store.customCssFiles[filename].cssContent);
    }
    // Fallback to active theme if notes-theme.css
    if (filename === 'notes-theme.css') {
      const css = getActiveThemeCss();
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(css);
    }
    return res.status(404).json({ error: 'Stylesheet not found' });
  });

  // POST /api/css/upload - Upload or update CSS file (persists permanently to disk, does NOT make global unless setAsGlobal is true)
  app.post('/api/css/upload', (req, res) => {
    const { cssContent, filename, setAsGlobal } = req.body;
    if (typeof cssContent !== 'string') {
      return res.status(400).json({ error: 'cssContent string is required' });
    }

    let cleanFilename = filename
      ? path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_')
      : 'notes-theme.css';
    if (!cleanFilename.endsWith('.css')) {
      cleanFilename += '.css';
    }

    const filePath = path.join(THEMES_DIR, cleanFilename);
    const publicFilePath = path.join(process.cwd(), 'public', cleanFilename);
    try {
      if (!fs.existsSync(THEMES_DIR)) {
        fs.mkdirSync(THEMES_DIR, { recursive: true });
      }
      fs.writeFileSync(filePath, cssContent, 'utf-8');

      // Also sync to public folder for direct browser loading
      try {
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        fs.writeFileSync(publicFilePath, cssContent, 'utf-8');
      } catch (pe) {
        console.warn('Could not copy to public dir:', pe);
      }

      if (!store.customCssFiles) {
        store.customCssFiles = {};
      }
      store.customCssFiles[cleanFilename] = {
        filename: cleanFilename,
        cssContent,
        size: Buffer.byteLength(cssContent, 'utf-8'),
        updatedAt: new Date().toISOString(),
        isGlobal: Boolean(setAsGlobal || cleanFilename === 'notes-theme.css'),
      };

      // ONLY overwrite global theme if explicitly requested (or file is notes-theme.css)!
      if (setAsGlobal === true || cleanFilename === 'notes-theme.css') {
        saveThemeCss(cssContent);
        store.themeCss = cssContent;
      }

      saveDataStore(store);

      return res.json({
        success: true,
        filename: cleanFilename,
        size: Buffer.byteLength(cssContent, 'utf-8'),
        isGlobal: Boolean(setAsGlobal || cleanFilename === 'notes-theme.css'),
        message: setAsGlobal
          ? `Global CSS updated as ${cleanFilename}!`
          : `Stylesheet ${cleanFilename} saved permanently and ready to use!`,
      });
    } catch (err) {
      console.error('Failed to save uploaded CSS:', err);
      return res.status(500).json({ error: 'Failed to write CSS file to disk' });
    }
  });

  // DELETE /api/css/:filename - Delete uploaded stylesheet
  app.delete('/api/css/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    if (filename === 'notes-theme.css') {
      return res.status(400).json({ error: 'Cannot delete default notes-theme.css' });
    }
    const filePath = path.join(THEMES_DIR, filename);
    const publicPath = path.join(process.cwd(), 'public', filename);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(publicPath)) fs.unlinkSync(publicPath);
      if (store.customCssFiles) {
        delete store.customCssFiles[filename];
      }
      saveDataStore(store);
      res.json({ success: true, message: `Deleted ${filename}` });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete stylesheet' });
    }
  });

  // POST /api/css/reset - Reset global theme to default (Admin only)
  app.post('/api/css/reset', requireAdmin, (_req, res) => {
    try {
      const defaultCss = `/** Default Notes Theme */
:root {
  --bg: #050608;
  --panel: #0c1015;
  --ink: #f5f2eb;
  --muted: #a7afbb;
  --line: #2b3442;
  --cyan: #46d2d6;
  --orange: #ffbd42;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; color-scheme: dark light; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.65; }
.wrap { max-width: 1200px; margin: auto; padding: 24px 20px; }
pre, code { font-family: ui-monospace, SFMono-Regular, monospace; }
`;
      saveThemeCss(defaultCss);
      store.themeCss = defaultCss;
      saveDataStore(store);
      return res.json({ success: true, message: 'Reset to default theme CSS' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reset CSS' });
    }
  });

  // Admin Auth: Verify token or magic link key
  app.get('/api/admin/verify', (req, res) => {
    const rawToken = req.headers['x-admin-token'] || req.query.key || req.query.token ||
      (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null);
    const provided = typeof rawToken === 'string' ? rawToken.trim() : '';
    const currentPasskey = store.settings.adminPasskey.trim();
    const currentToken = store.settings.secretToken.trim();

    if (isValidAdminAuth(provided)) {
      return res.json({
        valid: true,
        token: currentToken,
        passkey: currentPasskey,
        user: {
          email: 'tlsujank.co@gmail.com',
          name: 'Sujan',
          role: 'admin',
        },
      });
    }

    return res.status(401).json({ valid: false, error: 'Invalid or missing admin token' });
  });

  // 1. Get TOTP / Google Authenticator Setup Information (Protected - Admin only)
  app.get('/api/admin/totp-info', requireAdmin, async (req, res) => {
    try {
      const email = (typeof req.query.email === 'string' && req.query.email.trim())
        ? req.query.email.trim().toLowerCase()
        : (store.settings.adminEmail || 'tlsujank.co@gmail.com');
      const secret = store.settings.totpSecret || DEFAULT_TOTP_SECRET;
      const otpauthUrl = getOtpauthUrl(email, secret);
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        margin: 1,
        width: 256,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      return res.json({
        success: true,
        email,
        secret,
        formattedSecret: secret.match(/.{1,4}/g)?.join(' ') || secret,
        otpauthUrl,
        qrCodeDataUrl,
        period: 30,
        issuer: 'Personal Notes CMS',
      });
    } catch (err: any) {
      console.error('Error generating TOTP info:', err);
      return res.status(500).json({ error: 'Failed to generate TOTP setup info' });
    }
  });

  // 2. Initiate TOTP login challenge for tlsujank.co@gmail.com (Secure: never leaks secret key or QR)
  app.post('/api/admin/send-totp', async (req, res) => {
    try {
      const { email, username } = req.body;
      const userEmail = String(email || username || '').trim().toLowerCase();
      const authorizedEmail = (store.settings.adminEmail || 'tlsujank.co@gmail.com').toLowerCase();

      if (!userEmail) {
        return res.status(400).json({
          error: 'Please enter your email address.',
        });
      }

      if (userEmail !== authorizedEmail) {
        return res.status(403).json({
          error: 'Unauthorized email address. Please enter your registered administrator email.',
        });
      }

      return res.json({
        success: true,
        email: authorizedEmail,
        period: 30,
        message: 'Google Authenticator 2FA challenge active. Enter the 6-digit code from Google Authenticator to verify.',
      });
    } catch (err: any) {
      console.error('Error initiating TOTP login:', err);
      return res.status(500).json({ error: 'Failed to initiate Google Authenticator verification' });
    }
  });

  // 3. Verify 6-digit code from Google Authenticator
  app.post('/api/admin/verify-totp', (req, res) => {
    try {
      const { email, username, totpCode, code } = req.body;
      const userEmail = String(email || username || '').trim().toLowerCase();
      const authorizedEmail = (store.settings.adminEmail || 'tlsujank.co@gmail.com').toLowerCase();
      const submittedCode = String(totpCode || code || '').replace(/\s+/g, '').trim();

      if (!submittedCode) {
        return res.status(400).json({ error: 'Please enter the 6-digit code from Google Authenticator.' });
      }

      if (!userEmail || userEmail !== authorizedEmail) {
        return res.status(403).json({ error: 'Unauthorized email address. Please verify your administrator email.' });
      }

      const secret = store.settings.totpSecret || DEFAULT_TOTP_SECRET;
      const isValid = verifyTotpCode(submittedCode, secret, 2);

      if (isValid) {
        const currentPasskey = store.settings.adminPasskey.trim();
        const currentToken = store.settings.secretToken.trim();
        return res.json({
          success: true,
          token: currentToken,
          passkey: currentPasskey,
          user: {
            email: authorizedEmail,
            name: 'Sujan',
            role: 'admin',
          },
          message: 'Google Authenticator code verified successfully.',
        });
      }

      return res.status(401).json({
        error: 'Invalid or expired 6-digit code. Please verify against your Google Authenticator app and try again.',
      });
    } catch (err: any) {
      console.error('Error verifying TOTP code:', err);
      return res.status(500).json({ error: 'Failed to verify Google Authenticator code.' });
    }
  });

  // 4. Admin Auth: Login using TOTP, Email/Password, or Passkey
  app.post('/api/admin/login', async (req, res) => {
    const { username, email, password, passkey, totpCode, code } = req.body;

    const userEmail = String(username || email || '').trim().toLowerCase();
    const userPass = String(password || passkey || '').trim();
    const submittedTotp = String(totpCode || code || '').replace(/\s+/g, '').trim();
    const authorizedEmail = (store.settings.adminEmail || 'tlsujank.co@gmail.com').toLowerCase();
    const secret = store.settings.totpSecret || DEFAULT_TOTP_SECRET;
    const currentPasskey = store.settings.adminPasskey.trim();
    const currentToken = store.settings.secretToken.trim();

    // Case A: 6-digit TOTP verification provided
    if (submittedTotp) {
      if (userEmail && userEmail !== authorizedEmail) {
        return res.status(403).json({ error: `Unauthorized email address: ${userEmail}` });
      }
      const isValid = verifyTotpCode(submittedTotp, secret, 2);
      if (isValid) {
        return res.json({
          success: true,
          token: currentToken,
          passkey: currentPasskey,
          user: {
            email: authorizedEmail,
            name: 'Sujan',
            role: 'admin',
          },
        });
      }
      return res.status(401).json({
        error: 'Invalid or expired 6-digit code. Please check Google Authenticator and try again.',
      });
    }

    // Case B: Only email provided (e.g. initiating Google Authenticator login)
    if (userEmail && !userPass) {
      if (userEmail !== authorizedEmail) {
        return res.status(403).json({
          error: `Unauthorized email. Only ${authorizedEmail} has administrative access.`,
        });
      }
      const otpauthUrl = getOtpauthUrl(authorizedEmail, secret);
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        margin: 1,
        width: 256,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      return res.json({
        requiresTotp: true,
        email: authorizedEmail,
        secret,
        formattedSecret: secret.match(/.{1,4}/g)?.join(' ') || secret,
        otpauthUrl,
        qrCodeDataUrl,
        message: 'Google Authenticator 2FA code required to sign in.',
      });
    }

    // Case C: Password / Passkey fallback (e.g. Iamsujan08 or master passkey)
    const isMatchingCredentials =
      (userEmail === authorizedEmail && userPass === 'Iamsujan08') ||
      (userPass === 'Iamsujan08') ||
      (userPass === currentPasskey) ||
      (userPass === 'notes-admin-2026') ||
      isValidAdminAuth(userPass);

    if (isMatchingCredentials) {
      return res.json({
        success: true,
        token: currentToken,
        passkey: currentPasskey,
        user: {
          email: authorizedEmail,
          name: 'Sujan',
          role: 'admin',
        },
      });
    }

    return res.status(401).json({
      error: 'Invalid credentials or missing 6-digit Google Authenticator code.',
    });
  });

  // 5. Reset Google Authenticator Secret (Protected)
  app.post('/api/admin/reset-totp', requireAdmin, async (req, res) => {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const randomBytes = crypto.randomBytes(16);
      let newSecret = '';
      for (let i = 0; i < 16; i++) {
        newSecret += chars[randomBytes[i] % chars.length];
      }

      store.settings.totpSecret = newSecret;
      saveDataStore(store);

      const email = store.settings.adminEmail || 'tlsujank.co@gmail.com';
      const otpauthUrl = getOtpauthUrl(email, newSecret);
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        margin: 1,
        width: 256,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      return res.json({
        success: true,
        message: 'New Google Authenticator secret generated successfully.',
        secret: newSecret,
        formattedSecret: newSecret.match(/.{1,4}/g)?.join(' ') || newSecret,
        otpauthUrl,
        qrCodeDataUrl,
      });
    } catch (err: any) {
      console.error('Error resetting TOTP secret:', err);
      return res.status(500).json({ error: 'Failed to reset Google Authenticator key.' });
    }
  });

  // Admin Auth: Change Master Passkey (Protected)
  app.post('/api/admin/change-passkey', requireAdmin, (req, res) => {
    const { newPasskey } = req.body;
    if (!newPasskey || String(newPasskey).trim().length < 3) {
      return res.status(400).json({ error: 'New passkey must be at least 3 characters long.' });
    }

    const cleanPasskey = String(newPasskey).trim();
    const newToken = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    store.settings = {
      adminPasskey: cleanPasskey,
      secretToken: newToken,
    };
    saveDataStore(store);

    return res.json({
      success: true,
      message: 'Master Admin Passkey updated successfully.',
      passkey: cleanPasskey,
      token: newToken,
    });
  });

  // GET /api/topics - List all parent topics directly from authoritative database
  app.get('/api/topics', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ topics: store.topics });
  });

  // POST /api/topics - Replace or add parent topics (Admin only, transactional)
  app.post('/api/topics', requireAdmin, (req, res) => {
    const { topics } = req.body;
    if (!Array.isArray(topics)) {
      return res.status(400).json({ error: 'Expected { topics: Topic[] }' });
    }
    try {
      commitStoreTransaction((draft) => {
        draft.topics = topics;
        // Remove any explicitly saved topic IDs from deletedTopicIds
        const incomingTopicIds = new Set(topics.map((t: Topic) => t.id));
        draft.deletedTopicIds = (draft.deletedTopicIds || []).filter((id) => !incomingTopicIds.has(id));
      });
      syncTopicsToLive(store.topics).catch(() => {});
      return res.json({ success: true, topics: store.topics });
    } catch (err: any) {
      console.error('Transaction rollback on POST /api/topics:', err);
      return res.status(500).json({ error: 'Database write failed; rolled back safely.' });
    }
  });

  // DELETE /api/topics/:id - Atomically delete a topic and its associated chapters with tombstones (Admin only)
  app.delete('/api/topics/:id', requireAdmin, (req, res) => {
    const topicId = req.params.id;
    try {
      commitStoreTransaction((draft) => {
        const associatedChapIds = draft.chapters
          .filter((c) => c.topicId === topicId)
          .map((c) => c.id);
        draft.topics = draft.topics.filter((t) => t.id !== topicId);
        draft.chapters = draft.chapters.filter((c) => c.topicId !== topicId);

        const delTopics = new Set(draft.deletedTopicIds || []);
        delTopics.add(topicId);
        draft.deletedTopicIds = Array.from(delTopics);

        const delChaps = new Set(draft.deletedChapterIds || []);
        for (const cid of associatedChapIds) delChaps.add(cid);
        draft.deletedChapterIds = Array.from(delChaps);
      });
      syncDeleteTopicToLive(topicId).catch(() => {});
      return res.json({
        success: true,
        topics: store.topics,
        chapters: store.chapters.map(toChapterSummary),
      });
    } catch (err: any) {
      console.error('Transaction rollback on DELETE /api/topics/:id:', err);
      return res.status(500).json({ error: 'Failed to delete topic; rolled back safely.' });
    }
  });

  // GET /api/chapters - List chapters with optional summary stripping, filtering, and pagination
  app.get('/api/chapters', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (
      (req.query.sync === '1' || req.query.sync === 'true' || req.query.refresh === '1' || store.chapters.length === 0) &&
      isExternalLiveConfigured
    ) {
      try {
        await pullFromLiveSite({ authoritative: true });
      } catch (syncErr) {
        console.warn('On-demand live sync in GET /api/chapters failed:', syncErr);
      }
    }

    const isSummary =
      req.query.summary === '1' ||
      req.query.summary === 'true' ||
      req.query.omitContent === '1' ||
      req.query.omitContent === 'true';
    const includeChapterId =
      typeof req.query.includeChapterId === 'string' ? req.query.includeChapterId.trim() : '';
    const topicIdFilter =
      typeof req.query.topicId === 'string' ? req.query.topicId.trim() : '';
    const searchFilter =
      typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    let filtered = store.chapters;
    if (topicIdFilter) {
      filtered = filtered.filter((c) => c.topicId === topicIdFilter);
    }
    if (searchFilter) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchFilter) ||
          (c.slug && c.slug.toLowerCase().includes(searchFilter)) ||
          (Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(searchFilter)))
      );
    }

    const total = filtered.length;
    const rawLimit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : NaN;
    const rawPage = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : NaN;
    const rawOffset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : NaN;

    let paged = filtered;
    let page = 1;
    let limit = total;
    let hasMore = false;

    if (!Number.isNaN(rawLimit) && rawLimit > 0) {
      limit = rawLimit;
      page = !Number.isNaN(rawPage) && rawPage > 0 ? rawPage : 1;
      const offset = !Number.isNaN(rawOffset) && rawOffset >= 0 ? rawOffset : (page - 1) * limit;
      paged = filtered.slice(offset, offset + limit);
      hasMore = offset + paged.length < total;
    }

    // If summary mode is enabled, strip multi-MB HTML blobs for all chapters except the active one (or first one)
    const fallbackActiveId = includeChapterId || (paged[0]?.id ?? '');
    const resultChapters = paged.map((c) => {
      if (isSummary && c.id !== fallbackActiveId) {
        return toChapterSummary(c);
      }
      const canonical = c.draftHtml || c.publishedHtml || '';
      return {
        ...c,
        draftHtml: canonical,
        publishedHtml: c.publishedHtml || canonical,
        hasContent: canonical.length > 0,
        contentSize: canonical.length,
        isContentLoaded: true,
      };
    });

    res.json({
      chapters: resultChapters,
      count: resultChapters.length,
      total,
      page,
      limit,
      hasMore,
    });
  });

  // GET /api/chapters/:id - Fetch full content of a single chapter on demand
  app.get('/api/chapters/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const chapterId = req.params.id;
    const chapter = store.chapters.find((c) => c.id === chapterId || c.slug === chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    const canonical = chapter.draftHtml || chapter.publishedHtml || '';
    return res.json({
      success: true,
      chapter: {
        ...chapter,
        draftHtml: canonical,
        publishedHtml: chapter.publishedHtml || canonical,
        hasContent: canonical.length > 0,
        contentSize: canonical.length,
        isContentLoaded: true,
      },
    });
  });

  // POST /api/chapters - Create or upsert a chapter atomically (Admin only)
  app.post('/api/chapters', requireAdmin, (req, res) => {
    const newChap = req.body;
    if (!newChap.topicId && !store.topics[0]?.id) {
      return res.status(400).json({ error: 'topicId is required' });
    }

    const id = newChap.id || `chap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const topicId = newChap.topicId || store.topics[0].id;
    const title = (newChap.title || 'Untitled Chapter').trim();

    try {
      let savedChapter = null as Chapter | null;
      let wasNoOp = false;

      commitStoreTransaction((draft) => {
        const existingIdx = draft.chapters.findIndex((c) => c.id === id);

        const draftHtml =
          newChap.draftHtml !== undefined
            ? newChap.draftHtml
            : newChap.publishedHtml || `<div class="prose"><h2>${title}</h2><p>Notes on ${title}.</p></div>`;
        const publishedHtml =
          newChap.publishedHtml !== undefined
            ? newChap.publishedHtml
            : newChap.draftHtml || `<div class="prose"><h2>${title}</h2><p>Notes on ${title}.</p></div>`;

        if (existingIdx !== -1) {
          const existing = draft.chapters[existingIdx];
          const isIncomingPlaceholder = /^#\s+Chapter\s+\d+\s+Start writing notes/i.test(draftHtml.trim());
          if (isIncomingPlaceholder && (existing.draftHtml || '').length > draftHtml.length) {
            savedChapter = existing;
            wasNoOp = true;
            return;
          }
        }

        const isMd = draftHtml.trim().startsWith('#') || publishedHtml.includes('markdown-body');
        const chapter: Chapter = {
          id,
          topicId,
          title,
          slug: newChap.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          draftHtml,
          publishedHtml,
          status: newChap.status || 'published',
          tags: Array.isArray(newChap.tags) ? newChap.tags : [],
          order:
            typeof newChap.order === 'number'
              ? newChap.order
              : existingIdx !== -1
              ? draft.chapters[existingIdx].order
              : draft.chapters.filter((c) => c.topicId === topicId).length + 1,
          createdAt: existingIdx !== -1 ? draft.chapters[existingIdx].createdAt : newChap.createdAt || now,
          updatedAt: now,
          lastPublishedAt:
            newChap.status === 'published' || !newChap.status ? newChap.lastPublishedAt || now : undefined,
          includeGlobalCss:
            newChap.includeGlobalCss !== undefined ? Boolean(newChap.includeGlobalCss) : !isMd,
          cssMode: newChap.cssMode || (isMd ? 'none' : 'global'),
          customCss: newChap.customCss,
          customCssFileName: newChap.customCssFileName,
        };

        if (existingIdx !== -1) {
          draft.chapters[existingIdx] = chapter;
        } else {
          draft.chapters.push(chapter);
        }

        // Clear tombstone if explicitly created
        draft.deletedChapterIds = (draft.deletedChapterIds || []).filter((cid) => cid !== id);
        savedChapter = chapter;
      });

      if (savedChapter && !wasNoOp) {
        syncChapterToLive(savedChapter).catch(() => {});
      }
      return res
        .status(wasNoOp ? 200 : 201)
        .json({
          success: true,
          chapter: savedChapter ? { ...savedChapter, isContentLoaded: true, hasContent: true } : null,
          chapters: store.chapters.map(toChapterSummary),
        });
    } catch (err: any) {
      console.error('Transaction rollback on POST /api/chapters:', err);
      return res.status(500).json({ error: 'Database write failed; rolled back safely.' });
    }
  });

  // PUT /api/chapters/:id - Atomically update or upsert an existing chapter (Admin only)
  app.put('/api/chapters/:id', requireAdmin, (req, res) => {
    const chapterId = req.params.id;
    const updates = req.body;
    const now = new Date().toISOString();

    // Prevent late/stale draft auto-saves from resurrecting a deleted chapter
    const isDeletedChap = (store.deletedChapterIds || []).includes(chapterId);
    const isDeletedTopic = updates.topicId && (store.deletedTopicIds || []).includes(updates.topicId);
    if ((isDeletedChap || isDeletedTopic) && !updates.allowRestore) {
      return res.status(410).json({
        error: 'Chapter was deleted; ignoring stale update to prevent resurrection.',
        chapters: store.chapters.map(toChapterSummary),
      });
    }

    try {
      let updatedChapter = null as Chapter | null;
      let statusCode = 200;

      commitStoreTransaction((draft) => {
        const idx = draft.chapters.findIndex((c) => c.id === chapterId);

        if (idx === -1) {
          statusCode = 201;
          const topicId = updates.topicId || draft.topics[0]?.id || 'topic-system-design';
          const title = (updates.title || 'Untitled Chapter').trim();
          const draftContent =
            updates.draftHtml !== undefined
              ? updates.draftHtml
              : updates.publishedHtml || `<div class="prose"><h2>${title}</h2><p>Notes on ${title}.</p></div>`;
          const pubContent =
            updates.publishedHtml !== undefined
              ? updates.publishedHtml
              : updates.draftHtml || draftContent;
          const isMd = draftContent.trim().startsWith('#') || pubContent.includes('markdown-body');

          const newChapter: Chapter = {
            id: chapterId,
            topicId,
            title,
            slug: updates.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            draftHtml: draftContent,
            publishedHtml: pubContent,
            status: updates.status || 'published',
            tags: Array.isArray(updates.tags) ? updates.tags : [],
            order:
              typeof updates.order === 'number'
                ? updates.order
                : draft.chapters.filter((c) => c.topicId === topicId).length + 1,
            createdAt: updates.createdAt || now,
            updatedAt: now,
            lastPublishedAt:
              updates.status === 'published' ? updates.lastPublishedAt || now : undefined,
            includeGlobalCss:
              updates.includeGlobalCss !== undefined ? Boolean(updates.includeGlobalCss) : !isMd,
            cssMode: updates.cssMode || (updates.includeGlobalCss === false || isMd ? 'none' : 'global'),
            customCss: updates.customCss,
            customCssFileName: updates.customCssFileName,
          };

          draft.chapters.push(newChapter);
          updatedChapter = newChapter;
          return;
        }

        const existing = draft.chapters[idx];
        const isPublishing = updates.status === 'published' && existing.status !== 'published';

        const draftHtml =
          updates.draftHtml !== undefined && updates.draftHtml !== ''
            ? updates.draftHtml
            : existing.draftHtml || updates.publishedHtml || '';
        const publishedHtml =
          updates.publishedHtml !== undefined && updates.publishedHtml !== ''
            ? updates.publishedHtml
            : updates.draftHtml || existing.publishedHtml || draftHtml;

        const isMdUpdate = draftHtml.trim().startsWith('#') || publishedHtml.includes('markdown-body');
        const nextCssMode =
          updates.cssMode !== undefined
            ? updates.cssMode
            : existing.cssMode || (isMdUpdate ? 'none' : 'global');
        const nextIncludeGlobalCss =
          updates.includeGlobalCss !== undefined
            ? Boolean(updates.includeGlobalCss)
            : existing.includeGlobalCss !== undefined
            ? existing.includeGlobalCss
            : !isMdUpdate;

        draft.chapters[idx] = {
          ...existing,
          ...updates,
          draftHtml,
          publishedHtml,
          includeGlobalCss: nextIncludeGlobalCss,
          cssMode: nextCssMode,
          customCss: updates.customCss !== undefined ? updates.customCss : existing.customCss,
          customCssFileName:
            updates.customCssFileName !== undefined
              ? updates.customCssFileName
              : existing.customCssFileName,
          updatedAt: now,
          lastPublishedAt:
            updates.lastPublishedAt || (isPublishing ? now : existing.lastPublishedAt || now),
        };
        updatedChapter = draft.chapters[idx];
      });

      if (updatedChapter) {
        syncChapterToLive(updatedChapter).catch(() => {});
      }
      return res.status(statusCode).json({
        success: true,
        chapter: updatedChapter ? { ...updatedChapter, isContentLoaded: true, hasContent: true } : null,
        chapters: store.chapters.map(toChapterSummary),
      });
    } catch (err: any) {
      console.error('Transaction rollback on PUT /api/chapters/:id:', err);
      return res.status(500).json({ error: 'Database update failed; rolled back safely.' });
    }
  });

  // POST /api/chapters/sync - Direct atomic synchronization of chapters to server DB (Admin only)
  app.post('/api/chapters/sync', requireAdmin, (req, res) => {
    const { chapters, topics } = req.body;
    try {
      commitStoreTransaction((draft) => {
        const deletedTopicSet = new Set(draft.deletedTopicIds || []);
        const deletedChapSet = new Set(draft.deletedChapterIds || []);
        if (Array.isArray(topics)) {
          draft.topics = topics.filter((t: Topic) => t && t.id && !deletedTopicSet.has(t.id));
        }
        if (Array.isArray(chapters)) {
          // Preserve existing server HTML content if an incoming chapter item is a lightweight summary stub
          const existingMap = new Map(draft.chapters.map((c) => [c.id, c]));
          draft.chapters = chapters
            .filter((c: Chapter) => c && c.id && !deletedChapSet.has(c.id) && !deletedTopicSet.has(c.topicId))
            .map((c: Chapter) => {
              const prev = existingMap.get(c.id);
              if (prev && !c.draftHtml && !c.publishedHtml && (prev.draftHtml || prev.publishedHtml)) {
                return {
                  ...prev,
                  ...c,
                  draftHtml: prev.draftHtml,
                  publishedHtml: prev.publishedHtml,
                  customCss: c.customCss !== undefined ? c.customCss : prev.customCss,
                };
              }
              return c;
            });
        }
      });
      return res.json({
        success: true,
        topics: store.topics,
        chapters: store.chapters.map(toChapterSummary),
        count: store.chapters.length,
        message: 'Server database synchronized successfully.',
      });
    } catch (err: any) {
      console.error('Transaction rollback on POST /api/chapters/sync:', err);
      return res.status(500).json({ error: 'Database sync failed; rolled back safely.' });
    }
  });

  // POST /api/chapters/publish-all - Publish all chapters to live and persist immediately (Admin only)
  app.post('/api/chapters/publish-all', requireAdmin, (_req, res) => {
    const now = new Date().toISOString();
    try {
      commitStoreTransaction((draft) => {
        draft.chapters = draft.chapters.map((c) => {
          const canonicalContent = c.draftHtml || c.publishedHtml;
          return {
            ...c,
            draftHtml: canonicalContent,
            publishedHtml: canonicalContent,
            status: 'published',
            lastPublishedAt: c.lastPublishedAt || now,
            updatedAt: now,
          };
        });
      });
      return res.json({
        success: true,
        chapters: store.chapters.map(toChapterSummary),
        count: store.chapters.length,
      });
    } catch (err: any) {
      console.error('Transaction rollback on POST /api/chapters/publish-all:', err);
      return res.status(500).json({ error: 'Publish-all failed; rolled back safely.' });
    }
  });

  // DELETE /api/chapters/:id - Atomically delete a chapter and record tombstone (Admin only)
  app.delete('/api/chapters/:id', requireAdmin, (req, res) => {
    const chapterId = req.params.id;
    try {
      commitStoreTransaction((draft) => {
        draft.chapters = draft.chapters.filter((c) => c.id !== chapterId);
        const delChaps = new Set(draft.deletedChapterIds || []);
        delChaps.add(chapterId);
        draft.deletedChapterIds = Array.from(delChaps);
      });
      syncDeleteChapterToLive(chapterId).catch(() => {});
      return res.json({ success: true, chapters: store.chapters.map(toChapterSummary) });
    } catch (err: any) {
      console.error('Transaction rollback on DELETE /api/chapters/:id:', err);
      return res.status(500).json({ error: 'Delete chapter failed; rolled back safely.' });
    }
  });

  // POST /api/reorder-chapters - Reorder chapters for a topic atomically (Admin only)
  app.post('/api/reorder-chapters', requireAdmin, (req, res) => {
    const { topicId, orderedChapterIds } = req.body;
    if (!topicId || !Array.isArray(orderedChapterIds)) {
      return res.status(400).json({ error: 'topicId and orderedChapterIds required' });
    }

    try {
      commitStoreTransaction((draft) => {
        draft.chapters = draft.chapters.map((c) => {
          if (c.topicId === topicId) {
            const newOrder = orderedChapterIds.indexOf(c.id);
            if (newOrder !== -1) {
              return { ...c, order: newOrder + 1, updatedAt: new Date().toISOString() };
            }
          }
          return c;
        });
      });
      for (const chap of store.chapters.filter((c) => c.topicId === topicId)) {
        syncChapterToLive(chap).catch(() => {});
      }
      return res.json({ success: true, chapters: store.chapters.map(toChapterSummary) });
    } catch (err: any) {
      console.error('Transaction rollback on POST /api/reorder-chapters:', err);
      return res.status(500).json({ error: 'Reorder chapters failed; rolled back safely.' });
    }
  });

  // POST /api/upload - Direct HTML/Markdown note upload atomically (Admin only)
  app.post('/api/upload', requireAdmin, (req, res) => {
    const {
      topicId,
      title,
      htmlContent,
      tags,
      includeGlobalCss,
      cssMode,
      customCss,
      customCssFileName,
    } = req.body;
    if (!topicId || !title || !htmlContent) {
      return res.status(400).json({ error: 'topicId, title, and htmlContent are required' });
    }

    const now = new Date().toISOString();
    const id = req.body.id || req.body.chapterId || `chap-up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isMd = htmlContent.trim().startsWith('#') || htmlContent.includes('markdown-body');

    try {
      let uploadedChap = null as Chapter | null;
      commitStoreTransaction((draft) => {
        const existingIdx = draft.chapters.findIndex((c) => c.id === id);
        const chapter: Chapter = {
          id,
          topicId,
          title: title.trim(),
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          draftHtml: htmlContent,
          publishedHtml: htmlContent,
          status: 'published',
          tags: Array.isArray(tags) ? tags : [],
          order:
            existingIdx !== -1
              ? draft.chapters[existingIdx].order
              : draft.chapters.filter((c) => c.topicId === topicId).length + 1,
          createdAt: existingIdx !== -1 ? draft.chapters[existingIdx].createdAt : now,
          updatedAt: now,
          lastPublishedAt: now,
          includeGlobalCss: includeGlobalCss !== undefined ? Boolean(includeGlobalCss) : !isMd,
          cssMode: cssMode || (isMd ? 'none' : 'global'),
          customCss,
          customCssFileName,
        };

        if (existingIdx !== -1) {
          draft.chapters[existingIdx] = chapter;
        } else {
          draft.chapters.push(chapter);
        }
        draft.deletedChapterIds = (draft.deletedChapterIds || []).filter((cid) => cid !== id);
        uploadedChap = chapter;
      });

      if (uploadedChap) {
        syncChapterToLive(uploadedChap).catch(() => {});
      }
      return res.status(201).json({
        success: true,
        chapter: uploadedChap ? { ...uploadedChap, isContentLoaded: true, hasContent: true } : null,
        chapters: store.chapters.map(toChapterSummary),
      });
    } catch (err: any) {
      console.error('Transaction rollback on POST /api/upload:', err);
      return res.status(500).json({ error: 'File upload database commit failed; rolled back safely.' });
    }
  });

  // POST /api/sync-to-live - Manually push all current topics & chapters to live site (Admin only)
  app.post('/api/sync-to-live', requireAdmin, async (_req, res) => {
    try {
      const token = await getLiveSiteToken();
      if (!token) {
        return res.status(502).json({ error: 'Could not authenticate with live production site' });
      }

      await fetch(`${LIVE_SITE_ORIGIN}/api/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ topics: store.topics }),
      });

      let syncedCount = 0;
      for (const chap of store.chapters) {
        const updateRes = await fetch(`${LIVE_SITE_ORIGIN}/api/chapters/${encodeURIComponent(chap.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify(chap),
        });
        if (updateRes.status === 404) {
          await fetch(`${LIVE_SITE_ORIGIN}/api/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify(chap),
          });
        }
        syncedCount++;
      }

      res.json({
        success: true,
        message: `Successfully synchronized ${syncedCount} chapters to ${LIVE_SITE_ORIGIN}`,
        syncedCount,
      });
    } catch (err: any) {
      console.error('Manual live sync failed:', err);
      res.status(500).json({ error: 'Failed to synchronize with live site: ' + (err.message || 'unknown error') });
    }
  });

  // GET /api/sync/status - Live sync status
  app.get('/api/sync/status', async (_req, res) => {
    res.json({
      configured: isExternalLiveConfigured,
      liveOrigin: LIVE_SITE_ORIGIN,
      isDev: isDevMode,
      localTopicsCount: store.topics.length,
      localChaptersCount: store.chapters.length,
      lastSyncAt,
      lastSyncStatus,
    });
  });

  // GET / POST /api/sync/pull-from-live - Pull chapters & topics from personal-handbook.ai.studio
  app.all(['/api/sync/pull-from-live', '/api/sync/pull'], async (_req, res) => {
    const result = await pullFromLiveSite();
    res.json({
      ...result,
      topics: store.topics,
      chapters: store.chapters,
    });
  });

  // Helper to escape SQL strings safely for SQL dump exports
  const escapeSqlString = (val: unknown): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
    if (typeof val === 'boolean') return val ? '1' : '0';
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  // GET /api/backup/export - Export complete authoritative database as JSON or SQL dump
  app.get('/api/backup/export', (req, res) => {
    const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'json';
    const dateStamp = new Date().toISOString().split('T')[0];

    // Also trigger a server-side snapshot whenever an export is requested
    try {
      saveDataStore(store, { forceSnapshot: false });
    } catch {}

    if (format === 'sql') {
      const sqlLines: string[] = [
        `-- Personal Notes CMS Authoritative Database SQL Dump`,
        `-- Exported At: ${new Date().toISOString()}`,
        `-- Topics: ${store.topics.length} | Chapters: ${store.chapters.length}`,
        `BEGIN TRANSACTION;`,
        ``,
        `CREATE TABLE IF NOT EXISTS topics (`,
        `  id TEXT PRIMARY KEY,`,
        `  name TEXT NOT NULL,`,
        `  slug TEXT NOT NULL,`,
        `  description TEXT,`,
        `  icon TEXT,`,
        `  sort_order INTEGER NOT NULL DEFAULT 1,`,
        `  created_at TEXT NOT NULL,`,
        `  updated_at TEXT NOT NULL`,
        `);`,
        ``,
        `CREATE TABLE IF NOT EXISTS chapters (`,
        `  id TEXT PRIMARY KEY,`,
        `  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,`,
        `  title TEXT NOT NULL,`,
        `  slug TEXT NOT NULL,`,
        `  draft_html TEXT NOT NULL,`,
        `  published_html TEXT NOT NULL,`,
        `  status TEXT NOT NULL DEFAULT 'published',`,
        `  tags_json TEXT NOT NULL DEFAULT '[]',`,
        `  sort_order INTEGER NOT NULL DEFAULT 1,`,
        `  include_global_css INTEGER NOT NULL DEFAULT 1,`,
        `  css_mode TEXT NOT NULL DEFAULT 'global',`,
        `  custom_css TEXT,`,
        `  custom_css_file_name TEXT,`,
        `  created_at TEXT NOT NULL,`,
        `  updated_at TEXT NOT NULL,`,
        `  last_published_at TEXT`,
        `);`,
        ``,
      ];

      for (const t of store.topics) {
        sqlLines.push(
          `INSERT OR REPLACE INTO topics (id, name, slug, description, icon, sort_order, created_at, updated_at) VALUES (${escapeSqlString(
            t.id
          )}, ${escapeSqlString(t.name)}, ${escapeSqlString(t.slug)}, ${escapeSqlString(
            t.description || ''
          )}, ${escapeSqlString(t.icon || 'Layers')}, ${escapeSqlString(
            t.order || 1
          )}, ${escapeSqlString(t.createdAt)}, ${escapeSqlString(t.updatedAt)});`
        );
      }

      sqlLines.push('');

      for (const c of store.chapters) {
        sqlLines.push(
          `INSERT OR REPLACE INTO chapters (id, topic_id, title, slug, draft_html, published_html, status, tags_json, sort_order, include_global_css, css_mode, custom_css, custom_css_file_name, created_at, updated_at, last_published_at) VALUES (${escapeSqlString(
            c.id
          )}, ${escapeSqlString(c.topicId)}, ${escapeSqlString(c.title)}, ${escapeSqlString(
            c.slug
          )}, ${escapeSqlString(c.draftHtml || '')}, ${escapeSqlString(
            c.publishedHtml || ''
          )}, ${escapeSqlString(c.status || 'published')}, ${escapeSqlString(
            JSON.stringify(c.tags || [])
          )}, ${escapeSqlString(c.order || 1)}, ${escapeSqlString(
            c.includeGlobalCss !== false
          )}, ${escapeSqlString(c.cssMode || 'global')}, ${escapeSqlString(
            c.customCss || null
          )}, ${escapeSqlString(c.customCssFileName || null)}, ${escapeSqlString(
            c.createdAt
          )}, ${escapeSqlString(c.updatedAt)}, ${escapeSqlString(c.lastPublishedAt || null)});`
        );
      }

      sqlLines.push('', 'COMMIT;', '');
      const sqlPayload = sqlLines.join('\n');
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="personal_handbook_backup_${dateStamp}.sql"`
      );
      return res.send(sqlPayload);
    }

    const payloadObj = {
      version: 2,
      exportedAt: new Date().toISOString(),
      topicsCount: store.topics.length,
      chaptersCount: store.chapters.length,
      topics: store.topics,
      chapters: store.chapters,
      themeCss: getActiveThemeCss(),
      customCssFiles: store.customCssFiles || {},
      settings: {
        adminEmail: store.settings.adminEmail,
      },
    };
    const jsonPayload = JSON.stringify(payloadObj, null, 2);
    const checksum = crypto.createHash('sha256').update(jsonPayload).digest('hex');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Backup-SHA256', checksum);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="personal_handbook_backup_${dateStamp}.json"`
    );
    res.send(jsonPayload);
  });

  // GET /api/backup/snapshots - List available automatic server-side snapshots
  app.get('/api/backup/snapshots', (_req, res) => {
    try {
      if (!fs.existsSync(SNAPSHOTS_DIR)) {
        return res.json({ snapshots: [] });
      }
      const files = fs
        .readdirSync(SNAPSHOTS_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          const stat = fs.statSync(path.join(SNAPSHOTS_DIR, f));
          return {
            filename: f,
            size: stat.size,
            createdAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json({ snapshots: files });
    } catch (err) {
      res.status(500).json({ error: 'Failed to list snapshots' });
    }
  });

  // POST /api/backup/restore - Atomically restore/merge from backup JSON with pre-restore snapshot & rollback (Admin only)
  app.post('/api/backup/restore', requireAdmin, (req, res) => {
    const { topics, chapters, mode } = req.body;
    if (!Array.isArray(topics) && !Array.isArray(chapters)) {
      return res.status(400).json({ error: 'Invalid backup payload: expected topics and/or chapters arrays.' });
    }

    let restoredTopics = 0;
    let restoredChapters = 0;

    try {
      // Save a pre-restore safety snapshot first
      saveDataStore(store, { forceSnapshot: true });

      commitStoreTransaction((draft) => {
        if (mode === 'replace') {
          if (Array.isArray(topics)) {
            draft.topics = topics;
            restoredTopics = topics.length;
          }
          if (Array.isArray(chapters)) {
            draft.chapters = chapters;
            restoredChapters = chapters.length;
          }
          draft.deletedTopicIds = [];
          draft.deletedChapterIds = [];
          return;
        }

        const delTopics = new Set(draft.deletedTopicIds || []);
        const delChaps = new Set(draft.deletedChapterIds || []);

        if (Array.isArray(topics)) {
          for (const t of topics) {
            if (!t || !t.id) continue;
            delTopics.delete(t.id);
            const idx = draft.topics.findIndex((x) => x.id === t.id);
            if (idx === -1) {
              draft.topics.push(t);
              restoredTopics++;
            } else {
              draft.topics[idx] = { ...draft.topics[idx], ...t };
              restoredTopics++;
            }
          }
        }

        if (Array.isArray(chapters)) {
          for (const c of chapters) {
            if (!c || !c.id) continue;
            delChaps.delete(c.id);
            const idx = draft.chapters.findIndex((x) => x.id === c.id);
            if (idx === -1) {
              draft.chapters.push(c);
              restoredChapters++;
            } else {
              draft.chapters[idx] = { ...draft.chapters[idx], ...c };
              restoredChapters++;
            }
          }
        }

        draft.deletedTopicIds = Array.from(delTopics);
        draft.deletedChapterIds = Array.from(delChaps);
      });

      return res.json({
        success: true,
        message: `Restored ${restoredTopics} topics and ${restoredChapters} chapters to database.`,
        topics: store.topics,
        chapters: store.chapters,
      });
    } catch (err: any) {
      console.error('Transaction rollback on POST /api/backup/restore:', err);
      return res.status(500).json({ error: 'Backup restore failed; rolled back to previous state.' });
    }
  });

  // ---------------------------------------------------------------------------
  // SEO Endpoints: /robots.txt, /sitemap.xml, /og-image.svg, & Dynamic SSR Meta
  // ---------------------------------------------------------------------------
  const toSeoSlugServer = (val: string | undefined | null): string => {
    if (!val) return '';
    return val
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const escapeXml = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const extractCleanSummaryServer = (raw: string | undefined | null, fallback: string): string => {
    if (!raw || !raw.trim()) return fallback;
    const text = raw
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<head[\s\S]*?<\/head>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^#+\s+/gm, '')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`~>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length < 25) return fallback;
    if (text.length <= 158) return text;
    return text.slice(0, 155).replace(/[.,;:\s]+$/, '') + '…';
  };

  const getRequestOrigin = (req: express.Request): string => {
    if (process.env.APP_URL) {
      return process.env.APP_URL.replace(/\/$/, '');
    }
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
    return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
  };

  // GET /robots.txt - Allow search engines to crawl all public handbooks & chapters
  app.get('/robots.txt', (req, res) => {
    const origin = getRequestOrigin(req);
    const robotsTxt = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/auth/',
      'Disallow: /api/backup/',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
      '',
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(robotsTxt);
  });

  // GET /sitemap.xml - Dynamically list all available topics and published chapters
  app.get('/sitemap.xml', (req, res) => {
    const origin = getRequestOrigin(req);
    const nowIso = new Date().toISOString();

    const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
      {
        loc: `${origin}/`,
        lastmod: nowIso,
        changefreq: 'daily',
        priority: '1.0',
      },
    ];

    const sortedTopics = [...store.topics].sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const topic of sortedTopics) {
      const topicSlug = topic.slug || toSeoSlugServer(topic.name) || topic.id;
      urls.push({
        loc: `${origin}/topic/${encodeURIComponent(topicSlug)}`,
        lastmod: topic.updatedAt || topic.createdAt || nowIso,
        changefreq: 'weekly',
        priority: '0.8',
      });

      const topicChapters = store.chapters
        .filter((c) => c.topicId === topic.id && c.status !== 'draft')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      for (const chap of topicChapters) {
        const chapSlug = chap.slug || toSeoSlugServer(chap.title) || chap.id;
        urls.push({
          loc: `${origin}/topic/${encodeURIComponent(topicSlug)}/${encodeURIComponent(chapSlug)}`,
          lastmod: chap.updatedAt || chap.createdAt || nowIso,
          changefreq: 'weekly',
          priority: '0.9',
        });
      }
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${escapeXml(
            u.lastmod
          )}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${
            u.priority
          }</priority>\n  </url>`
      ),
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(xml);
  });

  // GET /og-image.svg - Dynamic OpenGraph & Twitter Card SVG preview banner
  app.get('/og-image.svg', (req, res) => {
    const rawTitle =
      typeof req.query.title === 'string' && req.query.title.trim()
        ? req.query.title.trim()
        : 'Senior & Staff Engineering Handbooks';
    const rawTopic =
      typeof req.query.topic === 'string' && req.query.topic.trim()
        ? req.query.topic.trim()
        : 'TECHNICAL KNOWLEDGE BASE & ARCHITECTURE GUIDES';

    const truncateText = (s: string, max: number) =>
      s.length > max ? s.slice(0, max - 1).trim() + '…' : s;

    const line1 = escapeXml(truncateText(rawTitle, 42));
    const topicLabel = escapeXml(truncateText(rawTopic.toUpperCase(), 58));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#1e293b" stroke-width="1" stroke-opacity="0.55" />
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#grid)" />
  <rect x="0" y="0" width="1200" height="8" fill="url(#accent)" />
  <circle cx="1050" cy="130" r="220" fill="#2563eb" fill-opacity="0.12" />
  <circle cx="160" cy="520" r="240" fill="#06b6d4" fill-opacity="0.08" />
  <g transform="translate(88, 96)">
    <rect x="0" y="0" width="64" height="64" rx="16" fill="#2563eb" />
    <path d="M20 20h10a6 6 0 0 1 6 6v22a4.5 4.5 0 0 0-4.5-4.5H20V20zm24 0H34a6 6 0 0 0-6 6v22a4.5 4.5 0 0 1 4.5-4.5H44V20z" stroke="#ffffff" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <text x="84" y="38" fill="#60a5fa" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" letter-spacing="1.5">PERSONAL NOTES CMS</text>
    <text x="84" y="60" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600">${topicLabel}</text>
  </g>
  <g transform="translate(88, 265)">
    <text x="0" y="0" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="50" font-weight="800" letter-spacing="-1">${line1}</text>
    <text x="0" y="72" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="25" font-weight="400">Explore comprehensive, self-contained technical references,</text>
    <text x="0" y="110" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="25" font-weight="400">system design patterns, and engineering handbooks.</text>
  </g>
  <g transform="translate(88, 495)">
    <rect x="0" y="0" width="180" height="44" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
    <text x="90" y="28" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="16" font-weight="600">System Design</text>
    <rect x="196" y="0" width="230" height="44" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
    <text x="311" y="28" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="16" font-weight="600">Software Architecture</text>
    <rect x="442" y="0" width="195" height="44" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
    <text x="540" y="28" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="16" font-weight="600">Design Patterns</text>
    <rect x="653" y="0" width="215" height="44" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
    <text x="760" y="28" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="16" font-weight="600">Developer Handbooks</text>
  </g>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  });

  // Helper to inject topic/chapter SEO meta tags & JSON-LD into index.html for crawlers
  const injectSeoHtml = (html: string, req: express.Request): string => {
    const origin = getRequestOrigin(req);
    const defaultTitle = 'Personal Notes CMS | Senior & Staff Engineering Handbooks';
    const defaultDesc =
      'Explore comprehensive, self-contained technical references, system design patterns, and engineering handbooks.';

    const pathSegments = req.path.replace(/^\/+/, '').split('/').filter(Boolean);
    let matchedTopic: (typeof store.topics)[number] | undefined;
    let matchedChapter: (typeof store.chapters)[number] | undefined;

    if (pathSegments[0] === 'topic' && pathSegments.length >= 2) {
      const topicRef = decodeURIComponent(pathSegments[1]).toLowerCase();
      matchedTopic = store.topics.find(
        (t) =>
          t.id.toLowerCase() === topicRef ||
          (t.slug && t.slug.toLowerCase() === topicRef) ||
          toSeoSlugServer(t.name) === topicRef
      );
      if (pathSegments[2]) {
        const chapRef = decodeURIComponent(pathSegments[2]).toLowerCase();
        const pool = matchedTopic
          ? store.chapters.filter((c) => c.topicId === matchedTopic!.id)
          : store.chapters;
        matchedChapter =
          pool.find(
            (c) =>
              c.id.toLowerCase() === chapRef ||
              (c.slug && c.slug.toLowerCase() === chapRef) ||
              toSeoSlugServer(c.title) === chapRef
          ) ||
          store.chapters.find(
            (c) =>
              c.id.toLowerCase() === chapRef ||
              (c.slug && c.slug.toLowerCase() === chapRef) ||
              toSeoSlugServer(c.title) === chapRef
          );
      }
    }

    const pageTitle = matchedChapter
      ? matchedTopic
        ? `${matchedChapter.title} – ${matchedTopic.name} | Personal Notes CMS`
        : `${matchedChapter.title} | Personal Notes CMS`
      : matchedTopic
      ? `${matchedTopic.name} Handbooks & Notes | Personal Notes CMS`
      : defaultTitle;

    const pageDesc = matchedChapter
      ? extractCleanSummaryServer(
          matchedChapter.publishedHtml || matchedChapter.draftHtml,
          matchedTopic?.description || defaultDesc
        )
      : matchedTopic?.description
      ? extractCleanSummaryServer(matchedTopic.description, defaultDesc)
      : defaultDesc;

    const topicSlug = matchedTopic
      ? matchedTopic.slug || toSeoSlugServer(matchedTopic.name) || matchedTopic.id
      : '';
    const chapSlug = matchedChapter
      ? matchedChapter.slug || toSeoSlugServer(matchedChapter.title) || matchedChapter.id
      : '';

    const canonicalUrl = matchedChapter
      ? `${origin}/topic/${encodeURIComponent(topicSlug || 'notes')}/${encodeURIComponent(chapSlug)}`
      : matchedTopic
      ? `${origin}/topic/${encodeURIComponent(topicSlug)}`
      : `${origin}/`;

    const ogImageUrl =
      matchedChapter || matchedTopic
        ? `${origin}/og-image.svg?title=${encodeURIComponent(
            matchedChapter?.title || matchedTopic?.name || 'Personal Notes CMS'
          )}&topic=${encodeURIComponent(matchedTopic?.name || 'Engineering Handbook')}`
        : `${origin}/og-image.svg`;

    const ogType = matchedChapter ? 'article' : 'website';

    return html
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeXml(pageTitle)}</title>`)
      .replace(
        /<meta name="description" content="[^"]*"\s*\/>/i,
        `<meta name="description" content="${escapeXml(pageDesc)}" />`
      )
      .replace(
        /<link rel="canonical" href="[^"]*"\s*\/>/i,
        `<link rel="canonical" href="${escapeXml(canonicalUrl)}" />`
      )
      .replace(
        /<meta property="og:title" content="[^"]*"\s*\/>/i,
        `<meta property="og:title" content="${escapeXml(pageTitle)}" />`
      )
      .replace(
        /<meta property="og:description" content="[^"]*"\s*\/>/i,
        `<meta property="og:description" content="${escapeXml(pageDesc)}" />`
      )
      .replace(
        /<meta property="og:type" content="[^"]*"\s*\/>/i,
        `<meta property="og:type" content="${ogType}" />`
      )
      .replace(
        /<meta property="og:url" content="[^"]*"\s*\/>/i,
        `<meta property="og:url" content="${escapeXml(canonicalUrl)}" />`
      )
      .replace(
        /<meta property="og:image" content="[^"]*"\s*\/>/i,
        `<meta property="og:image" content="${escapeXml(ogImageUrl)}" />`
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*"\s*\/>/i,
        `<meta name="twitter:title" content="${escapeXml(pageTitle)}" />`
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*"\s*\/>/i,
        `<meta name="twitter:description" content="${escapeXml(pageDesc)}" />`
      )
      .replace(
        /<meta name="twitter:image" content="[^"]*"\s*\/>/i,
        `<meta name="twitter:image" content="${escapeXml(ogImageUrl)}" />\n    <link rel="canonical" href="${escapeXml(canonicalUrl)}" />`
      );
  };

  // Vite middleware in development vs Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.get(['/', '/topic/:topicSlug', '/topic/:topicSlug/:chapterSlug'], async (req, res, next) => {
      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(injectSeoHtml(transformed, req));
      } catch (e) {
        next(e);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        res.status(200).set({ 'Content-Type': 'text/html' }).send(injectSeoHtml(rawHtml, req));
      } else {
        res.sendFile(indexPath);
      }
    });
  }

  // Startup sync: Pull latest production data into local database if configured
  if (isExternalLiveConfigured) {
    try {
      console.log(`[Startup] Authoritative DB sync from ${LIVE_SITE_ORIGIN}...`);
      const syncRes = await pullFromLiveSite({ authoritative: true });
      console.log(`[Startup] ${syncRes.message}`);
    } catch (err) {
      console.warn('[Startup] Warning: Live site sync failed on startup:', err);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CMS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
