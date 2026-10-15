import { sqlConsoleStyles } from './sqlHighlighter';

/**
 * Default Master Theme CSS for Personal Notes CMS
 * Featuring Patrick Hand Handwritten Font-Family for Study Notes & Engineering Playbook
 */
export const DEFAULT_NOTEBOOK_THEME_CSS = `/* ==========================================================================
   PERSONAL NOTES CMS — PATRICK HANDWRITTEN MASTER THEME (notes-theme.css)
   ========================================================================== */

@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --color-canvas-bg: #f1f5f9;
  --color-paper-bg: #ffffff;
  --color-paper-line: #e2e8f0;
  --color-text-main: #0f172a;
  --color-text-muted: #334155;
  --color-text-subtle: #64748b;
  --color-primary: #1e40af;
  --color-primary-bg: #dbeafe;
  --color-accent: #2563eb;
  --color-border: #cbd5e1;
  --font-hand: 'Patrick Hand', 'Caveat', cursive, -apple-system, sans-serif;
  --font-sans: 'Patrick Hand', cursive, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  :root {
    --color-canvas-bg: #090d16;
    --color-paper-bg: #0f172a;
    --color-paper-line: #1e293b;
    --color-text-main: #f8fafc;
    --color-text-muted: #cbd5e1;
    --color-text-subtle: #94a3b8;
    --color-primary: #60a5fa;
    --color-primary-bg: #1e3a8a;
    --color-accent: #3b82f6;
    --color-border: #334155;
  }
}

/* Reset & Base Elements */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scroll-behavior: smooth;
  background-color: var(--color-canvas-bg);
}

body {
  margin: 0;
  padding: 24px 16px 80px;
  background-color: var(--color-canvas-bg);
  color: var(--color-text-main);
  font-family: var(--font-hand);
  line-height: 1.65;
  font-size: 18px;
  letter-spacing: 0.015em;
}

/* Float Print Button */
.print-float-btn {
  position: fixed;
  top: 16px;
  right: 20px;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-hand);
  color: #334155;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.print-float-btn:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

/* Notebook Wrapper & Physical Binder Effect */
.notebook-wrapper {
  position: relative;
  max-width: 1040px;
  margin: 0 auto;
  background: var(--color-paper-bg);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 56px 56px 64px 72px;
  box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
  color: var(--color-text-main);
  font-family: var(--font-hand);
}

@media (max-width: 768px) {
  .notebook-wrapper {
    padding: 44px 20px 48px 36px;
    border-radius: 12px;
  }
}

/* Binder Holes along left edge */
.binder-holes {
  position: absolute;
  left: 20px;
  top: 60px;
  bottom: 60px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
  z-index: 5;
}

.binder-holes .hole {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-canvas-bg);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25), 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.12);
}

/* Washi Tape across top */
.washi-tape {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%) rotate(-0.8deg);
  width: 150px;
  height: 28px;
  background: repeating-linear-gradient(
    45deg,
    rgba(251, 191, 36, 0.65),
    rgba(251, 191, 36, 0.65) 10px,
    rgba(245, 158, 11, 0.75) 10px,
    rgba(245, 158, 11, 0.75) 20px
  );
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  border-radius: 2px;
  z-index: 10;
  pointer-events: none;
}

/* Notebook Header */
.notebook-header {
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 2px dashed var(--color-border);
}

.notebook-header .title-tag {
  display: inline-block;
  font-family: var(--font-hand);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 4px 12px;
  border-radius: 6px;
  margin-right: 12px;
  vertical-align: middle;
}

.notebook-header .title-date {
  font-family: var(--font-hand);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-subtle);
  vertical-align: middle;
}

.notebook-header h1 {
  font-family: var(--font-hand);
  font-size: 38px;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 16px 0 10px;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.notebook-header .subtitle {
  font-family: var(--font-hand);
  font-size: 18.5px;
  line-height: 1.6;
  color: var(--color-text-muted);
  margin: 0;
  max-width: 860px;
}

/* Sections & Typography */
.section-block {
  margin-top: 48px;
  padding-top: 8px;
  scroll-margin-top: 32px;
}

.section-block:first-of-type {
  margin-top: 24px;
}

h2 {
  font-family: var(--font-hand);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-paper-line);
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.35;
}

h3 {
  font-family: var(--font-hand);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 24px 0 12px;
}

h4 {
  font-family: var(--font-hand);
  font-size: 18.5px;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 16px 0 8px;
}

p {
  margin: 0 0 16px;
  color: var(--color-text-main);
  line-height: 1.65;
  font-family: var(--font-hand);
  font-size: 18px;
}

ul, ol {
  margin: 0 0 16px;
  padding-left: 24px;
  color: var(--color-text-main);
  font-family: var(--font-hand);
}

li {
  margin-bottom: 6px;
  line-height: 1.6;
  font-size: 18px;
}

.doodle {
  font-size: 24px;
  display: inline-block;
  line-height: 1;
}

/* Sticky Notes (Study Callouts) */
.sticky-note {
  margin: 22px 0;
  padding: 18px 22px;
  border-radius: 10px;
  background: #fef9c3;
  color: #713f12;
  border-left: 6px solid #eab308;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03);
  font-family: var(--font-hand);
}

.sticky-note.rose {
  background: #ffe4e6;
  color: #881337;
  border-left-color: #f43f5e;
}

.sticky-note.blue {
  background: #e0f2fe;
  color: #075985;
  border-left-color: #0284c7;
}

.sticky-note.purple {
  background: #f3e8ff;
  color: #581c87;
  border-left-color: #9333ea;
}

.sticky-note.green {
  background: #dcfce7;
  color: #14532d;
  border-left-color: #16a34a;
}

.sticky-note-title {
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 19px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: inherit;
}

.sticky-note ul {
  margin: 0;
  padding-left: 20px;
  color: inherit;
}

.sticky-note li {
  margin-bottom: 6px;
  line-height: 1.55;
  font-size: 17.5px;
}

/* Grid Tables & Cards */
.grid-table {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin: 22px 0;
}

.card-box {
  background: #ffffff;
  border: 1px solid var(--color-paper-line);
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  font-family: var(--font-hand);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .card-box {
    background: #1e293b;
  }
}

.card-box h4 {
  margin: 0 0 10px;
  font-size: 19px;
  font-weight: 700;
  color: var(--color-text-main);
  font-family: var(--font-hand);
}

.card-box p {
  font-size: 17px;
  color: var(--color-text-muted);
  margin-bottom: 10px;
  font-family: var(--font-hand);
}

.card-box ul {
  margin: 0;
  padding-left: 20px;
  color: var(--color-text-main);
}

.card-box li {
  margin-bottom: 6px;
  font-size: 17px;
}

/* Hand Tables (Clean responsive data tables) */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  margin: 22px 0;
  border: 1px solid var(--color-paper-line);
  border-radius: 10px;
}

.hand-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 17px;
  text-align: left;
  font-family: var(--font-hand);
}

.hand-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  font-size: 17px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  letter-spacing: 0.02em;
  font-family: var(--font-hand);
}

.hand-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-paper-line);
  color: var(--color-text-main);
  vertical-align: middle;
  font-size: 17px;
}

.hand-table tbody tr:last-child td {
  border-bottom: none;
}

.hand-table tbody tr:hover {
  background: rgba(241, 245, 249, 0.6);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .hand-table th {
    background: #1e293b;
    color: #94a3b8;
  }
  .hand-table tbody tr:hover {
    background: rgba(30, 41, 59, 0.5);
  }
}

/* Pills & Badges */
.pill-blue {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 700;
  background: #dbeafe;
  color: #1e40af;
  font-family: var(--font-hand);
}

.pill-green {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 700;
  background: #dcfce7;
  color: #166534;
  font-family: var(--font-hand);
}

.pill-purple {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 700;
  background: #f3e8ff;
  color: #6b21a8;
  font-family: var(--font-hand);
}

.pill-orange {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 700;
  background: #ffedd5;
  color: #9a3412;
  font-family: var(--font-hand);
}

.pill-red {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 700;
  background: #fee2e2;
  color: #991b1b;
  font-family: var(--font-hand);
}

/* Highlights */
.hl-yellow {
  background: #fef08a;
  color: #713f12;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.hl-green {
  background: #dcfce7;
  color: #14532d;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.hl-pink {
  background: #ffe4e6;
  color: #881337;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

/* ==========================================================================
   ENHANCED ACCESSIBLE DIAGRAM WRAPPER & HIGH-CONTRAST MERMAID ENGINE
   ========================================================================== */
.diagram-wrapper {
  position: relative;
  margin: 36px 0;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 16px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  overflow: hidden;
  min-height: 290px;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif;
}

.diagram-wrapper:hover {
  border-color: #94a3b8;
  box-shadow: 0 8px 30px -4px rgba(0, 0, 0, 0.09), 0 4px 10px -2px rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-wrapper {
    background: #0f172a;
    border-color: #334155;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4);
  }
  .diagram-wrapper:hover {
    border-color: #475569;
  }
}

/* Diagram Header & Interactive Toolbar */
.diagram-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #f8fafc;
  border-bottom: 1.5px solid #e2e8f0;
  gap: 12px;
  flex-wrap: wrap;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-header {
    background: #1e293b;
    border-bottom-color: #334155;
  }
}

.diagram-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.diagram-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #dbeafe;
  color: #1e40af;
  font-size: 15px;
  font-weight: 700;
  user-select: none;
}

.diagram-wrapper h4,
.diagram-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif;
  line-height: 1.3;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-wrapper h4,
  .diagram-title {
    color: #f8fafc;
  }
}

.diagram-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  padding: 3px 6px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-toolbar {
    background: #0f172a;
    border-color: #475569;
  }
}

.diagram-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-sans, system-ui);
  color: #334155;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.diagram-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-btn {
    color: #cbd5e1;
  }
  .diagram-btn:hover {
    background: #1e293b;
    color: #f8fafc;
  }
}

/* ==========================================================================
   ENHANCED ARCHITECTURE BLUEPRINT CANVAS & ACTUAL MERMAID VIEW
   ========================================================================== */
.mermaid-container,
.mermaid-view {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 290px;
  height: auto;
  overflow: auto;
  padding: 36px 28px;
  background-color: #fafbfc;
  background-image: 
    radial-gradient(#cbd5e1 1.25px, transparent 1.25px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.5) 0%, transparent 100%);
  background-size: 20px 20px, 100% 100%;
  border-radius: 12px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.02);
  cursor: grab;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Plus Jakarta Sans", sans-serif !important;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.mermaid-container.is-grabbing,
.mermaid-view.is-grabbing {
  cursor: grabbing !important;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .mermaid-container,
  .mermaid-view {
    background-color: #0b0f19;
    background-image: 
      radial-gradient(#334155 1.25px, transparent 1.25px),
      linear-gradient(to bottom, rgba(15, 23, 42, 0.6) 0%, transparent 100%);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  }
}

/* Floating Zoom Indicator & Quick Action HUD */
.mermaid-zoom-badge {
  position: absolute;
  bottom: 12px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 11.5px;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 10;
  user-select: none;
}

.mermaid-zoom-badge:hover {
  background: #ffffff;
  color: #1d4ed8;
  border-color: #93c5fd;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.16);
  transform: translateY(-1px);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .mermaid-zoom-badge {
    background: rgba(30, 41, 59, 0.9);
    border-color: #475569;
    color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
  .mermaid-zoom-badge:hover {
    background: #1e293b;
    color: #93c5fd;
    border-color: #3b82f6;
  }
}

.mermaid-canvas svg {
  max-width: none !important;
  height: auto !important;
  display: block;
  margin: 0 auto;
  overflow: visible !important;
  transition: transform 0.12s cubic-bezier(0.2, 0, 0, 1);
  transform-origin: center center;
  filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.04));
  background: transparent !important;
}

.mermaid-container svg,
.mermaid-view svg,
svg.mermaid-svg {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 0 auto;
  overflow: visible !important;
  transition: transform 0.12s cubic-bezier(0.2, 0, 0, 1);
  transform-origin: center center;
  filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.04));
  background: transparent !important;
}

.mermaid-container svg rect.background,
.mermaid-container svg .background,
.mermaid-view svg rect.background,
.mermaid-view svg .background,
.mermaid-canvas svg rect.background,
.mermaid-canvas svg .background,
svg.mermaid-svg rect.background,
svg.mermaid-svg .background {
  fill: transparent !important;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .mermaid-container svg,
  .mermaid-view svg,
  svg.mermaid-svg {
    filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.35));
  }
}

/* Diagram Footer & Accessibility Badges */
.diagram-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 18px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
  color: #64748b;
  font-family: var(--font-sans, system-ui);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-footer {
    background: #1e293b;
    border-top-color: #334155;
    color: #94a3b8;
  }
}

.diagram-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 11px;
  color: #15803d;
  background: #dcfce7;
  padding: 2px 8px;
  border-radius: 9999px;
}

/* Fullscreen Diagram Mode - Clean solid background, no dots, full height (100vh) */
.diagram-wrapper.is-fullscreen,
.github-mermaid-block.is-fullscreen,
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
  background: #ffffff !important;
  background-color: #ffffff !important;
  background-image: none !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.diagram-wrapper.is-fullscreen .diagram-header,
.github-mermaid-block.is-fullscreen .diagram-header,
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
  border-bottom: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  box-sizing: border-box !important;
  padding: 0 20px !important;
}

.diagram-wrapper.is-fullscreen .mermaid-container,
.diagram-wrapper.is-fullscreen .mermaid-view,
.diagram-wrapper.is-fullscreen .mermaid-viewport,
.diagram-wrapper.is-fullscreen .mermaid-canvas,
.diagram-wrapper.is-fullscreen .mermaid,
.github-mermaid-block.is-fullscreen .mermaid-container,
.github-mermaid-block.is-fullscreen .mermaid-view,
.github-mermaid-block.is-fullscreen .mermaid-viewport,
.github-mermaid-block.is-fullscreen .mermaid-canvas,
.mermaid-container.is-fullscreen,
.mermaid-view.is-fullscreen,
.mermaid-container.is-fullscreen .mermaid-viewport,
.mermaid-container.is-fullscreen .mermaid-canvas {
  background-image: none !important;
  background: #ffffff !important;
  background-color: #ffffff !important;
  border: none !important;
  box-shadow: none !important;
}

.diagram-wrapper.is-fullscreen .mermaid-container,
.diagram-wrapper.is-fullscreen .mermaid-view,
.github-mermaid-block.is-fullscreen .mermaid-container,
.github-mermaid-block.is-fullscreen .mermaid-view {
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

.diagram-wrapper.is-fullscreen .mermaid-viewport,
.github-mermaid-block.is-fullscreen .mermaid-viewport,
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

.diagram-wrapper.is-fullscreen .mermaid-canvas,
.github-mermaid-block.is-fullscreen .mermaid-canvas,
.mermaid-container.is-fullscreen .mermaid-canvas {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: auto !important;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-wrapper.is-fullscreen,
  .github-mermaid-block.is-fullscreen,
  .mermaid-container.is-fullscreen,
  .mermaid-view.is-fullscreen,
  .diagram-wrapper.is-fullscreen .diagram-header,
  .github-mermaid-block.is-fullscreen .diagram-header,
  .mermaid-container.is-fullscreen .diagram-header,
  .diagram-wrapper.is-fullscreen .mermaid-container,
  .diagram-wrapper.is-fullscreen .mermaid-view,
  .diagram-wrapper.is-fullscreen .mermaid-viewport,
  .diagram-wrapper.is-fullscreen .mermaid-canvas,
  .diagram-wrapper.is-fullscreen .mermaid,
  .github-mermaid-block.is-fullscreen .mermaid-container,
  .github-mermaid-block.is-fullscreen .mermaid-view,
  .github-mermaid-block.is-fullscreen .mermaid-viewport,
  .github-mermaid-block.is-fullscreen .mermaid-canvas,
  .mermaid-container.is-fullscreen .mermaid-viewport,
  .mermaid-container.is-fullscreen .mermaid-canvas {
    background-image: none !important;
    background: #0d1117 !important;
    background-color: #0d1117 !important;
    border-color: #30363d !important;
  }
}

/* ==========================================================================
   LIFECYCLE PIPELINE — MODERN INTERACTIVE STEPPER COMPONENT
   ========================================================================== */
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
  box-shadow: 0 8px 26px rgba(37, 99, 235, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .pipe-node {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }
  .pipe-node:hover {
    border-color: #60a5fa;
    box-shadow: 0 8px 26px rgba(96, 165, 250, 0.16);
  }
}

.pipe-badge {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  font-family: var(--font-mono, monospace);
  font-weight: 800;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
  border: 2.5px solid #ffffff;
  user-select: none;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .pipe-badge {
    border-color: #0f172a;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.45);
  }
}

/* Vibrant sequential gradient accents for pipeline stages */
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
  letter-spacing: 0.01em;
  font-family: var(--font-hand, inherit);
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.35;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .pipe-info h5 {
    color: #f8fafc;
  }
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
  font-family: var(--font-hand, inherit);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .pipe-info p {
    color: #cbd5e1;
  }
}

/* Connecting Arrow Connector between Pipe Nodes */
.pipe-arrow {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 44px;
  margin: -1px 0;
  padding-left: 29px; /* Centers with badge (22px padding + 22px half-width = 44px) */
  z-index: 1;
  font-size: 0; /* Hide raw unstyled text */
  user-select: none;
}

.pipe-arrow::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 44px;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    #94a3b8 0px,
    #94a3b8 5px,
    transparent 5px,
    transparent 10px
  );
  z-index: 1;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .pipe-arrow::before {
    background: repeating-linear-gradient(
      to bottom,
      #475569 0px,
      #475569 5px,
      transparent 5px,
      transparent 10px
    );
  }
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

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .pipe-arrow::after {
    background: #0f172a;
    border-color: #475569;
    color: #60a5fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
}

/* ─────────────────────────────────────────────────────────────
   CRITICAL ACCESSIBILITY FIX: MERMAID HIGH CONTRAST & LEGIBILITY
   Guarantees stateDiagram, flowchart, sequence, class diagrams
   NEVER have black-on-black or invisible dark text/nodes!
   ───────────────────────────────────────────────────────────── */

/* 1. State Diagram (stateDiagram-v2 / stateDiagram) */
.diagram-wrapper .statediagram-state rect,
.mermaid-container .statediagram-state rect,
.mermaid-view .statediagram-state rect,
.diagram-wrapper .stateGroup rect,
.diagram-wrapper .state-node rect,
.diagram-wrapper g.stateGroup rect.basic,
.diagram-wrapper g.stateGroup rect {
  fill: #ffffff !important;
  stroke: #2563eb !important;
  stroke-width: 2.2px !important;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.08)) !important;
  rx: 8px !important;
  ry: 8px !important;
}

/* State text and labels inside nodes */
.diagram-wrapper .stateGroup text,
.diagram-wrapper .state-title,
.diagram-wrapper .statediagram-state text,
.diagram-wrapper .statediagram-state .nodeLabel,
.diagram-wrapper .stateGroup .label,
.diagram-wrapper .stateGroup foreignObject,
.diagram-wrapper .stateGroup foreignObject div,
.diagram-wrapper .stateGroup foreignObject span,
.diagram-wrapper .stateGroup foreignObject p {
  fill: #0f172a !important;
  color: #0f172a !important;
  font-weight: 700 !important;
  font-size: 13.5px !important;
  line-height: 1.4 !important;
  font-family: var(--font-sans, system-ui) !important;
  text-shadow: none !important;
  white-space: pre-wrap !important;
}

/* State Start & End Circles */
.diagram-wrapper .statediagram-state circle,
.diagram-wrapper .state-start,
.diagram-wrapper .start-state {
  fill: #0f172a !important;
  stroke: #2563eb !important;
  stroke-width: 3px !important;
}

.diagram-wrapper .state-end {
  fill: #ffffff !important;
  stroke: #0f172a !important;
  stroke-width: 2px !important;
}

.diagram-wrapper .state-end-circle {
  fill: #0f172a !important;
}

/* Edge labels (Transition text between states) - NO MORE BLACK BOXES! */
.diagram-wrapper .edgeLabel,
.diagram-wrapper .edgeLabels,
.diagram-wrapper .edgeLabel .label,
.diagram-wrapper .edgeLabel .edgeLabel,
.diagram-wrapper .label-container {
  color: #0f172a !important;
  fill: #0f172a !important;
  font-weight: 700 !important;
  font-size: 12.5px !important;
  font-family: var(--font-sans, system-ui) !important;
  background-color: transparent !important;
}

/* Edge labels: Clean, modern pill badges with zero black bar artifacts */
.diagram-wrapper .edgeLabel rect,
.diagram-wrapper .edgeLabel .label-container,
.diagram-wrapper g.edgeLabel > rect,
.diagram-wrapper .labelBox {
  display: none !important; /* Hide Mermaid's internal dark rect completely */
}

.diagram-wrapper foreignObject,
.diagram-wrapper .edgeLabel,
.diagram-wrapper .edgeLabels,
.diagram-wrapper .edgeLabel foreignObject {
  overflow: visible !important;
}

.diagram-wrapper .node foreignObject div {
  overflow: visible !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  line-height: 1.35 !important;
  height: 100% !important;
  box-sizing: border-box !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Plus Jakarta Sans", sans-serif !important;
}

.diagram-wrapper .edgeLabel foreignObject div,
.diagram-wrapper .edgeLabel span.edgeLabel,
.diagram-wrapper .edgeLabel .label span {
  background: #ffffff !important;
  color: #1e40af !important;
  border: 1.5px solid #93c5fd !important;
  padding: 3px 10px !important;
  border-radius: 9999px !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06) !important;
  white-space: nowrap !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1.2 !important;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-wrapper .edgeLabel foreignObject div,
  .diagram-wrapper .edgeLabel span.edgeLabel,
  .diagram-wrapper .edgeLabel .label span {
    background: #1e293b !important;
    color: #93c5fd !important;
    border-color: #3b82f6 !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
  }
}

/* Transition Paths & Arrows */
.diagram-wrapper path.transition,
.diagram-wrapper path.edge-thickness-normal,
.diagram-wrapper .flowchart-link,
.mermaid-container .flowchart-link,
.mermaid-view .flowchart-link,
.diagram-wrapper .messageLine0,
.diagram-wrapper .messageLine1 {
  stroke: #475569 !important;
  stroke-width: 2px !important;
}

.diagram-wrapper marker path,
.diagram-wrapper #statediagram-barbEnd path,
.diagram-wrapper #statediagram-barbEnd,
.diagram-wrapper .arrowheadPath {
  fill: #475569 !important;
  stroke: #475569 !important;
}

/* 2. Flowchart High-Contrast Overrides */
.diagram-wrapper .node rect,
.mermaid-container .node rect,
.mermaid-view .node rect,
.diagram-wrapper .node circle,
.diagram-wrapper .node ellipse,
.diagram-wrapper .node polygon,
.diagram-wrapper .node path {
  fill: #ffffff !important;
  stroke: #3b82f6 !important;
  stroke-width: 2px !important;
}

.diagram-wrapper .node .label,
.diagram-wrapper .node foreignObject,
.diagram-wrapper .node foreignObject div,
.diagram-wrapper .node text {
  color: #0f172a !important;
  fill: #0f172a !important;
  font-weight: 600 !important;
  font-size: 13.5px !important;
}

.diagram-wrapper .cluster rect,
.mermaid-container .cluster rect,
.mermaid-view .cluster rect {
  fill: #f8fafc !important;
  stroke: #94a3b8 !important;
  stroke-width: 1.5px !important;
  stroke-dasharray: 4, 4 !important;
}

.diagram-wrapper .cluster text {
  fill: #1e293b !important;
  font-weight: 700 !important;
}

/* 3. Sequence Diagram High-Contrast Overrides */
.diagram-wrapper .actor {
  fill: #ffffff !important;
  stroke: #3b82f6 !important;
  stroke-width: 2px !important;
}

.diagram-wrapper text.actor > tspan {
  fill: #0f172a !important;
  font-weight: 700 !important;
}

.diagram-wrapper .messageText {
  fill: #0f172a !important;
  font-weight: 600 !important;
}

.diagram-wrapper .note {
  fill: #fef9c3 !important;
  stroke: #eab308 !important;
}

.diagram-wrapper .noteText,
.diagram-wrapper .noteText > tspan {
  fill: #713f12 !important;
  font-weight: 600 !important;
}

/* Dark Mode Overrides for Diagrams */
@media (prefers-color-scheme: dark-disabled-for-notes) {
  .diagram-wrapper .statediagram-state rect,
  .diagram-wrapper .stateGroup rect,
  .diagram-wrapper .state-node rect,
  .diagram-wrapper g.stateGroup rect.basic,
  .diagram-wrapper g.stateGroup rect {
    fill: #1e293b !important;
    stroke: #60a5fa !important;
    filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.4)) !important;
  }

  .diagram-wrapper .stateGroup text,
  .diagram-wrapper .state-title,
  .diagram-wrapper .statediagram-state text,
  .diagram-wrapper .statediagram-state .nodeLabel,
  .diagram-wrapper .stateGroup .label,
  .diagram-wrapper .stateGroup foreignObject,
  .diagram-wrapper .stateGroup foreignObject div,
  .diagram-wrapper .stateGroup foreignObject span,
  .diagram-wrapper .stateGroup foreignObject p {
    fill: #f8fafc !important;
    color: #f8fafc !important;
  }

  .diagram-wrapper .edgeLabel,
  .diagram-wrapper .edgeLabels,
  .diagram-wrapper .edgeLabel .label,
  .diagram-wrapper .edgeLabel .edgeLabel,
  .diagram-wrapper .label-container {
    color: #f8fafc !important;
    fill: #f8fafc !important;
  }

  .diagram-wrapper .edgeLabel rect,
  .diagram-wrapper .labelBox,
  .diagram-wrapper g.edgeLabel rect {
    fill: #0f172a !important;
    stroke: #64748b !important;
  }

  .diagram-wrapper .edgeLabel foreignObject,
  .diagram-wrapper .edgeLabel foreignObject div,
  .diagram-wrapper .edgeLabel foreignObject span {
    background: #0f172a !important;
    color: #f8fafc !important;
    border-color: #64748b !important;
  }

  .diagram-wrapper path.transition,
  .diagram-wrapper path.edge-thickness-normal,
  .diagram-wrapper .flowchart-link,
  .diagram-wrapper .messageLine0,
  .diagram-wrapper .messageLine1 {
    stroke: #94a3b8 !important;
  }

  .diagram-wrapper marker path,
  .diagram-wrapper #statediagram-barbEnd path,
  .diagram-wrapper #statediagram-barbEnd,
  .diagram-wrapper .arrowheadPath {
    fill: #94a3b8 !important;
    stroke: #94a3b8 !important;
  }

  .diagram-wrapper .statediagram-state circle,
  .diagram-wrapper .state-start,
  .diagram-wrapper .start-state {
    fill: #60a5fa !important;
    stroke: #f8fafc !important;
  }

  .diagram-wrapper .node rect,
  .diagram-wrapper .node circle,
  .diagram-wrapper .node ellipse,
  .diagram-wrapper .node polygon,
  .diagram-wrapper .node path {
    fill: #1e293b !important;
    stroke: #60a5fa !important;
  }

  .diagram-wrapper .node .label,
  .diagram-wrapper .node foreignObject,
  .diagram-wrapper .node foreignObject div,
  .diagram-wrapper .node text {
    color: #f8fafc !important;
    fill: #f8fafc !important;
  }

  .diagram-wrapper .cluster rect {
    fill: #090d16 !important;
    stroke: #475569 !important;
  }

  .diagram-wrapper .cluster text {
    fill: #e2e8f0 !important;
  }

  .diagram-wrapper .actor {
    fill: #1e293b !important;
    stroke: #60a5fa !important;
  }

  .diagram-wrapper text.actor > tspan {
    fill: #f8fafc !important;
  }

  .diagram-wrapper .messageText {
    fill: #e2e8f0 !important;
  }
}

/* Q&A Interview Boxes */
.qa-box {
  margin: 20px 0;
  border: 1px solid var(--color-paper-line);
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  font-family: var(--font-hand);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .qa-box {
    background: #1e293b;
  }
}

.qa-question {
  background: #f8fafc;
  padding: 14px 18px;
  font-size: 18.5px;
  font-weight: 700;
  color: var(--color-text-main);
  border-bottom: 1px solid var(--color-paper-line);
  font-family: var(--font-hand);
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  .qa-question {
    background: #0f172a;
  }
}

.qa-answer {
  padding: 18px;
  font-size: 17.5px;
  color: var(--color-text-main);
  line-height: 1.65;
  font-family: var(--font-hand);
}

.qa-answer ol, .qa-answer ul {
  margin: 10px 0;
  padding-left: 22px;
}

.qa-answer li {
  margin-bottom: 6px;
  font-size: 17.5px;
}

/* Monospace & Code */
code, .mono {
  font-family: var(--font-mono) !important;
  font-size: 14px;
  background: #f1f5f9;
  color: #0f172a;
  padding: 2px 6px;
  border-radius: 5px;
  border: 1px solid var(--color-paper-line);
}

pre {
  font-family: var(--font-mono) !important;
  background: #0f172a;
  color: #f8fafc;
  padding: 16px 20px;
  border-radius: 10px;
  overflow-x: auto;
  line-height: 1.55;
  font-size: 13.5px;
}

pre code {
  background: transparent;
  color: inherit;
  border: none;
  padding: 0;
}

@media (prefers-color-scheme: dark-disabled-for-notes) {
  code, .mono {
    background: #1e293b;
    color: #e2e8f0;
    border-color: #334155;
  }
}

/* Print Overrides */
@media print {
  .print-float-btn {
    display: none !important;
  }
  body {
    background: #ffffff !important;
    padding: 0 !important;
  }
  .notebook-wrapper {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    max-width: 100% !important;
  }
  .washi-tape, .binder-holes {
    display: none !important;
  }
}

${sqlConsoleStyles}
`;
