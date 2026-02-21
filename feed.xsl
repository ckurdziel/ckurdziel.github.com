<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title><xsl:value-of select="/atom:feed/atom:title"/> — Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&amp;display=swap');

          :root {
            --bg: #0D0221;
            --accent: #21ce97;
            --link: #FD00E1;
            --text: #d0b7ff;
            --glow: #FD00E1;
            --scanline: rgba(0, 0, 0, 0.08);
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: "Fira Code", monospace;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 2rem;
            max-width: 52rem;
            margin: 0 auto;
          }

          body::after {
            content: "";
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 9999;
            background: repeating-linear-gradient(
              to bottom,
              transparent, transparent 2px,
              var(--scanline) 2px, var(--scanline) 4px
            );
          }

          .banner {
            border: 1px dashed color-mix(in srgb, var(--accent) 40%, transparent);
            padding: 1.5rem;
            margin-bottom: 2rem;
            position: relative;
            padding-top: 2.5rem;
          }

          .banner::before {
            content: "--- rss feed ---";
            display: block;
            position: absolute;
            top: 0; left: 0; right: 0;
            padding: 0.25rem 0.75rem;
            font-size: 0.7rem;
            color: var(--accent);
            opacity: 0.5;
            border-bottom: 1px dashed color-mix(in srgb, var(--accent) 20%, transparent);
            letter-spacing: 0.1em;
          }

          .banner h1 {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--accent);
            margin-bottom: 0.5rem;
            text-transform: lowercase;
          }

          .banner h1::before {
            content: "# ";
            opacity: 0.5;
          }

          .banner p {
            font-size: 0.85rem;
            margin-bottom: 0.5rem;
          }

          .banner .subscribe-hint {
            font-size: 0.75rem;
            color: color-mix(in srgb, var(--text) 60%, transparent);
          }

          .banner .subscribe-hint code {
            color: var(--accent);
            background: color-mix(in srgb, var(--accent) 10%, transparent);
            padding: 0.1rem 0.4rem;
            font-size: 0.75rem;
          }

          a {
            color: var(--link);
            text-decoration: none;
            transition: text-shadow 0.2s ease;
          }

          a:hover {
            text-shadow: 0 0 8px color-mix(in srgb, var(--glow) 60%, transparent),
                         0 0 16px color-mix(in srgb, var(--glow) 30%, transparent);
          }

          .entry {
            padding: 1rem 0;
            border-bottom: 1px dashed color-mix(in srgb, var(--accent) 15%, transparent);
          }

          .entry:last-child {
            border-bottom: none;
          }

          .entry h2 {
            font-size: 1rem;
            font-weight: 600;
            color: var(--accent);
            margin-bottom: 0.25rem;
            text-transform: lowercase;
          }

          .entry h2::before {
            content: "> ";
            opacity: 0.5;
          }

          .entry .date {
            font-size: 0.75rem;
            color: color-mix(in srgb, var(--text) 55%, transparent);
            margin-bottom: 0.5rem;
          }

          .entry .summary {
            font-size: 0.85rem;
          }
        </style>
      </head>
      <body>
        <div class="banner">
          <h1><xsl:value-of select="/atom:feed/atom:title"/></h1>
          <p>This is an RSS feed. Subscribe by copying the URL into your feed reader.</p>
          <p class="subscribe-hint">
            Feed URL: <code><xsl:value-of select="/atom:feed/atom:link[@rel='self']/@href"/></code>
          </p>
          <p class="subscribe-hint">
            Also available as <a href="/feed.json">JSON Feed</a>
          </p>
        </div>
        <xsl:for-each select="/atom:feed/atom:entry">
          <div class="entry">
            <h2>
              <a>
                <xsl:attribute name="href">
                  <xsl:value-of select="atom:link/@href"/>
                </xsl:attribute>
                <xsl:value-of select="atom:title"/>
              </a>
            </h2>
            <div class="date">
              <xsl:value-of select="substring(atom:published, 1, 10)"/>
            </div>
            <div class="summary">
              <xsl:value-of select="atom:summary"/>
            </div>
          </div>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
