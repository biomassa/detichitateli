import { defineConfig } from 'astro/config';
import remarkDirective from 'remark-directive';
import remarkYoutube from './src/plugins/remark-youtube.mjs';
import rehypeSite from './src/plugins/rehype-site.mjs';
import typography from './src/integrations/typography.mjs';

// BASE_PATH: "/" with the custom domain, "/<repo>/" on a GitHub Pages project site.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base,
  trailingSlash: 'always',
  integrations: [typography()],
  build: { format: 'directory' },
  markdown: {
    remarkPlugins: [remarkDirective, remarkYoutube],
    rehypePlugins: [[rehypeSite, { base }]],
    smartypants: false,
  },
});
