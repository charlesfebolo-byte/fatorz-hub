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

function getPixExpirationDate() {
  const date = new Date();
  date.setHours(date.getHours() + 2);

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
    findValueDeep(response, ["payment_id", "paymentId", "transaction_id", "transactionId"])
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

function summarizeAppmaxResponse(response: any) {
  return {
    success: response?.success ?? response?.ok ?? null,
    status: response?.status ?? null,
    text: sanitizeText(response?.text ?? response?.message ?? response?.error),
    customer_id: getCustomerId(response) ? String(getCustomerId(response)) : null,
    order_id: getOrderId(response) ? String(getOrderId(response)) : null,
    payment_id: getPaymentId(response) ? String(getPaymentId(response)) : null,
    has_pix: Boolean(getPixCopyPaste(response) || getPixQrCode(response)),
  };
}

function buildSafePixAudit({
  appmaxCustomerId,
  appmaxOrderId,
  appmaxPaymentId,
  pixQrCode,
  pixCopyPaste,
}: {
  appmaxCustomerId: any;
  appmaxOrderId: any;
  appmaxPaymentId: any;
  pixQrCode: any;
  pixCopyPaste: any;
}) {
  return {
    provider: "appmax",
    method: "pix",
    status: "pending",
    appmax_customer_id: appmaxCustomerId ? String(appmaxCustomerId) : null,
    appmax_order_id: appmaxOrderId ? String(appmaxOrderId) : null,
    appmax_payment_id: appmaxPaymentId ? String(appmaxPaymentId) : null,
    pix: {
      has_qr_code: Boolean(pixQrCode),
      has_copy_paste: Boolean(pixCopyPaste),
    },
    recorded_at: new Date().toISOString(),
  };
}

async function findPurchaseByAppmaxIds({
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
      .from("course_purchases")
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
        error:
          "APPMAX_ACCESS_TOKEN não foi lido. Confirme se está no .env.local e reinicie o terminal da API.",
      });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({
        error:
          "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não foi lido. Confirme o .env.local.",
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
      courseId,
    } = req.body || {};

    const numericCourseId = Number(courseId);
    const normalizedUserEmail = String(userEmail || "").trim().toLowerCase();
    const safeUserId = userId ? String(userId).trim() : "";

    if (!isValidUuid(safeUserId) || !isValidEmail(normalizedUserEmail) || !numericCourseId) {
      return res.status(400).json({
        error: "Dados obrigatórios ausentes: userId, userEmail ou courseId.",
        received: {
          userId: Boolean(userId),
          userEmail: Boolean(userEmail),
          courseId,
        },
      });
    }

    const cleanDocument = onlyNumbers(documentNumber);
    const cleanPhone = onlyNumbers(customerPhone);

    if (!cleanDocument || cleanDocument.length !== 11) {
      return res.status(400).json({
        error: "CPF obrigatório para gerar Pix na Appmax.",
      });
    }

    if (cleanPhone.length < 10) {
      return res.status(400).json({
        error: "WhatsApp invalido.",
      });
    }

    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", numericCourseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({
        error: "Curso não encontrado.",
        details: courseError,
        courseId: numericCourseId,
      });
    }

    const amountCents = Number(course.price_cents || 0);
    const amount = amountCents / 100;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Curso sem preço válido.",
      });
    }

    const { data: alreadyApproved } = await supabaseAdmin
      .from("course_purchases")
      .select("*")
      .eq("user_id", safeUserId)
      .eq("course_id", numericCourseId)
      .eq("status", "approved")
      .maybeSingle();

    if (alreadyApproved) {
      return res.status(200).json({
        alreadyApproved: true,
        message: "Esse curso já está liberado para este usuário.",
        purchase: alreadyApproved,
      });
    }

    const { data: reusablePending } = await supabaseAdmin
      .from("course_purchases")
      .select("*")
      .eq("user_id", safeUserId)
      .eq("course_id", numericCourseId)
      .eq("status", "pending")
      .gte("created_at", new Date(Date.now() - 20 * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reusablePending?.pix_copy_paste || reusablePending?.pix_qr_code) {
      return res.status(200).json({
        success: true,
        idempotent: true,
        course,
        purchase: reusablePending,
        appmax: {
          customer_id: reusablePending.appmax_customer_id || null,
          order_id: reusablePending.appmax_order_id || null,
          payment_id: reusablePending.appmax_payment_id || reusablePending.payment_id || null,
        },
        pix: {
          qr_code: reusablePending.pix_qr_code || null,
          copy_paste: reusablePending.pix_copy_paste || null,
          raw: reusablePending.raw_payment_response || null,
        },
      });
    }

    const { firstname, lastname } = splitName(customerName);

    const customerPayload = {
      firstname,
      lastname,
      email: normalizedUserEmail,
      telephone: cleanPhone,
      ip: getClientIp(req),
      custom_txt: course.title,
      products: [
        {
          product_sku: `academy-course-${course.id}`,
          product_qty: 1,
        },
      ],
    };

    const customerResponse = await appmaxPost("/customer", customerPayload);

    console.log("Academy Appmax customer:", summarizeAppmaxResponse(customerResponse));

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
          sku: `academy-course-${course.id}`,
          name: course.title,
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

    console.log("Academy Appmax order:", summarizeAppmaxResponse(orderResponse));

    const appmaxOrderId = getOrderId(orderResponse);

    if (!appmaxOrderId) {
      return res.status(500).json({
        error: "A Appmax não retornou order_id.",
        response: summarizeAppmaxResponse(orderResponse),
      });
    }

    const pixPayload = {
      cart: {
        order_id: appmaxOrderId,
      },
      customer: {
        customer_id: appmaxCustomerId,
      },
      payment: {
        pix: {
          document_number: cleanDocument,
          expiration_date: getPixExpirationDate(),
        },
      },
    };

    const pixResponse = await appmaxPost("/payment/pix", pixPayload);

    console.log("Academy Appmax pix:", summarizeAppmaxResponse(pixResponse));

    const pixQrCode = getPixQrCode(pixResponse);
    const pixCopyPaste = getPixCopyPaste(pixResponse);
    const appmaxPaymentId = getPaymentId(pixResponse);

    const { data: existingPending } = await supabaseAdmin
      .from("course_purchases")
      .select("*")
      .eq("user_id", safeUserId)
      .eq("course_id", numericCourseId)
      .eq("status", "pending")
      .maybeSingle();

    const purchasePayload = {
      user_id: safeUserId,
      user_email: normalizedUserEmail,
      course_id: course.id,
      course_title: course.title,
      payment_url: course.payment_url || null,
      status: "pending",
      access_type: "lifetime",
      payment_provider: "appmax",
      payment_method: "pix",
      amount_cents: amountCents,
      appmax_customer_id: String(appmaxCustomerId),
      appmax_order_id: String(appmaxOrderId),
      appmax_payment_id: appmaxPaymentId ? String(appmaxPaymentId) : null,
      payment_id: appmaxPaymentId ? String(appmaxPaymentId) : String(appmaxOrderId),
      pix_qr_code: pixQrCode ? String(pixQrCode) : null,
      pix_copy_paste: pixCopyPaste ? String(pixCopyPaste) : null,
      raw_payment_response: buildSafePixAudit({
        appmaxCustomerId,
        appmaxOrderId,
        appmaxPaymentId,
        pixQrCode,
        pixCopyPaste,
      }),
      notes: "Pix Appmax criado pelo checkout próprio FatorZ.",
    };

    const purchaseResult = existingPending
      ? await supabaseAdmin
          .from("course_purchases")
          .update(purchasePayload)
          .eq("id", existingPending.id)
          .select("*")
          .single()
      : await supabaseAdmin
          .from("course_purchases")
          .insert(purchasePayload)
          .select("*")
          .single();

    if (purchaseResult.error) {
      console.error("Pix Appmax criado, mas compra nao foi salva:", {
        appmaxCustomerId: String(appmaxCustomerId),
        appmaxOrderId: String(appmaxOrderId),
        appmaxPaymentId: appmaxPaymentId ? String(appmaxPaymentId) : null,
        error: purchaseResult.error.message,
      });

      const recoveredPurchase = await findPurchaseByAppmaxIds({
        supabaseAdmin,
        appmaxOrderId,
        appmaxPaymentId,
      });

      if (recoveredPurchase) {
        return res.status(200).json({
          success: true,
          recovered: true,
          course,
          purchase: recoveredPurchase,
          appmax: {
            customer_id: recoveredPurchase.appmax_customer_id || String(appmaxCustomerId),
            order_id: recoveredPurchase.appmax_order_id || String(appmaxOrderId),
            payment_id:
              recoveredPurchase.appmax_payment_id ||
              recoveredPurchase.payment_id ||
              (appmaxPaymentId ? String(appmaxPaymentId) : null),
          },
          pix: {
            qr_code: recoveredPurchase.pix_qr_code || pixQrCode || null,
            copy_paste: recoveredPurchase.pix_copy_paste || pixCopyPaste || null,
            raw: recoveredPurchase.raw_payment_response || null,
          },
        });
      }

      return res.status(502).json({
        error: "Pix criado na Appmax, mas erro ao salvar no Supabase.",
        details: {
          code: purchaseResult.error.code || null,
          message: purchaseResult.error.message || "Erro ao salvar compra.",
        },
        appmax: {
          customer_id: String(appmaxCustomerId),
          order_id: String(appmaxOrderId),
          payment_id: appmaxPaymentId ? String(appmaxPaymentId) : null,
        },
        recovery:
          "Pix pode ter sido criado na Appmax. Reconciliar usando appmax.order_id/appmax.payment_id.",
      });
    }

    return res.status(200).json({
      success: true,
      course,
      purchase: purchaseResult.data,
      appmax: {
        customer_id: appmaxCustomerId,
        order_id: appmaxOrderId,
        payment_id: appmaxPaymentId,
      },
      pix: {
        qr_code: pixQrCode,
        copy_paste: pixCopyPaste,
        raw: purchasePayload.raw_payment_response,
      },
    });
  } catch (error: any) {
    console.error("Erro create-academy-pix:", error?.message || String(error));

    return res.status(500).json({
      error: "Erro ao criar Pix Appmax.",
      details: error?.message || String(error),
    });
  }
}
