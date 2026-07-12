import { marked } from "marked";

// Tiny browser-safe frontmatter parser. Our blog frontmatter is plain key:value
// + optional JSON-style arrays — no need for gray-matter's full YAML support
// (which pulls in the Node `Buffer` global and breaks in the browser).
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const data: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value: unknown = kv[2].trim();
    const s = value as string;
    // Strip quotes
    if (/^".*"$/.test(s) || /^'.*'$/.test(s)) value = s.slice(1, -1);
    // Arrays — accept ["a", "b"] or [a, b] or [{"q":"...","a":"..."}, {...}]
    else if (/^\[.*\]$/.test(s)) {
      // Try JSON.parse first — handles arrays of objects (used by `faqs`).
      // Fall back to string-array split for the simple ["a", "b"] pattern.
      try {
        value = JSON.parse(s);
      } catch {
        value = s
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      }
    }
    // Numbers
    else if (/^-?\d+(\.\d+)?$/.test(s)) value = Number(s);
    data[key] = value;
  }
  return { data, content: m[2] };
}

export type Pillar = "bookkeeping" | "quickbooks" | "ar" | "ap";

export type PostFrontmatter = {
  title: string;
  slug: string;
  date: string;
  description: string;
  pillar: Pillar;
  tags?: string[];
  readingTime?: number;
  /** Square thumbnail shown on the index card. Path relative to /public. */
  thumbnail?: string;
  /** Wide banner image shown at the top of the article. Path relative to /public. */
  heroImage?: string;
  /**
   * Optional Q&A pairs rendered at the end of the article as a "Common questions"
   * section AND emitted as FAQPage JSON-LD. Big AEO win — AI engines ingest
   * FAQPage schema as citation-ready Q&A. 2-4 questions is the sweet spot.
   */
  faqs?: Array<{ q: string; a: string }>;
};

export type TocSection = {
  id: string;
  text: string;
  roman: string;
};

export type Post = PostFrontmatter & {
  htmlBody: string;
  rawBody: string;
  tocSections: TocSection[];
};

// Vite import: load every .md in /posts as raw string at build time.
const modules = import.meta.glob("./posts/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

// GitHub-flavored markdown, no autolink wrapping that breaks our editorial typography.
marked.use({ gfm: true, breaks: false });

// Add id="<slug>" to <h2>/<h3> in rendered HTML so in-page anchors and TOCs work.
// Cheap post-pass on the string output beats wrestling with marked's typed renderer.
function addHeadingIds(html: string): string {
  return html.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (_match, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    const id = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// Inject an editorial chapter marker before each <h2>. Numbers restart from
// I per article and produce the small-caps letter-spaced eyebrow above every
// H2. This is the visible signal that turns sections into named chapters.
function injectChapterMarkers(html: string): string {
  let idx = 0;
  return html.replace(/<h2 id="([^"]*)">([\s\S]*?)<\/h2>/g, (_m, id, inner) => {
    const roman = ROMAN[idx] ?? String(idx + 1);
    const label = `Chapter ${["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][idx] ?? String(idx + 1)}`;
    idx += 1;
    return `<div class="chapter-marker"><span>${roman}.</span> ${label.toUpperCase()}</div><h2 id="${id}">${inner}</h2>`;
  });
}

// Extract the article's H2 headings for the sidebar table-of-contents.
// Runs on the same rendered HTML so anchors match one-to-one.
function extractTocSections(html: string): TocSection[] {
  const sections: TocSection[] = [];
  let idx = 0;
  const re = /<h2 id="([^"]*)">([\s\S]*?)<\/h2>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    sections.push({ id: m[1], text, roman: ROMAN[idx] ?? String(idx + 1) });
    idx += 1;
  }
  return sections;
}

const posts: Post[] = Object.entries(modules)
  .map(([path, raw]) => {
    const parsed = parseFrontmatter(raw);
    const fm = parsed.data as PostFrontmatter;
    // Filename → slug fallback if not explicit in frontmatter.
    if (!fm.slug) {
      fm.slug = path.replace(/^.*\//, "").replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    }
    const bodyHtml = addHeadingIds(marked.parse(parsed.content) as string);
    return {
      ...fm,
      readingTime: fm.readingTime ?? estimateReadingTime(parsed.content),
      htmlBody: injectChapterMarkers(bodyHtml),
      tocSections: extractTocSections(bodyHtml),
      rawBody: parsed.content,
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function getAllPosts(): Post[] {
  return posts;
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getPostsByPillar(pillar: Pillar): Post[] {
  return posts.filter((p) => p.pillar === pillar);
}

export const PILLAR_LABELS: Record<Pillar, string> = {
  bookkeeping: "The bookkeeping firm playbook",
  quickbooks: "QuickBooks alternatives + platform pain",
  ar: "Getting paid",
  ap: "Paying bills + managing vendors",
};
