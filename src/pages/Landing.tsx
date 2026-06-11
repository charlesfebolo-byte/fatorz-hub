import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

type SiteProduct = {
  id: number;
  created_at: string;
  updated_at: string | null;

  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;

  category: string;
  product_type: string;

  price_cents: number;
  old_price_cents: number | null;

  is_active: boolean | null;
  is_featured: boolean | null;
  order_index: number | null;

  image_url: string | null;
  badge: string | null;

  checkout_provider: string | null;
  external_payment_url: string | null;

  accepts_pix: boolean | null;
  accepts_boleto: boolean | null;
  accepts_card: boolean | null;

  appmax_sku: string | null;
  appmax_product_name: string | null;

  course_id: number | null;

  notes: string | null;
};

const categoryLabels: Record<string, string> = {
  assessoria: "Assessoria Mensal",
  "servicos-unicos": "Serviços Únicos",
  sites: "Sites e Landing Pages",
  identidade: "Identidade e Posicionamento",
  academy: "Academy",
};

const categoryDescriptions: Record<string, string> = {
  assessoria:
    "Acompanhamento contínuo para organizar presença digital, conteúdo, posicionamento e direção de crescimento.",
  "servicos-unicos":
    "Soluções pontuais para resolver partes específicas do seu Instagram, conteúdo ou comunicação.",
  sites:
    "Páginas profissionais para transformar visitas em contatos, clientes e oportunidades.",
  identidade:
    "Produtos para deixar sua marca mais clara, profissional e pronta para ser escolhida.",
  academy:
    "Cursos digitais com acesso vitalício para você aprender e aplicar no seu ritmo.",
};

const categoryOrder = [
  "assessoria",
  "servicos-unicos",
  "sites",
  "identidade",
  "academy",
];

