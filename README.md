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

## Deployment

Pushes to `master` are automatically deployed via GitHub Pages to [chriskurdziel.com](https://chriskurdziel.com).
