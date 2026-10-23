import { Marked } from 'marked';
import { highlightCode } from './syntaxHighlighter';
import { isSqlCode, renderSqlBlockHtml, sqlConsoleStyles } from './sqlHighlighter';
import { detectDiagramMeta, highlightMermaidCode, formatMermaidSvgCode, MERMAID_CODE_STYLES } from './mermaidRenderer';

/**
 * Detect if text is raw programming source code (e.g. TypeScript, JavaScript, Python, SQL, CSS, JSON)
 * rather than standard Markdown document or full HTML document.
 */
export function detectSourceCode(content: string): { isSourceCode: boolean; language: string } {
  if (!content || typeof content !== 'string') return { isSourceCode: false, language: '' };
  const trimmed = content.trim();
  if (!trimmed) return { isSourceCode: false, language: '' };

  // Explicit HTML document markers
  if (/^<!doctype\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return { isSourceCode: false, language: '' };
  }

  // If already contains markdown headings (# ), code fences (```), tables (|---|), or markdown links ([x](y)), it's a markdown doc
  const hasMarkdownHeadings = /(?:^|\n)#{1,6}\s+\S+/m.test(trimmed);
  const hasCodeFences = /(?:^|\n)```/m.test(trimmed);
  const hasMarkdownTables = /(?:^|\n)\|[^\n]+\|\r?\n\|[\s-:]+\|/m.test(trimmed);
  const hasMarkdownLinks = /\[[^\]]+\]\([^)]+\)/.test(trimmed);

  if (hasMarkdownHeadings || hasCodeFences || hasMarkdownTables || hasMarkdownLinks) {
    return { isSourceCode: false, language: '' };
  }

  // Strong signals for TypeScript / JavaScript / JSX / TSX
  const hasTsJsSignals = (
    /\b(export\s+(?:default\s+)?(?:function|class|const|let|var|type|interface|enum)|import\s+[\s\S]*?from\s+['"]|const\s+\w+\s*[:=]|let\s+\w+\s*[:=]|function\s+\w+\s*\(|useEffect|useState|useMemo|useCallback|useRef|useContext)\b/.test(trimmed) ||
    /^(?:\/\*\*[\s\S]*?\*\/\s*)?(?:export\s+|import\s+|function\s+|class\s+|const\s+|let\s+|async\s+function\s+)/.test(trimmed) ||
    /^(?:import|export)\b/m.test(trimmed)
  );

  if (hasTsJsSignals) {
    const isTsx = /<[A-Z][a-zA-Z0-9]*\b|\/>|:\s*React\./.test(trimmed) || /<\w+[^>]*>[\s\S]*?<\/\w+>/.test(trimmed);
    const isTs = isTsx || /:\s*(string|number|boolean|any|void|null|undefined|Record<|Array<|[A-Z]\w+)\b/.test(trimmed) || /interface\s+\w+|type\s+\w+\s*=/.test(trimmed);
    return { isSourceCode: true, language: isTsx ? 'tsx' : (isTs ? 'typescript' : 'javascript') };
  }

  // Check SQL
  if (isSqlCode(trimmed)) {
    return { isSourceCode: true, language: 'sql' };
  }

  // Check Python
  if (/\b(def\s+\w+\s*\(|class\s+\w+\s*[:(]|import\s+\w+|from\s+\w+\s+import|if\s+__name__\s*==\s*['"]__main__['"])\b/.test(trimmed)) {
    return { isSourceCode: true, language: 'python' };
  }

  // Check JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return { isSourceCode: true, language: 'json' };
    } catch {}
  }

  // Check CSS
  if (/^(?:\s*@media|\s*:[a-z]+|\s*[.#]?[a-z0-9_-]+\s*\{[\s\S]*?\})+/i.test(trimmed) && trimmed.includes('{') && trimmed.includes('}')) {
    return { isSourceCode: true, language: 'css' };
  }

  return { isSourceCode: false, language: '' };
}

/**
 * Heuristic detector: determines if text is Markdown rather than full HTML.
 */
export function isMarkdownContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  if (!trimmed) return false;

  // Explicit HTML document markers
  if (/^<!doctype\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return false;
  }

  // If detected as raw source code, route through Markdown/Code compiler for beautiful IDE rendering
  if (detectSourceCode(trimmed).isSourceCode) {
    return true;
  }

  // Strong markdown tokens:
  const hasMarkdownHeadings = /(?:^|\n)#{1,6}\s+\S+/m.test(trimmed);
  const hasCodeFences = /(?:^|\n)```[\s\S]*?```/m.test(trimmed);
  const hasMermaidFences = /(?:^|\n)```mermaid\b/i.test(trimmed);
  const hasMarkdownTables = /(?:^|\n)\|[^\n]+\|\r?\n\|[\s-:]+\|/m.test(trimmed);
  const hasMarkdownLists = /(?:^|\n)\s*([-*+]|\d+\.)\s+\S+/m.test(trimmed);
  const hasBlockquotes = /(?:^|\n)>\s+\S+/m.test(trimmed);
  const hasMarkdownLinks = /\[[^\]]+\]\([^)]+\)/.test(trimmed);
  const hasFrontmatter = /^---\r?\n[\s\S]+?\r?\n---/.test(trimmed);

  if (hasMermaidFences || hasMarkdownTables || hasFrontmatter) {
    return true;
  }

  const markdownScore =
    (hasMarkdownHeadings ? 2 : 0) +
    (hasCodeFences ? 2 : 0) +
    (hasMarkdownLists ? 1 : 0) +
    (hasBlockquotes ? 1 : 0) +
    (hasMarkdownLinks ? 1 : 0);

  const startsWithHtmlTag = /^<(div|article|section|main|p|table|header|footer)\b/i.test(trimmed);
  const containsManyHtmlTags = (trimmed.match(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi) || []).length > 6;

  if (startsWithHtmlTag && containsManyHtmlTags && markdownScore < 2) {
    return false;
  }

  return markdownScore >= 1;
}

/**
 * Extract an intuitive title from Markdown or HTML content
 */
