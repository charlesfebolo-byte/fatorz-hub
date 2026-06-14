import { timingSafeEqual } from "crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.APPMAX_WEBHOOK_SECRET;

type WebhookStatus = "pending" | "approved" | "cancelled" | "unknown";

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

function normalizeIdentifier(value: any): string | null {
  if (value && typeof value === "object") {
    value =
      value.id ||
      value.order_id ||
      value.orderId ||
      value.payment_id ||
      value.paymentId ||
      value.transaction_id ||
      value.transactionId ||
      null;
  }

  const id = String(value || "").trim();

  if (!id || id.length > 120 || !/^[a-zA-Z0-9._:-]+$/.test(id)) {
    return null;
  }

  return id;
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
    normalized.includes("completed") ||
    normalized.includes("concluido")
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
    normalized.includes("estorno") ||
    normalized.includes("reembols")
  );
}

function isPendingStatus(payload: any) {
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
    normalized.includes("pending") ||
    normalized.includes("pendente") ||
    normalized.includes("aguard") ||
    normalized.includes("waiting") ||
    normalized.includes("processing")
  );
}

function getAppmaxOrderId(payload: any) {
  return normalizeIdentifier(
    findValueDeep(payload, [
      "order_id",
      "orderId",
      "id_order",
      "idOrder",
      "pedido_id",
      "pedidoId",
      "pedido",
    ])
  );
}

function getAppmaxPaymentId(payload: any) {
  return normalizeIdentifier(
    findValueDeep(payload, [
      "payment_id",
      "paymentId",
      "transaction_id",
      "transactionId",
      "id_transaction",
      "idTransaction",
      "id_payment",
      "idPayment",
    ])
  );
}

function getWebhookStatus(payload: any): WebhookStatus {
  const approved = isApprovedStatus(payload);
  const cancelled = isCancelledStatus(payload);
  const pending = isPendingStatus(payload);

  if (approved) return "approved";
  if (cancelled) return "cancelled";
  if (pending) return "pending";

  return "unknown";
}

function getHeaderValue(req: any, name: string) {
  const value = req.headers?.[name.toLowerCase()] || req.headers?.[name];

  return Array.isArray(value) ? value[0] : value;
}

function getProvidedWebhookSecret(req: any) {
  const authHeader = String(getHeaderValue(req, "authorization") || "");

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return (
    getHeaderValue(req, "x-appmax-webhook-secret") ||
    getHeaderValue(req, "x-webhook-secret") ||
    req.query?.secret ||
    null
  );
}

function timingSafeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

function isProductionLike() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    Boolean(process.env.VERCEL)
  );
}

function validateWebhookRequest(req: any) {
  const mustValidate = Boolean(webhookSecret) || isProductionLike();

  if (!mustValidate) {
    return { ok: true, warning: "APPMAX_WEBHOOK_SECRET ausente em ambiente local." };
  }

  if (!webhookSecret) {
    return {
      ok: false,
      status: 500,
      error: "APPMAX_WEBHOOK_SECRET nao configurado.",
    };
  }

  const providedSecret = String(getProvidedWebhookSecret(req) || "");

  if (!providedSecret || !timingSafeCompare(providedSecret, webhookSecret)) {
    return {
      ok: false,
      status: 401,
      error: "Webhook Appmax nao autorizado.",
    };
  }

  return { ok: true };
}

function buildSafeWebhookAudit({
  appmaxOrderId,
  appmaxPaymentId,
  newStatus,
  payload,
}: {
  appmaxOrderId: string | null;
  appmaxPaymentId: string | null;
  newStatus: Exclude<WebhookStatus, "unknown">;
  payload: any;
}) {
  const eventName = findValueDeep(payload, ["event", "event_name", "eventName"]);

  return {
    provider: "appmax",
    source: "webhook",
    status: newStatus,
    event: eventName ? String(eventName).slice(0, 80) : null,
    appmax_order_id: appmaxOrderId,
    appmax_payment_id: appmaxPaymentId,
    received_at: new Date().toISOString(),
  };
}

function getProductCourseId(product: any) {
  const rawCourseId = product?.course_id;
  const courseId = Number(rawCourseId || 0);

  return Number.isFinite(courseId) && courseId > 0 ? courseId : null;
}

