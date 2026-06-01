# Minimalist Redesign + Multiagent Post — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the personal Jekyll site from a tri-theme neon-cyber design to a single warm-paper minimalist theme, publish a survey post on multiagent orchestration, and document how to add new content.

**Architecture:** Jekyll static site. Edit `assets/css/main.css` (token rewrite + rule strip), simplify includes/layouts/index pages, replace card-grid with a dated index list partial, then add content (the post) and docs (`README.md`, `_drafts/_template.md`). No build system or pipeline changes.

**Tech Stack:** Jekyll 3.x (GitHub Pages), Liquid templates, plain CSS (no preprocessor), kramdown + rouge for posts.

**Spec:** `docs/superpowers/specs/2026-06-02-minimalist-redesign-and-multiagent-post-design.md`

**Verification:** No automated tests. After every task, run `bundle exec jekyll serve` and visually inspect the affected pages. Final task does a full-site sweep.

---

## Task 1: Baseline build + clean working tree

**Files:** none modified

- [ ] **Step 1: Confirm baseline build succeeds**

Run:
```bash
bundle exec jekyll serve --livereload
```

Expected: server starts on `http://127.0.0.1:4000`, no errors. Visit `/`, `/blog`, `/projects`, `/about`, `/tags`, `/guitar-tabs`. Note current behavior in head (so regressions are obvious later). Stop the server with Ctrl+C.

If `bundle exec` fails with missing gems, run `bundle install` first.

- [ ] **Step 2: Stage any pre-existing untracked content**

Run:
```bash
git status
```

The Stasis draft (`_posts/2026-03-18-Stasis.md`) is currently untracked per the session-start snapshot. Leave it untracked — Task 10 commits it along with its uncommenting.

- [ ] **Step 3: No commit yet**

Baseline only.

---

## Task 2: Rewrite CSS tokens, drop multi-theme, strip animations

**Files:**
- Modify: `assets/css/main.css`

This is the largest single edit. It locks in the new aesthetic foundation; later tasks build on it.

- [ ] **Step 1: Replace the `:root` block**

Find the existing `:root { ... }` block (currently lines ~4–27 in `main.css`) and replace it with:

```css
:root {
  --bg: #FAF7F2;
  --surface: transparent;
  --surface-soft: #F2ECE3;
  --text: #2a2724;
  --text-heading: #1f1c19;
  --text-secondary: #6e6960;
  --text-muted: #a39c92;
  --border: #e3ddd2;
  --accent: #8b4a2b;
  --nav-bg: rgba(250, 247, 242, 0.85);
  --font-body: 'Iowan Old Style', 'Source Serif 4', Georgia, 'Times New Roman', serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --radius: 4px;
  --transition: 0.15s ease;
  --max-width: 760px;
  --content-width: 680px;
}
```

- [ ] **Step 2: Delete the `[data-theme="light"]` block**

Delete the entire `[data-theme="light"] { ... }` rule (currently ~lines 32–48).

- [ ] **Step 3: Delete the `[data-theme="beige"]` block**

Delete the entire `[data-theme="beige"] { ... }` rule (currently ~lines 53–69).

- [ ] **Step 4: Delete decorative animations**

Find and delete:
- `@keyframes glow-pulse { ... }`
- `@keyframes portal-pulse { ... }`
- The `animation: glow-pulse ...` line in `.hero-line`
- The `animation: portal-pulse ...` line in `.explore-icon`

- [ ] **Step 5: Delete the `.hero-line` rule and its gradient/box-shadow**

Delete the entire `.hero-line { ... }` selector block.

- [ ] **Step 6: Drop hover transforms and glow shadows from post-card / project-card**

In `.post-card:hover` and `.project-card:hover` and `.project-card-featured:hover` and `.post-nav-link:hover`, remove every line that references:
- `box-shadow`
- `transform: translateY(...)`
- `--accent-glow`
- `--accent-secondary-glow`
- `--border-accent`

Replace hover border color with `border-color: var(--text-secondary);` instead of `var(--border-accent)`.

(These rules will be deleted entirely in Task 7 for `.post-card*` and Task 9 for `.project-card*`. For now, the goal is to make sure the page renders without referencing deleted tokens.)

- [ ] **Step 7: Strip the explore-link gradient block**

Delete the entire `.explore-link` and `.explore-link:hover` and `.explore-link::after` and `.explore-link:hover::after` and `.explore-icon` rules.

- [ ] **Step 8: Promote warm-muted syntax highlighting to default, delete the others**

