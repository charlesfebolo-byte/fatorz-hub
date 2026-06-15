import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const appmaxToken = process.env.APPMAX_ACCESS_TOKEN;
const appmaxApiUrl =
  process.env.APPMAX_API_URL || "https://admin.appmax.com.br/api/v3";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedPaymentOrigins = (process.env.PAYMENT_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const paymentRateLimitPerMinute = Number(
  process.env.PAYMENT_RATE_LIMIT_PER_MINUTE || 12
);

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function getHeaderValue(req: any, name: string) {
  const value = req.headers?.[name.toLowerCase()] || req.headers?.[name];

  return Array.isArray(value) ? value[0] : value;
}

function getClientIp(req: any) {
  return (
    String(getHeaderValue(req, "x-forwarded-for") || "")
      .split(",")?.[0]
      ?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function validateAllowedOrigin(req: any) {
  if (!allowedPaymentOrigins.length) return true;

  const origin = String(getHeaderValue(req, "origin") || "");
  const referer = String(getHeaderValue(req, "referer") || "");

  if (origin && allowedPaymentOrigins.includes(origin)) return true;

  return allowedPaymentOrigins.some((allowedOrigin) =>
    referer.startsWith(`${allowedOrigin}/`)
  );
}

function checkRateLimit(req: any) {
  if (!paymentRateLimitPerMinute || paymentRateLimitPerMinute <= 0) {
    return true;
  }

  const key = getClientIp(req);
  const now = Date.now();
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + 60_000,
    });

    return true;
  }

  if (current.count >= paymentRateLimitPerMinute) {
    return false;
  }

  current.count += 1;
  return true;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function sanitizeText(value: any) {
  if (value === undefined || value === null) return null;

  return String(value)
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]")
    .replace(/\b\d{10,14}\b/g, "[number]")
    .slice(0, 300);
}

function formatCpf(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);

  if (numbers.length !== 11) return numbers;

  return numbers.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

function splitName(fullName: string) {
  const cleanName = String(fullName || "").trim();

  if (!cleanName) {
    return {
      firstname: "Cliente",
      lastname: "FatorZ",
    };
  }

  const parts = cleanName.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return {
      firstname: parts[0],
      lastname: "FatorZ",
    };
  }

  return {
    firstname: parts[0],
    lastname: parts.slice(1).join(" "),
  };
}

