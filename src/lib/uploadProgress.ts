/**
 * Helper utilities for tracking and visualizing file upload and read progress.
 * Supports byte-level calculation, smooth frame interpolation for responsive UI,
 * and standard byte formatting.
 */

export interface FileUploadProgressState {
  isUploading: boolean;
  fileName: string;
  fileSize: number;
  progress: number; // 0 to 100
  bytesLoaded: number;
  bytesTotal: number;
  phase: 'idle' | 'reading' | 'uploading' | 'processing' | 'done' | 'error';
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
 * Format bytes into human-readable string (e.g. "45.2 KB", "1.8 MB")
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Read a File as text with high-fidelity, smooth progress reporting.
 * Ensures the user visibly perceives the upload progress from 0% -> 100%
 * even on instant disk reads, without stalling.
 */
export function readFileWithProgress(
  file: File,
  onProgress?: (progress: number, loaded: number, total: number) => void,
  minDurationMs: number = 420
): Promise<string> {
  return new Promise((resolve, reject) => {
    const totalBytes = file.size || 1;
    let currentProgress = 0;
    const startTime = performance.now();
    let animFrameId: number | null = null;
    let fileContent: string | null = null;
    let isReadDone = false;

    // Report initial 0%
    if (onProgress) onProgress(0, 0, totalBytes);

    const updateSmoothTick = () => {
      const elapsed = performance.now() - startTime;
      const timeRatio = Math.min(elapsed / minDurationMs, 1);
      
      // Smooth ease-out cubic curve for visual progression
      const easeProgress = Math.round((1 - Math.pow(1 - timeRatio, 3)) * (isReadDone ? 100 : 92));
      currentProgress = Math.max(currentProgress, easeProgress);
      
      const loadedBytes = Math.round((currentProgress / 100) * totalBytes);
      if (onProgress) onProgress(currentProgress, loadedBytes, totalBytes);

      if (isReadDone && (elapsed >= minDurationMs || currentProgress >= 100)) {
        if (onProgress) onProgress(100, totalBytes, totalBytes);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        resolve(fileContent || '');
        return;
      }

      animFrameId = requestAnimationFrame(updateSmoothTick);
    };

    animFrameId = requestAnimationFrame(updateSmoothTick);

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
    };

    reader.onerror = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      reject(reader.error || new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
