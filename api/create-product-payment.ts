import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const appmaxToken = process.env.APPMAX_ACCESS_TOKEN;
const appmaxApiUrl =
  process.env.APPMAX_API_URL || "https://admin.appmax.com.br/api/v3";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
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
        error: "APPMAX_ACCESS_TOKEN não foi lido.",
      });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({
        error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não foi lido.",
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

    if (!productSlug) {
      return res.status(400).json({
        error: "Produto não informado.",
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        error: "Email do cliente não informado.",
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

    const { firstname, lastname } = splitName(customerName);

    const sku = product.appmax_sku || product.slug;
    const appmaxProductName = product.appmax_product_name || product.name;

    const customerPayload = {
      firstname,
      lastname,
      email: userEmail,
      telephone: cleanPhone,
      document_number: formattedDocument,
      ip:
        req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
        req.socket?.remoteAddress ||
        "127.0.0.1",
      custom_txt: appmaxProductName,
      products: [
        {
          product_sku: sku,
          product_qty: 1,
        },
      ],
    };

    const customerResponse = await appmaxPost("/customer", customerPayload);

    console.log("PRODUCT CUSTOMER RESPONSE:", JSON.stringify(customerResponse));

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

    console.log("PRODUCT ORDER RESPONSE:", JSON.stringify(orderResponse));

    const appmaxOrderId = getOrderId(orderResponse);

    if (!appmaxOrderId) {
      return res.status(500).json({
        error: "A Appmax não retornou order_id.",
        response: orderResponse,
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

      console.log("PRODUCT CARD TOKEN RESPONSE:", JSON.stringify(tokenizeResponse));

      cardToken = getCardToken(tokenizeResponse);

      if (!cardToken) {
        return res.status(500).json({
          error: "A Appmax não retornou token do cartão.",
          response: tokenizeResponse,
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

      console.log("PRODUCT CARD PAYMENT RESPONSE:", JSON.stringify(paymentResponse));
    }

    console.log("PRODUCT PAYMENT RESPONSE:", JSON.stringify(paymentResponse));

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

    const safeRawResponse =
      paymentMethod === "card"
        ? {
            tokenize: {
              success: tokenizeResponse?.success,
              status: tokenizeResponse?.status,
              text: tokenizeResponse?.text,
              has_token: Boolean(cardToken),
            },
            payment: paymentResponse,
            card: {
              last4: cardLast4,
              brand: cardBrand,
              installments: cardInstallments,
            },
          }
        : paymentResponse;

    const { data: order, error: orderSaveError } = await supabaseAdmin
      .from("site_product_orders")
      .insert({
        user_id: userId || null,
        user_email: userEmail,
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
      return res.status(500).json({
        error: "Pagamento criado na Appmax, mas erro ao salvar no Supabase.",
        details: orderSaveError,
        appmax: {
          customerResponse,
          orderResponse,
          paymentResponse,
        },
      });
    }

    return res.status(200).json({
      success: true,
      product,
      order,
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
    console.log("Erro create-product-payment:", error);

    return res.status(500).json({
      error: "Erro ao criar pagamento do produto.",
      details: error?.message || String(error),
    });
  }
}