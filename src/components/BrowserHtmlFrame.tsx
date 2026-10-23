import React, {
  useEffect,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useState,
} from 'react';
import { sanitizeHtml } from '../lib/sanitize';
import { isMarkdownContent, convertMarkdownToHtml, convertMarkdownToHtmlSync, MARKDOWN_FONTS_HTML, getMarkdownStyles } from '../lib/markdown';
import { renderMermaidInDocument, MERMAID_CODE_STYLES } from '../lib/mermaidRenderer';
import { getStoredGlobalCss, saveStoredGlobalCss } from '../lib/storage';
import { DEFAULT_NOTEBOOK_THEME_CSS } from '../lib/defaultTheme';
import { sqlConsoleStyles } from '../lib/sqlHighlighter';

export interface BrowserHtmlFrameRef {
  scrollToTop: () => void;
  scrollTo: (top: number, smooth?: boolean) => void;
  scrollToId: (id: string) => boolean;
  print: () => void;
  getIframeDocument: () => Document | null;
  getIframeWindow: () => Window | null;
}

interface BrowserHtmlFrameProps {
  htmlContent: string;
  title?: string;
  chapterId?: string;
  initialScrollTop?: number;
  className?: string;
  includeGlobalCss?: boolean;
  cssMode?: 'global' | 'none' | 'custom';
  customCss?: string;
  customCssFileName?: string;
  theme?: 'light' | 'dark';
  isLoading?: boolean;
  contentSize?: number;
  topicName?: string;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number, progress: number) => void;
  onHeadingsExtracted?: (headings: { id: string; text: string; level: number }[]) => void;
  onActiveHeadingChange?: (id: string) => void;
  onReady?: () => void;
}

