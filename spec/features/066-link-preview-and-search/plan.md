# 066 · Plan

## Approach

Static files in `public/` (copied as they are to the root of the site) and tags in `index.html`.
The absolute URLs (`og:image`, `og:url`, canonical, sitemap) name the domain: a link preview needs
an absolute address, and the site has one home.

## Implementation

1. `docs/site-images.cjs` (Playwright on the built app, like `docs/readme-media.cjs`):
   - `public/og-image.png`, 1200×630: the logo, the name and one sentence on the left; the English
     sample CV, first page, on the right.
   - `public/apple-touch-icon.png` (180), `public/icon-192.png`, `public/icon-512.png`: the favicon
     rendered by Chromium. PNG, since that is what the crawlers and the phones read.
2. `index.html`: the description in English, canonical, Open Graph, Twitter card, the PNG icons.
3. `public/robots.txt` (everyone allowed, the sitemap named) and `public/sitemap.xml` (the root).
4. A unit test reads `index.html` and `public/` and checks the tags point to files that exist.
