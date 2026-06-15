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

function getBadgeClass(status: string | null | undefined) {
  if (status === "approved") {
    return "border-emerald-400/35 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "cancelled") {
    return "border-red-400/35 bg-red-500/10 text-red-200";
  }

  return "border-yellow-400/35 bg-yellow-400/10 text-yellow-200";
}

function canRenderImage(value: string | null | undefined) {
  if (!value) return false;

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image")
  );
}

function cardClass(extra = "") {
  return [
    "rounded-[28px] border border-white/10 bg-[#111115]/90 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.32)] md:p-7",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
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

  const hero = useMemo(() => {
    if (!summary) {
      return {
        badge: "Pedido recebido",
        title: "Obrigado por escolher a FatorZ.",
        text: "Estamos buscando as informações do seu pedido para mostrar o próximo passo com clareza.",
        note: "Seu pedido está sendo preparado no nosso sistema.",
      };
    }

    if (summary.order.status === "approved") {
      return {
        badge: "Pedido confirmado",
        title: "Obrigado pela compra!",
        text: "Seu pedido foi confirmado com sucesso. Agora siga o próximo passo para começarmos sua entrega.",
        note: "Obrigado por escolher a FatorZ. Vamos cuidar dos próximos passos com atenção.",
      };
    }

    if (summary.order.status === "cancelled") {
      return {
        badge: "Quase lá",
        title: "Quase lá",
        text: "Não conseguimos confirmar o pagamento. Você pode tentar novamente ou escolher outra forma de pagamento.",
        note: "Seu pedido ficou registrado, mas precisa de uma nova confirmação de pagamento para avançar.",
      };
    }

    return {
      badge: "Aguardando pagamento",
      title: "Obrigado pelo pedido!",
      text: "Recebemos sua solicitação. Agora falta só confirmar o pagamento para iniciarmos sua entrega.",
      note: "Obrigado por escolher a FatorZ. Seu pedido já está registrado no nosso sistema.",
    };
  }, [summary]);

  const nextStep = useMemo(() => {
    if (!summary) {
      return {
        eyebrow: "Próximo passo",
        title: "Acesse o Hub",
        text: "Entre na sua conta para acompanhar compras, entregas e próximos passos.",
        action: "Entrar no Hub",
        onClick: () => navigate("/login"),
      };
    }

    if (summary.order.status === "cancelled") {
      return {
        eyebrow: "Próximo passo",
        title: "Tente novamente",
        text: "Volte ao checkout para gerar uma nova cobrança com Pix, boleto ou cartão.",
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
          eyebrow: "Academy",
          title: "Acesse seu curso",
          text: isLoggedIn
            ? "Seu acesso fica vinculado à conta usada na compra. Entre na Academy para continuar."
            : "Entre ou crie sua conta com o mesmo e-mail usado na compra para acessar a Academy.",
          action: isLoggedIn ? "Acessar Academy" : "Entrar ou criar conta",
          onClick: () => navigate(isLoggedIn ? "/academy" : "/login"),
        };
      }

      return {
        eyebrow: "Academy",
        title: "Aguardando liberação",
        text: "Assim que o pagamento for confirmado, seu acesso será liberado conforme o e-mail usado na compra.",
        action: isLoggedIn ? "Verificar Academy" : "Entrar ou criar conta",
        onClick: () => navigate(isLoggedIn ? "/academy" : "/login"),
      };
    }

    if (summary.next_step.needs_briefing) {
      if (summary.order.status === "pending") {
        return {
          eyebrow: "Próximo passo",
          title: "Depois do pagamento",
          text: "Assim que o pagamento for confirmado, preencha o briefing para nossa equipe começar sua entrega com as informações certas.",
          action: "Preencher briefing",
          onClick: () => navigate(`/briefing?orderId=${summary.order.id}`),
        };
      }

      return {
        eyebrow: "Próximo passo",
        title: "Preencha o briefing",
        text: "Envie as informações da sua marca para nossa equipe começar sua entrega com as informações certas.",
        action: "Preencher briefing",
        onClick: () => navigate(`/briefing?orderId=${summary.order.id}`),
      };
    }

    if (summary.order.status === "pending") {
      return {
        eyebrow: "Próximo passo",
        title: "Aguarde a confirmação",
        text: "Seu pedido já está registrado no nosso sistema. Assim que o pagamento for confirmado, seguimos para a próxima etapa.",
        action: "Ver minhas entregas",
        onClick: () => navigate("/minhas-entregas"),
      };
    }

    return {
      eyebrow: "Próximo passo",
      title: "Acompanhe pelo Hub",
      text: "Seu pedido ficará disponível no painel para acompanhamento e próximos passos.",
      action: "Ver minhas entregas",
      onClick: () => navigate("/minhas-entregas"),
    };
  }, [isLoggedIn, navigate, summary]);

  const payment = summary?.payment;
  const isPending = summary?.order.status === "pending";
  const boletoCode = payment?.boleto.digitable_line || payment?.boleto.barcode || "";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08080a] text-white">
      <header className="border-b border-white/10 bg-[#08080a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 md:px-8">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-black md:text-3xl"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <button
            onClick={() => navigate(isLoggedIn ? "/dashboard" : "/login")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-zinc-200 transition hover:bg-white/[0.08]"
          >
            {isLoggedIn ? "Abrir Hub" : "Entrar"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
        {loading ? (
          <section className={cardClass("text-center")}>
            <p className="mx-auto mb-4 w-fit rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-200">
              Pós-compra
            </p>
            <h1 className="text-3xl font-black md:text-4xl">
              Carregando seu pedido
            </h1>
            <p className="mt-3 text-zinc-400">
              Estamos preparando as informações de pagamento.
            </p>
          </section>
        ) : error ? (
          <section className={cardClass("border-red-500/25 bg-red-500/10")}>
            <p className="mb-4 w-fit rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-200">
              Pedido não localizado
            </p>
            <h1 className="text-4xl font-black">Não encontrei esse pedido</h1>
            <p className="mt-4 max-w-2xl text-zinc-300">{error}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/minhas-entregas")}
                className="rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
              >
                Ver minhas entregas
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black transition hover:bg-white/[0.08]"
              >
                Voltar para a FatorZ
              </button>
            </div>
          </section>
        ) : (
          <div className="space-y-6 md:space-y-7">
            <section className="rounded-[32px] border border-white/10 bg-[#0f0f14] px-5 py-8 shadow-[0_28px_120px_rgba(0,0,0,0.38)] md:px-8 md:py-10">
              <div className="max-w-3xl">
                <p
                  className={`mb-5 w-fit rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em] ${getBadgeClass(
                    summary?.order.status
                  )}`}
                >
                  {hero.badge}
                </p>
                <h1 className="text-4xl font-black leading-tight md:text-6xl">
                  {hero.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
                  {hero.text}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500">
                  {hero.note}
                </p>
                {summary?.order.created_at && (
                  <p className="mt-5 text-sm font-bold text-zinc-600">
                    Pedido #{summary.order.id} criado em{" "}
                    {formatDateTime(summary.order.created_at)}
                  </p>
                )}
              </div>
            </section>

            {summary && payment?.method === "pix" && isPending && (
              <section className={cardClass("border-emerald-400/25")}>
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
                      Pagamento
                    </p>
                    <h2 className="text-3xl font-black md:text-4xl">
                      Pague com Pix
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                      Copie o código Pix abaixo ou escaneie o QR Code. A
                      confirmação acontece automaticamente após o pagamento.
                      Enquanto isso, mantenha o código Pix salvo.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-start">
                  {canRenderImage(payment.pix.qr_code) && (
                    <div className="rounded-[24px] border border-white/10 bg-white p-3">
                      <img
                        src={payment.pix.qr_code || ""}
                        alt="QR Code Pix"
                        className="mx-auto aspect-square w-full max-w-[220px] object-contain"
                      />
                    </div>
                  )}

                  <div>
                    {payment.pix.copy_paste ? (
                      <>
                        <textarea
                          readOnly
                          value={payment.pix.copy_paste}
                          className="h-36 w-full resize-none rounded-2xl border border-white/10 bg-black/55 p-4 text-sm leading-relaxed text-white outline-none"
                        />
                        <button
                          onClick={() =>
                            copyToClipboard(payment.pix.copy_paste || "", "pix")
                          }
                          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-5 text-lg font-black text-white shadow-[0_18px_55px_rgba(236,72,153,0.22)] transition hover:opacity-90"
                        >
                          {copied === "pix"
                            ? "Código Pix copiado"
                            : "Copiar código Pix"}
                        </button>
                        <p className="mt-3 text-center text-xs font-bold text-zinc-500">
                          Não feche esta página antes de salvar ou copiar seu Pix.
                          Assim que o pagamento for confirmado, seguimos para a próxima etapa.
                        </p>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm leading-relaxed text-yellow-100">
                        O Pix foi criado, mas o código copia e cola não está
                        disponível neste resumo. Acesse Minhas Entregas ou fale
                        com a FatorZ se precisar recuperar o pagamento.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {summary && payment?.method === "boleto" && isPending && (
              <section className={cardClass("border-yellow-400/25")}>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-yellow-300">
                  Pagamento
                </p>
                <h2 className="text-3xl font-black md:text-4xl">
                  Pague pelo boleto
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                  Use a linha digitável ou abra o boleto em uma nova aba. A
                  compensação pode levar mais tempo, e a confirmação acontece
                  automaticamente. Seu pedido já está registrado no nosso sistema.
                </p>

                {boletoCode && (
                  <div className="mt-6">
                    <p className="mb-2 text-sm font-black text-zinc-300">
                      Linha digitável
                    </p>
                    <textarea
                      readOnly
                      value={boletoCode}
                      className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/55 p-4 text-sm leading-relaxed text-white outline-none"
                    />
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {payment.boleto.url && (
                    <button
                      onClick={() => window.open(payment.boleto.url || "", "_blank")}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-5 text-lg font-black text-white shadow-[0_18px_55px_rgba(236,72,153,0.22)] transition hover:opacity-90"
                    >
                      Abrir boleto
                    </button>
                  )}

                  {boletoCode && (
                    <button
                      onClick={() => copyToClipboard(boletoCode, "boleto")}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-5 font-black text-white transition hover:bg-white/[0.09]"
                    >
                      {copied === "boleto"
                        ? "Linha copiada"
                        : "Copiar linha digitável"}
                    </button>
                  )}
                </div>
              </section>
            )}

            {summary && payment?.method === "card" && (
              <section
                className={cardClass(
                  summary.order.status === "cancelled"
                    ? "border-red-400/25"
                    : summary.order.status === "approved"
                      ? "border-emerald-400/25"
                      : "border-blue-400/25"
                )}
              >
                <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Cartão
                </p>
                <h2 className="text-3xl font-black md:text-4xl">
                  {summary.order.status === "approved"
                    ? "Pagamento aprovado"
                    : summary.order.status === "cancelled"
                      ? "Pagamento recusado"
                      : "Pagamento em análise"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                  {summary.order.status === "approved"
                    ? "Tudo certo com a cobrança. Agora siga o próximo passo para avançarmos com sua entrega."
                    : summary.order.status === "cancelled"
                      ? "A cobrança não foi aprovada. Você pode voltar ao checkout e tentar outra forma de pagamento."
                      : "Seu pedido já está registrado. A Appmax ainda está analisando o retorno do pagamento, então aguarde a confirmação automática antes de comprar novamente."}
                </p>
              </section>
            )}

            <section className={cardClass("border-pink-500/25 bg-[#130d16]/90")}>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-pink-300">
                {nextStep.eyebrow}
              </p>
              <h2 className="text-3xl font-black md:text-4xl">
                {nextStep.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base">
                {nextStep.text}
              </p>
              <button
                onClick={nextStep.onClick}
                className="mt-6 w-full rounded-2xl bg-white px-6 py-5 text-lg font-black text-black transition hover:bg-zinc-200 md:w-auto md:min-w-64"
              >
                {nextStep.action}
              </button>
            </section>

            {summary && (
              <section className={cardClass("bg-[#0d0d11]/90")}>
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
                      Resumo do pedido
                    </p>
                    <h2 className="text-2xl font-black">
                      {summary.product.name}
                    </h2>
                  </div>
                  <p className="text-sm font-bold text-zinc-600">
                    Pedido #{summary.order.id}
                  </p>
                </div>

                <div className="grid gap-0 overflow-hidden rounded-2xl border border-white/10 md:grid-cols-4">
                  {[
                    ["Produto", summary.product.name],
                    ["Valor", formatMoney(summary.order.amount_cents)],
                    [
                      "Método",
                      getPaymentMethodLabel(summary.order.payment_method),
                    ],
                    ["Status", getStatusLabel(summary.order.status)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="border-b border-white/10 bg-black/25 p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-600">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-black text-zinc-200">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {summary?.upsell && (
              <section className={cardClass("border-blue-400/20 bg-[#0c0d14]/90")}>
                <div className="grid gap-6 md:grid-cols-[1fr_300px] md:items-center">
                  <div>
                    <p className="mb-3 w-fit rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                      Opcional
                    </p>
                    <h2 className="text-3xl font-black md:text-4xl">
                      Quer completar sua presença?
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                      Aproveite este momento para adicionar uma solução que
                      combina com o que você acabou de contratar.
                    </p>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">
                        {summary.upsell.name}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                        Combine este serviço com uma presença mensal mais
                        organizada e mantenha seu perfil sempre em movimento.
                        É uma sugestão opcional para complementar o pedido
                        principal.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/35 p-4">
                    {canRenderImage(summary.upsell.image_url) && (
                      <img
                        src={summary.upsell.image_url || ""}
                        alt={summary.upsell.name}
                        className="mb-4 h-40 w-full rounded-2xl object-cover"
                      />
                    )}

                    <p className="text-sm font-bold text-zinc-500">Oferta</p>
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
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() =>
                      navigate(
                        `/checkout/produto?slug=${summary.upsell?.slug}&source=post_purchase&originOrderId=${summary.order.id}`
                      )
                    }
                    className="flex-1 rounded-2xl bg-white px-6 py-5 font-black text-black transition hover:bg-zinc-200"
                  >
                    Ver oferta complementar
                  </button>

                  <button
                    onClick={() => navigate("/minhas-entregas")}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 font-black text-zinc-200 transition hover:bg-white/[0.08]"
                  >
                    Continuar sem oferta
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
