import Prism from 'prismjs';

// Load Prism language components in proper dependency order
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-java';

// Language aliases map for friendly resolution
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  python: 'python',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  json: 'json',
  jsonc: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  sql: 'sql',
  pgsql: 'sql',
  mysql: 'sql',
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  xml: 'html',
  svg: 'html',
  css: 'css',
  scss: 'css',
  go: 'go',
  golang: 'go',
  rs: 'rust',
  rust: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  dockerfile: 'bash',
  docker: 'bash',
  diff: 'markdown',
  env: 'bash',
  text: 'text',
  plaintext: 'text',
  txt: 'text',
};

// Language display badges and colors
export interface LanguageMeta {
  displayName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const LANGUAGE_META: Record<string, LanguageMeta> = {
  typescript: {
    displayName: 'TypeScript',
    badgeBg: '#1e3a5f',
    badgeText: '#60a5fa',
    badgeBorder: '#2563eb',
  },
  javascript: {
    displayName: 'JavaScript',
    badgeBg: '#3d3308',
    badgeText: '#facc15',
    badgeBorder: '#ca8a04',
  },
  tsx: {
    displayName: 'TSX',
    badgeBg: '#0f384a',
    badgeText: '#38bdf8',
    badgeBorder: '#0284c7',
  },
  jsx: {
    displayName: 'JSX',
    badgeBg: '#0f384a',
    badgeText: '#38bdf8',
    badgeBorder: '#0284c7',
  },
  python: {
    displayName: 'Python',
    badgeBg: '#17324d',
    badgeText: '#67e8f9',
    badgeBorder: '#0e7490',
  },
  bash: {
    displayName: 'Bash',
    badgeBg: '#13351d',
    badgeText: '#4ade80',
    badgeBorder: '#16a34a',
  },
  json: {
    displayName: 'JSON',
    badgeBg: '#2a2712',
    badgeText: '#fde047',
    badgeBorder: '#a16207',
  },
  html: {
    displayName: 'HTML',
    badgeBg: '#3b1c14',
    badgeText: '#fb923c',
    badgeBorder: '#ea580c',
  },
  css: {
    displayName: 'CSS',
    badgeBg: '#142547',
    badgeText: '#93c5fd',
    badgeBorder: '#2563eb',
  },
  sql: {
    displayName: 'SQL',
    badgeBg: '#2a1a4a',
    badgeText: '#c084fc',
    badgeBorder: '#9333ea',
  },
  go: {
    displayName: 'Go',
    badgeBg: '#0a3338',
    badgeText: '#2dd4bf',
    badgeBorder: '#0d9488',
  },
  rust: {
    displayName: 'Rust',
    badgeBg: '#3d1c10',
    badgeText: '#f97316',
    badgeBorder: '#c2410c',
  },
  java: {
    displayName: 'Java',
    badgeBg: '#3d1616',
    badgeText: '#f87171',
    badgeBorder: '#dc2626',
  },
  cpp: {
    displayName: 'C++',
    badgeBg: '#172554',
    badgeText: '#93c5fd',
    badgeBorder: '#1d4ed8',
  },
  yaml: {
    displayName: 'YAML',
    badgeBg: '#311b3b',
    badgeText: '#e879f9',
    badgeBorder: '#a21caf',
  },
  markdown: {
    displayName: 'Markdown',
    badgeBg: '#1e293b',
    badgeText: '#94a3b8',
    badgeBorder: '#475569',
  },
  text: {
    displayName: 'Plain Text',
    badgeBg: '#21262d',
    badgeText: '#c9d1d9',
    badgeBorder: '#30363d',
  },
};

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format Prism highlighted HTML into structured, perfectly-aligned code lines.
 * Handles multiline tokens cleanly so line numbers never desync even on word wrap.
 */
export function formatHighlightedLines(highlightedHtml: string): string {
  const rawLines = highlightedHtml.split(/\r?\n/);
  const openTags: string[] = [];

  return rawLines
    .map((line, idx) => {
      const prefix = openTags.join('');

      // Find all HTML tags in this line to maintain token stack
      const tagRegex = /<\/?([a-z0-9-]+)[^>]*>/gi;
      let match: RegExpExecArray | null;
      const currentTags = [...openTags];

      while ((match = tagRegex.exec(line)) !== null) {
        const fullTag = match[0];
        const tagName = match[1].toLowerCase();
        if (fullTag.startsWith('</')) {
          const lastIdx = currentTags
            .map((t) => {
              const m = t.match(/<([a-z0-9-]+)/i);
              return m ? m[1].toLowerCase() : '';
            })
            .lastIndexOf(tagName);
          if (lastIdx !== -1) {
            currentTags.splice(lastIdx, 1);
          }
        } else if (!fullTag.endsWith('/>')) {
          currentTags.push(fullTag);
        }
      }

      // Close open tags at line boundary
      const suffix = currentTags
        .slice()
        .reverse()
        .map((t) => {
          const m = t.match(/<([a-z0-9-]+)/i);
          return m ? `</${m[1]}>` : '';
        })
        .join('');

      openTags.length = 0;
      openTags.push(...currentTags);

      const lineContent = line || '&nbsp;';
      const num = idx + 1;

      return `<div class="code-line" data-line="${num}"><span class="line-num" aria-hidden="true">${num}</span><span class="line-content">${prefix}${lineContent}${suffix}</span></div>`;
    })
    .join('');
}

/**
 * Highlight code using Prism with graceful fallback and structured line-numbered HTML
 */
export function highlightCode(
  code: string,
  rawLang?: string
): {
  highlightedHtml: string;
  linesHtml: string;
  language: string;
  displayName: string;
  meta: LanguageMeta;
  lineCount: number;
} {
  const cleanCode = code || '';
  const normalizedLang = (rawLang || '').trim().toLowerCase();
  const canonicalLang = LANGUAGE_ALIASES[normalizedLang] || normalizedLang || 'text';

  const meta = LANGUAGE_META[canonicalLang] || {
    displayName: rawLang ? rawLang.toUpperCase() : 'Code',
    badgeBg: '#21262d',
    badgeText: '#c9d1d9',
    badgeBorder: '#30363d',
  };

  let highlightedHtml = '';
  const grammar = Prism.languages[canonicalLang];

  if (grammar) {
    try {
      highlightedHtml = Prism.highlight(cleanCode, grammar, canonicalLang);
    } catch {
      highlightedHtml = escapeHtml(cleanCode);
    }
  } else {
    highlightedHtml = escapeHtml(cleanCode);
  }

  const lines = cleanCode.split('\n');
  const lineCount = lines.length;
  const linesHtml = formatHighlightedLines(highlightedHtml);

  return {
    highlightedHtml,
    linesHtml,
    language: canonicalLang,
    displayName: meta.displayName,
    meta,
    lineCount,
  };
}
