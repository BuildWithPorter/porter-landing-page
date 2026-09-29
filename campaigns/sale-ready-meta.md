# Sale-Ready Books Meta campaign

Created September 29, 2026 in ad account `act_427493388000411`. All objects are **paused** pending Michael's explicit campaign approval. No spend is authorized by this file.

| Object | ID | Setting |
| --- | --- | --- |
| Campaign `Porter \| Sale-Ready \| Oct 2026` | `120253563278460666` | Leads, $350 spend cap |
| Ad set `SRB \| US Owners 40+ \| Feed` | `120253563280490666` | $25/day, website Lead, Pixel `1383684593949468` |
| `SRB-IMG-01` | `120253563358920666` | “Selling your business?” image |
| `SRB-IMG-02` | `120253563360240666` | “Paying a bookkeeper…” image |
| `SRB-IMG-04` | `120253563360850666` | “Books that hold up…” image |

Manual placements are Facebook Feed and Instagram Feed only. CTA is Learn More. All URLs point to `/sale-ready` with per-image Meta UTMs. The three ad creatives have no automatically enabled creative enhancements.

The ad set uses Advantage+ audience with “Small business owners” as a behavior suggestion and ages 40–65 as an age suggestion. Meta's API records the hard minimum age as 25 while Advantage+ is enabled, so delivery is **not strictly limited to people 40 and older**. Decide whether strict age targeting or Advantage+ audience matters more before approval. This campaign remains paused either way.

The landing page's form sends a Lead only after its checklist email is accepted. The browser Pixel and Conversions API use the same event ID for deduplication. The Vercel `META_CAPI_TOKEN` variable is present for Preview and Production; end-to-end conversion delivery still needs checking after the Resend sending domain is verified.