Find the three syntax highlighting blocks:
- The default `.highlight .c, ...` block (~lines 1116–1136)
- The `[data-theme="light"] .highlight ...` block (~lines 1141–1183)
- The `[data-theme="beige"] .highlight ...` block (~lines 1187–1228)

Delete the dark-default block. Delete the light-theme block. Take the beige-theme rules and rewrite their selectors by stripping the `[data-theme="beige"]` prefix — so e.g. `[data-theme="beige"] .highlight .c { color: #998a7a; }` becomes `.highlight .c { color: #998a7a; }`.

- [ ] **Step 9: Strip `.tag` accent-glow background**

In the `.tag` rule, replace:
```css
background: var(--accent-glow);
color: var(--accent);
border: 1px solid var(--border-accent);
```
with:
```css
background: var(--surface-soft);
color: var(--text-secondary);
border: 1px solid var(--border);
```

In `.tag:hover` remove `background: var(--accent-glow);` and `border-color: var(--accent);` — replace the rule body with just `color: var(--text);`.

- [ ] **Step 10: Strip `.post-card-category` and `.post-category` pill backgrounds**

In both `.post-card-category` and `.post-category` rules, remove:
```css
background: var(--accent-secondary-glow);
color: var(--accent-secondary);
padding: 0.15rem 0.5rem;
border-radius: 4px;
```
Replace with:
```css
color: var(--text-secondary);
font-size: 0.75rem;
text-transform: uppercase;
letter-spacing: 0.08em;
```

- [ ] **Step 11: Strip `.hero-title .accent` glow**

In `.hero-title .accent`, delete `text-shadow: 0 0 30px var(--accent-glow);`. Leave `color: var(--accent);` for now — Task 4 removes the `.accent` span entirely from the hero.

- [ ] **Step 12: Strip `.filter-tag` pill background**

Replace the `.filter-tag` rule body with:
```css
background: transparent;
color: var(--text-secondary);
border: none;
padding: 0.2rem 0;
font-size: 0.82rem;
font-weight: 500;
cursor: pointer;
transition: color var(--transition);
margin-right: 1rem;
```

Replace the `.filter-tag:hover, .filter-tag.active` rule body with:
```css
color: var(--text);
text-decoration: underline;
text-underline-offset: 4px;
background: transparent;
border: none;
```

- [ ] **Step 13: Update body font + base typography**

In the `body { ... }` rule, line-height is already 1.7 — change to 1.75. Font family already resolves via `--font-body` token. No further change in this step.

- [ ] **Step 14: Update `.section-title` border + color**

In `.section-header`, the `border-bottom: 1px solid var(--border);` stays. Good.

In `.section-link`, color is `var(--accent)`. Keep.

- [ ] **Step 15: Adjust `.nav-links a::after` underline**

Replace the entire `.nav-links a::after { ... }` rule body with:
```css
content: '';
position: absolute;
bottom: -2px;
left: 0;
width: 0;
height: 1px;
background: var(--text);
transition: width var(--transition);
```

(Removes `box-shadow: 0 0 8px var(--accent-glow);` and thins the underline.)

- [ ] **Step 16: Adjust `.theme-toggle:hover`**

Replace its body with:
```css
color: var(--text);
border-color: var(--text-secondary);
background: transparent;
```

(Removes `--accent-glow` reference. The whole rule gets deleted in Task 3 when the button comes out, but this avoids a dangling token reference if the rule lingers for a step.)

- [ ] **Step 17: Build + verify**

Run `bundle exec jekyll serve` and visit `/`. Expected: site renders in warm beige tones with serif body, no neon, no glow, no animated hero line. Theme toggle button still present (Task 3 removes it). Some cards still have backgrounds (Tasks 6–7 strip those).

If the browser console shows broken CSS or the build prints a Sass/CSS error, fix it now before committing.

- [ ] **Step 18: Grep for orphaned token references**

Run:
```bash
grep -n "accent-glow\|accent-secondary\|border-accent\|surface-hover\|radius-lg\|nav-bg-mobile" assets/css/main.css
```

Expected: no matches. If anything remains, delete or remap those rules.

- [ ] **Step 19: Commit**

```bash
git add assets/css/main.css
git commit -m "style: collapse three themes into single warm beige theme

Replace :root tokens with a calm paper palette. Delete dark/light/beige
theme blocks, decorative glow + portal-pulse animations, gradient hero
line, and every reference to deleted accent-glow / accent-secondary
tokens. Promote the warm-muted syntax highlighting palette to default.
Restyle .tag, .filter-tag, .post-category, and .nav-links underline so
nothing references removed tokens."
```

