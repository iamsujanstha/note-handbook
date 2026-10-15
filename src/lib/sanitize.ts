import DOMPurify from 'dompurify';

export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';

  return DOMPurify.sanitize(dirtyHtml, {
    WHOLE_DOCUMENT: true,
    FORCE_BODY: false,
    ALLOW_DATA_ATTR: true,
    ALLOWED_TAGS: [
      'html', 'head', 'body', 'meta', 'title', 'link', 'style', 'script', 'base',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'b', 'i', 'strong', 'em', 'u', 's',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tfoot',
      'tr', 'th', 'td', 'a', 'img', 'hr', 'details', 'summary', 'figure', 'figcaption',
      'mark', 'kbd', 'del', 'ins', 'sub', 'sup', 'div', 'section', 'article', 'aside',
      'nav', 'header', 'footer', 'main', 'svg', 'path', 'g', 'circle', 'line', 'polyline',
      'polygon', 'rect', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'foreignObject',
      'pattern', 'linearGradient', 'radialGradient', 'stop', 'use', 'desc',
      'small', 'center', 'br', 'wbr', 'button', 'cite', 'abbr', 'time',
      'video', 'audio', 'source', 'iframe'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id', 'width', 'height',
      'style', 'align', 'valign', 'colspan', 'rowspan', 'data-language', 'data-raw-mermaid',
      'data-action', 'aria-label', 'aria-hidden', 'data-raw-code', 'data-raw-sql', 'data-formatted-sql',
      'data-raw-html', 'data-formatted-html', 'data-raw-lines', 'data-formatted-lines', 'data-is-formatted',
      'content', 'charset', 'name', 'media', 'viewBox', 'd',
      'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
      'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'marker-end', 'marker-start',
      'marker-mid', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
      'text-anchor', 'dominant-baseline', 'font-family', 'font-size', 'font-weight',
      'lang', 'dir', 'type', 'loading', 'decoding', 'crossorigin', 'referrerpolicy'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|data:image\/):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target', 'rel'],
  });
}
