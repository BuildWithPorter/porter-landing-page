import type { ReactNode } from "react";
import { industryForHost } from "../industries";
import { IndustryPage } from "./IndustryPage";

// Reason (POR-3087): an industry subdomain (design.buildwithporter.com) serves
// its prerendered page at "/" via a vercel.json rewrite, but the client router
// only sees the path "/" and would hydrate the homepage over it, which is what
// shipped first and was caught live. The root route therefore picks the page by
// hostname. During the build there is no window, so "/" still prerenders the
// homepage; in the browser on an industry host it renders that industry's page,
// which matches the rewritten HTML the server sent.
// The homepage is passed in so this module does not import App.tsx back.
export function RootPage({ home }: { home: ReactNode }) {
  const industry = typeof window === "undefined" ? null : industryForHost(window.location.hostname);
  return industry ? <IndustryPage industry={industry} /> : <>{home}</>;
}
