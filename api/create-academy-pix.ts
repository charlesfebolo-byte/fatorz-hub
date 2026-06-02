import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const appmaxToken = process.env.APPMAX_ACCESS_TOKEN;
const appmaxApiUrl =
  process.env.APPMAX_API_URL || "https://homolog.sandboxappmax.com.br/api/v3";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
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
        response: data,
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

    if (!userId || !userEmail || !numericCourseId) {
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

    if (!cleanDocument || cleanDocument.length !== 11) {
      return res.status(400).json({
        error: "CPF obrigatório para gerar Pix na Appmax.",
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
      .eq("user_id", userId)
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

    const { firstname, lastname } = splitName(customerName);

    const customerPayload = {
      firstname,
      lastname,
      email: userEmail,
      telephone: onlyNumbers(customerPhone || "11999999999"),
      ip:
        req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
        req.socket?.remoteAddress ||
        "127.0.0.1",
      custom_txt: course.title,
      products: [
        {
          product_sku: `academy-course-${course.id}`,
          product_qty: 1,
        },
      ],
    };

    const customerResponse = await appmaxPost("/customer", customerPayload);

    console.log("APPMAX CUSTOMER RESPONSE:", JSON.stringify(customerResponse));

    const appmaxCustomerId = getCustomerId(customerResponse);

    if (!appmaxCustomerId) {
      return res.status(500).json({
        error: "A Appmax não retornou customer_id.",
        response: customerResponse,
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

    console.log("APPMAX ORDER RESPONSE:", JSON.stringify(orderResponse));

    const appmaxOrderId = getOrderId(orderResponse);

    if (!appmaxOrderId) {
      return res.status(500).json({
        error: "A Appmax não retornou order_id.",
        response: orderResponse,
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

    console.log("APPMAX PIX RESPONSE:", JSON.stringify(pixResponse));

    const pixQrCode = getPixQrCode(pixResponse);
    const pixCopyPaste = getPixCopyPaste(pixResponse);
    const appmaxPaymentId = getPaymentId(pixResponse);

    const { data: existingPending } = await supabaseAdmin
      .from("course_purchases")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", numericCourseId)
      .eq("status", "pending")
      .maybeSingle();

    const purchasePayload = {
      user_id: userId,
      user_email: userEmail,
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
      raw_payment_response: pixResponse,
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
      return res.status(500).json({
        error: "Pix criado na Appmax, mas erro ao salvar no Supabase.",
        details: purchaseResult.error,
        appmax: {
          customerResponse,
          orderResponse,
          pixResponse,
        },
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
        raw: pixResponse,
      },
    });
  } catch (error: any) {
    console.log("Erro create-academy-pix:", error);

    return res.status(500).json({
      error: "Erro ao criar Pix Appmax.",
      details: error?.message || String(error),
    });
  }
}