function isAcademyCourseProduct(product: any) {
  return Boolean(
    getProductCourseId(product) &&
      (product?.category === "academy" ||
        product?.product_type === "course" ||
        product?.course_id)
  );
}

async function findMatchingRows({
  supabaseAdmin,
  table,
  appmaxOrderId,
  appmaxPaymentId,
}: {
  supabaseAdmin: any;
  table: string;
  appmaxOrderId: string | null;
  appmaxPaymentId: string | null;
}) {
  const rowsById = new Map<string, any>();
  const selectColumns =
    table === "course_purchases"
      ? "id,status,appmax_order_id,appmax_payment_id,payment_id,approved_at"
      : "id,status,appmax_order_id,appmax_payment_id,payment_id";

  async function addRows(query: any) {
    const { data, error } = await query;

    if (error) throw error;

    for (const row of data || []) {
      rowsById.set(String(row.id), row);
    }
  }

  if (appmaxOrderId) {
    await addRows(
      supabaseAdmin
        .from(table)
        .select(selectColumns)
        .eq("appmax_order_id", appmaxOrderId)
    );
  }

  if (appmaxPaymentId) {
    await addRows(
      supabaseAdmin
        .from(table)
        .select(selectColumns)
        .eq("appmax_payment_id", appmaxPaymentId)
    );

    await addRows(
      supabaseAdmin
        .from(table)
        .select(selectColumns)
        .eq("payment_id", appmaxPaymentId)
    );
  }

  return [...rowsById.values()];
}

function isAlreadyApplied(row: any, newStatus: Exclude<WebhookStatus, "unknown">, appmaxPaymentId: string | null) {
  const paymentIdMatches =
    !appmaxPaymentId ||
    row.appmax_payment_id === appmaxPaymentId ||
    row.payment_id === appmaxPaymentId;

  if (row.status !== newStatus || !paymentIdMatches) {
    return false;
  }

  return true;
}

function shouldIgnoreStatusTransition(currentStatus: any, newStatus: Exclude<WebhookStatus, "unknown">) {
  return (
    newStatus === "pending" &&
    (currentStatus === "approved" ||
      currentStatus === "cancelled" ||
      currentStatus === "canceled")
  );
}

async function updatePaymentTable({
  supabaseAdmin,
  table,
  appmaxOrderId,
  appmaxPaymentId,
  newStatus,
  payload,
}: {
  supabaseAdmin: any;
  table: "course_purchases" | "site_product_orders";
  appmaxOrderId: string | null;
  appmaxPaymentId: string | null;
  newStatus: Exclude<WebhookStatus, "unknown">;
  payload: any;
}) {
  const rows = await findMatchingRows({
    supabaseAdmin,
    table,
    appmaxOrderId,
    appmaxPaymentId,
  });

  const rowsToUpdate = rows.filter(
    (row) =>
      !isAlreadyApplied(row, newStatus, appmaxPaymentId) &&
      !shouldIgnoreStatusTransition(row.status, newStatus)
  );

  if (!rowsToUpdate.length) {
    return {
      ok: true,
      table,
      matched: rows.length,
      updated: 0,
      skipped: rows.length,
      error: null,
    };
  }

  const updates: any = {
    status: newStatus,
    raw_payment_response: buildSafeWebhookAudit({
      appmaxOrderId,
      appmaxPaymentId,
      newStatus,
      payload,
    }),
  };

  if (table === "site_product_orders") {
    updates.updated_at = new Date().toISOString();
  }

  if (appmaxPaymentId) {
    updates.appmax_payment_id = appmaxPaymentId;
    updates.payment_id = appmaxPaymentId;
  }

  if (newStatus === "approved") {
    updates.notes =
      table === "course_purchases"
        ? "Acesso vitalicio liberado automaticamente via webhook Appmax."
        : "Pedido de produto aprovado automaticamente via webhook Appmax.";

    if (table === "course_purchases") {
      updates.approved_at = new Date().toISOString();
      updates.access_type = "lifetime";
    }
  }

  if (newStatus === "cancelled") {
    updates.notes =
      table === "course_purchases"
        ? "Pagamento cancelado/recusado via webhook Appmax."
        : "Pedido de produto cancelado/recusado via webhook Appmax.";
  }

  if (newStatus === "pending") {
    updates.notes =
      table === "course_purchases"
        ? "Webhook Appmax recebido, pagamento ainda pendente."
        : "Webhook Appmax recebido, pedido de produto ainda pendente.";
  }

  const { error } = await supabaseAdmin
    .from(table)
    .update(updates)
    .in(
      "id",
      rowsToUpdate.map((row) => row.id)
    );

  if (error) {
    console.error("Erro ao atualizar pagamento Appmax:", {
      table,
      status: newStatus,
      appmaxOrderId,
      appmaxPaymentId,
      error: error.message,
    });

    return {
      ok: false,
      table,
      matched: rows.length,
      updated: 0,
      skipped: rows.length - rowsToUpdate.length,
      error: error.message,
    };
  }

  return {
    ok: true,
    table,
    matched: rows.length,
    updated: rowsToUpdate.length,
    skipped: rows.length - rowsToUpdate.length,
    error: null,
  };
}

