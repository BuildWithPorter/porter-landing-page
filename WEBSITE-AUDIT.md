# Porter website review — September 30, 2026

Status: implemented in draft PR #123 for Michael's review. No production release is authorized.

## Page roles

| Destination | Purpose |
| --- | --- |
| `/` | Brand introduction, the rising chart, and a short choice between services and software |
| `/what-we-solve` | Four business problems with the campaign's cinematic demonstrations |
| `/services` | Bookkeeping/accounting, AR, AP, payroll, taxes and FP&A, with explicit scope |
| `/use-cases` | The focused software demonstration plus the full filterable collection of 20 films |
| `/why-porter` | The growth animation, ten customer stories, and common questions |
| `/blog` | Articles; existing URLs preserved |

The old homepage repeated a service description, a six-film gallery, and a second product demonstration. Those now have distinct destinations. The navigation and footer agree, old homepage anchors forward to the relevant page, and the mobile navigation remains available. Existing use-case detail URLs are preserved.

## Visual and interaction corrections

The chart reveal now clips at the same SVG point as the moving circle; this avoids dash-length discrepancies when the viewBox stretches. Forest-green-to-obsidian gradients replace the beige proof treatment and flat collection background. The proof moves at a steady, restrained pace and pauses on hover, keyboard focus, touch/manual scrolling, or its pause control. Reduced-motion visitors receive a static, scrollable collection. Loop duplicates are hidden from assistive technology.

The problem page uses the same film player and campaign animation language as the software collection. The homepage no longer repeats the film grid. The main call to action is “Talk to Porter”; the form explains the email follow-up and captures business type, existing finance team, current software and requested help. Existing campaign/audit scheduling flows remain separate.

## SEO and answer-engine corrections

- Each new destination is pre-rendered, has one H1, a descriptive title/description, a production canonical URL, and crawlable navigation links.
- The sitemap and llms.txt include the new destinations. Markdown content negotiation covers their main copy, the service descriptions, proof stories, and FAQ answers.
- Organization metadata uses the visible service description. Removed unsupported hidden promises about closing in 48 hours, blanket human approval for every posting, and unverified native operating-system support.
- Software markup lives on the software page; services use Service/OfferCatalog; individual films use VideoObject with their real media/poster URLs and duration. Breadcrumbs describe the page hierarchy. FAQ markup comes from the same answers as the visible FAQ.
- No fabricated ratings, results, prices or customer endorsements were added.
- Fixed unstable gradient IDs so the pre-rendered markup and hydrated page agree.

This follows [Google's AI-search guidance](https://developers.google.com/search/docs/appearance/ai-features) and [Bing's webmaster guidance](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a): crawlable pages, clear page purpose, useful text, and structured data that matches visible content. llms.txt is a supplemental discovery file, not a ranking guarantee. FAQ markup does not guarantee a rich result or an AI citation.

## Validation and remaining limits

Production build generates 46 static routes. Full server and React suites pass; targeted checks cover new Markdown pages. Browser checks cover six key routes at 1440, 768 and 360 pixels, carousel autoplay/pause/resume, reduced motion, hero synchronization, gallery filtering and form payloads. Form requests are mocked during QA; no test leads are sent.

Mobile Lighthouse checks are laboratory measurements. Search indexing, rankings, citations and lead quality require observation after an approved production release. No Search Console/Bing indexing submission or production change was made. Current performance remains a follow-up opportunity: the site still loads the shared application bundle and stylesheet across routes.
