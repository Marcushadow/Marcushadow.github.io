# Minimalist Redesign + Multiagent Orchestration Post — Design

**Date:** 2026-06-02
**Author:** Marcus Wee (with Claude)
**Status:** Approved for planning

## Goal

Three coupled deliverables on the personal Jekyll site:

1. Strip the current neon-cyber dark aesthetic down to a single calm warm-paper theme so the site reads like a personal essay site (Craig Mod / sive.rs feel).
2. Publish a tech-blog survey post on the gold standard of multiagent orchestration in 2026.
3. Document how to add posts, pages, and projects so future writing — including short philosophy scribbles — is zero-friction.

## Non-goals

- No changes to `explore.html`, `assets/css/explore.css`, or `assets/js/explore/` (Explore is disabled WIP).
- No changes to `guitar-tabs.html` or `guitar-tabs/` content.
- No build/deploy pipeline changes. GitHub Pages continues to build on push to `main`.
- No new collections (`_notes`, etc.). Short thoughts live in `_posts/` with a `philosophy` tag.

---

## 1. Aesthetic & design tokens

Single beige paper theme. The existing dark default, the `[data-theme="light"]` block, and the `[data-theme="beige"]` block all collapse into one set of root tokens. The theme toggle UI and its JS are removed.

Replacement `:root` tokens in `assets/css/main.css`:

```css
:root {
  --bg: #FAF7F2;
  --surface: transparent;
  --surface-soft: #F2ECE3;        /* for code blocks, blockquote bg */
  --text: #2a2724;
  --text-heading: #1f1c19;
  --text-secondary: #6e6960;
  --text-muted: #a39c92;
  --border: #e3ddd2;
  --accent: #8b4a2b;              /* link color only */
  --nav-bg: rgba(250, 247, 242, 0.85);
  --font-body: 'Iowan Old Style', 'Source Serif 4', Georgia, 'Times New Roman', serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --radius: 4px;                  /* tighter */
  --transition: 0.15s ease;
  --max-width: 760px;             /* narrower whole-site column */
  --content-width: 680px;         /* even narrower for prose */
}
```

Tokens to **delete entirely** (and every rule that references them):

- `--accent-glow`, `--accent-secondary`, `--accent-secondary-glow`
- `--border-accent`, `--surface-hover`
- `--nav-bg-mobile` (mobile reuses `--nav-bg`)
- `--radius-lg`

Typography: system serif stack — no Google Fonts request needed. Body 1.05rem, line-height 1.75. Headings same family, weight 600, letter-spacing -0.015em.

Animations to delete: `@keyframes glow-pulse`, `@keyframes portal-pulse`, and every property referencing them.

---

## 2. Layout & components

### Navigation (`_includes/nav.html`)

- Remove the entire `<button class="theme-toggle">` block including all three SVG icons.
- Remove `.accent` span around "Wee" in the logo — logo is plain text in `--text-heading`.
- Underline link animation: replace the `::after` sliding underline with a static `text-decoration: underline` on `:hover` / `.active`. No glow.

### Hero (`index.html`)

- Strip the `<span class="accent">Marcus</span>` wrap — name renders in `--text-heading`.
- Delete the `<div class="hero-line"></div>`.
- Rewrite tagline to a shorter, quieter sentence (final wording chosen in implementation).
- Quick-links: render as plain inline links separated by spaces, e.g. `Projects → · About → · Explore (WIP)`. No backgrounds, no borders, no shadows. Disabled Explore stays muted (`color: var(--text-muted)`, `cursor: default`).
- Delete `.explore-link` and `.explore-icon` rules entirely.

### Post listing (used on `index.html` recent-posts and `blog.html`)

Replace `.post-grid` card grid with a **dated index list**. New partial `_includes/post-row.html`:

```html
<a href="{{ post.url | relative_url }}" class="post-row">
  <time class="post-row-date" datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%b %d, %Y" }}</time>
  <span class="post-row-title">{{ post.title }}</span>
  {% if post.tags.size > 0 %}
  <span class="post-row-tags">{{ post.tags | join: ", " }}</span>
  {% endif %}
</a>
```

CSS targets a 3-column row: `grid-template-columns: 110px 1fr auto`. Date in mono and `--text-muted`. Title in `--text` with hover → `--accent`. Tags in `--text-muted` small caps right-aligned. Row dividers are a 1px `--border` bottom on each row.

Delete `_includes/post-card.html` and every `.post-card*` CSS rule.

Filter tags on `blog.html`: keep the JS untouched. Restyle `.filter-tag` from pill-with-background to plain text with underline-on-active. Smaller font.

### Single post (`_layouts/post.html` + `.post-body`)

