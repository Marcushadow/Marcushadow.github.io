# Marcus Wee — Personal Site

Jekyll 4 site with a warm editorial theme. Hosted on GitHub Pages.

---

## Run locally

### Prerequisites

- **Ruby** 3.1+ — check with `ruby -v`. Install via [rbenv](https://github.com/rbenv/rbenv) or [RubyInstaller](https://rubyinstaller.org/) (Windows).
- **Bundler** — install once: `gem install bundler`

### First-time setup

```bash
git clone https://github.com/Marcushadow/marcushadow.github.io.git
cd marcushadow.github.io
bundle install
```

### Start the dev server

```bash
bundle exec jekyll serve
```

Open `http://localhost:4000`. The server watches for changes and rebuilds automatically.

**Useful flags:**

| Flag | Effect |
|---|---|
| `--drafts` | Include posts in `_drafts/` |
| `--livereload` | Auto-refresh the browser on save |
| `--incremental` | Faster rebuilds (skip unchanged files) |
| `--port 5000` | Change port if 4000 is occupied |

```bash
# Example — drafts + live reload
bundle exec jekyll serve --drafts --livereload
```

### Troubleshooting

**`bundler: command not found`** — run `gem install bundler` first.

**`Liquid Exception`** — check the frontmatter of the file you last edited; a missing `---` or bad YAML indentation is usually the cause.

**Port already in use** — use `--port 5001` or kill the process on 4000: `lsof -ti:4000 | xargs kill`.

---

## Add a blog post

1. Copy `_drafts/_template.md` to `_posts/YYYY-MM-DD-slug.md`.
   The date in the filename **must** match the `date:` field in frontmatter.

2. Fill in the frontmatter:

   ```yaml
   ---
   title: "Post Title"
   date: 2025-07-09
   category: tech          # personal | tech | philosophy
   tags: [ai, agents]      # must exist in _data/tags.yml
   description: "One-line summary shown in the listing and in meta tags."
   ---
   ```

3. Write the body in Markdown below the closing `---`.

4. **To publish:** move the file from `_drafts/` to `_posts/` and push. GitHub Pages rebuilds within a minute.

   **To keep as draft:** leave it in `_drafts/`. It only appears locally when you run `--drafts`.

**Frontmatter fields:**

| Field | Required | Notes |
|---|---|---|
| `title` | Yes | Shown as the post heading |
| `date` | Yes | `YYYY-MM-DD`, must match filename |
| `category` | No | Short label on the post header |
| `tags` | No | Array — each tag should exist in `_data/tags.yml` |
| `description` | No | Shown in the post listing and SEO meta |

---

## Add a project

1. Create `_projects/slug.md` (e.g. `_projects/my-cli-tool.md`).

2. Frontmatter:

   ```yaml
   ---
   title: "Project Name"
   description: "One-line summary."
   tags: [python, cli]
   github: "https://github.com/Marcushadow/repo"
   featured: true          # optional — shows a "Featured" label on the card
   ---
   ```

3. Write the body in Markdown. A "What I built" and "What I learned" structure works well.

The project appears automatically on `/projects` once pushed.

---

## Add a page

Pages live at the repo root, not in `_posts/`.

1. Create `pagename.md` (e.g. `now.md`, `reading.md`).

2. Frontmatter:

   ```yaml
   ---
   layout: page
   title: "Page Title"
   permalink: /pagename/
   ---
   ```

3. Write the body in Markdown.

4. To show it in the top nav, add a `<li>` to `_includes/nav.html`:

   ```html
   <li>
     <a href="{{ '/pagename' | relative_url }}"
        {% if page.url contains '/pagename' %}class="active"{% endif %}>
       Page Name
     </a>
   </li>
   ```

---

## Add a tag

1. Edit `_data/tags.yml`:

   ```yaml
   - name: tagname
     description: "What this tag covers."
     color: "#hexcolor"
   ```

2. Use the tag in a post's `tags:` array.

The tag appears in the filter bar on `/blog` and on the `/tags` page automatically.

---

## Add a guitar tab

1. Create `guitar-tabs/song-name.md`.

2. Frontmatter:

   ```yaml
   ---
   layout: page
   title: "Song Name"
   permalink: /guitar-tabs/song-name/
   ---
   ```

3. Write tab notation in a fenced code block:

   ````markdown
   ```
   e|--0--2--3--|
   B|--1--3--5--|
   ```
   ````

---

## Tune the theme

All design tokens are CSS custom properties at the top of `assets/css/main.css` under `:root`.

**Common tweaks:**

| Token | Controls |
|---|---|
| `--bg` | Page background |
| `--accent` | Links, hover states, tags |
| `--text` | Body text color |
| `--font-display` | Headings and display text |
| `--font-body` | Body copy |
| `--font-hand` | Handwriting accent (dates, tags, nav labels) |
| `--content-width` | Max width of post/page body |

Fonts load from Google Fonts — update the `<link>` in `_includes/head.html` if you swap them.

---

## Project layout

```
_config.yml              Jekyll config, site metadata, plugins
_data/tags.yml           Tag registry
_drafts/                 Draft posts (not published)
_drafts/_template.md     Skeleton for new posts
_includes/               Partials: head, nav, footer, post-row, comments
_layouts/                Templates: default, page, post, project
_posts/                  Published blog posts (YYYY-MM-DD-slug.md)
_projects/               Project collection entries
assets/css/main.css      All site styles and design tokens
assets/js/               JavaScript
index.html               Home page
blog.html                Blog listing with tag filter
projects.html            Projects grid
about.md                 About page
tags.html                All tags index
guitar-tabs.html         Guitar tabs listing
```
