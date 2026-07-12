import { Head } from "vite-react-ssg";
import { useParams } from "react-router-dom";
import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { WaitlistProvider, useWaitlist } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { FaqCarousel } from "../components/FaqCarousel";
import { getPostBySlug, getPostsByPillar } from "../blog/posts";
import "./BlogPost.css";

// Wraps BlogPost's body so the useWaitlist hook can access the provider
// context. The provider itself lives one level up in the wrapping tree.
function FromPorterCta() {
  const { open } = useWaitlist();
  return (
    <aside className="blog-post__cta">
      <div className="blog-post__cta-eyebrow">From Porter</div>
      <p className="blog-post__cta-body">
        Porter is your finance team. We handle the bookkeeping, AR, AP, payroll, and month-end close, so you can spend your time on the business. And because Porter runs on modern software with full context about your books, you can ask any question about your numbers 24/7 (from the app, Slack, Claude, or email) and get an answer in seconds instead of waiting a week for your bookkeeper to reply.
      </p>
      <button type="button" className="blog-post__cta-link" onClick={open}>
        Sign up →
      </button>
    </aside>
  );
}

export function BlogPost() {
  const { slug = "" } = useParams<{ slug: string }>();
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

  // FAQPage schema — AI engines (ChatGPT search, Perplexity, Claude, Copilot,
  // Google AI Overviews) treat FAQPage as high-signal, citation-ready Q&A.
  // Only emitted when the article's frontmatter includes a `faqs` array.
  const faqJsonLd = post.faqs && post.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": post.faqs.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  } : null;

  return (
    <WaitlistProvider>
      <Seo
        title={`${post.title} · Porter`}
        description={post.description}
        path={`/blog/${post.slug}`}
        image={post.heroImage ? `https://buildwithporter.com${post.heroImage}` : undefined}
      />
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(articleJsonLd)}
        </script>
        {faqJsonLd ? (
          <script type="application/ld+json">
            {JSON.stringify(faqJsonLd)}
          </script>
        ) : null}
      </Head>
      <Nav />
      <main className="blog-post">
        <article className="blog-post__article">
          <header className="blog-post__head">
            <div className="blog-post__meta">
              <a className="blog-post__pillar" href="/blog">The CFO Playbook</a>
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
                <span>The CFO Playbook</span>
              </div>
            )}
          </div>

          <div className="blog-post__body-wrap">
            <div className="blog-post__body-column">
              <div
                className="blog-post__body"
                dangerouslySetInnerHTML={{ __html: post.htmlBody }}
              />

              {post.faqs && post.faqs.length > 0 ? (
                <section className="blog-post__faq">
                  <div className="blog-post__faq-eyebrow">Addenda</div>
                  <h2 className="blog-post__faq-title">Common questions</h2>
                  <FaqCarousel faqs={post.faqs} />
                </section>
              ) : null}

              <FromPorterCta />
            </div>

            {post.tocSections && post.tocSections.length > 0 ? (
              <aside className="blog-post__toc" aria-label="Table of contents">
                <div className="blog-post__toc-label">Contents</div>
                <ol className="blog-post__toc-list">
                  {post.tocSections.map((s) => (
                    <li key={s.id} className="blog-post__toc-item">
                      <span className="blog-post__toc-num">{s.roman}</span>
                      <a className="blog-post__toc-link" href={`#${s.id}`}>{s.text}</a>
                    </li>
                  ))}
                </ol>
              </aside>
            ) : null}
          </div>
        </article>

        {related.length > 0 ? (
          <section className="blog-post__related">
            <h2 className="blog-post__related-title">More from The CFO Playbook.</h2>
            <ul className="blog-post__related-list">
              {related.map((p) => {
                const image = p.thumbnail ?? p.heroImage;
                return (
                  <li key={p.slug}>
                    <a href={`/blog/${p.slug}`}>
                      <div className={`blog-post__related-thumb blog-post__related-thumb--${p.pillar}`}>
                        {image ? <img src={image} alt="" loading="lazy" /> : null}
                      </div>
                      <h3>{p.title}</h3>
                      <p className="blog-post__related-desc">{p.description}</p>
                      <p className="blog-post__related-meta">{p.readingTime} min read</p>
                    </a>
                  </li>
                );
              })}
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

// Parse as local noon to avoid timezone-shift to previous calendar day.
// See Blog.tsx formatDate comment for full explanation.
function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
