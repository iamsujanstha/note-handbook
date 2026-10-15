import { Topic, Chapter, User } from '../types';
import {
  getStoredTopics,
  saveStoredTopics,
  getStoredChapters,
  saveStoredChapters,
  getStoredAdminToken,
  setStoredAdminToken,
  setStoredAdminPasskey,
} from './storage';

function getAdminHeaders(): Record<string, string> {
  const token = getStoredAdminToken() || 'notes-admin-2026';
  return {
    'Content-Type': 'application/json',
    'x-admin-token': token,
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Log in as Admin using Username & Password or Passkey
 */
export async function loginAdminApi(usernameOrPasskey: string, password?: string): Promise<{
  success: boolean;
  token?: string;
  passkey?: string;
  user?: User;
  error?: string;
}> {
  try {
    const payload = password !== undefined
      ? { username: usernameOrPasskey, password }
      : { passkey: usernameOrPasskey };

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.token) setStoredAdminToken(data.token);
      if (data.passkey) setStoredAdminPasskey(data.passkey);
      return { success: true, token: data.token, passkey: data.passkey, user: data.user };
    }
    return { success: false, error: data.error || 'Failed to authenticate admin' };
  } catch (err) {
    return { success: false, error: 'Network error or server unreachable' };
  }
}

/**
 * Verify currently saved token or a magic link key
 */
export async function verifyAdminTokenApi(tokenOrKey?: string): Promise<{
  valid: boolean;
  token?: string;
  passkey?: string;
  user?: User;
}> {
  try {
    const token = tokenOrKey || getStoredAdminToken();
    if (!token) return { valid: false };

    const res = await fetch(`/api/admin/verify?key=${encodeURIComponent(token)}`, {
      headers: {
        'x-admin-token': token,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        if (data.token) setStoredAdminToken(data.token);
        if (data.passkey) setStoredAdminPasskey(data.passkey);
        return { valid: true, token: data.token, passkey: data.passkey, user: data.user };
      }
    }
  } catch (err) {
    console.warn('Could not verify admin token with server:', err);
  }
  return { valid: false };
}

/**
 * Change Master Admin Passkey (Admin only)
 */
export async function changeAdminPasskeyApi(newPasskey: string): Promise<{
  success: boolean;
  passkey?: string;
  token?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/change-passkey', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ newPasskey }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.token) setStoredAdminToken(data.token);
      if (data.passkey) setStoredAdminPasskey(data.passkey);
      return { success: true, passkey: data.passkey, token: data.token };
    }
    return { success: false, error: data.error || 'Failed to update admin passkey' };
  } catch (err) {
    return { success: false, error: 'Network error when updating passkey' };
  }
}

/**
 * Fetch all parent topics from server API, falling back to localStorage
 */
export async function fetchTopics(): Promise<Topic[]> {
  try {
    const res = await fetch('/api/topics');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.topics)) {
      saveStoredTopics(data.topics);
      return data.topics;
    }
  } catch (err) {
    console.warn('Could not fetch topics from server API, using local cache:', err);
  }
  return getStoredTopics();
}

/**
 * Save parent topics list to server API and local storage
 */
export async function saveTopicsApi(topics: Topic[]): Promise<Topic[]> {
  saveStoredTopics(topics);
  try {
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ topics }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.topics)) {
        saveStoredTopics(data.topics);
        return data.topics;
      }
    }
  } catch (err) {
    console.error('Failed to sync topics to server:', err);
  }
  return topics;
}

/**
 * Delete a topic from server API and local storage
 */
export async function deleteTopicApi(topicId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/topics/${encodeURIComponent(topicId)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to delete topic from server:', err);
    return false;
  }
}

/**
 * Fetch all chapters from server API, falling back to localStorage
 */
