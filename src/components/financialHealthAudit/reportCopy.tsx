/* Financial health audit report copy helpers, extracted from the page by POR-2226.
   These are display-only: they label a finding, format a snapshot date, or wrap
   numbers in a span. None of them rewrite authored report prose -- see the
   renderNumericCopy comment below, which is the surviving record of the one time
   this layer did. */

import type { ReactNode } from "react";
import type { AuditPath } from "../../pages/financialHealthAuditFlow";

export function sourceLabel(path: AuditPath | null): string {
  if (path === "connected") return "QuickBooks connected";
  if (path === "documents") return "Uploaded records";
  return "Owner estimates";
}

export function findingKicker(index: number, checkId: string, tiedTo?: string | null): string {
  return `Finding ${String(index + 1).padStart(2, "0")} - ${findingCategoryLabel(checkId, tiedTo)}`;
}

function findingCategoryLabel(checkId: string, tiedTo?: string | null): string {
  const focusLabels: Record<string, string> = {
    books_health: "Books",
    cash_safety: "Liquidity",
    cash_flow: "Cash",
    growth: "Growth",
    collections: "Collections",
    payables: "Suppliers",
    costs: "Costs",
    profitability: "Profit",
    financing: "Financing",
  };
  if (tiedTo && focusLabels[tiedTo]) return focusLabels[tiedTo];

  const prefix = checkId.split("_")[0];
  const checkLabels: Record<string, string> = {
    B0: "Books",
    B1: "Books",
    B2: "Books",
    B3: "Books",
    B4: "Books",
    B5: "Books",
    B6: "Books",
    C1: "Liquidity",
    C2: "Collections",
    C3: "Suppliers",
    C4: "Cash",
    A1: "Activity",
    A2: "Activity",
    A3: "Activity",
    L1: "Leaks",
    L2: "Leaks",
    L3: "Leaks",
    P1: "Revenue",
    P2: "Profit",
    P3: "Profit",
    O1: "Costs",
    I0: "Context",
    I1: "Plan",
  };
  return checkLabels[prefix] ?? "Finding";
}

export function formatAuditSnapshotDate(value?: string | null): string {
  const parts = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts) return "the day this audit ran";

  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const NUMBER_PATTERN = /\$\s?\d[\d,]*(?:\.\d+)?(?:[kKmMbB])?|\d+(?:\.\d+)?\s?(?:%|pts?|days?|months?|weeks?|years?)|\d[\d,]*(?:\.\d+)?(?:[kKmMbB])?/g;

export function renderNumericCopy(value: string): ReactNode {
  // Reason: The August 31 audit rounded financial ratios and rewrote claim qualifiers at display time.
  // The output contract owns readable prose; rendering only highlights numbers and preserves every character.
  const displayValue = value;
  const matches = [...displayValue.matchAll(NUMBER_PATTERN)];
  if (matches.length === 0) return displayValue;

  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    if (start > cursor) parts.push(displayValue.slice(cursor, start));
    parts.push(<span className="fha-number" key={`${match[0]}-${index}`}>{match[0]}</span>);
    cursor = start + match[0].length;
  });
  if (cursor < displayValue.length) parts.push(displayValue.slice(cursor));
  return parts;
}
