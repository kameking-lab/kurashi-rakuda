# UI v2 review artifacts

Captured from the local Next.js production build on 2026-07-18 at a 1440x1000 viewport.

- `shots/*-after.png`: home, tools index, representative tool, guide index, and about page.
- `lighthouse-home-final.json`: final mobile Lighthouse run. Performance 99, Accessibility 100, LCP 2.1s, CLS 0, TBT 10ms.
- `lighthouse-home.json`: first run before the hero mascot preload adjustment (Performance 96, Accessibility 100, LCP 2.8s).

No before screenshots were captured before implementation, so this directory does not fabricate reconstructed before images.

## Template v2 completion (2026-07-18)

The earlier v2 screenshots are preserved as the honest baseline for this follow-up:

- `shots/guide-before-template-v2.png` -> `shots/guide-index-after-v2.png`
- `shots/tools-before-template-v2.png` -> `shots/tools-index-after-v2.png`
- `shots/about-before-template-v2.png` -> `shots/about-after-v2.png`

New individual template captures:

- `shots/article-seido-after-v2.png`
- `shots/article-heiso-after-v2.png`
- `shots/article-dandori-after-v2.png`
- `shots/policy-after-v2.png`
- `shots/search-zero-after-v2.png`

No pre-change captures exist for the three article subtypes, policy, or search-zero state; reconstructed before images were not fabricated.

Representative mobile Lighthouse results: guide,制度記事,about,policy are all Performance 99, Accessibility 100, CLS 0, and LCP 2.04-2.18s. Raw reports are `lighthouse-*-v2.json`.
