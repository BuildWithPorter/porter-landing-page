# Porter website review — September 30, 2026

Status: preview in draft PR #123. Michael must review and explicitly approve before production.

**Visual review is unresolved.** Michael rejected the tilted paper graphics and ivory proof cards. The latest rendered proof concept uses a matte consolidation waterfall instead of glossy glass bubbles. Michael likes this direction and requested the current hero palette; the color-matched mockup remains separate from the implemented preview. Existing artwork in the preview is not an approved final design.

## Page roles

The homepage provides the full story: Hero → Challenges / What We Solve → What Porter Does → Our Software → Why Porter → Proof → Common Questions → contact. The primary navigation and footer link to those sections. The former two-box “Porter approach” is removed.

`/use-cases` opens directly into the 20-film collection, filters and detail links. It does not repeat the homepage software showcase. Existing `/what-we-solve`, `/services` and `/why-porter` URLs remain available as supporting destinations; blog, industry and individual film URLs remain intact.

## Visual and interaction corrections

- The hero keeps its original headline and Michael's exact subheader. Its curve and circle use the same SVG progress point.
- Obsidian is the foundation, with restrained, section-specific green gradients. The bright forest washes are removed. The collection now carries subtle repeating forest gradients through all twenty films. The current ivory proof treatment is rejected and awaiting replacement.
- Six service scenes use distinct compositions: reconciliation pairs, invoice-to-payment flow, a payment calendar, payroll distribution, tax records and forecast scenarios. They retain the campaign paper/perspective treatment. Copy explicitly says “Our team handles the work across six connected areas.” Examples are identified as illustrations, not customer results.
- One focused software showcase on the homepage links to all 20 films through a large primary button beside the film on desktop, below it on smaller screens. Useful interface labels and the names ChatGPT and Claude remain visible.
- Proof cards use translucent ivory layers and ten illustrated workflows instead of icons, on the existing dark background. They stay 350px wide on desktop. Motion starts automatically in view. Hover/focus pause for reading; touch or horizontal manipulation pause temporarily. Ordinary vertical page scrolling no longer sets a persistent pause. Only the explicit pause button opts out persistently. Reduced-motion visitors get a stationary scrollable collection. Loop duplicates are hidden from assistive technology.
- Common questions use compact hairline accordions, initially closed, with one answer open at a time.
- The navigation is one clipped, continuous shape with contiguous segments. All five links fit on phones. Shared header-height offsets keep blog and article headings below the fixed navigation.
- Mobile footer Product links use two columns; Company and Legal sit beside each other. Article FAQ and contact blocks now fit the phone reading column instead of remaining 720px wide.

“Talk to Porter” opens the contextual contact form. Existing audit and campaign scheduling flows remain separate.

The challenges section explicitly describes the visitor’s current provider/tools, with four outlined controls and separate before-Porter illustrations. It no longer replays solution films next to ambiguous negative headlines. Each challenge links to the relevant solution demonstration.

## SEO and answer-engine coverage

Public pages are pre-rendered with one H1, descriptive metadata, production canonicals and crawlable links. Existing sitemap and llms.txt coverage includes supporting pages and all 20 demonstrations. Markdown negotiation exposes service descriptions, proof stories and FAQ answers. Software, Service/OfferCatalog, VideoObject, breadcrumb and FAQ data reflect available page content. No fabricated ratings, results, prices or endorsements were added.

This follows [Google's AI-search guidance](https://developers.google.com/search/docs/appearance/ai-features) and [Bing's webmaster guidance](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a). llms.txt is supplemental discovery, not a ranking guarantee. FAQ markup does not guarantee a rich result or AI citation.

## Section landing and viewport corrections

- Removed page-wide proximity snapping so it cannot move an anchor to a neighboring section. Direct deep links realign after hydration and font loading; visitor interaction cancels that adjustment. Twelve cold-load checks cover all four home anchors at desktop and phone sizes.
- Section boundaries land directly below the fixed header, with 32px of internal desktop space before the section label.
- Reduced oversized section headings and spacing; constrained artwork and film dimensions by viewport height while preserving aspect ratio.
- The software collection action now shares the film’s desktop layout instead of creating another large band below it.
- Browser measurements cover 1512×780, 1440×800, 1280×720, 1920×1080, 1024×768, 768×1024, 390×844 and 360×740. All desktop challenge/service/software states fit at 1280×720. Mobile remains a natural scrolling layout, not forced into a fixed-height frame.

## Validation and limits

- Build generates 46 static routes; full server and React suites cover existing flows plus gallery ordering, service selection and the single collection introduction.
- Browser checks at 1440, 768, 390 and 360px cover homepage anchors, heading clearance, overflow, all six services, grouped footer, collection and blog layouts.
- Motion checks cover proof autoplay without a click, vertical wheel regression, hover pause, touch release, resume, explicit pause, FAQ expansion and filtered gallery numbering. All four published blog articles were checked for phone overflow.
- Existing lint findings remain in unrelated legacy code and HeroChart's pre-existing effects. The revised components otherwise pass targeted lint.
- No production deployment, merge, indexing submission or test lead submission was performed.

## Numbering

Displayed card numbers follow visible reading order, including filtered and curated subsets. Details show their category rather than a conflicting source ID. Services, challenges, software selectors, proof stories and FAQ entries all begin at 01 and progress in reading order. Financial figures, dates and record IDs inside illustrative graphics are not section numbering.
