import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description: string;
  /** Path relative to the canonical origin, e.g. "/careers". Defaults to "/". */
  path?: string;
  /** Override the default OG image URL (rare). */
  image?: string;
  /** Optional JSON-LD blob — pass any schema.org object the page needs. */
  jsonLd?: object | object[];
  /** Set to "noindex" for pages we don't want crawled (e.g. /deck). */
  robots?: string;
};

const ORIGIN = "https://buildwithporter.com";
const DEFAULT_IMAGE = `${ORIGIN}/og-image.png`;

/**
 * Per-page SEO + social block. Drops a full set of title / description /
 * canonical / OG / Twitter / optional JSON-LD into <head> via react-helmet-async.
 *
 * Mount once per page (top of the component tree under HelmetProvider) — it
 * overrides whatever defaults live in index.html.
 */
export function Seo({ title, description, path = "/", image, jsonLd, robots }: Props) {
  const url = `${ORIGIN}${path}`;
  const ogImage = image ?? DEFAULT_IMAGE;
  const ldArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {robots ? <meta name="robots" content={robots} /> : null}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Porter" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Optional JSON-LD blocks */}
      {ldArray.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}
