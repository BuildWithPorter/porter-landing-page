# Porter website review — September 30, 2026

Status: preview in draft PR #123. Michael must review and explicitly approve before production.

## Page roles

The homepage provides the full story: Hero → What We Solve → What Porter Does → Our Software → Why Porter → Proof → Common Questions → contact. The primary navigation and footer link to those sections. The former two-box “Porter approach” is removed.

`/use-cases` opens directly into the 20-film collection, filters and detail links. It does not repeat the homepage software showcase. Existing `/what-we-solve`, `/services` and `/why-porter` URLs remain available as supporting destinations; blog, industry and individual film URLs remain intact.

## Visual and interaction corrections

- The hero keeps its original headline and Michael's exact subheader. Its curve and circle use the same SVG progress point.
- Obsidian is the foundation, with restrained, section-specific green gradients. The earlier bright forest washes and beige proof treatment are removed.
- Six service illustrations use the campaign's paper, perspective and contour graphics. The selected service changes its illustration and short explanation together. All six service names remain visible. Examples are identified as illustrations, not customer results.
- One focused software showcase on the homepage links to all 20 films. Useful interface labels and the names ChatGPT and Claude remain visible.
- Proof cards are 350px on desktop, showing roughly three at once, with smaller numerals and less empty space. Continuous motion pauses on hover, keyboard focus, manual interaction or the pause control. Reduced-motion visitors get a stationary scrollable collection. Loop duplicates are hidden from assistive technology.
- Common questions use compact hairline accordions, initially closed, with one answer open at a time.
- The navigation is one clipped, continuous shape with contiguous segments. All five links fit on phones. Shared header-height offsets keep blog and article headings below the fixed navigation.
- Mobile footer Product links use two columns; Company and Legal sit beside each other. Article FAQ and contact blocks now fit the phone reading column instead of remaining 720px wide.

“Talk to Porter” opens the contextual contact form. Existing audit and campaign scheduling flows remain separate.

## SEO and answer-engine coverage

Public pages are pre-rendered with one H1, descriptive metadata, production canonicals and crawlable links. Existing sitemap and llms.txt coverage includes supporting pages and all 20 demonstrations. Markdown negotiation exposes service descriptions, proof stories and FAQ answers. Software, Service/OfferCatalog, VideoObject, breadcrumb and FAQ data reflect available page content. No fabricated ratings, results, prices or endorsements were added.

This follows [Google's AI-search guidance](https://developers.google.com/search/docs/appearance/ai-features) and [Bing's webmaster guidance](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a). llms.txt is supplemental discovery, not a ranking guarantee. FAQ markup does not guarantee a rich result or AI citation.

## Validation and limits

- Build generates 46 static routes; full server and React suites cover existing flows plus gallery ordering, service selection and the single collection introduction.
- Browser checks at 1440, 768, 390 and 360px cover homepage anchors, heading clearance, overflow, all six services, grouped footer, collection and blog layouts.
- Motion checks cover proof autoplay, hover pause, resume, explicit pause, FAQ expansion and filtered gallery numbering. All four published blog articles were checked for phone overflow.
- Existing lint findings remain in unrelated legacy code and HeroChart's pre-existing effects. The revised components otherwise pass targeted lint.
- No production deployment, merge, indexing submission or test lead submission was performed.

## Numbering

Displayed card numbers follow visible reading order, including filtered and curated subsets. Details show their category rather than a conflicting source ID. Services, problems, software selectors, proof stories and FAQ entries all begin at 01 and progress in reading order. Financial figures, dates and record IDs inside illustrative graphics are not section numbering.
