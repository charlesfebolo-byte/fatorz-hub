import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleUserRound,
  LineChart,
  MessageCircle,
  Radio,
  ShoppingBag,
  Target,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";
const WHATSAPP_URL =
  "https://wa.me/?text=Quero%20agendar%20um%20diagnostico%20com%20a%20FatorZ";

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
  "servicos-unicos": "Servicos Unicos",
  sites: "Sites e Landing Pages",
  identidade: "Identidade e Posicionamento",
  academy: "Academy",
};

const categoryOrder = [
  "assessoria",
  "servicos-unicos",
  "sites",
  "identidade",
  "academy",
];

const stats = [
  { value: "+150", label: "marcas atendidas" },
  { value: "+38M", label: "contas alcancadas" },
  { value: "+300%", label: "crescimento medio" },
  { value: "98%", label: "clientes satisfeitos" },
];

const problemCards = [
  {
    icon: CircleUserRound,
    title: "Perfil sem autoridade",
    text: "Sua marca aparece, mas nao transmite confianca nem deixa claro por que deveria ser escolhida.",
  },
  {
    icon: LineChart,
    title: "Presenca inconsistente",
    text: "Conteudo solto, sem direcao, nao constroi lembranca nem considera a jornada de compra.",
  },
  {
    icon: Target,
    title: "Pagina que nao converte",
    text: "Design bonito nao vende sozinho. Falta estrategia, prova e chamada de acao clara.",
  },
];

const pillars = [
  {
    number: "01",
    title: "Percepcao",
    subtitle: "Como sua marca e vista",
    text: "Posicionamento, identidade e narrativa para sua marca parecer pronta para ser escolhida.",
  },
  {
    number: "02",
    title: "Presenca",
    subtitle: "Onde sua marca aparece",
    text: "Instagram, conteudo, landing pages e pontos de contato organizados com consistencia.",
  },
  {
    number: "03",
    title: "Direcao",
    subtitle: "Para onde sua marca vai",
    text: "Plano claro, execucao acompanhada e ajustes constantes para sair do improviso.",
  },
];