export const BrowserHtmlFrame = forwardRef<BrowserHtmlFrameRef, BrowserHtmlFrameProps>(
  (
    {
      htmlContent,
      title = 'Document',
      chapterId,
      initialScrollTop,
      className = '',
      includeGlobalCss = true,
      cssMode,
      customCss,
      customCssFileName,
      theme,
      isLoading = false,
      contentSize,
      topicName,
      onScroll,
      onHeadingsExtracted,
      onActiveHeadingChange,
      onReady,
    },
    ref
  ) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [compiledHtml, setCompiledHtml] = useState<string>('');

    useEffect(() => {
      setIsLoaded(false);
    }, [chapterId]);

    // Dynamically detect parent document theme when theme prop is not explicitly given
    const [parentIsDark, setParentIsDark] = useState<boolean>(() => {
      if (typeof document !== 'undefined') {
        return document.documentElement.classList.contains('dark');
      }
      return false;
    });

    useEffect(() => {
      const updateParentTheme = () => {
        if (typeof document !== 'undefined') {
          setParentIsDark(document.documentElement.classList.contains('dark'));
        }
      };
      updateParentTheme();

      const observer = new MutationObserver(() => {
        updateParentTheme();
      });
      if (typeof document !== 'undefined' && document.documentElement) {
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });
      }

      return () => observer.disconnect();
    }, []);

    const isDarkMode = theme ? theme === 'dark' : parentIsDark;

    const [globalCss, setGlobalCss] = useState<string>(() => {
      const stored = getStoredGlobalCss();
      return stored && !stored.includes('/* test upload */') ? stored : DEFAULT_NOTEBOOK_THEME_CSS;
    });
    const lastScrollTopRef = useRef<number>(0);

    // Fetch freshest global CSS on mount
    useEffect(() => {
      fetch('/api/css')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.cssContent && !data.cssContent.includes('/* test upload */')) {
            setGlobalCss(data.cssContent);
            saveStoredGlobalCss(data.cssContent);
          }
        })
        .catch(() => {});
    }, []);

    // Listen for custom event when global CSS is updated
    useEffect(() => {
      const handleCssUpdate = (e: Event) => {
        const customEvent = e as CustomEvent<{ css?: string }>;
        if (customEvent.detail && typeof customEvent.detail.css === 'string') {
          setGlobalCss(customEvent.detail.css);
        } else {
          setGlobalCss(getStoredGlobalCss());
        }
      };

      window.addEventListener('NOTES_GLOBAL_CSS_UPDATED', handleCssUpdate);
      return () => {
        window.removeEventListener('NOTES_GLOBAL_CSS_UPDATED', handleCssUpdate);
      };
    }, []);

    // Auto-detect and compile Markdown if present
    useEffect(() => {
      let isMounted = true;
      if (!htmlContent) {
        setCompiledHtml('');
        return;
      }

      if (isMarkdownContent(htmlContent)) {
        try {
          const syncHtml = convertMarkdownToHtmlSync(htmlContent, { title, isDark: isDarkMode });
          setCompiledHtml(syncHtml);
        } catch {
          setCompiledHtml(htmlContent);
        }
        convertMarkdownToHtml(htmlContent, { title, isDark: isDarkMode }).then((res) => {
          if (isMounted) {
            setCompiledHtml(res);
          }
        });
      } else {
        setCompiledHtml(htmlContent);
      }

      return () => {
        isMounted = false;
      };
    }, [htmlContent, title, isDarkMode]);

    // Prepare complete, valid HTML document with native browser rendering and Mermaid support
    const preparedHtml = useMemo(() => {
      let source = compiledHtml;
      if (!source && htmlContent) {
        if (isMarkdownContent(htmlContent)) {
          try {
            source = convertMarkdownToHtmlSync(htmlContent, { title, isDark: isDarkMode });
          } catch {
            source = htmlContent;
          }
        } else {
          source = htmlContent;
        }
      }
      source = source || '';
      let clean = sanitizeHtml(source);
      if (!clean) {
        const bg = isDarkMode ? '#0c1015' : '#ffffff';
        const fg = isDarkMode ? '#94a3b8' : '#64748b';
        const sub = isDarkMode ? '#475569' : '#94a3b8';
        if (isLoading) {
          return `<!DOCTYPE html><html class="${isDarkMode ? 'dark' : ''}" style="background:${bg};"><body style="margin:0;background:${bg};"></body></html>`;
        }
        return `<!DOCTYPE html><html class="${isDarkMode ? 'dark' : ''}" style="color-scheme:${isDarkMode ? 'dark' : 'light'};background:${bg};"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;padding:3rem 2rem;color:${fg};background:${bg};margin:0;display:flex;align-items:center;justify-content:center;min-height:60vh;"><div style="text-align:center;max-width:360px;"><div style="font-size:14px;font-weight:600;color:${fg};margin-bottom:6px;">This chapter has no content yet</div><div style="font-size:12.5px;color:${sub};">Write or paste Markdown (.md) or HTML in the editor to get started.</div></div></body></html>`;
      }

      // Strip broken local script tags that 404 or conflict with our bundled engine
      clean = clean.replace(/<script[^>]*src=["'][^"']*mermaid(?:\.min)?\.js["'][^>]*><\/script>/gi, '');
      clean = clean.replace(/<script[^>]*>[\s\S]*?mermaid\.initialize[\s\S]*?<\/script>/gi, '');

      const hasDocType = /<!doctype\s+html/i.test(clean);
      const hasHtmlTag = /<html[\s>]/i.test(clean);
      const hasBodyTag = /<body[\s>]/i.test(clean);

      // Check if document is Markdown or explicitly marked as GitHub markdown-body
      const isMd =
        isMarkdownContent(clean) ||
        isMarkdownContent(source) ||
        isMarkdownContent(htmlContent) ||
        clean.includes('class="markdown-body"') ||
        clean.includes("class='markdown-body'") ||
        /<body[^>]*class=["'][^"']*markdown-body/i.test(clean);

      const effectiveMode: 'global' | 'none' = isMd ? 'none' : 'global';

      // Injected helper script for communication with host app + Mermaid dynamic rendering
      const injectedScript = `
        <!-- Mermaid Engine for diagrams -->
        <script src="/mermaid.min.js"></script>
        <script>
          if (typeof window.mermaid === 'undefined') {
            var cdnScript = document.createElement('script');
            cdnScript.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            document.head.appendChild(cdnScript);
          }
        </script>
        <style>
          ${MERMAID_CODE_STYLES}
          ${isMd ? getMarkdownStyles(isDarkMode) : ''}
          .github-mermaid-block.is-fullscreen,
          .diagram-wrapper.is-fullscreen,
          .mermaid-container.is-fullscreen,
          .mermaid-view.is-fullscreen {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            min-height: 100vh !important;
            z-index: 999999 !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            background: ${isDarkMode ? '#0d1117' : '#ffffff'} !important;
            background-color: ${isDarkMode ? '#0d1117' : '#ffffff'} !important;
            background-image: none !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }
          .github-mermaid-block.is-fullscreen .diagram-header,
          .diagram-wrapper.is-fullscreen .diagram-header,
          .mermaid-container.is-fullscreen .diagram-header {
            flex: 0 0 52px !important;
            height: 52px !important;
            min-height: 52px !important;
            max-height: 52px !important;
            width: 100% !important;
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: 1px solid ${isDarkMode ? '#30363d' : '#e2e8f0'} !important;
            background: ${isDarkMode ? '#161b22' : '#ffffff'} !important;
            box-sizing: border-box !important;
            padding: 0 20px !important;
          }
          .github-mermaid-block.is-fullscreen .mermaid-container,
          .github-mermaid-block.is-fullscreen .mermaid-view,
          .github-mermaid-block.is-fullscreen .mermaid-viewport,
          .github-mermaid-block.is-fullscreen .mermaid-canvas,
          .diagram-wrapper.is-fullscreen .mermaid-container,
          .diagram-wrapper.is-fullscreen .mermaid-view,
          .diagram-wrapper.is-fullscreen .mermaid-viewport,
          .diagram-wrapper.is-fullscreen .mermaid-canvas,
          .diagram-wrapper.is-fullscreen .mermaid,
          .mermaid-container.is-fullscreen,
          .mermaid-view.is-fullscreen,
          .mermaid-container.is-fullscreen .mermaid-viewport,
          .mermaid-container.is-fullscreen .mermaid-canvas {
            background-image: none !important;
            background: ${isDarkMode ? '#0d1117' : '#ffffff'} !important;
            background-color: ${isDarkMode ? '#0d1117' : '#ffffff'} !important;
            border: none !important;
            box-shadow: none !important;
          }
          .github-mermaid-block.is-fullscreen .mermaid-container,
          .github-mermaid-block.is-fullscreen .mermaid-view,
          .diagram-wrapper.is-fullscreen .mermaid-container,
          .diagram-wrapper.is-fullscreen .mermaid-view {
            flex: 1 1 auto !important;
            height: calc(100vh - 52px) !important;
            min-height: calc(100vh - 52px) !important;
            max-height: calc(100vh - 52px) !important;
            width: 100vw !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }
          .github-mermaid-block.is-fullscreen .mermaid-viewport,
          .diagram-wrapper.is-fullscreen .mermaid-viewport,
          .mermaid-container.is-fullscreen .mermaid-viewport,
          .mermaid-view.is-fullscreen .mermaid-viewport {
            flex: 1 1 auto !important;
            height: 100% !important;
            min-height: calc(100vh - 52px) !important;
            max-height: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px 32px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .github-mermaid-block.is-fullscreen .mermaid-canvas,
          .diagram-wrapper.is-fullscreen .mermaid-canvas,
          .mermaid-container.is-fullscreen .mermaid-canvas {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: auto !important;
          }
          .diagram-wrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: stretch;
            width: 100%;
            margin: 32px 0;
            background: ${isDarkMode ? '#0d1117' : '#ffffff'};
            border: 1.5px solid ${isDarkMode ? '#30363d' : '#cbd5e1'};
            border-radius: 16px;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03);
            overflow: hidden;
            transition: all 0.25s ease;
          }
          .diagram-header {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 10px 16px !important;
            border-bottom: 1.5px solid ${isDarkMode ? '#30363d' : '#cbd5e1'} !important;
            background: ${isDarkMode ? '#161b22' : '#f8fafc'} !important;
            gap: 12px !important;
            flex-wrap: wrap !important;
            transition: all 0.2s ease !important;
          }
          .diagram-title-group {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }
          .diagram-toolbar {
            display: inline-flex !important;
            align-items: center !important;
            gap: 3px !important;
            margin-left: auto !important;
            flex-shrink: 0 !important;
          }
          .mermaid-viewport {
            position: relative;
            width: 100%;
            min-height: 290px;
            height: auto;
            overflow: hidden;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            cursor: grab;
            user-select: none;
            box-sizing: border-box;
            padding: 24px 16px;
          }
          .mermaid-viewport:active,
          .mermaid-viewport.is-grabbing,
          .mermaid-container.is-grabbing,
          .mermaid-view.is-grabbing {
            cursor: grabbing !important;
          }
          .mermaid-canvas {
            display: inline-flex;
            align-items: flex-start;
            justify-content: center;
            transform-origin: top center;
            transition: transform 0.08s ease-out;
            will-change: transform;
          }
          .mermaid:not(.mermaid-container *):not(.diagram-wrapper *):not(.mermaid-viewport *):not(.mermaid-canvas *),
          .mermaid-container,
          .mermaid-view {
            position: relative;
            background-color: #fafbfc;
            background-image: 
              radial-gradient(#cbd5e1 1.25px, transparent 1.25px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.85) 0%, transparent 100%);
            background-size: 20px 20px, 100% 100%;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Plus Jakarta Sans", sans-serif !important;
            border-radius: 16px;
            border: 1.5px solid #cbd5e1;
            padding: 20px;
            min-height: 290px;
            height: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: grab;
            user-select: none;
            overflow: hidden;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03);
            transition: background-color 0.25s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .mermaid:not(.mermaid-container *):not(.diagram-wrapper *):hover,
          .mermaid-container:hover,
          .mermaid-view:hover {
            border-color: #94a3b8;
            box-shadow: 0 8px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.04);
          }
          pre.mermaid,
          pre.mermaid-raw-source,
          div.mermaid,
          code.mermaid,
          pre > code.language-mermaid,
          .mermaid-container pre,
          .mermaid-view pre,
          .mermaid-viewport pre,
          .diagram-wrapper pre {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            color: inherit !important;
            overflow: visible !important;
            font-family: inherit !important;
          }
          .mermaid-container .mermaid,
          .mermaid-viewport .mermaid,
          .mermaid-canvas .mermaid,
          .diagram-wrapper .mermaid {
            background: transparent !important;
            background-image: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            min-height: auto !important;
            width: 100% !important;
          }
          .mermaid-canvas svg {
            max-width: none !important;
            height: auto !important;
            overflow: visible !important;
            display: block;
            margin: 0 auto;
            transform-origin: center center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif !important;
            background: transparent !important;
            filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.04));
          }
          .mermaid-container > svg,
          .mermaid-view > svg,
          .mermaid > svg,
          svg.mermaid,
          svg.mermaid-svg {
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block;
            margin: 0 auto;
            transform-origin: center center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif !important;
            background: transparent !important;
            filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.04));
          }
          .mermaid-canvas svg rect.background,
          .mermaid-canvas svg .background,
          .mermaid-container svg rect.background,
          .mermaid-container svg .background,
          .mermaid svg rect.background,
          .mermaid svg .background,
          svg.mermaid rect.background,
          svg.mermaid .background,
          svg.mermaid-svg rect.background,
          svg.mermaid-svg .background,
          svg rect[fill="#161b22"],
          svg rect[fill="#0d1117"],
          svg rect[fill="#0b0f19"],
          svg rect[fill="#21262d"],
          svg rect[fill="#1c1e21"] {
            fill: transparent !important;
            stroke: none !important;
          }
          /* Sequence Diagram High-Contrast Polish (Light Mode Default) */
          .mermaid-canvas svg .actor,
          .mermaid-container svg .actor,
          .mermaid svg .actor,
          svg.mermaid .actor,
          svg.mermaid-svg .actor {
            fill: #ffffff !important;
            stroke: #2563eb !important;
            stroke-width: 2px !important;
            rx: 8px !important;
            ry: 8px !important;
          }
          .mermaid-canvas svg .actor circle,
          .mermaid-container svg .actor circle,
          .mermaid svg .actor circle,
          svg.mermaid .actor circle,
          .mermaid-canvas svg .actor line,
          .mermaid-container svg .actor line,
          .mermaid svg .actor line,
          svg.mermaid .actor line {
            stroke: #2563eb !important;
            fill: #dbeafe !important;
            stroke-width: 2px !important;
          }
          .mermaid-canvas svg text.actor,
          .mermaid-canvas svg text.actor > tspan,
          .mermaid-canvas svg text.actor tspan,
          .mermaid-container svg text.actor,
          .mermaid-container svg text.actor > tspan,
          .mermaid svg text.actor,
          .mermaid svg text.actor > tspan,
          svg.mermaid text.actor,
          svg.mermaid text.actor > tspan,
          svg.mermaid-svg text.actor,
          svg.mermaid-svg text.actor > tspan {
            fill: #0f172a !important;
            color: #0f172a !important;
            font-weight: 700 !important;
            font-size: 13.5px !important;
          }
          .mermaid-canvas svg .actor-line,
          .mermaid-container svg .actor-line,
          .mermaid svg .actor-line,
          svg.mermaid .actor-line {
            stroke: #475569 !important;
            stroke-width: 1.75px !important;
          }
          .mermaid-canvas svg .messageLine0,
          .mermaid-canvas svg .messageLine1,
          .mermaid-container svg .messageLine0,
          .mermaid-container svg .messageLine1,
          .mermaid svg .messageLine0,
          .mermaid svg .messageLine1,
          svg.mermaid .messageLine0,
          svg.mermaid .messageLine1 {
            stroke: #334155 !important;
            stroke-width: 2px !important;
          }
          .mermaid-canvas svg .messageText,
          .mermaid-container svg .messageText,
          .mermaid svg .messageText,
          svg.mermaid .messageText,
          svg.mermaid-svg .messageText {
            fill: #0f172a !important;
            color: #0f172a !important;
            font-weight: 600 !important;
            font-size: 13px !important;
          }
          .mermaid-canvas svg .note,
          .mermaid-container svg .note,
          .mermaid svg .note,
          svg.mermaid .note,
          svg.mermaid-svg .note {
            fill: #fef9c3 !important;
            stroke: #eab308 !important;
            stroke-width: 1.5px !important;
            rx: 6px !important;
            ry: 6px !important;
          }
          .mermaid-canvas svg .noteText,
          .mermaid-canvas svg .noteText > tspan,
          .mermaid-container svg .noteText,
          .mermaid-container svg .noteText > tspan,
          .mermaid svg .noteText,
          .mermaid svg .noteText > tspan,
          svg.mermaid .noteText,
          svg.mermaid .noteText > tspan,
          svg.mermaid-svg .noteText,
          svg.mermaid-svg .noteText > tspan {
            fill: #713f12 !important;
            color: #713f12 !important;
            font-weight: 600 !important;
            font-size: 12.5px !important;
          }

          /* Dark Mode & Theme Control Polish (High-Contrast Accessibility) */
          .dark .mermaid-canvas svg .actor,
          .dark .mermaid-container svg .actor,
          .dark .mermaid svg .actor,
          .dark svg.mermaid .actor,
          .dark svg.mermaid-svg .actor,
          [data-theme="dark"] svg .actor,
          .diagram-theme-dark svg .actor {
            fill: #1e293b !important;
            stroke: #38bdf8 !important;
            stroke-width: 2px !important;
          }
          .dark .mermaid-canvas svg text.actor,
          .dark .mermaid-canvas svg text.actor > tspan,
          .dark .mermaid-canvas svg text.actor tspan,
          .dark .mermaid-container svg text.actor,
          .dark .mermaid-container svg text.actor > tspan,
          .dark .mermaid-container svg text.actor tspan,
          .dark .mermaid svg text.actor,
          .dark .mermaid svg text.actor > tspan,
          .dark .mermaid svg text.actor tspan,
          .dark svg.mermaid text.actor,
          .dark svg.mermaid text.actor > tspan,
          .dark svg.mermaid-svg text.actor,
          .dark svg.mermaid-svg text.actor > tspan,
          [data-theme="dark"] svg text.actor,
          [data-theme="dark"] svg text.actor > tspan,
          [data-theme="dark"] svg text.actor tspan,
          .diagram-theme-dark svg text.actor,
          .diagram-theme-dark svg text.actor > tspan,
          .diagram-theme-dark svg text.actor tspan,
          .diagram-theme-dark text.actor,
          .diagram-theme-dark text.actor > tspan {
            fill: #ffffff !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            font-size: 13.5px !important;
          }
          .dark .mermaid-canvas svg .actor-line,
          .dark .mermaid-container svg .actor-line,
          .dark .mermaid svg .actor-line,
          .dark svg.mermaid .actor-line,
          [data-theme="dark"] svg .actor-line,
          .diagram-theme-dark svg .actor-line {
            stroke: #64748b !important;
            stroke-width: 1.5px !important;
            stroke-dasharray: 4, 4 !important;
          }
          .dark .mermaid-canvas svg .messageText,
          .dark .mermaid-container svg .messageText,
          .dark .mermaid svg .messageText,
          .dark svg.mermaid .messageText,
          [data-theme="dark"] svg .messageText,
          .diagram-theme-dark svg .messageText {
            fill: #f8fafc !important;
            color: #f8fafc !important;
            font-weight: 600 !important;
          }
          .dark .mermaid-canvas svg .messageLine0,
          .dark .mermaid-canvas svg .messageLine1,
          .dark .mermaid-container svg .messageLine0,
          .dark .mermaid-container svg .messageLine1,
          .dark .mermaid svg .messageLine0,
          .dark .mermaid svg .messageLine1,
          [data-theme="dark"] svg .messageLine0,
          [data-theme="dark"] svg .messageLine1,
          .diagram-theme-dark svg .messageLine0,
          .diagram-theme-dark svg .messageLine1 {
            stroke: #94a3b8 !important;
            stroke-width: 1.75px !important;
          }
          .dark .mermaid-canvas svg .sequenceNumber,
          [data-theme="dark"] svg .sequenceNumber,
          .diagram-theme-dark svg .sequenceNumber {
            fill: #0284c7 !important;
            stroke: #38bdf8 !important;
            color: #ffffff !important;
          }
          .dark .mermaid-canvas svg .note,
          .dark .mermaid-container svg .note,
          .dark .mermaid svg .note,
          [data-theme="dark"] .mermaid-canvas svg .note,
          .diagram-theme-dark svg .note {
            fill: #272115 !important;
            stroke: #d29922 !important;
          }
          .dark .mermaid-canvas svg .noteText,
          .dark .mermaid-canvas svg .noteText > tspan,
          .dark .mermaid-container svg .noteText,
          .dark .mermaid-container svg .noteText > tspan,
          .dark .mermaid svg .noteText,
          .dark .mermaid svg .noteText > tspan,
          [data-theme="dark"] .mermaid-canvas svg .noteText,
          [data-theme="dark"] .mermaid-canvas svg .noteText > tspan,
          .diagram-theme-dark svg .noteText,
          .diagram-theme-dark svg .noteText > tspan {
            fill: #f0e6c8 !important;
            color: #f0e6c8 !important;
          }

          /* Light Mode Overrides for diagrams toggled to light */
          .diagram-theme-light svg .actor {
            fill: #ffffff !important;
            stroke: #2563eb !important;
          }
          .diagram-theme-light svg text.actor,
          .diagram-theme-light svg text.actor > tspan,
          .diagram-theme-light svg text.actor tspan {
            fill: #0f172a !important;
            color: #0f172a !important;
          }
          .diagram-theme-light svg .messageText {
            fill: #0f172a !important;
            color: #0f172a !important;
          }
          .diagram-theme-light svg .messageLine0,
          .diagram-theme-light svg .messageLine1 {
            stroke: #334155 !important;
          }
          /* Floating Zoom Control Overlay for Mermaid Diagrams in .note-content and across notes */
          .note-content .mermaid-zoom-overlay,
          .mermaid-zoom-overlay,
          .mermaid-zoom-badge {
            position: absolute;
            bottom: 16px;
            right: 16px;
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 4px 6px;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.94);
            border: 1px solid #cbd5e1;
            color: #334155;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 30;
            user-select: none;
            pointer-events: auto;
            transition: all 0.2s ease;
          }
          .note-content .mermaid-zoom-overlay:hover,
          .mermaid-zoom-overlay:hover,
          .mermaid-zoom-badge:hover {
            background: #ffffff;
            border-color: #94a3b8;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
            transform: translateY(-1px);
          }
          .dark .note-content .mermaid-zoom-overlay,
          .dark .mermaid-zoom-overlay,
          .dark .mermaid-zoom-badge,
          [data-theme="dark"] .note-content .mermaid-zoom-overlay,
          [data-theme="dark"] .mermaid-zoom-overlay,
          [data-theme="dark"] .mermaid-zoom-badge {
            background: rgba(15, 23, 42, 0.94);
            border-color: #334155;
            color: #cbd5e1;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
          }
          .dark .note-content .mermaid-zoom-overlay:hover,
          .dark .mermaid-zoom-overlay:hover,
          .dark .mermaid-zoom-badge:hover,
          [data-theme="dark"] .note-content .mermaid-zoom-overlay:hover,
          [data-theme="dark"] .mermaid-zoom-overlay:hover,
          [data-theme="dark"] .mermaid-zoom-badge:hover {
            background: #0f172a;
            border-color: #475569;
          }
          .zoom-control-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 28px;
            min-width: 28px;
            padding: 0 7px;
            border-radius: 9999px;
            border: none;
            background: transparent;
            color: inherit;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            user-select: none;
          }
          .zoom-control-btn:hover {
            background: #f1f5f9;
            color: #1d4ed8;
            transform: scale(1.05);
          }
          .zoom-control-btn:active {
            transform: scale(0.95);
          }
          .dark .zoom-control-btn:hover,
          [data-theme="dark"] .zoom-control-btn:hover {
            background: #1e293b;
            color: #60a5fa;
          }
          .zoom-indicator-btn {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            font-weight: 700;
            gap: 4px;
            padding: 0 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .zoom-indicator-btn:hover {
            background: #eff6ff;
            border-color: #bfdbfe;
            color: #2563eb;
          }
          .dark .zoom-indicator-btn,
          [data-theme="dark"] .zoom-indicator-btn {
            background: #1e293b;
            border-color: #334155;
            color: #e2e8f0;
          }
          .dark .zoom-indicator-btn:hover,
          [data-theme="dark"] .zoom-indicator-btn:hover {
            background: #1e3a8a33;
            border-color: #3b82f6;
            color: #93c5fd;
          }
          .diagram-zoom-indicator {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 28px;
            padding: 0 8px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            user-select: none;
          }
          .dark .diagram-zoom-indicator,
          [data-theme="dark"] .diagram-zoom-indicator {
            color: #f0f6fc;
            background: #161b22;
            border-color: #30363d;
          }
          .diag-divider {
            display: inline-block;
            width: 1px;
            height: 16px;
            background: #cbd5e1;
            margin: 0 2px;
          }
          .dark .diag-divider,
          [data-theme="dark"] .diag-divider {
            background: #30363d;
          }
          .zoom-control-btn.zoom-btn-fit,
          .zoom-control-btn.zoom-btn-reset {
            padding: 0 8px;
            font-size: 11px;
            font-weight: 600;
            gap: 3px;
          }
          .zoom-control-btn.zoom-btn-fit:hover {
            background: #dbeafe;
            color: #1d4ed8;
          }
          .zoom-control-btn.zoom-btn-reset:hover {
            background: #e0e7ff;
            color: #4338ca;
          }
          .dark .zoom-control-btn.zoom-btn-fit:hover,
          [data-theme="dark"] .zoom-control-btn.zoom-btn-fit:hover {
            background: #1e3a8a55;
            color: #60a5fa;
          }
          .dark .zoom-control-btn.zoom-btn-reset:hover,
          [data-theme="dark"] .zoom-control-btn.zoom-btn-reset:hover {
            background: #312e8155;
            color: #a5b4fc;
          }

          /* Floating Legend Button inside mermaid-container */
          .mermaid-floating-legend-btn {
            position: absolute;
            bottom: 14px;
            left: 14px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.94);
            border: 1px solid #cbd5e1;
            color: #334155;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 11.5px;
            font-weight: 600;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 30;
            user-select: none;
            cursor: pointer;
            transition: all 0.18s ease;
          }
          .mermaid-floating-legend-btn:hover {
            background: #ffffff;
            border-color: #3b82f6;
            color: #2563eb;
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.18);
            transform: translateY(-1px);
          }
          .dark .mermaid-floating-legend-btn,
          [data-theme="dark"] .mermaid-floating-legend-btn,
          .markdown-body .mermaid-floating-legend-btn {
            background: rgba(22, 27, 34, 0.94);
            border-color: #30363d;
            color: #c9d1d9;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
          }
          .dark .mermaid-floating-legend-btn:hover,
          [data-theme="dark"] .mermaid-floating-legend-btn:hover,
          .markdown-body .mermaid-floating-legend-btn:hover {
            background: #21262d;
            border-color: #58a6ff;
            color: #58a6ff;
            box-shadow: 0 6px 20px rgba(88, 166, 255, 0.25);
          }

          /* Floating Legend Overlay Modal/Popover */
          .mermaid-legend-overlay {
            position: absolute;
            top: 48px;
            left: 14px;
            max-width: 440px;
            width: calc(100% - 28px);
            max-height: calc(100% - 64px);
            overflow-y: auto;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid #cbd5e1;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            z-index: 50;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #1e293b;
            animation: legendFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .dark .mermaid-legend-overlay,
          [data-theme="dark"] .mermaid-legend-overlay,
          .markdown-body .mermaid-legend-overlay {
            background: rgba(22, 27, 34, 0.98);
            border-color: #30363d;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
            color: #e6edf3;
          }
          @keyframes legendFadeIn {
            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .legend-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #cbd5e1;
          }
          .dark .legend-header,
          [data-theme="dark"] .legend-header,
          .markdown-body .legend-header {
            border-bottom-color: #30363d;
          }
          .legend-title-wrap {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .legend-badge {
            font-weight: 700;
            font-size: 13px;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .dark .legend-badge,
          [data-theme="dark"] .legend-badge,
          .markdown-body .legend-badge {
            color: #f0f6fc;
          }
          .legend-subtitle {
            font-size: 11px;
            color: #64748b;
          }
          .dark .legend-subtitle,
          [data-theme="dark"] .legend-subtitle,
          .markdown-body .legend-subtitle {
            color: #8b949e;
          }
          .legend-close-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 6px;
            border: none;
            background: transparent;
            color: #64748b;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.15s ease;
          }
          .legend-close-btn:hover {
            background: #e2e8f0;
            color: #0f172a;
          }
          .dark .legend-close-btn:hover,
          [data-theme="dark"] .legend-close-btn:hover,
          .markdown-body .legend-close-btn:hover {
            background: #30363d;
            color: #f0f6fc;
          }
          .legend-section {
            margin-bottom: 12px;
          }
          .legend-section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #2563eb;
            margin-bottom: 8px;
          }
          .dark .legend-section-title,
          [data-theme="dark"] .legend-section-title,
          .markdown-body .legend-section-title {
            color: #58a6ff;
          }
          .legend-grid {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .legend-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 6px 8px;
            border-radius: 6px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .dark .legend-item,
          [data-theme="dark"] .legend-item,
          .markdown-body .legend-item {
            background: rgba(13, 17, 23, 0.7);
            border-color: #21262d;
          }
          .legend-symbol {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
            font-size: 10.5px;
            font-weight: 600;
            white-space: nowrap;
            padding: 2px 6px;
            border-radius: 4px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            color: #2563eb;
            flex-shrink: 0;
          }
          .dark .legend-symbol,
          [data-theme="dark"] .legend-symbol,
          .markdown-body .legend-symbol {
            background: #161b22;
            border-color: #30363d;
            color: #79c0ff;
          }
          .legend-desc {
            font-size: 11.5px;
            color: #334155;
            line-height: 1.4;
          }
          .dark .legend-desc,
          [data-theme="dark"] .legend-desc,
          .markdown-body .legend-desc {
            color: #c9d1d9;
          }
          .legend-desc strong {
            color: #0f172a;
          }
          .dark .legend-desc strong,
          [data-theme="dark"] .legend-desc strong,
          .markdown-body .legend-desc strong {
            color: #f0f6fc;
          }

          /* GitHub Heading Anchor Hover Link */
          .markdown-heading {
            position: relative;
            display: flex;
            align-items: baseline;
            gap: 8px;
          }
          .markdown-heading .anchor-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #7d8590 !important;
            opacity: 0;
            text-decoration: none !important;
            transition: opacity 0.15s ease, color 0.15s ease, transform 0.15s ease;
            cursor: pointer;
            user-select: none;
            flex-shrink: 0;
            margin-left: -24px;
            padding-right: 4px;
          }
          .markdown-heading:hover .anchor-link,
          .markdown-heading .anchor-link:focus {
            opacity: 1;
            color: #58a6ff !important;
          }
          .markdown-heading .anchor-link:hover {
            color: #79c0ff !important;
            transform: scale(1.15);
          }
          .markdown-heading .heading-text {
            flex: 1;
          }

          /* Section Target Highlight Animation */
          @keyframes sectionPulseHighlight {
            0% {
              background-color: rgba(56, 189, 248, 0.28);
              outline: 2px solid #38bdf8;
              border-radius: 6px;
            }
            60% {
              background-color: rgba(56, 189, 248, 0.14);
              outline: 2px solid rgba(56, 189, 248, 0.5);
            }
            100% {
              background-color: transparent;
              outline: 2px solid transparent;
            }
          }
          .section-target-highlight {
            animation: sectionPulseHighlight 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          }

          /* General Markdown Links */
          .markdown-body a {
            color: #e4e4e7 !important;
            text-decoration: underline !important;
            text-decoration-color: rgba(255, 255, 255, 0.28) !important;
            text-underline-offset: 3px !important;
            font-weight: 400;
            cursor: pointer;
            transition: color 0.15s ease, text-decoration-color 0.15s ease;
          }
          .markdown-body a:hover {
            color: #ffffff !important;
            text-decoration-color: #60a5fa !important;
          }

          /* Lifecycle Pipeline Stepper Component */
          .lifecycle-pipeline {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 0;
            padding: 24px 20px;
            max-width: 900px;
            margin: 0 auto;
            text-align: left;
          }
          .pipe-node {
            display: flex;
            align-items: flex-start;
            gap: 18px;
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 14px;
            padding: 18px 22px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            z-index: 2;
            text-align: left;
          }
          .pipe-node:hover {
            border-color: #3b82f6;
            transform: translateY(-2px);
            box-shadow: 0 8px 26px rgba(37, 99, 235, 0.12);
          }
          .pipe-badge {
            flex-shrink: 0;
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #ffffff;
            font-family: monospace;
            font-weight: 800;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
            border: 2.5px solid #ffffff;
            user-select: none;
          }
          .lifecycle-pipeline > .pipe-node:nth-of-type(1) .pipe-badge {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
          }
          .lifecycle-pipeline > .pipe-node:nth-of-type(2) .pipe-badge {
            background: linear-gradient(135deg, #0284c7, #0369a1);
          }
          .lifecycle-pipeline > .pipe-node:nth-of-type(3) .pipe-badge {
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
          }
          .lifecycle-pipeline > .pipe-node:nth-of-type(4) .pipe-badge {
            background: linear-gradient(135deg, #ea580c, #c2410c);
          }
          .lifecycle-pipeline > .pipe-node:nth-of-type(5) .pipe-badge {
            background: linear-gradient(135deg, #16a34a, #15803d);
          }
          .pipe-info {
            flex: 1;
            min-width: 0;
            text-align: left;
          }
          .pipe-info h5 {
            margin: 0 0 6px;
            font-size: 18.5px;
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 8px;
            line-height: 1.35;
          }
          .pipe-info h5 mark,
          .pipe-info h5 span[style*="background"] {
            background: #fef08a !important;
            color: #713f12 !important;
            padding: 2px 8px !important;
            border-radius: 6px !important;
            font-weight: 700 !important;
          }
          .pipe-info p {
            margin: 0;
            font-size: 16px;
            line-height: 1.6;
            color: #475569;
          }
          .pipe-arrow {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            height: 44px;
            margin: -1px 0;
            padding-left: 29px;
            z-index: 1;
            font-size: 0;
            user-select: none;
          }
          .pipe-arrow::before {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 44px;
            width: 2px;
            background: repeating-linear-gradient(to bottom, #94a3b8 0px, #94a3b8 5px, transparent 5px, transparent 10px);
            z-index: 1;
          }
          .pipe-arrow::after {
            content: '↓';
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #ffffff;
            border: 2px solid #cbd5e1;
            color: #2563eb;
            font-size: 15px;
            font-weight: 800;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            font-family: system-ui, sans-serif;
            line-height: 1;
          }

          ${sqlConsoleStyles}
        </style>
        <script>
          (function() {
            try {
              var isMdDoc = ${isMd ? 'true' : 'false'};
              var isGlobalMode = ${effectiveMode === 'global' ? 'true' : 'false'};
              if (document.body) {
                if (isMdDoc || !isGlobalMode) {
                  document.body.classList.remove('note-content');
                  if (isMdDoc) {
                    if (!document.body.classList.contains('markdown-body')) {
                      document.body.classList.add('markdown-body');
                    }
                    if (!document.body.classList.contains('markdown-preview-container')) {
                      document.body.classList.add('markdown-preview-container');
                    }
                  }
                } else if (isGlobalMode && !document.body.classList.contains('note-content')) {
                  document.body.classList.add('note-content');
                }
              }
            } catch (e) {}

            // Forward scroll position and active heading to parent app
            function reportScroll() {
              try {
                var top = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
                var height = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
                var client = window.innerHeight || document.documentElement.clientHeight || 0;

                // Active heading detection via scrollspy
                var activeHeadingId = '';
                var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                for (var i = 0; i < headings.length; i++) {
                  var h = headings[i];
                  var rect = h.getBoundingClientRect();
                  if (rect.top <= 140) {
                    if (h.id) {
                      activeHeadingId = h.id;
                    }
                  } else {
                    break;
                  }
                }

                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({
                    type: 'BROWSER_FRAME_SCROLL',
                    chapterId: ${JSON.stringify(chapterId || '')},
                    scrollTop: top,
                    scrollHeight: height,
                    clientHeight: client,
                    activeHeadingId: activeHeadingId
                  }, '*');
                }
              } catch (e) {}
            }

            window.addEventListener('scroll', reportScroll, { passive: true });
            window.addEventListener('resize', reportScroll, { passive: true });

            // Intelligent smooth anchor redirection & external links handler
            function scrollToAnchorTarget(rawHref, event) {
              if (!rawHref) return false;
              var hashIdx = rawHref.indexOf('#');
              if (hashIdx === -1) return false;

              var targetId = rawHref.slice(hashIdx + 1);
              if (!targetId) return false;

              if (event) {
                event.preventDefault();
              }

              var decodedId = targetId;
              try {
                decodedId = decodeURIComponent(targetId);
              } catch (e) {}

              var cleanId = decodedId.replace(/^[#/]+/, '').trim();
              if (!cleanId) return false;

              // 1. Direct ID lookups
              var targetEl = document.getElementById(cleanId) ||
                             document.getElementById(decodedId) ||
                             document.getElementById(targetId) ||
                             document.querySelector('[name="' + cleanId + '"]') ||
                             document.querySelector('[name="' + targetId + '"]');

              // 2. Safe CSS escape attribute search
              if (!targetEl) {
                try {
                  targetEl = document.querySelector('[id="' + CSS.escape(cleanId) + '"]') ||
                             document.querySelector('[name="' + CSS.escape(cleanId) + '"]');
                } catch (e) {}
              }

              // 3. Exact slug match across heading tags only (never match arbitrary tags)
              if (!targetEl) {
                var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                var slugId = cleanId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

                // Pass 1: exact id or text slug match
                for (var i = 0; i < headings.length; i++) {
                  var h = headings[i];
                  var hId = (h.getAttribute('id') || '').toLowerCase();
                  if (hId && hId === slugId) {
                    targetEl = h;
                    break;
                  }
                  var hText = (h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  if (hText && hText === slugId) {
                    targetEl = h;
                    break;
                  }
                }

                // Pass 2: prefix or specific contains match
                if (!targetEl && slugId.length > 4) {
                  for (var k = 0; k < headings.length; k++) {
                    var hk = headings[k];
                    var hkId = (hk.getAttribute('id') || '').toLowerCase();
                    if (hkId && (hkId.indexOf(slugId) !== -1 || (hkId.length > 5 && slugId.indexOf(hkId) !== -1))) {
                      targetEl = hk;
                      break;
                    }
                  }
                }
              }

              if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

                targetEl.classList.remove('section-target-highlight');
                void targetEl.offsetWidth;
                targetEl.classList.add('section-target-highlight');
                setTimeout(function() {
                  try {
                    targetEl.classList.remove('section-target-highlight');
                  } catch (e) {}
                }, 2200);

                return true;
              }

              return false;
            }

            document.addEventListener('click', function(e) {
              var target = e.target.closest('a');
              if (!target) return;
              var href = target.getAttribute('href') || target.href || '';
              if (!href) return;

              // Any in-document anchor link
              if (href.indexOf('#') !== -1) {
                var hashPart = href.substring(href.indexOf('#'));
                e.preventDefault();
                e.stopPropagation();
                scrollToAnchorTarget(hashPart, e);
                return;
              } else if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
                target.setAttribute('target', '_blank');
                target.setAttribute('rel', 'noopener noreferrer');
              } else {
                e.preventDefault();
                e.stopPropagation();
              }
            }, true);

            // Decode HTML entities
            function decodeHtml(html) {
              if (!html) return '';
              var txt = document.createElement("textarea");
              txt.innerHTML = html;
              return txt.value;
            }

            // File content always renders in clean light theme per user design requirement
            function isDarkModeActive() {
              return false;
            }

            // Initialize Mermaid with clean light styles
            var currentMermaidTheme = null;
            function initFrameMermaid(forceDark) {
              if (typeof window.mermaid === 'undefined') return;
              var isDark = forceDark === true;
              var modeStr = isDark ? 'dark' : 'light';
              if (currentMermaidTheme === modeStr) return;

              try {
                if (isDark) {
                  window.mermaid.initialize({
                    startOnLoad: false,
                    theme: 'base',
                    securityLevel: 'loose',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Helvetica, Arial, sans-serif',
                    fontSize: 13,
                    themeVariables: {
                      darkMode: true,
                      background: 'transparent',
                      mainBkg: '#161b22',
                      nodeBorder: '#30363d',
                      lineColor: '#8b949e',
                      textColor: '#e6edf3',
                      primaryColor: '#21262d',
                      primaryTextColor: '#e6edf3',
                      primaryBorderColor: '#30363d',
                      secondaryColor: '#161b22',
                      secondaryTextColor: '#e6edf3',
                      secondaryBorderColor: '#30363d',
                      tertiaryColor: '#161b22',
                      tertiaryTextColor: '#e6edf3',
                      tertiaryBorderColor: '#30363d',
                      clusterBkg: '#161b22',
                      clusterBorder: '#30363d',
                      titleColor: '#e6edf3',
                      edgeLabelBackground: '#161b22',
                      actorBkg: '#21262d',
                      actorBorder: '#30363d',
                      actorTextColor: '#e6edf3',
                      actorLineColor: '#8b949e',
                      signalColor: '#8b949e',
                      signalTextColor: '#e6edf3',
                      labelBoxBkgColor: '#161b22',
                      labelBoxBorderColor: '#30363d',
                      labelTextColor: '#e6edf3',
                      loopTextColor: '#e6edf3',
                      noteBorderColor: '#d29922',
                      noteBkgColor: '#272115',
                      noteTextColor: '#e6edf3',
                      activationBorderColor: '#388bfd',
                      activationBkgColor: '#1f6feb33',
                      sequenceNumberColor: '#ffffff'
                    }
                  });
                } else {
                  window.mermaid.initialize({
                    startOnLoad: false,
                    theme: 'base',
                    securityLevel: 'loose',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Helvetica, Arial, sans-serif',
                    fontSize: 13,
                    themeVariables: {
                      darkMode: false,
                      background: 'transparent',
                      mainBkg: '#f6f8fa',
                      nodeBorder: '#d0d7de',
                      lineColor: '#57606a',
                      textColor: '#1f2328',
                      primaryColor: '#f6f8fa',
                      primaryTextColor: '#1f2328',
                      primaryBorderColor: '#d0d7de',
                      secondaryColor: '#ffffff',
                      secondaryTextColor: '#1f2328',
                      secondaryBorderColor: '#d0d7de',
                      tertiaryColor: '#f6f8fa',
                      tertiaryTextColor: '#1f2328',
                      tertiaryBorderColor: '#d0d7de',
                      clusterBkg: '#f6f8fa',
                      clusterBorder: '#d0d7de',
                      titleColor: '#1f2328',
                      edgeLabelBackground: '#ffffff',
                      actorBkg: '#f6f8fa',
                      actorBorder: '#d0d7de',
                      actorTextColor: '#1f2328',
                      actorLineColor: '#57606a',
                      signalColor: '#57606a',
                      signalTextColor: '#1f2328',
                      labelBoxBkgColor: '#ffffff',
                      labelBoxBorderColor: '#d0d7de',
                      labelTextColor: '#1f2328',
                      loopTextColor: '#1f2328',
                      noteBorderColor: '#d4a72c',
                      noteBkgColor: '#fff8c5',
                      noteTextColor: '#1f2328',
                      activationBorderColor: '#0969da',
                      activationBkgColor: '#ddf4ff',
                      sequenceNumberColor: '#ffffff'
                    }
                  });
                }
                currentMermaidTheme = modeStr;
              } catch(e) {}
            }

            // Interactive Zoom, Pan, Fit, Copy, and Fullscreen Controls
            function setupDiagramInteractionsForContainer(wrap, container, viewport, canvas, rawCode, titleText) {
              if (!viewport || !canvas) return;
              if (wrap.dataset.interactionsActive === 'true' || wrap.dataset.interactionsReady === 'true') return;
              wrap.dataset.interactionsActive = 'true';
              wrap.dataset.interactionsReady = 'true';

              var scale = 1.0;
              var panX = 0;
              var panY = 0;
              var isPanning = false;
              var startX = 0;
              var startY = 0;

              function updateTransform() {
                canvas.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
                canvas.style.transformOrigin = 'top center';
                var pct = Math.round(scale * 100) + '%';
                var badges = wrap.querySelectorAll('.zoom-val, .zoom-text');
                badges.forEach(function(b) { b.textContent = pct; });
              }

              // Fit diagram to screen (both width and height so no elements are cut off or hidden)
              function fitDiagramToScreen(forceFull) {
                var svg = canvas.querySelector('svg');
                if (!svg) return;
                var svgW = 0;
                var svgH = 0;
                try {
                  if (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
                    svgW = svg.viewBox.baseVal.width;
                    svgH = svg.viewBox.baseVal.height;
                  } else if (svg.getBBox) {
                    var bbox = svg.getBBox();
                    if (bbox.width > 0) {
                      svgW = bbox.width;
                      svgH = bbox.height;
                    }
                  }
                } catch(e) {}
                if (!svgW || !svgH) {
                  var vb = svg.getAttribute('viewBox');
                  if (vb) {
                    var parts = vb.trim().split(/[\s,]+/);
                    if (parts.length === 4) {
                      if (!svgW) svgW = parseFloat(parts[2]) || 0;
                      if (!svgH) svgH = parseFloat(parts[3]) || 0;
                    }
                  }
                }
                if (!svgH) {
                  var attrH = svg.getAttribute('height');
                  if (attrH) svgH = parseFloat(attrH) || 0;
                }
                if (!svgW) {
                  var attrW = svg.getAttribute('width');
                  if (attrW && !attrW.includes('%')) svgW = parseFloat(attrW) || 0;
                }
                if (!svgW) svgW = svg.clientWidth || (svg.getBoundingClientRect && svg.getBoundingClientRect().width) || 800;
                if (!svgH) svgH = svg.clientHeight || (svg.getBoundingClientRect && svg.getBoundingClientRect().height) || 600;

                // Ensure SVG is explicitly dimensioned to its true vector bounds for crisp transforms
                if (svgW > 0 && svgH > 0) {
                  svg.style.width = svgW + 'px';
                  svg.style.height = svgH + 'px';
                  svg.style.maxWidth = 'none';
                }

                var isFull = wrap.classList.contains('is-fullscreen') || forceFull;
                var padX = isFull ? 80 : 40;
                var padY = isFull ? 80 : 36;

                var rect = viewport.getBoundingClientRect();
                var viewW;
                var viewH;

                if (isFull) {
                  var winW = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 1200;
                  var winH = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 900;
                  viewW = Math.max(winW - padX, 300);
                  viewH = Math.max(winH - 52 - padY, 300);
                } else {
                  viewW = Math.max((rect.width || viewport.clientWidth || window.innerWidth) - padX, 260);
                  viewH = Math.max((rect.height || viewport.clientHeight || 340) - padY, 200);
                }

                if (svgW > 0 && viewW > 0) {
                  var scaleX = viewW / svgW;
                  var scaleY = (svgH > 0 && viewH > 0) ? (viewH / svgH) : scaleX;

                  // Constrain by BOTH width and height so top actor boxes and bottom labels are 100% visible
                  var targetScale = Math.min(scaleX, scaleY);
                  if (isFull) {
                    targetScale = Math.min(Math.max(targetScale, 0.1), 1.6);
                  } else {
                    targetScale = Math.min(Math.max(targetScale, 0.1), 1.15);
                  }

                  scale = targetScale;
                  panX = 0;
                  panY = 0;
                  updateTransform();
                }
              }

              function zoomBy(factor, clientX, clientY) {
                var newScale = Math.min(Math.max(scale * factor, 0.15), 5.0);
                if (clientX !== undefined && clientY !== undefined) {
                  var rect = viewport.getBoundingClientRect();
                  var mouseX = clientX - rect.left - rect.width / 2;
                  var mouseY = clientY - rect.top - rect.height / 2;
                  panX = mouseX - (mouseX - panX) * (newScale / scale);
                  panY = mouseY - (mouseY - panY) * (newScale / scale);
                }
                scale = newScale;
                updateTransform();
              }

              // Double click to toggle between Zoom to Fit and 1:1 Reset
              viewport.addEventListener('dblclick', function(e) {
                if (e.target.closest('.diagram-toolbar, .diagram-btn, .mermaid-zoom-badge, .mermaid-zoom-overlay, button, a')) return;
                if (Math.abs(scale - 1.0) < 0.05) {
                  fitDiagramToScreen(wrap.classList.contains('is-fullscreen'));
                } else {
                  scale = 1.0;
                  panX = 0;
                  panY = 0;
                  updateTransform();
                }
              });

              // Wheel zoom centered on cursor
              var handleWheel = function(e) {
                e.preventDefault();
                var delta = e.deltaY < 0 ? 1.15 : 0.88;
                zoomBy(delta, e.clientX, e.clientY);
              };
              viewport.addEventListener('wheel', handleWheel, { passive: false });
              if (container && container !== viewport) {
                container.addEventListener('wheel', handleWheel, { passive: false });
              }

              // Mouse drag pan
              viewport.addEventListener('mousedown', function(e) {
                if (e.button !== 0) return;
                if (e.target.closest('.diagram-toolbar, .diagram-btn, .mermaid-zoom-badge, .mermaid-zoom-overlay, button, a')) return;
                isPanning = true;
                startX = e.clientX - panX;
                startY = e.clientY - panY;
                viewport.style.cursor = 'grabbing';
                viewport.classList.add('is-grabbing');
                if (container) container.classList.add('is-grabbing');
              });

              window.addEventListener('mousemove', function(e) {
                if (!isPanning) return;
                panX = e.clientX - startX;
                panY = e.clientY - startY;
                updateTransform();
              });

              window.addEventListener('mouseup', function() {
                if (isPanning) {
                  isPanning = false;
                  viewport.style.cursor = 'grab';
                  viewport.classList.remove('is-grabbing');
                  if (container) container.classList.remove('is-grabbing');
                }
              });

              // Touch gestures: pan & pinch-zoom
              var touchStartX = 0;
              var touchStartY = 0;
              var initialPinchDist = 0;
              var initialScale = 1.0;

              viewport.addEventListener('touchstart', function(e) {
                if (e.target.closest('.diagram-toolbar, .diagram-btn, .mermaid-zoom-badge, .mermaid-zoom-overlay, button, a')) return;
                if (e.touches.length === 1) {
                  touchStartX = e.touches[0].clientX - panX;
                  touchStartY = e.touches[0].clientY - panY;
                } else if (e.touches.length === 2) {
                  var dx = e.touches[0].clientX - e.touches[1].clientX;
                  var dy = e.touches[0].clientY - e.touches[1].clientY;
                  initialPinchDist = Math.hypot(dx, dy);
                  initialScale = scale;
                }
              }, { passive: true });

              viewport.addEventListener('touchmove', function(e) {
                if (e.target.closest('.diagram-toolbar, .diagram-btn, .mermaid-zoom-badge, .mermaid-zoom-overlay, button, a')) return;
                if (e.touches.length === 1 && !initialPinchDist) {
                  panX = e.touches[0].clientX - touchStartX;
                  panY = e.touches[0].clientY - touchStartY;
                  updateTransform();
                } else if (e.touches.length === 2 && initialPinchDist > 0) {
                  var dx = e.touches[0].clientX - e.touches[1].clientX;
                  var dy = e.touches[0].clientY - e.touches[1].clientY;
                  var dist = Math.hypot(dx, dy);
                  if (dist > 5) {
                    scale = Math.min(Math.max(initialScale * (dist / initialPinchDist), 0.2), 5.0);
                    updateTransform();
                  }
                }
              }, { passive: true });

              viewport.addEventListener('touchend', function(e) {
                if (e.touches.length < 2) {
                  initialPinchDist = 0;
                }
              }, { passive: true });

              // Button listeners in wrap toolbar
              var btnZoomIn = wrap.querySelector('.btn-diag-zoomin, .btn-mermaid-zoomin');
              var btnZoomOut = wrap.querySelector('.btn-diag-zoomout, .btn-mermaid-zoomout');
              var btnReset = wrap.querySelector('.btn-diag-reset, .btn-mermaid-reset');
              var btnFit = wrap.querySelector('.btn-diag-fit, .btn-mermaid-fit');
              var btnCopy = wrap.querySelector('.btn-diag-copy, .btn-mermaid-copy');
              var btnTheme = wrap.querySelector('.btn-diag-theme, .btn-mermaid-theme');
              var btnExpand = wrap.querySelector('.btn-diag-expand, .btn-mermaid-expand');

              if (btnZoomIn) {
                btnZoomIn.addEventListener('click', function(e) {
                  e.stopPropagation();
                  zoomBy(1.25);
                });
              }
              if (btnZoomOut) {
                btnZoomOut.addEventListener('click', function(e) {
                  e.stopPropagation();
                  zoomBy(0.8);
                });
              }
              if (btnReset) {
                btnReset.addEventListener('click', function(e) {
                  e.stopPropagation();
                  scale = 1.0;
                  panX = 0;
                  panY = 0;
                  updateTransform();
                });
              }
              if (btnFit) {
                btnFit.addEventListener('click', function(e) {
                  e.stopPropagation();
                  fitDiagramToScreen(wrap.classList.contains('is-fullscreen'));
                });
              }
              if (btnCopy) {
                btnCopy.addEventListener('click', function(e) {
                  e.stopPropagation();
                  var codeToCopy = rawCode || wrap.getAttribute('data-raw-mermaid') || '';
                  if (!codeToCopy) {
                    var pre = wrap.querySelector('pre.mermaid, code.language-mermaid');
                    if (pre) codeToCopy = pre.textContent || '';
                  }
                  if (codeToCopy && navigator.clipboard) {
                    navigator.clipboard.writeText(codeToCopy).then(function() {
                      var orig = btnCopy.innerHTML;
                      btnCopy.innerHTML = '<span style="color:#10b981;font-weight:700;">✓ Copied</span>';
                      setTimeout(function() { btnCopy.innerHTML = orig; }, 2000);
                    });
                  }
                });
              }
              if (btnTheme) {
                btnTheme.addEventListener('click', function(e) {
                  e.stopPropagation();
                  var isDocDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
                  var isCurrentlyDark = wrap.classList.contains('diagram-theme-dark')
                    ? true
                    : wrap.classList.contains('diagram-theme-light')
                    ? false
                    : isDocDark;
                  var nextDark = !isCurrentlyDark;
                  wrap.classList.remove('diagram-theme-dark', 'diagram-theme-light');
                  wrap.classList.add(nextDark ? 'diagram-theme-dark' : 'diagram-theme-light');
                  wrap.setAttribute('data-diagram-theme', nextDark ? 'dark' : 'light');

                  var allThemeBtns = wrap.querySelectorAll('.btn-diag-theme, .btn-mermaid-theme');
                  allThemeBtns.forEach(function(b) {
                    b.innerHTML = '<span class="theme-icon" aria-hidden="true">' + (nextDark ? '🌙' : '☀️') + '</span> <span class="theme-text">' + (nextDark ? 'Dark' : 'Light') + '</span>';
                    b.setAttribute('title', 'Current: ' + (nextDark ? 'Dark' : 'Light') + ' Mode. Click to toggle.');
                  });

                  var codeToRender = rawCode || wrap.getAttribute('data-raw-mermaid') || '';
                  if (window.mermaid && codeToRender) {
                    try {
                      window.mermaid.initialize({
                        startOnLoad: false,
                        theme: nextDark ? 'dark' : 'default',
                        securityLevel: 'loose',
                        themeVariables: nextDark ? {
                          darkMode: true,
                          background: '#0d1117',
                          primaryColor: '#1e293b',
                          primaryTextColor: '#f8fafc',
                          primaryBorderColor: '#38bdf8',
                          actorBkg: '#1e293b',
                          actorBorder: '#38bdf8',
                          actorTextColor: '#ffffff',
                          actorLineColor: '#38bdf8',
                          signalColor: '#38bdf8',
                          signalTextColor: '#f8fafc'
                        } : {
                          darkMode: false,
                          background: '#ffffff',
                          primaryColor: '#f0f4f8',
                          primaryTextColor: '#0f172a',
                          primaryBorderColor: '#cbd5e1',
                          actorBkg: '#f0f4f8',
                          actorBorder: '#64748b',
                          actorTextColor: '#0f172a'
                        }
                      });
                      var dId = 'diag-toggle-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                      window.mermaid.render(dId, codeToRender).then(function(res) {
                        canvas.innerHTML = res.svg;
                        var s = canvas.querySelector('svg');
                        if (s) {
                          s.classList.remove('mermaid');
                          s.classList.add('mermaid-svg');
                          s.style.background = 'transparent';
                        }
                        updateTransform();
                      }).catch(function(err) {
                        console.warn('Diagram re-render error:', err);
                      });
                    } catch (err) {
                      console.warn('Mermaid re-render err:', err);
                    }
                  }
                });
              }
              function toggleFullscreen() {
                wrap.classList.toggle('is-fullscreen');
                var isFull = wrap.classList.contains('is-fullscreen');
                if (isFull) {
                  container.classList.add('is-fullscreen');
                  viewport.classList.add('is-fullscreen');
                  canvas.classList.add('is-fullscreen');
                } else {
                  container.classList.remove('is-fullscreen');
                  viewport.classList.remove('is-fullscreen');
                  canvas.classList.remove('is-fullscreen');
                  wrap.style.removeProperty('min-height');
                  wrap.style.removeProperty('height');
                  container.style.removeProperty('min-height');
                  container.style.removeProperty('height');
                  viewport.style.removeProperty('min-height');
                  viewport.style.removeProperty('height');
                }
                var allExpandBtns = wrap.querySelectorAll('.btn-diag-expand, .btn-mermaid-expand, .zoom-btn-expand, .btn-hud-expand, .hud-expand');
                allExpandBtns.forEach(function(b) {
                  if (isFull) {
                    b.innerHTML = '<span aria-hidden="true">✕ Exit</span>';
                    b.setAttribute('title', 'Exit Fullscreen (Esc)');
                  } else {
                    b.innerHTML = '<span aria-hidden="true">⛶ Fullscreen</span>';
                    b.setAttribute('title', 'Toggle Fullscreen (100vh)');
                  }
                });
                setTimeout(function() {
                  fitDiagramToScreen(isFull);
                }, 50);
              }

              if (btnExpand) {
                btnExpand.addEventListener('click', function(e) {
                  e.stopPropagation();
                  toggleFullscreen();
                });
              }

              // Escape key exits fullscreen
              window.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && wrap.classList.contains('is-fullscreen')) {
                  toggleFullscreen();
                }
              });

              // Window resize adjusts fullscreen diagram fit
              window.addEventListener('resize', function() {
                if (wrap.classList.contains('is-fullscreen')) {
                  fitDiagramToScreen(true);
                }
              });

              // Initialize diagram at initial position (100% 1:1, pan 0, 0)
              scale = 1.0;
              panX = 0;
              panY = 0;
              updateTransform();

              // Floating zoom control overlay (plus, minus, fit, reset, fullscreen)
              var overlay = container.querySelector('.mermaid-zoom-overlay, .mermaid-zoom-badge');
              if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'mermaid-zoom-overlay mermaid-zoom-badge';
                overlay.setAttribute('role', 'toolbar');
                overlay.setAttribute('aria-label', 'Diagram zoom controls');
                overlay.title = 'Zoom: scroll or click + / − • Drag to pan • Fullscreen: 100vh';
                overlay.innerHTML = [
                  '<button type="button" class="zoom-control-btn zoom-btn-minus btn-hud-out hud-out" title="Zoom out (−)" aria-label="Zoom out">−</button>',
                  '<button type="button" class="zoom-control-btn zoom-indicator-btn zoom-val" title="Current zoom level • Click to toggle Fit / 1:1" aria-label="Current zoom">100%</button>',
                  '<button type="button" class="zoom-control-btn zoom-btn-plus btn-hud-in hud-in" title="Zoom in (+)" aria-label="Zoom in">+</button>',
                  '<button type="button" class="zoom-control-btn zoom-btn-fit btn-hud-fit hud-fit" title="Zoom to fit diagram in view" aria-label="Zoom to fit">⊡ Fit</button>',
                  '<button type="button" class="zoom-control-btn zoom-btn-reset btn-hud-reset hud-reset" title="Reset zoom to 100% (1:1)" aria-label="Reset zoom">↺ Reset</button>',
                  '<button type="button" class="zoom-control-btn zoom-btn-expand btn-hud-expand hud-expand font-bold text-xs" title="Toggle Fullscreen (100vh)" aria-label="Toggle Fullscreen">⛶ Fullscreen</button>'
                ].join('');
                container.appendChild(overlay);
              }

              if (overlay && !overlay.getAttribute('data-zoom-initialized')) {
                overlay.setAttribute('data-zoom-initialized', 'true');
                var btnMinus = overlay.querySelector('.zoom-btn-minus, .btn-hud-out, .hud-out');
                if (btnMinus) {
                  btnMinus.addEventListener('click', function(e) {
                    e.stopPropagation();
                    zoomBy(0.8);
                  });
                }

                var btnVal = overlay.querySelector('.zoom-val');
                if (btnVal) {
                  btnVal.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (Math.abs(scale - 1.0) < 0.05) {
                      fitDiagramToScreen(wrap.classList.contains('is-fullscreen'));
                    } else {
                      scale = 1.0;
                      panX = 0;
                      panY = 0;
                      updateTransform();
                    }
                  });
                }

                var btnPlus = overlay.querySelector('.zoom-btn-plus, .btn-hud-in, .hud-in');
                if (btnPlus) {
                  btnPlus.addEventListener('click', function(e) {
                    e.stopPropagation();
                    zoomBy(1.25);
                  });
                }

                var btnFitHud = overlay.querySelector('.zoom-btn-fit, .btn-hud-fit, .hud-fit');
                if (btnFitHud) {
                  btnFitHud.addEventListener('click', function(e) {
                    e.stopPropagation();
                    fitDiagramToScreen(wrap.classList.contains('is-fullscreen'));
                  });
                }

                var btnReset = overlay.querySelector('.zoom-btn-reset, .btn-hud-reset, .hud-reset');
                if (btnReset) {
                  btnReset.addEventListener('click', function(e) {
                    e.stopPropagation();
                    scale = 1.0;
                    panX = 0;
                    panY = 0;
                    updateTransform();
                  });
                }

                var btnHudExpand = overlay.querySelector('.zoom-btn-expand, .btn-hud-expand, .hud-expand');
                if (btnHudExpand) {
                  btnHudExpand.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleFullscreen();
                  });
                }

                // Floating Legend button in viewport/container
                var floatingLegendBtn = container.querySelector('.mermaid-floating-legend-btn');
                if (!floatingLegendBtn) {
                  floatingLegendBtn = document.createElement('button');
                  floatingLegendBtn.type = 'button';
                  floatingLegendBtn.className = 'mermaid-floating-legend-btn';
                  floatingLegendBtn.title = 'Diagram Legend: explain node shapes and line types';
                  floatingLegendBtn.innerHTML = '<span aria-hidden="true">💡</span> <span>Legend</span>';
                  container.appendChild(floatingLegendBtn);
                }

                // Floating Legend Overlay Modal/Popover
                var legendOverlay = wrap.querySelector('.mermaid-legend-overlay');
                if (!legendOverlay) {
                  legendOverlay = document.createElement('div');
                  legendOverlay.className = 'mermaid-legend-overlay';
                  legendOverlay.style.display = 'none';
                  legendOverlay.setAttribute('role', 'dialog');
                  legendOverlay.setAttribute('aria-modal', 'true');
                  legendOverlay.setAttribute('aria-label', 'Diagram Legend');
                  legendOverlay.innerHTML = [
                    '<div class="legend-header">',
                    '  <div class="legend-title-wrap">',
                    '    <span class="legend-badge">💡 Diagram Legend</span>',
                    '    <span class="legend-subtitle">Visual syntax for shapes & connectors</span>',
                    '  </div>',
                    '  <button type="button" class="legend-close-btn" title="Close Legend (Esc)" aria-label="Close Legend">✕</button>',
                    '</div>',
                    '<div class="legend-content">',
                    '  <div class="legend-section">',
                    '    <div class="legend-section-title">🔷 Node Shapes & Entities</div>',
                    '    <div class="legend-grid">',
                    '      <div class="legend-item"><span class="legend-symbol shape-rect">[ Service / Process ]</span><div class="legend-desc"><strong>Rectangle</strong>: Service, controller, or process step</div></div>',
                    '      <div class="legend-item"><span class="legend-symbol shape-db">[( Database / Cache )]</span><div class="legend-desc"><strong>Cylinder</strong>: Persistent database, Redis cache, or storage</div></div>',
                    '      <div class="legend-item"><span class="legend-symbol shape-decision">{ Decision / Gateway }</span><div class="legend-desc"><strong>Rhombus / Diamond</strong>: Conditional branch, auth check, or validation</div></div>',
                    '      <div class="legend-item"><span class="legend-symbol shape-rounded">( Rounded / Stadium )</span><div class="legend-desc"><strong>Rounded / Pill</strong>: Start / terminal state, event trigger, or endpoint</div></div>',
                    '      <div class="legend-item"><span class="legend-symbol shape-actor">Actor / Participant</span><div class="legend-desc"><strong>Actor Box</strong>: Customer, browser client, payment gateway, or worker</div></div>',
                    '    </div>',
                    '  </div>',
                    '  <div class="legend-section">',
                    '    <div class="legend-section-title">➔ Line Types & Flow Semantics</div>',
                    '    <div class="legend-grid">',
                    '      <div class="legend-item"><span class="legend-symbol line-solid">───▶ (Solid Arrow)</span><div class="legend-desc"><strong>Solid Line / Arrow</strong>: Synchronous request, direct execution, or transition</div></div>',
                    '      <div class="legend-item"><span class="legend-symbol line-dashed">┈┈┈▶ (Dashed Arrow)</span><div class="legend-desc"><strong>Dashed Line / Arrow</strong>: Asynchronous response, webhook notification, BullMQ event</div></div>',
                    '      <div class="legend-item"><span class="legend-symbol line-thick">═══▶ (Thick Arrow)</span><div class="legend-desc"><strong>Thick Line</strong>: Authoritative state transition, database commit, money movement</div></div>',
                    '      <div class="legend-item"><span class="legend-symbol line-blocked">─x─ (Cross Arrow)</span><div class="legend-desc"><strong>Cross End</strong>: Rejected transaction, expired session, or blocked request</div></div>',
                    '      <div class="legend-item"><span class="legend-symbol note-box">Note over Entity</span><div class="legend-desc"><strong>Yellow Note</strong>: Local state explanation, concurrency lock, or idempotency rule</div></div>',
                    '    </div>',
                    '  </div>',
                    '</div>'
                  ].join('');
                  wrap.appendChild(legendOverlay);
                }

                var btnLegend = wrap.querySelector('.btn-diag-legend, .btn-mermaid-legend');
                function toggleLegend(show) {
                  if (!legendOverlay) return;
                  var isHidden = legendOverlay.style.display === 'none' || !legendOverlay.style.display;
                  var shouldOpen = show !== undefined ? show : isHidden;
                  legendOverlay.style.display = shouldOpen ? 'block' : 'none';
                }
                if (btnLegend) {
                  btnLegend.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleLegend();
                  });
                }
                if (floatingLegendBtn) {
                  floatingLegendBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleLegend();
                  });
                }
                var legendCloseBtn = legendOverlay.querySelector('.legend-close-btn');
                if (legendCloseBtn) {
                  legendCloseBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleLegend(false);
                  });
                }
                legendOverlay.addEventListener('click', function(e) {
                  e.stopPropagation();
                });
              }
            }

            // Universal Mermaid Renderer for all document diagrams
            function renderAllMermaid() {
              if (typeof window.mermaid === 'undefined') return;
              window.__mermaidFrameActive = true;
              initFrameMermaid();

              // Pre-step 1: Wrap any standalone mermaid blocks (.note-content or anywhere)
              var standalones = document.querySelectorAll('.note-content pre.mermaid, .note-content div.mermaid, .note-content .mermaid:not(svg), pre.mermaid, div.mermaid, pre > code.language-mermaid, code.mermaid');
              standalones.forEach(function(el) {
                if (el.closest('.diagram-wrapper, .github-mermaid-block, .mermaid-container, .mermaid-viewport')) return;
                var wrap = document.createElement('div');
                wrap.className = 'diagram-wrapper';
                var title = 'System Architecture Diagram';
                var prev = el.previousElementSibling;
                while (prev && !/^H[1-6]$/i.test(prev.tagName) && !prev.classList.contains('diagram-title')) {
                  prev = prev.previousElementSibling;
                }
                if (prev && /^H[1-6]$/i.test(prev.tagName)) {
                  title = prev.textContent.trim().replace(/^[\s#\d.:-]+/, '');
                }
                wrap.setAttribute('data-title', title);
                var container = document.createElement('div');
                container.className = 'mermaid-container';
                el.parentNode.insertBefore(wrap, el);
                container.appendChild(el);
                wrap.appendChild(container);
              });

              // Pre-step 1.5: Wrap any standalone SVG mermaid diagrams (.note-content or anywhere)
              var standaloneSvgs = document.querySelectorAll('.note-content svg.mermaid, .note-content svg[id^="mermaid-"], svg.mermaid, svg[id^="mermaid-"]');
              standaloneSvgs.forEach(function(svg) {
                if (svg.closest('.diagram-wrapper, .github-mermaid-block, .mermaid-container, .mermaid-viewport')) return;
                var wrap = document.createElement('div');
                wrap.className = 'diagram-wrapper';
                wrap.setAttribute('data-title', 'Architecture Diagram');
                var container = document.createElement('div');
                container.className = 'mermaid-container';
                var viewport = document.createElement('div');
                viewport.className = 'mermaid-viewport';
                var canvas = document.createElement('div');
                canvas.className = 'mermaid-canvas';
                viewport.appendChild(canvas);
                container.appendChild(viewport);
                wrap.appendChild(container);
                svg.parentNode.insertBefore(wrap, svg);
                canvas.appendChild(svg);
                wrap.dataset.mermaidRendered = 'true';
              });

              // Pre-step 2: Wrap any standalone .mermaid-container not yet in .diagram-wrapper
              var rawContainers = document.querySelectorAll('.note-content .mermaid-container, .mermaid-container');
              rawContainers.forEach(function(cont) {
                if (cont.closest('.diagram-wrapper, .github-mermaid-block') || cont.classList.contains('lifecycle-pipeline')) return;
                var wrap = document.createElement('div');
                wrap.className = 'diagram-wrapper';
                var title = 'Architecture Diagram';
                var prev = cont.previousElementSibling;
                if (prev && /^H[1-6]$/i.test(prev.tagName)) {
                  title = prev.textContent.trim().replace(/^[\s#\d.:-]+/, '');
                }
                wrap.setAttribute('data-title', title);
                cont.parentNode.insertBefore(wrap, cont);
                wrap.appendChild(cont);
              });

              // Step 3: Process all .diagram-wrapper and .github-mermaid-block elements
              var wrappers = document.querySelectorAll('.diagram-wrapper, .github-mermaid-block');
              wrappers.forEach(function(wrap, idx) {
                var container = wrap.querySelector('.mermaid-container, .mermaid-view');
                if (!container && wrap.classList.contains('github-mermaid-block')) {
                  container = wrap;
                }
                if (!container || container.classList.contains('lifecycle-pipeline')) return;

                var h4 = wrap.querySelector('h4, h3, h2, h5, .diagram-title');
                var titleText = h4 ? h4.textContent.trim() : (wrap.getAttribute('data-title') || 'System Architecture Diagram');

                var pre = wrap.querySelector('pre.mermaid, pre.mermaid-raw-source, code.language-mermaid, .mermaid:not(svg)');
                var rawCode = wrap.getAttribute('data-raw-mermaid') || (pre ? pre.textContent.trim() : '');
                rawCode = decodeHtml(rawCode);
                if (rawCode) wrap.setAttribute('data-raw-mermaid', rawCode);

                // Build header toolbar if not present
                if (!wrap.querySelector('.diagram-header')) {
                  var header = document.createElement('div');
                  header.className = 'diagram-header';
                  header.innerHTML = [
                    '<div class="diagram-title-group">',
                    '  <span class="diagram-icon-badge" aria-hidden="true">📊</span>',
                    '  <span class="diagram-title">' + (titleText || 'System Diagram') + '</span>',
                    '</div>',
                    '<div class="diagram-toolbar" role="toolbar" aria-label="Diagram controls">',
                    '  <button type="button" class="diagram-btn btn-diag-legend btn-mermaid-legend" title="Diagram Legend: explain node shapes & line types" aria-label="Diagram Legend"><span aria-hidden="true">💡 Legend</span></button>',
                    '  <span class="diag-divider" aria-hidden="true"></span>',
                    '  <button type="button" class="diagram-btn btn-diag-zoomout" title="Zoom out (−)" aria-label="Zoom out"><span aria-hidden="true">➖</span></button>',
                    '  <span class="diagram-zoom-indicator" title="Current zoom level"><span class="zoom-val">100%</span></span>',
                    '  <button type="button" class="diagram-btn btn-diag-zoomin" title="Zoom in (+)" aria-label="Zoom in"><span aria-hidden="true">➕</span></button>',
                    '  <span class="diag-divider" aria-hidden="true"></span>',
                    '  <button type="button" class="diagram-btn btn-diag-fit" title="Zoom to fit diagram in view" aria-label="Zoom to fit"><span aria-hidden="true">⊡</span> <span>Fit</span></button>',
                    '  <button type="button" class="diagram-btn btn-diag-reset" title="Reset zoom to 100% (1:1)" aria-label="Reset zoom"><span aria-hidden="true">↺</span> <span>Reset</span></button>',
                    '  <span class="diag-divider" aria-hidden="true"></span>',
                    '  <button type="button" class="diagram-btn btn-diag-copy" title="Copy Mermaid syntax" aria-label="Copy syntax"><span aria-hidden="true">📋 Copy</span></button>',
                    '  <button type="button" class="diagram-btn btn-diag-theme btn-mermaid-theme" title="Toggle diagram theme: Dark / Light" aria-label="Toggle diagram theme"><span class="theme-icon" aria-hidden="true">🌓</span> <span class="theme-text">Theme</span></button>',
                    '  <button type="button" class="diagram-btn btn-diag-expand" title="Toggle Fullscreen" aria-label="Fullscreen"><span aria-hidden="true">⛶ Fullscreen</span></button>',
                    '</div>'
                  ].join('');
                  if (h4) h4.style.display = 'none';
                  wrap.insertBefore(header, container);
                }

                // Ensure viewport and canvas structure
                var viewport = container.querySelector('.mermaid-viewport');
                var canvas = container.querySelector('.mermaid-canvas');
                if (!viewport || !canvas) {
                  viewport = document.createElement('div');
                  viewport.className = 'mermaid-viewport';
                  canvas = document.createElement('div');
                  canvas.className = 'mermaid-canvas';
                  viewport.appendChild(canvas);

                  // Keep any existing svg
                  var existingSvg = container.querySelector('svg');
                  if (existingSvg) {
                    canvas.appendChild(existingSvg);
                  }

                  // Clear out any old pre/code text nodes
                  var oldPres = container.querySelectorAll('pre, code, .mermaid:not(svg)');
                  oldPres.forEach(function(p) { p.remove(); });

                  container.appendChild(viewport);
                }

                // If already rendered with svg, just hook interactions
                if (canvas.querySelector('svg')) {
                  var svg = canvas.querySelector('svg');
                  if (svg) {
                    svg.style.maxWidth = '100%';
                    svg.style.height = 'auto';
                    svg.style.background = 'transparent';
                    var bgRects = svg.querySelectorAll('rect.background, .background');
                    bgRects.forEach(function(r) { r.setAttribute('fill', 'transparent'); });
                  }
                  setupDiagramInteractionsForContainer(wrap, container, viewport, canvas, rawCode, titleText);
                  return;
                }

                if (!rawCode) return;

                var diagId = 'mermaid-rendered-' + Date.now() + '-' + idx;
                window.mermaid.render(diagId, rawCode).then(function(res) {
                  canvas.innerHTML = res.svg;
                  var svg = canvas.querySelector('svg');
                  if (svg) {
                    svg.style.maxWidth = '100%';
                    svg.style.height = 'auto';
                    svg.style.background = 'transparent';
                    var bgRects = svg.querySelectorAll('rect.background, .background');
                    bgRects.forEach(function(r) { r.setAttribute('fill', 'transparent'); });
                  }
                  setupDiagramInteractionsForContainer(wrap, container, viewport, canvas, rawCode, titleText);
                }).catch(function(err) {
                  console.warn('Mermaid render error for wrapper ' + idx, err);
                  canvas.innerHTML = '<div style="color:#ef4444;padding:12px;font-size:12px;font-family:monospace;background:rgba(239,68,68,0.08);border-radius:8px;">Diagram render notice: ' + (err.message || 'Syntax parse issue') + '</div>';
                });
              });
            }

            function ensureMermaidAndRun() {
              if (typeof window.mermaid !== 'undefined') {
                renderAllMermaid();
                return;
              }
              var attempts = 0;
              var poll = setInterval(function() {
                attempts++;
                if (typeof window.mermaid !== 'undefined') {
                  clearInterval(poll);
                  renderAllMermaid();
                } else if (attempts >= 100) {
                  clearInterval(poll);
                }
              }, 40);
            }

            // Upgrade and enhance all raw <pre><code> and SQL code blocks inside the HTML document
            function enhanceSqlAndCodeBlocks() {
              var pres = document.querySelectorAll('pre');
              pres.forEach(function(pre) {
                if (pre.closest('.code-block-wrapper') || pre.classList.contains('code-pre') || pre.classList.contains('mermaid') || pre.classList.contains('mermaid-raw-source')) {
                  return;
                }

                var codeEl = pre.querySelector('code');
                var rawText = (codeEl ? codeEl.textContent : pre.textContent) || '';
                rawText = rawText.trim();
                if (!rawText) return;

                var rawClass = ((codeEl ? codeEl.className : '') + ' ' + pre.className).toLowerCase();
                var isSql = false;

                var sqlClassRegex = new RegExp('\\b(?:language-sql|sql|language-pgsql|pgsql|language-mysql|mysql|sqlite)\\b', 'i');
                if (sqlClassRegex.test(rawClass)) {
                  isSql = true;
                } else {
                  // If it has another language class (e.g. language-typescript, language-jsx, language-js, language-python, etc.), it is NOT SQL!
                  var otherLangRegex = new RegExp('\\blanguage-(?!sql|pgsql|mysql|sqlite)[a-z0-9_-]+\\b', 'i');
                  if (!otherLangRegex.test(rawClass)) {
                    var isJsTs = /\b(import\s+[\s\S]*?from|export\s+(?:default\s+)?(?:function|class|const|let|var|type|interface|enum)|const\s+\w+\s*[:=]|let\s+\w+\s*[:=]|var\s+\w+\s*[:=]|function\s+\w+\s*\(|class\s+\w+|=>|<\/[a-zA-Z]+>|useState|useEffect|useMemo|useCallback|useRef|console\.log|async\s+function|def\s+\w+\s*\()\b/.test(rawText);
                    if (!isJsTs) {
                      var commentRegex = new RegExp('^(\\s*--[^\\n]*\\r?\\n|\\s*\\/\\*[\\s\\S]*?\\*\\/\\s*)+', 'i');
                      var stripped = rawText.replace(commentRegex, '').trim();
                      var sqlStartRegex = new RegExp('^(SELECT\\s+[\\s\\S]+?\\bFROM\\b|INSERT\\s+INTO\\s+[\\s\\S]+?\\b(?:VALUES|SELECT)\b|UPDATE\\s+[\\s\\S]+?\\bSET\\b|DELETE\\s+FROM\\s+\\w+|CREATE\\s+(?:TABLE|VIEW|INDEX|DATABASE)\\b|ALTER\\s+(?:TABLE|DATABASE)\\b|DROP\\s+(?:TABLE|VIEW|INDEX)\\b|WITH\\s+[a-zA-Z0-9_]+\\s+AS\\s*\\(|TRUNCATE|EXPLAIN|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE)\\b', 'i');
                      if (sqlStartRegex.test(stripped)) {
                        isSql = true;
                      }
                    }
                  }
                }

                if (isSql) {
                  var commentStripRegex = new RegExp('^(\\s*--[^\\n]*\\r?\\n|\\s*\\/\\*[\\s\\S]*?\\*\\/\\s*)+', 'i');
                  var clean = rawText.replace(commentStripRegex, '').trim();
                  var upper = clean.toUpperCase();
                  var stmtType = 'SQL COMMAND';
                  var category = 'SQL';
                  var catColor = '#38bdf8';
                  var catBg = '#082f49';
                  var catBorder = '#0284c7';

                  if (/^SELECT\b/.test(upper)) { stmtType = 'SELECT QUERY'; category = 'DQL'; catColor = '#38bdf8'; catBg = '#082f49'; catBorder = '#0284c7'; }
                  else if (/^WITH\b/.test(upper)) { stmtType = 'CTE QUERY (WITH)'; category = 'DQL'; catColor = '#38bdf8'; catBg = '#082f49'; catBorder = '#0284c7'; }
                  else if (/^INSERT\s+INTO\b/.test(upper)) { stmtType = 'INSERT STATEMENT'; category = 'DML'; catColor = '#34d399'; catBg = '#064e3b'; catBorder = '#059669'; }
                  else if (/^UPDATE\b/.test(upper)) { stmtType = 'UPDATE STATEMENT'; category = 'DML'; catColor = '#fbbf24'; catBg = '#451a03'; catBorder = '#d97706'; }
                  else if (/^DELETE\s+FROM\b/.test(upper)) { stmtType = 'DELETE STATEMENT'; category = 'DML'; catColor = '#f87171'; catBg = '#450a0a'; catBorder = '#dc2626'; }
                  else if (/^CREATE\s+TABLE\b/.test(upper)) { stmtType = 'CREATE TABLE'; category = 'DDL'; catColor = '#c084fc'; catBg = '#3b0764'; catBorder = '#9333ea'; }
                  else if (/^ALTER\s+TABLE\b/.test(upper)) { stmtType = 'ALTER TABLE'; category = 'DDL'; catColor = '#c084fc'; catBg = '#3b0764'; catBorder = '#9333ea'; }
                  else if (/^DROP\s+(?:TABLE|VIEW|INDEX)\b/.test(upper)) { stmtType = 'DROP OBJECT'; category = 'DDL'; catColor = '#f87171'; catBg = '#450a0a'; catBorder = '#dc2626'; }
                  else if (/^CREATE\s+(?:UNIQUE\s+)?INDEX\b/.test(upper)) { stmtType = 'CREATE INDEX'; category = 'DDL'; catColor = '#c084fc'; catBg = '#3b0764'; catBorder = '#9333ea'; }
                  else if (/^(BEGIN|COMMIT|ROLLBACK)\b/.test(upper)) { stmtType = 'TRANSACTION'; category = 'TCL'; catColor = '#e879f9'; catBg = '#4a044e'; catBorder = '#c026d3'; }

                  // Detect dialect
                  var dialect = 'ANSI SQL';
                  if (/::(JSONB|TEXT|INT|BOOLEAN|UUID|TIMESTAMPTZ)\b/i.test(rawText) || /\b(SERIAL|BIGSERIAL|TIMESTAMPTZ|ILIKE|RETURNING|ON\s+CONFLICT)\b/i.test(upper)) {
                    dialect = 'PostgreSQL';
                  } else if (/\b(AUTO_INCREMENT|ENGINE\s*=\s*INNODB|TINYINT|DATETIME)\b/i.test(upper)) {
                    dialect = 'MySQL';
                  } else if (/\b(AUTOINCREMENT|PRAGMA)\b/i.test(upper)) {
                    dialect = 'SQLite';
                  }

                  // Detect target table
                  var tableName = '';
                  var tableMatch = clean.match(/\b(?:FROM|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|TRUNCATE(?:\s+TABLE)?)\s+([a-zA-Z0-9_."]+)/i);
                  if (tableMatch && tableMatch[1]) {
                    var cand = tableMatch[1].replace(/["\x60]/g, '').trim();
                    if (!cand.startsWith('(') && !['SELECT', 'WHERE', 'JOIN'].includes(cand.toUpperCase())) {
                      tableName = cand;
                    }
                  }

                  function escapeAttr(s) {
                    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  }

                  function highlightSqlText(str) {
                    var escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    escaped = escaped.replace(/('(?:''|[^'])*')/g, '<span class="token string">$1</span>');
                    escaped = escaped.replace(/(--[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
                    var kwRegex = /\b(SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|ON|AS|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ILIKE|IS\s+NULL|IS\s+NOT\s+NULL|UNION\s+ALL|UNION|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|CONSTRAINT|DEFAULT|CHECK|DISTINCT|RETURNING|CASE|WHEN|THEN|ELSE|END|WITH|BEGIN|COMMIT|ROLLBACK)\b/gi;
                    escaped = escaped.replace(kwRegex, function(m) {
                      return '<span class="token keyword">' + m.toUpperCase() + '</span>';
                    });
                    var fnRegex = /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|NOW|DATE_TRUNC|EXTRACT|ROUND|CONCAT|ROW_NUMBER|RANK|DENSE_RANK)\b(?=\s*\()/gi;
                    escaped = escaped.replace(fnRegex, function(m) {
                      return '<span class="token function">' + m.toUpperCase() + '</span>';
                    });
                    var typeRegex = /\b(INT|INTEGER|BIGINT|SERIAL|BIGSERIAL|VARCHAR|TEXT|BOOLEAN|TIMESTAMP|TIMESTAMPTZ|DATE|TIME|NUMERIC|DECIMAL|UUID|JSONB|JSON)\b/gi;
                    escaped = escaped.replace(typeRegex, function(m) {
                      return '<span class="token class-name">' + m.toUpperCase() + '</span>';
                    });
                    escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token number">$1</span>');
                    return escaped;
                  }

                  function buildLinesHtml(sqlStr) {
                    var lines = sqlStr.split(/\r?\n/);
                    return lines.map(function(line, lIdx) {
                      var num = lIdx + 1;
                      return '<div class="code-line" data-line="' + num + '"><span class="line-num" aria-hidden="true">' + num + '</span><span class="line-content">' + (highlightSqlText(line) || '&nbsp;') + '</span></div>';
                    }).join('');
                  }

                  function simpleFormatSql(sql) {
                    var kwList = ['SELECT','FROM','WHERE','GROUP BY','HAVING','ORDER BY','LIMIT','OFFSET','JOIN','INNER JOIN','LEFT JOIN','RIGHT JOIN','FULL JOIN','CROSS JOIN','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM','UNION ALL','UNION','CREATE TABLE','WITH'];
                    var pat = new RegExp('(\'(?:[^\']|\\\'\\\' )*\'|--[^\\n]*|\\b(?:' + kwList.join('|') + ')\\b|\\b(?:AND|OR)\\b)', 'gi');
                    var res = '';
                    var last = 0;
                    var m;
                    while ((m = pat.exec(sql)) !== null) {
                      var before = sql.slice(last, m.index).trim();
                      if (before) res += (res.endsWith('\n') || !res ? '' : ' ') + before;
                      var tok = m[0].toUpperCase();
                      if (tok === 'AND' || tok === 'OR') {
                        res += '\n  ' + tok + ' ';
                      } else if (tok.startsWith("'") || tok.startsWith('--')) {
                        res += (res.endsWith('\n') || !res ? '' : ' ') + m[0];
                      } else {
                        res += (!res ? '' : '\n') + tok + ' ';
                      }
                      last = pat.lastIndex;
                    }
                    var rem = sql.slice(last).trim();
                    if (rem) res += (res.endsWith('\n') || !res ? '' : ' ') + rem;
                    return res.split('\n').map(function(l){ return l.trimEnd(); }).join('\n').replace(/\s*;\s*$/, ';');
                  }

                  var rawLines = rawText.split('\n');
                  var rawLinesHtml = buildLinesHtml(rawText);
                  var formattedText = simpleFormatSql(rawText);
                  var formattedLinesHtml = buildLinesHtml(formattedText);
                  var formattedLineCount = formattedText.split('\n').length;
                  var byteLen = new Blob([rawText]).size;
                  var sizeStr = byteLen < 1024 ? byteLen + ' B' : (byteLen / 1024).toFixed(1) + ' KB';

                  var wrapper = document.createElement('div');
                  wrapper.className = 'code-block-wrapper sql-code-block my-6 rounded-2xl border border-[#1e293b] bg-[#0c1017] shadow-2xl overflow-hidden font-mono text-[13px] leading-relaxed transition-all';
                  wrapper.setAttribute('data-is-sql', 'true');

                  var tableBadgeHtml = tableName
                    ? '<span class="sql-table-badge hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#1e293b]/90 border border-[#334155] text-[#93c5fd]" title="Target table">' +
                      '<svg class="w-3 h-3 text-[#38bdf8] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>' +
                      '<span>table:</span> <strong class="text-[#f8fafc]">' + escapeAttr(tableName) + '</strong></span>'
                    : '';

                  var dialectBadgeHtml = '<span class="sql-dialect-pill hidden md:inline-flex text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#172554] text-[#93c5fd] border border-[#1e40af]/60" title="Detected Dialect">' + escapeAttr(dialect) + '</span>';

                  wrapper.innerHTML = [
                    '<div class="sql-top-accent h-[2.5px] w-full bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#818cf8]"></div>',
                    '<div class="code-block-header px-4 py-2.5 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between text-xs select-none gap-3">',
                    '  <div class="flex items-center gap-2.5 min-w-0 flex-wrap">',
                    '    <div class="sql-cylinder-icon relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#0284c7]/20 border border-[#0284c7]/40 text-[#38bdf8] shrink-0 shadow-2xs" title="SQL Database Query Console">',
                    '      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">',
                    '        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>',
                    '        <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>',
                    '        <path d="M3 12A9 3 0 0 0 21 12"></path>',
                    '      </svg>',
                    '      <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0f172a] shadow-xs" title="SQL Engine Ready"></span>',
                    '    </div>',
                    '    <div class="flex items-center gap-1.5 min-w-0 flex-wrap">',
                    '      <span class="text-[10px] font-black font-mono px-2 py-0.5 rounded-md sql-category-pill tracking-wider shadow-2xs" style="background:' + catBg + '; color:' + catColor + '; border: 1px solid ' + catBorder + '">' + category + '</span>',
                    '      <span class="font-bold text-xs text-[#f8fafc] font-mono tracking-tight sql-stmt-badge">' + stmtType + '</span>',
                    '      ' + tableBadgeHtml,
                    '      ' + dialectBadgeHtml,
                    '    </div>',
                    '  </div>',
                    '  <div class="flex items-center gap-2 shrink-0">',
                    '    <span class="text-[11px] font-mono text-[#64748b] hidden sm:inline sql-metrics">',
                    '      <span class="sql-line-count">' + rawLines.length + '</span> ' + (rawLines.length === 1 ? 'line' : 'lines') + ' · ' + sizeStr,
                    '    </span>',
                    '    <button type="button" class="btn-code-wrap px-2.5 py-1 rounded-md text-[11px] font-mono font-medium text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b] border border-[#334155] cursor-pointer transition-all active:scale-95 shadow-2xs" title="Toggle line wrapping">',
                    '      <span class="wrap-label">Wrap</span>',
                    '    </button>',
                    '  </div>',
                    '</div>',
                    '<div class="code-block-body relative overflow-x-auto">',
                    '  <pre class="code-pre sql-pre m-0 py-3.5 font-mono text-[13.5px] leading-[24px] text-[#f8fafc] bg-[#090d13]"><code class="language-sql code-content" data-raw-sql="' + escapeAttr(rawText) + '" data-formatted-sql="' + escapeAttr(formattedText) + '" data-raw-html="' + escapeAttr(rawLinesHtml) + '" data-formatted-html="' + escapeAttr(formattedLinesHtml) + '" data-raw-lines="' + rawLines.length + '" data-formatted-lines="' + formattedLineCount + '">' + rawLinesHtml + '</code></pre>',
                    '</div>'
                  ].join('\n');

                  pre.parentNode.replaceChild(wrapper, pre);
                } else {
                  // General non-SQL code block
                  var lang = 'code';
                  var matchLang = rawClass.match(/language-([a-z0-9_-]+)/i);
                  if (matchLang) lang = matchLang[1].toLowerCase();

                  var genWrapper = document.createElement('div');
                  genWrapper.className = 'code-block-wrapper my-6 rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden shadow-xl';
                  genWrapper.innerHTML = [
                    '<div class="code-block-header px-4 py-2.5 bg-[#18181b] border-b border-[#27272a]/70 flex items-center justify-between text-xs select-none">',
                    '  <div class="flex items-center gap-2 min-w-0">',
                    '    <span class="code-lang-label font-mono text-[12px] text-zinc-400 lowercase tracking-normal font-medium">' + escapeAttr(lang) + '</span>',
                    '  </div>',
                    '  <div class="flex items-center gap-1.5 shrink-0">',
                    '    <button type="button" class="btn-code-copy inline-flex items-center justify-center p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer" data-raw-code="' + escapeAttr(rawText) + '" title="Copy code" aria-label="Copy code">',
                    '      <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
                    '      <svg class="check-icon" style="display:none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
                    '    </button>',
                    '  </div>',
                    '</div>',
                    '<div class="code-block-body relative overflow-x-auto">',
                    '  <pre class="code-pre m-0 p-4 font-mono text-[13.5px] leading-[23px] text-[#e4e4e7] bg-[#18181b]"><code class="language-' + escapeAttr(lang) + ' code-content">' + (codeEl ? codeEl.innerHTML : escapeAttr(rawText)) + '</code></pre>',
                    '</div>'
                  ].join('\n');

                  pre.parentNode.replaceChild(genWrapper, pre);
                }
              });
            }

            // Central click handlers for all code blocks in the frame
            document.addEventListener('click', function(e) {
              // Copy Button
              var copyBtn = e.target.closest('.btn-code-copy');
              if (copyBtn) {
                e.stopPropagation();
                var wrapper = copyBtn.closest('.code-block-wrapper');
                var codeEl = wrapper ? wrapper.querySelector('.code-pre code') : null;
                var rawCode = copyBtn.getAttribute('data-raw-code');

                if (codeEl && codeEl.getAttribute('data-is-formatted') === 'true') {
                  rawCode = codeEl.getAttribute('data-formatted-sql') || rawCode;
                } else if (codeEl && codeEl.getAttribute('data-raw-sql')) {
                  rawCode = codeEl.getAttribute('data-raw-sql');
                } else if (!rawCode && codeEl) {
                  rawCode = codeEl.textContent || '';
                }

                if (rawCode && navigator.clipboard) {
                  navigator.clipboard.writeText(rawCode).then(function() {
                    var copyText = copyBtn.querySelector('.copy-text');
                    var copyIcon = copyBtn.querySelector('.copy-icon');
                    var checkIcon = copyBtn.querySelector('.check-icon');
                    var isSqlBlock = !!copyBtn.closest('.sql-code-block');
                    if (copyText) copyText.textContent = isSqlBlock ? 'Copied SQL!' : 'Copied!';
                    copyBtn.classList.add('text-emerald-400');
                    if (copyIcon && checkIcon) {
                      copyIcon.style.display = 'none';
                      checkIcon.style.display = 'inline-block';
                    } else if (copyIcon) {
                      copyIcon.innerHTML = '<path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>';
                      copyIcon.classList.remove('text-[#8b949e]', 'text-[#38bdf8]');
                      copyIcon.classList.add('text-emerald-400');
                    }
                    setTimeout(function() {
                      if (copyIcon && checkIcon) {
                        copyIcon.style.display = 'inline-block';
                        checkIcon.style.display = 'none';
                      }
                      if (copyText) copyText.textContent = isSqlBlock ? 'Copy SQL' : 'Copy';
                      copyBtn.classList.remove('text-emerald-400');
                      if (copyIcon && !checkIcon) {
                        copyIcon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
                        copyIcon.classList.remove('text-emerald-400');
                        copyIcon.classList.add(isSqlBlock ? 'text-[#38bdf8]' : 'text-[#8b949e]');
                      }
                    }, 2000);
                  });
                }
                return;
              }

              // Wrap Button
              var wrapBtn = e.target.closest('.btn-code-wrap');
              if (wrapBtn) {
                e.stopPropagation();
                var wrapper = wrapBtn.closest('.code-block-wrapper');
                var pre = wrapper ? wrapper.querySelector('.code-pre') : null;
                var label = wrapBtn.querySelector('.wrap-label');
                if (pre) {
                  pre.classList.toggle('is-wrapped');
                  var isWrapped = pre.classList.contains('is-wrapped');
                  if (label) label.textContent = isWrapped ? 'Scroll' : 'Wrap';
                  wrapBtn.classList.toggle('text-[#38bdf8]', isWrapped);
                }
                return;
              }

              // Format SQL Button
              var formatBtn = e.target.closest('.btn-sql-format');
              if (formatBtn) {
                e.stopPropagation();
                var wrapper = formatBtn.closest('.code-block-wrapper');
                var codeEl = wrapper ? wrapper.querySelector('.code-pre code') : null;
                var label = formatBtn.querySelector('.format-label');
                var lineCountSpan = wrapper ? wrapper.querySelector('.sql-line-count') : null;
                if (codeEl) {
                  var isFormatted = codeEl.getAttribute('data-is-formatted') === 'true';
                  if (isFormatted) {
                    codeEl.innerHTML = codeEl.getAttribute('data-raw-html') || codeEl.getAttribute('data-raw-sql') || '';
                    codeEl.setAttribute('data-is-formatted', 'false');
                    if (label) label.textContent = 'Beautify';
                    formatBtn.classList.remove('text-[#38bdf8]', 'border-[#38bdf8]/50');
                    if (lineCountSpan) lineCountSpan.textContent = codeEl.getAttribute('data-raw-lines') || '';
                  } else {
                    codeEl.innerHTML = codeEl.getAttribute('data-formatted-html') || codeEl.getAttribute('data-formatted-sql') || '';
                    codeEl.setAttribute('data-is-formatted', 'true');
                    if (label) label.textContent = 'Original';
                    formatBtn.classList.add('text-[#38bdf8]', 'border-[#38bdf8]/50');
                    if (lineCountSpan) lineCountSpan.textContent = codeEl.getAttribute('data-formatted-lines') || '';
                  }
                }
                return;
              }
            });

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', function() {
                reportScroll();
                ensureMermaidAndRun();
                enhanceSqlAndCodeBlocks();
              });
            } else {
              reportScroll();
              ensureMermaidAndRun();
              enhanceSqlAndCodeBlocks();
            }
            window.addEventListener('load', function() {
              ensureMermaidAndRun();
              enhanceSqlAndCodeBlocks();
            });
          })();
        </script>
      `;

      // Never inject <base href="/"> into srcdoc iframes as it causes fragment links (#id) to reload the parent application
      const baseTag = '';
      const fontLink = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">';

      let themeInjections = '';
      if (!isMd) {
        const themeLinkTag = `<link rel="stylesheet" href="/notes-theme.css">`;
        const themeInlineStyle = globalCss
          ? `<style id="notes-theme-inline">${globalCss}</style>`
          : '';
        themeInjections = [fontLink, themeLinkTag, themeInlineStyle].filter(Boolean).join('\n');
      }

      if (hasDocType || (hasHtmlTag && hasBodyTag)) {
        let fullDoc = clean;

        if (isMd) {
          // If markdown, remove any notes-theme.css link tags
          fullDoc = fullDoc.replace(/<link\s+[^>]*href=["'][^"']*notes-theme\.css["'][^>]*>/gi, '');
        }

        const mdThemeEnforcer = isMd
          ? `<meta name="color-scheme" content="${isDarkMode ? 'dark' : 'light'}"><style id="theme-enforcer">
  :root, html, body {
    color-scheme: ${isDarkMode ? 'dark' : 'light'} !important;
  }
  ${isDarkMode ? `
  html, body {
    background-color: #0c1015 !important;
    color: #f1f5f9 !important;
  }
  ` : `
  html, body {
    background-color: #ffffff;
    color: #1c1e21;
  }
  `}
</style>`
          : '';
        const mdInjections = isMd
          ? `${MARKDOWN_FONTS_HTML}\n<style id="markdown-styles-injected">${getMarkdownStyles(isDarkMode)}</style>`
          : '';
        const allInjections = [mdThemeEnforcer, themeInjections, mdInjections].filter(Boolean).join('\n');

        if (isMd && isDarkMode) {
          if (/<html[^>]*class=["']/i.test(fullDoc)) {
            fullDoc = fullDoc.replace(/(<html[^>]*class=["'])([^"']*)(["'])/i, '$1$2 dark$3');
          } else if (/<html/i.test(fullDoc)) {
            fullDoc = fullDoc.replace(/<html/i, '<html class="dark" data-theme="dark"');
          }
          if (/<body[^>]*class=["']/i.test(fullDoc)) {
            fullDoc = fullDoc.replace(/(<body[^>]*class=["'])([^"']*)(["'])/i, '$1$2 dark$3');
          } else if (/<body/i.test(fullDoc)) {
            fullDoc = fullDoc.replace(/<body/i, '<body class="dark" data-theme="dark"');
          }
        }

        if (allInjections) {
          if (/<head[\s>]/i.test(fullDoc)) {
            fullDoc = fullDoc.replace(/<head(\s[^>]*)?>/i, (match) => {
              return `${match}\n${allInjections}`;
            });
          } else if (/<html[\s>]/i.test(fullDoc)) {
            fullDoc = fullDoc.replace(/<html(\s[^>]*)?>/i, (match) => {
              return `${match}\n<head>${allInjections}</head>`;
            });
          }
        }

        // Full HTML document authored by the user: inject script before </body> or at the end
        if (/<\/body>/i.test(fullDoc)) {
          return fullDoc.replace(/<\/body>/i, `${injectedScript}</body>`);
        }
        return `${fullDoc}${injectedScript}`;
      }

      // Raw snippet: wrap in a clean, modern HTML5 document with global CSS applied directly for HTML
      const hasNotebookWrapper = /class=["'][^"']*notebook-wrapper/i.test(clean);
      const bodyOpen = isMd
        ? `<body class="markdown-body markdown-preview-container ${isDarkMode ? 'dark' : ''}" data-theme="${isDarkMode ? 'dark' : 'light'}">`
        : `<body class="note-content">${hasNotebookWrapper ? '<div class="note-content">' : '<div class="notebook-wrapper note-content">'}`;
      const bodyClose = isMd
        ? '</body>'
        : '</div></body>';

      return `<!DOCTYPE html>
<html lang="en" class="${isMd && isDarkMode ? 'dark' : 'light'}" data-theme="${isMd && isDarkMode ? 'dark' : 'light'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title || 'Note'}</title>
  ${isMd ? MARKDOWN_FONTS_HTML : ''}
  <style>
    ${isMd ? getMarkdownStyles(isDarkMode) : `
    img { max-width: 100%; height: auto; border-radius: 8px; }
    svg { max-width: 100%; }
    pre.mermaid, pre.mermaid-raw-source, div.mermaid, .mermaid { background: transparent !important; border: none !important; padding: 0 !important; }
    `}
  </style>
  ${themeInjections}
</head>
${bodyOpen}
  ${clean}
  ${injectedScript}
${bodyClose}
</html>`;
    }, [compiledHtml, htmlContent, title, chapterId, globalCss, cssMode, includeGlobalCss, customCss, customCssFileName, isDarkMode]);

    // Expose control methods to parent component
    useImperativeHandle(ref, () => ({
      scrollToTop: () => {
        try {
          const win = iframeRef.current?.contentWindow;
          if (win) {
            win.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } catch (e) {}
      },
      scrollTo: (top: number, smooth = true) => {
        try {
          const win = iframeRef.current?.contentWindow;
          if (win) {
            win.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
          }
        } catch (e) {}
      },
      scrollToId: (id: string) => {
        try {
          const doc = iframeRef.current?.contentDocument;
          if (doc) {
            let cleanId = id.replace(/^[#/]+/, '').trim();
            try { cleanId = decodeURIComponent(cleanId); } catch (e) {}
            let targetEl: HTMLElement | null = (doc.getElementById(cleanId) ||
                           doc.getElementById(id) ||
                           doc.querySelector(`[name="${cleanId}"]`) ||
                           doc.querySelector(`[name="${id}"]`)) as HTMLElement | null;

            if (!targetEl) {
              const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
              const slugId = cleanId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

              // Pass 1: exact id or text slug match
              for (let i = 0; i < headings.length; i++) {
                const h = headings[i] as HTMLElement;
                const hId = (h.getAttribute('id') || '').toLowerCase();
                if (hId && hId === slugId) {
                  targetEl = h;
                  break;
                }
                const hText = (h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                if (hText && hText === slugId) {
                  targetEl = h;
                  break;
                }
              }

              // Pass 2: prefix or specific contains match
              if (!targetEl && slugId.length > 4) {
                for (let k = 0; k < headings.length; k++) {
                  const hk = headings[k] as HTMLElement;
                  const hkId = (hk.getAttribute('id') || '').toLowerCase();
                  if (hkId && (hkId.includes(slugId) || (hkId.length > 5 && slugId.includes(hkId)))) {
                    targetEl = hk;
                    break;
                  }
                }
              }
            }

            if (!targetEl) {
              const tokens = cleanId.toLowerCase().split(/[-_]+/).filter(t => t.length > 2);
              if (tokens.length > 0) {
                const allHeadings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
                let bestScore = 0;
                let bestEl: HTMLElement | null = null;
                for (let j = 0; j < allHeadings.length; j++) {
                  const el = allHeadings[j] as HTMLElement;
                  const text = (el.textContent || '').toLowerCase();
                  let score = 0;
                  for (let t = 0; t < tokens.length; t++) {
                    if (text.includes(tokens[t])) score++;
                  }
                  if (score > bestScore) {
                    bestScore = score;
                    bestEl = el;
                  }
                }
                if (bestScore > 0 && bestEl) targetEl = bestEl;
              }
            }

            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              targetEl.classList.remove('section-target-highlight');
              void targetEl.offsetWidth;
              targetEl.classList.add('section-target-highlight');
              setTimeout(() => {
                try { targetEl?.classList.remove('section-target-highlight'); } catch (e) {}
              }, 2200);
              return true;
            }
          }
        } catch (e) {}
        return false;
      },
      print: () => {
        try {
          iframeRef.current?.contentWindow?.print();
        } catch (e) {}
      },
      getIframeDocument: () => {
        try {
          return iframeRef.current?.contentDocument || null;
        } catch (e) {
          return null;
        }
      },
      getIframeWindow: () => {
        try {
          return iframeRef.current?.contentWindow || null;
        } catch (e) {
          return null;
        }
      },
    }));

    // Listen for scroll postMessages from the iframe
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (!event.data || event.data.type !== 'BROWSER_FRAME_SCROLL') return;
        if (event.data.chapterId && chapterId && event.data.chapterId !== chapterId) return;

        const { scrollTop, scrollHeight, clientHeight, activeHeadingId } = event.data;
        lastScrollTopRef.current = scrollTop;
        const maxScroll = scrollHeight - clientHeight;
        const progress = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100))) : 0;

        onScroll?.(scrollTop, scrollHeight, clientHeight, progress);
        if (typeof activeHeadingId === 'string' && activeHeadingId) {
          onActiveHeadingChange?.(activeHeadingId);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }, [chapterId, onScroll, onActiveHeadingChange]);

    // Keep Mermaid diagrams rendered when HTML updates dynamically
    useEffect(() => {
      const doc = iframeRef.current?.contentDocument;
      if (doc && isLoaded) {
        renderMermaidInDocument(doc, iframeRef.current?.contentWindow);
      }
    }, [preparedHtml, isLoaded]);

    // Handle iframe load event
    const handleIframeLoad = () => {
      setIsLoaded(true);
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          // Render Mermaid diagrams directly using bundled engine
          renderMermaidInDocument(doc, iframeRef.current?.contentWindow);

          // Extract table of contents headings
          if (onHeadingsExtracted) {
            const headings = doc.querySelectorAll('h1, h2, h3, section[id]');
            const items: { id: string; text: string; level: number }[] = [];
            headings.forEach((heading, idx) => {
              const text =
                heading.getAttribute('data-title') ||
                heading.textContent?.trim().slice(0, 80) ||
                `Section ${idx + 1}`;
              let id = heading.id;
              if (!id) {
                id = `heading-${idx}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                heading.id = id;
              }
              const level =
                heading.tagName === 'H1'
                  ? 1
                  : heading.tagName === 'H2'
                  ? 2
                  : heading.tagName === 'H3'
                  ? 3
                  : 2;
              items.push({ id, text, level });
            });
            onHeadingsExtracted(items);
          }

          // Restore initial scroll position if requested
          if (initialScrollTop && initialScrollTop > 0) {
            setTimeout(() => {
              iframeRef.current?.contentWindow?.scrollTo({ top: initialScrollTop, behavior: 'auto' });
            }, 80);
          }

          // Bulletproof link click interception on iframe document (Capture Phase)
          doc.addEventListener(
            'click',
            (e) => {
              const a = (e.target as HTMLElement)?.closest('a');
              if (!a) return;
              const href = a.getAttribute('href') || a.href || '';
              if (!href) return;

              // Any in-document anchor/hash link
              if (href.includes('#')) {
                e.preventDefault();
                e.stopPropagation();
                const hash = href.substring(href.indexOf('#'));
                const cleanId = hash.replace(/^#/, '').trim();
                if (cleanId) {
                  let targetEl =
                    doc.getElementById(cleanId) ||
                    doc.querySelector(`[name="${cleanId}"]`);
                  if (!targetEl) {
                    try {
                      targetEl = doc.querySelector(`[id="${CSS.escape(cleanId)}"]`);
                    } catch (err) {}
                  }
                  if (!targetEl) {
                    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    const slugId = cleanId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    for (let i = 0; i < headings.length; i++) {
                      const h = headings[i] as HTMLElement;
                      const hId = (h.getAttribute('id') || '').toLowerCase();
                      if (hId && hId === slugId) {
                        targetEl = h;
                        break;
                      }
                      const hText = (h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                      if (hText && hText === slugId) {
                        targetEl = h;
                        break;
                      }
                    }
                  }
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    targetEl.classList.remove('section-target-highlight');
                    void (targetEl as HTMLElement).offsetWidth;
                    targetEl.classList.add('section-target-highlight');
                    setTimeout(() => {
                      try {
                        targetEl?.classList.remove('section-target-highlight');
                      } catch (err) {}
                    }, 2200);
                  }
                }
                return;
              }

              // External links open safely in new window
              if (
                href.startsWith('http://') ||
                href.startsWith('https://') ||
                href.startsWith('mailto:')
              ) {
                e.preventDefault();
                e.stopPropagation();
                window.open(href, '_blank', 'noopener,noreferrer');
                return;
              }

              // Block all other relative or path links from navigating iframe
              e.preventDefault();
              e.stopPropagation();
            },
            true
          );
        }
      } catch (e) {}

      onReady?.();
    };

    const showLoadingOverlay = isLoading || (Boolean(htmlContent) && !isLoaded);
    const formattedSize =
      contentSize && contentSize > 0
        ? contentSize >= 1024
          ? `${(contentSize / 1024).toFixed(1)} KB`
          : `${contentSize} B`
        : null;

    return (
      <div className={`relative w-full h-full overflow-hidden ${isDarkMode ? 'bg-[#0c1015]' : 'bg-white'} ${className}`}>
        {showLoadingOverlay && (
          <div
            id="chapter-loading-spinner"
            data-testid="chapter-loading-spinner"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={`Loading ${title}`}
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 select-none transition-opacity duration-150 ${
              isDarkMode ? 'bg-[#0c1015] text-[#f1f5f9]' : 'bg-white text-[#1f2328]'
            }`}
          >
            <div className="flex flex-col items-center text-center max-w-sm gap-3.5">
              {/* Circular Spinner Ring */}
              <div className="relative w-11 h-11 flex items-center justify-center">
                <div
                  className={`w-11 h-11 rounded-full border-[3px] animate-spin ${
                    isDarkMode
                      ? 'border-[#1e293b] border-t-[#38bdf8] border-r-[#38bdf8]'
                      : 'border-[#e2e8f0] border-t-[#1877f2] border-r-[#1877f2]'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <p
                  className={`text-sm font-semibold tracking-tight truncate max-w-xs ${
                    isDarkMode ? 'text-[#f8fafc]' : 'text-[#0f172a]'
                  }`}
                >
                  {title && title !== 'Document' ? title : 'Loading chapter...'}
                </p>
                <p
                  className={`text-xs flex items-center justify-center gap-1.5 ${
                    isDarkMode ? 'text-[#94a3b8]' : 'text-[#64748b]'
                  }`}
                >
                  <span>{isLoading ? 'Loading chapter notes...' : 'Rendering preview...'}</span>
                  {formattedSize && (
                    <span className="font-mono text-[11px] opacity-80">({formattedSize})</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <iframe
          key={chapterId || title}
          ref={iframeRef}
          srcDoc={preparedHtml}
          title={title}
          className="w-full h-full border-0 block bg-transparent"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          onLoad={handleIframeLoad}
        />
      </div>
    );
  }
);

BrowserHtmlFrame.displayName = 'BrowserHtmlFrame';