function getExpirationDate(days = 2) {
  const date = new Date();

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

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

function getPaymentStatus(response: any): "pending" | "approved" | "cancelled" {
  const value =
    findValueDeep(response, [
      "status",
      "payment_status",
      "paymentStatus",
      "order_status",
      "orderStatus",
      "situation",
      "text",
    ]) || "";

  const normalized = normalizeStatus(value);

  if (
    normalized.includes("approved") ||
    normalized.includes("aprovado") ||
    normalized.includes("paid") ||
    normalized.includes("pago") ||
    normalized.includes("captured") ||
    normalized.includes("confirmado") ||
    normalized.includes("completed") ||
    normalized.includes("concluido") ||
    normalized === "ok"
  ) {
    return "approved";
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("recus") ||
    normalized.includes("refused") ||
    normalized.includes("denied") ||
    normalized.includes("failed") ||
    normalized.includes("chargeback") ||
    normalized.includes("estorno") ||
    normalized.includes("invalido") ||
    normalized.includes("erro")
  ) {
    return "cancelled";
  }

  return "pending";
}

function getCustomerId(response: any) {
  return (
    response?.customer_id ||
    response?.id ||
    response?.data?.customer_id ||
    response?.data?.id ||
    response?.data?.customer?.id ||
    response?.data?.customer?.customer_id ||
    response?.customer?.id ||
    response?.customer?.customer_id ||
    response?.result?.customer_id ||
    response?.result?.id ||
    response?.result?.customer?.id ||
    findValueDeep(response, ["customer_id", "customerId"])
  );
}

function getOrderId(response: any) {
  return (
    response?.order_id ||
    response?.id ||
    response?.data?.order_id ||
    response?.data?.id ||
    response?.data?.order?.id ||
    response?.data?.order?.order_id ||
    response?.order?.id ||
    response?.order?.order_id ||
    response?.result?.order_id ||
    response?.result?.id ||
    response?.result?.order?.id ||
    findValueDeep(response, ["order_id", "orderId"])
  );
}

function getPaymentId(response: any) {
  return (
    response?.payment_id ||
    response?.transaction_id ||
    response?.id ||
    response?.data?.payment_id ||
    response?.data?.transaction_id ||
    response?.data?.id ||
    response?.payment?.id ||
    response?.transaction?.id ||
    findValueDeep(response, [
      "payment_id",
      "paymentId",
      "transaction_id",
      "transactionId",
      "id",
    ])
  );
}

function getCardToken(response: any) {
  return (
    response?.token ||
    response?.card_token ||
    response?.cardToken ||
    response?.data?.token ||
    response?.data?.card_token ||
    response?.data?.cardToken ||
    response?.data?.hash ||
    response?.hash ||
    findValueDeep(response, ["token", "card_token", "cardToken", "hash"])
  );
}

function getCardBrand(response: any) {
  return (
    response?.brand ||
    response?.card_brand ||
    response?.data?.brand ||
    response?.data?.card_brand ||
    response?.payment?.card_brand ||
    response?.card?.brand ||
    findValueDeep(response, ["brand", "card_brand", "cardBrand"])
  );
}

function getPixCopyPaste(response: any) {
  return (
    response?.pix_emv ||
    response?.pix_code ||
    response?.copy_paste ||
    response?.qrcode ||
    response?.qr_code ||
    response?.data?.pix_emv ||
    response?.data?.pix_code ||
    response?.data?.copy_paste ||
    response?.data?.qrcode ||
    response?.data?.qr_code ||
    response?.data?.pix?.pix_emv ||
    response?.data?.pix?.copy_paste ||
    response?.data?.pix?.qrcode ||
    response?.payment?.pix?.qrcode ||
    findValueDeep(response, [
      "pix_emv",
      "pix_code",
      "copy_paste",
      "copyPaste",
      "qrcode",
      "qr_code",
    ])
  );
}

function getPixQrCode(response: any) {
  return (
    response?.pix_qrcode ||
    response?.pix_qr_code ||
    response?.qr_code ||
    response?.qrcode_image ||
    response?.data?.pix_qrcode ||
    response?.data?.pix_qr_code ||
    response?.data?.qr_code ||
    response?.data?.qrcode_image ||
    response?.data?.pix?.qr_code ||
    response?.data?.pix?.pix_qrcode ||
    findValueDeep(response, [
      "pix_qrcode",
      "pix_qr_code",
      "qr_code",
      "qrcode_image",
      "qrCode",
    ])
  );
}

function getBoletoUrl(response: any) {
  return (
    response?.boleto_url ||
    response?.billet_url ||
    response?.url ||
    response?.data?.boleto_url ||
    response?.data?.billet_url ||
    response?.data?.url ||
    response?.data?.boleto?.url ||
    response?.data?.billet?.url ||
    response?.boleto?.url ||
    response?.billet?.url ||
    findValueDeep(response, ["boleto_url", "boletoUrl", "billet_url", "url"])
  );
}

function getBoletoBarcode(response: any) {
  return (
    response?.barcode ||
    response?.bar_code ||
    response?.order_billet_payment_code ||
    response?.data?.barcode ||
    response?.data?.bar_code ||
    response?.data?.order_billet_payment_code ||
    response?.data?.boleto?.barcode ||
    response?.data?.boleto?.bar_code ||
    response?.data?.billet?.barcode ||
    response?.boleto?.barcode ||
    findValueDeep(response, [
      "barcode",
      "bar_code",
      "barCode",
      "order_billet_payment_code",
    ])
  );
}

function getBoletoDigitableLine(response: any) {
  return (
    response?.digitable_line ||
    response?.linha_digitavel ||
    response?.billet_digitable_line ||
    response?.data?.digitable_line ||
    response?.data?.linha_digitavel ||
    response?.data?.billet_digitable_line ||
    response?.data?.boleto?.digitable_line ||
    response?.data?.boleto?.linha_digitavel ||
    response?.data?.billet?.digitable_line ||
    response?.boleto?.digitable_line ||
    findValueDeep(response, [
      "digitable_line",
      "linha_digitavel",
      "digitableLine",
      "billet_digitable_line",
    ])
  );
}

function summarizeAppmaxResponse(response: any) {
  return {
    success: response?.success ?? response?.ok ?? null,
    status: response?.status ?? null,
    text: sanitizeText(response?.text ?? response?.message ?? response?.error),
    customer_id: getCustomerId(response) ? String(getCustomerId(response)) : null,
    order_id: getOrderId(response) ? String(getOrderId(response)) : null,
    payment_id: getPaymentId(response) ? String(getPaymentId(response)) : null,
    has_pix: Boolean(getPixCopyPaste(response) || getPixQrCode(response)),
    has_boleto: Boolean(getBoletoUrl(response) || getBoletoBarcode(response)),
    has_card_token: Boolean(getCardToken(response)),
  };
}

function buildSafePaymentAudit({
  paymentMethod,
  detectedPaymentStatus,
  appmaxCustomerId,
  appmaxOrderId,
  appmaxPaymentId,
  pixQrCode,
  pixCopyPaste,
  boletoUrl,
  boletoBarcode,
  boletoDigitableLine,
  cardLast4,
  cardBrand,
  cardInstallments,
  cardToken,
}: {
  paymentMethod: "pix" | "boleto" | "card";
  detectedPaymentStatus: "pending" | "approved" | "cancelled";
  appmaxCustomerId: any;
  appmaxOrderId: any;
  appmaxPaymentId: any;
  pixQrCode: any;
  pixCopyPaste: any;
  boletoUrl: any;
  boletoBarcode: any;
  boletoDigitableLine: any;
  cardLast4: string | null;
  cardBrand: string | null;
  cardInstallments: number | null;
  cardToken: string | null;
}) {
  return {
    provider: "appmax",
    method: paymentMethod,
    status: detectedPaymentStatus,
    appmax_customer_id: appmaxCustomerId ? String(appmaxCustomerId) : null,
    appmax_order_id: appmaxOrderId ? String(appmaxOrderId) : null,
    appmax_payment_id: appmaxPaymentId ? String(appmaxPaymentId) : null,
    pix:
      paymentMethod === "pix"
        ? {
            has_qr_code: Boolean(pixQrCode),
            has_copy_paste: Boolean(pixCopyPaste),
          }
        : null,
    boleto:
      paymentMethod === "boleto"
        ? {
            has_url: Boolean(boletoUrl),
            has_barcode: Boolean(boletoBarcode),
            has_digitable_line: Boolean(boletoDigitableLine),
          }
        : null,
    card:
      paymentMethod === "card"
        ? {
            last4: cardLast4,
            brand: cardBrand,
            installments: cardInstallments,
            tokenized: Boolean(cardToken),
          }
        : null,
    recorded_at: new Date().toISOString(),
  };
}

function buildPaymentFromOrder(order: any, paymentMethod: "pix" | "boleto" | "card") {
  return {
    method: paymentMethod,
    status: order?.status || "pending",
    pix: {
      qr_code: order?.pix_qr_code || null,
      copy_paste: order?.pix_copy_paste || null,
    },
    boleto: {
      url: order?.boleto_url || null,
      barcode: order?.boleto_barcode || null,
      digitable_line: order?.boleto_digitable_line || null,
    },
    card: {
      last4: order?.raw_payment_response?.card?.last4 || null,
      brand: order?.raw_payment_response?.card?.brand || null,
      installments: order?.raw_payment_response?.card?.installments || null,
    },
    raw: order?.raw_payment_response || null,
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

async function getCourseForProduct(supabaseAdmin: any, product: any) {
  const courseId = getProductCourseId(product);

  if (!courseId) return null;

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,title,payment_url")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    console.warn("Nao foi possivel carregar curso vinculado ao produto:", {
      productId: product?.id,
      productSlug: product?.slug,
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

    if (error) {
      console.warn("Busca de course_purchases ignorada:", error.message);
      return;
    }

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

async function ensureCoursePurchaseForProductOrder({
  supabaseAdmin,
  product,
  order,
  safeRawResponse,
}: {
  supabaseAdmin: any;
  product: any;
  order: any;
  safeRawResponse: any;
}) {
  if (!isAcademyCourseProduct(product)) {
    return null;
  }

  const courseId = getProductCourseId(product);

  if (!courseId) {
    return null;
  }

  const course = await getCourseForProduct(supabaseAdmin, product);
  const existingPurchase = await findCoursePurchaseForProductOrder({
    supabaseAdmin,
    order,
    courseId,
  });

  const status = order?.status || "pending";
  const payload: any = {
    user_id: order?.user_id || null,
    user_email: order?.user_email || "",
    course_id: courseId,
    course_title: course?.title || product?.name || "Curso FatorZ Academy",
    payment_url: course?.payment_url || null,
    status,
    access_type: status === "approved" ? "lifetime" : "lifetime",
    payment_provider: "appmax",
    payment_method: order?.payment_method || null,
    amount_cents: order?.amount_cents || null,
    appmax_customer_id: order?.appmax_customer_id || null,
    appmax_order_id: order?.appmax_order_id || null,
    appmax_payment_id: order?.appmax_payment_id || null,
    payment_id: order?.payment_id || order?.appmax_payment_id || order?.appmax_order_id || null,
    raw_payment_response: safeRawResponse || order?.raw_payment_response || null,
    notes:
      status === "approved"
        ? "Acesso vitalicio liberado automaticamente por compra de produto Academy."
        : "Compra Academy criada pelo checkout unificado FatorZ.",
  };

  if (status === "approved") {
    payload.approved_at = existingPurchase?.approved_at || new Date().toISOString();
  }

  const result = existingPurchase
    ? await supabaseAdmin
        .from("course_purchases")
        .update(payload)
        .eq("id", existingPurchase.id)
        .select("*")
        .single()
    : await supabaseAdmin
        .from("course_purchases")
        .insert(payload)
        .select("*")
        .single();

  if (result.error) {
    console.error("Erro ao sincronizar course_purchases do produto Academy:", {
      orderId: order?.id,
      appmaxOrderId: order?.appmax_order_id,
      courseId,
      error: result.error.message,
    });

    throw result.error;
  }

  return result.data;
}

async function findReusableProductOrder({
  supabaseAdmin,
  userId,
  userEmail,
  cleanDocument,
  productSlug,
  paymentMethod,
}: {
  supabaseAdmin: any;
  userId: any;
  userEmail: string;
  cleanDocument: string;
  productSlug: string;
  paymentMethod: "pix" | "boleto" | "card";
}) {
  try {
    const since = new Date(Date.now() - 20 * 60_000).toISOString();

    let query = supabaseAdmin
      .from("site_product_orders")
      .select("*")
      .eq("payment_provider", "appmax")
      .eq("product_slug", productSlug)
      .eq("payment_method", paymentMethod)
      .in("status", ["pending", "approved"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query
        .eq("user_email", userEmail)
        .eq("customer_document", cleanDocument);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Idempotencia de checkout ignorada:", error.message);
      return null;
    }

    return data?.[0] || null;
  } catch (error: any) {
    console.warn("Idempotencia de checkout falhou:", error?.message || String(error));
    return null;
  }
}

async function findOrderByAppmaxIds({
  supabaseAdmin,
  appmaxOrderId,
  appmaxPaymentId,
}: {
  supabaseAdmin: any;
  appmaxOrderId: any;
  appmaxPaymentId: any;
}) {
  async function findBy(column: string, value: any) {
    if (!value) return null;

    const { data, error } = await supabaseAdmin
      .from("site_product_orders")
      .select("*")
      .eq(column, String(value))
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return null;

    return data?.[0] || null;
  }

  return (
    (await findBy("appmax_order_id", appmaxOrderId)) ||
    (await findBy("appmax_payment_id", appmaxPaymentId)) ||
    (await findBy("payment_id", appmaxPaymentId))
  );
}

async function appmaxPost(endpoint: string, body: any) {
  const response = await fetch(`${appmaxApiUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      "access-token": appmaxToken,
      ...body,
    }),
  });

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {
      raw: text,
    };
  }

  if (!response.ok) {
    throw new Error(
      JSON.stringify({
        endpoint,
        status: response.status,
        response: summarizeAppmaxResponse(data),
      })
    );
  }

  return data;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido.",
    });
  }

  try {
    if (!appmaxToken) {
      return res.status(500).json({
        error: "APPMAX_ACCESS_TOKEN não foi lido.",
      });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({
        error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não foi lido.",
      });
    }

    if (!validateAllowedOrigin(req)) {
      return res.status(403).json({
        error: "Origem nao autorizada para criar pagamento.",
      });
    }

    if (!checkRateLimit(req)) {
      return res.status(429).json({
        error: "Muitas tentativas de pagamento. Aguarde um minuto e tente novamente.",
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

    const {
      userId,
      userEmail,
      customerName,
      customerPhone,
      documentNumber,
      productSlug,
      paymentMethod,
      card,
    } = req.body || {};

    const cleanDocument = onlyNumbers(documentNumber);
    const formattedDocument = formatCpf(cleanDocument);
    const cleanPhone = onlyNumbers(customerPhone);
    const normalizedUserEmail = String(userEmail || "").trim().toLowerCase();
    const safeUserId = userId ? String(userId).trim() : null;

    if (!productSlug) {
      return res.status(400).json({
        error: "Produto não informado.",
      });
    }

    if (!isValidEmail(normalizedUserEmail)) {
      return res.status(400).json({
        error: "Email do cliente não informado.",
      });
    }

    if (safeUserId && !isValidUuid(safeUserId)) {
      return res.status(400).json({
        error: "Identificador de usuario invalido.",
      });
    }

    if (!customerName?.trim()) {
      return res.status(400).json({
        error: "Nome do cliente não informado.",
      });
    }

    if (cleanPhone.length < 10) {
      return res.status(400).json({
        error: "WhatsApp inválido.",
      });
    }

    if (cleanDocument.length !== 11) {
      return res.status(400).json({
        error: "CPF inválido.",
      });
    }

    if (!["pix", "boleto", "card"].includes(paymentMethod)) {
      return res.status(400).json({
        error: "Forma de pagamento inválida. Use pix, boleto ou card.",
      });
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("site_products")
      .select("*")
      .eq("slug", productSlug)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: "Produto não encontrado ou inativo.",
        details: productError,
      });
    }

    if (paymentMethod === "pix" && !product.accepts_pix) {
      return res.status(400).json({
        error: "Esse produto não aceita Pix.",
      });
    }

    if (paymentMethod === "boleto" && !product.accepts_boleto) {
      return res.status(400).json({
        error: "Esse produto não aceita boleto.",
      });
    }

    if (paymentMethod === "card" && !product.accepts_card) {
      return res.status(400).json({
        error: "Esse produto não aceita cartão.",
      });
    }

    const amountCents = Number(product.price_cents || 0);
    const amount = amountCents / 100;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Produto sem preço válido.",
      });
    }

    const reusableOrder = await findReusableProductOrder({
      supabaseAdmin,
      userId: safeUserId,
      userEmail: normalizedUserEmail,
      cleanDocument,
      productSlug: product.slug,
      paymentMethod,
    });

    if (reusableOrder) {
      let academyPurchase: any = null;
      let academyPurchaseError: string | null = null;

      try {
        academyPurchase = await ensureCoursePurchaseForProductOrder({
          supabaseAdmin,
          product,
          order: reusableOrder,
          safeRawResponse: reusableOrder.raw_payment_response,
        });
      } catch (error: any) {
        academyPurchaseError = error?.message || String(error);
      }

      return res.status(200).json({
        success: true,
        idempotent: true,
        site_product_order_id: reusableOrder.id,
        order_id: reusableOrder.id,
        product,
        order: reusableOrder,
        academy_purchase: academyPurchase,
        academy_purchase_error: academyPurchaseError,
        appmax: {
          customer_id: reusableOrder.appmax_customer_id || null,
          order_id: reusableOrder.appmax_order_id || null,
          payment_id: reusableOrder.appmax_payment_id || reusableOrder.payment_id || null,
        },
        payment: buildPaymentFromOrder(reusableOrder, paymentMethod),
      });
    }

    const { firstname, lastname } = splitName(customerName);

    const sku = product.appmax_sku || product.slug;
    const appmaxProductName = product.appmax_product_name || product.name;

    const customerPayload = {
      firstname,
      lastname,
      email: normalizedUserEmail,
      telephone: cleanPhone,
      document_number: formattedDocument,
      ip: getClientIp(req),
      custom_txt: appmaxProductName,
      products: [
        {
          product_sku: sku,
          product_qty: 1,
        },
      ],
    };

    const customerResponse = await appmaxPost("/customer", customerPayload);

    console.log("Produto Appmax customer:", summarizeAppmaxResponse(customerResponse));

    const appmaxCustomerId = getCustomerId(customerResponse);

    if (!appmaxCustomerId) {
      return res.status(500).json({
        error: "A Appmax não retornou customer_id.",
        response: summarizeAppmaxResponse(customerResponse),
      });
    }

    const orderPayload = {
      total: amount,
      products: [
        {
          sku,
          name: appmaxProductName,
          qty: 1,
          price: amount,
          digital_product: 1,
        },
      ],
      shipping: 0,
      customer_id: appmaxCustomerId,
      discount: 0,
      freight_type: "digital",
    };

    const orderResponse = await appmaxPost("/order", orderPayload);

    console.log("Produto Appmax order:", summarizeAppmaxResponse(orderResponse));

    const appmaxOrderId = getOrderId(orderResponse);

    if (!appmaxOrderId) {
      return res.status(500).json({
        error: "A Appmax não retornou order_id.",
        response: summarizeAppmaxResponse(orderResponse),
      });
    }

    let paymentResponse: any = null;
    let tokenizeResponse: any = null;
    let cardToken: string | null = null;
    let cardLast4: string | null = null;
    let cardBrand: string | null = null;
    let cardInstallments: number | null = null;

    if (paymentMethod === "pix") {
      paymentResponse = await appmaxPost("/payment/pix", {
        cart: {
          order_id: appmaxOrderId,
        },
        customer: {
          customer_id: appmaxCustomerId,
        },
        payment: {
          pix: {
            document_number: cleanDocument,
            expiration_date: getExpirationDate(1),
          },
        },
      });
    }

    if (paymentMethod === "boleto") {
      paymentResponse = await appmaxPost("/payment/boleto", {
        cart: {
          order_id: appmaxOrderId,
        },
        customer: {
          customer_id: appmaxCustomerId,
        },
        payment: {
          Boleto: {
            document_number: cleanDocument,
          },
        },
      });
    }

    if (paymentMethod === "card") {
      const cleanCardNumber = onlyNumbers(card?.number);
      const cleanCvv = onlyNumbers(card?.cvv);
      const cardMonth = Number(card?.month || 0);
      const cardYear = Number(card?.year || 0);
      const installments = Number(card?.installments || 1);
      const holderName = String(card?.holderName || customerName || "").trim();

      if (!holderName) {
        return res.status(400).json({
          error: "Nome impresso no cartão não informado.",
        });
      }

      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        return res.status(400).json({
          error: "Número do cartão inválido.",
        });
      }

      if (cleanCvv.length < 3 || cleanCvv.length > 4) {
        return res.status(400).json({
          error: "CVV inválido.",
        });
      }

      if (cardMonth < 1 || cardMonth > 12) {
        return res.status(400).json({
          error: "Mês de validade inválido.",
        });
      }

      if (cardYear < 24 || cardYear > 99) {
        return res.status(400).json({
          error: "Ano de validade inválido.",
        });
      }

      if (installments < 1 || installments > 12) {
        return res.status(400).json({
          error: "Número de parcelas inválido.",
        });
      }

      cardLast4 = cleanCardNumber.slice(-4);
      cardInstallments = installments;

      tokenizeResponse = await appmaxPost("/tokenize/card", {
        card: {
          name: holderName,
          number: cleanCardNumber,
          cvv: cleanCvv,
          month: cardMonth,
          year: cardYear,
        },
      });

      console.log("Produto Appmax card token:", summarizeAppmaxResponse(tokenizeResponse));

      cardToken = getCardToken(tokenizeResponse);

      if (!cardToken) {
        return res.status(500).json({
          error: "A Appmax não retornou token do cartão.",
          response: summarizeAppmaxResponse(tokenizeResponse),
        });
      }

      paymentResponse = await appmaxPost("/payment/credit-card", {
        cart: {
          order_id: appmaxOrderId,
        },
        customer: {
          customer_id: appmaxCustomerId,
        },
        payment: {
          CreditCard: {
            token: cardToken,

            cvv: cleanCvv,
            CVV: cleanCvv,

            document_number: formattedDocument,
            documentNumber: formattedDocument,

            installments,
            soft_descriptor: "FATORZ",
          },
        },
      });

      cardBrand = getCardBrand(paymentResponse);

      console.log("Produto Appmax card payment:", summarizeAppmaxResponse(paymentResponse));
    }

    console.log("Produto Appmax payment:", summarizeAppmaxResponse(paymentResponse));

    const appmaxPaymentId = getPaymentId(paymentResponse);

    const pixQrCode = paymentMethod === "pix" ? getPixQrCode(paymentResponse) : null;
    const pixCopyPaste =
      paymentMethod === "pix" ? getPixCopyPaste(paymentResponse) : null;

    const boletoUrl =
      paymentMethod === "boleto" ? getBoletoUrl(paymentResponse) : null;
    const boletoBarcode =
      paymentMethod === "boleto" ? getBoletoBarcode(paymentResponse) : null;
    const boletoDigitableLine =
      paymentMethod === "boleto" ? getBoletoDigitableLine(paymentResponse) : null;

    const detectedPaymentStatus =
      paymentMethod === "card" ? getPaymentStatus(paymentResponse) : "pending";

    const safeRawResponse = buildSafePaymentAudit({
      paymentMethod,
      detectedPaymentStatus,
      appmaxCustomerId,
      appmaxOrderId,
      appmaxPaymentId,
      pixQrCode,
      pixCopyPaste,
      boletoUrl,
      boletoBarcode,
      boletoDigitableLine,
      cardLast4,
      cardBrand,
      cardInstallments,
      cardToken,
    });

    const { data: order, error: orderSaveError } = await supabaseAdmin
      .from("site_product_orders")
      .insert({
        user_id: safeUserId,
        user_email: normalizedUserEmail,
        customer_name: customerName,
        customer_phone: cleanPhone,
        customer_document: cleanDocument,

        product_id: product.id,
        product_slug: product.slug,
        product_name: product.name,
        product_category: product.category,
        product_type: product.product_type,

        amount_cents: amountCents,
        status: detectedPaymentStatus,

        payment_provider: "appmax",
        payment_method: paymentMethod,

        appmax_customer_id: String(appmaxCustomerId),
        appmax_order_id: String(appmaxOrderId),
        appmax_payment_id: appmaxPaymentId ? String(appmaxPaymentId) : null,
        payment_id: appmaxPaymentId ? String(appmaxPaymentId) : String(appmaxOrderId),

        pix_qr_code: pixQrCode ? String(pixQrCode) : null,
        pix_copy_paste: pixCopyPaste ? String(pixCopyPaste) : null,

        boleto_url: boletoUrl ? String(boletoUrl) : null,
        boleto_barcode: boletoBarcode ? String(boletoBarcode) : null,
        boleto_digitable_line: boletoDigitableLine
          ? String(boletoDigitableLine)
          : null,
        boleto_expiration_date:
          paymentMethod === "boleto" ? getExpirationDate(3) : null,

        raw_payment_response: safeRawResponse,
        notes:
          paymentMethod === "card"
            ? `Pedido de produto criado pelo checkout FatorZ via cartão. Final ${cardLast4 || "—"} em ${cardInstallments || 1}x.`
            : `Pedido de produto criado pelo checkout FatorZ via ${paymentMethod}.`,
      })
      .select("*")
      .single();

    if (orderSaveError) {
      console.error("Pagamento Appmax criado, mas pedido nao foi salvo:", {
        appmaxCustomerId: String(appmaxCustomerId),
        appmaxOrderId: String(appmaxOrderId),
        appmaxPaymentId: appmaxPaymentId ? String(appmaxPaymentId) : null,
        error: orderSaveError.message,
      });

      const recoveredOrder = await findOrderByAppmaxIds({
        supabaseAdmin,
        appmaxOrderId,
        appmaxPaymentId,
      });

      if (recoveredOrder) {
        let academyPurchase: any = null;
        let academyPurchaseError: string | null = null;

        try {
          academyPurchase = await ensureCoursePurchaseForProductOrder({
            supabaseAdmin,
            product,
            order: recoveredOrder,
            safeRawResponse: recoveredOrder.raw_payment_response,
          });
        } catch (error: any) {
          academyPurchaseError = error?.message || String(error);
        }

        return res.status(200).json({
          success: true,
          recovered: true,
          site_product_order_id: recoveredOrder.id,
          order_id: recoveredOrder.id,
          product,
          order: recoveredOrder,
          academy_purchase: academyPurchase,
          academy_purchase_error: academyPurchaseError,
          appmax: {
            customer_id: recoveredOrder.appmax_customer_id || String(appmaxCustomerId),
            order_id: recoveredOrder.appmax_order_id || String(appmaxOrderId),
            payment_id:
              recoveredOrder.appmax_payment_id ||
              recoveredOrder.payment_id ||
              (appmaxPaymentId ? String(appmaxPaymentId) : null),
          },
          payment: buildPaymentFromOrder(recoveredOrder, paymentMethod),
        });
      }

      return res.status(502).json({
        error: "Pagamento criado na Appmax, mas erro ao salvar no Supabase.",
        details: {
          code: orderSaveError.code || null,
          message: orderSaveError.message || "Erro ao salvar pedido.",
        },
        appmax: {
          customer_id: String(appmaxCustomerId),
          order_id: String(appmaxOrderId),
          payment_id: appmaxPaymentId ? String(appmaxPaymentId) : null,
        },
        recovery:
          "Pagamento pode ter sido criado na Appmax. Reconciliar usando appmax.order_id/appmax.payment_id.",
      });
    }

    let academyPurchase: any = null;
    let academyPurchaseError: string | null = null;

    try {
      academyPurchase = await ensureCoursePurchaseForProductOrder({
        supabaseAdmin,
        product,
        order,
        safeRawResponse,
      });
    } catch (error: any) {
      academyPurchaseError = error?.message || String(error);
    }

    return res.status(200).json({
      success: true,
      site_product_order_id: order.id,
      order_id: order.id,
      product,
      order,
      academy_purchase: academyPurchase,
      academy_purchase_error: academyPurchaseError,
      appmax: {
        customer_id: appmaxCustomerId,
        order_id: appmaxOrderId,
        payment_id: appmaxPaymentId,
      },
      payment: {
        method: paymentMethod,
        status: detectedPaymentStatus,
        pix: {
          qr_code: pixQrCode,
          copy_paste: pixCopyPaste,
        },
        boleto: {
          url: boletoUrl,
          barcode: boletoBarcode,
          digitable_line: boletoDigitableLine,
        },
        card: {
          last4: cardLast4,
          brand: cardBrand,
          installments: cardInstallments,
        },
        raw: safeRawResponse,
      },
    });
  } catch (error: any) {
    console.error("Erro create-product-payment:", error?.message || String(error));

    return res.status(500).json({
      error: "Erro ao criar pagamento do produto.",
      details: error?.message || String(error),
    });
  }
}