const processSteps = [
  {
    title: "Diagnostico",
    text: "Leitura da marca, do mercado, do perfil e dos pontos que travam a percepcao.",
  },
  {
    title: "Estrategia",
    text: "Definicao do caminho visual, comercial e editorial para cada etapa da presenca.",
  },
  {
    title: "Execucao",
    text: "Criacao, acompanhamento, entrega e ajustes com foco no proximo resultado real.",
  },
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

function getDeliveryType(product: SiteProduct) {
  if (product.product_type === "subscription") return "Mensal";
  if (product.product_type === "course") return "Acesso vitalicio";
  if (product.product_type === "site") return "Projeto unico";
  if (product.product_type === "branding") return "Entrega estrategica";
  if (product.product_type === "diagnostic") return "Diagnostico";
  return "Entrega unica";
}

function getProductBenefits(product: SiteProduct) {
  const customBenefits = String(product.notes || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (customBenefits.length) return customBenefits;

  if (product.product_type === "course") {
    return [
      "Acesso individual vinculado a sua conta",
      "Conteudo organizado dentro da FatorZ Academy",
      "Compra unica, sem mensalidade",
      "Ideal para aprender e aplicar no seu ritmo",
    ];
  }

  if (product.product_type === "subscription") {
    return [
      "Acompanhamento recorrente",
      "Direcao de presenca digital",
      "Organizacao de conteudo e posicionamento",
      "Estrutura para crescer com consistencia",
    ];
  }

  if (product.product_type === "site") {
    return [
      "Estrutura profissional para apresentar sua marca",
      "Pagina pensada para gerar acao",
      "Visual alinhado ao posicionamento",
      "Ideal para campanhas, servicos e conversao",
    ];
  }

  if (product.product_type === "branding") {
    return [
      "Mais clareza na percepcao da marca",
      "Direcao visual e estrategica",
      "Organizacao da mensagem",
      "Perfil mais profissional e memoravel",
    ];
  }

  if (product.product_type === "diagnostic") {
    return [
      "Analise rapida do perfil",
      "Identificacao dos principais gargalos",
      "Direcao clara para o proximo passo",
      "Ideal para parar de postar no escuro",
    ];
  }

  return [
    "Entrega pontual e objetiva",
    "Solucao pratica para melhorar sua presenca",
    "Aplicacao direta no Instagram ou marca",
    "Direcao profissional da FatorZ",
  ];
}

function PaymentBadges({ product }: { product: SiteProduct }) {
  const badges = [];

  if (product.accepts_pix) badges.push("Pix");
  if (product.accepts_boleto) badges.push("Boleto");
  if (product.accepts_card) badges.push("Cartao");

  if (!badges.length) badges.push("Manual");

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400"
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

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
  }, []);

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

  function openWhatsApp() {
    window.open(WHATSAPP_URL, "_blank");
  }

  function scrollToProducts() {
    const section = document.getElementById("planos");
    section?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToMethod() {
    const section = document.getElementById("metodo");
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
        alert("Esse produto esta com checkout externo, mas nao tem link cadastrado.");
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

  function renderProductSection(compact = false) {
    return (
      <section
        id="planos"
        className={
          compact
            ? "px-4 pb-9 pt-3"
            : "fz-reveal mx-auto max-w-[1180px] px-6 py-20"
        }
      >
        <div className={compact ? "mb-5" : "mx-auto mb-11 max-w-2xl text-center"}>
          <div className="fz-home-eyebrow justify-start md:justify-center">
            <span />
            Planos & Solucoes
          </div>
          <h2
            className={
              compact
                ? "mt-3 text-2xl font-black leading-tight"
                : "mt-3 text-4xl font-black leading-tight md:text-5xl"
            }
          >
            Escolha o ponto que destrava sua marca.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">
            Produtos reais do Hub FatorZ, conectados ao checkout, Academy e
            painel. A estetica mudou; a operacao continua viva.
          </p>
        </div>

        {loadingProducts ? (
          <div className="fz-home-panel p-6 text-zinc-400">
            Carregando produtos...
          </div>
        ) : !products.length ? (
          <div className="fz-home-panel p-6 text-zinc-400">
            Nenhum produto ativo no momento.
          </div>
        ) : (
          <>
            <div className="fz-products-panel mb-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8b5cf6]">
                    Navegue por objetivo
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedProducts.length} solucao
                    {selectedProducts.length === 1 ? "" : "oes"} neste setor
                  </p>
                </div>
                <ShoppingBag className="h-5 w-5 text-[#8b5cf6]" />
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1">
                {visibleCategories.map((category) => {
                  const active = selectedCategory === category;

                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`fz-category-tab shrink-0 ${
                        active ? "fz-category-tab-active" : ""
                      }`}
                    >
                      {getCategoryLabel(category)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={
                compact
                  ? "flex snap-x gap-4 overflow-x-auto pb-2"
                  : "grid gap-5 md:grid-cols-2 xl:grid-cols-3"
              }
            >
              {selectedProducts.map((product) => (
                <article
                  key={product.id}
                  className={`fz-public-plan ${
                    product.is_featured ? "fz-public-plan-featured" : ""
                  } ${compact ? "w-[82vw] shrink-0 snap-start" : ""}`}
                >
                  {product.is_featured && (
                    <div className="mb-4 w-fit rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      Mais escolhido
                    </div>
                  )}

                  {product.badge && !product.is_featured && (
                    <div className="mb-4 w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                      {product.badge}
                    </div>
                  )}

                  {product.image_url && (
                    <div className="mb-4 aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-[#111120]">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    {getDeliveryType(product)}
                  </p>
                  <h3 className="mt-2 text-xl font-black">{product.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-relaxed text-zinc-400">
                    {product.description ||
                      product.subtitle ||
                      "Solucao FatorZ para melhorar sua presenca digital."}
                  </p>

                  <PaymentBadges product={product} />

                  <div className="my-5 border-t border-white/10 pt-5">
                    <div className="flex items-end gap-3">
                      {product.old_price_cents && (
                        <span className="pb-1 text-sm font-bold text-zinc-600 line-through">
                          {formatMoney(product.old_price_cents)}
                        </span>
                      )}
                      <strong className="font-['Sora',sans-serif] text-3xl font-black">
                        {formatMoney(product.price_cents)}
                      </strong>
                    </div>
                  </div>

                  <ul className="mb-5 space-y-2.5">
                    {getProductBenefits(product)
                      .slice(0, compact ? 3 : 4)
                      .map((benefit) => (
                        <li
                          key={benefit}
                          className="flex gap-2 text-sm leading-relaxed text-zinc-300"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8b5cf6]" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                  </ul>

                  <button
                    onClick={() => handleBuy(product)}
                    disabled={buyingId === product.id}
                    className="fz-public-btn fz-public-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
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
    );
  }

  return (
    <div className="fz-public-home min-h-screen overflow-x-hidden bg-[#05050b] text-[#f2f1f8]">
      <div className="hidden md:block">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05050b]/85 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
            <button
              onClick={() => navigate("/")}
              className="font-['Sora',sans-serif] text-xl font-black tracking-tight"
            >
              FATOR<span className="text-[#8b5cf6]">Z</span>
            </button>

            <div className="flex items-center gap-8 text-sm font-semibold text-zinc-400">
              <button className="text-white" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Inicio
              </button>
              <button onClick={scrollToMethod} className="transition hover:text-white">
                Metodo
              </button>
              <a href="#resultados" className="transition hover:text-white">
                Cases
              </a>
              <button onClick={scrollToProducts} className="transition hover:text-white">
                Planos
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openWhatsApp}
                className="fz-public-btn fz-public-btn-whatsapp"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </button>
              <button
                onClick={scrollToProducts}
                className="fz-public-btn fz-public-btn-primary"
              >
                Agendar Diagnostico
              </button>
            </div>
          </nav>
        </header>

        <main>
          <section className="relative overflow-hidden px-6 py-20">
            <div className="pointer-events-none absolute -right-32 -top-52 h-[620px] w-[620px] rounded-full bg-[#8b5cf6]/25 blur-3xl" />
            <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="fz-reveal">
                <div className="fz-home-eyebrow">
                  <span />
                  Percepcao · Presenca · Direcao
                </div>
                <h1 className="mt-4 max-w-3xl font-['Sora',sans-serif] text-5xl font-bold leading-[1.08] tracking-tight lg:text-[64px]">
                  Sua marca nao precisa so aparecer. Precisa ser{" "}
                  <span className="fz-home-grad-text">impossivel de ignorar.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
                  Posicionamento, conteudo estrategico e direcao constante para
                  transformar presenca digital em autoridade e vendas reais.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={scrollToProducts}
                    className="fz-public-btn fz-public-btn-primary px-6 py-3.5"
                  >
                    Agendar Diagnostico <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={openWhatsApp}
                    className="fz-public-btn fz-public-btn-ghost px-6 py-3.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Falar no WhatsApp
                  </button>
                </div>

                <div className="mt-11 grid grid-cols-4 border-t border-white/10">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="border-r border-white/10 py-5 pr-5 last:border-r-0"
                    >
                      <strong className="font-['Sora',sans-serif] text-2xl font-black">
                        {stat.value}
                      </strong>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fz-reveal fz-reveal-delay-1">
                <div className="fz-signal-visual">
                  <div className="fz-signal-ring fz-signal-ring-lg" />
                  <div className="fz-signal-ring fz-signal-ring-sm" />
                  <div className="fz-signal-core">
                    <Radio className="mx-auto mb-2 h-7 w-7 text-[#8b5cf6]" />
                    <strong>FATORZ</strong>
                    <small>estrategia que gera resultado</small>
                  </div>
                  <div className="fz-float-card left-0 top-4">
                    <span>Faturamento</span>
                    <strong>+320%</strong>
                  </div>
                  <div className="fz-float-card bottom-12 right-0">
                    <span>Novos clientes</span>
                    <strong>+185%</strong>
                  </div>
                  <div className="fz-float-card bottom-0 left-10 w-[150px]">
                    <span>Conversao</span>
                    <strong>6,8%</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="fz-reveal mx-auto max-w-[1180px] px-6 py-16">
            <div className="mx-auto mb-11 max-w-2xl text-center">
              <div className="fz-home-eyebrow justify-center">
                <span />
                O problema
              </div>
              <h2 className="mt-3 font-['Sora',sans-serif] text-4xl font-bold">
                O problema nao e aparecer. E como voce e percebido.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {problemCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="fz-home-panel p-7">
                    <div className="mb-5 grid h-10 w-10 place-items-center rounded-xl bg-[#8b5cf6]/15 text-[#8b5cf6]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-['Sora',sans-serif] text-lg font-bold">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      {card.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="metodo" className="fz-reveal mx-auto max-w-[1180px] px-6 py-16">
            <div className="mx-auto mb-11 max-w-2xl text-center">
              <div className="fz-home-eyebrow justify-center">
                <span />
                Nosso metodo
              </div>
              <h2 className="mt-3 font-['Sora',sans-serif] text-4xl font-bold">
                Percepcao, Presenca e Direcao.
              </h2>
            </div>
            <div className="grid overflow-hidden rounded-[20px] border border-white/10 md:grid-cols-3">
              {pillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="relative border-b border-white/10 bg-[#101020]/70 p-8 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                >
                  <div className="absolute right-6 top-5 font-['Sora',sans-serif] text-5xl font-black text-white/[0.04]">
                    {pillar.number}
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    {pillar.title}
                  </p>
                  <h3 className="mt-5 font-['Sora',sans-serif] text-2xl font-bold">
                    {pillar.subtitle}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                    {pillar.text}
                  </p>
                  <button
                    onClick={scrollToProducts}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#8b5cf6]"
                  >
                    Quero isso <ArrowRight className="h-4 w-4" />
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="fz-reveal mx-auto max-w-[1180px] px-6 py-16">
            <div className="mx-auto mb-11 max-w-2xl text-center">
              <div className="fz-home-eyebrow justify-center">
                <span />
                Como funciona
              </div>
              <h2 className="mt-3 font-['Sora',sans-serif] text-4xl font-bold">
                Da percepcao a direcao, em 3 etapas.
              </h2>
            </div>
            <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
              {processSteps.map((step, index) => (
                <div key={step.title} className="contents">
                  <article className="fz-home-panel p-6">
                    <div className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] font-['Sora',sans-serif] text-sm font-black">
                      {index + 1}
                    </div>
                    <h3 className="font-['Sora',sans-serif] text-lg font-bold">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {step.text}
                    </p>
                  </article>
                  {index < processSteps.length - 1 && (
                    <ArrowRight className="hidden h-5 w-5 text-zinc-600 lg:block" />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section id="resultados" className="fz-reveal mx-auto max-w-[1180px] px-6 py-16">
            <div className="mx-auto mb-11 max-w-2xl text-center">
              <div className="fz-home-eyebrow justify-center">
                <span />
                Resultados que falam
              </div>
              <h2 className="mt-3 font-['Sora',sans-serif] text-4xl font-bold">
                Percepcao nova, numeros novos.
              </h2>
            </div>
            <div className="grid overflow-hidden rounded-[20px] border border-white/15 bg-[#101020] lg:grid-cols-2">
              <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  Case · Saude & Estetica
                </p>
                <h3 className="mt-3 font-['Sora',sans-serif] text-2xl font-bold">
                  Clinica Harmonia
                </h3>
                <div className="mt-8 flex items-center gap-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                      Antes · leads/mes
                    </p>
                    <strong className="font-['Sora',sans-serif] text-4xl font-black">
                      120
                    </strong>
                  </div>
                  <ArrowRight className="h-6 w-6 text-[#8b5cf6]" />
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                      Depois · leads/mes
                    </p>
                    <strong className="font-['Sora',sans-serif] text-4xl font-black">
                      512
                    </strong>
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap gap-7">
                  {["+327% leads/mes", "-68% custo por lead", "R$1,8M gerados"].map(
                    (metric) => (
                      <span key={metric} className="font-bold text-emerald-300">
                        {metric}
                      </span>
                    )
                  )}
                </div>
              </div>
              <div className="grid gap-4 p-8">
                {["Educacao", "Infoproduto", "E-commerce"].map((niche) => (
                  <div
                    key={niche}
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#14142a] p-4"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#3b82f6]/15 text-[#3b82f6]">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <strong>{niche}</strong>
                      <p className="text-sm text-zinc-500">
                        Mais conversao com percepcao e direcao.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {renderProductSection()}

          <section className="fz-reveal mx-auto max-w-[1180px] px-6 py-16">
            <div className="flex flex-wrap items-center justify-between gap-8 rounded-[22px] border border-white/15 bg-gradient-to-br from-[#8b5cf6]/20 to-[#3b82f6]/10 p-10">
              <div>
                <h2 className="font-['Sora',sans-serif] text-3xl font-bold">
                  Pronto para transformar percepcao em resultado?
                </h2>
                <p className="mt-2 text-zinc-400">
                  Agende uma conversa e descubra qual solucao faz sentido agora.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openWhatsApp}
                  className="fz-public-btn fz-public-btn-whatsapp px-6 py-3.5"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={scrollToProducts}
                  className="fz-public-btn fz-public-btn-primary px-6 py-3.5"
                >
                  Agendar Diagnostico
                </button>
              </div>
            </div>
          </section>

          <footer className="border-t border-white/10 px-6 py-12">
            <div className="mx-auto grid max-w-[1180px] gap-8 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
              <div>
                <div className="font-['Sora',sans-serif] text-xl font-black">
                  FATOR<span className="text-[#8b5cf6]">Z</span>
                </div>
                <p className="mt-3 max-w-xs text-sm text-zinc-500">
                  Marca que posiciona. Conteudo que conecta. Paginas que vendem.
                </p>
              </div>
              <FooterGroup title="Navegacao" items={["Inicio", "Metodo", "Cases", "Planos"]} />
              <FooterGroup title="Servicos" items={["Instagram", "Landing Pages", "Identidade", "Academy"]} />
              <FooterGroup title="Contato" items={["@fatorzhouse", "WhatsApp", "Diagnostico"]} />
            </div>
          </footer>
        </main>
      </div>

      <div className="fz-mobile-home min-h-screen pb-24 md:hidden">
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#05050b]/92 px-4 py-4 backdrop-blur-xl">
          <button
            onClick={() => navigate("/")}
            className="font-['Sora',sans-serif] text-lg font-black"
          >
            FATOR<span className="text-[#8b5cf6]">Z</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={scrollToProducts}
              aria-label="Ver planos"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#101020]"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
            <button
              onClick={openWhatsApp}
              aria-label="WhatsApp"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#101020]"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden px-4 pb-8 pt-5">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8b5cf6]/25 blur-3xl" />
            <div className="fz-home-eyebrow">
              <span />
              Percepcao · Presenca · Direcao
            </div>
            <h1 className="relative mt-3 font-['Sora',sans-serif] text-[29px] font-bold leading-tight">
              Sua marca nao precisa so aparecer. Precisa ser{" "}
              <span className="fz-home-grad-text">impossivel de ignorar.</span>
            </h1>
            <p className="relative mt-3 text-[15px] leading-relaxed text-zinc-400">
              Posicionamento, conteudo e direcao constante para virar autoridade
              e vender melhor.
            </p>

            <div className="fz-mobile-signal mt-5">
              <div className="text-center font-['Sora',sans-serif] text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                Dashboard de resultado
              </div>
              <div className="absolute left-3 top-3 rounded-lg border border-white/15 bg-[#14142a] px-3 py-2 text-[10px] text-zinc-500">
                Faturamento <strong className="block text-base text-emerald-300">+320%</strong>
              </div>
              <div className="absolute bottom-3 right-3 rounded-lg border border-white/15 bg-[#14142a] px-3 py-2 text-[10px] text-zinc-500">
                Conversao <strong className="block text-base text-emerald-300">6,8%</strong>
              </div>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {stats.map((stat) => (
                <div key={stat.label} className="fz-mobile-stat">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="px-4 py-3">
            <div className="fz-home-eyebrow">
              <span />
              O problema
            </div>
            <h2 className="mt-2 font-['Sora',sans-serif] text-2xl font-bold">
              Nao e aparecer. E como voce e percebido.
            </h2>
            <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {problemCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="fz-mobile-card w-[78vw] shrink-0 snap-start">
                    <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-[#8b5cf6]/15 text-[#8b5cf6]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {card.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="metodo-mobile" className="px-4 py-5">
            <div className="fz-home-eyebrow">
              <span />
              Nosso metodo
            </div>
            <h2 className="mt-2 font-['Sora',sans-serif] text-2xl font-bold">
              Percepcao, Presenca e Direcao
            </h2>
            <div className="mt-4 space-y-3">
              {pillars.map((pillar, index) => (
                <details key={pillar.title} className="fz-mobile-details" open={index === 0}>
                  <summary>
                    <span>
                      <b>{pillar.number}</b>
                      {pillar.title}
                    </span>
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </summary>
                  <p>{pillar.text}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="px-4 py-5">
            <h2 className="font-['Sora',sans-serif] text-2xl font-bold">
              Como funciona
            </h2>
            <div className="mt-4 space-y-5 border-l border-white/15 pl-5">
              {processSteps.map((step, index) => (
                <div key={step.title} className="relative">
                  <span className="absolute -left-[31px] top-0 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-[10px] font-black">
                    {index + 1}
                  </span>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="px-4 py-5">
            <div className="fz-mobile-card">
              <div className="fz-home-eyebrow">
                <span />
                Resultados
              </div>
              <h2 className="mt-2 font-['Sora',sans-serif] text-xl font-bold">
                Percepcao nova, numeros novos.
              </h2>
              <div className="mt-5 flex items-center gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Antes
                  </p>
                  <strong className="font-['Sora',sans-serif] text-3xl">120</strong>
                </div>
                <ArrowRight className="h-5 w-5 text-[#8b5cf6]" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Depois
                  </p>
                  <strong className="font-['Sora',sans-serif] text-3xl">512</strong>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-emerald-300">
                <span>+327% leads</span>
                <span>-68% custo</span>
                <span>R$1,8M gerados</span>
              </div>
            </div>
          </section>

          {renderProductSection(true)}

          <section className="px-4 py-4">
            <div className="rounded-[18px] border border-white/15 bg-gradient-to-br from-[#8b5cf6]/20 to-[#3b82f6]/10 p-6 text-center">
              <h2 className="font-['Sora',sans-serif] text-xl font-bold">
                Pronto pra vender percepcao?
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Agende uma conversa gratuita com a FatorZ.
              </p>
              <button
                onClick={scrollToProducts}
                className="fz-public-btn fz-public-btn-primary mt-5 w-full"
              >
                Agendar Diagnostico
              </button>
            </div>
          </section>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t border-white/15 bg-[#0a0a16]/95 p-3 backdrop-blur-xl">
          <button
            onClick={openWhatsApp}
            className="fz-public-btn fz-public-btn-ghost flex-1"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </button>
          <button
            onClick={scrollToProducts}
            className="fz-public-btn fz-public-btn-primary flex-1"
          >
            Agendar
          </button>
        </div>
      </div>
    </div>
  );
}

function FooterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <span key={item} className="block text-sm text-zinc-500">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
