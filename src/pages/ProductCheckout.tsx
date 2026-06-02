import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
};

type PaymentMethod = "pix" | "boleto";

type PaymentResult = {
  success: boolean;
  product: SiteProduct;
  order: any;
  appmax: {
    customer_id: string;
    order_id: string;
    payment_id: string | null;
  };
  payment: {
    method: PaymentMethod;
    pix: {
      qr_code: string | null;
      copy_paste: string | null;
    };
    boleto: {
      url: string | null;
      barcode: string | null;
      digitable_line: string | null;
    };
    raw: any;
  };
};

const categoryLabels: Record<string, string> = {
  assessoria: "Assessoria Mensal",
  "servicos-unicos": "Serviços Únicos",
  sites: "Sites e Landing Pages",
  identidade: "Identidade e Posicionamento",
  academy: "Academy",
};

function formatMoney(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function maskCpf(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);

  return numbers
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskPhone(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);

  if (numbers.length <= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numbers
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function getCategoryLabel(category: string) {
  return categoryLabels[category] || category;
}

function getDeliveryType(product: SiteProduct) {
  if (product.product_type === "subscription") return "Mensal";
  if (product.product_type === "course") return "Acesso vitalício";
  if (product.product_type === "site") return "Projeto único";
  if (product.product_type === "branding") return "Entrega estratégica";
  if (product.product_type === "diagnostic") return "Diagnóstico";
  return "Entrega única";
}

function canRenderImage(value: string | null) {
  if (!value) return false;

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image")
  );
}

export default function ProductCheckout({ user: userFromApp }: any) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const slug = searchParams.get("slug") || "";

  const [product, setProduct] = useState<SiteProduct | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(userFromApp || null);

  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    startPage();
  }, [slug]);

  async function startPage() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUser(user || userFromApp || null);

    if (user) {
      setCustomerEmail(user.email || "");
      setCustomerName(
        user.user_metadata?.nome ||
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          ""
      );
    }

    if (!slug) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("site_products")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    setLoading(false);

    if (error || !data) {
      console.log("Erro ao carregar produto:", error);
      setProduct(null);
      return;
    }

    setProduct(data);

    if (!data.accepts_pix && data.accepts_boleto) {
      setPaymentMethod("boleto");
    }
  }

  const paymentOptions = useMemo(() => {
    if (!product) return [];

    const options: { id: PaymentMethod; label: string; description: string }[] = [];

    if (product.accepts_pix) {
      options.push({
        id: "pix",
        label: "Pix",
        description: "Copia e cola gerado na hora.",
      });
    }

    if (product.accepts_boleto) {
      options.push({
        id: "boleto",
        label: "Boleto",
        description: "Linha digitável e link do boleto.",
      });
    }

    return options;
  }, [product]);

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert("Não consegui copiar automaticamente. Copie manualmente.");
    }
  }

  async function createPayment() {
    if (!product) return;

    const cleanPhone = onlyNumbers(customerPhone);
    const cleanCpf = onlyNumbers(documentNumber);

    if (!customerName.trim()) {
      alert("Digite seu nome.");
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      alert("Digite um email válido.");
      return;
    }

    if (cleanPhone.length < 10) {
      alert("Digite um WhatsApp válido.");
      return;
    }

    if (cleanCpf.length !== 11) {
      alert("Digite um CPF válido.");
      return;
    }

    if (paymentMethod === "pix" && !product.accepts_pix) {
      alert("Esse produto não aceita Pix.");
      return;
    }

    if (paymentMethod === "boleto" && !product.accepts_boleto) {
      alert("Esse produto não aceita boleto.");
      return;
    }

    setCreatingPayment(true);
    setPaymentResult(null);
    setCopied(false);

    try {
      const response = await fetch("/api/create-product-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser?.id || null,
          userEmail: customerEmail.trim(),
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          documentNumber: cleanCpf,
          productSlug: product.slug,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("Erro pagamento produto:", data);
        alert(data?.error || "Erro ao criar pagamento.");
        setCreatingPayment(false);
        return;
      }

      setPaymentResult(data);
    } catch (error) {
      console.log("Erro inesperado ao criar pagamento:", error);
      alert("Erro inesperado ao criar pagamento.");
    } finally {
      setCreatingPayment(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">Carregando checkout...</h1>
          <p className="mt-3 text-zinc-400">Buscando produto na FatorZ.</p>
        </div>
      </div>
    );
  }

  if (!slug || !product) {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">Produto não encontrado</h1>

          <p className="mt-3 text-zinc-400">
            Esse produto não existe, está oculto ou o link está errado.
          </p>

          <button
            onClick={() => navigate("/")}
            className="mt-6 rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
          >
            Voltar para a FatorZ
          </button>
        </div>
      </div>
    );
  }

  if (product.checkout_provider === "manual") {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">{product.name}</h1>

          <p className="mt-3 text-zinc-400">
            Esse produto está configurado para atendimento manual.
          </p>

          <button
            onClick={() =>
              window.open("https://www.instagram.com/fatorzhouse/", "_blank")
            }
            className="mt-6 rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
          >
            Chamar no Instagram
          </button>
        </div>
      </div>
    );
  }

  if (product.checkout_provider === "external") {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">{product.name}</h1>

          <p className="mt-3 text-zinc-400">
            Esse produto usa um link externo de pagamento.
          </p>

          <button
            onClick={() => {
              if (product.external_payment_url) {
                window.open(product.external_payment_url, "_blank");
              }
            }}
            className="mt-6 rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
          >
            Abrir pagamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(0,92,255,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,0,150,0.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.14),transparent_34%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
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

      <main className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
        <section className="h-fit rounded-[38px] border border-white/10 bg-black/60 p-6 md:p-8">
          {product.image_url && (
            <div className="mb-6 h-56 overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900">
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-pink-300">
              {getCategoryLabel(product.category)}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-300">
              {getDeliveryType(product)}
            </span>

            {product.badge && (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-300">
                {product.badge}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            {product.name}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-zinc-400">
            {product.description ||
              product.subtitle ||
              "Solução FatorZ para organizar sua presença digital."}
          </p>

          <div className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-sm font-black uppercase tracking-widest text-zinc-500">
              Valor
            </p>

            <div className="mt-2 flex flex-wrap items-end gap-3">
              {product.old_price_cents && (
                <p className="pb-1 text-lg font-black text-zinc-500 line-through">
                  {formatMoney(product.old_price_cents)}
                </p>
              )}

              <p className="text-4xl font-black text-white">
                {formatMoney(product.price_cents)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="font-black">Compra protegida pela Appmax</p>
              <p className="mt-1 text-sm text-zinc-500">
                O pagamento é gerado pela integração da FatorZ com Appmax.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="font-black">Pedido registrado no Hub</p>
              <p className="mt-1 text-sm text-zinc-500">
                Depois do pagamento, o pedido fica salvo para controle interno.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[38px] border border-white/10 bg-black/60 p-6 md:p-8">
          <div className="mb-7">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-pink-400">
              Checkout FatorZ
            </p>

            <h2 className="text-3xl font-black md:text-4xl">
              Finalizar compra
            </h2>

            <p className="mt-3 text-zinc-400">
              Preencha os dados para gerar o pagamento.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-black text-zinc-300">
                Nome completo
              </label>

              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-zinc-300">
                Email
              </label>

              <input
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="seuemail@gmail.com"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-zinc-300">
                  WhatsApp
                </label>

                <input
                  value={customerPhone}
                  onChange={(event) =>
                    setCustomerPhone(maskPhone(event.target.value))
                  }
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-zinc-300">
                  CPF
                </label>

                <input
                  value={documentNumber}
                  onChange={(event) =>
                    setDocumentNumber(maskCpf(event.target.value))
                  }
                  placeholder="000.000.000-00"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="mb-3 block text-sm font-black text-zinc-300">
                Forma de pagamento
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                {paymentOptions.map((option) => {
                  const active = paymentMethod === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(option.id);
                        setPaymentResult(null);
                      }}
                      className={`rounded-2xl border p-5 text-left transition ${
                        active
                          ? "border-pink-500/45 bg-pink-500/10"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                      }`}
                    >
                      <p className="text-lg font-black">{option.label}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {!paymentOptions.length && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
                  Esse produto não tem Pix ou boleto ativo.
                </div>
              )}
            </div>

            <button
              onClick={createPayment}
              disabled={creatingPayment || !paymentOptions.length}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-5 text-lg font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingPayment
                ? "Gerando pagamento..."
                : paymentMethod === "pix"
                ? "Gerar Pix"
                : "Gerar Boleto"}
            </button>
          </div>

          {paymentResult && paymentResult.payment.method === "pix" && (
            <div className="mt-8 rounded-[30px] border border-emerald-400/20 bg-emerald-500/10 p-6">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-emerald-300">
                Pix gerado
              </p>

              <h3 className="text-2xl font-black">Pague usando Pix copia e cola</h3>

              {canRenderImage(paymentResult.payment.pix.qr_code) && (
                <div className="mt-5 flex justify-center">
                  <img
                    src={paymentResult.payment.pix.qr_code || ""}
                    alt="QR Code Pix"
                    className="max-h-64 rounded-2xl border border-white/10 bg-white p-3"
                  />
                </div>
              )}

              {paymentResult.payment.pix.copy_paste ? (
                <>
                  <textarea
                    readOnly
                    value={paymentResult.payment.pix.copy_paste}
                    className="mt-5 h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white outline-none"
                  />

                  <button
                    onClick={() =>
                      copyToClipboard(paymentResult.payment.pix.copy_paste || "")
                    }
                    className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
                  >
                    {copied ? "Copiado!" : "Copiar Pix"}
                  </button>
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-yellow-200">
                  O Pix foi criado, mas a Appmax não retornou o código copia e
                  cola no formato esperado.
                </div>
              )}

              <p className="mt-4 text-sm text-emerald-200/80">
                Pedido Appmax: {paymentResult.appmax.order_id}
              </p>
            </div>
          )}

          {paymentResult && paymentResult.payment.method === "boleto" && (
            <div className="mt-8 rounded-[30px] border border-yellow-400/20 bg-yellow-500/10 p-6">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
                Boleto gerado
              </p>

              <h3 className="text-2xl font-black">Pague pelo boleto</h3>

              {paymentResult.payment.boleto.digitable_line && (
                <>
                  <p className="mt-5 text-sm font-black text-zinc-300">
                    Linha digitável
                  </p>

                  <textarea
                    readOnly
                    value={paymentResult.payment.boleto.digitable_line}
                    className="mt-2 h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white outline-none"
                  />

                  <button
                    onClick={() =>
                      copyToClipboard(
                        paymentResult.payment.boleto.digitable_line || ""
                      )
                    }
                    className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
                  >
                    {copied ? "Copiado!" : "Copiar linha digitável"}
                  </button>
                </>
              )}

              {paymentResult.payment.boleto.barcode &&
                !paymentResult.payment.boleto.digitable_line && (
                  <>
                    <p className="mt-5 text-sm font-black text-zinc-300">
                      Código de barras
                    </p>

                    <textarea
                      readOnly
                      value={paymentResult.payment.boleto.barcode}
                      className="mt-2 h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white outline-none"
                    />

                    <button
                      onClick={() =>
                        copyToClipboard(paymentResult.payment.boleto.barcode || "")
                      }
                      className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
                    >
                      {copied ? "Copiado!" : "Copiar código"}
                    </button>
                  </>
                )}

              {paymentResult.payment.boleto.url && (
                <button
                  onClick={() =>
                    window.open(paymentResult.payment.boleto.url || "", "_blank")
                  }
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
                >
                  Abrir boleto
                </button>
              )}

              {!paymentResult.payment.boleto.url &&
                !paymentResult.payment.boleto.barcode &&
                !paymentResult.payment.boleto.digitable_line && (
                  <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-yellow-200">
                    O boleto foi criado, mas a Appmax não retornou o link ou linha
                    digitável no formato esperado.
                  </div>
                )}

              <p className="mt-4 text-sm text-yellow-100/80">
                Pedido Appmax: {paymentResult.appmax.order_id}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}