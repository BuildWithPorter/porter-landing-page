import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { WaitlistProvider } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { Reveal } from "../primitives/Reveal";
import { SectionTitle } from "../primitives/SectionTitle";
import { getAllPosts } from "../blog/posts";
import "./Blog.css";

export function Blog() {
  const posts = getAllPosts();

  return (
    <WaitlistProvider>
      <Seo
        title="The CFO Playbook · Porter"
        description="Plain-language writing on bookkeeping, accounting, AR, AP, and the parts of small-business finance nobody else explains honestly. The CFO playbook, from Porter."
        path="/blog"
      />
      <Nav />
      <main className="blog-index">
        <section className="blog-index__hero container">
          <Reveal>
            <SectionTitle
              text="The CFO Playbook."
              className="blog-index__title"
            />
          </Reveal>
        </section>

        <section className="blog-index__list container">
          <ul className="blog-index__posts">
            {posts.map((p) => (
              <li key={p.slug} className="blog-index__post">
                <a className="blog-index__post-link" href={`/blog/${p.slug}`}>
                  <div className={`blog-index__thumb blog-index__thumb--${p.pillar}`}>
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" loading="lazy" />
                    ) : (
                      <div className="blog-index__thumb-fallback" aria-hidden="true" />
                    )}
                  </div>
                  <div className="blog-index__post-body">
                    <div className="blog-index__post-meta">
                      <time>{formatDate(p.date)}</time>
                      <span aria-hidden="true">·</span>
                      <span>{p.readingTime} min read</span>
                    </div>
                    <h2 className="blog-index__post-title">{p.title}</h2>
                    <p className="blog-index__post-desc">{p.description}</p>
                    <span className="blog-index__post-cta">Read article →</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>

          {posts.length === 0 ? (
            <p className="blog-index__empty">No articles yet. First one ships shortly.</p>
          ) : null}
        </section>
      </main>
      <Footer />
    </WaitlistProvider>
  );
}

// IMPORTANT: parse the date string as local-noon so en-US toLocaleDateString
// doesn't shift the calendar day back when the user is in a US timezone
// (the bare "YYYY-MM-DD" form parses as UTC midnight, which renders as the
// previous day for any negative-offset locale).
function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
