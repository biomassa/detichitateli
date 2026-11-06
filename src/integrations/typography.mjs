// Russian typesetting for every built page (runs after `astro build`, before Pagefind).
// The content files stay as written; only the HTML in dist/ changes.
//
//   - non-breaking space after 1–2 letter words (в, к, с, и, на, по, не…)
//   - non-breaking space before a dash; after a dash that opens a dialogue line
//   - particles ли, ль, же, ж, бы, б stay with the word before
//   - initials stay with the surname: Ю. Коваля, Т. С. Троицкая
//   - numbers stay with their word: 4 класс, 2 июля 2025, № 5, с. 51, т. е., и т. д.
//   - "straight quotes" → «ёлочки», „лапки“ inside them
//   - spaced hyphen « - » → «—», number ranges 1-4 → 1–4 (no break after the dash), ... → …
//   - headings listed in src/data/heading-phrases.json break only between their phrases
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

const NBSP = ' ';
const WJ = '⁠'; // word joiner: no line break here
const SKIP = new Set(['script', 'style', 'code', 'pre', 'kbd', 'samp', 'textarea', 'svg', 'math', 'head']);
const BLOCK = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'dt', 'dd', 'figcaption',
  'blockquote', 'summary', 'div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'ul', 'ol', 'dl', 'table', 'tr', 'figure', 'details', 'body', 'br', 'hr', 'img', 'iframe', 'video']);
const L = 'а-яёА-ЯЁ';
const MONTHS = 'января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря';

// One block's text as a char array: every rule replaces single characters, so the result maps
// back onto the text nodes one to one. Rules that add or remove characters run last, per cell.
function setChars(chars, re, fn) {
  const s = chars.join('');
  for (const m of s.matchAll(re)) fn(m, m.index);
}

function typesetBlock(chars) {
  const sp = (i) => { if (chars[i] === ' ') chars[i] = NBSP; };
  // spaced hyphen as a dash
  setChars(chars, /(?<=[\s ]|^)-(?=[  ])/g, (m, i) => { chars[i] = '—'; });
  // number ranges: 1-4 → 1–4 (not dates, codes or file names)
  setChars(chars, /(?<![\d\-–.\/:])\d{1,4}-\d{1,4}(?![\d\-–.\/:])/g, (m, i) => { chars[i + m[0].indexOf('-')] = '–'; });
  // quotes: track nesting across the whole block, existing «» included
  let depth = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '«' || c === '„') depth++;
    else if (c === '»' || c === '“') depth = Math.max(0, depth - 1);
    else if (c === '"') {
      const prev = i ? chars[i - 1] : ' ';
      const opening = /[\s (\[«„—–\-\/]/.test(prev);
      if (opening) { chars[i] = depth ? '„' : '«'; depth++; }
      else { depth = Math.max(0, depth - 1); chars[i] = depth ? '“' : '»'; }
    }
  }
  // non-breaking space before a dash; after a dash that starts the block (dialogue)
  setChars(chars, / (?=[—–](?:[  ]|$))/g, (m, i) => sp(i));
  setChars(chars, /^[\s ]*[—–] /g, (m, i) => sp(i + m[0].length - 1));
  // 1–2 letter words stay with the next word (chains: «и в лесу»)
  setChars(chars, new RegExp(`(?<=^|[\\s\\u00a0(«„“"—–\\-])[${L}]{1,2} (?=[^\\s—–])`, 'g'), (m, i) => sp(i + m[0].length - 1));
  // particles stay with the word before
  setChars(chars, new RegExp(`(?<=[${L}]) (?=(?:ли|ль|же|ж|бы|б)(?![${L}]))`, 'g'), (m, i) => sp(i));
  // initials: «Ю. Коваля», «Т. С. Троицкая», «Троицкая Т. С.»
  setChars(chars, new RegExp(`(?<![${L}])[А-ЯЁ]\\. (?=[А-ЯЁ])`, 'g'), (m, i) => sp(i + 2));
  setChars(chars, new RegExp(`(?<=[${L}]) (?=[А-ЯЁ]\\.[ \\u00a0]?[А-ЯЁ]\\.)`, 'g'), (m, i) => sp(i));
  // numbers with their word, dates, № and §, short abbreviations before a number or lowercase
  setChars(chars, new RegExp(`(?<![\\d.,])\\d+ (?=[${L}№%])`, 'g'), (m, i) => sp(i + m[0].length - 1));
  setChars(chars, new RegExp(`(?<=(?:${MONTHS})) (?=\\d{4})`, 'g'), (m, i) => sp(i));
  setChars(chars, /[№§] (?=\d)/g, (m, i) => sp(i + 1));
  setChars(chars, new RegExp(`(?<![${L}])(?:т|е|д|п|с|г|гг|в|вв|см|ср|им|ст|ч|рис|стр|табл|др)\\. (?=[а-яё\\d])`, 'g'), (m, i) => sp(i + m[0].length - 1));
  // cells that change length: ellipsis, no break after a range dash
  setChars(chars, /\.\.\./g, (m, i) => { chars[i] = '…'; chars[i + 1] = ''; chars[i + 2] = ''; });
  setChars(chars, /(?<=\d)–(?=\d)/g, (m, i) => { chars[i] = '–' + WJ; });
  return chars;
}