---

## Task 3: Remove theme toggle UI + JS

**Files:**
- Modify: `_includes/nav.html`
- Modify: `_includes/head.html` (if theme-init JS lives there)
- Modify: `_layouts/default.html` (if theme-init JS lives there)
- Modify: `assets/css/main.css`

- [ ] **Step 1: Locate theme-init JS**

Run:
```bash
grep -rn "data-theme\|theme-toggle\|localStorage" _includes/ _layouts/ assets/
```

Note which files reference theme switching. Likely candidates: `_includes/head.html`, `_layouts/default.html`. There may also be inline JS in `_includes/nav.html` near the toggle button.

- [ ] **Step 2: Delete the theme-toggle button + SVGs from `_includes/nav.html`**

Remove this entire block (currently lines 18–25):

```html
<button class="theme-toggle" id="theme-toggle" aria-label="Switch theme">
  <!-- Moon icon (shown in dark mode → click goes to light) -->
  <svg class="theme-icon theme-icon-moon" ...></svg>
  <!-- Sun icon (shown in light mode → click goes to beige) -->
  <svg class="theme-icon theme-icon-sun" ...></svg>
  <!-- Coffee icon (shown in beige mode → click goes to dark) -->
  <svg class="theme-icon theme-icon-coffee" ...></svg>
</button>
```

- [ ] **Step 3: Remove `.accent` span on logo in `_includes/nav.html`**

Change:
```html
<span class="logo-text">Marcus <span class="accent">Wee</span></span>
```
to:
```html
<span class="logo-text">Marcus Wee</span>
```

- [ ] **Step 4: Delete theme-init JS**

In whichever file(s) Step 1 surfaced, delete the script block(s) that set `data-theme` on `<html>` from `localStorage`, attach click handlers to `#theme-toggle`, or rotate through `dark` / `light` / `beige` values. Keep only non-theme JS (e.g., mobile nav toggle handler — that has a separate id/class).

- [ ] **Step 5: Delete `.theme-toggle` and `.theme-icon*` CSS rules**

In `assets/css/main.css`, delete:
- The entire `.theme-toggle { ... }` rule
- The entire `.theme-toggle:hover { ... }` rule
- The entire `.theme-icon { ... }` rule and every `.theme-icon-moon`, `.theme-icon-sun`, `.theme-icon-coffee` rule
- Every `[data-theme="..."] .theme-icon-...` display toggle rule

- [ ] **Step 6: Delete `.nav-logo .accent` CSS rule**

Find and delete the `.nav-logo .accent { color: var(--accent); }` rule.

- [ ] **Step 7: Verify**

Run `bundle exec jekyll serve`, visit `/`. Expected: nav shows logo "Marcus Wee" + links + no theme button. No JS errors in console.

- [ ] **Step 8: Commit**

```bash
git add _includes/nav.html assets/css/main.css
# also add head.html / default.html if Step 4 modified them
git commit -m "feat(nav): remove theme toggle button and init script

Single theme means no toggle. Drop the three SVG icons, the
localStorage-backed theme-init JS, and the accent span on the
nav logo."
```

---

## Task 4: Quieten hero on `index.html`

**Files:**
- Modify: `index.html`
- Modify: `assets/css/main.css`

- [ ] **Step 1: Strip `.accent` span around "Marcus"**

In `index.html`, change:
```html
<h1 class="hero-title">Hey, I'm <span class="accent">Marcus</span>.</h1>
```
to:
```html
<h1 class="hero-title">Hey, I'm Marcus.</h1>
```

- [ ] **Step 2: Delete `.hero-line` div**

Remove:
```html
<div class="hero-line"></div>
```

- [ ] **Step 3: Soften tagline**

Replace:
```html
<p class="hero-tagline">I build things, break things, and write about it. Welcome to my corner of the internet — a space for tech, code, and the occasional stray thought.</p>
```
with:
```html
<p class="hero-tagline">A small home for code, projects, and stray thoughts.</p>
```

- [ ] **Step 4: Flatten quick-links to plain inline text**

Replace the entire `<div class="quick-links">...</div>` block with:

```html
<p class="quick-links">
  <a href="{{ '/projects' | relative_url }}">Projects &rarr;</a>
  <span class="quick-links-sep">·</span>
  <a href="{{ '/about' | relative_url }}">About &rarr;</a>
  <span class="quick-links-sep">·</span>
  <span class="quick-links-disabled">Explore (WIP)</span>
</p>
```

