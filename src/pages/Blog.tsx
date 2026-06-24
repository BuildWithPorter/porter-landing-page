import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { WaitlistProvider } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { Reveal } from "../primitives/Reveal";
import { SectionTitle } from "../primitives/SectionTitle";
import { getAllPosts, PILLAR_LABELS, type Pillar, type Post } from "../blog/posts";
import "./Blog.css";

export function Blog() {
  const posts = getAllPosts();

  // Group posts by pillar so the index reads as an editorial table of contents
  // rather than a flat reverse-chrono list.
  const byPillar: Record<Pillar, Post[]> = {
    bookkeeping: [],
    quickbooks: [],
    ar: [],
    ap: [],
  };
  for (const p of posts) byPillar[p.pillar].push(p);

  return (
    <WaitlistProvider>
      <Seo
        title="Blog · Porter"
        description="Inside other people's books. Plain-language writing about bookkeeping, accounting, AR, AP, and the parts of small-business finance nobody else explains honestly."
        path="/blog"
      />
      <Nav />
      <main className="blog-index">
        <section className="blog-index__hero container">
          <Reveal>
            <SectionTitle
              text="Field manual."
              className="blog-index__title"
            />
          </Reveal>
        </section>

        <section className="blog-index__list container">
          {(Object.keys(byPillar) as Pillar[])
            .filter((pillar) => byPillar[pillar].length > 0)
            .map((pillar) => (
              <div key={pillar} className="blog-index__pillar">
                <div className="blog-index__pillar-title">{PILLAR_LABELS[pillar]}</div>
                <ul className="blog-index__posts">
                  {byPillar[pillar].map((p) => (
                    <li key={p.slug} className="blog-index__post">
                      <a className="blog-index__post-link" href={`/blog/${p.slug}`}>
                        <div className={`blog-index__thumb blog-index__thumb--${p.pillar}`}>
                          {p.thumbnail ? (
                            <img src={p.thumbnail} alt="" loading="lazy" />
                          ) : (
                            <div className="blog-index__thumb-fallback" aria-hidden="true">
                              <span>{PILLAR_LABELS[p.pillar].split(" ")[0]}</span>
                            </div>
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
              </div>
            ))}

          {posts.length === 0 ? (
            <p className="blog-index__empty">No notes yet. First one ships shortly.</p>
          ) : null}
        </section>
      </main>
      <Footer />
    </WaitlistProvider>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
