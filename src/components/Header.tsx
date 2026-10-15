import React, { useRef, useState } from 'react';
import { ViewMode, User, Chapter, ThemeMode } from '../types';
import { usePwa } from '../hooks/usePwa';
import { UploadButton } from './UploadButton';
import { readFileWithProgress } from '../lib/uploadProgress';
import {
  BookOpen,
  Edit3,
  Download,
  Upload,
  User as UserIcon,
  LogOut,
  Menu,
  Moon,
  Sun,
  Layers,
  Sparkles,
  FileDown,
  ShieldCheck,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Palette,
  WifiOff,
  ArrowDownToLine,
} from 'lucide-react';

interface HeaderProps {
  viewMode: ViewMode;
  user: User | null;
  activeChapter: Chapter | null;
  onToggleViewMode: (mode: ViewMode) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  sidebarOpen?: boolean;
  onExportJson: () => void;
  onImportJson: (jsonString: string) => void;
  onExportCurrentHtml: () => void;
  isPreviewMode?: boolean;
  onTogglePreviewMode?: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  user,
  activeChapter,
  onToggleViewMode,
  onOpenAuth,
  onLogout,
  onToggleSidebar,
  sidebarOpen = true,
  onExportJson,
  onImportJson,
  onExportCurrentHtml,
  isPreviewMode = false,
  onTogglePreviewMode,
  theme,
  onToggleTheme,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingJson, setIsUploadingJson] = useState(false);
  const [uploadProgressJson, setUploadProgressJson] = useState(0);
  const { isOnline, isInstallable, isInstalled, hasUpdate, promptInstall, updateApp } = usePwa();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingJson(true);
    setUploadProgressJson(0);

    try {
      const content = await readFileWithProgress(
        file,
        (pct) => {
          setUploadProgressJson(pct);
        },
        450
      );

      if (content) {
        onImportJson(content);
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        setIsUploadingJson(false);
        setUploadProgressJson(0);
      }, 1000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <header className="h-14 border-b border-[#e4e6eb] dark:border-[#262c36] bg-white/95 dark:bg-[#13171f]/95 backdrop-blur-xs px-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            sidebarOpen
              ? 'text-[#1877f2] dark:text-[#60a5fa] bg-[#e7f3ff] dark:bg-[#1e293b] hover:bg-[#d8e4f8] dark:hover:bg-[#283548]'
              : 'text-[#65676b] dark:text-[#94a3b8] hover:text-[#1877f2] dark:hover:text-[#60a5fa] hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b]'
          }`}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src="/favicon.svg"
            alt="Personal Notes CMS"
            className="w-7 h-7 rounded-lg shadow-2xs shrink-0 select-none"
          />
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-extrabold text-sm tracking-tight text-[#050505] dark:text-[#f8fafc]">
              Personal Notes
            </span>
            {user && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#e7f3ff] dark:bg-[#1e293b] text-[#1877f2] dark:text-[#60a5fa] border border-[#d8e4f8] dark:border-[#283548]">
                CMS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Mode Switcher Tabs for Logged In User (Preview vs CMS Editor) */}
      {user ? (
        <nav
          aria-label="Mode Tabs"
          className="flex items-center bg-[#f0f2f5] dark:bg-[#0e1217] p-1 rounded-xl border border-[#e4e6eb] dark:border-[#262c36] text-xs shadow-2xs animate-in fade-in duration-200"
        >
          <button
            id="mode-preview-btn"
            type="button"
            onClick={() => onToggleViewMode('reader')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'reader'
                ? 'bg-[#1877f2] dark:bg-[#2563eb] text-white shadow-xs font-semibold'
                : 'text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-white/60 dark:hover:bg-[#181d28] font-medium'
            }`}
            title="Preview note content"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          <button
            id="mode-editor-btn"
            type="button"
            onClick={() => onToggleViewMode('editor')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'editor'
                ? 'bg-[#1877f2] dark:bg-[#2563eb] text-white shadow-xs font-semibold'
                : 'text-[#65676b] dark:text-[#94a3b8] hover:text-[#050505] dark:hover:text-[#f8fafc] hover:bg-white/60 dark:hover:bg-[#181d28] font-medium'
            }`}
            title="CMS Editor: edit chapter notes"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>CMS Editor</span>
          </button>
        </nav>
      ) : (
        <div />
      )}

      {/* Right: Theme Toggle, Preview & Auth User */}
      <div className="flex items-center gap-2">
        {/* PWA: Offline Status Indicator */}
        {!isOnline && (
          <div
            id="pwa-offline-badge"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold animate-pulse"
            title="Viewing cached notes offline"
          >
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Offline Mode</span>
          </div>
        )}

        {/* PWA: Install App Button */}
        {isInstallable && !isInstalled && (
          <button
            id="pwa-install-btn"
            onClick={promptInstall}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition-all shadow-2xs cursor-pointer"
            title="Install Notes CMS on your phone or computer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* PWA: Update Available Banner */}
        {hasUpdate && (
          <button
            id="pwa-update-btn"
            onClick={updateApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#1877f2] dark:text-[#60a5fa] bg-[#e7f3ff] dark:bg-[#1e293b] hover:bg-[#d8e4f8] dark:hover:bg-[#283548] border border-[#d8e4f8] dark:border-[#283548] transition-all shadow-2xs cursor-pointer"
            title="New version available. Click to reload."
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1877f2] dark:text-[#60a5fa]" />
            <span>Update</span>
          </button>
        )}

        {/* Fullscreen Preview Button (Hide header & sidebar, display only content) */}
        {activeChapter && onTogglePreviewMode && (
          <button
            id="header-preview-content-btn"
            onClick={onTogglePreviewMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              isPreviewMode
                ? 'bg-[#1877f2] dark:bg-[#2563eb] text-white border-[#1877f2] dark:border-[#2563eb] shadow-xs'
                : 'bg-white dark:bg-[#181d28] text-[#1877f2] dark:text-[#60a5fa] hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b] border-[#d8e4f8] dark:border-[#262c36] shadow-2xs'
            }`}
            title="Fullscreen: hide header and sidebar, display only the content"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreviewMode ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        )}

        {/* Dark / Light Mode Toggle Button */}
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-xl transition-all cursor-pointer border shadow-2xs text-[#65676b] dark:text-[#94a3b8] bg-white dark:bg-[#181d28] border-[#e4e6eb] dark:border-[#262c36] hover:text-[#1877f2] dark:hover:text-[#60a5fa] hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b]"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Export chapter HTML & JSON Backup - ONLY visible once logged in */}
        {user && (
          <>
            {activeChapter && viewMode === 'reader' && (
              <button
                id="export-chapter-html-btn"
                onClick={onExportCurrentHtml}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1877f2] dark:text-[#60a5fa] hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b] rounded-lg border border-[#d8e4f8] dark:border-[#262c36] bg-white dark:bg-[#181d28] transition-colors shadow-2xs"
                title="Download current chapter as standalone .html file"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export .html</span>
              </button>
            )}

            {/* Export/Import JSON */}
            <div className="hidden lg:flex items-center gap-1 border-r border-[#e4e6eb] dark:border-[#262c36] pr-2 mr-1">
              <button
                id="export-backup-btn"
                onClick={onExportJson}
                className="p-1.5 rounded-lg text-[#65676b] dark:text-[#94a3b8] hover:text-[#1877f2] dark:hover:text-[#60a5fa] hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
                title="Backup all topics & chapters (JSON)"
              >
                <Download className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                id="import-backup-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingJson}
                className="relative overflow-hidden px-2 py-1.5 rounded-lg text-[#65676b] dark:text-[#94a3b8] hover:text-[#1877f2] dark:hover:text-[#60a5fa] hover:bg-[#e7f3ff] dark:hover:bg-[#1e293b] transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
                title={isUploadingJson ? `Importing backup: ${Math.round(uploadProgressJson)}%` : "Import notes backup (JSON)"}
              >
                {isUploadingJson && (
                  <span
                    className="absolute inset-y-0 left-0 bg-[#1877f2]/15 dark:bg-[#60a5fa]/20 transition-all duration-150"
                    style={{ width: `${uploadProgressJson}%` }}
                  />
                )}
                <Upload className={`w-4 h-4 ${isUploadingJson ? 'text-[#1877f2] dark:text-[#60a5fa] animate-bounce' : ''}`} />
                {isUploadingJson && (
                  <span className="text-[11px] font-mono font-bold text-[#1877f2] dark:text-[#60a5fa] tabular-nums">
                    {Math.round(uploadProgressJson)}%
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {/* Minimal Auth Profile */}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e7f3ff] dark:bg-[#1e293b] text-xs font-semibold text-[#1877f2] dark:text-[#60a5fa] border border-[#d8e4f8] dark:border-[#283548]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="max-w-[100px] truncate">{user.name}</span>
            </div>
            <button
              id="auth-logout-btn"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-[#65676b] dark:text-[#94a3b8] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            id="auth-signin-btn"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-[#2563eb] text-white text-xs font-semibold hover:bg-black dark:hover:bg-[#1d4ed8] transition-colors shadow-xs cursor-pointer"
            title="Sign In"
          >
            <UserIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-white" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
