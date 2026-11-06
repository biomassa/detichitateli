import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const common = {
  title: z.string(),
  url: z.string().regex(/^\/.*\/$/),
  draft: z.boolean().optional(),
  tags: z.array(z.string()).optional(),   // Moodle tags, see src/data/tags.json and /tegi/
};

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    ...common,
    wp_id: z.number().optional(),
    old_url: z.string().optional(),
    placeholder: z.boolean().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    ...common,
    wp_id: z.number().optional(),
    old_url: z.string().optional(),
    date: z.string().optional(),
    placeholder: z.boolean().optional(),
  }),
});

// Ex-Moodle «Методическое сопровождение»: courses/<course>/index.md,
// courses/<course>/<section>/index.md, …/<section>/<item>/index.md, …/<item>/<chapter>.md
const courses = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/courses' }),
  schema: z.object({
    ...common,
    course: z.string().optional(),
    book: z.string().optional(),
    order: z.number().optional(),
    section_order: z.number().optional(),
    moodle_module_id: z.number().optional(),
    moodle_course_id: z.number().optional(),
  }),
});

export const collections = { pages, posts, courses };
