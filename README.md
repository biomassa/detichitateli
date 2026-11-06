# Дети-читатели

The static site that replaces the WordPress + Moodle site detichitateli.ru. Built with Astro, with search by Pagefind.

## Commands

```bash
npm install
npm run dev       # local preview while editing, http://localhost:4321
npm run build     # fresh build into dist/ plus the search index
npm run preview   # serve dist/
```

On a GitHub Pages project site (`user.github.io/<repo>/`), build with `BASE_PATH=/<repo>/ npm run build`.
With a custom domain, leave `BASE_PATH` unset.

## Where things are

| Path | What |
|---|---|
| `src/content/pages/` | Site pages (from WordPress). The front matter `url` is the page address. |
| `src/content/posts/` | The one old post. |
| `src/content/courses/` | «Методическое сопровождение» (from Moodle): course / section / page / chapter. `order` sets the order; `draft: true` pages are not published. |
| `public/files/` | PDFs, images and videos used by the content. |
| `src/pages/index.astro` | The home page: grade cards, conferences, principles. Edit them here. |
| `src/data/menu.json` | The main menu and the grade sub-menus. |
| `src/data/redirects.csv` | Old address → new address, for redirects from the old domain. |
| `src/plugins/` | Markdown extras: `::youtube{id="…"}` videos, PDF cards, cover rows, notes, base path. |

In the content, write `::youtube{id="VIDEO_ID"}` on its own line for a video. A paragraph that holds only a link to `/files/…`
becomes a download card. Consecutive image-only paragraphs become a row of covers. Use a `> quote` for a note, and start it with `NB` for the yellow style.

## Re-importing from the backups

The content was generated from the backups by `work/scripts/import.py` in the Dropbox project folder, which is private and
not part of this repository. It holds personal data. Re-running it replaces `src/content/` and `public/files/`,
so hand edits made here would be lost. After the first hand edit, treat this repository as the source.
