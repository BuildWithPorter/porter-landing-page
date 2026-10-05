# Porter website review — September 30, 2026

Status: implementation for review in draft PR #123. No production release or merge is authorized.

## Design direction

The latest two references supplied by Michael guide this revision, especially the four-column challenges layout. The site keeps the original hero messaging, charcoal/ivory palette, restrained forest gradients and existing 20 demonstration films. The new artwork uses financial records and charts with tonal depth; it replaces the rejected tilted white-paper illustrations and ivory proof cards.

- **Challenges:** four visible illustrations and one caption each. These explicitly describe the visitor's current finance setup. Each links to a relevant demonstration; no challenge is hidden behind a tab.
- **Services:** six labeled selectors, one concise explanation and six distinct illustrations: reconciliation, invoice/payment flow, a payment calendar, payroll distribution, tax preparation and a cash forecast. Copy says “Our team handles the work across six connected areas.”
- **Software:** existing films, concise benefit copy, named example selectors and a prominent “Explore all 20 demonstrations” action. The complete collection opens directly into the films and filters.
- **Why Porter:** original rising-bar motion with shorter copy explaining how the finance team grows.
- **Proof:** one open customer story at a time, with a financial graphic directly on the dark background. No containing cards, duplicate deck or beige surfaces. Existing full stories remain available under “Read the story.” Chart figures are expressly illustrative, not asserted customer results.
- **Supporting content:** shorter FAQ and contact headings, compact blog excerpts, and supporting service/challenge pages that no longer repeat an introductory heading and paragraph above the same content.

The six service and ten proof illustrations have separate phone compositions. Labels stay legible rather than shrinking desktop diagrams. SVG assets contain the same local DM Sans and EB Garamond fonts as the website; their editable source is `scripts/showcase/render-editorial-art.mjs`.

## Navigation and motion

The homepage remains Hero → Challenges → Services → Software → Why Porter → Proof → Common Questions → contact/footer. Primary navigation lands on the home sections. Supporting routes, blog, industries and demonstration detail URLs remain available.

Anchor offsets and post-font-load deep-link alignment remain in place. Desktop section headings, primary visuals and the demonstration-collection action fit below the fixed navigation at 1280×720. Phone layouts scroll naturally. Existing contiguous navigation and grouped mobile footer are preserved.

Customer stories advance every eight seconds while visible. Hover, keyboard focus, opening a story and backgrounding the page suspend the timer. Explicit pause persists until resumed. Reduced motion disables automatic rotation. Previous/next controls wrap through ten stories and progress controls allow direct selection. Existing films retain their own autoplay, pause and reduced-motion behavior.

## Content and discovery

The hero headline and Michael's exact subheader are unchanged. “Talk to Porter” opens the existing contact form. No test lead was submitted.

Public pages remain pre-rendered with descriptive metadata, one H1, production canonicals and crawlable links. Existing sitemap, structured data and Markdown content negotiation are retained. The full service catalog, proof stories and FAQ answers remain available to text clients. No ratings, customer results or endorsements were invented.

Display numbers follow visible reading order. Filtered demonstration collections restart at 01; financial record IDs inside graphics are distinct from navigation numbering.

## Verification

- Production build generates 46 static routes.
- Full server and React test suites pass, including new proof autoplay, hover/read/persistent-pause, reduced-motion and wraparound coverage.
- Browser measurements cover 1280×720, 1440×800, 1920×1080, 1024×768, 768×1024, 390×844 and 360×740: anchor clearance, desktop content fit and no page overflow.
- All six service selections and ten proof selections were exercised. Supporting pages and the blog were checked for heading clearance, one H1 and no overflow at desktop and phone widths; the gallery retains 20 films and sequential filtered numbering.
- Desktop and phone screenshots, plus all 36 new illustration variants, were visually inspected. Generated SVGs pass XML parsing. Changed source files pass targeted lint.

Michael's visual approval remains pending. Production is untouched.