function blockTextNodes(node, out, blocks) {
  // collect text nodes per block, in document order
  for (const ch of node.children || []) {
    if (ch.type === 'text') out.push(ch);
    else if (ch.type === 'element') {
      if (SKIP.has(ch.tagName)) continue;
      if (BLOCK.has(ch.tagName)) {
        blocks.push(out.splice(0));
        blockTextNodes(ch, out, blocks);
        blocks.push(out.splice(0));
      } else blockTextNodes(ch, out, blocks);
    }
  }
}

function textOf(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
}

function phraseHeadings(node, phrases) {
  for (const ch of node.children || []) {
    if (ch.type !== 'element' || SKIP.has(ch.tagName)) continue;
    if (/^h[1-6]$/.test(ch.tagName) && ch.children.every((c) => c.type === 'text')) {
      const key = textOf(ch).replace(/\s+/g, ' ').trim();
      const parts = phrases.get(key);
      if (parts) {
        ch.children = parts.flatMap((p, i) => [
          ...(i ? [{ type: 'text', value: ' ' }] : []),
          { type: 'element', tagName: 'span', properties: { className: ['phrase'] }, children: [{ type: 'text', value: p }] },
        ]);
        continue;
      }
    }
    phraseHeadings(ch, phrases);
  }
}

export function typesetTree(tree, phrases) {
  phraseHeadings(tree, phrases);
  const blocks = [];
  const rest = [];
  blockTextNodes(tree, rest, blocks);
  blocks.push(rest);
  for (const nodes of blocks) {
    if (!nodes.length) continue;
    const chars = [...nodes.map((n) => n.value).join('')];
    typesetBlock(chars);
    let k = 0;
    for (const n of nodes) {
      const len = [...n.value].length;
      n.value = chars.slice(k, k + len).join('');
      k += len;
    }
  }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

export default function typography() {
  return {
    name: 'russian-typography',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const phrases = new Map();
        const data = JSON.parse(fs.readFileSync(new URL('../data/heading-phrases.json', import.meta.url), 'utf8'));
        for (const parts of data) phrases.set(parts.join(' '), parts);
        const proc = unified().use(rehypeParse).use(() => (tree) => typesetTree(tree, phrases)).use(rehypeStringify);
        const files = walk(root);
        for (const f of files) fs.writeFileSync(f, String(proc.processSync(fs.readFileSync(f, 'utf8'))));
        logger.info(`typeset ${files.length} pages`);
      },
    },
  };
}
