import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import { blogPosts } from "../data/blogPosts";

export default function Blog() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    document.title = "Blog FatorZ | Marketing Digital, Instagram, Sites e Conteúdo";

    const description =
      "Conteúdos da FatorZ sobre marketing digital, Instagram, landing pages, identidade visual, reels, presença digital e crescimento de marcas.";

    let metaDescription = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;

    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }

    metaDescription.content = description;
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(blogPosts.map((post) => post.category))
    );

    return ["Todos", ...uniqueCategories];
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return blogPosts.filter((post) => {
      const matchesCategory =
        selectedCategory === "Todos" || post.category === selectedCategory;

      const searchableText = [
        post.title,
        post.excerpt,
        post.category,
        post.metaDescription,
        ...post.keywords,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  const featuredPosts = blogPosts.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#050506] text-white overflow-x-hidden">
      <SiteHeader />

      <main className="pt-28">
        <section className="relative border-b border-white/10 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-140px] top-10 h-72 w-72 rounded-full bg-[#ff0096]/20 blur-[100px]" />
            <div className="absolute right-[-120px] top-24 h-80 w-80 rounded-full bg-[#005cff]/20 blur-[110px]" />
            <div className="absolute bottom-[-160px] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#9123ff]/20 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="mb-8 inline-flex rounded-full border border-[#ff0096]/40 bg-[#ff0096]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-[#ff7ad0]">
              Blog FatorZ
            </div>

            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Marketing digital explicado sem enrolação.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                  Conteúdos para quem quer melhorar Instagram, presença digital,
                  landing pages, identidade visual, reels, posicionamento e
                  estrutura de marca.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/servicos"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff0096] to-[#005cff] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_35px_rgba(255,0,150,0.35)] transition hover:scale-[1.02]"
                  >
                    Ver serviços
                  </Link>

                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/80 transition hover:border-white/30 hover:bg-white/[0.08]"
                  >
                    Voltar ao início
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_50px_rgba(0,92,255,0.12)] backdrop-blur">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#ff7ad0]">
                  Conteúdo com função
                </p>

                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <strong className="text-white">Atrair</strong>
                    <p className="mt-1 text-sm text-white/60">
                      Artigos para responder dúvidas reais do público.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <strong className="text-white">Gerar confiança</strong>
                    <p className="mt-1 text-sm text-white/60">
                      Explicações que mostram autoridade sem parecer forçado.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <strong className="text-white">Levar para ação</strong>
                    <p className="mt-1 text-sm text-white/60">
                      Cada artigo aponta para um serviço ou solução da FatorZ.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#7aa7ff]">
                  Destaques
                </p>
                <h2 className="mt-3 text-3xl font-black text-white">
                  Comece por estes conteúdos
                </h2>
              </div>

              <p className="max-w-xl text-sm leading-7 text-white/60">
                Os primeiros artigos foram pensados para atacar produtos,
                planos e serviços principais da FatorZ.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {featuredPosts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-[#ff0096]/50 hover:bg-white/[0.07] hover:shadow-[0_0_45px_rgba(255,0,150,0.16)]"
                >
                  <div className="mb-5 inline-flex rounded-full border border-[#005cff]/40 bg-[#005cff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8bb0ff]">
                    {post.category}
                  </div>

                  <h3 className="text-xl font-black leading-tight text-white group-hover:text-[#ff7ad0]">
                    {post.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-white/60">
                    {post.excerpt}
                  </p>

                  <div className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[#ff0096]">
                    Ler artigo →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#ff7ad0]">
                  Todos os artigos
                </p>
                <h2 className="mt-3 text-3xl font-black text-white">
                  Biblioteca FatorZ
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por Instagram, reels, landing page..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#ff0096]/60"
                />

                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#111116] px-5 py-3 text-sm font-bold text-white outline-none focus:border-[#005cff]/60"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
                <p className="text-white/70">
                  Nenhum artigo encontrado com esse filtro.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => (
                  <article
                    key={post.slug}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#9123ff]/50 hover:bg-white/[0.07]"
                  >
                    <div className="mb-5 inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                      {post.category}
                    </div>

                    <h3 className="text-lg font-black leading-tight text-white">
                      {post.title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-white/60">
                      {post.excerpt}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {post.keywords.slice(0, 3).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/45"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>

                    <Link
                      to={`/blog/${post.slug}`}
                      className="mt-6 inline-flex text-sm font-black uppercase tracking-[0.18em] text-[#ff0096] hover:text-[#ff7ad0]"
                    >
                      Ler agora →
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}