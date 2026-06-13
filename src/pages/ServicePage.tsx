import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getSeoServiceBySlug, seoServices } from "../data/seoServices";
import ProductCard from "../components/ProductCard";
import type { SiteProduct } from "../components/ProductCard";

const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

const productMatchBySlug: Record<string, string[]> = {
  "agencia-de-marketing-digital": [
    "assessoria",
    "marketing",
    "diagnostic",
    "branding",
    "site",
    "subscription",
    "instagram",
  ],
  "edicao-de-reels": ["reels", "vídeo", "video", "edição", "edicao", "roteiro"],
  "criacao-de-artes-para-instagram": [
    "arte",
    "artes",
    "feed",
    "post",
    "instagram",
    "criativo",
    "carrossel",
    "stories",
  ],
  "landing-page": ["landing", "site", "page", "página", "pagina", "venda"],
  "identidade-visual": [
    "identidade",
    "visual",
    "branding",
    "marca",
    "posicionamento",
  ],
  "gestao-de-instagram": [
    "gestão",
    "gestao",
    "instagram",
    "assessoria",
    "mensal",
    "subscription",
    "perfil",
  ],
  "marketing-para-barbeiros": [
    "barbeiro",
    "barbearia",
    "landing",
    "site",
    "instagram",
    "arte",
  ],
  "agencia-de-marketing-em-pelotas": [
    "assessoria",
    "marketing",
    "site",
    "landing",
    "instagram",
    "diagnostic",
    "local",
  ],
};

const seoIntentions = [
  {
    title: "Serviços online",
    text: "Para quem procura uma solução digital, mesmo sem saber se precisa de site, conteúdo, design, Instagram, landing page ou estrutura de oferta.",
  },
  {
    title: "Presença digital",
    text: "Para marcas que querem parecer mais confiáveis quando alguém encontra o perfil, recebe um link ou pesquisa pelo serviço.",
  },
  {
    title: "Conteúdo e conversão",
    text: "Para transformar postagens, vídeos, artes, páginas e CTAs em um caminho mais claro até o atendimento ou compra.",
  },
];

const digitalScopes = [
  "site profissional",
  "landing page",
  "página de venda",
  "Instagram comercial",
  "gestão de Instagram",
  "conteúdo estratégico",
  "edição de reels",
  "artes para feed",
  "carrossel",
  "stories",
  "identidade visual",
  "posicionamento digital",
  "bio otimizada",
  "link da bio",
  "checkout",
  "oferta online",
  "marketing local",
  "negócio digital",
  "serviço online",
  "presença profissional",
];