- [ ] **Step 5: Update `.hero-*` CSS**

In `main.css`:

Replace the `.hero` rule with:
```css
.hero {
  padding: 4rem 0 3rem;
  text-align: left;
}
```

Replace `.hero-title`:
```css
.hero-title {
  font-size: 2.4rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
  color: var(--text-heading);
  margin-bottom: 1rem;
}
```

Delete `.hero-title .accent` rule entirely.

Replace `.hero-tagline`:
```css
.hero-tagline {
  font-size: 1.1rem;
  color: var(--text-secondary);
  max-width: 550px;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  font-style: italic;
}
```

- [ ] **Step 6: Restyle `.quick-links`**

Replace the `.quick-links { ... }` and `.quick-link { ... }` and `.quick-link:hover { ... }` rules with:

```css
.quick-links {
  margin-top: 2rem;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.quick-links a {
  color: var(--text);
  text-decoration: none;
  transition: color var(--transition);
}

.quick-links a:hover {
  color: var(--accent);
}

.quick-links-sep {
  margin: 0 0.75rem;
  color: var(--text-muted);
}

.quick-links-disabled {
  color: var(--text-muted);
  cursor: default;
}
```

- [ ] **Step 7: Update mobile responsive for quick-links**

In the `@media (max-width: 768px)` block, find `.quick-links { flex-direction: column; }` and delete it (no longer flex). Optionally add:
```css
.quick-links { font-size: 0.9rem; }
```

- [ ] **Step 8: Verify**

Run `bundle exec jekyll serve`. Visit `/`. Expected: name renders plain, no glowing line under tagline, quick-links as inline text with dot separators. Mobile view stacks readably.

- [ ] **Step 9: Commit**

```bash
git add index.html assets/css/main.css
git commit -m "feat(home): quiet hero — strip neon accents and pill buttons

Name renders in default text color, decorative hero line removed,
quick-links flatten to inline anchors separated by dots. Tagline
shortened and italicised. Explore link stays muted as WIP."
```

---

## Task 5: Create dated-index post-row partial + styles

**Files:**
- Create: `_includes/post-row.html`
- Modify: `assets/css/main.css`

- [ ] **Step 1: Create the partial**

Write `_includes/post-row.html`:

```html
<a href="{{ include.post.url | relative_url }}" class="post-row">
  <time class="post-row-date" datetime="{{ include.post.date | date_to_xmlschema }}">{{ include.post.date | date: "%b %d, %Y" }}</time>
  <span class="post-row-title">{{ include.post.title }}</span>
  {% if include.post.tags.size > 0 %}
  <span class="post-row-tags">{{ include.post.tags | join: ", " }}</span>
  {% endif %}
</a>
```

Note: Liquid `include` parameters are accessed via `include.post`, mirroring how the old `post-card.html` was called as `{% include post-card.html post=post %}`.

- [ ] **Step 2: Add `.post-row*` CSS**

Append to `main.css` (in the post-listing area, replacing the existing `.post-grid` rule eventually — for now, add alongside):

```css
.post-list {
  display: flex;
  flex-direction: column;
}

.post-row {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  gap: 1.25rem;
  align-items: baseline;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
  transition: color var(--transition);
}

.post-row:hover {
  color: var(--accent);
}

.post-row:hover .post-row-title {
  color: var(--accent);
}

.post-row-date {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--text-muted);
}

.post-row-title {
  font-size: 1.05rem;
  color: var(--text);
  transition: color var(--transition);
}

.post-row-tags {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: lowercase;
  letter-spacing: 0.05em;
  text-align: right;
}

@media (max-width: 560px) {
  .post-row {
    grid-template-columns: 1fr;
    gap: 0.15rem;
  }
  .post-row-tags {
    text-align: left;
  }
}
```

- [ ] **Step 3: No render yet**

The partial isn't called by any page yet — Task 6 wires it up. No visual change to verify.

- [ ] **Step 4: Commit**

```bash
git add _includes/post-row.html assets/css/main.css
git commit -m "feat(posts): add dated-index post-row partial and styles"
```

---

## Task 6: Wire post-row into blog.html and index.html, restyle filter tags

**Files:**
- Modify: `blog.html`
- Modify: `index.html`

- [ ] **Step 1: Swap recent-posts grid in `index.html`**

In `index.html`, replace:
```html
<div class="post-grid">
  {% for post in site.posts limit:4 %}
    {% include post-card.html post=post %}
  {% endfor %}
</div>
```
with:
```html
<div class="post-list">
  {% for post in site.posts limit:4 %}
    {% include post-row.html post=post %}
  {% endfor %}
</div>
```

