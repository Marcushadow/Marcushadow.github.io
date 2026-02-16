---
layout: post
title: "How I Built This Blog with Claude Code"
date: 2026-02-08
tags: [jekyll, web, tutorial, ai]
category: tech
description: "A behind-the-scenes look at building a personal blog with Jekyll, GitHub Pages, and AI-assisted development using Claude Code and Obra Superpowers."
---

I just finished building this blog, so naturally the first technical post has to be about how I built it — and the AI tools that made it possible. Here's the stack and the decisions behind it.

## The stack

- **Jekyll** — static site generator. No database, no server, just Markdown files that compile to HTML.
- **GitHub Pages** — free hosting that auto-builds Jekyll sites on push.
- **Custom CSS** — no frameworks. Just vanilla CSS with variables, Grid, and Flexbox.
- **Giscus** — comments powered by GitHub Discussions.
- **Claude Code** — Anthropic's CLI tool for AI-assisted development. This was the main driver behind the entire build.
- **Obra Superpowers** — a skills plugin for Claude Code that adds structured workflows like brainstorming, test-driven development, and systematic debugging.

## The AI-assisted workflow

This blog wasn't hand-coded line by line in the traditional sense. I used **Claude Code** as my development partner throughout the entire process. Here's what that looked like:

1. **Scaffolding** — I described what I wanted (a dark-themed Jekyll blog with custom CSS) and Claude Code generated the initial project structure, layouts, and stylesheets.
2. **Iterating on design** — I'd describe changes I wanted ("add a glassmorphism card style", "make the theme toggleable") and Claude Code would implement them across the right files.
3. **Obra Superpowers** — The Superpowers plugin gave Claude Code structured workflows to follow. Instead of just generating code, it would brainstorm approaches, plan implementations, and verify its work before calling things done. This made the collaboration feel more like working with a thoughtful developer than prompting a chatbot.

The combination meant I could focus on **what I wanted** rather than **how to implement it**. I still made all the design decisions, but the execution was dramatically faster.

## Why Jekyll?

I wanted something that:

1. Lets me write posts in **Markdown**
2. Builds to **static HTML** (fast, secure, free to host)
3. Is **extensible** without being bloated
4. Doesn't require a backend or database

Jekyll checks all the boxes. It's been around forever, has great docs, and GitHub Pages supports it natively. It's also a great fit for AI-assisted development since the project structure is clean and predictable.

## The design

The site ships with three themes — dark, light, and a warm beige (coffee) mode. The dark theme uses near-black backgrounds with cyan accents:

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
- Keep using Claude Code + Superpowers to ship features faster

If you want to build something similar, feel free to check out the [source code](https://github.com/Marcushadow/Marcushadow.github.io) — it's all open source.