export async function fetchChapters(): Promise<Chapter[]> {
  try {
    const res = await fetch(`/api/chapters?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.chapters)) {
      saveStoredChapters(data.chapters);
      return data.chapters;
    }
  } catch (err) {
    console.warn('Could not fetch chapters from server API, using local cache:', err);
  }
  return getStoredChapters();
}

/**
 * Create a new chapter on the server API (published to users by default)
 */
export async function createChapterApi(chapter: Partial<Chapter>): Promise<Chapter | null> {
  try {
    const res = await fetch('/api/chapters', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(chapter),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.chapter) {
        if (Array.isArray(data.chapters)) {
          saveStoredChapters(data.chapters);
        }
        return data.chapter;
      }
    }
  } catch (err) {
    console.error('Failed to create chapter on server:', err);
  }
  return null;
}

/**
 * Update an existing chapter on server API (draft or published)
 * If chapter doesn't exist, automatically falls back to createChapterApi
 */
export async function updateChapterApi(
  chapterId: string,
  updates: Partial<Chapter>
): Promise<Chapter | null> {
  try {
    const res = await fetch(`/api/chapters/${encodeURIComponent(chapterId)}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.chapter) {
        if (Array.isArray(data.chapters)) {
          saveStoredChapters(data.chapters);
        }
        return data.chapter;
      }
    } else if (res.status === 404) {
      // Fallback create
      return createChapterApi({ id: chapterId, ...updates });
    }
  } catch (err) {
    console.error('Failed to update chapter on server, attempting fallback:', err);
    try {
      return createChapterApi({ id: chapterId, ...updates });
    } catch {}
  }
  return null;
}

/**
 * Publish all chapters to live and persist on server
 */
export async function publishAllChaptersApi(): Promise<Chapter[]> {
  try {
    const res = await fetch('/api/chapters/publish-all', {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.chapters)) {
        saveStoredChapters(data.chapters);
        return data.chapters;
      }
    }
  } catch (err) {
    console.error('Failed to publish all chapters:', err);
  }
  return getStoredChapters();
}

/**
 * Delete a chapter from server API
 */
export async function deleteChapterApi(chapterId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/chapters/${encodeURIComponent(chapterId)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to delete chapter on server:', err);
    return false;
  }
}

/**
 * Reorder chapters within a topic on the server API
 */
export async function reorderChaptersApi(
  topicId: string,
  orderedChapterIds: string[]
): Promise<boolean> {
  try {
    const res = await fetch('/api/reorder-chapters', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ topicId, orderedChapterIds }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to reorder chapters on server:', err);
    return false;
  }
}

/**
 * Helper to perform XMLHttpRequest with real-time upload progress reporting
 */