- [ ] **Step 2: Swap blog listing in `blog.html`**

In `blog.html`, replace:
```html
<div class="post-grid" id="post-grid">
  {% for post in site.posts %}
    <div class="post-grid-item" data-tags="{{ post.tags | join: ' ' | slugify }}">
      {% include post-card.html post=post %}
    </div>
  {% endfor %}
</div>
```
with:
```html
<div class="post-list" id="post-list">
  {% for post in site.posts %}
    <div class="post-list-item" data-tags="{{ post.tags | join: ' ' | slugify }}">
      {% include post-row.html post=post %}
    </div>
  {% endfor %}
</div>
```

- [ ] **Step 3: Update the inline filter JS in `blog.html`**

In the `<script>` block at the bottom of `blog.html`, change:
```js
const posts = document.querySelectorAll('.post-grid-item');
```
to:
```js
const posts = document.querySelectorAll('.post-list-item');
```

- [ ] **Step 4: Verify**

Run `bundle exec jekyll serve`. Visit `/blog`. Expected: posts render as dated rows, filter tags still work (click a tag, only matching rows visible). Visit `/`. Expected: recent posts render the same way.

- [ ] **Step 5: Commit**

```bash
git add index.html blog.html
git commit -m "feat(posts): switch blog and home recent-posts to dated index list"
```

---

## Task 7: Delete post-card partial + post-card CSS

**Files:**
- Delete: `_includes/post-card.html`
- Modify: `assets/css/main.css`

- [ ] **Step 1: Confirm no remaining references**

Run:
```bash
grep -rn "post-card.html\|post-card-link\|post-card-content\|post-card-meta\|post-card-category\|post-card-title\|post-card-description\|post-card-tags\|post-grid" .
```

Expected matches: none in `_includes/`, `_layouts/`, or top-level pages — only in the partial file being deleted and in `main.css` rules being deleted.

If any page still references `post-card`, fix it (likely a stray usage missed in Task 6).

- [ ] **Step 2: Delete the partial**

```bash
git rm _includes/post-card.html
```

- [ ] **Step 3: Delete `.post-card*` and `.post-grid*` CSS rules**

In `main.css`, delete the following rule blocks entirely:
- `.post-grid { ... }`
- `.post-card { ... }`
- `.post-card:hover { ... }`
- `.post-card-link { ... }`
- `.post-card-link:hover { ... }`
- `.post-card-content { ... }`
- `.post-card-meta { ... }`
- `.post-card-category { ... }`
- `.post-card-title { ... }`
- `.post-card-description { ... }`
- `.post-card-tags { ... }`

Also remove the `.post-grid { grid-template-columns: 1fr; }` line from the `@media (max-width: 768px)` block.

- [ ] **Step 4: Verify**

Run `bundle exec jekyll serve`. Visit `/` and `/blog`. Expected: still render correctly via `.post-list` / `.post-row`. No console errors.

- [ ] **Step 5: Commit**

```bash
git add _includes/post-card.html assets/css/main.css
# (the rm is already staged by git rm)
git commit -m "refactor(posts): remove post-card partial and styles

Dated index rows replace the card grid for the post listing."
```

---

## Task 8: Tighten single-post layout and typography

**Files:**
- Modify: `_layouts/post.html`
- Modify: `assets/css/main.css`

- [ ] **Step 1: Inspect current post layout**

Run:
```bash
cat _layouts/post.html
```

Note the structure (header, meta, body, footer/nav).

- [ ] **Step 2: Narrow `.post` column**

In `main.css`, the `.post` rule already uses `max-width: var(--content-width);` and `--content-width` was set to 680px in Task 2. No change needed here. Confirm.

- [ ] **Step 3: Drop blockquote background fill**

In `main.css`, replace the body of `.post-body blockquote, .page-body blockquote, .project-body blockquote` with:
```css
border-left: 3px solid var(--text-muted);
padding: 0.5rem 1.25rem;
margin: 1.5rem 0;
background: transparent;
color: var(--text-secondary);
font-style: italic;
```

- [ ] **Step 4: Soften inline `code`**

Replace `.post-body code, .page-body code, .project-body code` body with:
```css
font-family: var(--font-mono);
font-size: 0.88em;
background: var(--surface-soft);
padding: 0.15em 0.4em;
border-radius: 4px;
border: 1px solid var(--border);
color: var(--accent);
```