async function findProductOrdersForCourseBridge({
  supabaseAdmin,
  appmaxOrderId,
  appmaxPaymentId,
}: {
  supabaseAdmin: any;
  appmaxOrderId: string | null;
  appmaxPaymentId: string | null;
}) {
  const rowsById = new Map<string, any>();
  const selectColumns = [
    "id",
    "user_id",
    "user_email",
    "product_id",
    "product_slug",
    "product_name",
    "product_category",
    "product_type",
    "amount_cents",
    "status",
    "payment_provider",
    "payment_method",
    "appmax_customer_id",
    "appmax_order_id",
    "appmax_payment_id",
    "payment_id",
    "raw_payment_response",
  ].join(",");

  async function addRows(query: any) {
    const { data, error } = await query;

    if (error) throw error;

    for (const row of data || []) {
      rowsById.set(String(row.id), row);
    }
  }

  if (appmaxOrderId) {
    await addRows(
      supabaseAdmin
        .from("site_product_orders")
        .select(selectColumns)
        .eq("appmax_order_id", appmaxOrderId)
    );
  }

  if (appmaxPaymentId) {
    await addRows(
      supabaseAdmin
        .from("site_product_orders")
        .select(selectColumns)
        .eq("appmax_payment_id", appmaxPaymentId)
    );

    await addRows(
      supabaseAdmin
        .from("site_product_orders")
        .select(selectColumns)
        .eq("payment_id", appmaxPaymentId)
    );
  }

  return [...rowsById.values()];
}

async function getProductForOrder(supabaseAdmin: any, order: any) {
  async function findBy(column: string, value: any) {
    if (!value) return null;

    const { data, error } = await supabaseAdmin
      .from("site_products")
      .select("id,name,slug,category,product_type,course_id")
      .eq(column, value)
      .maybeSingle();

    if (error) {
      console.warn("Produto Academy nao encontrado para ponte:", {
        orderId: order?.id,
        column,
        error: error.message,
      });
    }

    return data || null;
  }

  return (
    (await findBy("id", order?.product_id)) ||
    (await findBy("slug", order?.product_slug))
  );
}

async function getCourseForProduct(supabaseAdmin: any, product: any) {
  const courseId = getProductCourseId(product);

  if (!courseId) return null;

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,title,payment_url")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    console.warn("Curso vinculado ao produto Academy nao encontrado:", {
      productId: product?.id,
      courseId,
      error: error.message,
    });
  }

  return data || {
    id: courseId,
    title: product?.name || "Curso FatorZ Academy",
    payment_url: null,
  };
}

