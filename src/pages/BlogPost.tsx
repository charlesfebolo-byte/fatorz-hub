import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import { blogPosts, getBlogPostBySlug } from "../data/blogPosts";

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPostBySlug(slug);

  useEffect(() => {
    if (!post) return;

    document.title = post.metaTitle;

    let metaDescription = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;

    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }

    metaDescription.content = post.metaDescription;

    const canonicalUrl = `https://fatorz-hub.vercel.app/blog/${post.slug}`;

    let canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = canonicalUrl;
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = blogPosts
    .filter(
      (item) => item.slug !== post.slug && item.category === post.category
    )
    .slice(0, 3);

  const fallbackRelatedPosts = blogPosts
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);

  const finalRelatedPosts =
    relatedPosts.length > 0 ? relatedPosts : fallbackRelatedPosts;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    author: {
      "@type": "Organization",
      name: "FatorZ",
    },
    publisher: {
      "@type": "Organization",
      name: "FatorZ",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://fatorz-hub.vercel.app/blog/${post.slug}`,
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-[#050506] text-white overflow-x-hidden">
      <SiteHeader />

      <main className="pt-28">
        <section className="relative border-b border-white/10 px-4 pb-14 pt-10 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-160px] top-0 h-80 w-80 rounded-full bg-[#ff0096]/20 blur-[110px]" />
            <div className="absolute right-[-140px] top-24 h-80 w-80 rounded-full bg-[#005cff]/20 blur-[110px]" />
          </div>

          <div className="relative mx-auto max-w-4xl">
            <Link
              to="/blog"
              className="mb-8 inline-flex text-sm font-black uppercase tracking-[0.18em] text-[#ff0096] hover:text-[#ff7ad0]"
            >
              ← Voltar ao blog
            </Link>

            <div className="mb-6 inline-flex rounded-full border border-[#ff0096]/40 bg-[#ff0096]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#ff7ad0]">
              {post.category}
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>

            <p className="mt-6 text-lg leading-8 text-white/70">
              {post.excerpt}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {post.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <article className="min-w-0">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_55px_rgba(0,92,255,0.08)] sm:p-8 lg:p-10">
                <p className="text-lg leading-9 text-white/75">
                  {post.intro}
                </p>

                <div className="mt-10 space-y-10">
                  {post.sections.map((section) => (
                    <section key={section.heading}>
                      <h2 className="text-2xl font-black tracking-tight text-white">
                        {section.heading}
                      </h2>

                      <p className="mt-4 text-base leading-8 text-white/68">
                        {section.content}
                      </p>
                    </section>
                  ))}
                </div>

                <div className="mt-12 rounded-[2rem] border border-[#ff0096]/25 bg-gradient-to-br from-[#ff0096]/12 via-white/[0.04] to-[#005cff]/12 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff7ad0]">
                    Próximo passo
                  </p>

                  <h2 className="mt-4 text-2xl font-black text-white">
                    {post.ctaTitle}
                  </h2>

                  <p className="mt-4 text-base leading-8 text-white/70">
                    {post.ctaText}
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to={post.relatedServicePath}
                      className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff0096] to-[#005cff] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_35px_rgba(255,0,150,0.3)] transition hover:scale-[1.02]"
                    >
                      Ver solução
                    </Link>

                    <Link
                      to="/servicos"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-black/30 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/80 transition hover:border-white/30"
                    >
                      Ver serviços
                    </Link>
                  </div>
                </div>

                <div className="mt-12">
                  <h2 className="text-2xl font-black text-white">
                    Perguntas frequentes
                  </h2>

                  <div className="mt-6 space-y-4">
                    {post.faq.map((item) => (
                      <details
                        key={item.question}
                        className="group rounded-2xl border border-white/10 bg-black/30 p-5"
                      >
                        <summary className="cursor-pointer list-none text-base font-black text-white">
                          {item.question}
                        </summary>

                        <p className="mt-4 text-sm leading-7 text-white/65">
                          {item.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7aa7ff]">
                  Caminho rápido
                </p>

                <div className="mt-5 space-y-3">
                  <Link
                    to={post.relatedServicePath}
                    className="block rounded-2xl border border-[#005cff]/25 bg-[#005cff]/10 p-4 text-sm font-bold text-white/80 transition hover:border-[#005cff]/60 hover:bg-[#005cff]/20"
                  >
                    Serviço relacionado →
                  </Link>

                  <Link
                    to="/servicos"
                    className="block rounded-2xl border border-white/10 bg-black/30 p-4 text-sm font-bold text-white/70 transition hover:border-white/25 hover:text-white"
                  >
                    Todos os serviços →
                  </Link>

                  <Link
                    to="/"
                    className="block rounded-2xl border border-white/10 bg-black/30 p-4 text-sm font-bold text-white/70 transition hover:border-white/25 hover:text-white"
                  >
                    Página inicial →
                  </Link>
                </div>
              </div>

              <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff7ad0]">
                  Leia também
                </p>

                <div className="mt-5 space-y-4">
                  {finalRelatedPosts.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/blog/${item.slug}`}
                      className="block rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-[#ff0096]/45 hover:bg-white/[0.05]"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">
                        {item.category}
                      </p>

                      <h3 className="mt-2 text-sm font-black leading-6 text-white">
                        {item.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </div>
  );
}