function normalize(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sortProducts(products: SiteProduct[]) {
  return [...products].sort((a, b) => {
    const featuredA = a.is_featured ? 1 : 0;
    const featuredB = b.is_featured ? 1 : 0;

    if (featuredA !== featuredB) return featuredB - featuredA;

    return Number(a.order_index || 999) - Number(b.order_index || 999);
  });
}

export default function ServicePage() {
  const navigate = useNavigate();
  const params = useParams();

  const slug =
    params.slug ||
    window.location.pathname.replace("/", "").replace("servicos/", "");

  const service = getSeoServiceBySlug(slug);

  const [products, setProducts] = useState<SiteProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("site_products")
      .select("*")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    setLoadingProducts(false);

    if (error) {
      console.log("Erro ao carregar produtos na página SEO:", error);
      setProducts([]);
      return;
    }

    setProducts(data || []);
  }

  const relatedProducts = useMemo(() => {
    if (!service) return [];

    const matchWords = productMatchBySlug[service.slug] || [];

    const scored = products.map((product) => {
      const searchable = normalize(
        [
          product.name,
          product.slug,
          product.subtitle,
          product.description,
          product.category,
          product.product_type,
          product.badge,
          product.notes,
        ].join(" ")
      );

      let score = 0;

      matchWords.forEach((word) => {
        if (searchable.includes(normalize(word))) score += 2;
      });

      service.keywords.forEach((keyword) => {
        if (searchable.includes(normalize(keyword))) score += 1;
      });

      if (product.is_featured) score += 1;

      return { product, score };
    });

    const matched = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product);

    if (matched.length) return sortProducts(matched).slice(0, 6);

    return sortProducts(products).slice(0, 6);
  }, [products, service]);

  function openInstagram() {
    window.open(INSTAGRAM_URL, "_blank");
  }

  function handleBuy(product: SiteProduct) {
    setBuyingId(product.id);

    if (product.checkout_provider === "manual") {
      openInstagram();
      setBuyingId(null);
      return;
    }

    if (product.checkout_provider === "external") {
      if (!product.external_payment_url) {
        alert("Esse produto está com checkout externo, mas não tem link cadastrado.");
        setBuyingId(null);
        return;
      }

      window.open(product.external_payment_url, "_blank");
      setBuyingId(null);
      return;
    }

    if (product.product_type === "course" && product.course_id) {
      navigate(`/checkout/academy?courseId=${product.course_id}`);
      setBuyingId(null);
      return;
    }

    navigate(`/checkout/produto?slug=${product.slug}`);
    setBuyingId(null);
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

  const otherServices = seoServices
    .filter((item) => item.path !== service.path)
    .slice(0, 6);

  return (
    <div className="fz-grid-bg min-h-screen bg-[#050506] text-white overflow-x-hidden">
      <div className="fz-space-orbs" aria-hidden="true" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <button
            onClick={() => navigate("/")}
            className="group relative shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-2xl font-black tracking-tight text-white shadow-[0_0_28px_rgba(236,72,153,0.08)] transition hover:scale-[1.02] hover:border-pink-500/30 md:text-3xl"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1.5 text-sm font-black backdrop-blur-xl lg:flex">
            <button
              onClick={() => navigate("/")}
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Início
            </button>

            <button
              onClick={() => navigate("/servicos")}
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Serviços
            </button>

            <button
              onClick={() => navigate("/blog")}
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Blog
            </button>
          </nav>

          <button
            onClick={openInstagram}
            className="fz-shine-btn px-5 py-3 text-sm md:px-6"
          >
            Chamar FatorZ
          </button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="fz-reveal mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <button
                onClick={() => navigate("/servicos")}
                className="mb-6 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                ← Voltar para soluções
              </button>

              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 backdrop-blur-xl">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_18px_rgba(255,0,150,0.9)]" />
                <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-300">
                  {service.eyebrow}
                </p>
              </div>

              <h1 className="mb-6 max-w-[850px] text-5xl font-black leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
                {service.h1}
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
                {service.intro}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() =>
                    document
                      .getElementById("produtos-relacionados")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="fz-shine-btn px-7 py-4 text-base"
                >
                  Ver soluções e preços
                </button>

                <button
                  onClick={openInstagram}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-4 text-base font-black text-white transition hover:border-pink-500/30 hover:bg-white/10"
                >
                  Pedir recomendação
                </button>
              </div>
            </div>

            <aside className="rounded-[36px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_90px_rgba(80,20,180,0.18)] backdrop-blur-2xl md:p-7">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
                O que trava a escolha
              </p>

              <h2 className="text-3xl font-black leading-tight">
                O cliente precisa entender rápido por que confiar.
              </h2>

              <div className="mt-6 space-y-3">
                {service.problems.map((problem) => (
                  <div
                    key={problem}
                    className="rounded-3xl border border-white/10 bg-black/25 p-4"
                  >
                    <p className="text-sm leading-relaxed text-zinc-400">
                      <span className="mr-2 text-pink-400">●</span>
                      {problem}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section
          id="produtos-relacionados"
          className="mx-auto max-w-7xl px-4 pb-16 md:px-8"
        >
          <div className="mb-7 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
              Produtos conectados ao serviço
            </p>

            <h2 className="text-3xl font-black tracking-tight md:text-5xl">
              Soluções da FatorZ para {service.title}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Produtos puxados do mesmo Hub da landing principal, com valores,
              imagens, benefícios e checkout conectados ao sistema.
            </p>
          </div>

          {loadingProducts ? (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-8 text-zinc-400">
              Carregando soluções...
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {relatedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onBuy={handleBuy}
                  buying={buyingId === product.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {seoIntentions.map((item) => (
              <article
                key={item.title}
                className="rounded-[32px] border border-white/10 bg-white/[0.035] p-7"
              >
                <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
                  Intenção de busca
                </p>

                <h2 className="text-2xl font-black tracking-tight">
                  {item.title}
                </h2>

                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[36px] border border-white/10 bg-white/[0.035] p-7 md:p-9">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
                Escopo digital
              </p>

              <h2 className="text-4xl font-black leading-tight tracking-tight">
                Se é online e ajuda sua marca a vender melhor, a FatorZ pode
                estruturar.
              </h2>

              <p className="mt-5 text-sm leading-relaxed text-zinc-400">
                A ideia não é limitar sua marca a um único formato. Podemos
                começar por uma entrega pontual, um plano mensal, uma página,
                uma identidade, um conteúdo ou uma estrutura completa de
                presença digital.
              </p>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white/[0.035] p-7 md:p-9">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                Termos e necessidades relacionadas
              </p>

              <div className="flex flex-wrap gap-2">
                {[...service.keywords, ...digitalScopes].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-pink-500/35 hover:text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[36px] border border-white/10 bg-white/[0.035] p-7 md:p-9">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
                Entregas possíveis
              </p>

              <h2 className="mb-6 text-3xl font-black tracking-tight">
                O que pode entrar no projeto
              </h2>

              <div className="space-y-3">
                {service.deliverables.map((item) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-relaxed text-zinc-300"
                  >
                    <span className="mr-2 text-pink-400">✦</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white/[0.035] p-7 md:p-9">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-blue-300">
                Resultado esperado
              </p>

              <h2 className="mb-6 text-3xl font-black tracking-tight">
                O que muda na percepção
              </h2>

              <div className="space-y-3">
                {service.benefits.map((item) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-relaxed text-zinc-300"
                  >
                    <span className="mr-2 text-blue-300">◆</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="mb-7">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
              Perguntas frequentes
            </p>

            <h2 className="text-4xl font-black tracking-tight">
              Antes de contratar
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {service.faq.map((item) => (
              <article
                key={item.question}
                className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6"
              >
                <h3 className="text-xl font-black leading-tight">
                  {item.question}
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.035] p-7 md:p-9">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
              Outras soluções FatorZ
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {otherServices.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="rounded-[26px] border border-white/10 bg-black/25 p-5 text-left transition hover:border-pink-500/35 hover:bg-pink-500/[0.06]"
                >
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-pink-400">
                    {item.eyebrow}
                  </p>

                  <h3 className="text-xl font-black">{item.title}</h3>

                  <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                    {item.metaDescription}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
          <div className="rounded-[40px] border border-pink-500/20 bg-[radial-gradient(circle_at_12%_0%,rgba(236,72,153,0.18),transparent_32%),radial-gradient(circle_at_90%_40%,rgba(59,130,246,0.18),transparent_34%),rgba(255,255,255,0.035)] p-7 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-300">
                  Próximo passo
                </p>

                <h2 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
                  {service.ctaTitle}
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  {service.ctaText}
                </p>
              </div>

              <button
                onClick={openInstagram}
                className="fz-shine-btn px-8 py-4 text-base"
              >
                Chamar no direct
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}