function formatMoney(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getCategoryLabel(category: string) {
  return categoryLabels[category] || category;
}

function getCategoryDescription(category: string) {
  return (
    categoryDescriptions[category] ||
    "Soluções FatorZ para melhorar sua presença digital."
  );
}

function getDeliveryType(product: SiteProduct) {
  if (product.product_type === "subscription") return "Mensal";
  if (product.product_type === "course") return "Acesso vitalício";
  if (product.product_type === "site") return "Projeto único";
  if (product.product_type === "branding") return "Entrega estratégica";
  if (product.product_type === "diagnostic") return "Diagnóstico";
  return "Entrega única";
}

function getProductBenefits(product: SiteProduct) {
  const customBenefits = String(product.notes || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (customBenefits.length) return customBenefits;

  if (product.product_type === "course") {
    return [
      "Acesso individual vinculado à sua conta",
      "Conteúdo organizado dentro da FatorZ Academy",
      "Compra única, sem mensalidade",
      "Ideal para aprender e aplicar no seu ritmo",
    ];
  }

  if (product.product_type === "subscription") {
    return [
      "Acompanhamento recorrente",
      "Direção de presença digital",
      "Organização de conteúdo e posicionamento",
      "Estrutura para crescer com consistência",
    ];
  }

  if (product.product_type === "site") {
    return [
      "Estrutura profissional para apresentar sua marca",
      "Página pensada para gerar ação",
      "Visual alinhado ao posicionamento",
      "Ideal para campanhas, serviços e conversão",
    ];
  }

  if (product.product_type === "branding") {
    return [
      "Mais clareza na percepção da marca",
      "Direção visual e estratégica",
      "Organização da mensagem",
      "Perfil mais profissional e memorável",
    ];
  }

  if (product.product_type === "diagnostic") {
    return [
      "Análise rápida do perfil",
      "Identificação dos principais gargalos",
      "Direção clara para o próximo passo",
      "Ideal para parar de postar no escuro",
    ];
  }

  return [
    "Entrega pontual e objetiva",
    "Solução prática para melhorar sua presença",
    "Aplicação direta no Instagram ou marca",
    "Direção profissional da FatorZ",
  ];
}

function PaymentBadges({ product }: { product: SiteProduct }) {
  const badges = [];

  if (product.accepts_pix) badges.push("Pix");
  if (product.accepts_boleto) badges.push("Boleto");
  if (product.accepts_card) badges.push("Cartão");

  if (!badges.length) badges.push("Manual");

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

export default function Landing() {
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
      console.log("Erro ao carregar produtos da Landing:", error);
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
      if (!grouped[product.category]) {
        grouped[product.category] = [];
      }

      grouped[product.category].push(product);
    });

    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        const featuredA = a.is_featured ? 1 : 0;
        const featuredB = b.is_featured ? 1 : 0;

        if (featuredA !== featuredB) return featuredB - featuredA;

        return Number(a.order_index || 999) - Number(b.order_index || 999);
      });
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

  const totalProducts = products.length;
  const featuredProduct = products.find((product) => product.is_featured);
  const firstSelectedProduct = selectedProducts[0];

  function openInstagram() {
    window.open(INSTAGRAM_URL, "_blank");
  }

  function scrollToProducts() {
    const section = document.getElementById("produtos");
    section?.scrollIntoView({ behavior: "smooth" });
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
            <span className="relative z-10">
              Fator<span className="text-pink-500">Z</span>
            </span>
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-pink-500/10 to-transparent opacity-0 transition group-hover:opacity-100" />
          </button>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1.5 text-sm font-black backdrop-blur-xl lg:flex">
            <button
              onClick={scrollToProducts}
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Soluções
            </button>

            <button
              onClick={() => navigate("/academy")}
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Academy
            </button>

            <button
              onClick={() => navigate("/minhas-entregas")}
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Entregas
            </button>

            <button
              onClick={openInstagram}
              className="rounded-full px-4 py-2.5 text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              Contato
            </button>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => navigate("/login")}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/10 md:px-6"
            >
              Entrar
            </button>

            <button
              onClick={openInstagram}
              className="fz-shine-btn hidden px-5 py-3 text-sm md:px-6 lg:block"
            >
              @fatorzhouse
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="fz-reveal mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10 lg:min-h-[calc(100vh-76px)] lg:py-12">
          <div className="grid h-full items-center gap-9 lg:grid-cols-[0.94fr_1.06fr] lg:gap-14">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 backdrop-blur-xl">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_18px_rgba(255,0,150,0.9)]" />
                <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-300">
                  Marketing, IA e presença digital
                </p>
              </div>

              <h1 className="mb-6 max-w-[790px] text-5xl font-black leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
                Sua marca precisa parecer{" "}
                <span className="bg-gradient-to-r from-white via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
                  pronta para ser escolhida.
                </span>
              </h1>

              <p className="mb-7 max-w-[630px] text-base leading-relaxed text-zinc-400 md:text-lg">
                A FatorZ organiza conteúdo, posicionamento, landing pages,
                Academy e estrutura digital para sua marca sair do improviso e
                ganhar presença com direção.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={scrollToProducts}
                  className="fz-shine-btn px-7 py-4 text-base"
                >
                  Ver soluções
                </button>

                <button
                  onClick={openInstagram}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-4 text-base font-black text-white transition hover:border-pink-500/30 hover:bg-white/10"
                >
                  Chamar no direct
                </button>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                  <strong className="block text-lg font-black text-white">
                    Perfil
                  </strong>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    mais claro, profissional e confiável.
                  </span>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                  <strong className="block text-lg font-black text-white">
                    Conteúdo
                  </strong>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    com direção, frequência e intenção.
                  </span>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                  <strong className="block text-lg font-black text-white">
                    Estrutura
                  </strong>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    site, checkout, Academy e presença.
                  </span>
                </div>
              </div>
            </div>

            <div className="fz-reveal fz-reveal-delay-1 relative">
              <div className="absolute -inset-5 rounded-[46px] bg-gradient-to-r from-[#005cff]/10 via-[#9123ff]/10 to-[#ff0096]/10 blur-2xl" />

              <div className="fz-neon-card relative p-5 shadow-2xl md:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                      FatorZ Hub
                    </p>

                    <h2 className="mt-2 text-2xl font-black md:text-3xl">
                      Escolha o ponto que trava sua marca
                    </h2>

                    <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                      Cada setor resolve uma parte da sua presença digital:
                      conteúdo, perfil, site, posicionamento ou aprendizado.
                    </p>
                  </div>

                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#005cff] via-[#9123ff] to-[#ff0096] text-lg font-black shadow-[0_0_24px_rgba(255,0,150,0.22)]">
                    Z
                  </div>
                </div>

                {loadingProducts ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-zinc-400">
                    Carregando soluções...
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {visibleCategories.map((category) => {
                      const active = selectedCategory === category;

                      return (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setTimeout(scrollToProducts, 80);
                          }}
                          className={`group relative flex w-full items-center justify-between overflow-hidden rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-pink-500/35 hover:bg-white/[0.06] ${
                            active
                              ? "border-pink-500/45 bg-pink-500/[0.075] shadow-[0_0_28px_rgba(236,72,153,0.12)]"
                              : "border-white/10 bg-white/[0.035]"
                          }`}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(236,72,153,0.12),transparent_36%),radial-gradient(circle_at_90%_80%,rgba(56,189,248,0.09),transparent_34%)] opacity-0 transition group-hover:opacity-100" />

                          <div className="relative z-10">
                            <h3 className="text-base font-black text-white">
                              {getCategoryLabel(category)}
                            </h3>

                            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                              {getCategoryDescription(category)}
                            </p>
                          </div>

                          <span className="relative z-10 ml-4 grid h-9 min-w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] px-3 text-sm font-black text-white">
                            {groupedProducts[category]?.length || 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 grid gap-3 rounded-3xl border border-white/10 bg-black/30 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                      Ativos
                    </p>
                    <p className="mt-1 text-xl font-black text-white">
                      {loadingProducts ? "..." : totalProducts}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                      Categorias
                    </p>
                    <p className="mt-1 text-xl font-black text-white">
                      {loadingProducts ? "..." : visibleCategories.length}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                      Destaque
                    </p>
                    <p className="mt-1 truncate text-sm font-black text-white">
                      {featuredProduct?.name || firstSelectedProduct?.name || "FatorZ"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="produtos"
          className="fz-reveal mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14"
        >
          <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-pink-500/20 bg-pink-500/[0.07] px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_14px_rgba(236,72,153,0.85)]" />
                <p className="text-sm font-black uppercase tracking-[0.28em] text-pink-400">
                  Central de soluções
                </p>
              </div>

              <h2 className="max-w-4xl text-4xl font-black leading-tight md:text-5xl">
                Escolha pela necessidade. A FatorZ encaixa a solução.
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
                Produtos conectados ao painel, organizados por objetivo e
                prontos para transformar presença digital em percepção
                profissional.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-relaxed text-zinc-400 backdrop-blur-xl lg:max-w-[320px]">
              <strong className="block text-white">Direção antes de estética.</strong>
              O foco não é só ficar bonito. É deixar claro por que sua marca
              merece ser escolhida.
            </div>
          </div>

          {loadingProducts ? (
            <div className="fz-neon-card p-8 text-zinc-400">
              Carregando produtos...
            </div>
          ) : !products.length ? (
            <div className="fz-neon-card p-8 text-zinc-400">
              Nenhum produto ativo no momento.
            </div>
          ) : (
            <>
              <div className="mb-8 rounded-[30px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-pink-400">
                      Navegue por objetivo
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Clique em uma categoria para trocar os produtos abaixo.
                    </p>
                  </div>

                  <span className="w-fit rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-black text-zinc-400">
                    {selectedProducts.length} solução
                    {selectedProducts.length === 1 ? "" : "ões"} nesse setor
                  </span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-1">
                  {visibleCategories.map((category) => {
                    const active = selectedCategory === category;

                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`shrink-0 rounded-full border px-4 py-3 text-xs font-black transition hover:-translate-y-0.5 ${
                          active
                            ? "border-pink-500/50 bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] text-white shadow-[0_0_25px_rgba(255,0,150,0.18)]"
                            : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-pink-500/25 hover:bg-white/[0.08] hover:text-white"
                        }`}
                      >
                        {getCategoryLabel(category)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="fz-neon-card mb-7 p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                      Setor selecionado
                    </p>

                    <h3 className="text-2xl font-black md:text-3xl">
                      {getCategoryLabel(selectedCategory)}
                    </h3>

                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                      {getCategoryDescription(selectedCategory)}
                    </p>
                  </div>

                  <button
                    onClick={openInstagram}
                    className="w-fit rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-white transition hover:border-pink-500/30 hover:bg-white/10"
                  >
                    Pedir indicação
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {selectedProducts.map((product) => (
                  <article
                    key={product.id}
                    className={`fz-neon-card p-5 ${
                      product.is_featured ? "fz-plan-featured" : ""
                    }`}
                  >
                    {product.image_url && (
                      <div className="mb-4 h-36 overflow-hidden rounded-[22px] border border-white/10 bg-zinc-900">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-500 hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="mb-3 flex flex-wrap gap-2">
                      {product.is_featured && (
                        <div className="fz-plan-badge">Destaque FatorZ</div>
                      )}

                      {product.badge && (
                        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                          {product.badge}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                        {getDeliveryType(product)}
                      </p>

                      <h4 className="text-xl font-black">{product.name}</h4>

                      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                        {product.description ||
                          product.subtitle ||
                          "Solução FatorZ para melhorar sua presença digital."}
                      </p>

                      <PaymentBadges product={product} />
                    </div>

                    <div className="mb-5 rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-sm font-bold text-zinc-500">Valor</p>

                      <div className="mt-1 flex items-end gap-3">
                        {product.old_price_cents && (
                          <p className="pb-1 text-sm font-black text-zinc-500 line-through">
                            {formatMoney(product.old_price_cents)}
                          </p>
                        )}

                        <p className="text-2xl font-black text-white">
                          {formatMoney(product.price_cents)}
                        </p>
                      </div>
                    </div>

                    <ul className="mb-5 space-y-2.5">
                      {getProductBenefits(product).map((benefit) => (
                        <li
                          key={benefit}
                          className="flex gap-3 text-sm leading-relaxed text-zinc-300"
                        >
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(255,0,150,0.8)]" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleBuy(product)}
                      disabled={buyingId === product.id}
                      className="fz-shine-btn w-full px-5 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {buyingId === product.id
                        ? "Abrindo..."
                        : product.checkout_provider === "manual"
                          ? "Chamar no direct"
                          : product.checkout_provider === "external"
                            ? "Abrir pagamento"
                            : "Comprar agora"}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="fz-reveal mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <div className="fz-neon-card relative p-5 md:p-7">
            <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                  Próximo passo
                </p>

                <h2 className="text-2xl font-black leading-tight md:text-3xl">
                  Não sabe qual solução escolher?
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                  Chama a FatorZ no direct e manda o que você quer melhorar:
                  perfil, conteúdo, site, vendas, posicionamento ou Academy.
                </p>
              </div>

              <button
                onClick={openInstagram}
                className="fz-shine-btn px-6 py-3.5 text-sm md:text-base"
              >
                Chamar @fatorzhouse
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}