export type SiteProduct = {
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
  notes: string | null;
};

const categoryLabels: Record<string, string> = {
  assessoria: "Assessoria Mensal",
  "servicos-unicos": "Serviços Únicos",
  sites: "Sites e Landing Pages",
  identidade: "Identidade e Posicionamento",
  academy: "Academy",
};

export function formatMoney(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function getCategoryLabel(category: string) {
  return categoryLabels[category] || category;
}

export function getDeliveryType(product: SiteProduct) {
  if (product.product_type === "subscription") return "Mensal";
  if (product.product_type === "course") return "Acesso vitalício";
  if (product.product_type === "site") return "Projeto único";
  if (product.product_type === "branding") return "Entrega estratégica";
  if (product.product_type === "diagnostic") return "Diagnóstico";
  return "Entrega única";
}

export function getProductBenefits(product: SiteProduct) {
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

function canRenderImage(value: string | null) {
  if (!value) return false;

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image")
  );
}

function PaymentBadges({ product }: { product: SiteProduct }) {
  const badges = [];

  if (product.accepts_pix) badges.push("Pix");
  if (product.accepts_boleto) badges.push("Boleto");
  if (product.accepts_card) badges.push("Cartão");

  if (!badges.length) badges.push("Manual");

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

export default function ProductCard({
  product,
  onBuy,
  buying = false,
}: {
  product: SiteProduct;
  onBuy: (product: SiteProduct) => void;
  buying?: boolean;
}) {
  const benefits = getProductBenefits(product).slice(0, 6);

  return (
    <article
      className={[
        "group relative flex h-full flex-col overflow-hidden rounded-[32px] border p-4 transition duration-300",
        product.is_featured
          ? "border-pink-500/55 bg-pink-500/[0.055] shadow-[0_0_70px_rgba(236,72,153,0.14)]"
          : "border-white/10 bg-white/[0.035] hover:border-pink-500/35 hover:bg-white/[0.055]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-pink-500/20 blur-[70px]" />
        <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-blue-600/20 blur-[80px]" />
      </div>

      <div className="relative z-10">
        <div className="mb-4 overflow-hidden rounded-[24px] border border-white/10 bg-black/40">
          {canRenderImage(product.image_url) ? (
            <img
              src={product.image_url || ""}
              alt={product.name}
              className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,150,0.35),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(0,92,255,0.32),transparent_30%),linear-gradient(135deg,#050506,#140015,#050506)] px-5 text-center">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
                  FatorZ
                </p>
                <h3 className="text-3xl font-black leading-none tracking-tight">
                  {product.name}
                </h3>
              </div>
            </div>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {product.badge || getDeliveryType(product)}
          </span>

          <span className="rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-pink-200">
            {getCategoryLabel(product.category)}
          </span>
        </div>

        <h3 className="text-2xl font-black leading-tight tracking-tight text-white">
          {product.name}
        </h3>

        <p className="mt-3 min-h-[54px] text-sm leading-relaxed text-zinc-400">
          {product.subtitle || product.description || "Solução FatorZ para melhorar sua presença digital."}
        </p>

        <PaymentBadges product={product} />

        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/45 p-4">
          {product.old_price_cents ? (
            <p className="mb-1 text-xs font-bold text-zinc-500 line-through">
              {formatMoney(product.old_price_cents)}
            </p>
          ) : null}

          <p className="text-xs font-bold text-zinc-500">Valor</p>

          <p className="mt-1 text-2xl font-black text-white">
            {formatMoney(product.price_cents)}
          </p>
        </div>

        <ul className="mt-5 space-y-3">
          {benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex gap-3 text-sm leading-relaxed text-zinc-300"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.9)]" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onBuy(product)}
        disabled={buying}
        className="relative z-10 mt-auto w-full rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#6366f1] px-5 py-4 text-sm font-black text-white shadow-[0_16px_40px_rgba(236,72,153,0.22)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60"
      >
        {buying ? "Abrindo..." : "Comprar agora"}
      </button>
    </article>
  );
}