export function extractTitle(content: string, fallbackFileName?: string): string {
  if (!content) return fallbackFileName?.replace(/\.[^/.]+$/, '') || 'Untitled Note';

  // 1. Check for Markdown frontmatter title
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (frontmatterMatch) {
    const titleLine = frontmatterMatch[1].match(/^title:\s*["']?([^"'\n\r]+)["']?/m);
    if (titleLine && titleLine[1]?.trim()) {
      return titleLine[1].trim();
    }
  }

  // 2. Check for Markdown first h1 header: # Title
  const mdHeadingMatch = content.match(/(?:^|\n)#\s+([^\n\r]+)/);
  if (mdHeadingMatch && mdHeadingMatch[1]?.trim()) {
    return mdHeadingMatch[1].replace(/[*_`]/g, '').trim();
  }

  // 3. Check for HTML <title> or <h1>
  const htmlTitleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (htmlTitleMatch && htmlTitleMatch[1]?.trim()) {
    return htmlTitleMatch[1].trim();
  }
  const htmlH1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (htmlH1Match && htmlH1Match[1]?.trim()) {
    return htmlH1Match[1].trim();
  }

  if (fallbackFileName) {
    return fallbackFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  return 'Untitled Note';
}

/**
 * Generate a clean URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // remove html tags
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
  rawText?: string;
}

/**
 * Robust Markdown & HTML heading parser:
 * Parses active Markdown content and extracts all headings (H1-H6)
 * with accurate GitHub slugs, duplicate numbering, and cleaned text.
 */
export function parseMarkdownHeadings(content: string): HeadingItem[] {
  if (!content || typeof content !== 'string') return [];

  // Strip frontmatter
  let text = content.replace(/^---\r?\n([\s\S]+?)\r?\n---\r?\n?/, '');

  // Strip code blocks so comments inside code are not matched as headings
  text = text.replace(/(?:^|\n)```[\s\S]*?```/g, '');

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const items: HeadingItem[] = [];
  const slugCounts = new Map<string, number>();
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(text)) !== null) {
    const level = match[1].length;
    let rawText = match[2].trim();
    let explicitId = '';

    const anchorMatch = rawText.match(/\s*\{#([a-zA-Z0-9_-]+)\}\s*$/);
    if (anchorMatch) {
      explicitId = anchorMatch[1];
      rawText = rawText.slice(0, anchorMatch.index).trim();
    }

    // Clean inline markdown tokens
    const cleanText = rawText
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/[*_`]/g, '') // formatting
      .replace(/<[^>]*>/g, '') // tags
      .trim();

    const baseSlug = explicitId || slugify(rawText);
    if (!baseSlug) continue;

    let id = baseSlug;
    if (!explicitId) {
      const count = slugCounts.get(baseSlug) || 0;
      slugCounts.set(baseSlug, count + 1);
      if (count > 0) {
        id = `${baseSlug}-${count}`;
      }
    }

    items.push({ id, text: cleanText || rawText, level, rawText });
  }

  // If no markdown headings found, check for HTML headings (<h1 to <h6)
  if (items.length === 0 && (content.includes('<h1') || content.includes('<h2') || content.includes('<h3') || content.includes('<h4'))) {
    const htmlHeadingRegex = /<h([1-6])(?:\s+[^>]*)?>([\s\S]*?)<\/h\1>/gi;
    let htmlMatch: RegExpExecArray | null;
    let idx = 0;
    while ((htmlMatch = htmlHeadingRegex.exec(content)) !== null) {
      const level = parseInt(htmlMatch[1], 10);
      const innerHtml = htmlMatch[2];
      const idMatch = htmlMatch[0].match(/id=["']([^"']+)["']/i);
      const cleanText = innerHtml.replace(/<[^>]*>/g, '').trim();
      if (!cleanText) continue;

      const baseSlug = (idMatch && idMatch[1]) ? idMatch[1] : slugify(cleanText);
      const id = baseSlug || `heading-${idx}`;
      items.push({ id, text: cleanText, level, rawText: cleanText });
      idx++;
    }
  }

  return items;
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

export const MARKDOWN_FONTS_HTML = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..800;1,8..60,400..800&display=swap" rel="stylesheet">`;

export function getMarkdownStyles(isDark: boolean = false): string {
  const bg = isDark ? '#0c1015' : '#ffffff';
  const text = isDark ? '#f1f5f9' : '#1f2328';
  const textMuted = isDark ? '#94a3b8' : '#57606a';
  const textSubtle = isDark ? '#64748b' : '#6e7781';
  const heading = isDark ? '#f8fafc' : '#0f172a';
  const headingBorder = isDark ? '#1f2733' : '#e2e8f0';
  const border = isDark ? '#30363d' : '#d0d7de';
  const bgSubtle = isDark ? '#161b22' : '#f6f8fa';
  const linkColor = isDark ? '#58a6ff' : '#0969da';
  const codeBg = isDark ? '#161b22' : '#eff1f3';
  const codeText = isDark ? '#ff7b72' : '#cf222e';
  const codeBorder = isDark ? '#30363d' : '#e1e4e8';
  const codePreBg = isDark ? '#0d1117' : '#ffffff';
  const codePreText = isDark ? '#e6edf3' : '#24292f';

  return `
    :root {
      color-scheme: ${isDark ? 'dark' : 'light'};
      --font-serif: 'Source Serif 4', 'Source Serif Pro', 'Charter', 'Bitstream Charter', 'Iowan Old Style', 'Merriweather', Georgia, serif;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
    }
    :root.dark, [data-theme="dark"], html.dark, body.dark {
      color-scheme: dark !important;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 40px 32px 100px;
      font-family: var(--font-sans);
      font-size: 15.5px;
      line-height: 1.72;
      color: ${text};
      background: ${bg};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    html.dark, body.dark, [data-theme="dark"] html, [data-theme="dark"] body {
      color: #f1f5f9 !important;
      background: #0c1015 !important;
    }
    .markdown-body {
      max-width: 880px;
      margin: 0 auto;
      color: ${text};
      background: ${bg};
    }
    .markdown-body.dark, .dark .markdown-body, [data-theme="dark"] .markdown-body {
      color: #f1f5f9 !important;
      background: #0c1015 !important;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-serif);
      color: ${heading};
      font-weight: 700;
      line-height: 1.3;
      margin-top: 2.25rem;
      margin-bottom: 0.85rem;
      scroll-margin-top: 2rem;
      letter-spacing: -0.015em;
    }
    .dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6,
    [data-theme="dark"] h1, [data-theme="dark"] h2, [data-theme="dark"] h3, [data-theme="dark"] h4, [data-theme="dark"] h5, [data-theme="dark"] h6 {
      color: #f8fafc !important;
    }
    h1 {
      font-size: 2.15rem;
      line-height: 1.25;
      margin-top: 1rem;
      margin-bottom: 1.25rem;
      color: ${heading};
      border-bottom: 1px solid ${headingBorder} !important;
      padding-bottom: 0.3em !important;
      letter-spacing: -0.02em;
    }
    h2 {
      font-size: 1.45rem;
      margin-top: 2.5rem;
      margin-bottom: 0.85rem;
      color: ${heading};
      border-bottom: 1px solid ${headingBorder} !important;
      padding-bottom: 0.2em !important;
    }
    h3 {
      font-size: 1.22rem;
      margin-top: 2rem;
      margin-bottom: 0.65rem;
      font-weight: 600;
      color: ${isDark ? '#f1f5f9' : '#1e293b'};
    }
    h4 {
      font-size: 1.08rem;
      margin-top: 1.6rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: ${isDark ? '#cbd5e1' : '#334155'};
    }
    p {
      margin-top: 0;
      margin-bottom: 1.25rem;
      color: ${isDark ? '#cbd5e1' : '#24292f'};
      line-height: 1.72;
    }
    .dark p, [data-theme="dark"] p {
      color: #cbd5e1 !important;
    }
    strong, b {
      color: ${heading};
      font-weight: 600;
    }
    .dark strong, .dark b, [data-theme="dark"] strong, [data-theme="dark"] b {
      color: #f8fafc !important;
    }
    em, i {
      color: ${isDark ? '#94a3b8' : '#334155'};
      font-style: italic;
    }
    a, .markdown-body a {
      color: ${linkColor} !important;
      text-decoration: underline !important;
      text-decoration-color: ${isDark ? 'rgba(88, 166, 255, 0.4)' : 'rgba(9, 105, 218, 0.4)'} !important;
      text-underline-offset: 3px !important;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s ease, text-decoration-color 0.15s ease;
    }
    a:hover, .markdown-body a:hover {
      color: ${isDark ? '#79c0ff' : '#1a7f37'} !important;
      text-decoration-color: ${isDark ? '#79c0ff' : '#1a7f37'} !important;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
    }
    hr {
      height: 1px;
      border: none;
      background: ${headingBorder};
      margin: 2.5rem 0;
    }
    ul, ol {
      padding-left: 1.5rem;
      margin-top: 0.5rem;
      margin-bottom: 1.25rem;
      color: ${isDark ? '#cbd5e1' : '#24292f'};
    }
    .dark ul, .dark ol, [data-theme="dark"] ul, [data-theme="dark"] ol {
      color: #cbd5e1 !important;
    }
    li {
      margin-bottom: 0.45rem;
      line-height: 1.72;
    }
    li > p {
      margin-top: 0;
      margin-bottom: 0.35rem;
    }
    li::marker {
      color: ${textSubtle};
    }

    /* Blockquote with refined left accent */
    blockquote, .markdown-quote {
      margin: 1.5rem 0;
      padding: 0.6rem 1rem 0.6rem 1.25rem;
      border-left: 3px solid ${isDark ? '#38bdf8' : '#0969da'};
      background: ${bgSubtle};
      border-radius: 0 8px 8px 0;
      color: ${textMuted};
      font-style: normal;
    }
    blockquote > p, .markdown-quote > p {
      color: ${textMuted};
      line-height: 1.7;
      margin-bottom: 0.6rem;
    }
    blockquote > p:last-child, .markdown-quote > p:last-child {
      margin-bottom: 0;
    }
    .dark blockquote, [data-theme="dark"] blockquote {
      background: #161b22 !important;
      border-left-color: #38bdf8 !important;
      color: #8b949e !important;
    }
    .dark blockquote p, [data-theme="dark"] blockquote p {
      color: #8b949e !important;
    }

    /* Inline Code & Badges */
    :not(pre) > code, .inline-code {
      font-family: var(--font-mono);
      font-size: 0.88em;
      padding: 0.18em 0.45em;
      border-radius: 5px;
      background: ${codeBg};
      color: ${codeText};
      border: 1px solid ${codeBorder};
      word-break: break-word;
    }
    .dark :not(pre) > code, .dark .inline-code, [data-theme="dark"] :not(pre) > code, [data-theme="dark"] .inline-code {
      background: #1e293b !important;
      color: #f87171 !important;
      border-color: #334155 !important;
    }
    .inline-badge-danger {
      background: rgba(239, 68, 68, 0.12) !important;
      color: #dc2626 !important;
      border: 1px solid rgba(239, 68, 68, 0.25) !important;
      font-weight: 600 !important;
      font-size: 0.84em !important;
      letter-spacing: 0.03em !important;
    }
    .inline-badge-muted {
      background: ${isDark ? '#21262d' : '#eaeef2'} !important;
      color: ${isDark ? '#c9d1d9' : '#24292f'} !important;
      border: 1px solid ${border} !important;
      font-weight: 600 !important;
      font-size: 0.84em !important;
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
      color: ${textSubtle} !important;
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
      color: ${linkColor} !important;
    }
    .markdown-heading .anchor-link:hover {
      color: ${linkColor} !important;
      transform: scale(1.15);
    }
    .markdown-heading .heading-text {
      flex: 1;
    }

    /* Section Target Highlight Animation when clicking a hyperlink */
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

    /* Modern Table Styling */
    table, table.data-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      font-size: 14px;
      margin: 1.5rem 0;
      border: 1px solid ${border};
      border-radius: 6px;
      overflow: hidden;
    }
    table th, table.data-table th {
      text-align: left;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 700;
      color: ${heading};
      border-bottom: 2px solid ${border};
      background: ${bgSubtle};
      white-space: nowrap;
    }
    table td, table.data-table td {
      padding: 12px 16px;
      font-size: 14px;
      line-height: 1.6;
      color: ${isDark ? '#c9d1d9' : '#24292f'};
      border-bottom: 1px solid ${headingBorder};
      background: ${bg};
      vertical-align: top;
    }
    table tr:hover td, table.data-table tr:hover td {
      background: ${bgSubtle};
    }
    .dark table, [data-theme="dark"] table {
      border-color: #30363d !important;
    }
    .dark table th, [data-theme="dark"] table th {
      background: #161b22 !important;
      color: #f0f6fc !important;
      border-color: #30363d !important;
    }
    .dark table td, [data-theme="dark"] table td {
      background: #0d1117 !important;
      color: #c9d1d9 !important;
      border-color: #21262d !important;
    }
    .dark table tr:hover td, [data-theme="dark"] table tr:hover td {
      background: #161b22 !important;
    }

    /* Clean Code Block Styling */
    .code-block-wrapper {
      margin: 1.75rem 0;
      border: 1px solid ${border};
      background: ${bgSubtle};
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: border-color 0.15s ease;
    }
    .code-block-wrapper:hover {
      border-color: ${isDark ? '#484f58' : '#b0b8c4'};
    }
    .code-block-header {
      background: ${bgSubtle};
      border-bottom: 1px solid ${border};
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    }
    .code-lang-label {
      font-family: var(--font-mono);
      font-size: 12px;
      color: ${textMuted};
      text-transform: lowercase;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .code-title {
      font-family: var(--font-mono);
      font-size: 12px;
      color: ${textMuted};
    }
    .btn-code-copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: ${textMuted};
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-code-copy:hover {
      color: ${heading};
      background: ${isDark ? '#21262d' : '#eaeef2'};
    }
    .code-block-body {
      background: ${codePreBg};
      overflow-x: auto;
    }
    .code-pre {
      margin: 0;
      padding: 16px 20px;
      font-family: var(--font-mono);
      font-size: 13.5px;
      line-height: 23px;
      color: ${codePreText};
      background: ${codePreBg};
      tab-size: 2;
      white-space: pre;
      overflow-x: auto;
      scrollbar-width: thin;
      scrollbar-color: ${border} transparent;
    }
    .code-pre::-webkit-scrollbar {
      height: 6px;
    }
    .code-pre::-webkit-scrollbar-thumb {
      background: ${border};
      border-radius: 3px;
    }
    .code-pre::-webkit-scrollbar-thumb:hover {
      background: ${textSubtle};
    }

    .dark .code-block-wrapper, [data-theme="dark"] .code-block-wrapper {
      background: #161b22 !important;
      border-color: #30363d !important;
    }
    .dark .code-block-header, [data-theme="dark"] .code-block-header {
      background: #161b22 !important;
      border-color: #30363d !important;
    }
    .dark .code-block-body, [data-theme="dark"] .code-block-body,
    .dark .code-pre, [data-theme="dark"] .code-pre {
      background: #0d1117 !important;
      color: #e6edf3 !important;
    }

    /* Prism Syntax Tokens - High-fidelity Palette */
    ${isDark ? `
    .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #8b949e !important; font-style: italic !important; }
    .token.punctuation { color: #c9d1d9 !important; }
    .token.keyword, .token.selector, .token.important, .token.atrule { color: #ff7b72 !important; font-weight: 600 !important; }
    .token.operator { color: #79c0ff !important; }
    .token.string, .token.char, .token.attr-value { color: #a5d6ff !important; }
    .token.function, .token.function-name, .token.method { color: #d2a8ff !important; }
    .token.class-name, .token.maybe-class-name { color: #ffa657 !important; }
    .token.builtin, .token.special-attr { color: #79c0ff !important; }
    .token.boolean, .token.constant { color: #79c0ff !important; }
    .token.number { color: #79c0ff !important; }
    .token.property, .token.property-access { color: #79c0ff !important; }
    .token.variable { color: #ffa657 !important; }
    .token.parameter { color: #ffa657 !important; }
    .token.regex { color: #7ee787 !important; }
    .token.tag, .token.tag .token.name { color: #7ee787 !important; font-weight: 600 !important; }
    .token.attr-name { color: #79c0ff !important; }
    .token.deleted { color: #ffdcd7 !important; background-color: #67060c !important; }
    .token.inserted { color: #aff5b4 !important; background-color: #033a16 !important; }
    ` : `
    .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #6e7781 !important; font-style: italic !important; }
    .token.punctuation { color: #24292f !important; }
    .token.keyword, .token.selector, .token.important, .token.atrule { color: #cf222e !important; font-weight: 600 !important; }
    .token.operator { color: #0550ae !important; }
    .token.string, .token.char, .token.attr-value { color: #0a3069 !important; }
    .token.function, .token.function-name, .token.method { color: #8250df !important; }
    .token.class-name, .token.maybe-class-name { color: #953800 !important; }
    .token.builtin, .token.special-attr { color: #0550ae !important; }
    .token.boolean, .token.constant { color: #0550ae !important; }
    .token.number { color: #0550ae !important; }
    .token.property, .token.property-access { color: #953800 !important; }
    .token.variable { color: #24292f !important; }
    .token.parameter { color: #953800 !important; }
    .token.regex { color: #116329 !important; }
    .token.tag, .token.tag .token.name { color: #116329 !important; font-weight: 600 !important; }
    .token.attr-name { color: #0550ae !important; }
    .token.deleted { color: #82071e !important; background-color: #ffebe9 !important; }
    .token.inserted { color: #116329 !important; background-color: #dafbe1 !important; }
    `}

    .dark .token.comment, [data-theme="dark"] .token.comment { color: #8b949e !important; }
    .dark .token.punctuation, [data-theme="dark"] .token.punctuation { color: #c9d1d9 !important; }
    .dark .token.keyword, [data-theme="dark"] .token.keyword { color: #ff7b72 !important; }
    .dark .token.operator, [data-theme="dark"] .token.operator { color: #79c0ff !important; }
    .dark .token.string, [data-theme="dark"] .token.string { color: #a5d6ff !important; }
    .dark .token.function, [data-theme="dark"] .token.function { color: #d2a8ff !important; }
    .dark .token.class-name, [data-theme="dark"] .token.class-name { color: #ffa657 !important; }
    .dark .token.number, [data-theme="dark"] .token.number { color: #79c0ff !important; }
    .dark .token.boolean, [data-theme="dark"] .token.boolean { color: #79c0ff !important; }
    .dark .token.property, [data-theme="dark"] .token.property { color: #79c0ff !important; }
    .dark .token.variable, [data-theme="dark"] .token.variable { color: #ffa657 !important; }

    ${sqlConsoleStyles}
    ${MERMAID_CODE_STYLES}
  `;
}

/**
 * High-fidelity Markdown to HTML Compiler with exact GitHub Dark Theme styling & Mermaid
 */
export function convertMarkdownToHtmlSync(
  markdown: string,
  options?: { title?: string; isDark?: boolean }
): string {
  if (!markdown) return '';

  // If content is pure source code (e.g. TypeScript, JavaScript, Python, SQL), automatically wrap in syntax code block!
  const srcCode = detectSourceCode(markdown);
  let bodyMarkdown = markdown;

  if (srcCode.isSourceCode) {
    bodyMarkdown = `\`\`\`${srcCode.language}\n${markdown.trim()}\n\`\`\``;
  } else {
    // Separate Frontmatter if present
    const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n?/);
    if (frontmatterMatch) {
      bodyMarkdown = markdown.slice(frontmatterMatch[0].length);
    }
  }

  // Pre-process Mermaid blocks into GitHub diagram containers
  const mermaidBlocks: { placeholder: string; code: string }[] = [];
  let mermaidIndex = 0;

  bodyMarkdown = bodyMarkdown.replace(
    /(?:^|\n)```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n```/gi,
    (_match, code) => {
      const placeholder = `%%MERMAID_PLACEHOLDER_${mermaidIndex++}%%`;
      mermaidBlocks.push({ placeholder, code: code.trim() });
      return `\n\n${placeholder}\n\n`;
    }
  );

  // Setup Marked with GitHub-accurate renderers
  const markedInstance = new Marked();
  const slugCounts = new Map<string, number>();

  markedInstance.use({
    gfm: true,
    breaks: true,
    renderer: {
      heading(token) {
        let rawText = token.text || '';
        let explicitId = '';
        const anchorMatch = rawText.match(/\s*\{#([a-zA-Z0-9_-]+)\}\s*$/);
        if (anchorMatch) {
          explicitId = anchorMatch[1];
          rawText = rawText.slice(0, anchorMatch.index).trim();
        }

        let text = this.parser.parseInline(token.tokens);
        text = text.replace(/\s*\{#[a-zA-Z0-9_-]+\}\s*$/, '').trim();

        const baseSlug = explicitId || slugify(rawText);
        let id = baseSlug;
        if (!explicitId) {
          const count = slugCounts.get(baseSlug) || 0;
          slugCounts.set(baseSlug, count + 1);
          if (count > 0) {
            id = `${baseSlug}-${count}`;
          }
        }
        const cleanTitle = escapeHtml(rawText);
        return `<h${token.depth} id="${id}" class="markdown-heading group">` +
          `<a class="anchor-link" href="#${id}" aria-label="Direct link to ${cleanTitle}" title="Direct link to ${cleanTitle}">` +
            `<svg class="octicon-link" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">` +
              `<path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"></path>` +
            `</svg>` +
          `</a>` +
          `<span class="heading-text">${text}</span>` +
        `</h${token.depth}>\n`;
      },
      table(token) {
        let headerRow = '';
        if (Array.isArray(token.header)) {
          for (const cell of token.header) {
            const content = this.parser.parseInline(cell.tokens || []);
            const align = cell.align ? ` align="${cell.align}"` : '';
            headerRow += `<th${align}>${content}</th>`;
          }
        }
        let bodyRows = '';
        if (Array.isArray(token.rows)) {
          for (const row of token.rows) {
            let rowHtml = '';
            for (const cell of row) {
              const content = this.parser.parseInline(cell.tokens || []);
              const align = cell.align ? ` align="${cell.align}"` : '';
              rowHtml += `<td${align}>${content}</td>`;
            }
            bodyRows += `<tr>${rowHtml}</tr>\n`;
          }
        }
        return `<div class="table-container my-4 overflow-x-auto">
          <table class="data-table">
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>\n`;
      },
      blockquote(token) {
        let body = this.parser.parse(token.tokens);
        const calloutMatch = body.match(
          /^<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*<br\s*\/?>|\s*)([\s\S]*?)<\/p>([\s\S]*)$/i
        );
        if (calloutMatch) {
          const type = calloutMatch[1].toUpperCase();
          const firstLine = calloutMatch[2];
          const rest = calloutMatch[3] || '';

          const configs: Record<
            string,
            { title: string; border: string; bg: string; text: string; icon: string }
          > = {
            NOTE: {
              title: 'Note',
              border: '#1f6feb',
              bg: '#0c2d6b33',
              text: '#58a6ff',
              icon: 'ℹ️',
            },
            TIP: {
              title: 'Tip',
              border: '#238636',
              bg: '#1a7f3733',
              text: '#3fb950',
              icon: '💡',
            },
            IMPORTANT: {
              title: 'Important',
              border: '#8957e5',
              bg: '#8957e533',
              text: '#a371f7',
              icon: '📌',
            },
            WARNING: {
              title: 'Warning',
              border: '#9e6a03',
              bg: '#bb800933',
              text: '#d29922',
              icon: '⚠️',
            },
            CAUTION: {
              title: 'Caution',
              border: '#da3633',
              bg: '#f8514933',
              text: '#f85149',
              icon: '🛑',
            },
          };

          const cfg = configs[type] || configs.NOTE;
          return `<div class="github-callout my-4 p-4 rounded-lg border-l-4 text-xs leading-relaxed" style="border-left-color:${cfg.border}; background-color:${cfg.bg}; color:#e6edf3;">
            <div class="font-bold flex items-center gap-1.5 mb-1.5 text-xs" style="color:${cfg.text}">
              <span>${cfg.icon}</span>
              <span>${cfg.title}</span>
            </div>
            <div class="callout-body text-[#e6edf3]"><p>${firstLine}</p>${rest}</div>
          </div>\n`;
        }
        return `<blockquote class="markdown-quote">${body}</blockquote>\n`;
      },
      codespan(token) {
        const text = token.text || '';
        const trimmed = text.trim();
        if (trimmed.toUpperCase() === 'NO-RUN') {
          return `<code class="inline-code inline-badge-danger">${escapeHtml(text)}</code>`;
        }
        if (trimmed.toLowerCase() === 'output:') {
          return `<code class="inline-code inline-badge-muted">${escapeHtml(text)}</code>`;
        }
        return `<code class="inline-code">${escapeHtml(text)}</code>`;
      },
      code(token) {
        const text = (token as any)?.text || '';
        const rawLang = (token as any)?.lang || '';

        let cleanLang = (rawLang || '').trim().toLowerCase();
        let codeTitle = '';
        const titleMatch = cleanLang.match(/^(\S+)\s+(?:title=)?["']?([^"'\s]+)["']?/);
        if (titleMatch) {
          cleanLang = titleMatch[1];
          codeTitle = titleMatch[2];
        } else if (cleanLang.includes(' ')) {
          const parts = cleanLang.split(/\s+/);
          cleanLang = parts[0];
          codeTitle = parts.slice(1).join(' ');
        }

        // Detect if line 1 has a filename comment: // filename.ext or # filename.ext
        if (!codeTitle) {
          const firstLineMatch = text.match(/^(?:\/\/|#|\/\*)\s*([\w\-./\\]+\.[a-zA-Z0-9]+)(?:\s*\*\/)?\s*$/m);
          if (firstLineMatch) {
            codeTitle = firstLineMatch[1].trim();
          }
        }

        const { highlightedHtml, language } = highlightCode(text, cleanLang);
        const displayLang = cleanLang || language || 'code';

        return `<div class="code-block-wrapper my-6 rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
          <div class="code-block-header px-4 py-2.5 bg-[#18181b] border-b border-[#27272a]/70 flex items-center justify-between text-xs select-none">
            <div class="flex items-center gap-2 min-w-0">
              <span class="code-lang-label font-mono text-[12px] text-zinc-400 lowercase tracking-normal font-medium">${escapeHtml(displayLang)}</span>
              ${codeTitle ? `<span class="code-title text-zinc-500 font-mono text-xs truncate">• ${escapeHtml(codeTitle)}</span>` : ''}
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" class="btn-code-copy inline-flex items-center justify-center p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer" data-raw-code="${escapeHtml(text)}" title="Copy code" aria-label="Copy code">
                <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg class="check-icon" style="display:none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <div class="code-block-body relative overflow-x-auto">
            <pre class="code-pre m-0 p-4 font-mono text-[13.5px] leading-[23px] text-[#e4e4e7] bg-[#18181b]"><code class="language-${language} code-content">${highlightedHtml}</code></pre>
          </div>
        </div>`;
      },
    },
  });

  let parsedHtml = markedInstance.parse(bodyMarkdown) as string;

  // Transform any raw <pre><code> blocks containing SQL statements into the SQL Command Console
  parsedHtml = parsedHtml.replace(
    /<pre(?:\s+class=["']([^"']*)["'])?[^>]*>\s*<code(?:\s+class=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (match, preClass, codeClass, innerHtml) => {
      // If this <pre> was already rendered by our code block renderer, never touch it!
      if (preClass && (preClass.includes('code-pre') || preClass.includes('mermaid'))) {
        return match;
      }
      const combinedClass = `${preClass || ''} ${codeClass || ''}`.toLowerCase();
      // If code explicitly has a non-SQL language class, never touch it!
      const langMatch = combinedClass.match(/language-([a-z0-9_-]+)/i);
      const rawLang = langMatch ? langMatch[1] : (combinedClass.includes('sql') ? 'sql' : '');
      if (rawLang && !['sql', 'pgsql', 'postgres', 'postgresql', 'mysql', 'sqlite', 'mariadb', 'tsql'].includes(rawLang.toLowerCase())) {
        return match;
      }

      // Decode HTML entities
      const rawCode = innerHtml
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();

      if (isSqlCode(rawCode, rawLang)) {
        return renderSqlBlockHtml(rawCode, { rawLang: rawLang || 'sql' });
      }
      return match;
    }
  );

  // Replace Mermaid placeholders with GitHub diagram component markup
  for (const block of mermaidBlocks) {
    const escapedCode = escapeHtml(block.code);
    const meta = detectDiagramMeta(block.code);
    const lineCount = block.code.trim().split('\n').length;
    const highlighted = highlightMermaidCode(block.code);

    const diagramHtml = `
      <div class="github-mermaid-block group relative my-6 rounded-xl border border-[#cbd5e1] dark:border-[#30363d] bg-white dark:bg-[#0d1117] shadow-lg overflow-hidden" data-raw-mermaid="${escapedCode}">
        <!-- Diagram Modern Header (Clean Light & Dark Styling) -->
        <div class="diagram-header flex items-center justify-between p-3 bg-white dark:bg-[#161b22] border-b border-[#cbd5e1] dark:border-[#30363d] gap-2.5 flex-wrap">
          <div class="diagram-title-group flex items-center gap-2.5 min-w-0 flex-wrap">
            <span class="diagram-icon-badge inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#dbeafe] dark:bg-[#1e3a8a] text-[#1e40af] dark:text-[#93c5fd] font-bold text-sm select-none">${meta.icon}</span>
            <span class="diagram-title text-[14.5px] font-bold text-[#0f172a] dark:text-[#f8fafc] truncate tracking-tight">${meta.title}</span>
          </div>
          <div class="diagram-toolbar ml-auto flex items-center gap-1 bg-[#f8fafc] dark:bg-[#0d1117] p-1 rounded-xl border border-[#cbd5e1] dark:border-[#30363d] shadow-xs select-none" role="toolbar" aria-label="Diagram controls">
            <button type="button" class="btn-diag-legend btn-mermaid-legend diagram-btn flex items-center justify-center h-7 px-2.5 rounded-lg text-xs font-sans font-medium text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Diagram Legend: explain node shapes and line types" aria-label="Diagram Legend">
              <span aria-hidden="true">💡 Legend</span>
            </button>
            <div class="h-4 w-px bg-[#cbd5e1] dark:bg-[#30363d] mx-0.5"></div>
            <button type="button" class="btn-diag-zoomout btn-mermaid-zoomout diagram-btn flex items-center justify-center h-7 px-2 rounded-lg text-xs font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Zoom out (−)" aria-label="Zoom out">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 7.75A.75.75 0 0 1 2.75 7h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.75Z"/></svg>
            </button>
            <div class="diagram-zoom-indicator flex items-center justify-center h-7 px-2 text-xs font-mono font-bold text-[#1e293b] dark:text-[#f0f6fc] select-none" title="Current zoom level">
              <span class="zoom-val zoom-text">100%</span>
            </div>
            <button type="button" class="btn-diag-zoomin btn-mermaid-zoomin diagram-btn flex items-center justify-center h-7 px-2 rounded-lg text-xs font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Zoom in (+)" aria-label="Zoom in">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
            </button>
            <div class="h-4 w-px bg-[#cbd5e1] dark:bg-[#30363d] mx-0.5"></div>
            <button type="button" class="btn-diag-fit btn-mermaid-fit diagram-btn flex items-center gap-1 justify-center h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Zoom to fit diagram in view" aria-label="Zoom to fit">
              <span aria-hidden="true">⊡</span> <span>Fit</span>
            </button>
            <button type="button" class="btn-diag-reset btn-mermaid-reset diagram-btn flex items-center gap-1 justify-center h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Reset zoom to 100% (1:1)" aria-label="Reset zoom">
              <span aria-hidden="true">↺</span> <span>Reset</span>
            </button>
            <div class="h-4 w-px bg-[#cbd5e1] dark:bg-[#30363d] mx-0.5"></div>
            <button type="button" class="btn-diag-copy btn-mermaid-copy diagram-btn flex items-center justify-center h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Copy Mermaid syntax" aria-label="Copy Mermaid syntax">
              📋 Copy
            </button>
            <button type="button" class="btn-diag-theme btn-mermaid-theme diagram-btn flex items-center justify-center gap-1 h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Toggle diagram theme: Dark / Light" aria-label="Toggle diagram theme">
              <span class="theme-icon" aria-hidden="true">🌓</span> <span class="theme-text">Theme</span>
            </button>
            <button type="button" class="btn-diag-expand btn-mermaid-expand diagram-btn flex items-center justify-center h-7 px-2.5 rounded-lg text-xs font-mono font-semibold text-[#475569] dark:text-[#c9d1d9] hover:bg-[#e2e8f0] dark:hover:bg-[#21262d] transition-colors cursor-pointer" title="Toggle Fullscreen View" aria-label="Toggle Fullscreen View">
              ⛶ Fullscreen
            </button>
          </div>
        </div>

        <!-- Diagram Viewport (Pan & Zoom target at natural initial position) -->
        <div class="mermaid-viewport w-full p-6 flex items-start justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none" style="min-height: 290px;">
          <div class="mermaid-canvas transition-transform duration-75 origin-top">
            <pre class="mermaid-raw-source text-center font-mono text-xs text-[#f0f6fc]">${escapedCode}</pre>
          </div>
          <!-- Persistent Floating Legend Button on Bottom Left -->
          <button type="button" class="mermaid-floating-legend-btn" title="Diagram Legend: explain node shapes and line types">
            <span aria-hidden="true">💡</span>
            <span>Legend</span>
          </button>
          <!-- Persistent HUD Zoom Badge on Bottom Right -->
          <div class="mermaid-zoom-overlay mermaid-zoom-badge" role="toolbar" aria-label="Diagram zoom controls" title="Zoom: scroll or click + / − • Drag to pan • Fullscreen: 100vh">
            <button type="button" class="zoom-control-btn zoom-btn-minus btn-hud-out" title="Zoom out (−)" aria-label="Zoom out">−</button>
            <button type="button" class="zoom-control-btn zoom-indicator-btn zoom-val" title="Current zoom level • Click to toggle Fit / 1:1" aria-label="Current zoom">100%</button>
            <button type="button" class="zoom-control-btn zoom-btn-plus btn-hud-in" title="Zoom in (+)" aria-label="Zoom in">+</button>
            <button type="button" class="zoom-control-btn zoom-btn-fit btn-hud-fit font-semibold" title="Zoom to fit diagram in view" aria-label="Zoom to fit">⊡ Fit</button>
            <button type="button" class="zoom-control-btn zoom-btn-reset btn-hud-reset font-semibold" title="Reset zoom to 100% (1:1)" aria-label="Reset zoom">↺ Reset</button>
            <button type="button" class="zoom-control-btn zoom-btn-expand btn-hud-expand font-bold text-xs" title="Toggle Fullscreen (100vh)" aria-label="Toggle Fullscreen">⛶ Fullscreen</button>
          </div>
        </div>

        <!-- Floating Legend Overlay / Tooltip explaining node shapes and line types -->
        <div class="mermaid-legend-overlay" style="display: none;" role="dialog" aria-modal="true" aria-label="Diagram Legend">
          <div class="legend-header">
            <div class="legend-title-wrap">
              <span class="legend-badge">💡 Diagram Legend</span>
              <span class="legend-subtitle">Visual syntax for shapes & connectors</span>
            </div>
            <button type="button" class="legend-close-btn" title="Close Legend (Esc)" aria-label="Close Legend">✕</button>
          </div>
          <div class="legend-content">
            <div class="legend-section">
              <div class="legend-section-title">🔷 Node Shapes & Entities</div>
              <div class="legend-grid">
                <div class="legend-item">
                  <span class="legend-symbol shape-rect">[ Service / Process ]</span>
                  <div class="legend-desc"><strong>Rectangle</strong>: Service, controller, or business process step</div>
                </div>
                <div class="legend-item">
                  <span class="legend-symbol shape-db">[( Database / Cache )]</span>
                  <div class="legend-desc"><strong>Cylinder</strong>: Persistent database, Redis cache, or storage</div>
                </div>
                <div class="legend-item">
                  <span class="legend-symbol shape-decision">{ Decision / Gateway }</span>
                  <div class="legend-desc"><strong>Rhombus / Diamond</strong>: Conditional branch, auth check, or validation</div>
                </div>
                <div class="legend-item">
                  <span class="legend-symbol shape-rounded">( Rounded / Stadium )</span>
                  <div class="legend-desc"><strong>Rounded / Pill</strong>: Start / terminal state, event trigger, or endpoint</div>
                </div>
                <div class="legend-item">
                  <span class="legend-symbol shape-actor">Actor / Participant</span>
                  <div class="legend-desc"><strong>Actor Box</strong>: Customer, browser client, payment gateway, or worker</div>
                </div>
              </div>
            </div>
            <div class="legend-section">
              <div class="legend-section-title">➔ Line Types & Flow Semantics</div>
              <div class="legend-grid">
                <div class="legend-item">
                  <span class="legend-symbol line-solid">───▶ (Solid Arrow)</span>
                  <div class="legend-desc"><strong>Solid Line / Arrow</strong>: Synchronous request, direct execution, or transition</div>
                </div>
                <div class="legend-item">
                  <span class="legend-symbol line-dashed">┈┈┈▶ (Dashed Arrow)</span>
                  <div class="legend-desc"><strong>Dashed Line / Arrow</strong>: Asynchronous response, webhook notification, BullMQ event</div>
                </div>
                <div class="legend-item">
                  <span class="legend-symbol line-thick">═══▶ (Thick Arrow)</span>
                  <div class="legend-desc"><strong>Thick Line</strong>: Authoritative state transition, database commit, money movement</div>
                </div>
                <div class="legend-item">
                  <span class="legend-symbol line-blocked">─x─ (Cross Arrow)</span>
                  <div class="legend-desc"><strong>Cross End</strong>: Rejected transaction, expired session, or blocked request</div>
                </div>
                <div class="legend-item">
                  <span class="legend-symbol note-box">Note over Entity</span>
                  <div class="legend-desc"><strong>Yellow Note</strong>: Local state explanation, concurrency lock, or idempotency rule</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const pWrapped = `<p>${block.placeholder}</p>`;
    if (parsedHtml.includes(pWrapped)) {
      parsedHtml = parsedHtml.replace(pWrapped, diagramHtml);
    } else {
      parsedHtml = parsedHtml.replace(block.placeholder, diagramHtml);
    }
  }

  const isDarkDoc = options?.isDark ?? false;
  const documentTitle = options?.title || extractTitle(markdown);

  return `<!DOCTYPE html>
<html lang="en" class="${isDarkDoc ? 'dark' : 'light'}" data-theme="${isDarkDoc ? 'dark' : 'light'}" style="color-scheme: ${isDarkDoc ? 'dark' : 'light'};">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="${isDarkDoc ? 'dark' : 'light'}">
  <title>${escapeHtml(documentTitle)}</title>
  ${MARKDOWN_FONTS_HTML}
  <style>
    ${getMarkdownStyles(isDarkDoc)}
  </style>

  <!-- Mermaid Runtime Engine inside iframe -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    (function() {
      function decodeHtml(html) {
        var txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
      }

      function initMermaidAndControls() {
        if (typeof window.mermaid === 'undefined') return;
        try {
          var isDark = ${isDarkDoc ? 'true' : 'false'} || document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
          window.mermaid.initialize({
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
              background: '#0d1117',
              mainBkg: '#161b22',
              nodeBorder: '#475569',
              lineColor: '#64748b',
              textColor: '#f8fafc',
              primaryColor: '#1e293b',
              primaryTextColor: '#f8fafc',
              primaryBorderColor: '#475569',
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
              actorBorder: '#64748b',
              actorTextColor: '#f8fafc',
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
              sequenceNumberColor: '#ffffff'
            }
          });

          var blocks = document.querySelectorAll('.github-mermaid-block');
          blocks.forEach(function(block, idx) {
            var canvas = block.querySelector('.mermaid-canvas');
            if (block.dataset.mermaidRendered === 'true' && canvas && canvas.querySelector('svg')) {
              setupDiagramInteractions();
              return;
            }

            var raw = block.getAttribute('data-raw-mermaid');
            var pre = block.querySelector('pre.mermaid, pre.mermaid-raw-source, .mermaid');
            var code = raw || (pre ? pre.textContent : '');
            code = decodeHtml(code);
            if (!code) return;

            if (code.indexOf('stroke:#') !== -1 || code.indexOf('fill:#') !== -1 || code.indexOf('<svg') !== -1) {
              return;
            }

            var diagramId = 'mermaid-standalone-' + Date.now() + '-' + idx;
            window.mermaid.render(diagramId, code).then(function(res) {
              if (canvas) {
                canvas.innerHTML = res.svg;
                var svg = canvas.querySelector('svg');
                if (svg) {
                  svg.classList.remove('mermaid');
                  svg.classList.add('mermaid-svg');
                }
              } else if (pre) {
                pre.innerHTML = res.svg;
                var svg = pre.querySelector('svg');
                if (svg) {
                  svg.classList.remove('mermaid');
                  svg.classList.add('mermaid-svg');
                }
              }
              block.dataset.mermaidRendered = 'true';
              setupDiagramInteractions();
            }).catch(function(err) {
              console.warn('Mermaid render error for block ' + idx, err);
            });
          });
        } catch(e) {
          console.warn('Mermaid init error:', e);
        }
      }

      function ensureMermaidAndRun() {
        if (window.__mermaidRan) return;
        if (typeof window.mermaid !== 'undefined') {
          initMermaidAndControls();
          return;
        }
        var attempts = 0;
        var poll = setInterval(function() {
          attempts++;
          if (typeof window.mermaid !== 'undefined') {
            clearInterval(poll);
            initMermaidAndControls();
          } else if (attempts >= 60) {
            clearInterval(poll);
          }
        }, 100);
      }

      // Attach pan, zoom, copy, and fullscreen to every GitHub diagram card
      function setupDiagramInteractions() {
        var blocks = document.querySelectorAll('.github-mermaid-block');
        blocks.forEach(function(block) {
          if (block.dataset.interactionsReady) return;
          block.dataset.interactionsReady = 'true';

          var viewport = block.querySelector('.mermaid-viewport');
          var canvas = block.querySelector('.mermaid-canvas');
          var rawCode = block.getAttribute('data-raw-mermaid') || '';

          var scale = 1.0;
          var panX = 0;
          var panY = 0;
          var isPanning = false;
          var startX = 0;
          var startY = 0;

          var zoomText = block.querySelector('.zoom-text');
          var zoomBadgeVal = block.querySelector('.mermaid-zoom-badge .zoom-val');

          function updateTransform() {
            if (canvas) {
              canvas.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
              canvas.style.transformOrigin = 'top center';
            }
            var pct = Math.round(scale * 100) + '%';
            if (zoomText) zoomText.textContent = pct;
            if (zoomBadgeVal) zoomBadgeVal.textContent = pct;
          }

          var btnZoomIn = block.querySelector('.btn-mermaid-zoomin');
          var btnZoomOut = block.querySelector('.btn-mermaid-zoomout');
          var btnReset = block.querySelector('.btn-mermaid-reset');
          var btnFit = block.querySelector('.btn-mermaid-fit');
          var btnCopy = block.querySelector('.btn-mermaid-copy');
          var btnExpand = block.querySelector('.btn-mermaid-expand');
          var zoomBadge = block.querySelector('.mermaid-zoom-badge');

          var btnLegend = block.querySelector('.btn-mermaid-legend');
          var floatingLegendBtn = block.querySelector('.mermaid-floating-legend-btn');
          var legendOverlay = block.querySelector('.mermaid-legend-overlay');
          var legendCloseBtn = block.querySelector('.legend-close-btn');

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
          if (legendCloseBtn) {
            legendCloseBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              toggleLegend(false);
            });
          }
          if (legendOverlay) {
            legendOverlay.addEventListener('click', function(e) {
              e.stopPropagation();
            });
          }

          if (btnZoomIn) {
            btnZoomIn.addEventListener('click', function(e) {
              e.stopPropagation();
              scale = Math.min(scale * 1.25, 4.0);
              updateTransform();
            });
          }

          if (btnZoomOut) {
            btnZoomOut.addEventListener('click', function(e) {
              e.stopPropagation();
              scale = Math.max(scale * 0.8, 0.15);
              updateTransform();
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

          // Floating HUD button listeners
          var hudFit = block.querySelector('.mermaid-zoom-badge .zoom-btn-fit, .mermaid-zoom-badge .btn-hud-fit');
          if (hudFit) {
            hudFit.addEventListener('click', function(e) {
              e.stopPropagation();
              fitDiagram(block.classList.contains('is-fullscreen'));
            });
          }

          var hudReset = block.querySelector('.mermaid-zoom-badge .zoom-btn-reset, .mermaid-zoom-badge .btn-hud-reset');
          if (hudReset) {
            hudReset.addEventListener('click', function(e) {
              e.stopPropagation();
              scale = 1.0;
              panX = 0;
              panY = 0;
              updateTransform();
            });
          }

          var hudMinus = block.querySelector('.mermaid-zoom-badge .zoom-btn-minus, .mermaid-zoom-badge .btn-hud-out');
          if (hudMinus) {
            hudMinus.addEventListener('click', function(e) {
              e.stopPropagation();
              scale = Math.max(scale * 0.8, 0.15);
              updateTransform();
            });
          }

          var hudPlus = block.querySelector('.mermaid-zoom-badge .zoom-btn-plus, .mermaid-zoom-badge .btn-hud-in');
          if (hudPlus) {
            hudPlus.addEventListener('click', function(e) {
              e.stopPropagation();
              scale = Math.min(scale * 1.25, 5.0);
              updateTransform();
            });
          }

          var hudVal = block.querySelector('.mermaid-zoom-badge .zoom-val');
          if (hudVal) {
            hudVal.addEventListener('click', function(e) {
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
          }

          function fitDiagram(forceFull) {
            if (!viewport) return;
            var svg = canvas ? canvas.querySelector('svg') : null;
            if (svg) {
              var svgWidth = 0;
              var svgHeight = 0;
              try {
                if (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
                  svgWidth = svg.viewBox.baseVal.width;
                  svgHeight = svg.viewBox.baseVal.height;
                } else if (svg.getBBox) {
                  var bbox = svg.getBBox();
                  if (bbox.width > 0) {
                    svgWidth = bbox.width;
                    svgHeight = bbox.height;
                  }
                }
              } catch(e) {}
              if (!svgWidth) {
                var attrW = svg.getAttribute('width');
                if (attrW && !attrW.includes('%')) svgWidth = parseFloat(attrW) || 0;
              }
              if (!svgWidth) svgWidth = svg.clientWidth || (svg.getBoundingClientRect && svg.getBoundingClientRect().width) || 800;
              if (!svgHeight) svgHeight = svg.clientHeight || (svg.getBoundingClientRect && svg.getBoundingClientRect().height) || 600;

              // Explicitly size SVG to natural vector bounds
              if (svgWidth > 0 && svgHeight > 0) {
                svg.style.width = svgWidth + 'px';
                svg.style.height = svgHeight + 'px';
                svg.style.maxWidth = 'none';
              }

              var isFull = block.classList.contains('is-fullscreen') || forceFull;
              var padX = isFull ? 80 : 40;
              var padY = isFull ? 80 : 36;

              var viewWidth;
              var viewHeight;
              if (isFull) {
                var winW = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 1200;
                var winH = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 900;
                viewWidth = Math.max(winW - padX, 300);
                viewHeight = Math.max(winH - 52 - padY, 300);
              } else {
                var vRect = viewport.getBoundingClientRect();
                viewWidth = Math.max((vRect.width || viewport.clientWidth || window.innerWidth) - padX, 260);
                viewHeight = Math.max((vRect.height || viewport.clientHeight || 340) - padY, 200);
              }

              if (svgWidth > 0 && viewWidth > 0) {
                var scaleX = viewWidth / svgWidth;
                var scaleY = (svgHeight > 0 && viewHeight > 0) ? (viewHeight / svgHeight) : scaleX;
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
          }

          if (btnFit) {
            btnFit.addEventListener('click', function(e) {
              e.stopPropagation();
              fitDiagram(block.classList.contains('is-fullscreen'));
            });
          }

          if (btnCopy) {
            btnCopy.addEventListener('click', function(e) {
              e.stopPropagation();
              if (rawCode && navigator.clipboard) {
                navigator.clipboard.writeText(rawCode).then(function() {
                  var origTitle = btnCopy.getAttribute('title');
                  btnCopy.setAttribute('title', 'Copied to clipboard!');
                  btnCopy.style.color = '#10b981';
                  setTimeout(function() {
                    btnCopy.setAttribute('title', origTitle);
                    btnCopy.style.color = '';
                  }, 2000);
                });
              }
            });
          }

          if (btnExpand) {
            btnExpand.addEventListener('click', function(e) {
              e.stopPropagation();
              block.classList.toggle('is-fullscreen');
              var isFull = block.classList.contains('is-fullscreen');
              if (isFull) {
                btnExpand.setAttribute('title', 'Exit Fullscreen View (Esc)');
                btnExpand.innerHTML = '✕ Exit';
                setTimeout(function() { fitDiagram(true); }, 50);
              } else {
                btnExpand.setAttribute('title', 'Toggle Fullscreen View');
                btnExpand.innerHTML = '⛶ Fullscreen';
                setTimeout(function() { fitDiagram(false); }, 50);
              }
            });
          }

          window.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && block.classList.contains('is-fullscreen')) {
              block.classList.remove('is-fullscreen');
              if (btnExpand) {
                btnExpand.setAttribute('title', 'Toggle Fullscreen View');
                btnExpand.innerHTML = '⛶ Fullscreen';
              }
              setTimeout(function() { fitDiagram(false); }, 50);
            }
          });

          // Double click canvas to toggle between Zoom to Fit and 1:1 Reset
          if (viewport) {
            viewport.addEventListener('dblclick', function(e) {
              if (e.target.closest('.mermaid-toolbar, .diagram-header, .diagram-toolbar, .mermaid-zoom-badge, button')) return;
              if (Math.abs(scale - 1.0) < 0.05) {
                fitDiagram(block.classList.contains('is-fullscreen'));
              } else {
                scale = 1.0;
                panX = 0;
                panY = 0;
                updateTransform();
              }
            });

            viewport.addEventListener('wheel', function(e) {
              e.preventDefault();
              var delta = e.deltaY < 0 ? 1.15 : 0.88;
              scale = Math.min(Math.max(scale * delta, 0.25), 4.0);
              updateTransform();
            }, { passive: false });

            viewport.addEventListener('mousedown', function(e) {
              if (e.target.closest('.mermaid-toolbar, button')) return;
              isPanning = true;
              startX = e.clientX - panX;
              startY = e.clientY - panY;
              viewport.style.cursor = 'grabbing';
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
                if (viewport) viewport.style.cursor = 'grab';
              }
            });
          }

          // Initialize at natural initial position (100% 1:1, pan 0, 0)
          scale = 1.0;
          panX = 0;
          panY = 0;
          updateTransform();
        });
      }

      function initCodeBlockControls() {
        document.addEventListener('click', function(e) {
          // 1. Copy Code Button
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
                var copyIcon = copyBtn.querySelector('.copy-icon');
                var checkIcon = copyBtn.querySelector('.check-icon');
                var copyText = copyBtn.querySelector('.copy-text');
                if (copyIcon) copyIcon.style.display = 'none';
                if (checkIcon) checkIcon.style.display = 'inline-block';
                if (copyText) copyText.textContent = copyBtn.closest('.sql-code-block') ? 'Copied SQL!' : 'Copied!';
                copyBtn.classList.add('text-emerald-400');
                setTimeout(function() {
                  if (copyIcon) copyIcon.style.display = 'inline-block';
                  if (checkIcon) checkIcon.style.display = 'none';
                  if (copyText) copyText.textContent = copyBtn.closest('.sql-code-block') ? 'Copy SQL' : 'Copy';
                  copyBtn.classList.remove('text-emerald-400');
                }, 2000);
              });
            }
            return;
          }

          // 2. Wrap Code Button
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

          // 3. Format / Beautify SQL Button
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
                codeEl.innerHTML = codeEl.getAttribute('data-raw-html') || '';
                codeEl.setAttribute('data-is-formatted', 'false');
                if (label) label.textContent = 'Beautify';
                formatBtn.classList.remove('text-[#38bdf8]', 'border-[#38bdf8]/50');
                if (lineCountSpan) lineCountSpan.textContent = codeEl.getAttribute('data-raw-lines') || '';
              } else {
                codeEl.innerHTML = codeEl.getAttribute('data-formatted-html') || '';
                codeEl.setAttribute('data-is-formatted', 'true');
                if (label) label.textContent = 'Original';
                formatBtn.classList.add('text-[#38bdf8]', 'border-[#38bdf8]/50');
                if (lineCountSpan) lineCountSpan.textContent = codeEl.getAttribute('data-formatted-lines') || '';
              }
            }
            return;
          }
        });
      }

      function initAnchorLinkNavigation() {
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

          // 2. Attribute / contains search
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
          var a = e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href') || a.href || '';
          if (!href) return;

          // Any in-document anchor link
          if (href.indexOf('#') !== -1) {
            var hashPart = href.substring(href.indexOf('#'));
            e.preventDefault();
            e.stopPropagation();
            scrollToAnchorTarget(hashPart, e);
            return;
          } else if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          } else {
            e.preventDefault();
            e.stopPropagation();
          }
        }, true);

        // Close any open legend overlay if clicking outside or pressing Escape
        document.addEventListener('click', function(e) {
          if (!e.target.closest('.mermaid-legend-overlay, .btn-mermaid-legend, .mermaid-floating-legend-btn')) {
            var overlays = document.querySelectorAll('.mermaid-legend-overlay');
            overlays.forEach(function(ov) { ov.style.display = 'none'; });
          }
        });

        window.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            var overlays = document.querySelectorAll('.mermaid-legend-overlay');
            overlays.forEach(function(ov) { ov.style.display = 'none'; });
          }
        });

        if (window.location.hash) {
          setTimeout(function() {
            scrollToAnchorTarget(window.location.hash);
          }, 150);
        }
      }

      function ensureControlsRun() {
        ensureMermaidAndRun();
        initCodeBlockControls();
        initAnchorLinkNavigation();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureControlsRun);
      } else {
        ensureControlsRun();
      }
      window.addEventListener('load', ensureControlsRun);
    })();
  </script>
</head>
<body class="markdown-body markdown-preview-container ${isDarkDoc ? 'dark' : ''}" data-theme="${isDarkDoc ? 'dark' : 'light'}">
  ${parsedHtml}
</body>
</html>`;
}

export async function convertMarkdownToHtml(
  markdown: string,
  options?: { title?: string; isDark?: boolean }
): Promise<string> {
  return convertMarkdownToHtmlSync(markdown, options);
}

