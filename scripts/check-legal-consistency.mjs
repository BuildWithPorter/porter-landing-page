#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const legalPages = [
  "src/pages/Security.tsx",
  "src/pages/PrivacyPolicy.tsx",
  "src/pages/TermsOfService.tsx",
  "src/pages/SubProcessors.tsx",
  "src/sections/Faq.tsx",
];

const allLegalText = legalPages
  .map((file) => `${file}\n${readFileSync(join(root, file), "utf8")}`)
  .join("\n\n");

const requiredImports = [
  ["src/pages/Security.tsx", "../legal/securityContent"],
  ["src/pages/PrivacyPolicy.tsx", "../legal/securityContent"],
  ["src/pages/TermsOfService.tsx", "../legal/securityContent"],
  ["src/pages/SubProcessors.tsx", "../legal/securityContent"],
  ["src/sections/Faq.tsx", "../legal/securityContent"],
];

const bannedClaims = [
  {
    pattern: /structurally impossible/i,
    reason: "Tenant isolation is application/repository scoped; do not claim physical impossibility.",
  },
  {
    pattern: /no admin ["']?switch company["']? backdoor/i,
    reason: "Internal privileged operator access exists and must not be described as nonexistent.",
  },
  {
    pattern: /delete or anonymize your financial data within 30 days/i,
    reason: "Primary accounting records and uploaded documents have a default seven-year post-termination retention period.",
  },
  {
    pattern: /we will delete your data within 30 days \(except as required by law\)/i,
    reason: "Termination language must include contract, legal hold, accounting-history, and backup retention exceptions.",
  },
  {
    pattern: /Last updated=["'](?:January 14|May 27|May 28), 2026["']/i,
    reason: "Legal/security pages must use shared June 25, 2026 dates from src/legal/securityContent.ts.",
  },
  {
    pattern: /SOC 2 compliant cloud infrastructure/i,
    reason: "Porter has SOC 2-attested providers, but Porter does not have a completed SOC 2 report.",
  },
];

const requiredTerms = [
  "seven years",
  "provider-specific",
  "analytics/session telemetry",
  "PostHog",
  "Helcim",
  "June 25, 2026",
];

const failures = [];

for (const [file, importPath] of requiredImports) {
  const text = readFileSync(join(root, file), "utf8");
  if (!text.includes(importPath)) {
    failures.push(`${file}: must import shared legal/security copy from ${importPath}`);
  }
}

for (const { pattern, reason } of bannedClaims) {
  const match = allLegalText.match(pattern);
  if (match) {
    failures.push(`Banned legal/security claim found: "${match[0]}". ${reason}`);
  }
}

const sharedContent = readFileSync(join(root, "src/legal/securityContent.ts"), "utf8");
for (const term of requiredTerms) {
  if (!sharedContent.includes(term)) {
    failures.push(`src/legal/securityContent.ts must include required term: ${term}`);
  }
}

if (failures.length) {
  console.error("Legal/security consistency check failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Legal/security consistency check passed.");
