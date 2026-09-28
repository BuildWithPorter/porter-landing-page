import type { MouseEvent } from "react";
import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { WaitlistProvider, useWaitlist } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { HeroChart as Hero } from "../sections/HeroChart";
import { Pain } from "../sections/Pain";
import { WhatPorterDoes } from "../sections/WhatPorterDoes";
import { ScalesWithYou } from "../sections/ScalesWithYou";
import { Faq } from "../sections/Faq";
import { securityFaq } from "../legal/securityContent";
import { FinalCTA } from "../sections/FinalCTA";
import { trackMarketingEvent } from "../lib/marketingAnalytics";

// Reason: Multi-entity prospects need tailored guidance, but scheduling a meeting
// before they know whether Porter fits adds friction before the team can learn their needs.
export function MultiEntityPage() {
  return (
    <WaitlistProvider>
      <MultiEntityContent />
    </WaitlistProvider>
  );
}

function MultiEntityContent() {
  const { open } = useWaitlist();
  const ctaFor = (placement: "hero" | "closing") => ({
    label: "Get a tailored recommendation",
    href: "#demo",
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      trackMarketingEvent("multi_entity_recommendation_clicked", { placement });
      open({ multiEntity: true, action: "book_demo" });
    },
  });

  return (
    <>
      <Seo
        title="Porter | Consolidated finance for multi-entity companies"
        description="Bring your companies into one finance view. Porter helps finance teams review consolidated group reports, see company-level detail, and understand what still needs attention."
        path="/multi-entity"
      />
      <Nav />
      <main>
        <Hero
          eyebrow="Finance for multi-entity groups"
          title={<>Close each company.<br />See the whole group.</>}
          sub="Porter brings your companies into one finance workspace, with consolidated group reporting and each company's numbers still in reach. Know what changed, where it happened, and what still needs attention."
          cta={ctaFor("hero")}
        />
        <Pain
          title="When the business spans companies, the group picture should not live in another spreadsheet."
          cards={[
            {
              quote: "I can see each company, but not the group at a glance.",
              body: "The team gathers results from separate books before leadership can see how the whole group is doing.",
              illustration: "books",
            },
            {
              quote: "A group total does not tell me who drove the change.",
              body: "Without company-level detail beside the consolidated view, it takes extra work to find where revenue or spending moved.",
              illustration: "invoices",
            },
            {
              quote: "Activity between our companies clouds the picture.",
              body: "Internal sales can look like outside growth until both sides are linked and the amounts match in the group report.",
              illustration: "tools",
            },
            {
              quote: "We find reporting gaps when it is time to close.",
              body: "Unmapped accounts, missing internal relationships, and unmatched amounts can leave group figures closer to a sum than a consolidated view.",
              illustration: "bookkeeper",
            },
          ]}
        />
        <WhatPorterDoes
          title="Group reporting, with the company detail intact."
          items={[
            {
              title: "Bring the group into view.",
              body: "Review consolidated Profit & Loss and Balance Sheet reports across the companies in your group.",
            },
            {
              title: "See each company's contribution.",
              body: "Move from the consolidated result into member-company reporting to understand where a figure came from.",
            },
            {
              title: "Keep internal activity in context.",
              body: "When both sides are mapped and match, internal business is removed from the consolidated report. Amounts without a match remain visible for review.",
            },
            {
              title: "Know when the view needs attention.",
              body: "See when group mappings, company access, or unmatched internal amounts limit how much the report can consolidate.",
            },
          ]}
        />
        <ScalesWithYou
          cases={[
            {
              kind: "Group reporting",
              icon: "account_tree",
              body: "Porter combines member-company results into consolidated Profit & Loss and Balance Sheet reports. Company breakdowns keep the details close, while mapping and match diagnostics make limits in the group view visible.",
            },
          ]}
        />
        <Faq
          items={[
            {
              q: "What does multi-entity reporting show?",
              a: "Porter provides consolidated Profit & Loss and Balance Sheet reports across the companies in a group, with company-level detail available to review the underlying results.",
            },
            {
              q: "Does Porter remove activity between companies?",
              a: "Porter removes internal amounts from group reporting when the companies and both sides of the activity have been mapped and the amounts match. Unmatched amounts remain visible, and the report surfaces how much identified internal activity could not be removed.",
            },
            {
              q: "Can I see which company contributed to a group number?",
              a: "Yes. Group reporting includes company breakdowns so your team can inspect member-company contributions to consolidated results.",
            },
            {
              q: "What if our companies use different account names?",
              a: "The parent group can map member-company accounts to parent accounts for consolidated reporting. Coverage and reporting readiness can be reviewed as part of group setup.",
            },
            {
              q: "Can Porter support a group with companies nested under other companies?",
              a: "Yes. Group reporting can include companies underneath the selected parent, including those reached through an intermediate group, subject to the viewer's access.",
            },
            securityFaq,
          ]}
        />
        <div className="closing">
          <FinalCTA
            eyebrow="For finance teams across the group"
            title="See how Porter fits your company structure."
            body="Bring your group reporting questions to the Porter finance team. We will walk through your entities, your reporting needs, and what a consolidated view can show."
            cta={ctaFor("closing")}
          />
          <Footer />
        </div>
      </main>
    </>
  );
}
