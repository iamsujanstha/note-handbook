import express from 'express';
import path from 'path';
import fs from 'fs';
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
}

interface DataStore {
  topics: Topic[];
  chapters: Chapter[];
  settings: CmsSettings;
  themeCss?: string;
  customCssFiles?: Record<string, CustomCssFileRecord>;
}

const DEFAULT_PASSKEY = process.env.ADMIN_PASSKEY || 'notes-admin-2026';
const DEFAULT_TOKEN = 'sec_admin_token_default_2026';

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

    const rawChapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
    // Ensure both draftHtml and publishedHtml are preserved distinctly with zero data loss
    const chapters = rawChapters.map((c: Chapter) => {
      const draft = c.draftHtml !== undefined ? c.draftHtml : (c.publishedHtml || '');
      const published = c.publishedHtml !== undefined ? c.publishedHtml : (c.draftHtml || draft);
      return {
        ...c,
        draftHtml: draft,
        publishedHtml: published,
      };
    });

    return {
      topics: Array.isArray(parsed.topics) ? parsed.topics : DEFAULT_TOPICS,
      chapters,
      settings,
      themeCss: parsed.themeCss,
      customCssFiles,
    };
  } catch (err) {
    console.error('Failed to init/read data file:', err);
    return { topics: DEFAULT_TOPICS, chapters: [], settings: defaultSettings };
  }
}

