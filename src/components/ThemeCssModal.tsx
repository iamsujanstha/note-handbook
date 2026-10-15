import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  Copy,
  Check,
  RotateCcw,
  Palette,
  FileCode,
  Sparkles,
  Eye,
  Code2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Trash2,
} from 'lucide-react';
import {
  fetchGlobalCssApi,
  fetchCssFilesApi,
  uploadCssFileApi,
  uploadGlobalCssApi,
  resetGlobalCssApi,
  deleteCssFileApi,
} from '../lib/api';
import { getStoredGlobalCss, saveStoredGlobalCss } from '../lib/storage';
import { UploadButton } from './UploadButton';
import { readFileWithProgress } from '../lib/uploadProgress';

interface ThemeCssModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
  activeChapterId?: string;
  activeChapterTitle?: string;
  onApplyCssToActiveChapter?: (cssContent: string, filename: string) => void;
}

export const ThemeCssModal: React.FC<ThemeCssModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
  activeChapterId,
  activeChapterTitle,
  onApplyCssToActiveChapter,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'library'>('editor');
  const [cssCode, setCssCode] = useState<string>('');
  const [filename, setFilename] = useState<string>('notes-theme.css');
  const [setAsGlobalOnSave, setSetAsGlobalOnSave] = useState<boolean>(true);
  const [libraryFiles, setLibraryFiles] = useState<
    Array<{ filename: string; size: number; updatedAt: string; isGlobal: boolean }>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasCopiedTag, setHasCopiedTag] = useState<boolean>(false);
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshLibrary = async () => {
    try {
      const data = await fetchCssFilesApi();
      if (data?.files) {
        setLibraryFiles(data.files);
      }
    } catch {}
  };

  // Load active CSS and stylesheet library from server on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    // Initial check from localStorage cache
    const cached = getStoredGlobalCss();
    if (cached) {
      setCssCode(cached);
    }

    // Fetch freshest from server
    Promise.all([fetchGlobalCssApi(), fetchCssFilesApi()])
      .then(([globalData, filesData]) => {
        if (!isMounted) return;
        if (globalData && globalData.cssContent) {
          setCssCode(globalData.cssContent);
          setFilename(globalData.filename || 'notes-theme.css');
          saveStoredGlobalCss(globalData.cssContent);
        }
        if (filesData && filesData.files) {
          setLibraryFiles(filesData.files);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch server CSS, using cached version:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyTag = () => {
    const tag = '<link rel="stylesheet" href="notes-theme.css">';
    navigator.clipboard.writeText(tag).then(() => {
      setHasCopiedTag(true);
      setTimeout(() => setHasCopiedTag(false), 2500);
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cssCode).then(() => {
      setHasCopiedCode(true);
      setTimeout(() => setHasCopiedCode(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([cssCode], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'notes-theme.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.css') && file.type !== 'text/css') {
      setErrorMsg('Please select a valid .css file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const text = await readFileWithProgress(
        file,
        (pct) => {
          setUploadProgress(pct);
        },
        450
      );

      if (typeof text === 'string') {
        setCssCode(text);
        setFilename(file.name || 'custom.css');
        setSetAsGlobalOnSave(file.name === 'notes-theme.css');
        setErrorMsg(null);
        onSuccessToast?.(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB) into editor.`);
      }
    } catch {
      setErrorMsg('Failed to read CSS file');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1200);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSave = async () => {
    if (!cssCode.trim()) {
      setErrorMsg('CSS code cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await uploadCssFileApi(cssCode, filename, setAsGlobalOnSave);
      if (res.success) {
        if (setAsGlobalOnSave) {
          saveStoredGlobalCss(cssCode);
          window.dispatchEvent(
            new CustomEvent('NOTES_GLOBAL_CSS_UPDATED', { detail: { css: cssCode } })
          );
        }
        setSaveSuccess(true);
        refreshLibrary();
        onSuccessToast?.(
          setAsGlobalOnSave
            ? 'Saved as Global Theme CSS! Notes referencing notes-theme.css are now styled.'
            : `Saved "${filename}" permanently as an individual stylesheet!`
        );
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMsg(res.error || 'Failed to save CSS on server.');
      }
    } catch (err) {
      setErrorMsg('Network error while saving CSS.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetAsGlobalFromLibrary = async (targetFilename: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/css/${encodeURIComponent(targetFilename)}`);
      if (!res.ok) throw new Error('Failed to read file');
      const text = await res.text();
      await uploadCssFileApi(text, 'notes-theme.css', true);
      saveStoredGlobalCss(text);
      window.dispatchEvent(
        new CustomEvent('NOTES_GLOBAL_CSS_UPDATED', { detail: { css: text } })
      );
      await refreshLibrary();
      onSuccessToast?.(`"${targetFilename}" is now the active Global Theme CSS!`);
    } catch {
      setErrorMsg(`Failed to set ${targetFilename} as global`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStylesheet = async (targetFilename: string) => {
    if (!window.confirm(`Delete stylesheet "${targetFilename}"?`)) return;
    try {
      const res = await deleteCssFileApi(targetFilename);
      if (res.success) {
        await refreshLibrary();
        onSuccessToast?.(`Deleted "${targetFilename}".`);
      } else {
        setErrorMsg(res.error || 'Failed to delete stylesheet');
      }
    } catch {
      setErrorMsg('Failed to delete stylesheet');
    }
  };

  const handleEditStylesheet = async (targetFilename: string) => {
    try {
      const res = await fetch(`/api/css/${encodeURIComponent(targetFilename)}`);
      if (res.ok) {
        const text = await res.text();
        setCssCode(text);
        setFilename(targetFilename);
        setSetAsGlobalOnSave(targetFilename === 'notes-theme.css');
        setActiveTab('editor');
        onSuccessToast?.(`Loaded "${targetFilename}" into CSS editor.`);
      }
    } catch {}
  };

  const handleReset = async () => {
    if (!window.confirm('Reset global stylesheet to default theme? Any custom modifications will be replaced.')) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await resetGlobalCssApi();
      if (res.success) {
        const fresh = await fetchGlobalCssApi();
        if (fresh) {
          setCssCode(fresh.cssContent);
          saveStoredGlobalCss(fresh.cssContent);
        }
        window.dispatchEvent(
          new CustomEvent('NOTES_GLOBAL_CSS_UPDATED', { detail: { css: fresh?.cssContent } })
        );
        onSuccessToast?.('Reset global CSS to clean default theme.');
      }
    } catch {
      setErrorMsg('Failed to reset CSS.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper template additions
  const insertSnippet = (snippet: string) => {
    setCssCode((prev) => `${prev}\n\n${snippet}`);
    onSuccessToast?.('Appended snippet to CSS!');
  };

  const lineCount = cssCode.split('\n').length;
  const byteSize = new Blob([cssCode]).size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[#ced0d4] overflow-hidden text-[#050505]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e6eb] bg-[#f7f8fa]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e7f3ff] text-[#1877f2] flex items-center justify-center border border-[#d8e4f8] shadow-2xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#050505] tracking-tight">
                  Global CSS Theme Manager
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live at /notes-theme.css
                </span>
              </div>
              <p className="text-xs text-[#65676b] mt-0.5">
                Upload or edit the global stylesheet so all your uploaded HTML notes look cohesive and never break.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#65676b] hover:text-[#050505] hover:bg-[#e4e6eb] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Tag Copy Banner */}
        <div className="px-5 py-2.5 bg-[#edf5ff] border-b border-[#d8e4f8] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#1c1e21]">
            <span className="font-bold text-[#1877f2] shrink-0">HTML Tag:</span>
            <code className="px-2 py-1 rounded-md bg-white border border-[#ccd0d5] text-[#1877f2] font-mono text-[11.5px] select-all">
              &lt;link rel="stylesheet" href="notes-theme.css"&gt;
            </code>
            <span className="text-[#65676b] text-[11px] hidden sm:inline">
              (or <code>href="/notes-theme.css"</code>) • Toggle per note in editor/reader
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTag}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-[#e7f3ff] text-[#1877f2] border border-[#d8e4f8] font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              {hasCopiedTag ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Tag!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy HTML Tag</span>
                </>
              )}
            </button>

            <a
              href="/notes-theme.css"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[#65676b] hover:text-[#1877f2] hover:bg-white text-[11px] font-semibold transition-colors"
              title="Open raw CSS in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Raw URL</span>
            </a>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-5 pt-3 pb-0 flex items-center justify-between border-b border-[#e4e6eb] bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'border-[#1877f2] text-[#1877f2]'
                  : 'border-transparent text-[#65676b] hover:text-[#050505]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>CSS Editor</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f0f2f5] text-[#65676b]">
                {lineCount} lines • {(byteSize / 1024).toFixed(1)} KB
              </span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'border-[#1877f2] text-[#1877f2]'
                  : 'border-transparent text-[#65676b] hover:text-[#050505]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Test Preview</span>
            </button>

            <button
              id="theme-modal-library-tab-btn"
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'border-[#1877f2] text-[#1877f2]'
                  : 'border-transparent text-[#65676b] hover:text-[#050505]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stylesheet Library</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f0f2f5] text-[#65676b]">
                {libraryFiles.length}
              </span>
            </button>
          </div>

          {/* Quick Upload Button */}
          <div className="flex items-center gap-2 pb-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".css,text/css"
              className="hidden"
              onChange={handleFileChange}
            />
            <UploadButton
              id="theme-css-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              isUploading={isUploading}
              progress={uploadProgress}
              label="Upload .css file"
              uploadingLabel="Uploading"
              doneLabel="Loaded!"
              variant="subtle"
              title="Upload a .css file from your device"
            />
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#fafbfc]">
          {activeTab === 'editor' ? (
            <div className="space-y-4">
              {/* Drag & Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative overflow-hidden p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#1877f2] bg-[#e7f3ff]/50 scale-[1.005]'
                    : isUploading
                    ? 'border-[#1877f2] bg-[#f0f4fa]'
                    : 'border-[#ced0d4] hover:border-[#1877f2] bg-white'
                }`}
              >
                {/* Background Progress Fill */}
                {isUploading && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[#1877f2]/10 transition-all duration-150 ease-out pointer-events-none"
                    style={{ width: `${Math.min(Math.max(uploadProgress, 0), 100)}%` }}
                  />
                )}

                <div className="relative z-10 w-8 h-8 rounded-lg bg-[#e7f3ff] text-[#1877f2] flex items-center justify-center shrink-0">
                  <Upload className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
                </div>
                <div className="relative z-10 text-left">
                  {isUploading ? (
                    <div>
                      <p className="text-xs font-bold text-[#1877f2] flex items-center gap-2">
                        <span>Uploading CSS file...</span>
                        <span className="font-mono text-sm">{Math.round(uploadProgress)}%</span>
                      </p>
                      <div className="w-48 h-1.5 bg-[#e4e6eb] rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-[#1877f2] rounded-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-[#050505]">
                        Drop any <code className="text-[#1877f2] bg-[#f0f2f5] px-1 rounded">.css</code> file here, or browse
                      </p>
                      <p className="text-[11px] text-[#65676b]">
                        Files are permanently saved on disk and cached. They will never disappear on refresh.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Stylesheet Configuration: Filename & Scope Decision */}
              <div className="p-3.5 rounded-xl bg-white border border-[#ced0d4] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-[#050505] uppercase tracking-wider mb-1">
                      Stylesheet Filename
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filename}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilename(val);
                          if (val === 'notes-theme.css') {
                            setSetAsGlobalOnSave(true);
                          }
                        }}
                        placeholder="e.g. custom.css, dark-theme.css"
                        className="w-full px-3 py-1.5 rounded-lg border border-[#ced0d4] text-xs font-mono font-medium focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
                      />
                    </div>
                  </div>

                  <div className="sm:w-64 pt-1 sm:pt-4">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={setAsGlobalOnSave}
                        onChange={(e) => setSetAsGlobalOnSave(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-[#1877f2] focus:ring-[#1877f2] cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-[#050505]">
                        Apply as Global Theme for all notes
                        <span className="block text-[10px] font-normal text-[#65676b]">
                          {setAsGlobalOnSave
                            ? 'Overwrites notes-theme.css so all notes use this style'
                            : 'Saves as custom stylesheet (decide per note)'}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Fixed Storage: Uploaded stylesheets are saved permanently to disk and will not be removed when you refresh the app.
                  </span>
                </div>
              </div>

              {/* Code Snippet Quick Helpers */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#65676b] uppercase tracking-wider mr-1">
                  Insert Preset:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(`/* Light Mode Override */
@media (prefers-color-scheme: light) {
  body { background: #ffffff !important; color: #1c1e21 !important; }
  .card, .hero { background: #f8f9fa !important; border-color: #e4e6eb !important; }
}`)
                  }
                  className="px-2 py-1 rounded-md bg-white border border-[#ced0d4] hover:border-[#1877f2] hover:text-[#1877f2] text-[11px] font-medium transition-colors"
                >
                  + Light Mode Rules
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(`/* Custom Callout Box */
.note.tip {
  border-left: 4px solid #ac8cff;
  background: rgba(172, 140, 255, 0.08);
  padding: 12px 16px;
  border-radius: 0 12px 12px 0;
}`)
                  }
                  className="px-2 py-1 rounded-md bg-white border border-[#ced0d4] hover:border-[#1877f2] hover:text-[#1877f2] text-[11px] font-medium transition-colors"
                >
                  + Tip Callout
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(`/* Monospace Code Theme */
pre {
  background: #161b22 !important;
  border: 1px solid #30363d !important;
  color: #58a6ff !important;
}`)
                  }
                  className="px-2 py-1 rounded-md bg-white border border-[#ced0d4] hover:border-[#1877f2] hover:text-[#1877f2] text-[11px] font-medium transition-colors"
                >
                  + Code Block Theme
                </button>
              </div>

              {/* Monospace Code Area */}
              <div className="relative rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden shadow-inner">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d] text-[11px] text-[#8b949e]">
                  <span className="font-mono flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#58a6ff]" />
                    {filename}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                      title="Copy full CSS code"
                    >
                      {hasCopiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{hasCopiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                    <span>•</span>
                    <span>{lineCount} lines</span>
                  </div>
                </div>

                <textarea
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  placeholder="/* Paste or type your custom CSS here */"
                  rows={16}
                  spellCheck={false}
                  className="w-full p-4 bg-[#0d1117] text-[#e6edf3] font-mono text-xs leading-relaxed resize-y focus:outline-hidden focus:ring-0 selection:bg-[#1f6feb] selection:text-white"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Global CSS successfully published! All HTML files referencing notes-theme.css now have this style.</span>
                </div>
              )}
            </div>
          ) : activeTab === 'preview' ? (
            /* Live Test Preview Tab */
            <div className="space-y-4">
              <div className="p-3 bg-white rounded-xl border border-[#e4e6eb] text-xs text-[#65676b]">
                This is a live interactive simulation of standard HTML elements styled by your active CSS:
              </div>

              {/* Live Preview Container with scoped style injection */}
              <div className="rounded-xl border border-[#2b3442] overflow-hidden shadow-lg">
                <style dangerouslySetInnerHTML={{ __html: cssCode }} />
                <div className="p-6 bg-[#050608] text-[#f5f2eb]">
                  <header className="hero">
                    <div className="eyebrow">Interactive Preview • Live Theme</div>
                    <h1>Preview: Build, Test &amp; Verify CSS</h1>
                    <p>
                      This test container verifies your typography, card grids, badges, code blocks, and callout notes.
                    </p>
                    <div className="meta">
                      <span className="pill">⚡ Instant Live Update</span>
                      <span className="pill">🎨 Global Stylesheet</span>
                      <span className="pill">📄 notes-theme.css</span>
                    </div>
                  </header>

                  <div className="grid">
                    <div className="card span6">
                      <h3>Card Component (.card.span6)</h3>
                      <p className="muted small">
                        Cards display structured points, definitions, and architecture summaries.
                      </p>
                      <div className="note good">
                        <strong>Good Callout:</strong> This verifies <code>.note.good</code> styles.
                      </div>
                    </div>

                    <div className="card span6">
                      <h3>System Callouts &amp; Code</h3>
                      <div className="note warn">
                        <strong>Warning Callout:</strong> Verifies <code>.note.warn</code> colors.
                      </div>
                      <pre>
                        <code>
{`// Sample Code Block
function renderNote() {
  return "Styling applied successfully!";
}`}
                        </code>
                      </pre>
                    </div>
                  </div>

                  <div className="flow">
                    <div className="node">
                      <span className="ico">🌐</span>
                      <strong>HTML Note</strong>
                      <div className="small muted">Uploaded file</div>
                    </div>
                    <div className="arr">→</div>
                    <div className="node">
                      <span className="ico">🎨</span>
                      <strong>notes-theme.css</strong>
                      <div className="small muted">Global Styles</div>
                    </div>
                    <div className="arr">→</div>
                    <div className="node">
                      <span className="ico">✨</span>
                      <strong>Crisp Reader</strong>
                      <div className="small muted">Zero broken CSS</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Stylesheet Library Tab */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start justify-between gap-3 text-xs text-[#050505]">
                <div className="flex items-start gap-2.5">
                  <Layers className="w-5 h-5 text-[#1877f2] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Permanent Stylesheet Library</span>
                    <span className="text-[11px] text-[#65676b] block mt-0.5">
                      All stylesheets listed below are fixed on the server and cached in local storage. They are never removed when you refresh the app. You can apply them individually to specific notes or set one as the Global Theme.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .css</span>
                </button>
              </div>

              {libraryFiles.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-[#ced0d4]">
                  <FileCode className="w-8 h-8 text-[#65676b] mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-[#050505]">No custom stylesheets found</p>
                  <p className="text-[11px] text-[#65676b] mt-1">Upload a .css file to get started.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {libraryFiles.map((file) => {
                    const isGlobal = file.isGlobal || file.filename === 'notes-theme.css';
                    const formattedSize =
                      file.size > 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`;

                    return (
                      <div
                        key={file.filename}
                        className="p-3.5 bg-white rounded-xl border border-[#ced0d4] hover:border-[#1877f2]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isGlobal ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-[#1877f2]'
                            }`}
                          >
                            <FileCode className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#050505] truncate">
                                {file.filename}
                              </span>
                              {isGlobal ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                  Global Theme (All Notes)
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                  Custom Stylesheet (Per Note)
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Fixed / Saved
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#65676b] mt-0.5">
                              <span>{formattedSize}</span>
                              <span>•</span>
                              <span>
                                {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : 'Active'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons per file */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {/* Apply to Active Note button if active note exists */}
                          {onApplyCssToActiveChapter && activeChapterTitle && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/css/${encodeURIComponent(file.filename)}`);
                                  if (!res.ok) throw new Error();
                                  const text = await res.text();
                                  onApplyCssToActiveChapter(text, file.filename);
                                  onClose();
                                } catch {
                                  setErrorMsg(`Failed to apply ${file.filename}`);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                              title={`Apply "${file.filename}" specifically to "${activeChapterTitle}"`}
                            >
                              Apply to Note
                            </button>
                          )}

                          {/* Set as Global button if not global */}
                          {!isGlobal && (
                            <button
                              type="button"
                              onClick={() => handleSetAsGlobalFromLibrary(file.filename)}
                              disabled={isSaving}
                              className="px-2.5 py-1 rounded-lg bg-[#e7f3ff] hover:bg-[#d8e4f8] text-[#1877f2] text-xs font-semibold transition-colors cursor-pointer"
                              title="Make this the default global theme for all notes"
                            >
                              Set as Global
                            </button>
                          )}

                          {/* Load into CSS Editor */}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/css/${encodeURIComponent(file.filename)}`);
                                if (res.ok) {
                                  const text = await res.text();
                                  setCssCode(text);
                                  setFilename(file.filename);
                                  setSetAsGlobalOnSave(isGlobal);
                                  setActiveTab('editor');
                                }
                              } catch {}
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#050505] text-xs font-medium transition-colors cursor-pointer"
                            title="Edit this stylesheet in the CSS editor"
                          >
                            Edit
                          </button>

                          {/* Download */}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/css/${encodeURIComponent(file.filename)}`);
                                if (!res.ok) return;
                                const text = await res.text();
                                const blob = new Blob([text], { type: 'text/css' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = file.filename;
                                a.click();
                                URL.revokeObjectURL(url);
                              } catch {}
                            }}
                            className="p-1 rounded-lg text-[#65676b] hover:text-[#050505] hover:bg-[#f0f2f5] transition-colors cursor-pointer"
                            title="Download CSS file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (custom files only) */}
                          {file.filename !== 'notes-theme.css' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStylesheet(file.filename)}
                              className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete this custom stylesheet"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#e4e6eb] bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#65676b] hover:text-[#050505] hover:bg-[#f0f2f5] text-xs font-semibold transition-colors cursor-pointer"
              title="Reset back to default template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#65676b] hover:text-[#050505] hover:bg-[#f0f2f5] text-xs font-semibold transition-colors cursor-pointer"
              title="Download CSS to your machine"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .css</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-[#ced0d4] text-xs font-semibold text-[#050505] hover:bg-[#f0f2f5] transition-colors cursor-pointer"
            >
              Close
            </button>

            {activeTab === 'editor' && (
              <button
                id="theme-css-save-btn"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving CSS...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {setAsGlobalOnSave
                        ? 'Save & Apply Globally'
                        : `Save "${filename}" to Library`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