- Post column max-width: `--content-width` (680px).
- `.post-meta`: lighter — date in mono `--text-muted`, category as small-caps `--text-secondary`, no pill background.
- `.post-category` and `.post-card-category`: remove background fill and uppercase styling becomes letter-spacing on the inline text.
- `.post-body blockquote`: keep left border, drop the `--surface` background fill, keep italic.
- Inline `code`: keep `--surface-soft` background and `--border`, but accent color stays for token recognition.
- Code blocks (`pre`): `--surface-soft` background, 1px `--border`, no shadow.

### Projects page (`projects.html` + `.project-card`)

Keep cards (cards earn their place when items have heterogeneous metadata like GitHub links and featured flags), but strip noise:

- Remove `box-shadow` on `:hover`.
- Remove `transform: translateY(-2px)` on `:hover`.
- Border stays `--border`; hover border → `--text-secondary`.
- Drop `.project-card-featured` purple tint — featured projects get a small "Featured" small-caps label inside the card instead.

### Tags page (`tags.html`)

Light pass: section header underline already minimal — keep. `.tag-section-name` color from `--accent` to `--text-heading` to dial down.

### Post navigation (prev/next, `.post-nav-link`)

- Drop the surface background + border-box look.
- Render as two plain text links: `← Previous: Title` / `Next: Title →`.
- Single underline on hover.

### Footer

Already minimal. Verify no `--accent-glow` references remain after pass.

### Syntax highlighting

Keep only the warm-muted token color palette currently scoped under `[data-theme="beige"]`. Promote those rules to plain `.highlight .x` selectors. Delete the dark-default block (lines ~1116–1136 in current `main.css`) and the `[data-theme="light"]` block (lines ~1141–1183).

---

## 3. Multiagent orchestration post

### File

`_posts/2026-06-02-multiagent-orchestration-gold-standard.md`

### Frontmatter

```yaml
---
layout: post
title: "Multiagent Orchestration: Where the Gold Standard Sits in 2026"
date: 2026-06-02
tags: [ai, agents]
category: tech
description: "A survey of how teams are actually wiring multiple agents together right now, and what 'good' looks like."
---
```

### Target length

1200–1800 words. Goal: 1400.

### Outline (8 sections)

1. **Setup (~120w)** — Define multiagent orchestration: more than one LLM agent cooperating on a task with explicit coordination. Contrast against a single-agent tool-calling loop. Why the distinction matters.

2. **Why multiagent at all (~150w)** — Cases where one context window doesn't cut it: parallel research over many sources, separation of concerns (planner / executor / critic), context isolation to avoid prompt poisoning, role specialization. Acknowledge the cost and latency tax.

3. **Core patterns (~300w)** — Brief pass over:
   - Orchestrator-worker (lead fans out subtasks, synthesizes returns)
   - Hierarchical / supervisor (tree of supervisors and workers)
   - Pipeline (sequential stages, each with a different prompt/role)
   - Swarm / handoff (peer agents pass control via explicit handoff tools)
   - Debate / verify (parallel agents with adversarial check)

4. **Framework landscape (~350w)** — Compact survey:
   - **LangGraph** — graph-based, explicit state machine, mature, verbose
   - **CrewAI** — role-first, opinionated, fast onboarding
   - **AutoGen (v0.4+)** — event-driven actor model, MS Research
   - **OpenAI Agents SDK / Swarm lineage** — handoff primitive, lightweight
   - **Claude Agent SDK** — subagent tool + skills + tight tool loop
   - **Anthropic's research multi-agent system** — orchestrator + parallel subagents + artifact memory, cited as production-grade reference

5. **What "gold standard" looks like in 2026 (~250w)** — Thesis:
   - Orchestrator-worker with **parallel** subagents
   - **Structured outputs** at handoff boundaries (schemas, not free text)
   - **Verification step** before commit (adversarial subagent or judge)
   - **Artifact / shared memory** layer separate from agent context
   - **Token budget** awareness baked in
   - Deterministic harness around stochastic agents — workflow scripts beat pure LLM routing when topology is known

6. **Common failure modes (~150w)** — Runaway fan-out, context bleed, lost-in-handoff, confident-wrong synthesis, cost explosion without budget guard.

7. **Practical recommendation (~100w)** — Start single-agent with good tools. Add multiagent only when there's proven need (parallel subproblem, role split, verification). Reach for orchestrator-worker first.

8. **Closing (~30w)** — Personal hook.

### Links

Minimal — at most ~5 inline:

- Anthropic's multi-agent research-system engineering post
- LangGraph docs
- AutoGen v0.4 announcement
- OpenAI Agents SDK
- Claude Agent SDK overview

