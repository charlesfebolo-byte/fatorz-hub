import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type ProductSummary = {
  id: number | null;
  name: string;
  slug: string | null;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  product_type: string | null;
  price_cents: number | null;
  old_price_cents: number | null;
  image_url: string | null;
  badge: string | null;
  course_id?: number | null;
};

type OrderSummary = {
  success: boolean;
  order: {
    id: number;
    created_at: string | null;
    updated_at: string | null;
    status: "pending" | "approved" | "cancelled";
    amount_cents: number | null;
    payment_provider: string | null;
    payment_method: string | null;
  };
  product: ProductSummary;
  payment: {
    method: string | null;
    status: "pending" | "approved" | "cancelled";
    pix: {
      qr_code: string | null;
      copy_paste: string | null;
    };
    boleto: {
      url: string | null;
      barcode: string | null;
      digitable_line: string | null;
      expiration_date: string | null;
    };
  };
  next_step: {
    needs_briefing: boolean;
    is_academy_course: boolean;
    course_id: number | null;
  };
  upsell: ProductSummary | null;
};

function formatMoney(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Agora";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentMethodLabel(method: string | null | undefined) {
  if (method === "pix") return "Pix";
  if (method === "boleto") return "Boleto";
  if (method === "card") return "Cartão";

  return "Pagamento";
}

function getStatusLabel(status: string | null | undefined) {
  if (status === "approved") return "Pagamento aprovado";
  if (status === "cancelled") return "Pagamento recusado";

  return "Aguardando pagamento";
}

function getStatusClass(status: string | null | undefined) {
  if (status === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "cancelled") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
}

function canRenderImage(value: string | null | undefined) {
  if (!value) return false;

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image")
  );
}

