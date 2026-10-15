import { highlightCode, escapeHtml, formatHighlightedLines } from './syntaxHighlighter';

export interface SqlStatementMeta {
  type: string;
  category: 'DQL' | 'DML' | 'DDL' | 'TCL' | 'DCL' | 'SQL';
  color: string;
  bg: string;
  border: string;
  dialect?: string;
  tableName?: string;
}

/**
 * Detect dialect (PostgreSQL, MySQL, SQLite, ANSI SQL) from query patterns
 */
export function detectSqlDialect(code: string): string {
  const upper = (code || '').toUpperCase();
  if (
    /::(JSONB|TEXT|INT|BOOLEAN|UUID|TIMESTAMPTZ)\b/.test(code) ||
    /\b(SERIAL|BIGSERIAL|TIMESTAMPTZ|ILIKE|RETURNING|ON\s+CONFLICT|GENERATE_SERIES)\b/i.test(upper)
  ) {
    return 'PostgreSQL';
  }
  if (
    /\b(AUTO_INCREMENT|ENGINE\s*=\s*INNODB|TINYINT|DATETIME|SHOW\s+TABLES|DESCRIBE\b)/i.test(upper)
  ) {
    return 'MySQL';
  }
  if (/\b(AUTOINCREMENT|PRAGMA|WITHOUT\s+ROWID)\b/i.test(upper)) {
    return 'SQLite';
  }
  return 'ANSI SQL';
}

/**
 * Extract target table name from standard SQL clauses
 */
