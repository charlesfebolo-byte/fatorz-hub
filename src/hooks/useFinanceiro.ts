import { supabase } from "../lib/supabase";

type ManualSalePayload = {
  clientName: string;
  productName: string;
  amount: number;
  status: "pendente" | "pago" | "cancelado";
  paymentMethod: string;
  notes?: string;
};

export async function createManualSale(payload: ManualSalePayload) {
  const { error } = await supabase.from("payments").insert({
    client_name: payload.clientName,
    product_name: payload.productName,
    amount: payload.amount,
    status: payload.status,
    payment_method: payload.paymentMethod,
    notes: payload.notes || null,
  });

  if (error) {
    throw error;
  }

  return true;
}