import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Payment = {
  id: number;
  created_at: string;
  client_name: string | null;
  product_name: string | null;
  amount: number | null;
  status: string | null;
  payment_method: string | null;
  notes: string | null;
};

export default function Finance() {
  const [payments, setPayments] = useState<Payment[]>([]);

  const [clientName, setClientName] = useState("");
  const [productName, setProductName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("pendente");
  const [paymentMethod, setPaymentMethod] = useState("Mercado Pago");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar financeiro.");
      console.log(error);
      return;
    }

    setPayments(data || []);
  }

  async function createPayment() {
    if (!clientName || !productName || !amount) {
      alert("Preencha cliente, produto e valor.");
      return;
    }

    const { error } = await supabase.from("payments").insert({
      client_name: clientName,
      product_name: productName,
      amount: Number(amount),
      status,
      payment_method: paymentMethod,
      notes,
    });

    if (error) {
      alert("Erro ao cadastrar pagamento.");
      console.log(error);
      return;
    }

    setClientName("");
    setProductName("");
    setAmount("");
    setStatus("pendente");
    setPaymentMethod("Mercado Pago");
    setNotes("");

    loadPayments();
  }

  async function updateStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from("payments")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Erro ao atualizar status.");
      console.log(error);
      return;
    }

    loadPayments();
  }

  const totalPaid = payments
    .filter((p) => p.status === "pago")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalPending = payments
    .filter((p) => p.status === "pendente")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalCanceled = payments
    .filter((p) => p.status === "cancelado")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  function formatMoney(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="text-white">
      <div className="mb-10">
        <h1 className="text-4xl font-black mb-2">
          Financeiro
        </h1>

        <p className="text-zinc-400">
          Controle pagamentos, vendas, pendências e faturamento da FatorZ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Recebido</p>
          <h2 className="text-4xl font-black text-green-400">
            {formatMoney(totalPaid)}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pendente</p>
          <h2 className="text-4xl font-black text-yellow-400">
            {formatMoney(totalPending)}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Cancelado</p>
          <h2 className="text-4xl font-black text-red-400">
            {formatMoney(totalCanceled)}
          </h2>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <h2 className="text-2xl font-black mb-6">
          Novo Pagamento
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            placeholder="Nome do cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="Produto/serviço"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="Valor. Ex: 297"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <input
            placeholder="Forma de pagamento"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="Observação"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />
        </div>

        <button
          onClick={createPayment}
          className="mt-5 bg-pink-500 px-8 py-4 rounded-2xl font-black"
        >
          Registrar Pagamento
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h2 className="text-2xl font-black mb-6">
          Histórico
        </h2>

        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-zinc-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
            >
              <div>
                <h3 className="text-xl font-black">
                  {payment.product_name}
                </h3>

                <p className="text-zinc-400">
                  Cliente: {payment.client_name || "Não informado"}
                </p>

                <p className="text-zinc-500 text-sm mt-1">
                  {new Date(payment.created_at).toLocaleDateString("pt-BR")} •{" "}
                  {payment.payment_method || "Pagamento"}
                </p>

                {payment.notes && (
                  <p className="text-zinc-500 mt-2">
                    Obs: {payment.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-black">
                  {formatMoney(Number(payment.amount || 0))}
                </span>

                <select
                  value={payment.status || "pendente"}
                  onChange={(e) => updateStatus(payment.id, e.target.value)}
                  className="bg-zinc-900 p-3 rounded-xl outline-none"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}