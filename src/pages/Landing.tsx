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
    <div className="mt-4 flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-zinc-300"
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
    <div className="min-h-screen bg-[#050506] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(0,92,255,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,0,150,0.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.14),transparent_34%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-30 bg-[linear-gradient(115deg,transparent_0%,rgba(0,92,255,0.08)_32%,transparent_56%,rgba(255,0,150,0.08)_80%,transparent_100%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <button
            onClick={() => navigate("/")}
            className="text-2xl md:text-3xl font-black tracking-tight text-white shrink-0"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-black text-zinc-400">
            <button onClick={scrollToProducts} className="hover:text-white">
              Soluções
            </button>

            <button
              onClick={() => navigate("/academy")}
              className="hover:text-white"
            >
              Academy
            </button>

            <button
              onClick={() => navigate("/mural")}
              className="hover:text-white"
            >
              Mural
            </button>

            <button
              onClick={() => navigate("/minhas-entregas")}
              className="hover:text-white"
            >
              Entregas
            </button>

            <button onClick={openInstagram} className="hover:text-white">
              Instagram
            </button>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => navigate("/login")}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:bg-white/10 md:px-6"
            >
              Entrar
            </button>

            <button
              onClick={openInstagram}
              className="hidden rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 lg:block md:px-6"
            >
              @fatorzhouse
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_18px_rgba(255,0,150,0.9)]" />
                <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-300">
                  Marketing, IA e presença digital
                </p>
              </div>

              <h1 className="mb-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl lg:text-8xl">
                Sua marca precisa parecer pronta para ser escolhida.
              </h1>

              <p className="mb-8 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
                A FatorZ organiza conteúdo, posicionamento, landing pages,
                Academy e estrutura digital para sua marca sair do improviso e
                ganhar presença com direção.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={scrollToProducts}
                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-8 py-5 text-lg font-black text-white shadow-[0_0_35px_rgba(255,0,150,0.18)] transition hover:opacity-90"
                >
                  Ver soluções
                </button>

                <button
                  onClick={openInstagram}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-5 text-lg font-black text-white transition hover:bg-white/10"
                >
                  Chamar no direct
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[52px] bg-gradient-to-r from-[#005cff]/20 via-[#9123ff]/20 to-[#ff0096]/20 blur-2xl" />

              <div className="relative overflow-hidden rounded-[42px] border border-white/10 bg-black/70 p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                      FatorZ Hub
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                      Soluções por setor
                    </h2>
                  </div>

                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#005cff] via-[#9123ff] to-[#ff0096] shadow-[0_0_28px_rgba(255,0,150,0.24)]" />
                </div>

                {loadingProducts ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-zinc-400">
                    Carregando soluções...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setTimeout(scrollToProducts, 80);
                        }}
                        className="group flex w-full items-center justify-between rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-left transition hover:border-pink-500/40 hover:bg-white/[0.075]"
                      >
                        <div>
                          <h3 className="text-lg font-black text-white">
                            {getCategoryLabel(category)}
                          </h3>

                          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                            {getCategoryDescription(category)}
                          </p>
                        </div>

                        <span className="ml-4 shrink-0 rounded-full border border-white/10 px-3 py-1 text-sm font-black text-zinc-300 group-hover:text-white">
                          {groupedProducts[category]?.length || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="produtos" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="mb-8">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-pink-500">
              Central de soluções
            </p>

            <h2 className="text-4xl font-black leading-tight md:text-6xl">
              Escolha pela necessidade, não por catálogo.
            </h2>

            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-zinc-400">
              Agora os produtos da FatorZ vêm direto do painel. Mudou preço,
              ativou, ocultou ou destacou: o site acompanha.
            </p>
          </div>

          {loadingProducts ? (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 text-zinc-400">
              Carregando produtos...
            </div>
          ) : !products.length ? (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 text-zinc-400">
              Nenhum produto ativo no momento.
            </div>
          ) : (
            <>
              <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
                {visibleCategories.map((category) => {
                  const active = selectedCategory === category;

                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`shrink-0 rounded-2xl border px-5 py-4 text-sm font-black transition ${
                        active
                          ? "border-pink-500/50 bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] text-white shadow-[0_0_25px_rgba(255,0,150,0.18)]"
                          : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {getCategoryLabel(category)}
                    </button>
                  );
                })}
              </div>

              <div className="mb-8 overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.045] p-6 md:p-8">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                  Setor selecionado
                </p>

                <h3 className="text-3xl font-black md:text-4xl">
                  {getCategoryLabel(selectedCategory)}
                </h3>

                <p className="mt-3 max-w-3xl text-zinc-400">
                  {getCategoryDescription(selectedCategory)}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {selectedProducts.map((product) => (
                  <article
                    key={product.id}
                    className={`relative overflow-hidden rounded-[36px] border p-6 transition hover:-translate-y-1 ${
                      product.is_featured
                        ? "border-pink-500/45 bg-pink-500/[0.08] shadow-[0_0_35px_rgba(255,0,150,0.12)]"
                        : "border-white/10 bg-white/[0.045]"
                    }`}
                  >
                    {product.image_url && (
                      <div className="mb-5 h-44 overflow-hidden rounded-[26px] border border-white/10 bg-zinc-900">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="mb-4 flex flex-wrap gap-2">
                      {product.is_featured && (
                        <div className="inline-flex rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-pink-300">
                          Destaque FatorZ
                        </div>
                      )}

                      {product.badge && (
                        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-300">
                          {product.badge}
                        </div>
                      )}
                    </div>

                    <div className="mb-5">
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                        {getDeliveryType(product)}
                      </p>

                      <h4 className="text-2xl font-black">{product.name}</h4>

                      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                        {product.description ||
                          product.subtitle ||
                          "Solução FatorZ para melhorar sua presença digital."}
                      </p>

                      <PaymentBadges product={product} />
                    </div>

                    <div className="mb-6 rounded-3xl border border-white/10 bg-black/40 p-5">
                      <p className="text-sm font-bold text-zinc-500">Valor</p>

                      <div className="mt-1 flex items-end gap-3">
                        {product.old_price_cents && (
                          <p className="pb-1 text-sm font-black text-zinc-500 line-through">
                            {formatMoney(product.old_price_cents)}
                          </p>
                        )}

                        <p className="text-3xl font-black text-white">
                          {formatMoney(product.price_cents)}
                        </p>
                      </div>
                    </div>

                    <ul className="mb-6 space-y-3">
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
                      className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
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

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="overflow-hidden rounded-[42px] border border-white/10 bg-black p-8 md:p-12 relative">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#ff0096]/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#005cff]/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-pink-400">
                  Próximo passo
                </p>

                <h2 className="text-4xl font-black leading-tight md:text-5xl">
                  Não sabe qual solução escolher?
                </h2>

                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-zinc-400">
                  Chama a FatorZ no direct e manda o que você quer melhorar:
                  perfil, conteúdo, site, vendas, posicionamento ou Academy.
                </p>
              </div>

              <button
                onClick={openInstagram}
                className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-8 py-5 text-lg font-black text-white transition hover:opacity-90"
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