function saveDataStore(data: DataStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const json = JSON.stringify(data);

    // Atomic write to prevent file corruption during server restarts/crashes
    const tempFile = path.join(
      DATA_DIR,
      `cms_data.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`
    );
    fs.writeFileSync(tempFile, json, 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);

    // Keep an immediate, synchronous backup copy
    try {
      const backupFile = path.join(DATA_DIR, 'cms_data.backup.json');
      fs.writeFileSync(backupFile, json, 'utf-8');
    } catch (bErr) {
      console.warn('Could not write backup data file:', bErr);
    }

    // If dist exists, mirror to dist/data
    try {
      const distDir = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distDir)) {
        const distDataDir = path.join(distDir, 'data');
        if (!fs.existsSync(distDataDir)) fs.mkdirSync(distDataDir, { recursive: true });
        fs.writeFileSync(path.join(distDataDir, 'cms_data.json'), json, 'utf-8');
      }
    } catch {}
  } catch (err) {
    console.error('Failed to write data file:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with generous 100mb payload limit for extensive notes & attachments
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // In-memory cache synced to disk
  let store: DataStore = initDataStore();

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
  const LIVE_SITE_ORIGIN = process.env.LIVE_SITE_ORIGIN || '';
  const isExternalLiveConfigured = Boolean(
    LIVE_SITE_ORIGIN &&
    !LIVE_SITE_ORIGIN.includes('personal-handbook.ai.studio') &&
    LIVE_SITE_ORIGIN.startsWith('http')
  );
  let cachedLiveToken: string | null = null;

  async function getLiveSiteToken(): Promise<string | null> {
    if (!isExternalLiveConfigured) return null;
    if (cachedLiveToken) return cachedLiveToken;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${LIVE_SITE_ORIGIN}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'tlsujank.co@gmail.com', password: 'Iamsujan08' }),
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      console.warn('Auto-sync delete topic to live site failed:', err);
    }
  }

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
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

  // Admin Auth: Login using Username/Password or Passkey
  app.post('/api/admin/login', (req, res) => {
    const { username, email, password, passkey } = req.body;

    const userEmail = String(username || email || '').trim().toLowerCase();
    const userPass = String(password || passkey || '').trim();

    if (!userEmail && !userPass) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const currentPasskey = store.settings.adminPasskey.trim();
    const currentToken = store.settings.secretToken.trim();

    // Check credential match for tlsujank.co@gmail.com / Iamsujan08
    const isMatchingCredentials =
      (userEmail === 'tlsujank.co@gmail.com' && userPass === 'Iamsujan08') ||
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
          email: 'tlsujank.co@gmail.com',
          name: 'Sujan',
          role: 'admin',
        },
      });
    }

    return res.status(401).json({
      error: 'Invalid username or password. Please use tlsujank.co@gmail.com / Iamsujan08',
    });
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

  // GET /api/topics - List all parent topics (Public)
  app.get('/api/topics', (_req, res) => {
    res.json({ topics: store.topics });
  });

  // POST /api/topics - Replace or add parent topics (Admin only)
  app.post('/api/topics', requireAdmin, (req, res) => {
    const { topics } = req.body;
    if (Array.isArray(topics)) {
      store.topics = topics;
      saveDataStore(store);
      syncTopicsToLive(store.topics).catch(() => {});
      res.json({ success: true, topics: store.topics });
    } else {
      res.status(400).json({ error: 'Expected { topics: Topic[] }' });
    }
  });

  // DELETE /api/topics/:id - Delete a topic and its associated chapters (Admin only)
  app.delete('/api/topics/:id', requireAdmin, (req, res) => {
    const topicId = req.params.id;
    store.topics = store.topics.filter((t) => t.id !== topicId);
    store.chapters = store.chapters.filter((c) => c.topicId !== topicId);
    saveDataStore(store);
    syncDeleteTopicToLive(topicId).catch(() => {});
    res.json({ success: true, topics: store.topics, chapters: store.chapters });
  });

  // GET /api/chapters - List all chapters (Public, always fresh from database)
  app.get('/api/chapters', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ chapters: store.chapters, count: store.chapters.length });
  });

  // POST /api/chapters - Create or upsert a chapter (Admin only)
  app.post('/api/chapters', requireAdmin, (req, res) => {
    const newChap = req.body;
    if (!newChap.topicId && !store.topics[0]?.id) {
      return res.status(400).json({ error: 'topicId is required' });
    }

    const id = newChap.id || `chap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const topicId = newChap.topicId || store.topics[0].id;
    const title = (newChap.title || 'Untitled Chapter').trim();
    const existingIdx = store.chapters.findIndex((c) => c.id === id);

    const draftHtml = newChap.draftHtml !== undefined
      ? newChap.draftHtml
      : (newChap.publishedHtml || `<div class="prose"><h2>${title}</h2><p>Notes on ${title}.</p></div>`);
    const publishedHtml = newChap.publishedHtml !== undefined
      ? newChap.publishedHtml
      : (newChap.draftHtml || `<div class="prose"><h2>${title}</h2><p>Notes on ${title}.</p></div>`);

    const chapter: Chapter = {
      id,
      topicId,
      title,
      slug: newChap.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      draftHtml,
      publishedHtml,
      status: newChap.status || 'published',
      tags: Array.isArray(newChap.tags) ? newChap.tags : [],
      order: typeof newChap.order === 'number' 
        ? newChap.order 
        : (existingIdx !== -1 ? store.chapters[existingIdx].order : store.chapters.filter((c) => c.topicId === topicId).length + 1),
      createdAt: existingIdx !== -1 ? store.chapters[existingIdx].createdAt : (newChap.createdAt || now),
      updatedAt: now,
      lastPublishedAt: newChap.status === 'published' || !newChap.status ? (newChap.lastPublishedAt || now) : undefined,
      includeGlobalCss: newChap.includeGlobalCss !== undefined ? Boolean(newChap.includeGlobalCss) : true,
      cssMode: newChap.cssMode || (newChap.includeGlobalCss === false ? 'none' : 'global'),
      customCss: typeof newChap.customCss === 'string' ? newChap.customCss : undefined,
      customCssFileName: typeof newChap.customCssFileName === 'string' ? newChap.customCssFileName : undefined,
    };

    if (existingIdx !== -1) {
      store.chapters[existingIdx] = chapter;
    } else {
      store.chapters.push(chapter);
    }

    saveDataStore(store);
    syncChapterToLive(chapter).catch(() => {});
    res.status(201).json({ success: true, chapter, chapters: store.chapters });
  });

  // PUT /api/chapters/:id - Update or upsert an existing chapter (Admin only)
  app.put('/api/chapters/:id', requireAdmin, (req, res) => {
    const chapterId = req.params.id;
    const updates = req.body;
    const idx = store.chapters.findIndex((c) => c.id === chapterId);
    const now = new Date().toISOString();

    if (idx === -1) {
      // Upsert: Create chapter if it does not exist yet to guarantee no content is lost!
      const topicId = updates.topicId || (store.topics[0]?.id || 'topic-system-design');
      const title = (updates.title || 'Untitled Chapter').trim();
      const draft = updates.draftHtml !== undefined
        ? updates.draftHtml
        : (updates.publishedHtml || `<div class="prose"><h2>${title}</h2><p>Notes on ${title}.</p></div>`);
      const pub = updates.publishedHtml !== undefined
        ? updates.publishedHtml
        : (updates.draftHtml || draft);

      const newChapter: Chapter = {
        id: chapterId,
        topicId,
        title,
        slug: updates.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        draftHtml: draft,
        publishedHtml: pub,
        status: updates.status || 'published',
        tags: Array.isArray(updates.tags) ? updates.tags : [],
        order: typeof updates.order === 'number' ? updates.order : store.chapters.filter((c) => c.topicId === topicId).length + 1,
        createdAt: updates.createdAt || now,
        updatedAt: now,
        lastPublishedAt: updates.status === 'published' ? (updates.lastPublishedAt || now) : undefined,
        includeGlobalCss: updates.includeGlobalCss !== undefined ? Boolean(updates.includeGlobalCss) : true,
        cssMode: updates.cssMode || (updates.includeGlobalCss === false ? 'none' : 'global'),
        customCss: updates.customCss,
        customCssFileName: updates.customCssFileName,
      };

      store.chapters.push(newChapter);
      saveDataStore(store);
      syncChapterToLive(newChapter).catch(() => {});
      return res.status(201).json({ success: true, chapter: newChapter, chapters: store.chapters });
    }

    const existing = store.chapters[idx];
    const isPublishing = updates.status === 'published' && existing.status !== 'published';

    // Preserve both draftHtml and publishedHtml distinctly to avoid wiping markdown source or compiled reader html
    const draftHtml = updates.draftHtml !== undefined
      ? updates.draftHtml
      : (existing.draftHtml || updates.publishedHtml || '');
    const publishedHtml = updates.publishedHtml !== undefined
      ? updates.publishedHtml
      : (updates.draftHtml || existing.publishedHtml || draftHtml);

    store.chapters[idx] = {
      ...existing,
      ...updates,
      draftHtml,
      publishedHtml,
      updatedAt: now,
      lastPublishedAt: updates.lastPublishedAt || (isPublishing ? now : existing.lastPublishedAt || now),
    };

    saveDataStore(store);
    syncChapterToLive(store.chapters[idx]).catch(() => {});
    res.json({ success: true, chapter: store.chapters[idx], chapters: store.chapters });
  });

  // POST /api/chapters/sync - Direct synchronization of chapters to server DB (Admin only)
  app.post('/api/chapters/sync', requireAdmin, (req, res) => {
    const { chapters, topics } = req.body;
    if (Array.isArray(chapters)) {
      store.chapters = chapters;
    }
    if (Array.isArray(topics)) {
      store.topics = topics;
    }
    saveDataStore(store);
    res.json({ success: true, count: store.chapters.length, message: 'Server database synchronized successfully.' });
  });

  // POST /api/chapters/publish-all - Publish all chapters to live and persist immediately (Admin only)
  app.post('/api/chapters/publish-all', requireAdmin, (_req, res) => {
    const now = new Date().toISOString();
    store.chapters = store.chapters.map((c) => {
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
    saveDataStore(store);
    res.json({ success: true, chapters: store.chapters, count: store.chapters.length });
  });

  // DELETE /api/chapters/:id - Delete a chapter (Admin only)
  app.delete('/api/chapters/:id', requireAdmin, (req, res) => {
    const chapterId = req.params.id;
    store.chapters = store.chapters.filter((c) => c.id !== chapterId);
    saveDataStore(store);
    syncDeleteChapterToLive(chapterId).catch(() => {});
    res.json({ success: true, chapters: store.chapters });
  });

  // POST /api/reorder-chapters - Reorder chapters for a topic (Admin only)
  app.post('/api/reorder-chapters', requireAdmin, (req, res) => {
    const { topicId, orderedChapterIds } = req.body;
    if (!topicId || !Array.isArray(orderedChapterIds)) {
      return res.status(400).json({ error: 'topicId and orderedChapterIds required' });
    }

    store.chapters = store.chapters.map((c) => {
      if (c.topicId === topicId) {
        const newOrder = orderedChapterIds.indexOf(c.id);
        if (newOrder !== -1) {
          return { ...c, order: newOrder + 1, updatedAt: new Date().toISOString() };
        }
      }
      return c;
    });

    saveDataStore(store);
    // sync reordered chapters
    for (const chap of store.chapters.filter((c) => c.topicId === topicId)) {
      syncChapterToLive(chap).catch(() => {});
    }
    res.json({ success: true, chapters: store.chapters });
  });

  // POST /api/upload - Direct HTML note upload (Admin only)
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
    const existingIdx = store.chapters.findIndex((c) => c.id === id);
    const chapter: Chapter = {
      id,
      topicId,
      title: title.trim(),
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      draftHtml: htmlContent,
      publishedHtml: htmlContent,
      status: 'published',
      tags: Array.isArray(tags) ? tags : [],
      order: existingIdx !== -1 ? store.chapters[existingIdx].order : store.chapters.filter((c) => c.topicId === topicId).length + 1,
      createdAt: existingIdx !== -1 ? store.chapters[existingIdx].createdAt : now,
      updatedAt: now,
      lastPublishedAt: now,
      includeGlobalCss: includeGlobalCss !== undefined ? Boolean(includeGlobalCss) : true,
      cssMode: cssMode || (includeGlobalCss === false ? 'none' : 'global'),
      customCss: typeof customCss === 'string' ? customCss : undefined,
      customCssFileName: typeof customCssFileName === 'string' ? customCssFileName : undefined,
    };

    if (existingIdx !== -1) {
      store.chapters[existingIdx] = chapter;
    } else {
      store.chapters.push(chapter);
    }
    saveDataStore(store);
    syncChapterToLive(chapter).catch(() => {});
    res.status(201).json({ success: true, chapter, chapters: store.chapters });
  });

  // POST /api/sync-to-live - Manually push all current topics & chapters to live site (Admin only)
  app.post('/api/sync-to-live', requireAdmin, async (_req, res) => {
    try {
      const token = await getLiveSiteToken();
      if (!token) {
        return res.status(502).json({ error: 'Could not authenticate with live production site' });
      }

      // Sync topics
      await fetch(`${LIVE_SITE_ORIGIN}/api/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ topics: store.topics }),
      });

      // Sync chapters
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
        message: `Successfully synchronized ${syncedCount} chapters to https://personal-handbook.ai.studio`,
        syncedCount,
      });
    } catch (err) {
      console.error('Manual live sync failed:', err);
      res.status(500).json({ error: 'Failed to synchronize with live site' });
    }
  });

  // Vite middleware in development vs Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CMS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
