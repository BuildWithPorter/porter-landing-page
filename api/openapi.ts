const OPENAPI_URL = "https://api.buildwithporter.com/openapi.json";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Reason: Agents look for API schemas on the canonical domain, while the live schema is owned by the API service.
  const upstream = await fetch(OPENAPI_URL, {
    headers: { Accept: "application/json" },
  });
  const body = req.method === "HEAD" ? null : await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
      Link: '</llms.txt>; rel="describedby"; type="text/markdown", </developers>; rel="help"',
    },
  });
}

export const config = { runtime: "edge" };
