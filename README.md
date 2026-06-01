````markdown
# Marcus Wee — Personal Site

Jekyll site. Single warm beige theme. Hosted on GitHub Pages.

Local preview:

```bash
bundle install   # first time only
bundle exec jekyll serve
# include drafts:
bundle exec jekyll serve --drafts
```

---

## Add a blog post

1. Copy `_drafts/_template.md` to `_posts/YYYY-MM-DD-slug.md`. The date in the filename must match the `date:` field.
2. Fill in the frontmatter:
   - `title:` — post title in quotes
   - `date: YYYY-MM-DD`
   - `tags:` — array, e.g. `[ai, agents]`. Tags shown in the listing should also exist in `_data/tags.yml` (see "Add a tag" below)
   - `category:` — short label, shown as a small-caps tag on the post. Common values: `personal`, `tech`, `philosophy`
   - `description:` — one-line summary used in the listing and meta tags
3. Write the body in markdown below the closing `---`.
4. Commit and push. GitHub Pages rebuilds within a minute.

**Quick scribble (philosophy thought):**
Set `category: personal` and `tags: [philosophy]`. No minimum length — short reflections are welcome.

---

## Add a page

Pages live at the repo root (not in `_posts/`).

1. Create `pagename.md` (e.g. `now.md`, `reading.md`).
2. Frontmatter:
   ```yaml
   ---
   layout: page
   title: "Page Title"
   permalink: /pagename/
   ---
   ```
3. Write body in markdown.
4. To show it in the top nav, add a `<li>` to `_includes/nav.html`:
   ```html
   <li><a href="{{ '/pagename' | relative_url }}" {% if page.url contains '/pagename' %}class="active"{% endif %}>Page Title</a></li>
   ```

---

## Add a project

Projects live in the `_projects/` collection.

1. Create `_projects/slug.md`.
2. Frontmatter:
   ```yaml
   ---
   title: "Project Name"
   description: "One-line summary"
   tags: [tag1, tag2]
   github: "https://github.com/Marcushadow/repo"
   featured: true   # optional — adds a "Featured" label
   ---
   ```
3. Body is long-form markdown — usually a "What I built / What I learned" section.

---

## Add a tag

Edit `_data/tags.yml`:

```yaml
- name: tagname
  description: "What this tag covers"
  color: "#hexcolor"
```

The tag will appear in filter chips on `/blog` and on the `/tags` page once at least one post uses it.

---

## Theme

Single warm beige theme. Tokens live at the top of `assets/css/main.css` under `:root`. To tune the palette, edit those CSS custom properties.

There is no dark mode toggle.

---

## Project layout

```
_data/tags.yml         tag registry
_drafts/_template.md   skeleton for new posts
_includes/             nav, footer, post-row, head
_layouts/              default, page, post, project
_posts/                published blog posts
_projects/             project entries
assets/css/main.css    all site styles
index.html             home page
blog.html              blog listing
projects.html          projects listing
about.md               about page
```
````
