import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ProductCard, { getCategoryLabel } from "../components/ProductCard";
import type { SiteProduct } from "../components/ProductCard";

const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

const categoryDescriptions: Record<string, string> = {
  assessoria:
    "Acompanhamento mensal para presença digital, conteúdo, posicionamento e direção estratégica.",
  "servicos-unicos":
    "Entregas pontuais para resolver uma necessidade específica da sua marca.",
  sites:
    "Sites, landing pages e páginas de venda para apresentar, captar e converter.",
  identidade:
    "Identidade, posicionamento e percepção visual para sua marca parecer mais forte.",
  academy:
    "Cursos digitais para aprender e aplicar no seu ritmo.",
};

const categoryOrder = [
  "assessoria",
  "servicos-unicos",
  "sites",
  "identidade",
  "academy",
];

const onlineDemandAreas = [
  "Criação de sites",
  "Landing pages",
  "Páginas de venda",
  "Gestão de Instagram",
  "Artes para feed",
  "Carrosséis estratégicos",
  "Stories comerciais",
  "Edição de reels",
  "Roteiros para vídeos",
  "Legenda com SEO",
  "Identidade visual",
  "Bio otimizada",
  "Diagnóstico de perfil",
  "Marketing para negócios locais",
  "Marketing para barbeiros",
  "Estrutura de oferta",
  "Link da bio",
  "Criativos para campanhas",
];

function sortProducts(products: SiteProduct[]) {
  return [...products].sort((a, b) => {
    const featuredA = a.is_featured ? 1 : 0;
    const featuredB = b.is_featured ? 1 : 0;

    if (featuredA !== featuredB) return featuredB - featuredA;

    return Number(a.order_index || 999) - Number(b.order_index || 999);
  });
}