- [ ] **Step 5: Soften `pre` block**

Replace `.post-body pre, .page-body pre, .project-body pre` body with:
```css
background: var(--surface-soft);
border: 1px solid var(--border);
border-radius: var(--radius);
padding: 1.25rem 1.5rem;
overflow-x: auto;
margin: 1.5rem 0;
line-height: 1.6;
```

- [ ] **Step 6: Soften `.highlight` (rouge wrapper)**

Replace `.highlight { ... }` body with:
```css
background: var(--surface-soft);
border: 1px solid var(--border);
border-radius: var(--radius);
padding: 1.25rem 1.5rem;
overflow-x: auto;
margin: 1.5rem 0;
```

- [ ] **Step 7: Soften `.post-nav-link`**

Replace `.post-nav-link { ... }` body with:
```css
display: block;
padding: 0.75rem 0;
background: transparent;
border: none;
color: var(--text);
text-decoration: none;
transition: color var(--transition);
```

Replace `.post-nav-link:hover` body with:
```css
color: var(--accent);
```

In `.post-nav-label`, keep as-is.

In `.post-nav-title`, change `color: var(--text-heading);` to `color: var(--text);` and add `border-bottom: 1px solid var(--border); padding-bottom: 0.15rem;`.

- [ ] **Step 8: Drop `.post-card-category` styling — already gone**

The category on a single post is `.post-category` (different selector). Confirm Task 2 already neutralized it. Visit `/blog/2026/02/08/welcome/` to verify category renders as small-caps secondary text, not a pill.

- [ ] **Step 9: Verify**

Run `bundle exec jekyll serve`. Visit `/blog/2026/02/08/welcome/`. Expected: serif body type, narrow column, plain category text, lighter blockquote, no card-style prev/next.

- [ ] **Step 10: Commit**

```bash
git add _layouts/post.html assets/css/main.css
git commit -m "style(post): soften single-post typography and prev/next

Narrow column, lighter inline code and blockquote, plain-text
prev/next navigation."
```

---

## Task 9: Lighten projects and tags pages

**Files:**
- Modify: `assets/css/main.css`
- Modify: `projects.html` (only if structural change needed — likely not)

- [ ] **Step 1: Strip `.project-card` shadows and transforms**

In `main.css`, replace `.project-card { ... }` body with:
```css
background: transparent;
border: 1px solid var(--border);
border-radius: var(--radius);
padding: 1.5rem;
transition: border-color var(--transition);
display: flex;
flex-direction: column;
```

Replace `.project-card:hover { ... }` body with:
```css
border-color: var(--text-secondary);
```

- [ ] **Step 2: Strip `.project-card-featured` purple tint**

Replace `.project-card-featured { ... }` body with:
```css
border-color: var(--text-muted);
position: relative;
```

Replace `.project-card-featured:hover { ... }` body with:
```css
border-color: var(--text-secondary);
```

- [ ] **Step 3: Add a "Featured" badge for featured cards**

In `_layouts/project.html` or `projects.html` (wherever the card is rendered), find the featured-card markup. Likely in `projects.html`. Add inside the featured-card block, near the title:
```html
{% if project.featured %}
<span class="project-card-featured-label">Featured</span>
{% endif %}
```

Then add CSS:
```css
.project-card-featured-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  display: block;
}
```

- [ ] **Step 4: Tags page color tone**

In `main.css`, change `.tag-section-name { color: var(--accent); }` to `color: var(--text-heading);`.

- [ ] **Step 5: Verify**

Run `bundle exec jekyll serve`. Visit `/projects`. Expected: cards have hairline borders, no shadow on hover, featured cards show small "Featured" label instead of purple border. Visit `/tags`. Expected: section names render in heading color.

- [ ] **Step 6: Commit**

```bash
git add assets/css/main.css projects.html
# also _layouts/project.html if it was edited
git commit -m "style(projects,tags): drop shadows, transforms, and accent fills

Project cards use hairline borders only. Featured projects display
a small 'Featured' label instead of a coloured border. Tags page
section names use heading color, not accent."
```

---

## Task 10: Expand `_data/tags.yml` and uncomment Stasis post

**Files:**
- Modify: `_data/tags.yml`
- Modify: `_posts/2026-03-18-Stasis.md`

- [ ] **Step 1: Add new tags to `_data/tags.yml`**

Append:
```yaml
- name: philosophy
  description: "Personal reflections and stray thoughts"
  color: "#6e6960"

- name: ai
  description: "Artificial intelligence and agents"
  color: "#7c3aed"

- name: agents
  description: "LLM agents and orchestration"
  color: "#8b4a2b"

- name: tech
  description: "General tech and software essays"
  color: "#6e6960"
```

