import { Topic, Chapter } from '../types';

export const DEFAULT_SEO = {
  siteName: 'Personal Notes CMS',
  title: 'Personal Notes CMS | Senior & Staff Engineering Handbooks',
  description:
    'Explore comprehensive, self-contained technical references, system design patterns, and engineering handbooks.',
  keywords:
    'personal notes, handbook, system design, software architecture, design patterns, engineering guide, developer guides, technical documentation',
  imagePath: '/og-image.svg',
};

/**
 * Generates an SEO-friendly URL slug from any title or name.
 */
export function toSeoSlug(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns a clean, descriptive hash route for a topic and/or chapter.
 * Format: #/topic/<topic-slug>/<chapter-slug>
 */
export function buildSeoHashUrl(topic?: Topic | null, chapter?: Chapter | null): string {
  if (!topic && !chapter) return '#/';
  const topicSlug = topic ? topic.slug || toSeoSlug(topic.name) || topic.id : 'notes';
  if (!chapter) {
    return `#/topic/${encodeURIComponent(topicSlug)}`;
  }
  const chapterSlug = chapter.slug || toSeoSlug(chapter.title) || chapter.id;
  return `#/topic/${encodeURIComponent(topicSlug)}/${encodeURIComponent(chapterSlug)}`;
}

/**
 * Returns the canonical crawlable URL for a topic and/or chapter.
 */
export function buildCanonicalUrl(origin: string, topic?: Topic | null, chapter?: Chapter | null): string {
  const cleanOrigin = origin.replace(/\/$/, '');
  if (!topic && !chapter) return `${cleanOrigin}/`;
  const topicSlug = topic ? topic.slug || toSeoSlug(topic.name) || topic.id : 'notes';
  if (!chapter) {
    return `${cleanOrigin}/topic/${encodeURIComponent(topicSlug)}`;
  }
  const chapterSlug = chapter.slug || toSeoSlug(chapter.title) || chapter.id;
  return `${cleanOrigin}/topic/${encodeURIComponent(topicSlug)}/${encodeURIComponent(chapterSlug)}`;
}

/**
 * Parses the current browser location (pathname, hash, and search query)
 * and resolves the matching chapter ID or topic ID from the available arrays.
 */
export function resolveChapterFromLocation(
  topics: Topic[],
  chapters: Chapter[],
  loc: { pathname: string; hash: string; search: string } = window.location
): { chapterId: string | null; topicId: string | null } {
  if (!chapters.length) return { chapterId: null, topicId: null };

  const findTopicByRef = (ref: string): Topic | undefined => {
    const decoded = decodeURIComponent(ref).trim().toLowerCase();
    return topics.find(
      (t) =>
        t.id.toLowerCase() === decoded ||
        (t.slug && t.slug.toLowerCase() === decoded) ||
        toSeoSlug(t.name) === decoded
    );
  };

  const findChapterByRef = (ref: string, topicId?: string | null): Chapter | undefined => {
    const decoded = decodeURIComponent(ref).trim().toLowerCase();
    const pool = topicId ? chapters.filter((c) => c.topicId === topicId) : chapters;
    return (
      pool.find(
        (c) =>
          c.id.toLowerCase() === decoded ||
          (c.slug && c.slug.toLowerCase() === decoded) ||
          toSeoSlug(c.title) === decoded
      ) ||
      chapters.find(
        (c) =>
          c.id.toLowerCase() === decoded ||
          (c.slug && c.slug.toLowerCase() === decoded) ||
          toSeoSlug(c.title) === decoded
      )
    );
  };

  // 1. Check query parameters (?chapter=...&topic=...)
  if (loc.search) {
    const params = new URLSearchParams(loc.search);
    const chapterParam = params.get('chapter');
    const topicParam = params.get('topic');
    const matchedTopic = topicParam ? findTopicByRef(topicParam) : undefined;
    if (chapterParam) {
      const matchedChap = findChapterByRef(chapterParam, matchedTopic?.id);
      if (matchedChap) {
        return { chapterId: matchedChap.id, topicId: matchedChap.topicId };
      }
    }
    if (matchedTopic) {
      const firstInTopic = chapters
        .filter((c) => c.topicId === matchedTopic.id)
        .sort((a, b) => a.order - b.order)[0];
      return {
        chapterId: firstInTopic ? firstInTopic.id : null,
        topicId: matchedTopic.id,
      };
    }
  }

  // 2. Check hash route (#/topic/<topicSlug>/<chapterSlug> or #/<topicSlug>/<chapterSlug>)
  const rawHash = loc.hash ? loc.hash.replace(/^#+/, '').replace(/^\/+/, '') : '';
  const rawPath = loc.pathname ? loc.pathname.replace(/^\/+/, '') : '';
  const routeCandidate = rawHash || rawPath;

  if (routeCandidate) {
    const segments = routeCandidate.split('/').filter(Boolean);
    if (segments[0] === 'topic' && segments.length >= 2) {
      const topicRef = segments[1];
      const chapterRef = segments[2];
      const matchedTopic = findTopicByRef(topicRef);
      if (chapterRef) {
        const matchedChap = findChapterByRef(chapterRef, matchedTopic?.id);
        if (matchedChap) {
          return { chapterId: matchedChap.id, topicId: matchedChap.topicId };
        }
      }
      if (matchedTopic) {
        const firstInTopic = chapters
          .filter((c) => c.topicId === matchedTopic.id)
          .sort((a, b) => a.order - b.order)[0];
        return {
          chapterId: firstInTopic ? firstInTopic.id : null,
          topicId: matchedTopic.id,
        };
      }
    } else if (segments[0] === 'chapter' && segments.length >= 2) {
      const matchedChap = findChapterByRef(segments[1]);
      if (matchedChap) {
        return { chapterId: matchedChap.id, topicId: matchedChap.topicId };
      }
    } else if (segments.length === 2) {
      const matchedTopic = findTopicByRef(segments[0]);
      const matchedChap = findChapterByRef(segments[1], matchedTopic?.id);
      if (matchedChap) {
        return { chapterId: matchedChap.id, topicId: matchedChap.topicId };
      }
    }
  }

  return { chapterId: null, topicId: null };
}

/**
 * Extracts a clean 120–160 char plain-text summary from HTML or Markdown note content.
 */
export function extractPlainTextDescription(
  rawContent: string | undefined | null,
  fallback: string = DEFAULT_SEO.description,
  maxLength = 158
): string {
  if (!rawContent || !rawContent.trim()) return fallback;

  let text = rawContent;

  // Remove <style>, <script>, <svg>, and <head> blocks if HTML
  text = text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Remove fenced code blocks in Markdown
  text = text.replace(/```[\s\S]*?```/g, ' ');

  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Strip Markdown headings, bold/italic markers, links, blockquotes
  text = text
    .replace(/^#+\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~>|]/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Collapse whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 25) return fallback;

  if (cleaned.length <= maxLength) return cleaned;
  const sliced = cleaned.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).replace(/[.,;:\s]+$/, '') + '…';
}

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLdScript(data: Record<string, unknown>): void {
  if (typeof document === 'undefined') return;
  let script = document.getElementById('seo-json-ld') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'seo-json-ld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

/**
 * Dynamically updates document title, meta description, keywords, OpenGraph,
 * Twitter Card tags, canonical URL, and JSON-LD structured data (`WebSite` + `TechArticle`).
 */
export function updateDocumentSeo(params: {
  topic?: Topic | null;
  chapter?: Chapter | null;
  topics?: Topic[];
  chapters?: Chapter[];
}): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const { topic, chapter, topics = [] } = params;
  const origin = window.location.origin;

  const pageTitle = chapter
    ? topic
      ? `${chapter.title} – ${topic.name} | Personal Notes CMS`
      : `${chapter.title} | Personal Notes CMS`
    : topic
    ? `${topic.name} Handbooks & Notes | Personal Notes CMS`
    : DEFAULT_SEO.title;

  const rawChapterContent = chapter ? chapter.publishedHtml || chapter.draftHtml || '' : '';
  const pageDescription = chapter
    ? extractPlainTextDescription(
        rawChapterContent,
        topic?.description || DEFAULT_SEO.description
      )
    : topic?.description
    ? extractPlainTextDescription(topic.description, DEFAULT_SEO.description)
    : DEFAULT_SEO.description;

  const dynamicKeywords = [
    DEFAULT_SEO.keywords,
    topic?.name,
    chapter?.title,
    ...topics.slice(0, 6).map((t) => t.name),
  ]
    .filter(Boolean)
    .join(', ');

  const canonicalUrl = buildCanonicalUrl(origin, topic, chapter);
  const ogType = chapter ? 'article' : 'website';

  const ogImageUrl = chapter || topic
    ? `${origin}/og-image.svg?title=${encodeURIComponent(
        chapter?.title || topic?.name || DEFAULT_SEO.siteName
      )}&topic=${encodeURIComponent(topic?.name || 'Engineering Handbook')}`
    : `${origin}${DEFAULT_SEO.imagePath}`;

  // 1. Standard Document Title & Meta
  document.title = pageTitle;
  upsertMetaTag('name', 'description', pageDescription);
  upsertMetaTag('name', 'keywords', dynamicKeywords);
  upsertMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1');

  // 2. Open Graph Social Preview Tags
  upsertMetaTag('property', 'og:site_name', DEFAULT_SEO.siteName);
  upsertMetaTag('property', 'og:title', pageTitle);
  upsertMetaTag('property', 'og:description', pageDescription);
  upsertMetaTag('property', 'og:type', ogType);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:image', ogImageUrl);

  // 3. Twitter / X Card Tags
  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', pageTitle);
  upsertMetaTag('name', 'twitter:description', pageDescription);
  upsertMetaTag('name', 'twitter:image', ogImageUrl);

  // 4. Canonical Link
  upsertCanonicalLink(canonicalUrl);

  // 5. JSON-LD Structured Data (WebSite + TechArticle + BreadcrumbList)
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: `${origin}/`,
      name: DEFAULT_SEO.siteName,
      headline: DEFAULT_SEO.title,
      description: DEFAULT_SEO.description,
      keywords: DEFAULT_SEO.keywords,
      inLanguage: 'en-US',
    },
  ];

  if (topic) {
    const breadcrumbItems: Record<string, unknown>[] = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Handbooks',
        item: `${origin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: topic.name,
        item: buildCanonicalUrl(origin, topic, null),
      },
    ];

    if (chapter) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: chapter.title,
        item: canonicalUrl,
      });
    }

    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    });
  }

  if (chapter) {
    graph.push({
      '@type': 'TechArticle',
      '@id': `${canonicalUrl}#article`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
      },
      headline: chapter.title,
      name: chapter.title,
      description: pageDescription,
      articleSection: topic?.name || 'Engineering Handbook',
      keywords: dynamicKeywords,
      url: canonicalUrl,
      image: ogImageUrl,
      datePublished: chapter.createdAt || chapter.updatedAt || new Date().toISOString(),
      dateModified: chapter.updatedAt || new Date().toISOString(),
      author: {
        '@type': 'Organization',
        name: DEFAULT_SEO.siteName,
      },
      publisher: {
        '@type': 'Organization',
        name: DEFAULT_SEO.siteName,
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/pwa-512x512.png`,
        },
      },
      isPartOf: {
        '@id': `${origin}/#website`,
      },
      proficiencyLevel: 'Expert',
    });
  }

  upsertJsonLdScript({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}