export function postWithProgress<T>(
  url: string,
  payload: any,
  headers: Record<string, string>,
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          const percent = Math.min(Math.round((evt.loaded / evt.total) * 100), 99);
          onProgress(percent, evt.loaded, evt.total);
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100, 1, 1);
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText as any);
        }
      } else {
        try {
          reject(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error(`Server returned HTTP ${xhr.status}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network connection error'));
    xhr.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
  });
}

/**
 * Directly synchronize full chapter list and topics to server DB
 */
export async function syncChaptersApi(
  chapters: Chapter[],
  topics?: Topic[]
): Promise<boolean> {
  try {
    const res = await fetch('/api/chapters/sync', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ chapters, topics }),
    });
    if (res.ok) {
      saveStoredChapters(chapters);
      if (topics) saveStoredTopics(topics);
      return true;
    }
  } catch (err) {
    console.error('Failed to sync chapters to server DB:', err);
  }
  return false;
}

/**
 * Direct upload of an HTML note, published immediately to all users
 */
export async function uploadHtmlChapterApi(
  topicId: string,
  title: string,
  htmlContent: string,
  tags: string[] = [],
  onProgress?: (percent: number, loaded: number, total: number) => void,
  options?: {
    id?: string;
    includeGlobalCss?: boolean;
    cssMode?: 'global' | 'none' | 'custom';
    customCss?: string;
    customCssFileName?: string;
  }
): Promise<Chapter | null> {
  try {
    const data = await postWithProgress<{ chapter?: Chapter; chapters?: Chapter[] }>(
      '/api/upload',
      {
        id: options?.id,
        topicId,
        title,
        htmlContent,
        tags,
        includeGlobalCss: options?.includeGlobalCss,
        cssMode: options?.cssMode,
        customCss: options?.customCss,
        customCssFileName: options?.customCssFileName,
      },
      getAdminHeaders(),
      onProgress
    );
    if (data?.chapter) {
      if (Array.isArray(data.chapters)) {
        saveStoredChapters(data.chapters);
      }
      return data.chapter;
    }
  } catch (err) {
    console.error('Failed to upload HTML note to server:', err);
  }
  return null;
}

/**
 * Synchronize all topics and chapters to personal-handbook.ai.studio
 */
export async function syncToLiveSiteApi(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/sync-to-live', {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to sync with live site' };
  } catch (err) {
    return { success: false, error: 'Network error communicating with server' };
  }
}

/**
 * Fetch the active global CSS theme content and filename
 */
export async function fetchGlobalCssApi(): Promise<{ filename: string; cssContent: string; size?: number } | null> {
  try {
    const res = await fetch('/api/css');
    if (res.ok) {
      const data = await res.json();
      return {
        filename: data.filename || 'notes-theme.css',
        cssContent: data.cssContent || '',
        size: data.size,
      };
    }
    // Fallback: try fetching /notes-theme.css directly
    const directRes = await fetch('/notes-theme.css');
    if (directRes.ok) {
      const text = await directRes.text();
      return {
        filename: 'notes-theme.css',
        cssContent: text,
        size: text.length,
      };
    }
  } catch (err) {
    console.warn('Failed to fetch global CSS from server:', err);
  }
  return null;
}

/**
 * Fetch all available/uploaded CSS stylesheet files from server
 */
export async function fetchCssFilesApi(): Promise<{
  success: boolean;
  files: Array<{ filename: string; size: number; updatedAt: string; isGlobal: boolean }>;
  activeGlobal: string;
}> {
  try {
    const res = await fetch('/api/css/files');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch CSS files from server:', err);
  }
  return {
    success: true,
    files: [{ filename: 'notes-theme.css', size: 1024, updatedAt: new Date().toISOString(), isGlobal: true }],
    activeGlobal: 'notes-theme.css',
  };
}

/**
 * Upload or save a CSS stylesheet file.
 * setAsGlobal: when false, it saves the file as a custom stylesheet without overriding global theme!
 */
export async function uploadCssFileApi(
  cssContent: string,
  filename: string = 'notes-theme.css',
  setAsGlobal: boolean = false,
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<{ success: boolean; message?: string; size?: number; filename?: string; isGlobal?: boolean; error?: string }> {
  try {
    const data = await postWithProgress<any>(
      '/api/css/upload',
      { cssContent, filename, setAsGlobal },
      getAdminHeaders(),
      onProgress
    );
    if (data?.success) {
      return {
        success: true,
        message: data.message || 'CSS saved successfully',
        size: data.size,
        filename: data.filename || filename,
        isGlobal: data.isGlobal,
      };
    }
    return { success: false, error: data?.error || 'Failed to upload CSS' };
  } catch (err: any) {
    return { success: false, error: err?.error || err?.message || 'Network error while uploading CSS' };
  }
}

/**
 * Delete a custom stylesheet file
 */
export async function deleteCssFileApi(filename: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/css/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    return { success: !!data.success, error: data.error };
  } catch (err) {
    return { success: false, error: 'Network error while deleting CSS' };
  }
}

/**
 * Upload or update the global CSS stylesheet (notes-theme.css)
 */
export async function uploadGlobalCssApi(
  cssContent: string,
  filename: string = 'notes-theme.css'
): Promise<{ success: boolean; message?: string; size?: number; error?: string }> {
  return uploadCssFileApi(cssContent, filename, true);
}

/**
 * Reset global theme to default
 */
export async function resetGlobalCssApi(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/css/reset', {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    return { success: !!data.success, error: data.error };
  } catch (err) {
    return { success: false, error: 'Network error resetting CSS' };
  }
}