(There's already an `ai` entry from the seed file. If a duplicate would result, skip the new `ai` line. Run `cat _data/tags.yml` first to confirm.)

- [ ] **Step 2: Uncomment Stasis post + add philosophy tag**

Open `_posts/2026-03-18-Stasis.md`. It currently wraps the whole post body in `<!-- ... -->`. Remove the opening `<!--` (line 1) and the closing `-->` (last line).

Update frontmatter `tags: [meta]` → `tags: [philosophy]`. Keep `category: personal`.

- [ ] **Step 3: Verify**

Run `bundle exec jekyll serve`. Visit `/`. Expected: Stasis appears in recent posts dated Mar 18 2026 with `philosophy` tag.

- [ ] **Step 4: Commit**

```bash
git add _data/tags.yml _posts/2026-03-18-Stasis.md
git commit -m "content: publish Stasis post with philosophy tag

Uncomment the previously-drafted Stasis post and retag from meta to
philosophy. Add philosophy, agents, and tech entries to the tag
registry."
```

---

## Task 11: Create `_drafts/_template.md` and `README.md`

**Files:**
- Create: `_drafts/_template.md`
- Create: `README.md`

- [ ] **Step 1: Create draft template**

Write `_drafts/_template.md`:

```markdown
---
layout: post
title: ""
date: YYYY-MM-DD
tags: []
category: personal
description: ""
---

Write here.
```

- [ ] **Step 2: Confirm `_drafts` excluded by build**

Jekyll excludes `_drafts/` by default. Visit `http://127.0.0.1:4000/blog/` — the template should not appear in the listing.

If the user wants to preview drafts locally, document `bundle exec jekyll serve --drafts` in the README.

- [ ] **Step 3: Create README**

Write `README.md`:

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

- [ ] **Step 4: Verify README excluded from build**

`_config.yml` already lists `README.md` under `exclude:`. Run `bundle exec jekyll serve`, visit `/README/` and `/readme/` — both should 404. README still visible on GitHub.

- [ ] **Step 5: Commit**

```bash
git add _drafts/_template.md README.md
git commit -m "docs: add post template and README for content workflow"
```

---

## Task 12: Research the multiagent orchestration landscape

**Files:** none modified

This task gathers fresh information before drafting. Knowledge cutoff is January 2026; today is 2026-06-02 (~5 months out of date).

- [ ] **Step 1: Search current state of each framework**

Use WebSearch on each:
- `LangGraph 2026 multi-agent orchestration`
- `CrewAI 2026 multi-agent`
- `AutoGen v0.4 2026`
- `OpenAI Agents SDK 2026`
- `Claude Agent SDK 2026`
- `Anthropic multi-agent research system 2026`

Note the canonical URL for each (docs landing page or seminal blog post).

- [ ] **Step 2: Deep-read 2-3 authoritative sources**

WebFetch:
- Anthropic's multi-agent research system post (engineering blog)
- LangGraph multi-agent docs
- One additional recent (2026) survey/comparison if available

For each, capture in scratch notes:
- One sentence on what it is
- Coordination primitive (graph nodes, roles, handoffs, supervisor tree, etc.)
- Maturity / production usage signal

- [ ] **Step 3: Cross-check spec thesis**

Reread Section 3 of the spec. For each "gold standard" claim (orchestrator-worker with parallel subagents, structured outputs at handoffs, verification step, artifact memory, token budgets, deterministic harness), confirm it's still defensible against current sources. If any claim has been superseded, note the update needed.

- [ ] **Step 4: No commit**

Research only.

---

## Task 13: Write the multiagent orchestration post

**Files:**
- Create: `_posts/2026-06-02-multiagent-orchestration-gold-standard.md`

- [ ] **Step 1: Scaffold the file**

Create `_posts/2026-06-02-multiagent-orchestration-gold-standard.md` with frontmatter:

```markdown
---
layout: post
title: "Multiagent Orchestration: Where the Gold Standard Sits in 2026"
date: 2026-06-02
tags: [ai, agents]
category: tech
description: "A survey of how teams actually wire multiple agents together right now, and what 'good' looks like."
---
```

- [ ] **Step 2: Draft body following the spec outline**

Eight sections matching the spec, target 1400 words total. Use H2 (`##`) for each section heading. Aim for plain prose — no bullet lists in the framing sections (1, 2, 7, 8). Use bullet lists only where the content is a genuine enumeration (patterns, frameworks, failure modes).

Inline link these (and only these):
- Anthropic's multi-agent research system engineering post
- LangGraph docs landing page
- AutoGen current docs / release page
- OpenAI Agents SDK page
- Claude Agent SDK overview

Add no other links. Adjust thesis if Task 12 surfaced anything that contradicts the spec.

- [ ] **Step 3: Word count check**

Run:
```bash
wc -w _posts/2026-06-02-multiagent-orchestration-gold-standard.md
```

Expected: 1200–1800 words. If under, expand the framework landscape or core patterns sections. If over, tighten the framework landscape (it's the easiest to compress).

- [ ] **Step 4: Render check**

Run `bundle exec jekyll serve`. Visit the new post URL (`/blog/2026/06/02/multiagent-orchestration-gold-standard/`). Expected: renders with serif typography, narrow column, code blocks (if any) styled correctly, links underlined subtly.

Visit `/blog`. Expected: new post sits at the top of the dated index.

- [ ] **Step 5: Commit**

```bash
git add _posts/2026-06-02-multiagent-orchestration-gold-standard.md
git commit -m "content: survey post on multiagent orchestration gold standard"
```

---

## Task 14: Final sweep + orphan cleanup

**Files:** any with leftover issues

- [ ] **Step 1: Grep for orphaned token references**

Run:
```bash
grep -rn "accent-glow\|accent-secondary\|border-accent\|surface-hover\|radius-lg\|nav-bg-mobile\|data-theme" assets/ _includes/ _layouts/ *.html *.md
```

Expected: zero matches. If anything remains, delete it. The only legitimate residual could be a `[data-theme]` selector inside `assets/css/explore.css` — which is out of scope for this redesign, so leave it.

- [ ] **Step 2: Grep for dead class names**

Run:
```bash
grep -rn "post-card\|hero-line\|explore-icon\|theme-toggle\|theme-icon" assets/css/main.css _includes/ _layouts/ *.html
```

Expected: zero matches.

- [ ] **Step 3: Page-by-page visual sweep**

Run `bundle exec jekyll serve`. Walk:
- `/` — hero quiet, recent posts as dated rows, quick-links plain text
- `/blog` — filter tags render as plain underline-on-hover, dated index renders, filter still works
- `/blog/2026/02/08/welcome/` — narrow column, serif body, plain category, lighter blockquote
- `/blog/2026/03/18/stasis/` — Stasis renders correctly w/ philosophy tag
- `/blog/2026/06/02/multiagent-orchestration-gold-standard/` — renders correctly w/ ai+agents tags
- `/projects` — cards have hairline borders, no shadow on hover, featured shows label not purple border
- A single project page — renders with new typography
- `/about` — renders
- `/tags` — section names in heading color
- `/guitar-tabs` — unchanged, no regression

- [ ] **Step 4: Mobile width check**

In the browser, resize to 480px and re-walk the same pages. Expected: nav collapses, post rows wrap to two-line stacked layout per the `@media (max-width: 560px)` rule, no horizontal overflow.

- [ ] **Step 5: Console check**

Open browser devtools. Expected: zero JS errors, zero 404s on assets, zero CSS parse warnings.

- [ ] **Step 6: Fix and commit anything found**

If the sweep surfaced any leftover issues, fix them now. Commit per fix or as a single cleanup commit:

```bash
git add <fixed-files>
git commit -m "fix: <specific cleanup>"
```

- [ ] **Step 7: Push**

```bash
git push origin main
```

GitHub Pages rebuilds within ~1 minute. Open the live URL and re-walk the sweep.

---

## Self-review

**Spec coverage:** Every spec section has at least one task.
- §1 Aesthetic & tokens → Task 2
- §2 Layout & components → Tasks 3, 4, 5, 6, 7, 8, 9
- §3 Multiagent post → Tasks 12, 13
- §4 Scribble flow → Task 10
- §5 Template + README → Task 11
- §6 File scope → covered by per-task `Files:` blocks
- §7 Verification → Task 14

**Placeholder scan:** No "TBD", "TODO", "appropriate error handling", or "similar to" references found. All code blocks contain literal content.

**Type / name consistency:** Partial called `post-row.html`, included as `{% include post-row.html post=post %}` in both `index.html` and `blog.html`, accessed inside as `include.post`. Container class consistently `.post-list`. Item wrapper class consistently `.post-list-item`. Tag set in `_data/tags.yml` consistent across Task 10 and the post in Task 13.