export default function ThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";

  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
    });
  }, []);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    loadOrderSummary(orderId);
  }, [orderId]);

  async function loadOrderSummary(id: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/get-order-summary?orderId=${encodeURIComponent(id)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Não foi possível carregar o pedido.");
        setSummary(null);
        return;
      }

      setSummary(data);
    } catch (err) {
      console.log("Erro ao carregar resumo do pedido:", err);
      setError("Não foi possível carregar o pedido agora.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      alert("Não consegui copiar automaticamente. Copie manualmente.");
    }
  }

  const mainTitle = useMemo(() => {
    if (!summary) return "Obrigado pela compra.";
    if (summary.order.status === "approved") return "Pedido confirmado.";
    if (summary.order.status === "cancelled") return "Pagamento não aprovado.";

    return "Pedido criado.";
  }, [summary]);

  const nextStep = useMemo(() => {
    if (!summary) {
      return {
        title: "Acesse o Hub",
        text: "Entre na sua conta para acompanhar compras, entregas e próximos passos.",
        action: "Entrar no Hub",
        onClick: () => navigate("/login"),
      };
    }

    if (summary.order.status === "cancelled") {
      return {
        title: "Tente novamente",
        text: "O pagamento não foi aprovado. Você pode voltar ao checkout e escolher outra forma de pagamento.",
        action: "Voltar ao checkout",
        onClick: () =>
          summary.product.slug
            ? navigate(`/checkout/produto?slug=${summary.product.slug}`)
            : navigate("/"),
      };
    }

    if (summary.next_step.is_academy_course) {
      if (summary.order.status === "approved") {
        return {
          title: "Seu curso está pronto para acesso",
          text: isLoggedIn
            ? "Acesse a Academy com a mesma conta usada na compra."
            : "Entre ou crie sua conta para acessar a Academy quando a compra estiver vinculada.",
          action: isLoggedIn ? "Acessar Academy" : "Entrar ou criar conta",
          onClick: () => navigate(isLoggedIn ? "/academy" : "/login"),
        };
      }

      return {
        title: "Aguardando liberação da Academy",
        text: "Assim que a Appmax confirmar o pagamento, o acesso ao curso será liberado automaticamente. Não é necessário comprar de novo.",
        action: isLoggedIn ? "Verificar Academy" : "Entrar ou criar conta",
        onClick: () => navigate(isLoggedIn ? "/academy" : "/login"),
      };
    }

    if (summary.next_step.needs_briefing) {
      return {
        title: "Preencha o briefing",
        text:
          summary.order.status === "pending"
            ? "Você pode deixar a ficha pronta enquanto o pagamento é confirmado."
            : "Envie as informações da sua marca para a equipe iniciar a entrega.",
        action: "Preencher briefing",
        onClick: () => navigate(`/briefing?orderId=${summary.order.id}`),
      };
    }

    if (summary.order.status === "pending") {
      return {
        title: "Aguarde a confirmação",
        text: "O pedido já foi criado. Assim que o pagamento for confirmado, o status será atualizado no Hub.",
        action: "Ver minhas entregas",
        onClick: () => navigate("/minhas-entregas"),
      };
    }

    return {
      title: "Acompanhe pelo Hub",
      text: "Seu pedido ficará disponível no painel para acompanhamento e próximos passos.",
      action: "Ver minhas entregas",
      onClick: () => navigate("/minhas-entregas"),
    };
  }, [isLoggedIn, navigate, summary]);

  const paymentInstruction = summary?.payment;
  const isPending = summary?.order.status === "pending";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#09090B] text-white">
      <header className="border-b border-zinc-800 bg-[#09090B]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-black md:text-3xl"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <button
            onClick={() => navigate(isLoggedIn ? "/dashboard" : "/login")}
            className="rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 font-black hover:bg-zinc-800"
          >
            {isLoggedIn ? "Abrir Hub" : "Entrar"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        {loading ? (
          <section className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h1 className="text-3xl font-black">Carregando pedido...</h1>
            <p className="mt-3 text-zinc-400">
              Buscando as informações de pós-compra.
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[32px] border border-red-500/25 bg-red-500/10 p-8">
            <p className="mb-4 w-fit rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300">
              Pedido não localizado
            </p>
            <h1 className="text-4xl font-black">Não encontrei esse pedido.</h1>
            <p className="mt-4 max-w-2xl text-zinc-300">{error}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/minhas-entregas")}
                className="rounded-2xl bg-white px-6 py-4 font-black text-black hover:bg-zinc-200"
              >
                Ver minhas entregas
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black hover:bg-white/[0.08]"
              >
                Voltar para a FatorZ
              </button>
            </div>
          </section>
        ) : (
          <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div
                className={`mb-6 w-fit rounded-2xl border px-5 py-3 font-black ${getStatusClass(
                  summary?.order.status
                )}`}
              >
                {getStatusLabel(summary?.order.status)}
              </div>

              <h1 className="mb-6 text-5xl font-black leading-[0.95] md:text-7xl">
                {mainTitle}
              </h1>

              <p className="mb-8 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
                {summary
                  ? `Pedido #${summary.order.id} registrado em ${formatDateTime(
                      summary.order.created_at
                    )}.`
                  : "Seu pedido foi registrado na FatorZ."}
              </p>

              {summary && (
                <div className="mb-6 rounded-[32px] border border-zinc-800 bg-zinc-900 p-6">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                    Produto comprado
                  </p>
                  <div className="flex flex-col gap-5 md:flex-row">
                    {canRenderImage(summary.product.image_url) && (
                      <img
                        src={summary.product.image_url || ""}
                        alt={summary.product.name}
                        className="h-36 w-full rounded-3xl border border-white/10 object-cover md:w-44"
                      />
                    )}

                    <div className="flex-1">
                      <h2 className="text-2xl font-black">
                        {summary.product.name}
                      </h2>
                      <p className="mt-2 text-zinc-400">
                        {summary.product.subtitle ||
                          summary.product.description ||
                          "Produto FatorZ"}
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                          <p className="text-sm text-zinc-500">Valor</p>
                          <p className="mt-1 font-black">
                            {formatMoney(summary.order.amount_cents)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                          <p className="text-sm text-zinc-500">Pagamento</p>
                          <p className="mt-1 font-black">
                            {getPaymentMethodLabel(summary.order.payment_method)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                          <p className="text-sm text-zinc-500">Status</p>
                          <p className="mt-1 font-black">
                            {getStatusLabel(summary.order.status)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {summary &&
                paymentInstruction?.method === "pix" &&
                isPending && (
                  <div className="mb-6 rounded-[32px] border border-emerald-400/20 bg-emerald-500/10 p-6">
                    <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-emerald-300">
                      Pix pendente
                    </p>
                    <h2 className="text-2xl font-black">
                      Pague com Pix copia e cola
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-emerald-100/80">
                      Após o pagamento, a Appmax confirma automaticamente e o
                      status do pedido é atualizado.
                    </p>

                    {canRenderImage(paymentInstruction.pix.qr_code) && (
                      <div className="mt-5 flex justify-center">
                        <img
                          src={paymentInstruction.pix.qr_code || ""}
                          alt="QR Code Pix"
                          className="max-h-64 rounded-2xl border border-white/10 bg-white p-3"
                        />
                      </div>
                    )}

                    {paymentInstruction.pix.copy_paste ? (
                      <>
                        <textarea
                          readOnly
                          value={paymentInstruction.pix.copy_paste}
                          className="mt-5 h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white outline-none"
                        />
                        <button
                          onClick={() =>
                            copyToClipboard(
                              paymentInstruction.pix.copy_paste || "",
                              "pix"
                            )
                          }
                          className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-black text-black hover:bg-zinc-200"
                        >
                          {copied === "pix" ? "Pix copiado!" : "Copiar Pix"}
                        </button>
                      </>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-yellow-200">
                        O Pix foi criado, mas o código copia e cola não está
                        disponível neste resumo. Se precisar, acesse Minhas
                        Entregas ou fale com a FatorZ.
                      </div>
                    )}
                  </div>
                )}

              {summary && paymentInstruction?.method === "boleto" && isPending && (
                <div className="mb-6 rounded-[32px] border border-yellow-400/20 bg-yellow-500/10 p-6">
                  <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
                    Boleto pendente
                  </p>
                  <h2 className="text-2xl font-black">Pague pelo boleto</h2>
                  <p className="mt-3 text-sm leading-relaxed text-yellow-100/80">
                    A compensação do boleto pode levar mais tempo. Assim que o
                    pagamento for confirmado, o status será atualizado.
                  </p>

                  {(paymentInstruction.boleto.digitable_line ||
                    paymentInstruction.boleto.barcode) && (
                    <>
                      <p className="mt-5 text-sm font-black text-zinc-300">
                        Linha digitável / código
                      </p>
                      <textarea
                        readOnly
                        value={
                          paymentInstruction.boleto.digitable_line ||
                          paymentInstruction.boleto.barcode ||
                          ""
                        }
                        className="mt-2 h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white outline-none"
                      />
                      <button
                        onClick={() =>
                          copyToClipboard(
                            paymentInstruction.boleto.digitable_line ||
                              paymentInstruction.boleto.barcode ||
                              "",
                            "boleto"
                          )
                        }
                        className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-black text-black hover:bg-zinc-200"
                      >
                        {copied === "boleto" ? "Código copiado!" : "Copiar código"}
                      </button>
                    </>
                  )}

                  {paymentInstruction.boleto.url && (
                    <button
                      onClick={() =>
                        window.open(paymentInstruction.boleto.url || "", "_blank")
                      }
                      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white hover:opacity-90"
                    >
                      Abrir boleto
                    </button>
                  )}
                </div>
              )}

              {summary && paymentInstruction?.method === "card" && (
                <div className="mb-6 rounded-[32px] border border-blue-400/20 bg-blue-500/10 p-6">
                  <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-blue-300">
                    Cartão
                  </p>
                  <h2 className="text-2xl font-black">
                    {summary.order.status === "approved"
                      ? "Pagamento aprovado"
                      : summary.order.status === "cancelled"
                        ? "Pagamento recusado"
                        : "Pagamento em análise"}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-blue-100/80">
                    {summary.order.status === "approved"
                      ? "A compra foi aprovada. Siga o próximo passo abaixo."
                      : summary.order.status === "cancelled"
                        ? "A cobrança não foi aprovada. Você pode tentar novamente no checkout."
                        : "A Appmax ainda está analisando o retorno do pagamento. Aguarde a confirmação automática."}
                  </p>
                </div>
              )}

              <div className="rounded-[32px] border border-pink-500/25 bg-pink-500/10 p-6">
                <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-pink-300">
                  Próximo passo
                </p>
                <h2 className="text-2xl font-black">{nextStep.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {nextStep.text}
                </p>
                <button
                  onClick={nextStep.onClick}
                  className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white hover:opacity-90"
                >
                  {nextStep.action}
                </button>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[36px] border border-zinc-800 bg-zinc-900 p-6">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                  Resumo
                </p>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                    <p className="text-sm text-zinc-500">Pedido</p>
                    <p className="mt-1 text-xl font-black">
                      #{summary?.order.id || orderId || "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                    <p className="text-sm text-zinc-500">Status</p>
                    <p className="mt-1 text-xl font-black">
                      {getStatusLabel(summary?.order.status)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                    <p className="text-sm text-zinc-500">Gateway</p>
                    <p className="mt-1 text-xl font-black">Appmax</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/minhas-entregas")}
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black hover:bg-white/[0.08]"
                >
                  Ver no Hub
                </button>
              </div>

              {summary?.upsell && (
                <div className="rounded-[36px] border border-white/10 bg-black p-6">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                    Oferta complementar
                  </p>

                  {canRenderImage(summary.upsell.image_url) && (
                    <img
                      src={summary.upsell.image_url || ""}
                      alt={summary.upsell.name}
                      className="mb-5 h-44 w-full rounded-3xl border border-white/10 object-cover"
                    />
                  )}

                  <h2 className="text-3xl font-black">{summary.upsell.name}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {summary.upsell.subtitle ||
                      summary.upsell.description ||
                      "Uma próxima etapa para evoluir sua presença digital com a FatorZ."}
                  </p>

                  <div className="mt-5 rounded-3xl border border-white/10 bg-zinc-900 p-5">
                    <p className="text-sm font-bold text-zinc-500">Valor</p>
                    <div className="mt-1 flex items-end gap-2">
                      {summary.upsell.old_price_cents ? (
                        <span className="pb-1 text-sm font-black text-zinc-600 line-through">
                          {formatMoney(summary.upsell.old_price_cents)}
                        </span>
                      ) : null}
                      <strong className="text-3xl font-black">
                        {formatMoney(summary.upsell.price_cents)}
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      navigate(
                        `/checkout/produto?slug=${summary.upsell?.slug}&source=post_purchase&originOrderId=${summary.order.id}`
                      )
                    }
                    className="mt-5 w-full rounded-2xl bg-white px-6 py-4 font-black text-black hover:bg-zinc-200"
                  >
                    Ver oferta complementar
                  </button>

                  <button
                    onClick={() => navigate("/minhas-entregas")}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white hover:bg-white/[0.08]"
                  >
                    Continuar sem oferta
                  </button>
                </div>
              )}
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}
