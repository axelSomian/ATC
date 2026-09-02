import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.use({ gfm: true, breaks: true });

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4',
    'strong', 'em', 'del', 'blockquote',
    'ul', 'ol', 'li',
    'a', 'img',
    'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title'],
    img: ['src', 'alt', 'title'],
  },
  allowedSchemes: ['https', 'mailto'],
  allowedSchemesByTag: { img: ['https'] },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
    }),
  },
};

/** Markdown (rédigé par un admin) → HTML assaini, prêt pour `[innerHTML]`. */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;
  return sanitizeHtml(raw, SANITIZE_OPTS);
}
