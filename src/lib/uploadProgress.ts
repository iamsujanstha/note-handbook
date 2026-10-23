export interface FileUploadProgressState {
  isUploading: boolean;
  fileName: string;
  fileSize: number;
  progress: number; // 0 to 100
  bytesLoaded: number;
  bytesTotal: number;
  phase: 'idle' | 'reading' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
}

export const initialUploadProgressState: FileUploadProgressState = {
  isUploading: false,
  fileName: '',
  fileSize: 0,
  progress: 0,
  bytesLoaded: 0,
  bytesTotal: 0,
  phase: 'idle',
};

/**
 * Format byte count into human-readable KB / MB string
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Read a File as text with high-fidelity, smooth progress reporting.
 * Uses a reliable interval timer rather than requestAnimationFrame so it never stalls
 * when the browser window or iframe loses focus to the native file picker dialog.
 */
export function readFileWithProgress(
  file: File,
  onProgress?: (progress: number, loaded: number, total: number) => void,
  minDurationMs: number = 180
): Promise<string> {
  return new Promise((resolve, reject) => {
    const totalBytes = file.size || 1;
    let currentProgress = 0;
    const startTime = Date.now();
    let timerId: ReturnType<typeof setInterval> | null = null;
    let fileContent: string | null = null;
    let isReadDone = false;
    let settled = false;

    const cleanup = () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const finishIfReady = () => {
      if (settled || !isReadDone) return;
      const elapsed = Date.now() - startTime;
      if (elapsed >= minDurationMs || currentProgress >= 100) {
        settled = true;
        cleanup();
        if (onProgress) onProgress(100, totalBytes, totalBytes);
        resolve(fileContent ?? '');
      }
    };

    // Report initial 0%
    if (onProgress) onProgress(0, 0, totalBytes);

    timerId = setInterval(() => {
      if (settled) return;
      const elapsed = Date.now() - startTime;
      const timeRatio = Math.min(elapsed / Math.max(minDurationMs, 1), 1);

      const easeProgress = Math.round((1 - Math.pow(1 - timeRatio, 3)) * (isReadDone ? 100 : 92));
      currentProgress = Math.max(currentProgress, easeProgress);

      const loadedBytes = Math.round((currentProgress / 100) * totalBytes);
      if (onProgress) onProgress(currentProgress, loadedBytes, totalBytes);

      finishIfReady();
    }, 25);

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        const rawPct = Math.round((e.loaded / e.total) * 90);
        currentProgress = Math.max(currentProgress, rawPct);
        const loaded = Math.round((currentProgress / 100) * totalBytes);
        if (onProgress) onProgress(currentProgress, loaded, totalBytes);
      }
    };

    reader.onload = (e) => {
      fileContent = (e.target?.result as string) || '';
      isReadDone = true;
      finishIfReady();
    };

    reader.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(reader.error || new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