export default function Services() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<SiteProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("assessoria");
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
      console.log("Erro ao carregar produtos em Serviços:", error);
      setProducts([]);
      return;
    }

    const activeProducts = data || [];
    setProducts(activeProducts);

    const firstAvailableCategory =
      categoryOrder.find((category) =>
        activeProducts.some((product) => product.category === category)
      ) || activeProducts[0]?.category;

    if (firstAvailableCategory) {
      setSelectedCategory(firstAvailableCategory);
    }
  }

  const groupedProducts = useMemo(() => {
    const grouped: Record<string, SiteProduct[]> = {};

    products.forEach((product) => {
      if (!grouped[product.category]) grouped[product.category] = [];
      grouped[product.category].push(product);
    });

    Object.keys(grouped).forEach((category) => {
      grouped[category] = sortProducts(grouped[category]);
    });

    return grouped;
  }, [products]);

  const visibleCategories = useMemo(() => {
    const ordered = categoryOrder.filter(
      (category) => groupedProducts[category]?.length
    );

    const extraCategories = Object.keys(groupedProducts).filter(
      (category) => !categoryOrder.includes(category)
    );

    return [...ordered, ...extraCategories];
  }, [groupedProducts]);

  const selectedProducts = groupedProducts[selectedCategory] || [];
  const featuredProduct = products.find((product) => product.is_featured);
  const totalProducts = products.length;

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
            <a
              href="/"
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Início
            </a>

            <a
              href="/blog"
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Blog
            </a>

            <a
              href="/mapa-do-site"
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Mapa
            </a>

            <a
              href="/academy"
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Academy
            </a>
          </nav>

          <button
            onClick={openInstagram}
            className="fz-shine-btn px-5 py-3 text-sm md:px-6"
          >
            @fatorzhouse
          </button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="fz-reveal mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 backdrop-blur-xl">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_18px_rgba(255,0,150,0.9)]" />
                <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-300">
                  Central de soluções digitais
                </p>
              </div>

              <h1 className="mb-6 max-w-[850px] text-5xl font-black leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
                Serviços online para transformar{" "}
                <span className="bg-gradient-to-r from-white via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
                  presença em escolha.
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
                A FatorZ organiza conteúdo, sites, landing pages, Instagram,
                identidade visual, edição, posicionamento e estrutura digital
                para negócios que precisam parecer mais profissionais e vender
                com mais clareza.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() =>
                    document
                      .getElementById("produtos")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="fz-shine-btn px-7 py-4 text-base"
                >
                  Ver soluções
                </button>

                <button
                  onClick={openInstagram}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-4 text-base font-black text-white transition hover:border-pink-500/30 hover:bg-white/10"
                >
                  Pedir indicação
                </button>
              </div>
            </div>

            <aside className="rounded-[36px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_90px_rgba(80,20,180,0.18)] backdrop-blur-2xl md:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-pink-400">
                    FatorZ Hub
                  </p>

                  <h2 className="mt-2 text-3xl font-black leading-tight">
                    Escolha pelo objetivo.
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-blue-500 text-xl font-black shadow-[0_0_32px_rgba(236,72,153,0.25)]">
                  Z
                </div>
              </div>

              <div className="space-y-3">
                {visibleCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={[
                      "w-full rounded-3xl border p-4 text-left transition",
                      selectedCategory === category
                        ? "border-pink-500/55 bg-pink-500/[0.08]"
                        : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <strong className="block text-lg font-black text-white">
                          {getCategoryLabel(category)}
                        </strong>

                        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                          {categoryDescriptions[category] ||
                            "Soluções digitais FatorZ."}
                        </span>
                      </div>

                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-black text-zinc-300">
                        {groupedProducts[category]?.length || 0}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-black/25 p-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Ativos
                  </p>
                  <p className="mt-1 text-xl font-black">{totalProducts}</p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Categorias
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {visibleCategories.length}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Destaque
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {featuredProduct?.name || "FatorZ"}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="produtos" className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="mb-7 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
              Produtos disponíveis
            </p>

            <h2 className="text-3xl font-black tracking-tight md:text-5xl">
              {getCategoryLabel(selectedCategory)}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
              {categoryDescriptions[selectedCategory] ||
                "Produtos conectados ao Hub, com checkout e entrega organizada para melhorar sua presença digital."}
            </p>
          </div>

          {loadingProducts ? (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-8 text-zinc-400">
              Carregando soluções...
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {selectedProducts.map((product) => (
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

        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[36px] border border-white/10 bg-white/[0.035] p-7 md:p-9">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
                SEO real
              </p>

              <h2 className="text-4xl font-black leading-tight tracking-tight">
                Não é só uma lista de serviços. É uma estrutura para ser
                encontrado.
              </h2>

              <p className="mt-5 text-sm leading-relaxed text-zinc-400">
                Essa página concentra serviços digitais, marketing online,
                criação de conteúdo, sites, landing pages, Instagram, design,
                vídeo e posicionamento para atrair quem procura uma solução
                online, mesmo sem saber ainda o nome exato do serviço.
              </p>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white/[0.035] p-7 md:p-9">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                A FatorZ pode ajudar em
              </p>

              <div className="flex flex-wrap gap-2">
                {onlineDemandAreas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-pink-500/35 hover:text-white"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
          <div className="rounded-[40px] border border-pink-500/20 bg-[radial-gradient(circle_at_12%_0%,rgba(236,72,153,0.18),transparent_32%),radial-gradient(circle_at_90%_40%,rgba(59,130,246,0.18),transparent_34%),rgba(255,255,255,0.035)] p-7 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-300">
                  Direção antes de estética
                </p>

                <h2 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
                  Não sabe qual serviço escolher?
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  Me chama no direct. Eu te digo se faz mais sentido começar
                  por Instagram, landing page, conteúdo, identidade, diagnóstico
                  ou uma entrega pontual.
                </p>
              </div>

              <button
                onClick={openInstagram}
                className="fz-shine-btn px-8 py-4 text-base"
              >
                Pedir indicação
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}