export function extractSqlTableName(code: string): string | undefined {
  const clean = (code || '').replace(/^(\s*--[^\n]*\r?\n|\s*\/\*[\s\S]*?\*\/\s*)+/i, '').trim();
  const patterns = [
    /\bFROM\s+([a-zA-Z0-9_."]+)/i,
    /\bINSERT\s+INTO\s+([a-zA-Z0-9_."]+)/i,
    /\bUPDATE\s+([a-zA-Z0-9_."]+)/i,
    /\bDELETE\s+FROM\s+([a-zA-Z0-9_."]+)/i,
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_."]+)/i,
    /\bALTER\s+TABLE\s+([a-zA-Z0-9_."]+)/i,
    /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_."]+)/i,
    /\bTRUNCATE\s+(?:TABLE\s+)?([a-zA-Z0-9_."]+)/i,
  ];

  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      const table = match[1].replace(/["`]/g, '').trim();
      // Skip if matched a keyword like (SELECT or subquery
      if (!table.startsWith('(') && !['SELECT', 'WHERE', 'JOIN'].includes(table.toUpperCase())) {
        return table;
      }
    }
  }
  return undefined;
}

/**
 * Check if the given code snippet is SQL code
 */
export function isSqlCode(code: string, rawLang?: string): boolean {
  if (rawLang) {
    const l = rawLang.trim().toLowerCase();
    const isExplicitSql = ['sql', 'pgsql', 'postgres', 'postgresql', 'mysql', 'sqlite', 'mariadb', 'tsql'].includes(l);
    if (isExplicitSql) {
      return true;
    }
    // If an explicit language is specified that is NOT an SQL dialect, it is never SQL!
    return false;
  }

  const clean = (code || '').trim();
  if (!clean) return false;

  // Never treat JavaScript / TypeScript / React / Python code as SQL
  const isCodeWithJsTsKeywords = /\b(import\s+[\s\S]*?from|export\s+(?:default\s+)?(?:function|class|const|let|var|type|interface|enum)|const\s+\w+\s*[:=]|let\s+\w+\s*[:=]|var\s+\w+\s*[:=]|function\s+\w+\s*\(|class\s+\w+|=>|<\/[a-zA-Z]+>|useState|useEffect|useMemo|useCallback|useRef|console\.log|async\s+function|def\s+\w+\s*\()\b/.test(clean);
  if (isCodeWithJsTsKeywords) {
    return false;
  }

  // Strip leading SQL comments (-- or /* */) to inspect the first command
  const uncommented = clean.replace(/^(\s*--[^\n]*\r?\n|\s*\/\*[\s\S]*?\*\/\s*)+/i, '').trim();

  // Primary SQL statement starters (strictly at the beginning of the command)
  const sqlStarters = /^(SELECT\s+[\s\S]+?\bFROM\b|INSERT\s+INTO\s+[\s\S]+?\b(?:VALUES|SELECT)\b|UPDATE\s+[\s\S]+?\bSET\b|DELETE\s+FROM\s+[a-zA-Z0-9_."`]+|CREATE\s+(?:TABLE|VIEW|INDEX|DATABASE|SCHEMA|TRIGGER|FUNCTION|PROCEDURE)\b|ALTER\s+(?:TABLE|DATABASE|SCHEMA)\b|DROP\s+(?:TABLE|VIEW|INDEX|DATABASE)\b|WITH\s+[a-zA-Z0-9_]+\s+AS\s*\(|TRUNCATE\s+(?:TABLE\b)?\s*[a-zA-Z0-9_."`]+|EXPLAIN\s+(?:ANALYZE\b)?\s*SELECT|BEGIN(?:\s+TRANSACTION)?\s*;?|COMMIT\s*;?|ROLLBACK\s*;?|GRANT\s+[\s\S]+?\bTO\b|REVOKE\s+[\s\S]+?\bFROM\b|UPSERT\b)/i;

  if (sqlStarters.test(uncommented)) {
    return true;
  }

  // Secondary check: Strict SQL syntax clauses
  const hasInsertValues = /\bINSERT\s+INTO\s+[a-zA-Z0-9_."`]+\s*(?:\([^)]*\))?\s*VALUES\b/i.test(clean);
  const hasCreateTable = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-zA-Z0-9_."`]+\s*\(/i.test(clean);
  const hasUpdateSet = /\bUPDATE\s+[a-zA-Z0-9_."`]+\s+SET\s+[a-zA-Z0-9_."`]+\s*=/i.test(clean);
  const hasDeleteFrom = /\bDELETE\s+FROM\s+[a-zA-Z0-9_."`]+\s+WHERE\b/i.test(clean);

  return hasInsertValues || hasCreateTable || hasUpdateSet || hasDeleteFrom;
}

/**
 * Detect SQL Statement type and category (DQL, DML, DDL, TCL, DCL)
 */
export function detectSqlStatementType(code: string): SqlStatementMeta {
  const clean = (code || '').trim().replace(/^(\s*--[^\n]*\r?\n|\s*\/\*[\s\S]*?\*\/\s*)+/i, '').trim();
  const upper = clean.toUpperCase();
  const dialect = detectSqlDialect(code);
  const tableName = extractSqlTableName(code);

  if (/^SELECT\b/.test(upper)) {
    return { type: 'SELECT QUERY', category: 'DQL', color: '#38bdf8', bg: '#082f49', border: '#0284c7', dialect, tableName };
  }
  if (/^WITH\b/.test(upper)) {
    return { type: 'CTE QUERY (WITH)', category: 'DQL', color: '#38bdf8', bg: '#082f49', border: '#0284c7', dialect, tableName };
  }
  if (/^INSERT\s+INTO\b/.test(upper)) {
    return { type: 'INSERT STATEMENT', category: 'DML', color: '#34d399', bg: '#064e3b', border: '#059669', dialect, tableName };
  }
  if (/^UPDATE\b/.test(upper)) {
    return { type: 'UPDATE STATEMENT', category: 'DML', color: '#fbbf24', bg: '#451a03', border: '#d97706', dialect, tableName };
  }
  if (/^DELETE\s+FROM\b/.test(upper)) {
    return { type: 'DELETE STATEMENT', category: 'DML', color: '#f87171', bg: '#450a0a', border: '#dc2626', dialect, tableName };
  }
  if (/^CREATE\s+TABLE\b/.test(upper)) {
    return { type: 'CREATE TABLE', category: 'DDL', color: '#c084fc', bg: '#3b0764', border: '#9333ea', dialect, tableName };
  }
  if (/^ALTER\s+TABLE\b/.test(upper)) {
    return { type: 'ALTER TABLE', category: 'DDL', color: '#c084fc', bg: '#3b0764', border: '#9333ea', dialect, tableName };
  }
  if (/^DROP\s+(TABLE|VIEW|INDEX|DATABASE)\b/.test(upper)) {
    return { type: 'DROP OBJECT', category: 'DDL', color: '#f87171', bg: '#450a0a', border: '#dc2626', dialect, tableName };
  }
  if (/^CREATE\s+(UNIQUE\s+)?INDEX\b/.test(upper)) {
    return { type: 'CREATE INDEX', category: 'DDL', color: '#c084fc', bg: '#3b0764', border: '#9333ea', dialect, tableName };
  }
  if (/^CREATE\s+(OR\s+REPLACE\s+)?VIEW\b/.test(upper)) {
    return { type: 'CREATE VIEW', category: 'DDL', color: '#c084fc', bg: '#3b0764', border: '#9333ea', dialect, tableName };
  }
  if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b/.test(upper)) {
    return { type: 'TRANSACTION', category: 'TCL', color: '#e879f9', bg: '#4a044e', border: '#c026d3', dialect, tableName };
  }
  if (/^(GRANT|REVOKE)\b/.test(upper)) {
    return { type: 'PERMISSIONS', category: 'DCL', color: '#fb923c', bg: '#431407', border: '#ea580c', dialect, tableName };
  }
  if (/^TRUNCATE\b/.test(upper)) {
    return { type: 'TRUNCATE', category: 'DDL', color: '#f87171', bg: '#450a0a', border: '#dc2626', dialect, tableName };
  }
  if (/^EXPLAIN\b/.test(upper)) {
    return { type: 'QUERY PLAN (EXPLAIN)', category: 'DQL', color: '#2dd4bf', bg: '#134e4a', border: '#0d9488', dialect, tableName };
  }

  return { type: 'SQL COMMAND', category: 'SQL', color: '#38bdf8', bg: '#082f49', border: '#0284c7', dialect, tableName };
}

/**
 * Format and beautify SQL query clauses into structured, indented lines.
 */
export function formatSql(sql: string): string {
  if (!sql) return '';
  const trimmed = sql.trim();
  if (!trimmed) return '';

  // Major clauses that should start on a fresh unindented line
  const majorKeywords = [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'LEFT JOIN',
    'RIGHT JOIN',
    'INNER JOIN',
    'FULL JOIN',
    'CROSS JOIN',
    'LEFT OUTER JOIN',
    'RIGHT OUTER JOIN',
    'JOIN',
    'INSERT INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE FROM',
    'UNION ALL',
    'UNION',
    'INTERSECT',
    'EXCEPT',
    'CREATE TABLE',
    'ALTER TABLE',
    'DROP TABLE',
    'RETURNING',
    'WITH',
    'ON CONFLICT',
  ];

  // Regex to match major keywords on word boundaries, preserving strings and comments
  const pattern = new RegExp(
    `('(?:''|[^'])*'|--[^\\n]*|/\\*[\\s\\S]*?\\*/|\\b(?:${majorKeywords
      .map((k) => k.replace(/\s+/g, '\\s+'))
      .join('|')})\\b|\\b(?:AND|OR)\\b)`,
    'gi'
  );

  let formatted = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(trimmed)) !== null) {
    const matchedToken = match[0];
    const upperToken = matchedToken.toUpperCase().replace(/\s+/g, ' ');

    // Add preceding non-keyword text
    const textBefore = trimmed.slice(lastIndex, match.index).trim();
    if (textBefore) {
      formatted += (formatted.endsWith('\n') || formatted === '' ? '' : ' ') + textBefore;
    }

    if (matchedToken.startsWith("'") || matchedToken.startsWith('--') || matchedToken.startsWith('/*')) {
      // Keep string literals or comments intact
      formatted += (formatted.endsWith('\n') || formatted === '' ? '' : ' ') + matchedToken;
    } else if (upperToken === 'AND' || upperToken === 'OR') {
      // Minor boolean clauses: indented
      formatted += '\n  ' + upperToken + ' ';
    } else {
      // Major clause: new line, uppercase keyword
      const isStart = formatted.trim() === '';
      formatted += (isStart ? '' : '\n') + upperToken + ' ';
    }

    lastIndex = pattern.lastIndex;
  }

  const remainder = trimmed.slice(lastIndex).trim();
  if (remainder) {
    formatted += (formatted.endsWith('\n') || formatted === '' ? '' : ' ') + remainder;
  }

  // Clean double blank lines and ensure clean semicolons
  return formatted
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\s*;\s*$/, ';');
}

/**
 * Format bytes for display (e.g. "186 B", "2.4 KB")
 */
function formatCodeSize(str: string): string {
  const bytes = new Blob([str]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Render a production-grade, state-of-the-art SQL command card with database console header,
 * interactive actions (Format SQL, Wrap, Copy), line numbers gutter, and Prism syntax styling.
 */
export function renderSqlBlockHtml(
  code: string,
  options?: {
    title?: string;
    rawLang?: string;
    formattedByDefault?: boolean;
  }
): string {
  const rawCode = code || '';
  const sqlMeta = detectSqlStatementType(rawCode);
  const codeTitle = options?.title || '';

  const { linesHtml, lineCount } = highlightCode(rawCode, 'sql');
  const formattedCode = formatSql(rawCode);
  const { linesHtml: formattedLinesHtml, lineCount: formattedLineCount } = highlightCode(formattedCode, 'sql');
  const sizeStr = formatCodeSize(rawCode);

  return `<div class="code-block-wrapper sql-code-block my-6 rounded-2xl border border-[#1e293b] bg-[#0c1017] shadow-2xl overflow-hidden font-mono text-[13px] leading-relaxed transition-all" data-is-sql="true">
  <!-- Top decorative accent line -->
  <div class="sql-top-accent h-[2.5px] w-full bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#818cf8]"></div>

  <div class="code-block-header px-4 py-2.5 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between text-xs select-none gap-3">
    <div class="flex items-center gap-2.5 min-w-0 flex-wrap">
      <!-- Database Cylinder / Console Icon with live status dot -->
      <div class="sql-cylinder-icon relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#0284c7]/20 border border-[#0284c7]/40 text-[#38bdf8] shrink-0 shadow-2xs" title="SQL Database Query Console">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
          <path d="M3 12A9 3 0 0 0 21 12"></path>
        </svg>
        <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0f172a] shadow-xs" title="SQL Engine Ready"></span>
      </div>

      <!-- Statement Category & Type Pill -->
      <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
        <span class="text-[10px] font-black font-mono px-2 py-0.5 rounded-md sql-category-pill tracking-wider shadow-2xs" style="background:${sqlMeta.bg}; color:${sqlMeta.color}; border: 1px solid ${sqlMeta.border}">${sqlMeta.category}</span>
        <span class="font-bold text-xs text-[#f8fafc] font-mono tracking-tight sql-stmt-badge">${sqlMeta.type}</span>

        ${sqlMeta.tableName ? `
          <span class="sql-table-badge hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#1e293b]/90 border border-[#334155] text-[#93c5fd]" title="Target table">
            <svg class="w-3 h-3 text-[#38bdf8] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
            <span>table:</span> <strong class="text-[#f8fafc]">${escapeHtml(sqlMeta.tableName)}</strong>
          </span>
        ` : ''}

        ${sqlMeta.dialect ? `
          <span class="sql-dialect-pill hidden md:inline-flex text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#172554] text-[#93c5fd] border border-[#1e40af]/60" title="Detected Dialect">
            ${sqlMeta.dialect}
          </span>
        ` : ''}

        ${codeTitle ? `<span class="text-xs font-semibold text-[#cbd5e1] font-mono truncate hidden lg:inline">· ${escapeHtml(codeTitle)}</span>` : ''}
      </div>
    </div>

    <!-- Right-side Action Controls & Metrics -->
    <div class="flex items-center gap-2 shrink-0">
      <span class="text-[11px] font-mono text-[#64748b] hidden sm:inline sql-metrics">
        <span class="sql-line-count">${lineCount}</span> ${lineCount === 1 ? 'line' : 'lines'} · ${sizeStr}
      </span>

      <!-- Wrap Toggle Button -->
      <button type="button" class="btn-code-wrap px-2.5 py-1 rounded-md text-[11px] font-mono font-medium text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b] border border-[#334155] cursor-pointer transition-all active:scale-95 shadow-2xs" title="Toggle line wrapping">
        <span class="wrap-label">Wrap</span>
      </button>
    </div>
  </div>

  <div class="code-block-body relative overflow-x-auto">
    <pre class="code-pre sql-pre m-0 py-3.5 font-mono text-[13.5px] leading-[24px] text-[#f8fafc] bg-[#090d13]"><code class="language-sql code-content" data-raw-sql="${escapeHtml(rawCode)}" data-formatted-sql="${escapeHtml(formattedCode)}" data-raw-html="${escapeHtml(linesHtml)}" data-formatted-html="${escapeHtml(formattedLinesHtml)}" data-raw-lines="${lineCount}" data-formatted-lines="${formattedLineCount}">${linesHtml}</code></pre>
  </div>
</div>`;
}

/**
 * Global CSS styles specifically tailored for SQL command blocks
 */
export const sqlConsoleStyles = `
  /* SQL Command Console Container */
  .sql-code-block {
    position: relative;
    border: 1px solid #1e293b !important;
    background: #090d13 !important;
    border-radius: 14px !important;
    box-shadow: 0 8px 30px -4px rgba(2, 132, 199, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.4) !important;
    margin: 22px 0 !important;
    overflow: hidden !important;
  }
  .sql-code-block:hover {
    border-color: #38bdf8/40 !important;
    box-shadow: 0 12px 36px -4px rgba(2, 132, 199, 0.22), 0 4px 14px -2px rgba(0, 0, 0, 0.5) !important;
  }
  .sql-code-block .code-block-header {
    background: #0f172a !important;
    border-bottom: 1px solid #1e293b !important;
    padding: 10px 16px !important;
  }
  .sql-code-block .sql-cylinder-icon {
    box-shadow: 0 2px 10px rgba(2, 132, 199, 0.3) !important;
  }
  .sql-code-block .sql-pre {
    background: #090d13 !important;
    padding: 14px 0 !important;
    margin: 0 !important;
    font-family: 'JetBrains Mono', 'Fira Code', SFMono-Regular, Consolas, Menlo, Monaco, monospace !important;
    font-size: 13.5px !important;
    line-height: 24px !important;
    font-variant-ligatures: normal !important;
  }
  .sql-code-block .code-line {
    display: flex !important;
    align-items: baseline !important;
    padding: 0 16px !important;
    transition: background-color 0.1s ease !important;
    border-left: 2px solid transparent !important;
  }
  .sql-code-block .code-line:hover {
    background-color: rgba(56, 189, 248, 0.08) !important;
    border-left-color: #38bdf8 !important;
  }
  .sql-code-block .code-line:hover .line-num {
    color: #38bdf8 !important;
    opacity: 1 !important;
  }
  .sql-code-block .line-num {
    display: inline-block !important;
    width: 38px !important;
    text-align: right !important;
    padding-right: 16px !important;
    margin-right: 12px !important;
    border-right: 1px solid #1e293b !important;
    color: #475569 !important;
    font-size: 11.5px !important;
    font-family: monospace !important;
    user-select: none !important;
    opacity: 0.8 !important;
    transition: color 0.1s ease !important;
  }
  .sql-code-block .line-content {
    flex: 1 !important;
    white-space: pre !important;
    color: #f8fafc !important;
  }
  .sql-code-block .code-pre.is-wrapped .line-content {
    white-space: pre-wrap !important;
    word-break: break-word !important;
  }

  /* High-Contrast SQL Syntax Colors */
  .sql-code-block .token.keyword {
    color: #38bdf8 !important;
    font-weight: 700 !important;
    text-shadow: 0 0 10px rgba(56, 189, 248, 0.3) !important;
  }
  .sql-code-block .token.function {
    color: #fbbf24 !important;
    font-weight: 600 !important;
  }
  .sql-code-block .token.string {
    color: #34d399 !important;
  }
  .sql-code-block .token.number {
    color: #fb923c !important;
  }
  .sql-code-block .token.boolean {
    color: #f472b6 !important;
    font-weight: 600 !important;
  }
  .sql-code-block .token.operator {
    color: #cbd5e1 !important;
  }
  .sql-code-block .token.punctuation {
    color: #94a3b8 !important;
  }
  .sql-code-block .token.comment {
    color: #64748b !important;
    font-style: italic !important;
  }
  .sql-code-block .token.class-name,
  .sql-code-block .token.builtin {
    color: #c084fc !important;
    font-weight: 600 !important;
  }
  .sql-code-block .token.variable {
    color: #facc15 !important;
  }

  /* Raw <pre><code> Fallback Enhancement for SQL */
  pre.language-sql,
  pre.sql,
  pre:has(> code.language-sql),
  pre:has(> code.sql) {
    background: #090d13 !important;
    color: #f8fafc !important;
    border: 1px solid #1e293b !important;
    border-radius: 12px !important;
    padding: 16px 20px !important;
    box-shadow: 0 6px 24px -2px rgba(2, 132, 199, 0.15) !important;
    font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
    line-height: 1.6 !important;
    overflow-x: auto !important;
  }
  pre.language-sql code,
  pre.sql code {
    background: transparent !important;
    color: inherit !important;
  }
`;
