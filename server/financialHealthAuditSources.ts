import { readFile, readdir } from "node:fs/promises";

/* Test support for the financial health audit source guards.
 *
 * Reason (POR-2226): several node:test guards on this feature assert against raw
 * source text -- "this string is present", "this transport is absent", "this rule
 * is the last one in the cascade". They used to read one .tsx and one .css file.
 * The page is now a page plus a directory of components, and the stylesheet is an
 * ordered barrel over per-area slices, so a guard pinned to a single path would
 * silently stop guarding the moment the code it cares about moved one file over,
 * and would report green while doing it.
 *
 * These helpers read the whole feature instead, so a guard keeps its meaning
 * wherever inside the feature the code lives. auditStylesheet() resolves the
 * barrel's @import order rather than globbing the directory, because "last rule
 * wins" is only answerable in load order -- and that order is exactly what the
 * barrel exists to pin.
 */

const PAGE = "../src/pages/FinancialHealthAudit.tsx";
const COMPONENTS = "../src/components/financialHealthAudit/";
const STYLESHEET_BARREL = "../src/pages/FinancialHealthAudit.css";

async function read(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), "utf8");
}

/** The page and every extracted component, concatenated. Order is irrelevant
 *  here: these guards ask whether a string or an import appears anywhere in the
 *  feature, not where. */
export async function auditFeatureSource(): Promise<string> {
  const componentDir = new URL(COMPONENTS, import.meta.url);
  const entries = await readdir(componentDir);
  const sources = await Promise.all([
    read(PAGE),
    ...entries
      .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))
      .sort()
      .map((entry) => read(`${COMPONENTS}${entry}`)),
  ]);
  return sources.join("\n");
}

/** The audit stylesheet as the browser sees it: every slice the barrel imports,
 *  concatenated in barrel order. Guards that depend on which duplicate selector
 *  wins must use this, never a single slice. */
export async function auditStylesheet(): Promise<string> {
  const barrel = await read(STYLESHEET_BARREL);
  const imports = [...barrel.matchAll(/@import\s+"(?<href>[^"]+)"\s*;/g)]
    .map((match) => match.groups?.href)
    .filter((href): href is string => Boolean(href));
  if (imports.length === 0) {
    throw new Error("FinancialHealthAudit.css declared no @import slices.");
  }
  const barrelUrl = new URL(STYLESHEET_BARREL, import.meta.url);
  const slices = await Promise.all(
    imports.map((href) => readFile(new URL(href, barrelUrl), "utf8")),
  );
  return slices.join("\n");
}