async function findCoursePurchaseForProductOrder({
  supabaseAdmin,
  order,
  courseId,
}: {
  supabaseAdmin: any;
  order: any;
  courseId: number;
}) {
  const rowsById = new Map<string, any>();

  async function addRows(query: any) {
    const { data, error } = await query;

    if (error) throw error;

    for (const row of data || []) {
      rowsById.set(String(row.id), row);
    }
  }

  if (order?.appmax_order_id) {
    await addRows(
      supabaseAdmin
        .from("course_purchases")
        .select("*")
        .eq("appmax_order_id", String(order.appmax_order_id))
    );
  }

  if (order?.appmax_payment_id) {
    await addRows(
      supabaseAdmin
        .from("course_purchases")
        .select("*")
        .eq("appmax_payment_id", String(order.appmax_payment_id))
    );
  }

  if (order?.payment_id) {
    await addRows(
      supabaseAdmin
        .from("course_purchases")
        .select("*")
        .eq("payment_id", String(order.payment_id))
    );
  }

  if (order?.user_id) {
    await addRows(
      supabaseAdmin
        .from("course_purchases")
        .select("*")
        .eq("user_id", String(order.user_id))
        .eq("course_id", courseId)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
    );
  } else if (order?.user_email) {
    await addRows(
      supabaseAdmin
        .from("course_purchases")
        .select("*")
        .eq("user_email", String(order.user_email))
        .eq("course_id", courseId)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
    );
  }

  return [...rowsById.values()][0] || null;
}

async function ensureCoursePurchaseFromProductOrder({
  supabaseAdmin,
  order,
  product,
  newStatus,
  payload,
}: {
  supabaseAdmin: any;
  order: any;
  product: any;
  newStatus: Exclude<WebhookStatus, "unknown">;
  payload: any;
}) {
  if (!isAcademyCourseProduct(product)) {
    return { created: 0, updated: 0, skipped: 1 };
  }

  const courseId = getProductCourseId(product);

  if (!courseId) {
    return { created: 0, updated: 0, skipped: 1 };
  }

  const course = await getCourseForProduct(supabaseAdmin, product);
  const existingPurchase = await findCoursePurchaseForProductOrder({
    supabaseAdmin,
    order,
    courseId,
  });

  if (existingPurchase?.status === newStatus) {
    return { created: 0, updated: 0, skipped: 1 };
  }

  if (shouldIgnoreStatusTransition(existingPurchase?.status, newStatus)) {
    return { created: 0, updated: 0, skipped: 1 };
  }

  const safeAudit = buildSafeWebhookAudit({
    appmaxOrderId: order?.appmax_order_id || null,
    appmaxPaymentId: order?.appmax_payment_id || order?.payment_id || null,
    newStatus,
    payload,
  });

  const purchasePayload: any = {
    user_id: order?.user_id || null,
    user_email: order?.user_email || "",
    course_id: courseId,
    course_title: course?.title || product?.name || order?.product_name || "Curso FatorZ Academy",
    payment_url: course?.payment_url || null,
    status: newStatus,
    access_type: "lifetime",
    payment_provider: "appmax",
    payment_method: order?.payment_method || null,
    amount_cents: order?.amount_cents || null,
    appmax_customer_id: order?.appmax_customer_id || null,
    appmax_order_id: order?.appmax_order_id || null,
    appmax_payment_id: order?.appmax_payment_id || null,
    payment_id: order?.payment_id || order?.appmax_payment_id || order?.appmax_order_id || null,
    raw_payment_response: safeAudit,
    notes:
      newStatus === "approved"
        ? "Acesso vitalicio liberado automaticamente via webhook Appmax."
        : newStatus === "cancelled"
        ? "Compra Academy cancelada/recusada via webhook Appmax."
        : "Compra Academy registrada via webhook Appmax.",
  };

  if (newStatus === "approved") {
    purchasePayload.approved_at =
      existingPurchase?.approved_at || new Date().toISOString();
  }

  const result = existingPurchase
    ? await supabaseAdmin
        .from("course_purchases")
        .update(purchasePayload)
        .eq("id", existingPurchase.id)
        .select("*")
        .single()
    : await supabaseAdmin
        .from("course_purchases")
        .insert(purchasePayload)
        .select("*")
        .single();

  if (result.error) {
    throw result.error;
  }

  return existingPurchase
    ? { created: 0, updated: 1, skipped: 0 }
    : { created: 1, updated: 0, skipped: 0 };
}

