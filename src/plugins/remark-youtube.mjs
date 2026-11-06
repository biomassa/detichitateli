// `::youtube{id="…"}` → a click-to-load video block (YouTube is contacted only after a click).
// Any other directive syntax that remark-directive picked up by accident (e.g. ":word" in text)
// is turned back into the literal text it came from.
import { visit, SKIP } from 'unist-util-visit';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default function remarkYoutube() {
  return (tree, file) => {
    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.type === 'leafDirective' && node.name === 'youtube') {
        const id = node.attributes?.id;
        if (!/^[\w-]{11}$/.test(id || '')) throw new Error(`bad youtube id in ${file.path}`);
        parent.children[index] = {
          type: 'html',
          value:
            `<div class="video" data-youtube="${esc(id)}">` +
            `<a class="video__facade" href="https://www.youtube.com/watch?v=${esc(id)}">` +
            `<span class="video__play" aria-hidden="true"></span>` +
            `<span class="video__label">Видео на YouTube — нажмите, чтобы смотреть</span></a></div>`,
        };
        return SKIP;
      }
      if (node.type === 'textDirective' || node.type === 'leafDirective' || node.type === 'containerDirective') {
        const colons = { textDirective: ':', leafDirective: '::', containerDirective: ':::' }[node.type];
        const inner = node.children?.length ? node.children : [];
        const label = inner.length ? [{ type: 'text', value: '[' }, ...inner, { type: 'text', value: ']' }] : [];
        const restored = [{ type: 'text', value: colons + node.name }, ...label];
        if (node.type === 'textDirective') {
          parent.children.splice(index, 1, ...restored);
        } else {
          parent.children[index] = { type: 'paragraph', children: restored };
        }
        return [SKIP, index + restored.length];
      }
    });
  };
}
