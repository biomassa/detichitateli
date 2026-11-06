// Site-wide HTML adjustments for converted content:
//  - prefix root-absolute links/sources with the base path (GitHub Pages project sites)
//  - a paragraph holding only a link to /files/… becomes a download card with type and size
//  - consecutive paragraphs holding only images become one row of covers
//  - blockquotes become notes; ones starting with "NB" get the warning style
//  - external links open in a new tab
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { visit } from 'unist-util-visit';

const elementKids = (n) => (n.children || []).filter((c) => c.type === 'element');
const textOf = (n) => (n.type === 'text' ? n.value : (n.children || []).map(textOf).join(''));
const onlyWhitespace = (n) => (n.children || []).every((c) => c.type === 'element' || (c.type === 'text' && !c.value.trim()));

function humanSize(bytes) {
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1).replace('.', ',')} МБ`;
  return `${Math.max(1, Math.round(bytes / 1e3))} КБ`;
}

export default function rehypeSite({ base = '/' } = {}) {
  const prefix = base.replace(/\/$/, '');
  const withBase = (u) => (typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') ? prefix + u : u);

  return (tree) => {
    // download cards (before base rewriting, so paths are still /files/…)
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'p') return;
      const kids = elementKids(node);
      if (kids.length !== 1 || kids[0].tagName !== 'a' || !onlyWhitespace(node)) return;
      const href = kids[0].properties?.href;
      if (typeof href !== 'string' || !href.startsWith('/files/')) return;
      const file = decodeURIComponent(href.split(/[?#]/)[0]);
      const ext = file.split('.').pop().toUpperCase();
      let size = '';
      try { size = humanSize(statSync(join(process.cwd(), 'public', file)).size); } catch { /* missing file is reported by the link check */ }
      node.tagName = 'div';
      node.properties = { className: ['file-card'] };
      node.children = [{
        type: 'element', tagName: 'a', properties: { href, className: ['file-card__link'] },
        children: [
          { type: 'element', tagName: 'span', properties: { className: ['file-card__icon'], ariaHidden: 'true' }, children: [] },
          { type: 'element', tagName: 'span', properties: { className: ['file-card__text'] }, children: [
            { type: 'element', tagName: 'span', properties: { className: ['file-card__title'] }, children: kids[0].children },
            { type: 'element', tagName: 'span', properties: { className: ['file-card__meta'] }, children: [{ type: 'text', value: size ? `${ext} · ${size}` : ext }] },
          ] },
        ],
      }];
    });

    // rows of covers
    visit(tree, (node) => {
      if (!node.children) return;
      const out = [];
      let row = null;
      for (const c of node.children) {
        const isImgP = c.type === 'element' && c.tagName === 'p' && onlyWhitespace(c)
          && elementKids(c).length >= 1 && elementKids(c).every((k) => k.tagName === 'img');
        if (isImgP) {
          if (!row) { row = { type: 'element', tagName: 'div', properties: { className: ['img-row'] }, children: [] }; out.push(row); }
          row.children.push(...elementKids(c));
        } else if (row && c.type === 'text' && !c.value.trim()) {
          // keep whitespace between image paragraphs inside the row
        } else {
          row = null;
          out.push(c);
        }
      }
      node.children = out;
      // balanced grid: 2 or 4 covers -> 2 per row, otherwise 3 per row (see .img-row--cols-*)
      for (const c of out) {
        if (c.type === 'element' && c.tagName === 'div' && c.properties?.className?.[0] === 'img-row') {
          const n = c.children.length;
          c.properties.className = ['img-row', n === 1 ? 'img-row--one' : `img-row--cols-${n === 2 || n === 4 ? 2 : 3}`];
        }
      }
    });

    // raw HTML kept in the Markdown (complex tables): rewrite its root-absolute links too
    if (prefix) {
      visit(tree, 'raw', (node) => {
        node.value = node.value.replace(/\b(href|src)=(["'])\/(?!\/)/g, `$1=$2${prefix}/`);
      });
    }

    visit(tree, 'element', (node) => {
      const p = node.properties || {};
      if (node.tagName === 'blockquote') {
        p.className = ['note', ...(/^\s*NB/i.test(textOf(node)) ? ['note--warn'] : [])];
      }
      if (node.tagName === 'img') {
        p.loading = 'lazy';
        p.decoding = 'async';
        if (p.alt === undefined) p.alt = '';
      }
      if (node.tagName === 'a' && typeof p.href === 'string' && /^https?:/.test(p.href)) {
        p.target = '_blank';
        p.rel = 'noopener';
      }
      for (const k of ['href', 'src']) if (k in p) p[k] = withBase(p[k]);
      node.properties = p;
    });
  };
}
