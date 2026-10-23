import mermaid from 'mermaid';

let currentTheme: 'dark' | 'light' | null = null;

/**
 * Detects whether the current document environment uses a dark theme.
 * Strictly verifies the actual document background color so that light-paper
 * themes (like the master notebook theme) are never mistaken for dark mode.
 */
export function detectIsDark(doc: Document): boolean {
  if (!doc) return false;
  const root = doc.documentElement;
  const body = doc.body;

  // 1. Explicit dark class or style on root/body
  if (root.classList.contains('dark') || body?.classList.contains('dark')) return true;
  if (root.style.colorScheme === 'dark' || body?.style.colorScheme === 'dark') return true;

  // 2. Check if body background is actually dark
  if (typeof window !== 'undefined' && doc.defaultView) {
    try {
      const win = doc.defaultView;
      const targetEl = body || root;
      const bg = win.getComputedStyle(targetEl).backgroundColor;
      const rgbMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        // Background has real dark color
        if (luminance < 128 && (r !== 0 || g !== 0 || b !== 0 || bg.includes('rgb(0, 0, 0)'))) {
          return true;
        }
        return false;
      }
    } catch {}
  }

  // 3. Explicit dark theme attribute
  if (doc.querySelector('.markdown-body.dark, [data-theme="dark"]')) return true;

  // Default to light (notebook theme is light paper)
  return false;
}

/**
 * Initializes Mermaid with precise GitHub Markdown styling.
 * Background is ALWAYS transparent so the SVG never displays an ugly dark cutout box!
 */
