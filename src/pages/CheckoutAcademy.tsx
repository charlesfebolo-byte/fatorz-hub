import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { products } from "../data/products";
import { supabase } from "../lib/supabase";

export default function CheckoutAcademy({ user }: any) {
  const navigate = useNavigate();

  const [loadingPayment, setLoadingPayment] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [message, setMessage] = useState("");

  const academy = products.find((p) => p.id === "academy");

  async function openPayment() {
    if (!user?.email) {
      alert("Você precisa estar logado para assinar.");
      navigate("/login");
      return;
    }

    if (!academy?.paymentLink) {
      alert("Link de pagamento não encontrado.");
      return;
    }

    setMessage("");
    setLoadingPayment(true);

    const { error } = await supabase.from("subscriptions").insert({
      user_email: user.email,
      product_id: "academy",
      payment_id: null,
      status: "pending",
      expires_at: null,
    });

    setLoadingPayment(false);

    if (error) {
      console.log("Erro ao registrar intenção de compra:", error);

      const continuar = confirm(
        "Não consegui registrar a intenção de compra no sistema, mas você ainda pode abrir o pagamento. Quer continuar?"
      );

      if (!continuar) return;
    }

    window.open(academy.paymentLink, "_blank");
  }

  async function checkPayment() {
    if (!user?.email) {
      navigate("/login");
      return;
    }

    setMessage("");
    setCheckingAccess(true);

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_email", user.email)
      .eq("product_id", "academy")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCheckingAccess(false);

    if (error) {
      console.log("Erro ao verificar pagamento:", error);
      setMessage(
        "Erro ao verificar pagamento. Aguarde alguns segundos e tente novamente."
      );
      return;
    }

    if (!subscription) {
      setMessage(
        "Ainda não encontramos uma tentativa de pagamento para sua conta. Clique em 'Ir para pagamento' primeiro."
      );
      return;
    }

    if (subscription.status === "pending") {
      setMessage(
        "Seu pagamento ainda está pendente. Se você acabou de pagar, aguarde alguns segundos e clique novamente."
      );
      return;
    }

    if (subscription.status !== "approved") {
      setMessage(
        `Seu pagamento ainda não foi aprovado. Status atual: ${subscription.status}.`
      );
      return;
    }

    if (!subscription.payment_id) {
      setMessage(
        "Encontramos uma assinatura aprovada, mas sem ID de pagamento. Aguarde alguns segundos e tente novamente."
      );
      return;
    }

    const expiresAt = subscription.expires_at
      ? new Date(subscription.expires_at)
      : null;

    const isExpired = !expiresAt || expiresAt.getTime() <= new Date().getTime();

    if (isExpired) {
      setMessage(
        "Encontramos um pagamento aprovado, mas o acesso está vencido. Faça uma nova assinatura."
      );
      return;
    }

    setMessage("Pagamento confirmado! Redirecionando para o Academy...");

    setTimeout(() => {
      navigate("/academy");
    }, 800);
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-8">
        <div className="max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center">
          <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
            Login necessário
          </p>

          <h1 className="text-5xl font-black mb-6">FatorZ Academy</h1>

          <p className="text-zinc-400 text-lg mb-8">
            Para assinar o Academy, primeiro entre na sua conta.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="bg-white text-black px-8 py-4 rounded-2xl font-black"
          >
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <header className="border-b border-zinc-800 px-8 py-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate("/academy")}
            className="text-zinc-400 hover:text-white font-bold"
          >
            ← Voltar
          </button>

          <h1 className="text-2xl font-black">
            Fator<span className="text-pink-500">Z</span>
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-10">
            <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
              Checkout
            </p>

            <h2 className="text-5xl font-black mb-6">
              Assinar FatorZ Academy
            </h2>

            <p className="text-zinc-400 text-lg mb-8">
              Você está assinando a área premium mensal da FatorZ. Após a
              confirmação real do pagamento pelo Mercado Pago, seu acesso será
              liberado por 30 dias.
            </p>

            <div className="bg-black border border-zinc-800 rounded-3xl p-6 mb-8">
              <p className="text-zinc-500 mb-2">Conta logada</p>

              <h3 className="text-2xl font-black break-all">{user.email}</h3>
            </div>

            <div className="bg-pink-500/10 border border-pink-500/30 rounded-3xl p-6 mb-8">
              <h3 className="text-xl font-black text-pink-400 mb-3">
                Importante
              </h3>

              <p className="text-zinc-300 leading-relaxed">
                No Mercado Pago, use o mesmo e-mail da sua conta:
                <strong className="text-white"> {user.email}</strong>. O botão
                de verificação só libera quando existir pagamento aprovado de
                verdade na tabela de assinaturas.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-pink-500 font-black mb-2">01</p>
                <h3 className="font-black text-lg mb-2">Clique em pagar</h3>
                <p className="text-zinc-400 text-sm">
                  O Mercado Pago será aberto em uma nova aba.
                </p>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-pink-500 font-black mb-2">02</p>
                <h3 className="font-black text-lg mb-2">Faça o pagamento</h3>
                <p className="text-zinc-400 text-sm">
                  O pagamento precisa ser aprovado pelo Mercado Pago.
                </p>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-pink-500 font-black mb-2">03</p>
                <h3 className="font-black text-lg mb-2">Webhook confirma</h3>
                <p className="text-zinc-400 text-sm">
                  O sistema recebe o status aprovado automaticamente.
                </p>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-pink-500 font-black mb-2">04</p>
                <h3 className="font-black text-lg mb-2">Verifique acesso</h3>
                <p className="text-zinc-400 text-sm">
                  Depois de pagar, clique em verificar pagamento.
                </p>
              </div>
            </div>

            {message && (
              <div className="mt-8 bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-zinc-300">{message}</p>
              </div>
            )}
          </section>

          <aside className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 sticky top-8">
            <p className="text-zinc-500 mb-2">Produto</p>

            <h3 className="text-3xl font-black mb-4">
              {academy?.name || "FatorZ Academy"}
            </h3>

            <p className="text-zinc-400 mb-8">
              {academy?.description ||
                "Curso e área premium mensal da FatorZ."}
            </p>

            <div className="bg-black border border-zinc-800 rounded-3xl p-6 mb-8">
              <p className="text-zinc-500 mb-2">Valor</p>

              <h4 className="text-4xl font-black text-pink-500">
                {academy?.price || "R$ 297/mês"}
              </h4>
            </div>

            <button
              onClick={openPayment}
              disabled={loadingPayment}
              className={`w-full px-8 py-5 rounded-2xl font-black text-lg transition ${
                loadingPayment
                  ? "bg-zinc-700 cursor-not-allowed"
                  : "bg-pink-500 hover:bg-pink-600"
              }`}
            >
              {loadingPayment ? "Preparando pagamento..." : "Ir para pagamento"}
            </button>

            <button
              onClick={checkPayment}
              disabled={checkingAccess}
              className={`w-full mt-4 px-8 py-5 rounded-2xl font-black text-lg transition ${
                checkingAccess
                  ? "bg-zinc-700 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-black"
              }`}
            >
              {checkingAccess
                ? "Verificando pagamento..."
                : "Já paguei, verificar pagamento"}
            </button>

            <button
              onClick={() => navigate("/academy")}
              className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 px-8 py-4 rounded-2xl font-black transition"
            >
              Voltar para Academy
            </button>

            <p className="text-zinc-500 text-sm mt-6 text-center">
              O pagamento será feito em uma nova aba pelo Mercado Pago.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}