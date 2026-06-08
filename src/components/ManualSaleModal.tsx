import { useState } from "react";
import { createManualSale } from "../hooks/useFinanceiro";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function ManualSaleModal({ open, onClose, onSaved }: Props) {
  const [clientName, setClientName] = useState("");
  const [productName, setProductName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"pendente" | "pago" | "cancelado">("pago");
  const [paymentMethod, setPaymentMethod] = useState("Venda manual");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function save() {
    if (!clientName.trim() || !productName.trim() || !amount) {
      alert("Preencha cliente, produto e valor.");
      return;
    }

    try {
      setSaving(true);

      await createManualSale({
        clientName: clientName.trim(),
        productName: productName.trim(),
        amount: Number(amount),
        status,
        paymentMethod: paymentMethod.trim() || "Venda manual",
        notes: notes.trim(),
      });

      setClientName("");
      setProductName("");
      setAmount("");
      setStatus("pago");
      setPaymentMethod("Venda manual");
      setNotes("");

      onSaved();
      onClose();
    } catch (error) {
      console.log(error);
      alert("Erro ao registrar venda manual.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[34px] border border-white/10 bg-[#08080d] p-6 text-white shadow-[0_0_80px_rgba(145,35,255,0.25)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
              Venda manual
            </p>
            <h2 className="mt-3 text-3xl font-black">
              Registrar venda feita por fora
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Use apenas para vendas fechadas no WhatsApp, Instagram ou direto com o cliente.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 font-black"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            placeholder="Nome do cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-pink-500/40"
          />

          <input
            placeholder="Produto ou serviço"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-pink-500/40"
          />

          <input
            type="number"
            placeholder="Valor. Ex: 697"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-pink-500/40"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-pink-500/40"
          >
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <input
            placeholder="Origem/Forma. Ex: WhatsApp, Pix, dinheiro"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-pink-500/40 md:col-span-2"
          />

          <textarea
            placeholder="Observação interna"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-28 rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-pink-500/40 md:col-span-2"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black"
          >
            Cancelar
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Registrar venda"}
          </button>
        </div>
      </div>
    </div>
  );
}