async function syncAcademyCoursePurchasesFromProductOrders({
  supabaseAdmin,
  appmaxOrderId,
  appmaxPaymentId,
  newStatus,
  payload,
}: {
  supabaseAdmin: any;
  appmaxOrderId: string | null;
  appmaxPaymentId: string | null;
  newStatus: Exclude<WebhookStatus, "unknown">;
  payload: any;
}) {
  const orders = await findProductOrdersForCourseBridge({
    supabaseAdmin,
    appmaxOrderId,
    appmaxPaymentId,
  });

  const result = {
    ok: true,
    matched_product_orders: orders.length,
    created: 0,
    updated: 0,
    skipped: 0,
    error: null as string | null,
  };

  try {
    for (const order of orders) {
      const product = await getProductForOrder(supabaseAdmin, order);

      if (!product) {
        result.skipped += 1;
        continue;
      }

      const bridgeResult = await ensureCoursePurchaseFromProductOrder({
        supabaseAdmin,
        order,
        product,
        newStatus,
        payload,
      });

      result.created += bridgeResult.created;
      result.updated += bridgeResult.updated;
      result.skipped += bridgeResult.skipped;
    }
  } catch (error: any) {
    result.ok = false;
    result.error = error?.message || String(error);
  }

  return result;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo nao permitido.",
    });
  }

  try {
    const security = validateWebhookRequest(req);

    if (!security.ok) {
      return res.status(security.status || 401).json({
        error: security.error,
      });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({
        error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurado.",
      });
    }

    const payload = req.body || {};
    const appmaxOrderId = getAppmaxOrderId(payload);
    const appmaxPaymentId = getAppmaxPaymentId(payload);
    const newStatus = getWebhookStatus(payload);

    console.log("Webhook Appmax recebido:", {
      appmaxOrderId,
      appmaxPaymentId,
      status: newStatus,
      event: findValueDeep(payload, ["event", "event_name", "eventName"]) || null,
    });

    if (!appmaxOrderId && !appmaxPaymentId) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "Webhook sem order_id/payment_id identificavel.",
      });
    }

    if (newStatus === "unknown") {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "Webhook sem status de pagamento reconhecido.",
        appmaxOrderId,
        appmaxPaymentId,
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

    const courseResult = await updatePaymentTable({
      supabaseAdmin,
      table: "course_purchases",
      appmaxOrderId,
      appmaxPaymentId,
      newStatus,
      payload,
    });

    const productResult = await updatePaymentTable({
      supabaseAdmin,
      table: "site_product_orders",
      appmaxOrderId,
      appmaxPaymentId,
      newStatus,
      payload,
    });

    const academyBridgeResult = await syncAcademyCoursePurchasesFromProductOrders({
      supabaseAdmin,
      appmaxOrderId,
      appmaxPaymentId,
      newStatus,
      payload,
    });

    if (!courseResult.ok || !productResult.ok || !academyBridgeResult.ok) {
      return res.status(500).json({
        error: "Erro ao atualizar uma ou mais tabelas no Supabase.",
        appmaxOrderId,
        appmaxPaymentId,
        status: newStatus,
        results: {
          course_purchases: courseResult,
          site_product_orders: productResult,
          academy_course_bridge: academyBridgeResult,
        },
      });
    }

    const updatedCount =
      courseResult.updated +
      productResult.updated +
      academyBridgeResult.created +
      academyBridgeResult.updated;
    const matchedCount =
      courseResult.matched +
      productResult.matched +
      academyBridgeResult.matched_product_orders;

    if (!matchedCount) {
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
      updated_anything: updatedCount > 0,
      idempotent: updatedCount === 0,
      status: newStatus,
      appmaxOrderId,
      appmaxPaymentId,
      updated: {
        course_purchases: courseResult.updated,
        site_product_orders: productResult.updated,
        academy_course_purchases_created: academyBridgeResult.created,
        academy_course_purchases_updated: academyBridgeResult.updated,
      },
      skipped: {
        course_purchases: courseResult.skipped,
        site_product_orders: productResult.skipped,
        academy_course_bridge: academyBridgeResult.skipped,
      },
    });
  } catch (error: any) {
    console.error("Erro appmax-webhook:", error?.message || String(error));

    return res.status(500).json({
      error: "Erro ao processar webhook Appmax.",
      details: error?.message || String(error),
    });
  }
}
