import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { products, type Product } from "../data/products";
import { supabase } from "../lib/supabase";

const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

const categoryDescriptions: Record<string, string> = {
  "Assessoria Mensal":
    "Acompanhamento contínuo para organizar presença digital, conteúdo, posicionamento e direção de crescimento.",
  "Serviços Únicos":
    "Soluções pontuais para resolver partes específicas do seu Instagram, conteúdo ou comunicação.",
  "Sites e Landing Pages":
    "Páginas profissionais para transformar visitas em contatos, clientes e oportunidades.",
  "Identidade e Posicionamento":
    "Produtos para deixar sua marca mais clara, profissional e pronta para ser escolhida.",
  Academy:
    "Cursos digitais com acesso vitalício para você aprender e aplicar no seu ritmo.",
};

const categoryOrder = [
  "Assessoria Mensal",
  "Serviços Únicos",
  "Sites e Landing Pages",
  "Identidade e Posicionamento",
  "Academy",
];

function isInstagramLink(link: string) {
  return link.includes("instagram.com");
}

export default function Landing() {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState("Assessoria Mensal");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const groupedProducts = useMemo(() => {
    const grouped: Record<string, Product[]> = {};

    products.forEach((product) => {
      if (!grouped[product.category]) {
        grouped[product.category] = [];
      }

      grouped[product.category].push(product);
    });

    return grouped;
  }, []);

  const visibleCategories = useMemo(() => {
    return categoryOrder.filter((category) => groupedProducts[category]?.length);
  }, [groupedProducts]);

  const selectedProducts = groupedProducts[selectedCategory] || [];

  function openInstagram() {
    window.open(INSTAGRAM_URL, "_blank");
  }

  function scrollToProducts() {
    const section = document.getElementById("produtos");
    section?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleBuy(product: Product) {
    if (!product.paymentLink) {
      alert("Esse produto ainda não tem link de pagamento.");
      return;
    }

    if (isInstagramLink(product.paymentLink)) {
      window.open(product.paymentLink, "_blank");
      return;
    }

    setBuyingId(product.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const customerName = prompt(
      "Digite seu nome para registrar o pedido:",
      user?.user_metadata?.nome || user?.user_metadata?.name || ""
    );

    if (!customerName) {
      setBuyingId(null);
      return;
    }

    const customerEmail = prompt(
      "Digite seu email para registrar o pedido:",
      user?.email || ""
    );

    if (!customerEmail) {
      setBuyingId(null);
      return;
    }

    if (!customerEmail.includes("@")) {
      alert("Digite um email válido.");
      setBuyingId(null);
      return;
    }

    const { error } = await supabase.from("orders").insert({
      user_id: user?.id || null,
      customer_email: customerEmail.trim(),
      customer_name: customerName.trim(),
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      product_price: product.price,
      payment_link: product.paymentLink,
      status: "pending",
      payment_id: null,
      project_id: null,
      notes: product.monthly
        ? "Pedido mensal criado pela Landing Page."
        : "Pedido único criado pela Landing Page.",
    });

    setBuyingId(null);

    if (error) {
      console.log("Erro ao registrar pedido:", error);

      const continuar = confirm(
        "Não consegui registrar o pedido no sistema, mas você ainda pode abrir o pagamento. Quer continuar?"
      );

      if (!continuar) return;
    }

    window.open(product.paymentLink, "_blank");
    navigate("/obrigado");
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
                          {category}
                        </h3>

                        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                          {categoryDescriptions[category]}
                        </p>
                      </div>

                      <span className="ml-4 shrink-0 rounded-full border border-white/10 px-3 py-1 text-sm font-black text-zinc-300 group-hover:text-white">
                        {groupedProducts[category]?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>
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
              Os produtos da FatorZ agora são organizados por área para ficar
              mais fácil entender o que sua marca precisa neste momento.
            </p>
          </div>

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
                  {category}
                </button>
              );
            })}
          </div>

          <div className="mb-8 overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
              Setor selecionado
            </p>

            <h3 className="text-3xl font-black md:text-4xl">
              {selectedCategory}
            </h3>

            <p className="mt-3 max-w-3xl text-zinc-400">
              {categoryDescriptions[selectedCategory]}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {selectedProducts.map((product) => (
              <article
                key={product.id}
                className={`relative overflow-hidden rounded-[36px] border p-6 transition hover:-translate-y-1 ${
                  product.highlight
                    ? "border-pink-500/45 bg-pink-500/[0.08] shadow-[0_0_35px_rgba(255,0,150,0.12)]"
                    : "border-white/10 bg-white/[0.045]"
                }`}
              >
                {product.highlight && (
                  <div className="mb-5 inline-flex rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-pink-300">
                    Destaque FatorZ
                  </div>
                )}

                <div className="mb-5">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                    {product.monthly ? "Mensal" : "Entrega única"}
                  </p>

                  <h4 className="text-2xl font-black">{product.name}</h4>

                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {product.description}
                  </p>
                </div>

                <div className="mb-6 rounded-3xl border border-white/10 bg-black/40 p-5">
                  <p className="text-sm font-bold text-zinc-500">Valor</p>

                  <p className="mt-1 text-3xl font-black text-white">
                    {product.price}
                  </p>
                </div>

                <ul className="mb-6 space-y-3">
                  {product.features.slice(0, 6).map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-3 text-sm leading-relaxed text-zinc-300"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(255,0,150,0.8)]" />
                      <span>{feature}</span>
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
                    : isInstagramLink(product.paymentLink)
                    ? "Chamar no direct"
                    : "Comprar agora"}
                </button>
              </article>
            ))}
          </div>
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