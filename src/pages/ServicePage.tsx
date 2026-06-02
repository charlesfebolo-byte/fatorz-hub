import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSeoServiceBySlug } from "../data/seoServices";

const BASE_URL = "https://fatorz-hub.vercel.app";
const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

function setMetaTag(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setPropertyTag(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setCanonical(url: string) {
  let link = document.querySelector(`link[rel="canonical"]`);

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

export default function ServicePage() {
  const navigate = useNavigate();
  const params = useParams();

  const slug =
    params.slug || window.location.pathname.replace("/", "").replace("servicos/", "");

  const service = getSeoServiceBySlug(slug);

  useEffect(() => {
    if (!service) return;

    const canonicalUrl = `${BASE_URL}${service.path}`;

    document.title = service.metaTitle;

    setMetaTag("description", service.metaDescription);
    setMetaTag("keywords", service.keywords.join(", "));
    setMetaTag("robots", "index, follow");

    setPropertyTag("og:title", service.metaTitle);
    setPropertyTag("og:description", service.metaDescription);
    setPropertyTag("og:url", canonicalUrl);
    setPropertyTag("og:type", "website");
    setPropertyTag("og:site_name", "FatorZ");

    setCanonical(canonicalUrl);
  }, [service]);

  function openInstagram() {
    window.open(INSTAGRAM_URL, "_blank");
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="max-w-xl rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">Serviço não encontrado</h1>

          <p className="mt-3 text-zinc-400">
            Essa página ainda não existe na estrutura SEO da FatorZ.
          </p>

          <button
            onClick={() => navigate("/servicos")}
            className="mt-6 rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
          >
            Ver serviços
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(0,92,255,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,0,150,0.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.14),transparent_34%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button
            onClick={() => navigate("/")}
            className="text-2xl md:text-3xl font-black tracking-tight text-white"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/servicos")}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Serviços
            </button>

            <button
              onClick={openInstagram}
              className="hidden rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 md:block"
            >
              Chamar FatorZ
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-black uppercase tracking-[0.28em] text-pink-500">
                {service.eyebrow}
              </p>

              <h1 className="max-w-5xl text-5xl font-black leading-tight md:text-7xl">
                {service.h1}
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-400">
                {service.intro}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={openInstagram}
                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-8 py-5 text-lg font-black text-white transition hover:opacity-90"
                >
                  Falar com a FatorZ
                </button>

                <button
                  onClick={() => navigate("/servicos")}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-5 text-lg font-black text-white transition hover:bg-white/10"
                >
                  Ver outros serviços
                </button>
              </div>
            </div>

            <aside className="rounded-[38px] border border-white/10 bg-black/60 p-6 md:p-8">
              <p className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-pink-400">
                Palavras-chave
              </p>

              <div className="flex flex-wrap gap-2">
                {service.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-zinc-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-black text-white">
                  Serviço FatorZ
                </p>

                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Página criada para explicar o serviço, responder dúvidas e
                  ajudar o Google a entender o que a FatorZ oferece.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
              <h2 className="text-2xl font-black">Problemas que resolvemos</h2>

              <ul className="mt-5 space-y-3">
                {service.problems.map((item) => (
                  <li key={item} className="flex gap-3 text-zinc-300">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pink-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
              <h2 className="text-2xl font-black">O que pode ser entregue</h2>

              <ul className="mt-5 space-y-3">
                {service.deliverables.map((item) => (
                  <li key={item} className="flex gap-3 text-zinc-300">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
              <h2 className="text-2xl font-black">Benefícios</h2>

              <ul className="mt-5 space-y-3">
                {service.benefits.map((item) => (
                  <li key={item} className="flex gap-3 text-zinc-300">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-purple-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-20">
          <div className="mb-8">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-pink-400">
              Dúvidas frequentes
            </p>

            <h2 className="text-4xl font-black">Perguntas sobre {service.title}</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {service.faq.map((item) => (
              <article
                key={item.question}
                className="rounded-[30px] border border-white/10 bg-black/50 p-6"
              >
                <h3 className="text-lg font-black">{item.question}</h3>

                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
          <div className="overflow-hidden rounded-[42px] border border-white/10 bg-black p-8 md:p-12 relative">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#ff0096]/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#005cff]/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <h2 className="text-4xl font-black leading-tight md:text-5xl">
                  {service.ctaTitle}
                </h2>

                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-zinc-400">
                  {service.ctaText}
                </p>
              </div>

              <button
                onClick={openInstagram}
                className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-8 py-5 text-lg font-black text-white transition hover:opacity-90"
              >
                Chamar no Instagram
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}