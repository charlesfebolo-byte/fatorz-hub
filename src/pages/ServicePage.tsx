import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getSeoServiceBySlug } from "../data/seoServices";

const BASE_URL = "https://fatorz-hub.vercel.app";
const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

type SiteProduct = {
  id: number;
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
  course_id: number | null;
};

const productMatchBySlug: Record<string, string[]> = {
  "agencia-de-marketing-digital": [
    "assessoria",
    "diagnostic",
    "branding",
    "site",
    "subscription",
  ],
  "edicao-de-reels": ["reels", "vídeo", "video", "edição", "edicao"],
  "criacao-de-artes-para-instagram": [
    "arte",
    "artes",
    "feed",
    "post",
    "instagram",
    "criativo",
  ],
  "landing-page": ["landing", "site", "page", "página", "pagina"],
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
  ],
};

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

function formatMoney(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getPaymentLabel(product: SiteProduct) {
  const methods = [];

  if (product.accepts_pix) methods.push("Pix");
  if (product.accepts_boleto) methods.push("Boleto");
  if (product.accepts_card) methods.push("Cartão");

  if (!methods.length) return "Atendimento manual";

  return methods.join(" • ");
}

function getDeliveryType(product: SiteProduct) {
  if (product.product_type === "subscription") return "Plano mensal";
  if (product.product_type === "course") return "Curso";
  if (product.product_type === "site") return "Site ou página";
  if (product.product_type === "branding") return "Identidade";
  if (product.product_type === "diagnostic") return "Diagnóstico";

  return "Serviço FatorZ";
}

function normalize(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
        ].join(" ")
      );

      let score = 0;

      matchWords.forEach((word) => {
        if (searchable.includes(normalize(word))) {
          score += 1;
        }
      });

      if (product.is_featured) score += 1;

      return {
        product,
        score,
      };
    });

    const matched = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product);

    if (matched.length) return matched.slice(0, 6);

    return products.slice(0, 6);
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

  return (
    <div className="min-h-screen bg-[#050506] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(0,92,255,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,0,150,0.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.14),transparent_34%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <button
            onClick={() => navigate("/")}
            className="text-2xl md:text-3xl font-black tracking-tight text-white"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <nav className="hidden items-center gap-6 text-sm font-black text-zinc-400 lg:flex">
            <button onClick={() => navigate("/")} className="hover:text-white">
              Início
            </button>

            <button
              onClick={() => navigate("/servicos")}
              className="hover:text-white"
            >
              Serviços
            </button>

            <button
              onClick={() => navigate("/#produtos")}
              className="hover:text-white"
            >
              Produtos
            </button>

            <button
              onClick={() => navigate("/login")}
              className="hover:text-white"
            >
              Hub
            </button>
          </nav>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/servicos")}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Serviços
            </button>

            <button
              onClick={openInstagram}
              className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-4 py-3 text-sm font-black text-white transition hover:opacity-90 md:px-5"
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
                  onClick={() => {
                    const section = document.getElementById("produtos-relacionados");
                    section?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-8 py-5 text-lg font-black text-white transition hover:opacity-90"
                >
                  Ver soluções e preços
                </button>

                <button
                  onClick={() => navigate("/login")}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-5 text-lg font-black text-white transition hover:bg-white/10"
                >
                  Entrar no Hub
                </button>
              </div>
            </div>

            <aside className="rounded-[38px] border border-white/10 bg-black/60 p-6 md:p-8">
              <p className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-pink-400">
                O que a FatorZ faz aqui
              </p>

              <div className="space-y-4">
                {service.benefits.slice(0, 4).map((benefit) => (
                  <div
                    key={benefit}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <p className="font-bold text-zinc-200">{benefit}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {service.keywords.slice(0, 5).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-zinc-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section
          id="produtos-relacionados"
          className="mx-auto max-w-7xl px-4 py-10 md:px-8"
        >
          <div className="mb-8">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-pink-400">
              Soluções relacionadas
            </p>

            <h2 className="text-4xl font-black md:text-5xl">
              Produtos da FatorZ para {service.title}
            </h2>

            <p className="mt-4 max-w-3xl text-zinc-400">
              Essas opções vêm do painel de produtos da FatorZ. Se o preço mudar
              no admin, muda aqui também.
            </p>
          </div>

          {loadingProducts ? (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 text-zinc-400">
              Carregando soluções...
            </div>
          ) : relatedProducts.length === 0 ? (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8">
              <h3 className="text-2xl font-black">Nenhum produto ativo agora.</h3>

              <p className="mt-3 text-zinc-400">
                Chame a FatorZ para montar uma solução personalizada.
              </p>

              <button
                onClick={openInstagram}
                className="mt-6 rounded-2xl bg-white px-6 py-4 font-black text-black"
              >
                Chamar no Instagram
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {relatedProducts.map((product) => (
                <article
                  key={product.id}
                  className={`relative overflow-hidden rounded-[34px] border p-6 transition hover:-translate-y-1 ${
                    product.is_featured
                      ? "border-pink-500/45 bg-pink-500/[0.08]"
                      : "border-white/10 bg-white/[0.045]"
                  }`}
                >
                  {product.image_url && (
                    <div className="mb-5 h-40 overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-zinc-300">
                      {getDeliveryType(product)}
                    </span>

                    {product.badge && (
                      <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-pink-300">
                        {product.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-black">{product.name}</h3>

                  <p className="mt-3 min-h-[72px] text-sm leading-relaxed text-zinc-400">
                    {product.description ||
                      product.subtitle ||
                      "Solução FatorZ para melhorar sua presença digital."}
                  </p>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/45 p-5">
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

                    <p className="mt-2 text-xs font-bold text-zinc-500">
                      {getPaymentLabel(product)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleBuy(product)}
                    disabled={buyingId === product.id}
                    className="mt-6 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
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
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
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

            <h2 className="text-4xl font-black">
              Perguntas sobre {service.title}
            </h2>
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