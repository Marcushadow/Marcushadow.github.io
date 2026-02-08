---
layout: post
title: "How I Built This Blog from Scratch"
date: 2026-02-08
tags: [jekyll, web, tutorial]
category: tech
description: "A behind-the-scenes look at building a dark-themed personal blog with Jekyll, custom CSS, and GitHub Pages."
---

I just finished building this blog, so naturally the first technical post has to be about how I built it. Here's the stack and the decisions behind it.

## The stack

- **Jekyll** — static site generator. No database, no server, just Markdown files that compile to HTML.
- **GitHub Pages** — free hosting that auto-builds Jekyll sites on push.
- **Custom CSS** — no frameworks. Just vanilla CSS with variables, Grid, and Flexbox.
- **Giscus** — comments powered by GitHub Discussions.

## Why Jekyll?

I wanted something that:

1. Lets me write posts in **Markdown**
2. Builds to **static HTML** (fast, secure, free to host)
3. Is **extensible** without being bloated
4. Doesn't require a backend or database

Jekyll checks all the boxes. It's been around forever, has great docs, and GitHub Pages supports it natively.

## The design

I went with a dark theme — near-black backgrounds with cyan accents. The design uses:

```css
:root {
  --bg: #0a0a0f;
  --surface: #12121a;
  --accent: #00d4ff;
  --text: #e0e0e0;
}
```

Cards use a glassmorphism-inspired look with subtle borders and glow effects on hover. Typography is set in **Inter** for body text and **JetBrains Mono** for code blocks.

## Project structure

```
_layouts/       → HTML templates (default, post, page)
_includes/      → Reusable components (nav, footer, post cards)
_posts/         → Blog posts in Markdown
_data/          → YAML data files (projects, tags)
assets/css/     → Stylesheet
```

Everything compiles to a `_site/` folder that GitHub Pages serves.

## What's next

- Add more posts
- Set up a custom domain
- Maybe add client-side search with lunr.js
- Explore adding a dark/light mode toggle

If you want to build something similar, feel free to check out the [source code](https://github.com/Marcushadow/Marcushadow.github.io) — it's all open source.