### Research step during implementation

Anthropic knowledge cutoff is January 2026; today is June 2, 2026. Before drafting, run WebSearch and WebFetch on each framework name to confirm the current state hasn't drifted and the "gold standard" claim is defensible. If anything has moved (new major version, abandoned project, new entrant), update the survey section.

---

## 4. Scribble flow

Same `_posts/` directory. New tag `philosophy`.

- Add to `_data/tags.yml`:
  ```yaml
  - name: philosophy
    description: "Personal reflections and stray thoughts"
    color: "#6e6960"
  ```
- Also add `ai`, `agents`, `tech` (referenced by the new post + future posts).
- Uncomment `_posts/2026-03-18-Stasis.md` (currently HTML-commented). Add `tags: [philosophy]` to its frontmatter. Keep `category: personal`.

No layout changes. The existing tag filter on `/blog` already lets readers filter to or away from philosophy posts.

---

## 5. Template + README

### Template

`_drafts/_template.md`:

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

Jekyll excludes `_drafts/` from production builds by default, so committing this file is safe.

Author workflow: copy template → rename to `_posts/YYYY-MM-DD-slug.md` → fill frontmatter → write body → commit + push.

### README

New `README.md` at repo root. `_config.yml` already excludes `README.md` from the build, so it ships only on GitHub.

Sections:

1. **One-line intro** (Jekyll site, single beige theme)
2. **Add a blog post** — filename convention, frontmatter fields with examples, where the post shows up, philo-scribble shortcut
3. **Add a page** — frontmatter, permalink, nav link
4. **Add a project** — `_projects/` collection, frontmatter (title, description, tags, github, featured), body conventions
5. **Add a tag** — `_data/tags.yml` schema
6. **Local preview** (one liner: `bundle exec jekyll serve`)

---

## 6. File scope

### Files modified

- `assets/css/main.css` — token rewrite, strip neon/glow/gradients/shadows/animations, collapse three themes to one, retune typography, narrow column, dated-index list styles, replace card grid styles
- `_includes/nav.html` — remove theme toggle button + 3 SVGs, remove `.accent` span on logo
- `_includes/head.html` — remove theme-init script if present
- `_layouts/default.html` — remove theme-init script if present
- `index.html` — strip `.accent` span, drop `.hero-line`, flatten quick-links, soften tagline, swap to post-row partial
- `blog.html` — swap `.post-grid` for dated index list using new partial; keep filter JS unchanged
- `_layouts/post.html` — narrower column, lighter meta, drop category pill background
- `_layouts/project.html` — light pass (verify no neon tokens leak)
- `projects.html` — keep card grid but strip shadows/transforms
- `tags.html` — recolor section name from accent to heading
- `_data/tags.yml` — add `philosophy`, `ai`, `agents`, `tech` entries
- `_posts/2026-03-18-Stasis.md` — uncomment, add `philosophy` tag

### Files created

- `_includes/post-row.html` — dated-index row partial
- `_posts/2026-06-02-multiagent-orchestration-gold-standard.md` — the survey post
- `_drafts/_template.md` — post skeleton
- `README.md` — author documentation

### Files deleted

- `_includes/post-card.html` — replaced by `_includes/post-row.html`

### Files NOT touched

- `explore.html`, `assets/css/explore.css`, `assets/js/explore/*`
- `guitar-tabs.html`, `guitar-tabs/*`
- `_config.yml` (no required change — `_drafts` already excluded, `README.md` already excluded)
- `Gemfile`

---

## 7. Verification

No automated tests in this repo. Manual page-by-page check after `bundle exec jekyll serve`:

- `/` — hero quiet, post rows render, no neon
- `/blog` — filter tags render and filter, dated index reads cleanly
- Single post — Welcome, Stasis (now visible), multiagent post all render with correct typography and width
- `/projects` — card grid renders, no shadows/transforms on hover, no purple tint on featured
- Single project — renders
- `/about` — renders
- `/tags` — renders
- `/guitar-tabs` — unchanged, still renders (regression check)
- Mobile width (≤480px) — nav collapses, post rows wrap acceptably

After CSS strip, grep the codebase for orphaned references to deleted tokens (`--accent-glow`, `--accent-secondary`, `--border-accent`, `--surface-hover`, `--radius-lg`, `--nav-bg-mobile`) and remove any leftovers.

## 8. Open questions

None at design time. Resolved in clarifying round:

- Aesthetic: single warm paper theme (decided)
- Scribble flow: same `_posts/`, `philosophy` tag (decided)
- Post length and citation style: 1200–1800w survey, minimal key links (decided)
- README scope: post + page + project + tag, plus `_drafts/_template.md` (decided)
