import { Helmet } from "react-helmet-async";
import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { WaitlistProvider } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { getPostBySlug, getPostsByPillar, PILLAR_LABELS } from "../blog/posts";
import "./BlogPost.css";

type Props = {
  slug: string;
};

export function BlogPost({ slug }: Props) {
  const post = getPostBySlug(slug);

  if (!post) {
    return <NotFound slug={slug} />;
  }

  const related = getPostsByPillar(post.pillar)
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "datePublished": post.date,
    "author": { "@type": "Organization", "name": "Porter", "url": "https://buildwithporter.com" },
    "publisher": {
      "@type": "Organization",
      "name": "Porter",
      "url": "https://buildwithporter.com",
      "logo": { "@type": "ImageObject", "url": "https://buildwithporter.com/porter-logo-500.png" },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://buildwithporter.com/blog/${post.slug}`,
    },
    ...(post.heroImage ? { "image": `https://buildwithporter.com${post.heroImage}` } : {}),
  };

  return (
    <WaitlistProvider>
      <Seo
        title={`${post.title} · Porter`}
        description={post.description}
        path={`/blog/${post.slug}`}
        image={post.heroImage ? `https://buildwithporter.com${post.heroImage}` : undefined}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(articleJsonLd)}
        </script>
      </Helmet>
      <Nav />
      <main className="blog-post">
        <article className="blog-post__article container">
          <header className="blog-post__head">
            <div className="blog-post__meta">
              <a className="blog-post__pillar" href="/blog">{PILLAR_LABELS[post.pillar]}</a>
              <span aria-hidden="true">·</span>
              <time>{formatDate(post.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readingTime} min read</span>
            </div>
            <h1 className="blog-post__title">{post.title}</h1>
            <p className="blog-post__lede">{post.description}</p>
          </header>

          <div className={`blog-post__hero blog-post__hero--${post.pillar}`}>
            {post.heroImage ? (
              <img src={post.heroImage} alt="" />
            ) : (
              <div className="blog-post__hero-fallback" aria-hidden="true">
                <span>{PILLAR_LABELS[post.pillar]}</span>
              </div>
            )}
          </div>

          <div
            className="blog-post__body"
            dangerouslySetInnerHTML={{ __html: post.htmlBody }}
          />

          <aside className="blog-post__cta">
            <div className="blog-post__cta-eyebrow">From Porter</div>
            <p className="blog-post__cta-body">
              Porter is the finance team for startups and small businesses that would rather spend their time on growth than on the books. We run your bookkeeping, AR, AP, payroll, and reporting as a managed service. You stay in command of your numbers through the Porter app, Slack, Claude, or email.
            </p>
            <a className="blog-post__cta-link" href="/">
              See how Porter works →
            </a>
          </aside>
        </article>

        {related.length > 0 ? (
          <section className="blog-post__related container">
            <h2 className="blog-post__related-title">More from {PILLAR_LABELS[post.pillar]}</h2>
            <ul className="blog-post__related-list">
              {related.map((p) => (
                <li key={p.slug}>
                  <a href={`/blog/${p.slug}`}>
                    <div className={`blog-post__related-thumb blog-post__related-thumb--${p.pillar}`}>
                      {p.thumbnail ? <img src={p.thumbnail} alt="" loading="lazy" /> : null}
                    </div>
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <Footer />
    </WaitlistProvider>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <WaitlistProvider>
      <Seo
        title="Note not found · Porter"
        description="That note isn't available."
        path={`/blog/${slug}`}
        robots="noindex"
      />
      <Nav />
      <main className="blog-post">
        <div className="blog-post__article container">
          <h1 className="blog-post__title">Note not found.</h1>
          <p className="blog-post__lede">
            That URL doesn't match any note we've published. <a href="/blog">See all notes →</a>
          </p>
        </div>
      </main>
      <Footer />
    </WaitlistProvider>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