export function initMermaid(isDark: boolean = false, force: boolean = false) {
  const themeMode = isDark ? 'dark' : 'light';
  if (currentTheme === themeMode && !force) return;

  try {
    if (isDark) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        htmlLabels: true,
        useMaxWidth: true,
        fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Plus Jakarta Sans", sans-serif',
        fontSize: 13,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          padding: 16,
          nodeSpacing: 45,
          rankSpacing: 45,
        },
        sequence: {
          useMaxWidth: true,
          showSequenceNumbers: true,
          actorMargin: 50,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35,
        },
        gantt: { useMaxWidth: true },
        class: { useMaxWidth: true },
        state: { useMaxWidth: true },
        er: { useMaxWidth: true },
        journey: { useMaxWidth: true },
        pie: { useMaxWidth: true },
        gitGraph: { useMaxWidth: true },
        mindmap: { useMaxWidth: true },
        themeVariables: {
          darkMode: true,
          background: 'transparent',
          mainBkg: '#161b22',
          nodeBorder: '#475569',
          lineColor: '#64748b',
          textColor: '#f8fafc',
          primaryColor: '#1e293b',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#38bdf8',
          secondaryColor: '#161b22',
          secondaryTextColor: '#f8fafc',
          secondaryBorderColor: '#30363d',
          tertiaryColor: '#161b22',
          tertiaryTextColor: '#f8fafc',
          tertiaryBorderColor: '#30363d',
          clusterBkg: '#161b22',
          clusterBorder: '#30363d',
          titleColor: '#f8fafc',
          edgeLabelBackground: '#161b22',
          actorBkg: '#1e293b',
          actorBorder: '#38bdf8',
          actorTextColor: '#ffffff',
          actorLineColor: '#64748b',
          signalColor: '#94a3b8',
          signalTextColor: '#f8fafc',
          labelBoxBkgColor: '#161b22',
          labelBoxBorderColor: '#30363d',
          labelTextColor: '#f8fafc',
          loopTextColor: '#f8fafc',
          noteBorderColor: '#d29922',
          noteBkgColor: '#272115',
          noteTextColor: '#f0e6c8',
          activationBorderColor: '#38bdf8',
          activationBkgColor: '#1f6feb33',
          sequenceNumberColor: '#ffffff',
        },
      } as any);
    } else {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        htmlLabels: true,
        useMaxWidth: true,
        fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Plus Jakarta Sans", sans-serif',
        fontSize: 13,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          padding: 16,
          nodeSpacing: 45,
          rankSpacing: 45,
        },
        sequence: {
          useMaxWidth: true,
          showSequenceNumbers: true,
          actorMargin: 50,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35,
        },
        gantt: { useMaxWidth: true },
        class: { useMaxWidth: true },
        state: { useMaxWidth: true },
        er: { useMaxWidth: true },
        journey: { useMaxWidth: true },
        pie: { useMaxWidth: true },
        gitGraph: { useMaxWidth: true },
        mindmap: { useMaxWidth: true },
        themeVariables: {
          darkMode: false,
          background: 'transparent',
          mainBkg: '#f0f4f8',
          nodeBorder: '#cbd5e1',
          lineColor: '#64748b',
          textColor: '#0f172a',
          primaryColor: '#f0f4f8',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#cbd5e1',
          secondaryColor: '#ffffff',
          secondaryTextColor: '#0f172a',
          secondaryBorderColor: '#e2e8f0',
          tertiaryColor: '#f8fafc',
          tertiaryTextColor: '#334155',
          tertiaryBorderColor: '#e2e8f0',
          clusterBkg: '#f8fafc',
          clusterBorder: '#cbd5e1',
          titleColor: '#0f172a',
          edgeLabelBackground: '#ffffff',
          actorBkg: '#f0f4f8',
          actorBorder: '#64748b',
          actorTextColor: '#0f172a',
          actorLineColor: '#64748b',
          signalColor: '#64748b',
          signalTextColor: '#0f172a',
          labelBoxBkgColor: '#f8fafc',
          labelBoxBorderColor: '#cbd5e1',
          labelTextColor: '#0f172a',
          loopTextColor: '#0f172a',
          noteBorderColor: '#e2e8f0',
          noteBkgColor: '#fef3c7',
          noteTextColor: '#78350f',
          activationBorderColor: '#3b82f6',
          activationBkgColor: '#dbeafe',
          sequenceNumberColor: '#ffffff',
        },
      } as any);
    }
    currentTheme = themeMode;
  } catch (err) {
    console.warn('Failed to initialize mermaid:', err);
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Decode HTML entities like &quot;, &gt;, &lt;, &amp;
 */
export function decodeHtmlEntities(text: string): string {
  if (typeof document !== 'undefined') {
    try {
      const txt = document.createElement('textarea');
      txt.innerHTML = text;
      return txt.value.trim();
    } catch {}
  }
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * High-performance styles for code inside Mermaid diagrams (nodes, messages, classes)
 * and for the interactive Mermaid code panel viewer with syntax highlighting and split layout.
 */
export const MERMAID_CODE_STYLES = `
/* Code badges and monospace text inside Mermaid diagram nodes & SVG labels */
.mermaid-code-inline {
  display: inline-block !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
  line-height: 1.35 !important;
  padding: 1.5px 6px !important;
  margin: 0 1.5px !important;
  border-radius: 5px !important;
  background-color: rgba(241, 245, 249, 0.95) !important;
  color: #0f172a !important;
  border: 1px solid #cbd5e1 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  vertical-align: baseline !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}
.dark .mermaid-code-inline,
[data-theme="dark"] .mermaid-code-inline,
.markdown-body.dark .mermaid-code-inline {
  background-color: rgba(22, 27, 34, 0.92) !important;
  color: #f0f6fc !important;
  border-color: #30363d !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35) !important;
}

.mermaid-code-endpoint {
  display: inline-block !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  color: #0369a1 !important;
  background-color: rgba(224, 242, 254, 0.6) !important;
  padding: 1px 5px !important;
  border-radius: 4px !important;
  border: 1px solid rgba(186, 230, 253, 0.9) !important;
}
.dark .mermaid-code-endpoint,
[data-theme="dark"] .mermaid-code-endpoint,
.markdown-body.dark .mermaid-code-endpoint {
  color: #38bdf8 !important;
  background-color: rgba(12, 74, 110, 0.5) !important;
  border-color: rgba(2, 132, 199, 0.5) !important;
}

.mermaid-method-badge,
.method-badge,
.route-badge,
.mermaid-route-badge {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  padding: 1.5px 5.5px !important;
  border-radius: 4px !important;
  line-height: 1.15 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  margin-right: 3px !important;
  vertical-align: middle !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}
.mermaid-method-badge.method-get,
.method-badge.method-get,
.route-badge.get,
.route-badge.method-get {
  background: #e0f2fe !important;
  color: #0369a1 !important;
  border: 1px solid #7dd3fc !important;
}
.dark .mermaid-method-badge.method-get,
.dark .method-badge.method-get,
.dark .route-badge.get,
.dark .route-badge.method-get,
[data-theme="dark"] .mermaid-method-badge.method-get,
[data-theme="dark"] .method-badge.method-get,
[data-theme="dark"] .route-badge.get,
[data-theme="dark"] .route-badge.method-get {
  background: #082f49 !important;
  color: #38bdf8 !important;
  border-color: #0369a1 !important;
}
.mermaid-method-badge.method-post,
.method-badge.method-post,
.route-badge.post,
.route-badge.method-post {
  background: #dcfce7 !important;
  color: #15803d !important;
  border: 1px solid #86efac !important;
}
.dark .mermaid-method-badge.method-post,
.dark .method-badge.method-post,
.dark .route-badge.post,
.dark .route-badge.method-post,
[data-theme="dark"] .mermaid-method-badge.method-post,
[data-theme="dark"] .method-badge.method-post,
[data-theme="dark"] .route-badge.post,
[data-theme="dark"] .route-badge.method-post {
  background: #052e16 !important;
  color: #4ade80 !important;
  border-color: #15803d !important;
}
.mermaid-method-badge.method-put,
.mermaid-method-badge.method-patch,
.method-badge.method-put,
.method-badge.method-patch,
.route-badge.put,
.route-badge.patch,
.route-badge.method-put,
.route-badge.method-patch {
  background: #fef3c7 !important;
  color: #b45309 !important;
  border: 1px solid #fde68a !important;
}
.dark .mermaid-method-badge.method-put,
.dark .mermaid-method-badge.method-patch,
.dark .method-badge.method-put,
.dark .method-badge.method-patch,
.dark .route-badge.put,
.dark .route-badge.patch,
.dark .route-badge.method-put,
.dark .route-badge.method-patch,
[data-theme="dark"] .mermaid-method-badge.method-put,
[data-theme="dark"] .mermaid-method-badge.method-patch,
[data-theme="dark"] .method-badge.method-put,
[data-theme="dark"] .method-badge.method-patch,
[data-theme="dark"] .route-badge.put,
[data-theme="dark"] .route-badge.patch,
[data-theme="dark"] .route-badge.method-put,
[data-theme="dark"] .route-badge.method-patch {
  background: #451a03 !important;
  color: #fbbf24 !important;
  border-color: #b45309 !important;
}
.mermaid-method-badge.method-delete,
.method-badge.method-delete,
.route-badge.delete,
.route-badge.method-delete {
  background: #fee2e2 !important;
  color: #b91c1c !important;
  border: 1px solid #fca5a5 !important;
}
.dark .mermaid-method-badge.method-delete,
.dark .method-badge.method-delete,
.dark .route-badge.delete,
.dark .route-badge.method-delete,
[data-theme="dark"] .mermaid-method-badge.method-delete,
[data-theme="dark"] .method-badge.method-delete,
[data-theme="dark"] .route-badge.delete,
[data-theme="dark"] .route-badge.method-delete {
  background: #450a0a !important;
  color: #f87171 !important;
  border-color: #b91c1c !important;
}

.mermaid-status-badge,
.status-badge {
  display: inline-flex !important;
  align-items: center !important;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  padding: 1.5px 6px !important;
  border-radius: 4px !important;
  line-height: 1.2 !important;
  margin: 0 2px !important;
}
.mermaid-status-badge.status-200,
.status-badge.status-200 {
  background: #dcfce7 !important;
  color: #166534 !important;
  border: 1px solid #86efac !important;
}
.dark .mermaid-status-badge.status-200,
.dark .status-badge.status-200,
[data-theme="dark"] .mermaid-status-badge.status-200,
[data-theme="dark"] .status-badge.status-200 {
  background: #052e16 !important;
  color: #86efac !important;
  border-color: #15803d !important;
}
.mermaid-status-badge.status-err,
.status-badge.status-err {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border: 1px solid #fca5a5 !important;
}
.dark .mermaid-status-badge.status-err,
.dark .status-badge.status-err,
[data-theme="dark"] .mermaid-status-badge.status-err,
[data-theme="dark"] .status-badge.status-err {
  background: #450a0a !important;
  color: #fca5a5 !important;
  border-color: #991b1b !important;
}

.mermaid-db-cmd {
  display: inline-block !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  color: #6d28d9 !important;
  background: #ede9fe !important;
  border: 1px solid #c4b5fd !important;
  border-radius: 4px !important;
  padding: 0.5px 5px !important;
  margin-right: 3px !important;
}
.dark .mermaid-db-cmd,
[data-theme="dark"] .mermaid-db-cmd {
  color: #c4b5fd !important;
  background: #3b0764 !important;
  border-color: #6b21a8 !important;
}

.mermaid-fn-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-weight: 700 !important;
  color: #b45309 !important;
}
.dark .mermaid-fn-name,
[data-theme="dark"] .mermaid-fn-name {
  color: #fbbf24 !important;
}

/* SVG Typography enhancements for code inside nodes & sequence diagrams */
.mermaid-canvas svg .messageText,
.mermaid-container svg .messageText,
.diagram-wrapper svg .messageText,
.github-mermaid-block svg .messageText {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em !important;
}
.mermaid-canvas svg g.classGroup text,
.mermaid-container svg g.classGroup text,
.diagram-wrapper svg g.classGroup text,
.github-mermaid-block svg g.classGroup text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace !important;
  font-size: 11.5px !important;
}

/* Sequence Diagram Participant / Actor High-Contrast Accessibility (Dark & Light) */
.dark .mermaid-canvas svg text.actor,
.dark .mermaid-canvas svg text.actor > tspan,
.dark .mermaid-container svg text.actor,
.dark .mermaid-container svg text.actor > tspan,
.dark .diagram-wrapper svg text.actor,
.dark .diagram-wrapper svg text.actor > tspan,
.dark .github-mermaid-block svg text.actor,
.dark .github-mermaid-block svg text.actor > tspan,
.dark svg.mermaid text.actor,
.dark svg.mermaid text.actor > tspan,
.dark svg.mermaid-svg text.actor,
.dark svg.mermaid-svg text.actor > tspan,
[data-theme="dark"] svg text.actor,
[data-theme="dark"] svg text.actor > tspan,
.diagram-theme-dark svg text.actor,
.diagram-theme-dark svg text.actor > tspan,
.diagram-theme-dark text.actor,
.diagram-theme-dark text.actor > tspan {
  fill: #ffffff !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  font-size: 13.5px !important;
}

.dark .mermaid-canvas svg .actor,
.dark .mermaid-container svg .actor,
.dark .diagram-wrapper svg .actor,
.dark .github-mermaid-block svg .actor,
.dark svg.mermaid .actor,
.dark svg.mermaid-svg .actor,
[data-theme="dark"] svg .actor,
.diagram-theme-dark svg .actor {
  fill: #1e293b !important;
  stroke: #38bdf8 !important;
  stroke-width: 2px !important;
  rx: 8px !important;
  ry: 8px !important;
}

.dark .mermaid-canvas svg .actor-line,
.dark .mermaid-container svg .actor-line,
.dark .diagram-wrapper svg .actor-line,
.dark .github-mermaid-block svg .actor-line,
[data-theme="dark"] svg .actor-line,
.diagram-theme-dark svg .actor-line {
  stroke: #64748b !important;
  stroke-width: 1.5px !important;
  stroke-dasharray: 4, 4 !important;
}

.dark .mermaid-canvas svg .messageText,
.dark .mermaid-container svg .messageText,
.dark .diagram-wrapper svg .messageText,
.dark .github-mermaid-block svg .messageText,
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
.dark .diagram-wrapper svg .messageLine0,
.dark .diagram-wrapper svg .messageLine1,
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

/* Light Mode Overrides for Sequence Diagrams */
.diagram-theme-light svg text.actor,
.diagram-theme-light svg text.actor > tspan {
  fill: #0f172a !important;
  color: #0f172a !important;
  font-weight: 700 !important;
}
.diagram-theme-light svg .actor {
  fill: #ffffff !important;
  stroke: #2563eb !important;
  stroke-width: 2px !important;
}
.diagram-theme-light svg .messageText {
  fill: #0f172a !important;
  color: #0f172a !important;
}
.diagram-theme-light svg .messageLine0,
.diagram-theme-light svg .messageLine1 {
  stroke: #334155 !important;
}
.diagram-theme-light .diagram-header {
  background: #f8fafc !important;
  border-bottom-color: #cbd5e1 !important;
}
.diagram-theme-dark .diagram-header {
  background: #161b22 !important;
  border-bottom-color: #30363d !important;
}
.diagram-theme-light .diagram-title {
  color: #0f172a !important;
}
.diagram-theme-dark .diagram-title {
  color: #f8fafc !important;
}


/* Code Panel Container */
.mermaid-code-panel {
  display: none;
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace !important;
  font-size: 12.5px;
  border-top: 1px solid #cbd5e1;
  background-color: #f8fafc;
  color: #0f172a;
  box-sizing: border-box;
}
.dark .mermaid-code-panel,
[data-theme="dark"] .mermaid-code-panel,
.markdown-body.dark .mermaid-code-panel {
  border-top-color: #30363d;
  background-color: #0d1117;
  color: #e6edf3;
}
.mermaid-code-panel pre.mermaid-code-pre {
  margin: 0 !important;
  padding: 10px 0 !important;
  font-family: inherit !important;
  font-size: inherit;
  line-height: 22px !important;
  background: transparent !important;
  color: inherit !important;
  overflow-x: auto !important;
  box-sizing: border-box;
}
.mermaid-code-pre.is-wrapped .line-content {
  white-space: pre-wrap !important;
  word-break: break-all !important;
}

.code-line {
  display: flex;
  align-items: baseline;
  min-height: 22px;
  line-height: 22px;
  padding: 0 8px;
  border-left: 3px solid transparent;
  transition: background-color 0.1s ease, border-left-color 0.1s ease, opacity 0.15s ease;
}
.code-line:hover {
  background-color: rgba(2, 132, 199, 0.08);
  border-left-color: #0284c7;
}
.dark .code-line:hover,
[data-theme="dark"] .code-line:hover {
  background-color: rgba(56, 189, 248, 0.1);
  border-left-color: #38bdf8;
}
.code-line.is-highlighted {
  background-color: rgba(2, 132, 199, 0.16) !important;
  border-left-color: #0284c7 !important;
}
.dark .code-line.is-highlighted,
[data-theme="dark"] .code-line.is-highlighted {
  background-color: rgba(56, 189, 248, 0.22) !important;
  border-left-color: #38bdf8 !important;
}
.code-line.is-dimmed {
  opacity: 0.28 !important;
}

.line-num {
  flex: 0 0 40px;
  width: 40px;
  text-align: right;
  padding-right: 12px;
  color: #94a3b8;
  font-size: 11px;
  font-family: inherit;
  user-select: none;
  cursor: pointer;
}
.dark .line-num,
[data-theme="dark"] .line-num {
  color: #6e7681;
}
.line-content {
  flex: 1 1 auto;
  white-space: pre;
  tab-size: 2;
  font-family: inherit;
  color: inherit;
}

/* Syntax Tokens */
.tok-comment {
  color: #6a737d !important;
  font-style: italic;
}
.dark .tok-comment,
[data-theme="dark"] .tok-comment {
  color: #8b949e !important;
}
.tok-diagram {
  color: #8250df !important;
  font-weight: 700;
}
.dark .tok-diagram,
[data-theme="dark"] .tok-diagram {
  color: #d2a8ff !important;
}
.tok-keyword {
  color: #0550ae !important;
  font-weight: 600;
}
.dark .tok-keyword,
[data-theme="dark"] .tok-keyword {
  color: #79c0ff !important;
}
.tok-dir {
  color: #cf222e !important;
  font-weight: 700;
}
.dark .tok-dir,
[data-theme="dark"] .tok-dir {
  color: #ff7b72 !important;
}
.tok-arrow {
  color: #bc4c00 !important;
  font-weight: 700;
}
.dark .tok-arrow,
[data-theme="dark"] .tok-arrow {
  color: #ffa657 !important;
}
.tok-string {
  color: #116329 !important;
  background-color: rgba(175, 184, 193, 0.16);
  border-radius: 3px;
  padding: 0.5px 3px;
}
.dark .tok-string,
[data-theme="dark"] .tok-string {
  color: #7ee787 !important;
  background-color: rgba(110, 118, 129, 0.22);
}
.tok-label {
  color: #0969da !important;
  font-weight: 500;
}
.dark .tok-label,
[data-theme="dark"] .tok-label {
  color: #58a6ff !important;
}
.tok-type {
  color: #953800 !important;
  font-weight: 600;
}
.dark .tok-type,
[data-theme="dark"] .tok-type {
  color: #ffa657 !important;
}
.tok-shape {
  color: #24292f !important;
  font-weight: 600;
}
.dark .tok-shape,
[data-theme="dark"] .tok-shape {
  color: #f0f6fc !important;
}

.tok-id {
  color: #0550ae !important;
  font-weight: 700;
}
.dark .tok-id,
[data-theme="dark"] .tok-id {
  color: #79c0ff !important;
}

.tok-quote {
  color: #0969da;
  opacity: 0.65;
}
.dark .tok-quote,
[data-theme="dark"] .tok-quote {
  color: #79c0ff;
  opacity: 0.65;
}

.tok-method {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  padding: 1px 4.5px;
  border-radius: 3px;
  margin: 0 2px;
  letter-spacing: 0.02em;
  vertical-align: baseline;
}
.tok-method-get {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}
.dark .tok-method-get,
[data-theme="dark"] .tok-method-get {
  background: #1e3a8a;
  color: #bfdbfe;
  border-color: #2563eb;
}
.tok-method-post {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}
.dark .tok-method-post,
[data-theme="dark"] .tok-method-post {
  background: #14532d;
  color: #bbf7d0;
  border-color: #16a34a;
}
.tok-method-put,
.tok-method-patch {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}
.dark .tok-method-put,
.dark .tok-method-patch,
[data-theme="dark"] .tok-method-put,
[data-theme="dark"] .tok-method-patch {
  background: #78350f;
  color: #fde68a;
  border-color: #d97706;
}
.tok-method-delete {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.dark .tok-method-delete,
[data-theme="dark"] .tok-method-delete {
  background: #7f1d1d;
  color: #fecaca;
  border-color: #dc2626;
}

.tok-endpoint {
  color: #0284c7 !important;
  font-weight: 600;
}
.dark .tok-endpoint,
[data-theme="dark"] .tok-endpoint {
  color: #38bdf8 !important;
}

.tok-status-200 {
  display: inline-block;
  background: #dcfce7;
  color: #15803d;
  font-weight: 700;
  font-size: 10px;
  padding: 0.5px 4.5px;
  border-radius: 3px;
  border: 1px solid #86efac;
  margin: 0 2px;
}
.dark .tok-status-200,
[data-theme="dark"] .tok-status-200 {
  background: #14532d;
  color: #86efac;
  border-color: #16a34a;
}
.tok-status-err {
  display: inline-block;
  background: #fee2e2;
  color: #b91c1c;
  font-weight: 700;
  font-size: 10px;
  padding: 0.5px 4.5px;
  border-radius: 3px;
  border: 1px solid #fca5a5;
  margin: 0 2px;
}
.dark .tok-status-err,
[data-theme="dark"] .tok-status-err {
  background: #7f1d1d;
  color: #fca5a5;
  border-color: #dc2626;
}

.tok-inline-code {
  background: rgba(175, 184, 193, 0.2);
  color: #cf222e;
  padding: 1px 4.5px;
  border-radius: 3px;
  font-family: inherit;
  font-size: 11px;
}
.dark .tok-inline-code,
[data-theme="dark"] .tok-inline-code {
  background: rgba(110, 118, 129, 0.3);
  color: #ff7b72;
}

.tok-fn {
  color: #8250df !important;
  font-weight: 600;
}
.dark .tok-fn,
[data-theme="dark"] .tok-fn {
  color: #d2a8ff !important;
}

/* Diagram Only View */
.github-mermaid-block.view-diagram .mermaid-code-panel,
.diagram-wrapper.view-diagram .mermaid-code-panel {
  display: none !important;
}
.github-mermaid-block.view-diagram .mermaid-viewport,
.diagram-wrapper.view-diagram .mermaid-viewport {
  display: flex !important;
  width: 100% !important;
}

/* Code Only View */
.github-mermaid-block.view-code .mermaid-viewport,
.diagram-wrapper.view-code .mermaid-viewport {
  display: none !important;
}
.github-mermaid-block.view-code .mermaid-code-panel,
.diagram-wrapper.view-code .mermaid-code-panel {
  display: flex !important;
  width: 100% !important;
  border-top: none !important;
}
.github-mermaid-block.is-fullscreen.view-code .mermaid-code-panel,
.diagram-wrapper.is-fullscreen.view-code .mermaid-code-panel {
  height: calc(100vh - 52px) !important;
  max-height: calc(100vh - 52px) !important;
}
.github-mermaid-block.is-fullscreen.view-code .mermaid-code-body,
.diagram-wrapper.is-fullscreen.view-code .mermaid-code-body {
  max-height: calc(100vh - 100px) !important;
}

/* Split View Layout (Diagram & Code Side-by-Side) */
.github-mermaid-block.view-split,
.diagram-wrapper.view-split {
  display: flex !important;
  flex-direction: column !important;
}
.github-mermaid-block.view-split .mermaid-split-body,
.diagram-wrapper.view-split .mermaid-split-body {
  display: grid !important;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr) !important;
  width: 100% !important;
  height: 520px !important;
  min-height: 520px !important;
  max-height: 600px !important;
  overflow: hidden !important;
}
@media (max-width: 900px) {
  .github-mermaid-block.view-split .mermaid-split-body,
  .diagram-wrapper.view-split .mermaid-split-body {
    grid-template-columns: 1fr !important;
    height: auto !important;
    max-height: none !important;
  }
}
.github-mermaid-block.view-split .mermaid-viewport,
.diagram-wrapper.view-split .mermaid-viewport {
  border-right: 1.5px solid #cbd5e1 !important;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
}
.dark .github-mermaid-block.view-split .mermaid-viewport,
.dark .diagram-wrapper.view-split .mermaid-viewport,
[data-theme="dark"] .github-mermaid-block.view-split .mermaid-viewport,
[data-theme="dark"] .diagram-wrapper.view-split .mermaid-viewport {
  border-right-color: #30363d !important;
}
.github-mermaid-block.view-split .mermaid-code-panel,
.diagram-wrapper.view-split .mermaid-code-panel {
  border-top: none !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
}
.github-mermaid-block.view-split .mermaid-code-body,
.diagram-wrapper.view-split .mermaid-code-body {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  max-height: calc(100% - 40px) !important;
}

/* Fullscreen in Split Mode */
.github-mermaid-block.is-fullscreen.view-split .mermaid-split-body,
.diagram-wrapper.is-fullscreen.view-split .mermaid-split-body {
  height: calc(100vh - 52px) !important;
  max-height: calc(100vh - 52px) !important;
  min-height: calc(100vh - 52px) !important;
}

/* Colorful Modern Diagram Headers */
.diagram-header {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 10px 16px !important;
  border-bottom: 1.5px solid #cbd5e1 !important;
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

.diagram-accent-bar {
  display: none !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 0 !important;
  z-index: 10 !important;
}

/* Color theme variants for diagram headers */
.diagram-header-violet {
  background: linear-gradient(135deg, rgba(245, 243, 255, 0.98) 0%, rgba(237, 233, 254, 0.75) 45%, #ffffff 100%) !important;
  border-bottom-color: #ddd6fe !important;
}
.dark .diagram-header-violet,
[data-theme="dark"] .diagram-header-violet {
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(46, 16, 101, 0.65) 45%, #0d1117 100%) !important;
  border-bottom-color: #4c1d95 !important;
}

.diagram-header-sky {
  background: linear-gradient(135deg, rgba(240, 249, 255, 0.98) 0%, rgba(224, 242, 254, 0.75) 45%, #ffffff 100%) !important;
  border-bottom-color: #bae6fd !important;
}
.dark .diagram-header-sky,
[data-theme="dark"] .diagram-header-sky {
  background: linear-gradient(135deg, rgba(8, 47, 73, 0.9) 0%, rgba(12, 74, 110, 0.65) 45%, #0d1117 100%) !important;
  border-bottom-color: #0369a1 !important;
}

.diagram-header-emerald {
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.98) 0%, rgba(204, 251, 241, 0.75) 45%, #ffffff 100%) !important;
  border-bottom-color: #a7f3d0 !important;
}
.dark .diagram-header-emerald,
[data-theme="dark"] .diagram-header-emerald {
  background: linear-gradient(135deg, rgba(6, 78, 59, 0.9) 0%, rgba(4, 47, 46, 0.65) 45%, #0d1117 100%) !important;
  border-bottom-color: #065f46 !important;
}

.diagram-header-amber {
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.98) 0%, rgba(254, 243, 199, 0.75) 45%, #ffffff 100%) !important;
  border-bottom-color: #fde68a !important;
}
.dark .diagram-header-amber,
[data-theme="dark"] .diagram-header-amber {
  background: linear-gradient(135deg, rgba(69, 26, 3, 0.9) 0%, rgba(41, 18, 2, 0.65) 45%, #0d1117 100%) !important;
  border-bottom-color: #78350f !important;
}

.diagram-header-purple {
  background: linear-gradient(135deg, rgba(250, 245, 255, 0.98) 0%, rgba(243, 232, 255, 0.75) 45%, #ffffff 100%) !important;
  border-bottom-color: #e9d5ff !important;
}
.dark .diagram-header-purple,
[data-theme="dark"] .diagram-header-purple {
  background: linear-gradient(135deg, rgba(59, 7, 100, 0.9) 0%, rgba(46, 16, 101, 0.65) 45%, #0d1117 100%) !important;
  border-bottom-color: #581c87 !important;
}

.diagram-header-green {
  background: linear-gradient(135deg, rgba(240, 253, 244, 0.98) 0%, rgba(220, 252, 231, 0.75) 45%, #ffffff 100%) !important;
  border-bottom-color: #bbf7d0 !important;
}
.dark .diagram-header-green,
[data-theme="dark"] .diagram-header-green {
  background: linear-gradient(135deg, rgba(20, 83, 45, 0.9) 0%, rgba(5, 46, 22, 0.65) 45%, #0d1117 100%) !important;
  border-bottom-color: #166534 !important;
}

.diagram-header-pink {
  background: linear-gradient(135deg, rgba(253, 242, 248, 0.98) 0%, rgba(252, 231, 243, 0.75) 45%, #ffffff 100%) !important;
  border-bottom-color: #fbcfe8 !important;
}
.dark .diagram-header-pink,
[data-theme="dark"] .diagram-header-pink {
  background: linear-gradient(135deg, rgba(80, 7, 36, 0.9) 0%, rgba(53, 11, 45, 0.65) 45%, #0d1117 100%) !important;
  border-bottom-color: #700f3b !important;
}

.diagram-header-rose {
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.98) 0%, rgba(255, 228, 230, 0.75) 45%, #ffffff 100%) !important;
  border-bottom-color: #fecdd3 !important;
}
.dark .diagram-header-rose,
[data-theme="dark"] .diagram-header-rose {
  background: linear-gradient(135deg, rgba(76, 5, 25, 0.9) 0%, rgba(59, 7, 22, 0.65) 45%, #0d1117 100%) !important;
  border-bottom-color: #881337 !important;
}

/* Category kicker typography */
.diagram-type-kicker {
  display: block !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  line-height: 1.2 !important;
  margin-bottom: 2px !important;
}
.diagram-header-violet .diagram-type-kicker { color: #7c3aed !important; }
.dark .diagram-header-violet .diagram-type-kicker,
[data-theme="dark"] .diagram-header-violet .diagram-type-kicker { color: #a78bfa !important; }

.diagram-header-sky .diagram-type-kicker { color: #0284c7 !important; }
.dark .diagram-header-sky .diagram-type-kicker,
[data-theme="dark"] .diagram-header-sky .diagram-type-kicker { color: #38bdf8 !important; }

.diagram-header-emerald .diagram-type-kicker { color: #059669 !important; }
.dark .diagram-header-emerald .diagram-type-kicker,
[data-theme="dark"] .diagram-header-emerald .diagram-type-kicker { color: #34d399 !important; }

.diagram-header-amber .diagram-type-kicker { color: #d97706 !important; }
.dark .diagram-header-amber .diagram-type-kicker,
[data-theme="dark"] .diagram-header-amber .diagram-type-kicker { color: #fbbf24 !important; }

.diagram-header-purple .diagram-type-kicker { color: #9333ea !important; }
.dark .diagram-header-purple .diagram-type-kicker,
[data-theme="dark"] .diagram-header-purple .diagram-type-kicker { color: #c084fc !important; }

.diagram-header-green .diagram-type-kicker { color: #16a34a !important; }
.dark .diagram-header-green .diagram-type-kicker,
[data-theme="dark"] .diagram-header-green .diagram-type-kicker { color: #4ade80 !important; }

.diagram-header-pink .diagram-type-kicker { color: #db2777 !important; }
.dark .diagram-header-pink .diagram-type-kicker,
[data-theme="dark"] .diagram-header-pink .diagram-type-kicker { color: #f472b6 !important; }

.diagram-header-rose .diagram-type-kicker { color: #e11d48 !important; }
.dark .diagram-header-rose .diagram-type-kicker,
[data-theme="dark"] .diagram-header-rose .diagram-type-kicker { color: #fb7185 !important; }

/* Glowing icon badge */
.diagram-icon-badge {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  border-radius: 9px !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  flex-shrink: 0 !important;
  user-select: none !important;
  transition: transform 0.15s ease !important;
}
.diagram-header:hover .diagram-icon-badge {
  transform: scale(1.05) !important;
}

.diagram-title {
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  letter-spacing: -0.015em !important;
  line-height: 1.3 !important;
}
.dark .diagram-title,
[data-theme="dark"] .diagram-title {
  color: #f8fafc !important;
}

/* High-Contrast Diagram Toolbar */
.diagram-toolbar {
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
  background: #f8fafc !important;
  border: 1.5px solid #cbd5e1 !important;
  border-radius: 10px !important;
  padding: 3px 5px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}
.dark .diagram-toolbar,
[data-theme="dark"] .diagram-toolbar,
html.dark .diagram-toolbar,
body.dark .diagram-toolbar,
.markdown-body.dark .diagram-toolbar {
  background: #0d1117 !important;
  border-color: #30363d !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35) !important;
}

.diagram-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 28px !important;
  padding: 0 8px !important;
  border-radius: 6px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  color: #334155 !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  white-space: nowrap !important;
}
.diagram-btn:hover {
  background: #e2e8f0 !important;
  color: #0f172a !important;
}
.dark .diagram-btn,
[data-theme="dark"] .diagram-btn,
html.dark .diagram-btn,
body.dark .diagram-btn,
.markdown-body.dark .diagram-btn {
  color: #cbd5e1 !important;
}
.dark .diagram-btn:hover,
[data-theme="dark"] .diagram-btn:hover,
html.dark .diagram-btn:hover,
body.dark .diagram-btn:hover,
.markdown-body.dark .diagram-btn:hover {
  background: #21262d !important;
  color: #f8fafc !important;
}

.diagram-toolbar .zoom-val,
.diagram-toolbar .zoom-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-weight: 700 !important;
  font-size: 11.5px !important;
  color: #0f172a !important;
}
.diagram-zoom-indicator {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 28px !important;
  padding: 0 8px !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  background: #f1f5f9 !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
  user-select: none !important;
}
.dark .diagram-zoom-indicator,
[data-theme="dark"] .diagram-zoom-indicator,
html.dark .diagram-zoom-indicator,
body.dark .diagram-zoom-indicator,
.markdown-body.dark .diagram-zoom-indicator {
  color: #f0f6fc !important;
  background: #161b22 !important;
  border-color: #30363d !important;
}
.diag-divider {
  display: inline-block !important;
  width: 1px !important;
  height: 16px !important;
  background: #cbd5e1 !important;
  margin: 0 2px !important;
}
.dark .diag-divider,
[data-theme="dark"] .diag-divider,
html.dark .diag-divider,
body.dark .diag-divider,
.markdown-body.dark .diag-divider {
  background: #30363d !important;
}
.zoom-control-btn.zoom-btn-fit,
.zoom-control-btn.zoom-btn-reset {
  padding: 0 8px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  gap: 3px !important;
}
.zoom-control-btn.zoom-btn-fit:hover {
  background: #dbeafe !important;
  color: #1d4ed8 !important;
}
.zoom-control-btn.zoom-btn-reset:hover {
  background: #e0e7ff !important;
  color: #4338ca !important;
}
.dark .zoom-control-btn.zoom-btn-fit:hover,
[data-theme="dark"] .zoom-control-btn.zoom-btn-fit:hover {
  background: #1e3a8a55 !important;
  color: #60a5fa !important;
}
.dark .zoom-control-btn.zoom-btn-reset:hover,
[data-theme="dark"] .zoom-control-btn.zoom-btn-reset:hover {
  background: #312e8155 !important;
  color: #a5b4fc !important;
}
.dark .diagram-toolbar .zoom-val,
.dark .diagram-toolbar .zoom-text,
[data-theme="dark"] .diagram-toolbar .zoom-val,
[data-theme="dark"] .diagram-toolbar .zoom-text,
html.dark .diagram-toolbar .zoom-val,
body.dark .diagram-toolbar .zoom-val,
.markdown-body.dark .diagram-toolbar .zoom-val {
  color: #f8fafc !important;
}

/* Floating Zoom Control Overlay - Initial Position: Bottom-Right */
.mermaid-viewport {
  position: relative !important;
}
.note-content .mermaid-zoom-overlay,
.mermaid-zoom-overlay,
.mermaid-zoom-badge {
  position: absolute !important;
  bottom: 16px !important;
  right: 16px !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  margin: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  padding: 4px 6px !important;
  border-radius: 9999px !important;
  background: rgba(255, 255, 255, 0.94) !important;
  border: 1px solid #cbd5e1 !important;
  color: #334155 !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  z-index: 30 !important;
  user-select: none !important;
  pointer-events: auto !important;
  transition: all 0.2s ease !important;
}
.dark .note-content .mermaid-zoom-overlay,
.dark .mermaid-zoom-overlay,
.dark .mermaid-zoom-badge,
[data-theme="dark"] .mermaid-zoom-badge,
[data-theme="dark"] .mermaid-zoom-overlay {
  background: rgba(15, 23, 42, 0.94) !important;
  border-color: #334155 !important;
  color: #cbd5e1 !important;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45) !important;
}
.note-content .mermaid-zoom-overlay:hover,
.mermaid-zoom-overlay:hover,
.mermaid-zoom-badge:hover {
  background: #ffffff !important;
  border-color: #94a3b8 !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06) !important;
  transform: translateY(-1px) !important;
}
.dark .note-content .mermaid-zoom-overlay:hover,
.dark .mermaid-zoom-overlay:hover,
.dark .mermaid-zoom-badge:hover,
[data-theme="dark"] .mermaid-zoom-badge:hover {
  background: #0f172a !important;
  border-color: #475569 !important;
}
.mermaid-floating-legend-btn {
  position: absolute !important;
  bottom: 14px !important;
  left: 14px !important;
  right: auto !important;
  top: auto !important;
  transform: none !important;
  margin: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 5px 12px !important;
  border-radius: 9999px !important;
  background: rgba(255, 255, 255, 0.94) !important;
  border: 1px solid #cbd5e1 !important;
  color: #334155 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  z-index: 30 !important;
  user-select: none !important;
  cursor: pointer !important;
  transition: all 0.18s ease !important;
}
.dark .mermaid-floating-legend-btn,
[data-theme="dark"] .mermaid-floating-legend-btn {
  background: rgba(22, 27, 34, 0.94) !important;
  border-color: #30363d !important;
  color: #c9d1d9 !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45) !important;
}
.mermaid-legend-overlay {
  position: absolute !important;
  top: 48px !important;
  left: 14px !important;
  right: auto !important;
  z-index: 40 !important;
}
.zoom-control-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 28px !important;
  min-width: 28px !important;
  padding: 0 8px !important;
  border-radius: 9999px !important;
  border: none !important;
  background: transparent !important;
  color: inherit !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  user-select: none !important;
}
.zoom-control-btn:hover {
  background: #f1f5f9 !important;
  color: #1d4ed8 !important;
  transform: scale(1.05) !important;
}
.dark .zoom-control-btn:hover,
[data-theme="dark"] .zoom-control-btn:hover {
  background: #1e293b !important;
  color: #60a5fa !important;
}
.zoom-indicator-btn {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  gap: 4px !important;
  padding: 0 8px !important;
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
}
.dark .zoom-indicator-btn,
[data-theme="dark"] .zoom-indicator-btn {
  background: #1e293b !important;
  border-color: #334155 !important;
  color: #e2e8f0 !important;
}

/* Markdown Preview Container Aesthetic */
.markdown-preview-container {
  width: 100% !important;
  max-width: 1024px !important;
  margin: 0 auto !important;
  padding: 2rem 1.75rem 4rem !important;
  box-sizing: border-box !important;
  background-color: #ffffff !important;
  color: #0f172a !important;
  border-radius: 1rem !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03) !important;
  overflow-x: auto !important;
}
@media (max-width: 768px) {
  .markdown-preview-container {
    padding: 1.25rem 1rem 3rem !important;
    border-radius: 0.75rem !important;
  }
}
.dark .markdown-preview-container,
[data-theme="dark"] .markdown-preview-container,
.markdown-preview-container.dark,
.markdown-body.dark.markdown-preview-container,
html.dark .markdown-preview-container,
body.dark .markdown-preview-container {
  background-color: #0d1117 !important;
  color: #e6edf3 !important;
  border-color: #30363d !important;
  box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.4), 0 2px 8px -1px rgba(0, 0, 0, 0.25) !important;
}

.markdown-preview-container code,
.markdown-preview-container pre,
.markdown-preview-container kbd,
.markdown-preview-container samp,
.markdown-preview-container .code-pre,
.markdown-preview-container .mermaid-code-pre,
.markdown-preview-container .code-block-wrapper pre,
.markdown-preview-container .sql-code-block pre,
.markdown-preview-container pre code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-feature-settings: "liga" on, "calt" on;
}

.markdown-preview-container pre:not(.mermaid):not(.mermaid-raw-source) {
  padding: 1rem 1.25rem !important;
  border-radius: 0.75rem !important;
  border: 1px solid #cbd5e1 !important;
  background-color: #f8fafc !important;
  color: #0f172a !important;
  overflow-x: auto !important;
  margin: 1.25rem 0 !important;
  line-height: 1.6 !important;
}

.dark .markdown-preview-container pre:not(.mermaid):not(.mermaid-raw-source),
[data-theme="dark"] .markdown-preview-container pre:not(.mermaid):not(.mermaid-raw-source),
html.dark .markdown-preview-container pre:not(.mermaid):not(.mermaid-raw-source),
body.dark .markdown-preview-container pre:not(.mermaid):not(.mermaid-raw-source) {
  background-color: #161b22 !important;
  color: #e6edf3 !important;
  border-color: #30363d !important;
}

.markdown-preview-container .diagram-wrapper,
.markdown-preview-container .github-mermaid-block,
.markdown-preview-container .mermaid-split-body,
.markdown-preview-container .mermaid-viewport,
.markdown-preview-container .mermaid-container,
.markdown-preview-container .mermaid-diagram-wrap,
.markdown-preview-container pre:not(.mermaid):not(.mermaid-raw-source),
.markdown-preview-container table,
.markdown-preview-container .data-table {
  max-width: 100% !important;
  overflow-x: auto !important;
  border-radius: 0.75rem !important;
  box-sizing: border-box !important;
}

.markdown-preview-container svg.mermaid-svg,
.markdown-preview-container .mermaid-canvas svg,
.markdown-preview-container .mermaid-viewport svg {
  max-width: 100% !important;
  height: auto !important;
}
`;

export interface DiagramTheme {
  title: string;
  icon: string;
  type: string;
  colorName: string;
  accentColor: string;
  gradient: string;
  glowColor: string;
  kickerColor: string;
  headerBgLight: string;
  headerBgDark: string;
  borderColorLight: string;
  borderColorDark: string;
}

/**
 * Extracts metadata (clean title, icon, diagram category, colorful theme palette) from raw Mermaid definition
 */
export function detectDiagramMeta(rawCode: string): DiagramTheme {
  const code = (rawCode || '').trim();
  // Check for explicit title directive: title: My Diagram or --- title: ... ---
  const titleMatch = code.match(/^\s*(?:title\s*:\s*|---\s*title\s*:\s*)([^\n\-]+)/i);
  const customTitle = titleMatch && titleMatch[1].trim() ? titleMatch[1].trim() : '';

  if (/^sequenceDiagram/i.test(code) || /\bsequence\b/i.test(code)) {
    return {
      title: customTitle || 'Sequence Flow Diagram',
      icon: '⚡',
      type: 'Sequence Flow',
      colorName: 'violet',
      accentColor: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
      glowColor: 'rgba(139, 92, 246, 0.35)',
      kickerColor: '#7c3aed',
      headerBgLight: 'linear-gradient(135deg, rgba(245, 243, 255, 0.98) 0%, rgba(237, 233, 254, 0.75) 45%, #ffffff 100%)',
      headerBgDark: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(46, 16, 101, 0.65) 45%, #0d1117 100%)',
      borderColorLight: '#ddd6fe',
      borderColorDark: '#4c1d95',
    };
  }

  if (/^stateDiagram/i.test(code) || /\bstate\b/i.test(code)) {
    return {
      title: customTitle || 'State Transition Machine',
      icon: '🔄',
      type: 'State Machine',
      colorName: 'amber',
      accentColor: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #ef4444 100%)',
      glowColor: 'rgba(234, 88, 12, 0.35)',
      kickerColor: '#d97706',
      headerBgLight: 'linear-gradient(135deg, rgba(255, 251, 235, 0.98) 0%, rgba(254, 243, 199, 0.75) 45%, #ffffff 100%)',
      headerBgDark: 'linear-gradient(135deg, rgba(69, 26, 3, 0.9) 0%, rgba(41, 18, 2, 0.65) 45%, #0d1117 100%)',
      borderColorLight: '#fde68a',
      borderColorDark: '#78350f',
    };
  }

  if (/^classDiagram/i.test(code) || /\bclass\b/i.test(code)) {
    return {
      title: customTitle || 'Class & Interface Architecture',
      icon: '📐',
      type: 'Class Architecture',
      colorName: 'emerald',
      accentColor: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 50%, #06b6d4 100%)',
      glowColor: 'rgba(16, 185, 129, 0.35)',
      kickerColor: '#059669',
      headerBgLight: 'linear-gradient(135deg, rgba(236, 253, 245, 0.98) 0%, rgba(204, 251, 241, 0.75) 45%, #ffffff 100%)',
      headerBgDark: 'linear-gradient(135deg, rgba(6, 78, 59, 0.9) 0%, rgba(4, 47, 46, 0.65) 45%, #0d1117 100%)',
      borderColorLight: '#a7f3d0',
      borderColorDark: '#065f46',
    };
  }

  if (/^erDiagram/i.test(code) || /\b(entity|schema|database|relational)\b/i.test(code)) {
    return {
      title: customTitle || 'Entity-Relationship Model',
      icon: '🗄️',
      type: 'Database & Schema',
      colorName: 'purple',
      accentColor: '#a855f7',
      gradient: 'linear-gradient(135deg, #9333ea 0%, #c084fc 50%, #3b82f6 100%)',
      glowColor: 'rgba(168, 85, 247, 0.35)',
      kickerColor: '#9333ea',
      headerBgLight: 'linear-gradient(135deg, rgba(250, 245, 255, 0.98) 0%, rgba(243, 232, 255, 0.75) 45%, #ffffff 100%)',
      headerBgDark: 'linear-gradient(135deg, rgba(59, 7, 100, 0.9) 0%, rgba(46, 16, 101, 0.65) 45%, #0d1117 100%)',
      borderColorLight: '#e9d5ff',
      borderColorDark: '#581c87',
    };
  }

  if (/^gitGraph/i.test(code) || /\bgit\b/i.test(code)) {
    return {
      title: customTitle || 'Git Branch Workflow',
      icon: '🌿',
      type: 'Git Workflow',
      colorName: 'green',
      accentColor: '#16a34a',
      gradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #10b981 100%)',
      glowColor: 'rgba(22, 163, 74, 0.35)',
      kickerColor: '#15803d',
      headerBgLight: 'linear-gradient(135deg, rgba(240, 253, 244, 0.98) 0%, rgba(220, 252, 231, 0.75) 45%, #ffffff 100%)',
      headerBgDark: 'linear-gradient(135deg, rgba(20, 83, 45, 0.9) 0%, rgba(5, 46, 22, 0.65) 45%, #0d1117 100%)',
      borderColorLight: '#bbf7d0',
      borderColorDark: '#166534',
    };
  }

  if (/^mindmap/i.test(code)) {
    return {
      title: customTitle || 'Mind Map Concept Flow',
      icon: '🧠',
      type: 'Mind Map',
      colorName: 'pink',
      accentColor: '#ec4899',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #8b5cf6 100%)',
      glowColor: 'rgba(236, 72, 153, 0.35)',
      kickerColor: '#db2777',
      headerBgLight: 'linear-gradient(135deg, rgba(253, 242, 248, 0.98) 0%, rgba(252, 231, 243, 0.75) 45%, #ffffff 100%)',
      headerBgDark: 'linear-gradient(135deg, rgba(80, 7, 36, 0.9) 0%, rgba(53, 11, 45, 0.65) 45%, #0d1117 100%)',
      borderColorLight: '#fbcfe8',
      borderColorDark: '#700f3b',
    };
  }

  if (/^gantt|timeline/i.test(code)) {
    return {
      title: customTitle || 'Project Timeline & Milestones',
      icon: '📅',
      type: 'Project Timeline',
      colorName: 'rose',
      accentColor: '#f43f5e',
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #f59e0b 100%)',
      glowColor: 'rgba(244, 63, 94, 0.35)',
      kickerColor: '#e11d48',
      headerBgLight: 'linear-gradient(135deg, rgba(255, 241, 242, 0.98) 0%, rgba(255, 228, 230, 0.75) 45%, #ffffff 100%)',
      headerBgDark: 'linear-gradient(135deg, rgba(76, 5, 25, 0.9) 0%, rgba(59, 7, 22, 0.65) 45%, #0d1117 100%)',
      borderColorLight: '#fecdd3',
      borderColorDark: '#881337',
    };
  }

  // Flowchart heuristics
  let flowTitle = customTitle || 'System Architecture Flowchart';
  if (code.includes('Dual Confirmation') || code.includes('DUAL')) {
    flowTitle = customTitle || 'Dual Confirmation Architecture Flowchart';
  } else if (code.includes('Gateway Event Ingestion') || code.includes('Webhook')) {
    flowTitle = customTitle || 'Gateway Event Ingestion & Worker Flowchart';
  } else if (code.includes('MongoDB Concurrency') || code.includes('AtomicContention')) {
    flowTitle = customTitle || 'Concurrency & Atomic State Transition Flowchart';
  } else if (code.includes('Redis Decrement') || code.includes('DECRBY')) {
    flowTitle = customTitle || 'Redis Inventory Reservation Lifecycle';
  }

  return {
    title: flowTitle,
    icon: '📊',
    type: 'System Architecture',
    colorName: 'sky',
    accentColor: '#0284c7',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)',
    glowColor: 'rgba(2, 132, 199, 0.35)',
    kickerColor: '#0369a1',
    headerBgLight: 'linear-gradient(135deg, rgba(240, 249, 255, 0.98) 0%, rgba(224, 242, 254, 0.75) 45%, #ffffff 100%)',
    headerBgDark: 'linear-gradient(135deg, rgba(8, 47, 73, 0.9) 0%, rgba(12, 74, 110, 0.65) 45%, #0d1117 100%)',
    borderColorLight: '#bae6fd',
    borderColorDark: '#0369a1',
  };
}

/**
 * Formats code snippets, HTTP endpoints, status codes, and DB operations inside Mermaid SVG nodes
 */
export function formatMermaidSvgCode(svgEl: SVGElement, forceDark?: boolean): void {
  if (!svgEl) return;
  try {
    const isDarkDoc = forceDark !== undefined
      ? forceDark
      : svgEl.closest('.diagram-theme-dark')
      ? true
      : svgEl.closest('.diagram-theme-light')
      ? false
      : svgEl.ownerDocument ? detectIsDark(svgEl.ownerDocument) : false;

    // Sequence diagrams: high-contrast actor labels & boxes for WCAG AAA accessibility
    const actorTexts = svgEl.querySelectorAll('text.actor, .actor text, g.actor text, text[class*="actor"], .actor-box text');
    actorTexts.forEach((txt) => {
      const textColor = isDarkDoc ? '#ffffff' : '#0f172a';
      txt.setAttribute('fill', textColor);
      (txt as HTMLElement).style.fill = textColor;
      (txt as HTMLElement).style.color = textColor;
      (txt as HTMLElement).style.fontWeight = '700';
      txt.querySelectorAll('tspan').forEach((tsp) => {
        tsp.setAttribute('fill', textColor);
        tsp.style.fill = textColor;
        tsp.style.fontWeight = '700';
      });
    });

    const actorBoxes = svgEl.querySelectorAll('rect.actor, .actor rect, g.actor rect, rect[class*="actor"]');
    actorBoxes.forEach((rect) => {
      if (isDarkDoc) {
        rect.setAttribute('fill', '#1e293b');
        rect.setAttribute('stroke', '#38bdf8');
        rect.setAttribute('stroke-width', '2');
        (rect as HTMLElement).style.fill = '#1e293b';
        (rect as HTMLElement).style.stroke = '#38bdf8';
        (rect as HTMLElement).style.strokeWidth = '2px';
      } else {
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('stroke', '#2563eb');
        rect.setAttribute('stroke-width', '2');
        (rect as HTMLElement).style.fill = '#ffffff';
        (rect as HTMLElement).style.stroke = '#2563eb';
        (rect as HTMLElement).style.strokeWidth = '2px';
      }
    });

    const actorLines = svgEl.querySelectorAll('.actor-line, line.actor-line, path.actor-line');
    actorLines.forEach((line) => {
      const lineColor = isDarkDoc ? '#64748b' : '#475569';
      line.setAttribute('stroke', lineColor);
      (line as HTMLElement).style.stroke = lineColor;
    });

    const seqNums = svgEl.querySelectorAll('.sequenceNumber, circle.sequenceNumber, text.sequenceNumber');
    seqNums.forEach((el) => {
      if (el.tagName.toLowerCase() === 'circle') {
        el.setAttribute('fill', isDarkDoc ? '#0284c7' : '#dbeafe');
        el.setAttribute('stroke', isDarkDoc ? '#38bdf8' : '#2563eb');
      } else {
        el.setAttribute('fill', isDarkDoc ? '#ffffff' : '#1e40af');
      }
    });

    // 1. Process all foreignObject text contents (flowchart nodes, labels, clusters, etc.)
    const foreignLabels = svgEl.querySelectorAll('.nodeLabel, .label, .edgeLabel, .cluster-label, div[class*="label"], [class*="nodeLabel"]');
    foreignLabels.forEach((el) => {
      const hEl = el as HTMLElement;
      if (hEl.dataset.codeFormatted === 'true') return;
      hEl.dataset.codeFormatted = 'true';

      let html = hEl.innerHTML;
      if (html.includes('mermaid-method-badge')) return;

      let modified = false;

      // A. Inline backticks: `code`
      if (html.includes('`')) {
        html = html.replace(/`([^`]+)`/g, (_m, code) => {
          modified = true;
          return `<code class="mermaid-code-inline">${escapeHtml(code)}</code>`;
        });
      }

      // B. HTTP verbs with paths, e.g. POST /payments/stripe/webhook or GET /session-status
      const httpRegex = /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\/[a-zA-Z0-9_\-\.\:\?\=\&\{\}\/]+)/g;
      if (httpRegex.test(html)) {
        html = html.replace(httpRegex, (_m, verb, endpoint) => {
          modified = true;
          const vLower = verb.toLowerCase();
          return `<span class="mermaid-method-badge method-${vLower}">${verb}</span><code class="mermaid-code-endpoint">${endpoint}</code>`;
        });
      }

      // C. HTTP Status Codes: HTTP 200 OK, 200 OK, HTTP 400 Bad Request, 500 Server Error
      const statusSuccessRegex = /\b(HTTP\s+200(?:\s+OK)?|HTTP\s+201(?:\s+Created)?|HTTP\s+204(?:\s+No Content)?|200\s+OK|201\s+Created)\b/g;
      if (statusSuccessRegex.test(html)) {
        html = html.replace(statusSuccessRegex, (_m, status) => {
          modified = true;
          return `<span class="mermaid-status-badge status-200">${status}</span>`;
        });
      }
      const statusErrRegex = /\b(HTTP\s+(?:400|401|403|404|409|422|429|500|502|503)(?:\s+[a-zA-Z\s]+)?|400\s+Bad\s+Request|401\s+Unauthorized|404\s+Not\s+Found|500\s+Server\s+Error|500\s+Internal\s+Server\s+Error)\b/g;
      if (statusErrRegex.test(html)) {
        html = html.replace(statusErrRegex, (_m, status) => {
          modified = true;
          return `<span class="mermaid-status-badge status-err">${status}</span>`;
        });
      }

      // D. Database / Redis Commands: DECRBY stock:SKU 1, SET reservation:ORDER_ID:SKU EX 900, DEL reservation key
      const redisRegex = /\b(DECRBY|INCRBY|SETNX|SET|GET|DEL|EXPIRE|TTL|HSET|HGET|HGETALL|LPUSH|RPOP|ZADD|ZRANGE)\s+([a-zA-Z0-9_:\$\{\}]+(?:\s+[a-zA-Z0-9_:\$\{\}]+)*)/g;
      if (redisRegex.test(html)) {
        html = html.replace(redisRegex, (_m, cmd, args) => {
          modified = true;
          return `<span class="mermaid-db-cmd">${cmd}</span><code class="mermaid-code-inline">${args}</code>`;
        });
      }

      // E. Common DB / ORM query functions: findOneAndUpdate(...), findOne(...)
      const dbFnRegex = /\b(findOneAndUpdate|findOne|insertOne|insertMany|updateMany|findById|deleteOne|deleteMany|processWebhook|initiateCheckout|validateCard|verifySignature)\s*\(/g;
      if (dbFnRegex.test(html)) {
        html = html.replace(dbFnRegex, (_m, fn) => {
          modified = true;
          return `<span class="mermaid-fn-name">${fn}</span>(`;
        });
      }

      if (modified) {
        hEl.innerHTML = html;
      }
    });

    // 2. Class diagrams: format method signatures and visibility symbols (+, -, #)
    const classTextNodes = svgEl.querySelectorAll('g.classGroup text, .classTitle, .classLabel');
    classTextNodes.forEach((node) => {
      node.setAttribute('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace');
    });

    // 3. Sequence diagrams: style messageText with clean developer monospace font and tspan highlights
    const messageTexts = svgEl.querySelectorAll('text.messageText, .messageText text, text[class*="messageText"]');
    messageTexts.forEach((msg) => {
      msg.setAttribute('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace');
      msg.setAttribute('font-size', '12px');
      msg.setAttribute('letter-spacing', '-0.01em');

      const raw = msg.textContent || '';
      if (!raw || msg.querySelector('tspan.formatted-msg')) return;

      // Check HTTP method + path in sequence message
      const httpMsgRegex = /^(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]+)(.*)$/;
      const httpMatch = raw.match(httpMsgRegex);
      const isDarkDoc = svgEl.ownerDocument ? detectIsDark(svgEl.ownerDocument) : false;
      if (httpMatch) {
        const verb = httpMatch[1];
        const path = httpMatch[2];
        const rest = httpMatch[3] || '';
        const vLower = verb.toLowerCase();
        const verbColor = isDarkDoc
          ? (vLower === 'post' ? '#4ade80' : vLower === 'get' ? '#38bdf8' : vLower === 'delete' ? '#f87171' : '#fbbf24')
          : (vLower === 'post' ? '#15803d' : vLower === 'get' ? '#0284c7' : vLower === 'delete' ? '#b91c1c' : '#b45309');
        const pathColor = isDarkDoc ? '#38bdf8' : '#0369a1';
        const restColor = isDarkDoc ? '#94a3b8' : '#475569';
        msg.innerHTML = `<tspan class="formatted-msg" fill="${verbColor}" font-weight="700">${escapeHtml(verb)} </tspan><tspan fill="${pathColor}" font-family="monospace" font-weight="600">${escapeHtml(path)}</tspan><tspan fill="${restColor}">${escapeHtml(rest)}</tspan>`;
        return;
      }

      // Check success status code e.g. 200 OK
      const statusMsgRegex = /^(HTTP\s+200(?:\s+OK)?|200\s+OK|201\s+Created)(.*)$/i;
      const statusMatch = raw.match(statusMsgRegex);
      if (statusMatch) {
        const codeColor = isDarkDoc ? '#4ade80' : '#15803d';
        const restColor = isDarkDoc ? '#94a3b8' : '#475569';
        msg.innerHTML = `<tspan class="formatted-msg" fill="${codeColor}" font-weight="700">${escapeHtml(statusMatch[1])}</tspan><tspan fill="${restColor}">${escapeHtml(statusMatch[2])}</tspan>`;
        return;
      }

      // Check error status code e.g. 400 Bad Request
      const errStatusRegex = /^(HTTP\s+(?:400|401|403|404|500)|400\s+Bad\s+Request|404\s+Not\s+Found|500\s+Server\s+Error)(.*)$/i;
      const errMatch = raw.match(errStatusRegex);
      if (errMatch) {
        const codeColor = isDarkDoc ? '#f87171' : '#b91c1c';
        const restColor = isDarkDoc ? '#94a3b8' : '#475569';
        msg.innerHTML = `<tspan class="formatted-msg" fill="${codeColor}" font-weight="700">${escapeHtml(errMatch[1])}</tspan><tspan fill="${restColor}">${escapeHtml(errMatch[2])}</tspan>`;
        return;
      }
    });
  } catch (err) {
    console.warn('formatMermaidSvgCode error:', err);
  }
}

/**
 * Highlights internal content of string literals in Mermaid code (HTTP methods, endpoints, status codes)
 */
function highlightMermaidStringContent(content: string): string {
  let res = escapeHtml(content);

  // Method badges + endpoints inside strings
  res = res.replace(/\b(GET|POST|PUT|DELETE|PATCH)\s+(\/[a-zA-Z0-9_\-\.\:\?\=\&\{\}\/]+)/g, (_m, verb, path) => {
    const vLower = verb.toLowerCase();
    return `<span class="tok-method tok-method-${vLower}">${verb}</span><span class="tok-endpoint">${path}</span>`;
  });

  // Status codes
  res = res.replace(/\b(HTTP\s+200(?:\s+OK)?|HTTP\s+201(?:\s+Created)?|200\s+OK|201\s+Created)\b/g, (status) => {
    return `<span class="tok-status-200">${status}</span>`;
  });
  res = res.replace(/\b(HTTP\s+(?:400|401|403|404|500)(?:\s+[a-zA-Z\s]+)?|400\s+Bad\s+Request|404\s+Not\s+Found|500\s+Server\s+Error)\b/g, (status) => {
    return `<span class="tok-status-err">${status}</span>`;
  });

  // Redis / SQL commands
  res = res.replace(/\b(DECRBY|INCRBY|SETNX|SET|GET|DEL|EXPIRE|TTL|HSET|HGET|LPUSH|RPOP|SELECT|FROM|WHERE|INSERT|UPDATE)\b/g, (cmd) => {
    return `<span class="tok-keyword font-bold">${cmd}</span>`;
  });

  // Backtick code inside strings
  res = res.replace(/`([^`]+)`/g, (_m, code) => {
    return `<code class="tok-inline-code">${code}</code>`;
  });

  return res;
}

/**
 * High-fidelity syntax highlighter for Mermaid code definitions
 */
export function highlightMermaidCode(raw: string): string {
  if (!raw) return '';
  const lines = raw.trim().split('\n');
  return lines
    .map((line, idx) => {
      const lineNum = idx + 1;
      let lineHtml = '';

      if (/^\s*%%/.test(line)) {
        lineHtml = `<span class="tok-comment">${escapeHtml(line)}</span>`;
      } else {
        const tokenRegex = /(\"[^\"]*\"|'[^']*'|\|[^|]+\||--&gt;&gt;|-&gt;&gt;|--&gt;|-\.-&gt;|==&gt;|-->>|->>|--x|-x|-\.->|-->|==>|---|===|==|:=|\b(?:HTTP\s+)?(?:200\s+OK|201\s+Created|400\s+Bad\s+Request|401\s+Unauthorized|404\s+Not\s+Found|500\s+Server\s+Error|500\s+Internal\s+Server\s+Error)\b|\/[a-zA-Z0-9_\-\.\:\?\=\&\{\}\/]+|[a-zA-Z0-9_~]+|[^\s\w\"'|]+|\s+)/g;
        const tokens = line.match(tokenRegex) || [line];
        lineHtml = tokens
          .map((tok, tIdx) => {
            if (
              (tok.startsWith('"') && tok.endsWith('"')) ||
              (tok.startsWith("'") && tok.endsWith("'"))
            ) {
              const quote = tok[0];
              const inner = tok.slice(1, -1);
              return `<span class="tok-quote">${quote}</span><span class="tok-string">${highlightMermaidStringContent(inner)}</span><span class="tok-quote">${quote}</span>`;
            }
            if (tok.startsWith('|') && tok.endsWith('|')) {
              const labelInner = tok.slice(1, -1);
              return `<span class="tok-label">|${highlightMermaidStringContent(labelInner)}|</span>`;
            }
            if (/^(?:HTTP\s+)?(?:200\s+OK|201\s+Created)$/i.test(tok)) {
              return `<span class="tok-status-200">${escapeHtml(tok)}</span>`;
            }
            if (/^(?:HTTP\s+)?(?:400\s+Bad\s+Request|401\s+Unauthorized|404\s+Not\s+Found|500\s+Server\s+Error|500\s+Internal\s+Server\s+Error)$/i.test(tok)) {
              return `<span class="tok-status-err">${escapeHtml(tok)}</span>`;
            }
            if (/^(--&gt;&gt;|-&gt;&gt;|--&gt;|-\.-&gt;|==&gt;|-->>|->>|--x|-x|-\.->|-->|==>|---|===|==|:=|<\|\.\.|\*--|o--)$/.test(tok)) {
              return `<span class="tok-arrow">${escapeHtml(tok)}</span>`;
            }
            if (
              /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|C4Context|sankey-beta)$/i.test(
                tok
              )
            ) {
              return `<span class="tok-diagram">${escapeHtml(tok)}</span>`;
            }
            if (/^(TD|TB|BT|RL|LR)$/i.test(tok)) {
              return `<span class="tok-dir">${escapeHtml(tok)}</span>`;
            }
            if (
              /^(subgraph|end|autonumber|actor|participant|Note|over|activate|deactivate|loop|alt|else|opt|par|critical|break|rect|class|interface|enum|title|state|as|direction)$/i.test(
                tok
              )
            ) {
              return `<span class="tok-keyword">${escapeHtml(tok)}</span>`;
            }
            if (
              /^(true|false|null|undefined|Promise|string|number|boolean|void|any|Buffer|Date|Array|Map|Set)$/i.test(
                tok
              )
            ) {
              return `<span class="tok-type">${escapeHtml(tok)}</span>`;
            }
            if (/^(\[|\]|\(|\)|\{|\})$/.test(tok)) {
              return `<span class="tok-shape">${escapeHtml(tok)}</span>`;
            }
            if (tok === ':') {
              return `<span class="tok-punctuation font-bold text-[#64748b] dark:text-[#8b949e]">:</span>`;
            }
            if (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/.test(tok)) {
              const vLower = tok.toLowerCase();
              return `<span class="tok-method tok-method-${vLower}">${tok}</span>`;
            }
            if (/^\/[a-zA-Z0-9_\-\.\:\?\=\&\{\}\/]+$/.test(tok)) {
              return `<span class="tok-endpoint">${escapeHtml(tok)}</span>`;
            }
            if (/^(200|201|204)$/.test(tok) && tIdx < tokens.length - 1 && /^(OK|Created|No)$/i.test(tokens[tIdx + 1])) {
              return `<span class="tok-status-200">${tok}</span>`;
            }
            if (/^(400|401|403|404|409|422|429|500|502|503)$/.test(tok)) {
              return `<span class="tok-status-err">${tok}</span>`;
            }
            if (/^(DECRBY|INCRBY|SETNX|SET|GET|DEL|EXPIRE|TTL|HSET|HGET|LPUSH|RPOP|SELECT|FROM|WHERE|INSERT|UPDATE)$/.test(tok)) {
              return `<span class="tok-keyword font-bold">${tok}</span>`;
            }
            // Node identifier before a shape opener: A[...], B(...), C{...}
            if (/^[a-zA-Z0-9_-]+$/.test(tok) && tIdx < tokens.length - 1 && /^[\[\(\{]/.test(tokens[tIdx + 1])) {
              return `<span class="tok-id">${escapeHtml(tok)}</span>`;
            }
            return escapeHtml(tok);
          })
          .join('');
      }

      return `<div class="code-line" data-line="${lineNum}"><span class="line-num" aria-hidden="true" title="Click to highlight line ${lineNum}">${lineNum}</span><span class="line-content">${lineHtml || '&nbsp;'}</span></div>`;
    })
    .join('');
}

/**
 * Builds the interactive Mermaid code viewer panel with line numbers, copy, wrap, search, and font controls.
 */
export function buildMermaidCodePanel(rawCode: string, targetDoc?: Document): HTMLElement {
  const d = targetDoc || (typeof document !== 'undefined' ? document : null);
  if (!d) return {} as HTMLElement;
  const panel = d.createElement('div');
  panel.className = 'mermaid-code-panel flex flex-col bg-[#f8fafc] dark:bg-[#0d1117] text-[#0f172a] dark:text-[#e6edf3] border-t border-[#cbd5e1] dark:border-[#30363d] font-mono text-[13px] overflow-hidden w-full select-text';
  panel.style.display = 'none';

  const lineCount = rawCode.trim().split('\n').length;
  const meta = detectDiagramMeta(rawCode);
  const highlighted = highlightMermaidCode(rawCode);

  panel.innerHTML = `
    <div class="mermaid-code-header flex items-center justify-between px-3.5 py-2 bg-[#f1f5f9] dark:bg-[#161b22] border-b border-[#cbd5e1] dark:border-[#30363d] text-xs font-mono select-none gap-2 flex-wrap">
      <div class="flex items-center gap-2 min-w-0">
        <span class="code-lang-tag text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#e2e8f0] dark:bg-[#21262d] text-[#334155] dark:text-[#c9d1d9] border border-[#cbd5e1] dark:border-[#30363d]">MERMAID SYNTAX</span>
        <span class="code-line-badge text-[11px] text-[#64748b] dark:text-[#8b949e] font-semibold">${meta.type} • ${lineCount} lines</span>
      </div>
      <div class="flex items-center gap-1.5 flex-wrap">
        <!-- Quick Code Search Filter -->
        <div class="code-search-box flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-[#0d1117] border border-[#cbd5e1] dark:border-[#30363d] focus-within:border-[#1877f2] dark:focus-within:border-[#38bdf8] transition-colors">
          <span class="text-[11px] text-[#94a3b8]" aria-hidden="true">🔍</span>
          <input type="text" class="input-mermaid-code-search bg-transparent text-[11px] outline-none w-24 sm:w-32 placeholder:text-[#94a3b8] font-mono text-[#0f172a] dark:text-[#e6edf3]" placeholder="Filter code..." aria-label="Filter code lines" />
          <span class="code-search-count text-[10px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hidden"></span>
        </div>
        <!-- Font Size Controls -->
        <div class="flex items-center rounded border border-[#cbd5e1] dark:border-[#30363d] bg-white dark:bg-[#21262d] overflow-hidden">
          <button type="button" class="btn-mermaid-font-dec px-1.5 py-0.5 text-[11px] font-mono text-[#64748b] dark:text-[#8b949e] hover:text-[#0f172a] dark:hover:text-[#f0f6fc] hover:bg-[#f1f5f9] dark:hover:bg-[#30363d] cursor-pointer" title="Decrease font size">A−</button>
          <div class="w-px h-3.5 bg-[#cbd5e1] dark:bg-[#30363d]"></div>
          <button type="button" class="btn-mermaid-font-inc px-1.5 py-0.5 text-[11px] font-mono text-[#64748b] dark:text-[#8b949e] hover:text-[#0f172a] dark:hover:text-[#f0f6fc] hover:bg-[#f1f5f9] dark:hover:bg-[#30363d] cursor-pointer" title="Increase font size">A+</button>
        </div>
        <!-- Line Wrap Toggle -->
        <button type="button" class="btn-mermaid-code-wrap px-2 py-0.5 rounded text-[11px] font-mono font-medium text-[#64748b] dark:text-[#8b949e] hover:text-[#0f172a] dark:hover:text-[#f0f6fc] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] border border-[#cbd5e1] dark:border-[#30363d] cursor-pointer transition-colors" title="Toggle line wrap">Wrap</button>
        <!-- Download .mmd File -->
        <button type="button" class="btn-mermaid-code-download px-2 py-0.5 rounded text-[11px] font-mono font-medium text-[#64748b] dark:text-[#8b949e] hover:text-[#0f172a] dark:hover:text-[#f0f6fc] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] border border-[#cbd5e1] dark:border-[#30363d] cursor-pointer transition-colors" title="Download Mermaid definition as .mmd">↓ .mmd</button>
        <!-- Copy Syntax -->
        <button type="button" class="btn-mermaid-code-copy px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold text-[#1e293b] dark:text-[#c9d1d9] bg-[#ffffff] dark:bg-[#21262d] hover:bg-[#f1f5f9] dark:hover:bg-[#30363d] border border-[#cbd5e1] dark:border-[#30363d] cursor-pointer transition-colors active:scale-95 flex items-center gap-1.5 shadow-2xs" data-raw-code="${escapeHtml(rawCode)}" title="Copy Mermaid syntax">
          <svg class="copy-icon w-3.5 h-3.5 text-[#0969da] dark:text-[#38bdf8]" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>
          <span class="copy-text">Copy Code</span>
        </button>
      </div>
    </div>
    <div class="mermaid-code-body p-0 overflow-auto max-h-[500px]">
      <pre class="mermaid-code-pre m-0 py-3 font-mono text-[12.5px] leading-[22px] bg-[#f8fafc] dark:bg-[#0d1117] text-[#0f172a] dark:text-[#e6edf3]"><code class="mermaid-code-content">${highlighted}</code></pre>
    </div>
  `;
  return panel;
}

/**
 * Builds a modern, accessible, colorful header with category kicker, gradient icon, accent bar, and full controls.
 */
function buildDiagramHeader(
  titleText: string,
  iconSymbol: string = '📊',
  targetDoc?: Document,
  rawCode?: string
): HTMLElement {
  const d = targetDoc || (typeof document !== 'undefined' ? document : null);
  if (!d) return {} as HTMLElement;
  const meta = detectDiagramMeta(rawCode || titleText);
  const finalTitle = titleText && titleText !== 'System Diagram' && titleText !== 'Architecture Diagram' && titleText !== 'System Architecture Diagram'
    ? titleText
    : meta.title;

  const header = d.createElement('div');
  header.className = `diagram-header diagram-header-${meta.colorName} relative flex items-center justify-between p-3.5 gap-2.5 flex-wrap overflow-hidden`;
  header.setAttribute('data-color-theme', meta.colorName);

  const titleGroup = d.createElement('div');
  titleGroup.className = 'diagram-title-group flex items-center gap-3 min-w-0';
  titleGroup.innerHTML = `
    <span class="diagram-icon-badge inline-flex items-center justify-center w-8 h-8 rounded-lg shadow-sm text-base select-none shrink-0" style="background: ${meta.gradient}; color: #ffffff; box-shadow: 0 2px 8px ${meta.glowColor};" aria-hidden="true">
      ${iconSymbol || meta.icon}
    </span>
    <div class="flex flex-col min-w-0">
      <span class="diagram-type-kicker text-[10.5px] font-extrabold uppercase tracking-wider leading-none mb-0.5" style="color: ${meta.kickerColor};">
        ${meta.type}
      </span>
      <span class="diagram-title text-[15px] font-bold text-[#0f172a] dark:text-[#f8fafc] truncate tracking-tight leading-snug">
        ${finalTitle}
      </span>
    </div>
  `;

  const toolbar = d.createElement('div');
  toolbar.className = 'diagram-toolbar ml-auto flex items-center gap-1 bg-[#f8fafc] dark:bg-[#0d1117] p-1 rounded-xl border border-[#cbd5e1] dark:border-[#30363d] shadow-xs select-none';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Diagram controls');

  toolbar.innerHTML = `
    <button type="button" class="btn-diag-legend btn-mermaid-legend diagram-btn flex items-center justify-center h-7 px-2.5 rounded-lg text-xs font-sans font-medium text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Diagram Legend: explain node shapes and line types" aria-label="Diagram Legend">
      <span aria-hidden="true">💡 Legend</span>
    </button>
    <div class="h-4 w-px bg-[#cbd5e1] dark:bg-[#30363d] mx-0.5"></div>
    <button type="button" class="btn-diag-zoomout diagram-btn flex items-center justify-center h-7 px-2 rounded-lg text-xs font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Zoom out (−)" aria-label="Zoom out">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 7.75A.75.75 0 0 1 2.75 7h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.75Z"/></svg>
    </button>
    <div class="diagram-zoom-indicator flex items-center justify-center h-7 px-2 text-xs font-mono font-bold text-[#1e293b] dark:text-[#f0f6fc] select-none" title="Current zoom level">
      <span class="zoom-val">100%</span>
    </div>
    <button type="button" class="btn-diag-zoomin diagram-btn flex items-center justify-center h-7 px-2 rounded-lg text-xs font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Zoom in (+)" aria-label="Zoom in">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
    </button>
    <div class="h-4 w-px bg-[#cbd5e1] dark:bg-[#30363d] mx-0.5"></div>
    <button type="button" class="btn-diag-fit diagram-btn flex items-center gap-1 justify-center h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Zoom to fit diagram in view" aria-label="Zoom to fit">
      <span aria-hidden="true">⊡</span> <span>Fit</span>
    </button>
    <button type="button" class="btn-diag-reset diagram-btn flex items-center gap-1 justify-center h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Reset zoom to 100% (1:1)" aria-label="Reset zoom">
      <span aria-hidden="true">↺</span> <span>Reset</span>
    </button>
    <div class="h-4 w-px bg-[#cbd5e1] dark:bg-[#30363d] mx-0.5"></div>
    <button type="button" class="btn-diag-copy diagram-btn flex items-center justify-center h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Copy Mermaid syntax" aria-label="Copy Mermaid syntax">
      📋 Copy
    </button>
    <button type="button" class="btn-diag-theme btn-mermaid-theme diagram-btn flex items-center justify-center gap-1 h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Toggle diagram theme: Dark / Light" aria-label="Toggle diagram theme">
      <span class="theme-icon" aria-hidden="true">🌓</span> <span class="theme-text">Theme</span>
    </button>
    <button type="button" class="btn-diag-expand diagram-btn flex items-center justify-center h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Toggle Fullscreen View" aria-label="Toggle Fullscreen View">
      ⛶ Fullscreen
    </button>
  `;

  header.appendChild(titleGroup);
  header.appendChild(toolbar);
  return header;
}

/**
 * Builds the floating interactive HUD widget on the bottom-right of the diagram viewport.
 */
function buildFloatingHud(scale: number = 1.0, targetDoc?: Document): HTMLElement {
  const d = targetDoc || (typeof document !== 'undefined' ? document : null);
  if (!d) return {} as HTMLElement;
  const badge = d.createElement('div');
  badge.className = 'mermaid-zoom-overlay mermaid-zoom-badge';
  badge.setAttribute('role', 'toolbar');
  badge.setAttribute('aria-label', 'Diagram zoom controls');
  badge.title = 'Zoom: scroll or click + / − • Drag to pan • Fullscreen: 100vh';
  badge.innerHTML = `
    <button type="button" class="zoom-control-btn zoom-btn-minus btn-hud-out hud-out" title="Zoom out (−)" aria-label="Zoom out">−</button>
    <button type="button" class="zoom-control-btn zoom-indicator-btn zoom-val" title="Current zoom level • Click to toggle Fit / 1:1" aria-label="Current zoom">${Math.round(scale * 100)}%</button>
    <button type="button" class="zoom-control-btn zoom-btn-plus btn-hud-in hud-in" title="Zoom in (+)" aria-label="Zoom in">+</button>
    <button type="button" class="zoom-control-btn zoom-btn-fit btn-hud-fit hud-fit" title="Zoom to fit diagram in view" aria-label="Zoom to fit">⊡ Fit</button>
    <button type="button" class="zoom-control-btn zoom-btn-reset btn-hud-reset hud-reset" title="Reset zoom to 100% (1:1)" aria-label="Reset zoom">↺ Reset</button>
    <button type="button" class="zoom-control-btn zoom-btn-expand btn-hud-expand hud-expand font-bold text-xs" title="Toggle Fullscreen (100vh)" aria-label="Toggle Fullscreen">⛶ Fullscreen</button>
  `;
  return badge;
}

/**
 * Renders all Mermaid diagrams in the given document (iframe or host).
 */
export async function renderMermaidInDocument(doc: Document, win?: Window | null): Promise<void> {
  if (!doc) return;
  const isDark = detectIsDark(doc);
  initMermaid(isDark);

  const targetWin = win || (typeof window !== 'undefined' ? window : null);

  // 0. Ensure CSS enhancements for code inside Mermaid are injected into target doc
  if (!doc.getElementById('mermaid-code-enhancements-style')) {
    const styleEl = doc.createElement('style');
    styleEl.id = 'mermaid-code-enhancements-style';
    styleEl.textContent = MERMAID_CODE_STYLES;
    (doc.head || doc.documentElement).appendChild(styleEl);
  }

  // 1. Process .diagram-wrapper elements (from CMS notes)
  const diagramWrappers = Array.from(doc.querySelectorAll('.diagram-wrapper'));
  for (let idx = 0; idx < diagramWrappers.length; idx++) {
    const wrap = diagramWrappers[idx] as HTMLElement;
    const container = wrap.querySelector('.mermaid-container, .mermaid-view') as HTMLElement | null;
    if (!container) continue;

    // Skip lifecycle pipeline (step tracker)
    if (container.classList.contains('lifecycle-pipeline') || wrap.querySelector('.lifecycle-pipeline')) {
      continue;
    }

    let preEl = container.querySelector('pre.mermaid, pre.mermaid-raw-source, .mermaid, code.language-mermaid') as HTMLElement | null;
    let code = wrap.getAttribute('data-raw-mermaid') || preEl?.textContent || '';
    code = decodeHtmlEntities(code);

    const meta = detectDiagramMeta(code);
    const h4 = wrap.querySelector('h4, .diagram-title') as HTMLElement | null;
    const titleText = h4?.textContent?.trim() || wrap.getAttribute('data-title') || meta.title;

    // Remove old floating toolbar if present
    wrap.querySelector('.mermaid-toolbar')?.remove();

    // Ensure header is attached with colorful theme
    if (!wrap.querySelector('.diagram-header')) {
      const header = buildDiagramHeader(titleText, meta.icon, doc, code);
      if (h4) h4.style.display = 'none';
      wrap.insertBefore(header, wrap.firstChild);
    }

    // Ensure container is inside wrap
    if (!wrap.contains(container)) {
      wrap.appendChild(container);
    }

    let viewport = container.querySelector('.mermaid-viewport') as HTMLElement | null;
    let canvas = container.querySelector('.mermaid-canvas') as HTMLElement | null;

    // If SVG already exists inside container (pre-rendered or offline rendered):
    if (container.querySelector('svg')) {
      const svgEl = container.querySelector('svg') as SVGElement;

      if (!viewport || !canvas) {
        viewport = doc.createElement('div');
        viewport.className = 'mermaid-viewport';
        canvas = doc.createElement('div');
        canvas.className = 'mermaid-canvas';
        svgEl.parentNode?.insertBefore(viewport, svgEl);
        viewport.appendChild(canvas);
        canvas.appendChild(svgEl);
      }

      svgEl.classList.remove('mermaid');
      svgEl.classList.add('mermaid-svg');
      svgEl.style.maxWidth = '100%';
      svgEl.style.height = 'auto';
      svgEl.style.display = 'block';
      svgEl.style.margin = '0 auto';
      svgEl.style.background = 'transparent';
      const bgRects = svgEl.querySelectorAll('rect.background, .background');
      bgRects.forEach((r) => r.setAttribute('fill', 'transparent'));

      formatMermaidSvgCode(svgEl);

      wrap.dataset.mermaidRendered = 'true';
      setupDiagramInteractions(wrap, targetWin);
      continue;
    }

    if (!code || code.startsWith('<svg')) {
      continue;
    }

    wrap.setAttribute('data-raw-mermaid', code);

    if (!viewport || !canvas) {
      viewport = doc.createElement('div');
      viewport.className = 'mermaid-viewport';
      canvas = doc.createElement('div');
      canvas.className = 'mermaid-canvas';
      viewport.appendChild(canvas);
      container.innerHTML = '';
      container.appendChild(viewport);
    }

    const diagramId = `mermaid-wrapper-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const { svg } = await mermaid.render(diagramId, code);
      canvas.innerHTML = svg;
      const svgEl = canvas.querySelector('svg');
      if (svgEl) {
        svgEl.classList.remove('mermaid');
        svgEl.classList.add('mermaid-svg');
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
        svgEl.style.display = 'block';
        svgEl.style.margin = '0 auto';
        svgEl.style.background = 'transparent';
        const bgRects = svgEl.querySelectorAll('rect.background, .background');
        bgRects.forEach((r) => r.setAttribute('fill', 'transparent'));
        formatMermaidSvgCode(svgEl);
      }
      wrap.dataset.mermaidRendered = 'true';
    } catch (renderError) {
      console.warn(`Mermaid render failed for diagram-wrapper ${idx}:`, renderError);
      canvas.innerHTML = `<div style="color:#f85149;padding:12px;font-size:12px;font-family:monospace;background:${isDark ? '#21262d' : '#fff1f0'};border-radius:6px;">Failed to render diagram.<br/><pre style="margin-top:8px;color:${isDark ? '#c9d1d9' : '#cf222e'};">${code}</pre></div>`;
    }

    setupDiagramInteractions(wrap, targetWin);
  }

  // 2. Process custom GitHub mermaid blocks (.github-mermaid-block)
  const githubBlocks = Array.from(doc.querySelectorAll('.github-mermaid-block'));
  for (let idx = 0; idx < githubBlocks.length; idx++) {
    const block = githubBlocks[idx] as HTMLElement;
    const rawAttr = block.getAttribute('data-raw-mermaid');
    const preEl = block.querySelector('pre.mermaid, pre.mermaid-raw-source, .mermaid');
    let code = rawAttr || preEl?.textContent || '';
    code = decodeHtmlEntities(code);

    if (!code || code.startsWith('<svg')) {
      continue;
    }

    const meta = detectDiagramMeta(code);
    const titleText = block.getAttribute('data-title') || meta.title;

    // Remove legacy floating toolbar if present
    block.querySelector('.mermaid-toolbar')?.remove();

    // Prepend modern header
    if (!block.querySelector('.diagram-header')) {
      const header = buildDiagramHeader(titleText, meta.icon, doc, code);
      block.insertBefore(header, block.firstChild);
    }

    let viewport = block.querySelector('.mermaid-viewport') as HTMLElement | null;
    let canvas = block.querySelector('.mermaid-canvas') as HTMLElement | null;

    if (block.dataset.mermaidRendered === 'true' && canvas?.querySelector('svg')) {
      const svgEl = canvas.querySelector('svg');
      if (svgEl) formatMermaidSvgCode(svgEl);
      setupDiagramInteractions(block, targetWin);
      continue;
    }

    const diagramId = `mermaid-svg-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const { svg } = await mermaid.render(diagramId, code);
      if (canvas) {
        canvas.innerHTML = svg;
        const svgEl = canvas.querySelector('svg');
        if (svgEl) {
          svgEl.classList.remove('mermaid');
          svgEl.classList.add('mermaid-svg');
          svgEl.style.background = 'transparent';
          svgEl.querySelectorAll('rect.background, .background').forEach((r) => r.setAttribute('fill', 'transparent'));
          formatMermaidSvgCode(svgEl);
        }
      } else if (preEl) {
        preEl.innerHTML = svg;
        const svgEl = preEl.querySelector('svg');
        if (svgEl) {
          svgEl.classList.remove('mermaid');
          svgEl.classList.add('mermaid-svg');
          svgEl.style.background = 'transparent';
          svgEl.querySelectorAll('rect.background, .background').forEach((r) => r.setAttribute('fill', 'transparent'));
          formatMermaidSvgCode(svgEl);
        }
      }
      block.dataset.mermaidRendered = 'true';
    } catch (renderError) {
      console.warn(`Mermaid render failed for block ${idx}:`, renderError);
      if (canvas) {
        canvas.innerHTML = `<div style="color:#f85149;padding:12px;font-size:12px;font-family:monospace;background:${isDark ? '#21262d' : '#fff1f0'};border-radius:6px;">Failed to render diagram.<br/><pre style="margin-top:8px;color:${isDark ? '#c9d1d9' : '#cf222e'};">${code}</pre></div>`;
      }
    }

    setupDiagramInteractions(block, targetWin);
  }

  // 3. Process any standalone Mermaid elements outside wrapper (including inside .note-content)
  const standaloneMermaids = Array.from(
    doc.querySelectorAll(
      '.note-content pre.mermaid:not([data-processed="true"]), .note-content div.mermaid:not([data-processed="true"]), .note-content .mermaid:not(svg):not([data-processed="true"]), pre.mermaid:not([data-processed="true"]), div.mermaid:not([data-processed="true"]), pre > code.language-mermaid:not([data-processed="true"]), code.mermaid:not([data-processed="true"])'
    )
  );

  for (let idx = 0; idx < standaloneMermaids.length; idx++) {
    const el = standaloneMermaids[idx] as HTMLElement;
    if (el.closest('.github-mermaid-block') || el.closest('.diagram-wrapper')) continue;
    if (el.getAttribute('data-processed') === 'true') continue;
    if (el.tagName.toLowerCase() === 'svg') continue;

    let code = el.textContent || '';
    code = decodeHtmlEntities(code);
    if (!code || code.startsWith('<svg')) continue;

    const meta = detectDiagramMeta(code);

    const blockCard = doc.createElement('div');
    blockCard.className = 'diagram-wrapper group relative my-6 rounded-xl border border-[#cbd5e1] dark:border-[#30363d] bg-white dark:bg-[#0d1117] shadow-lg overflow-hidden';
    blockCard.setAttribute('data-raw-mermaid', code);

    const header = buildDiagramHeader(meta.title, meta.icon, doc, code);
    blockCard.appendChild(header);

    const container = doc.createElement('div');
    container.className = 'mermaid-container';
    const viewport = doc.createElement('div');
    viewport.className = 'mermaid-viewport';
    const canvas = doc.createElement('div');
    canvas.className = 'mermaid-canvas';
    viewport.appendChild(canvas);
    container.appendChild(viewport);
    blockCard.appendChild(container);

    const diagramId = `mermaid-standalone-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const { svg } = await mermaid.render(diagramId, code);
      canvas.innerHTML = svg;
      const svgEl = canvas.querySelector('svg');
      if (svgEl) {
        svgEl.classList.remove('mermaid');
        svgEl.classList.add('mermaid-svg');
        svgEl.style.background = 'transparent';
        formatMermaidSvgCode(svgEl);
      }
      blockCard.dataset.mermaidRendered = 'true';
      el.replaceWith(blockCard);
      setupDiagramInteractions(blockCard, targetWin);
    } catch (err) {
      console.warn('Failed to render standalone mermaid diagram:', err);
    }
  }

  // 4. Wrap and enhance any standalone SVG mermaid diagrams (.note-content or anywhere)
  const standaloneSvgs = Array.from(
    doc.querySelectorAll(
      '.note-content svg.mermaid, .note-content svg[id^="mermaid-"], svg.mermaid, svg[id^="mermaid-"]'
    )
  );
  for (let idx = 0; idx < standaloneSvgs.length; idx++) {
    const svgEl = standaloneSvgs[idx] as SVGElement;
    if (svgEl.closest('.diagram-wrapper, .github-mermaid-block, .mermaid-container, .mermaid-viewport')) continue;

    const blockCard = doc.createElement('div');
    blockCard.className = 'diagram-wrapper group relative my-6 rounded-xl border border-[#cbd5e1] dark:border-[#30363d] bg-white dark:bg-[#0d1117] shadow-lg overflow-hidden';
    const header = buildDiagramHeader('Architecture Diagram', '📊', doc);
    blockCard.appendChild(header);

    const container = doc.createElement('div');
    container.className = 'mermaid-container';
    const viewport = doc.createElement('div');
    viewport.className = 'mermaid-viewport';
    const canvas = doc.createElement('div');
    canvas.className = 'mermaid-canvas';
    viewport.appendChild(canvas);
    container.appendChild(viewport);
    blockCard.appendChild(container);

    svgEl.parentNode?.insertBefore(blockCard, svgEl);
    canvas.appendChild(svgEl);
    svgEl.classList.remove('mermaid');
    svgEl.classList.add('mermaid-svg');
    formatMermaidSvgCode(svgEl);
    blockCard.dataset.mermaidRendered = 'true';
    setupDiagramInteractions(blockCard, targetWin);
  }
}

/**
 * Configures interactive controls: zoom in (+), zoom out (-), zoom level indicator,
 * fit to width, reset (1:1), fullscreen toggle, copy syntax, mouse wheel zoom,
 * and click-and-drag pan.
 */
export function setupDiagramInteractions(block: HTMLElement, win?: Window | null) {
  const isZoomReady = block.dataset.zoomInteractionsReady === 'true';
  const isCodePanelReady = block.dataset.codePanelReady === 'true';
  if (isZoomReady && isCodePanelReady) return;
  block.dataset.interactionsActive = 'true';

  const ownerDoc = block.ownerDocument || (win ? win.document : (typeof document !== 'undefined' ? document : null));
  if (!ownerDoc) return;

  const viewport = (block.querySelector('.mermaid-viewport') ||
    block.querySelector('.mermaid-container') ||
    block.querySelector('.mermaid-view')) as HTMLElement | null;

  let canvas = block.querySelector('.mermaid-canvas') as HTMLElement | null;
  if (!canvas && viewport) {
    const existingSvg = viewport.querySelector('svg');
    if (existingSvg) {
      canvas = ownerDoc.createElement('div');
      canvas.className = 'mermaid-canvas';
      existingSvg.parentNode?.insertBefore(canvas, existingSvg);
      canvas.appendChild(existingSvg);
    }
  }

  const rawCode = decodeHtmlEntities(
    block.getAttribute('data-raw-mermaid') ||
      block.querySelector('pre.mermaid, pre.mermaid-raw-source, code.language-mermaid')?.textContent ||
      ''
  );

  let scale = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  // Zoom display badge references
  const zoomTextEls = block.querySelectorAll('.zoom-text, .zoom-val');

  function updateTransform() {
    const targetEl = canvas || viewport?.querySelector('svg');
    if (targetEl) {
      targetEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      targetEl.style.transformOrigin = 'top center';
    }

    const pctStr = `${Math.round(scale * 100)}%`;
    zoomTextEls.forEach((el) => {
      el.textContent = pctStr;
    });

    const floatingBadge = block.querySelector('.mermaid-zoom-badge');
    if (floatingBadge) {
      const val = floatingBadge.querySelector('.zoom-val');
      if (val) val.textContent = pctStr;
    }
  }

  // Ensure floating HUD zoom overlay is added to viewport/container
  let badge = block.querySelector('.mermaid-zoom-overlay, .mermaid-zoom-badge') as HTMLElement | null;
  if (viewport && !badge) {
    badge = buildFloatingHud(scale, ownerDoc);
    viewport.appendChild(badge);
  }

  if (badge && !badge.getAttribute('data-zoom-initialized')) {
    badge.setAttribute('data-zoom-initialized', 'true');
    // Wire up floating overlay buttons (minus, reset, plus, fit)
    badge.querySelector('.zoom-btn-minus, .btn-hud-out, .hud-out')?.addEventListener('click', (e) => {
      e.stopPropagation();
      scale = Math.max(scale * 0.8, 0.15);
      updateTransform();
    });
    badge.querySelector('.zoom-val')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Math.abs(scale - 1.0) < 0.05) {
        fitDiagram(block.classList.contains('is-fullscreen'));
      } else {
        scale = 1.0;
        panX = 0;
        panY = 0;
        updateTransform();
      }
    });
    badge.querySelector('.zoom-btn-plus, .btn-hud-in, .hud-in')?.addEventListener('click', (e) => {
      e.stopPropagation();
      scale = Math.min(scale * 1.25, 5.0);
      updateTransform();
    });
    badge.querySelector('.zoom-btn-fit, .btn-hud-fit, .hud-fit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fitDiagram(block.classList.contains('is-fullscreen'));
    });
    badge.querySelector('.zoom-btn-reset, .btn-hud-reset, .hud-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      scale = 1.0;
      panX = 0;
      panY = 0;
      updateTransform();
    });
    badge.querySelector('.zoom-btn-expand, .btn-hud-expand, .hud-expand')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  function toggleFullscreen() {
    block.classList.toggle('is-fullscreen');
    const isFull = block.classList.contains('is-fullscreen');
    const cont = block.querySelector('.mermaid-container, .mermaid-view') as HTMLElement | null;
    if (isFull) {
      cont?.classList.add('is-fullscreen');
      viewport?.classList.add('is-fullscreen');
      canvas?.classList.add('is-fullscreen');
      if (viewport) viewport.style.minHeight = '';
      if (cont) cont.style.minHeight = '';
      block.style.minHeight = '';
    } else {
      cont?.classList.remove('is-fullscreen');
      viewport?.classList.remove('is-fullscreen');
      canvas?.classList.remove('is-fullscreen');
      if (viewport) {
        viewport.style.removeProperty('min-height');
        viewport.style.removeProperty('height');
      }
      if (cont) {
        cont.style.removeProperty('min-height');
        cont.style.removeProperty('height');
      }
      block.style.removeProperty('min-height');
      block.style.removeProperty('height');
    }

    const allExpandBtns = block.querySelectorAll('.btn-diag-expand, .btn-mermaid-expand, .zoom-btn-expand, .btn-hud-expand, .hud-expand');
    allExpandBtns.forEach((b) => {
      if (isFull) {
        b.innerHTML = '<span aria-hidden="true">✕ Exit</span>';
        b.setAttribute('title', 'Exit Fullscreen (Esc)');
      } else {
        b.innerHTML = '<span aria-hidden="true">⛶ Fullscreen</span>';
        b.setAttribute('title', 'Toggle Fullscreen (100vh)');
      }
    });
    setTimeout(() => fitDiagram(isFull), 50);
  }

  // Double-click to toggle between Zoom to Fit and 1:1 Reset
  viewport?.addEventListener('dblclick', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.mermaid-toolbar, .diagram-header, .diagram-toolbar, .mermaid-zoom-badge, .mermaid-zoom-overlay, button, a')) return;
    if (Math.abs(scale - 1.0) < 0.05) {
      fitDiagram(block.classList.contains('is-fullscreen'));
    } else {
      scale = 1.0;
      panX = 0;
      panY = 0;
      updateTransform();
    }
  });

  function fitDiagram(forceFull?: boolean) {
    if (!viewport) return;
    const svg = (canvas || viewport).querySelector('svg');
    if (svg) {
      let svgWidth = 0;
      let svgHeight = 0;
      try {
        if (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
          svgWidth = svg.viewBox.baseVal.width;
          svgHeight = svg.viewBox.baseVal.height;
        } else if (svg.getBBox) {
          const bbox = svg.getBBox();
          if (bbox.width > 0) {
            svgWidth = bbox.width;
            svgHeight = bbox.height;
          }
        }
      } catch {}
      if (!svgWidth || !svgHeight) {
        const vb = svg.getAttribute('viewBox');
        if (vb) {
          const parts = vb.trim().split(/[\s,]+/);
          if (parts.length === 4) {
            if (!svgWidth) svgWidth = parseFloat(parts[2]) || 0;
            if (!svgHeight) svgHeight = parseFloat(parts[3]) || 0;
          }
        }
      }
      if (!svgHeight) {
        const attrH = svg.getAttribute('height');
        if (attrH) svgHeight = parseFloat(attrH) || 0;
      }
      if (!svgWidth) {
        const attrW = svg.getAttribute('width');
        if (attrW && !attrW.includes('%')) svgWidth = parseFloat(attrW) || 0;
      }
      if (!svgWidth) svgWidth = svg.clientWidth || svg.getBoundingClientRect?.().width || 800;
      if (!svgHeight) svgHeight = svg.clientHeight || svg.getBoundingClientRect?.().height || 600;

      // Ensure SVG is explicitly sized to natural bounds so transforms scale crisply
      if (svgWidth > 0 && svgHeight > 0) {
        svg.style.width = `${svgWidth}px`;
        svg.style.height = `${svgHeight}px`;
        svg.style.maxWidth = 'none';
      }

      const isFull = block.classList.contains('is-fullscreen') || forceFull;
      const padX = isFull ? 80 : 40;
      const padY = isFull ? 80 : 36;

      let viewWidth: number;
      let viewHeight: number;

      if (isFull) {
        const winW = targetWin?.innerWidth || window?.innerWidth || 1200;
        const winH = targetWin?.innerHeight || window?.innerHeight || 900;
        viewWidth = Math.max(winW - padX, 300);
        viewHeight = Math.max(winH - 52 - padY, 300);
      } else {
        const vRect = viewport.getBoundingClientRect();
        viewWidth = Math.max((vRect.width || viewport.clientWidth || 800) - padX, 260);
        viewHeight = Math.max((vRect.height || viewport.clientHeight || 340) - padY, 200);
      }

      if (svgWidth > 0 && viewWidth > 0) {
        const scaleX = viewWidth / svgWidth;
        const scaleY = (svgHeight > 0 && viewHeight > 0) ? (viewHeight / svgHeight) : scaleX;
        let targetScale = Math.min(scaleX, scaleY);
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
  }

  // Toolbar buttons (handles both .btn-mermaid-* and .btn-diag-*)
  const btnLegend = block.querySelector('.btn-mermaid-legend, .btn-diag-legend');
  const floatingLegendBtn = block.querySelector('.mermaid-floating-legend-btn');
  const legendOverlay = block.querySelector('.mermaid-legend-overlay') as HTMLElement | null;
  const legendCloseBtn = block.querySelector('.legend-close-btn');

  const toggleLegend = (show?: boolean) => {
    if (!legendOverlay) return;
    const isHidden = legendOverlay.style.display === 'none' || !legendOverlay.style.display;
    const shouldOpen = show !== undefined ? show : isHidden;
    legendOverlay.style.display = shouldOpen ? 'block' : 'none';
  };

  btnLegend?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLegend();
  });

  floatingLegendBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLegend();
  });

  legendCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLegend(false);
  });

  legendOverlay?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const btnZoomIn = block.querySelector('.btn-mermaid-zoomin, .btn-diag-zoomin');
  const btnZoomOut = block.querySelector('.btn-mermaid-zoomout, .btn-diag-zoomout');
  const btnReset = block.querySelector('.btn-mermaid-reset, .btn-diag-reset');
  const btnFit = block.querySelector('.btn-mermaid-fit, .btn-diag-fit');
  const btnCopy = block.querySelector('.btn-mermaid-copy, .btn-diag-copy');
  const btnExpand = block.querySelector('.btn-mermaid-expand, .btn-diag-expand');

  // Zoom In: Multiplies scale by 1.25 up to 4.0 (400%)
  btnZoomIn?.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.min(scale * 1.25, 4.0);
    updateTransform();
  });

  // Zoom Out: Decreases scale by 0.8 down to 0.15 (15%)
  btnZoomOut?.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.max(scale * 0.8, 0.15);
    updateTransform();
  });

  // Reset to 1:1 actual size
  btnReset?.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = 1.0;
    panX = 0;
    panY = 0;
    updateTransform();
  });

  // Fit to screen
  btnFit?.addEventListener('click', (e) => {
    e.stopPropagation();
    fitDiagram(block.classList.contains('is-fullscreen'));
  });

  // Copy Mermaid syntax
  btnCopy?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (rawCode && navigator.clipboard) {
      navigator.clipboard.writeText(rawCode).then(() => {
        const origHtml = btnCopy.innerHTML;
        const origTitle = btnCopy.getAttribute('title');
        btnCopy.setAttribute('title', 'Copied to clipboard!');
        btnCopy.innerHTML = '<span style="color:#10b981;font-weight:700;">✓ Copied</span>';
        setTimeout(() => {
          btnCopy.setAttribute('title', origTitle || '');
          btnCopy.innerHTML = origHtml;
        }, 2000);
      });
    }
  });

  // Toggle Diagram Theme (Dark / Light)
  const btnTheme = block.querySelector('.btn-mermaid-theme, .btn-diag-theme');
  btnTheme?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isDocDark = ownerDoc ? detectIsDark(ownerDoc) : false;
    const isCurrentlyDark = block.classList.contains('diagram-theme-dark')
      ? true
      : block.classList.contains('diagram-theme-light')
      ? false
      : isDocDark;
    const nextDark = !isCurrentlyDark;

    block.classList.remove('diagram-theme-dark', 'diagram-theme-light');
    block.classList.add(nextDark ? 'diagram-theme-dark' : 'diagram-theme-light');
    block.setAttribute('data-diagram-theme', nextDark ? 'dark' : 'light');

    const allThemeBtns = block.querySelectorAll('.btn-mermaid-theme, .btn-diag-theme');
    allThemeBtns.forEach((b) => {
      b.innerHTML = `<span class="theme-icon" aria-hidden="true">${nextDark ? '🌙' : '☀️'}</span> <span class="theme-text">${nextDark ? 'Dark' : 'Light'}</span>`;
      b.setAttribute('title', `Current: ${nextDark ? 'Dark' : 'Light'} Mode. Click to toggle.`);
    });

    const codeToRender = rawCode || block.getAttribute('data-raw-mermaid') || '';
    if (codeToRender && canvas) {
      try {
        initMermaid(nextDark, true);
        const diagramId = `mermaid-toggle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const { svg } = await mermaid.render(diagramId, codeToRender);
        canvas.innerHTML = svg;
        const svgEl = canvas.querySelector('svg');
        if (svgEl) {
          svgEl.classList.remove('mermaid');
          svgEl.classList.add('mermaid-svg');
          svgEl.style.background = 'transparent';
          formatMermaidSvgCode(svgEl, nextDark);
        }
        updateTransform();
      } catch (err) {
        console.warn('Theme switch render error:', err);
        const svgEl = canvas.querySelector('svg');
        if (svgEl) formatMermaidSvgCode(svgEl, nextDark);
      }
    } else {
      const svgEl = (canvas || viewport)?.querySelector('svg');
      if (svgEl) formatMermaidSvgCode(svgEl, nextDark);
    }
  });

  // Expand / Fullscreen
  btnExpand?.addEventListener('click', (e) => {
    e.stopPropagation();
    block.classList.toggle('is-fullscreen');
    const isFull = block.classList.contains('is-fullscreen');
    const cont = block.querySelector('.mermaid-container, .mermaid-view') as HTMLElement | null;
    if (isFull) {
      if (cont) cont.classList.add('is-fullscreen');
      viewport?.classList.add('is-fullscreen');
      canvas?.classList.add('is-fullscreen');
      btnExpand.setAttribute('title', 'Exit Fullscreen View (Esc)');
      btnExpand.innerHTML = '✕ Exit';
      setTimeout(() => fitDiagram(true), 50);
    } else {
      if (cont) {
        cont.classList.remove('is-fullscreen');
        cont.style.removeProperty('min-height');
        cont.style.removeProperty('height');
      }
      if (viewport) {
        viewport.classList.remove('is-fullscreen');
        viewport.style.removeProperty('min-height');
        viewport.style.removeProperty('height');
      }
      if (canvas) canvas.classList.remove('is-fullscreen');
      block.style.removeProperty('min-height');
      block.style.removeProperty('height');
      btnExpand.setAttribute('title', 'Toggle Fullscreen View');
      btnExpand.innerHTML = '⛶ Fullscreen';
      setTimeout(() => fitDiagram(false), 50);
    }
  });

  // Escape key exits fullscreen or closes legend
  const targetWin = win || (typeof window !== 'undefined' ? window : null);
  targetWin?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      toggleLegend(false);
      if (block.classList.contains('is-fullscreen')) {
        block.classList.remove('is-fullscreen');
        const cont = block.querySelector('.mermaid-container, .mermaid-view') as HTMLElement | null;
        if (cont) {
          cont.classList.remove('is-fullscreen');
          cont.style.removeProperty('min-height');
          cont.style.removeProperty('height');
        }
        if (viewport) {
          viewport.classList.remove('is-fullscreen');
          viewport.style.removeProperty('min-height');
          viewport.style.removeProperty('height');
        }
        if (canvas) canvas.classList.remove('is-fullscreen');
        block.style.removeProperty('min-height');
        block.style.removeProperty('height');
        btnExpand?.setAttribute('title', 'Toggle Fullscreen View');
        if (btnExpand) btnExpand.innerHTML = '⛶ Fullscreen';
        setTimeout(() => fitDiagram(false), 50);
      }
    }
  });

  // Window resize maintains fullscreen fit
  targetWin?.addEventListener('resize', () => {
    if (block.classList.contains('is-fullscreen')) {
      fitDiagram(true);
    }
  });

  // Mouse wheel zoom centered on cursor
  if (viewport) {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.15 : 0.88;
      const newScale = Math.min(Math.max(scale * delta, 0.2), 5.0);
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      panX = mouseX - (mouseX - panX) * (newScale / scale);
      panY = mouseY - (mouseY - panY) * (newScale / scale);
      scale = newScale;
      updateTransform();
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    const parentContainer = block.querySelector('.mermaid-container') as HTMLElement | null;
    if (parentContainer && parentContainer !== viewport) {
      parentContainer.addEventListener('wheel', handleWheel, { passive: false });
    }

    // Mouse drag pan
    viewport.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.mermaid-toolbar, .diagram-header, .diagram-toolbar, .mermaid-zoom-badge, .mermaid-zoom-overlay, button, a')) return;
      isPanning = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      viewport.style.cursor = 'grabbing';
      viewport.classList.add('is-grabbing');
    });

    if (targetWin) {
      targetWin.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
      });

      targetWin.addEventListener('mouseup', () => {
        if (isPanning) {
          isPanning = false;
          if (viewport) {
            viewport.style.cursor = 'grab';
            viewport.classList.remove('is-grabbing');
          }
        }
      });
    }

    // Touch pinch-to-zoom & pan
    let initialPinchDist = 0;
    let initialPinchScale = 1;
    viewport.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchScale = scale;
      } else if (e.touches.length === 1) {
        isPanning = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      }
    });

    viewport.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDist > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / initialPinchDist;
        scale = Math.min(Math.max(initialPinchScale * factor, 0.25), 4.0);
        updateTransform();
      } else if (e.touches.length === 1 && isPanning) {
        e.preventDefault();
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
      }
    }, { passive: false });

    viewport.addEventListener('touchend', () => {
      initialPinchDist = 0;
      isPanning = false;
    });
  }

  block.dataset.zoomInteractionsReady = 'true';
  block.dataset.interactionsReady = 'true';

  // Automatically trigger an initial fit to ensure complex charts are immediately in view
  setTimeout(() => {
    fitDiagram(block.classList.contains('is-fullscreen'));
  }, 60);
}
