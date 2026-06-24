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
    // Arrays — accept ["a", "b"] or [a, b]
    else if (/^\[.*\]$/.test(s)) {
      value = s
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
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
};

export type Post = PostFrontmatter & {
  htmlBody: string;
  rawBody: string;
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

const posts: Post[] = Object.entries(modules)
  .map(([path, raw]) => {
    const parsed = parseFrontmatter(raw);
    const fm = parsed.data as PostFrontmatter;
    // Filename → slug fallback if not explicit in frontmatter.
    if (!fm.slug) {
      fm.slug = path.replace(/^.*\//, "").replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    }
    return {
      ...fm,
      readingTime: fm.readingTime ?? estimateReadingTime(parsed.content),
      htmlBody: addHeadingIds(marked.parse(parsed.content) as string),
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
