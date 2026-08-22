type MarkdownPage = {
  title: string;
  body: string[];
};

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=3600",
  Vary: "Accept, Accept-Encoding",
  Link: '</llms.txt>; rel="describedby"; type="text/markdown"',
};

const PAGES: Record<string, MarkdownPage> = {
  "/": {
    title: "Porter",
    body: [
      "> Porter is an AI-native bookkeeping, accounting, and finance workflow platform for startups and small businesses.",
      "",
      "## Primary Resources",
      "- [Developers](https://buildwithporter.com/developers): API, MCP, authentication, and agent integration resources",
      "- [llms.txt](https://buildwithporter.com/llms.txt): agent instructions and canonical links",
      "- [Sitemap](https://buildwithporter.com/sitemap.xml): public URL inventory",
      "- [Support](https://buildwithporter.com/support): human support channel",
    ],
  },
  "/developers": {
    title: "Porter Developers",
    body: [
      "> Developer resources for integrating with Porter's accounting workflow platform.",
      "",
      "## Agent Entrypoints",
      "- [OpenAPI](https://buildwithporter.com/openapi.json): REST schema and OAuth scopes",
      "- [API Docs](https://api.buildwithporter.com/docs): interactive documentation",
      "- [MCP Metadata](https://api.buildwithporter.com/.well-known/oauth-protected-resource/mcp): protected-resource metadata",
      "- [MCP Endpoint](https://api.buildwithporter.com/mcp): approved-client MCP surface",
      "- [llms.txt](https://buildwithporter.com/llms.txt): when-to-use guidance",
    ],
  },
  "/docs": {
    title: "Porter Docs",
    body: [
      "> Porter documentation entrypoint for agents and developers.",
      "",
      "## Canonical Docs",
      "- [Developers](https://buildwithporter.com/developers): API, MCP, authentication, and policy documentation",
      "- [OpenAPI](https://buildwithporter.com/openapi.json): REST schema",
      "- [API Docs](https://api.buildwithporter.com/docs): generated API reference",
    ],
  },
  "/support": {
    title: "Porter Support",
    body: [
      "> Support resources for Porter users and integrators.",
      "",
      "## Contact",
      "- [Support](mailto:support@buildwithporter.com): product and developer support",
      "- [Security](mailto:security@buildwithporter.com): security reporting",
    ],
  },
  "/security": {
    title: "Porter Security",
    body: [
      "> Security information and reporting channel for Porter.",
      "",
      "## Links",
      "- [Security page](https://buildwithporter.com/security): public security posture",
      "- [Security contact](mailto:security@buildwithporter.com): vulnerability reporting",
    ],
  },
};

function parseAcceptedMedia(accept: string) {
  return accept
    .split(",")
    .map((part) => {
      const [media = "", ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1] ?? "1") : 1;

      return {
        media: media.trim().toLowerCase(),
        q: Number.isFinite(q) ? q : 1,
      };
    })
    .filter((entry) => entry.media);
}

function markdownIsPreferred(accept: string) {
  if (!accept.trim() || accept.includes("*/*")) {
    return false;
  }

  const accepted = parseAcceptedMedia(accept);
  const markdownQ = Math.max(
    ...accepted
      .filter((entry) => entry.media === "text/markdown")
      .map((entry) => entry.q),
    0,
  );
  const htmlQ = Math.max(
    ...accepted
      .filter((entry) => entry.media === "text/html" || entry.media === "application/xhtml+xml")
      .map((entry) => entry.q),
    0,
  );

  return markdownQ > 0 && markdownQ >= htmlQ;
}

function normalizePath(url: URL) {
  const withoutTrailingSlash = url.pathname.replace(/\/+$/, "");
  return withoutTrailingSlash || "/";
}

function markdownResponse(page: MarkdownPage, status = 200) {
  // Reason: AcceptMarkdown clients need an actual Markdown variant plus Vary: Accept so CDN caches do not mix HTML and Markdown.
  return new Response(`# ${page.title}\n\n${page.body.join("\n")}\n`, {
    status,
    headers: MARKDOWN_HEADERS,
  });
}

function notAcceptable() {
  return new Response("Markdown is available with Accept: text/markdown.\n", {
    status: 406,
    headers: MARKDOWN_HEADERS,
  });
}

function notFound() {
  return markdownResponse(
    {
      title: "Porter 404",
      body: [
        "> The requested Porter URL was not found.",
        "",
        "## Where to look next",
        "- [Sitemap](https://buildwithporter.com/sitemap.xml): public page inventory",
        "- [llms.txt](https://buildwithporter.com/llms.txt): agent instructions and canonical links",
        "- [Developers](https://buildwithporter.com/developers): API, MCP, and authentication resources",
        "- [Support](https://buildwithporter.com/support): contact Porter support",
      ],
    },
    404,
  );
}

export default function handler(req: Request): Response {
  const accept = req.headers.get("accept") ?? "";

  if (!markdownIsPreferred(accept)) {
    return notAcceptable();
  }

  const path = normalizePath(new URL(req.url));
  const page = PAGES[path];

  return page ? markdownResponse(page) : notFound();
}

export const config = { runtime: "edge" };
