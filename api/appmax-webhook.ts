import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function findValueDeep(obj: any, wantedKeys: string[]): any {
  if (!obj || typeof obj !== "object") return null;

  for (const key of wantedKeys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findValueDeep(value, wantedKeys);

      if (found !== null && found !== undefined && found !== "") {
        return found;
      }
    }
  }

  return null;
}

function normalizeStatus(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isApprovedStatus(payload: any) {
  const status =
    findValueDeep(payload, [
      "status",
      "payment_status",
      "paymentStatus",
      "order_status",
      "orderStatus",
      "situation",
      "event",
      "event_name",
      "eventName",
    ]) || "";

  const normalized = normalizeStatus(status);

  return (
    normalized.includes("approved") ||
    normalized.includes("aprovado") ||
    normalized.includes("paid") ||
    normalized.includes("pago") ||
    normalized.includes("captured") ||
    normalized.includes("confirmado") ||
    normalized.includes("completed")
  );
}

function isCancelledStatus(payload: any) {
  const status =
    findValueDeep(payload, [
      "status",
      "payment_status",
      "paymentStatus",
      "order_status",
      "orderStatus",
      "situation",
      "event",
      "event_name",
      "eventName",
    ]) || "";

  const normalized = normalizeStatus(status);

  return (
    normalized.includes("cancel") ||
    normalized.includes("recus") ||
    normalized.includes("refused") ||
    normalized.includes("denied") ||
    normalized.includes("failed") ||
    normalized.includes("chargeback") ||
    normalized.includes("estorno")
  );
}

function getAppmaxOrderId(payload: any) {
  return findValueDeep(payload, [
    "order_id",
    "orderId",
    "id_order",
    "idOrder",
    "pedido_id",
    "pedidoId",
  ]);
}

function getAppmaxPaymentId(payload: any) {
  return findValueDeep(payload, [
    "payment_id",
    "paymentId",
    "transaction_id",
    "transactionId",
    "id_transaction",
    "idTransaction",
    "id_payment",
    "idPayment",
  ]);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido.",
    });
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({
        error:
          "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado no ambiente.",
      });
    }

    const payload = req.body || {};

    console.log("APPMAX WEBHOOK RECEBIDO:", JSON.stringify(payload));

    const appmaxOrderId = getAppmaxOrderId(payload);
    const appmaxPaymentId = getAppmaxPaymentId(payload);

    if (!appmaxOrderId && !appmaxPaymentId) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "Webhook recebido, mas sem order_id/payment_id identificável.",
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey,
        },
      },
    });

    const approved = isApprovedStatus(payload);
    const cancelled = isCancelledStatus(payload);

    let newStatus: "pending" | "approved" | "cancelled" = "pending";

    if (approved) newStatus = "approved";
    if (cancelled) newStatus = "cancelled";

    const updates: any = {
      status: newStatus,
      raw_payment_response: payload,
    };

    if (appmaxPaymentId) {
      updates.appmax_payment_id = String(appmaxPaymentId);
      updates.payment_id = String(appmaxPaymentId);
    }

    if (newStatus === "approved") {
      updates.approved_at = new Date().toISOString();
      updates.access_type = "lifetime";
      updates.notes = "Acesso vitalício liberado automaticamente via webhook Appmax.";
    }

    if (newStatus === "cancelled") {
      updates.notes = "Pagamento cancelado/recusado via webhook Appmax.";
    }

    let query = supabaseAdmin.from("course_purchases").update(updates);

    if (appmaxOrderId) {
      query = query.eq("appmax_order_id", String(appmaxOrderId));
    } else {
      query = query.eq("appmax_payment_id", String(appmaxPaymentId));
    }

    const { data, error } = await query.select("*");

    if (error) {
      console.log("Erro ao atualizar course_purchases:", error);

      return res.status(500).json({
        error: "Erro ao atualizar compra no Supabase.",
        details: error,
      });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "Nenhuma compra encontrada com esse order_id/payment_id.",
        appmaxOrderId,
        appmaxPaymentId,
        status: newStatus,
      });
    }

    return res.status(200).json({
      received: true,
      updated: true,
      status: newStatus,
      appmaxOrderId,
      appmaxPaymentId,
      purchases: data,
    });
  } catch (error: any) {
    console.log("Erro appmax-webhook:", error);

    return res.status(500).json({
      error: "Erro ao processar webhook Appmax.",
      details: error?.message || String(error),
    });
  }
}