import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { seoServices } from "../data/seoServices";

const BASE_URL = "https://fatorz-hub.vercel.app";

function setMetaTag(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
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

export default function Services() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Serviços da FatorZ | Marketing Digital, Reels, Sites e Instagram";

    setMetaTag(
      "description",
      "Conheça os serviços da FatorZ: marketing digital, edição de reels, artes para Instagram, landing pages, identidade visual, gestão de Instagram e marketing para pequenos negócios."
    );

    setCanonical(`${BASE_URL}/servicos`);
  }, []);

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

          <button
            onClick={() => navigate("/")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
        <section className="mb-12">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-pink-500">
            Serviços FatorZ
          </p>

          <h1 className="max-w-5xl text-5xl font-black leading-tight md:text-7xl">
            Soluções digitais para sua marca parecer pronta para ser escolhida.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-400">
            A FatorZ trabalha com marketing digital, conteúdo, Instagram,
            landing pages, identidade visual e estrutura digital para marcas,
            profissionais e pequenos negócios.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {seoServices.map((service) => (
            <article
              key={service.slug}
              className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-1 hover:border-pink-500/40"
            >
              <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                {service.eyebrow}
              </p>

              <h2 className="text-2xl font-black">{service.title}</h2>

              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                {service.metaDescription}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {service.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-bold text-zinc-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              <button
                onClick={() => navigate(service.path)}
                className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:bg-zinc-200"
              >
                Ver serviço
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}