# Website films

Twenty silent 1440 × 1080, 12-second, 24 fps films, adapted from the September 30 Product Showcase campaign's deterministic HTML animations. The three campaign palettes, demo data, typography, contour field and product narratives are retained. A landscape layout replaces the social aspect ratios. Website exports remove music, brand end cards and the logo, retain readable labels/captions, and return to the same canvas between cycles.

The film sources are illustrative product demonstrations using the campaign's fictional data. They are not customer recordings. The site supplies the full problem/action/result narrative as HTML and exposes an explicit play/pause control. Reduced motion initially shows only a poster. Video files are requested only when visible and playing.

## Rebuild

From the repository root, install the optional rendering tools outside the application dependencies:

```sh
npm install --prefix /tmp/porter-film-tools playwright ffmpeg-static
/tmp/porter-film-tools/node_modules/.bin/playwright install chromium
SHOWCASE_TOOLS=/tmp/porter-film-tools node scripts/showcase/render.mjs video
```

Use `posters` instead of `video` to update poster frames. Append a slug to render a single story. `manifest.json` associates each public slug with its campaign source and poster timing. Outputs go to `public/use-cases/<slug>/`. Fonts resolve from the application's installed `@fontsource` packages; no external assets or credentials are required.

## Website composition

- `glass.css` and `glass.js` retain the campaign system and provide the additional `43` layout.
- `website.css` removes the end-card branding and sharpens product panels.
- `website.js` maps the complete three-beat narrative into a 12-second loop.
- No production or ad publishing is part of this script.
