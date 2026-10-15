export type ChapterCssMode = 'global' | 'none' | 'custom';
export type ThemeMode = 'dark' | 'light';

export interface Chapter {
  id: string;
  topicId: string;
  title: string;
  slug: string;
  draftHtml: string;
  publishedHtml: string;
  status: 'draft' | 'published';
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  lastPublishedAt?: string;
  includeGlobalCss?: boolean;
  cssMode?: ChapterCssMode;
  customCss?: string;
  customCssFileName?: string;
}

export interface CustomCssFileInfo {
  filename: string;
  cssContent: string;
  size: number;
  updatedAt: string;
  isGlobal?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'reader';
}

export type ViewMode = 'reader' | 'editor';

export interface TableOfContentItem {
  id: string;
  text: string;
  level: number;
}

export interface ReadingPosition {
  chapterId: string;
  scrollTop: number;
  progress: number;
  updatedAt: string;
}
