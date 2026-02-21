# chriskurdziel.com

Personal blog of Chris Kurdziel, built with Jekyll and hosted on GitHub Pages at [chriskurdziel.com](https://chriskurdziel.com).

## Local Development

Prerequisites: Ruby and Bundler.

```sh
bundle install
bundle exec jekyll serve
```

Then visit `http://localhost:4000`.

## Structure

```
_posts/           Blog posts (Markdown)
  tumblr/         Older posts imported from Tumblr (2010–2013)
_pages/           Static pages (about, library, etc.)
_layouts/         Page templates (default, post, page, index, category)
_includes/        Reusable partials (sidebar, head, post-meta, etc.)
_sass/            Stylesheets (typography, code, posts, syntax)
assets/           CSS entry point, fonts, JS, audio
images/           Post images and site assets
```

## Writing a New Post

Create a Markdown file in `_posts/` with the date prefix:

```
_posts/2026-02-20-my-new-post.md
```

Front matter:

```yaml
---
layout: post
title: My New Post
---
```

## Easter Eggs

The site has a retro terminal aesthetic with CRT scanlines, an ASCII avatar, and keyboard navigation (`j`/`k` to move, `Enter` to open). Typing specific key sequences triggers themed color palettes and background music. Themes persist across pages via `localStorage` — click the theme indicator in the sidebar to clear.

| Theme | Key Sequence | Vibe | Audio |
|-------|-------------|------|-------|
| **DOOM** | `i d k f a` | Hellfire reds, ember glow | E1M1 soundtrack |
| **Guile** | `← → a` or `← → b` | Olive military terminal, khaki gold | Guile's Theme (Street Fighter) |
| **Metroid** | `j u s t i n b a i l e y` | Green phosphor CRT, Samus orange | Kraid's Lair |
| **Warcraft** | `it is a good day to die` | Rich gold on parchment, Horde green | Orc acknowledgment lines |
| **Konami** | `↑ ↑ ↓ ↓ ← → ← → b a` | NES CRT blue, saturated red | Konami jingle |

Looping themes (DOOM, Guile, Metroid, Warcraft) toggle off when the same sequence is typed again.

## Deployment

Pushes to `master` are automatically deployed via GitHub Pages to [chriskurdziel.com](https://chriskurdziel.com).
