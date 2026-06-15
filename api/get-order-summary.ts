import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizeText(value: any) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeStatus(value: any) {
  const status = normalizeText(value);

  if (
    ["approved", "paid", "pago", "aprovado", "completed", "concluido"].includes(
      status
    )
  ) {
    return "approved";
  }

  if (
    [
      "cancelled",
      "canceled",
      "cancelado",
      "recusado",
      "refused",
      "failed",
      "denied",
    ].includes(status)
  ) {
    return "cancelled";
  }

  return "pending";
}

function isAcademyCourseProduct(product: any) {
  const searchable = normalizeText(
    [
      product?.name,
      product?.slug,
      product?.category,
      product?.product_type,
      product?.subtitle,
      product?.description,
    ].join(" ")
  );

  return Boolean(
    product?.category === "academy" ||
      product?.product_type === "course" ||
      product?.course_id ||
      searchable.includes("academy") ||
      searchable.includes("curso")
  );
}

function productNeedsBriefing(product: any) {
  if (!product) return false;

  const searchable = normalizeText(
    [
      product?.name,
      product?.slug,
      product?.category,
      product?.product_type,
      product?.subtitle,
      product?.description,
      product?.badge,
    ].join(" ")
  );

  if (isAcademyCourseProduct(product)) return false;
  if (product?.product_type === "diagnostic") return false;
  if (searchable.includes("diagnostico")) return false;
  if (searchable.includes("diagnostic")) return false;
  if (searchable.includes("analise de perfil")) return false;
  if (searchable.includes("perfil")) {
    const isProfileDiagnostic =
      searchable.includes("diagnostico") ||
      searchable.includes("diagnostic") ||
      searchable.includes("analise");

    if (isProfileDiagnostic) return false;
  }

  return true;
}

function buildProductFromOrder(order: any, product: any) {
  return {
    id: product?.id || order.product_id || null,
    name: product?.name || order.product_name || "Produto FatorZ",
    slug: product?.slug || order.product_slug || null,
    subtitle: product?.subtitle || null,
    description: product?.description || null,
    category: product?.category || order.product_category || null,
    product_type: product?.product_type || order.product_type || null,
    price_cents: product?.price_cents ?? order.amount_cents ?? null,
    old_price_cents: product?.old_price_cents ?? null,
    image_url: product?.image_url || null,
    badge: product?.badge || null,
    course_id: product?.course_id || null,
  };
}

function isCheckoutable(product: any) {
  if (!product?.slug) return false;
  if (product.checkout_provider === "manual") return false;
  if (product.checkout_provider === "external") return false;

  return Boolean(product.accepts_pix || product.accepts_boleto || product.accepts_card);
}

function scoreUpsell(product: any, purchasedProduct: any) {
  const purchasedText = normalizeText(
    [
      purchasedProduct?.category,
      purchasedProduct?.product_type,
      purchasedProduct?.name,
      purchasedProduct?.slug,
    ].join(" ")
  );
  const candidateText = normalizeText(
    [product?.category, product?.product_type, product?.name, product?.slug].join(" ")
  );

  const candidateIsDiagnostic =
    product?.product_type === "diagnostic" ||
    candidateText.includes("diagnostico") ||
    candidateText.includes("analise de perfil");
  const candidateIsAdvisory =
    product?.category === "assessoria" ||
    product?.product_type === "subscription" ||
    candidateText.includes("assessoria") ||
    candidateText.includes("mensal");
  const candidateIsAcademy = isAcademyCourseProduct(product);

  let score = 0;

  if (product.is_featured) score += 25;
  if (product.image_url) score += 4;
  if (Number(product.price_cents || 0) > 0) score += 4;

  if (purchasedText.includes("academy") || purchasedText.includes("curso")) {
    if (candidateIsDiagnostic) score += 45;
    if (candidateIsAdvisory) score += 35;
    if (product.product_type === "service") score += 20;
    if (candidateIsAcademy) score -= 15;
  } else if (
    purchasedText.includes("diagnostic") ||
    purchasedText.includes("diagnostico") ||
    purchasedText.includes("analise de perfil")
  ) {
    if (candidateIsAdvisory) score += 45;
    if (product.product_type === "branding" || product.product_type === "site") {
      score += 30;
    }
    if (candidateIsAcademy) score += 16;
  } else if (
    purchasedText.includes("assessoria") ||
    purchasedText.includes("subscription") ||
    purchasedText.includes("mensal")
  ) {
    if (candidateIsDiagnostic) score += 35;
    if (candidateIsAcademy) score += 25;
    if (product.product_type === "service") score += 16;
  } else if (
    purchasedText.includes("site") ||
    purchasedText.includes("branding") ||
    purchasedText.includes("identidade")
  ) {
    if (candidateIsAdvisory) score += 45;
    if (candidateIsDiagnostic) score += 25;
    if (candidateIsAcademy) score += 15;
  } else {
    if (candidateIsDiagnostic) score += 35;
    if (candidateIsAdvisory) score += 30;
    if (candidateIsAcademy) score += 18;
  }

  return score;
}

function safeUpsellProduct(product: any) {
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle || null,
    description: product.description || null,
    category: product.category || null,
    product_type: product.product_type || null,
    price_cents: product.price_cents ?? null,
    old_price_cents: product.old_price_cents ?? null,
    image_url: product.image_url || null,
    badge: product.badge || null,
  };
}

function selectUpsell(candidates: any[], purchasedProduct: any) {
  const validCandidates = candidates.filter((product) => {
    if (!isCheckoutable(product)) return false;
    if (purchasedProduct?.id && Number(product.id) === Number(purchasedProduct.id)) {
      return false;
    }
    if (purchasedProduct?.slug && product.slug === purchasedProduct.slug) return false;

    return true;
  });

  if (!validCandidates.length) return null;

  const scored = validCandidates
    .map((product) => ({
      product,
      score: scoreUpsell(product, purchasedProduct),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) return scored[0].product;

  return (
    validCandidates.find((product) => {
      const text = normalizeText([product.name, product.slug, product.product_type].join(" "));
      return product.product_type === "diagnostic" || text.includes("diagnostico");
    }) ||
    validCandidates.find((product) => {
      const text = normalizeText([product.name, product.slug, product.category].join(" "));
      return product.category === "assessoria" || text.includes("assessoria");
    }) ||
    validCandidates.find((product) => product.is_featured) ||
    validCandidates[0]
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Metodo nao permitido.",
    });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao foi configurado.",
    });
  }

  const orderId = Number(req.query?.orderId || 0);

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: "Pedido invalido.",
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

  const { data: order, error: orderError } = await supabaseAdmin
    .from("site_product_orders")
    .select(
      [
        "id",
        "created_at",
        "updated_at",
        "product_id",
        "product_slug",
        "product_name",
        "product_category",
        "product_type",
        "amount_cents",
        "status",
        "payment_provider",
        "payment_method",
        "pix_qr_code",
        "pix_copy_paste",
        "boleto_url",
        "boleto_barcode",
        "boleto_digitable_line",
        "boleto_expiration_date",
      ].join(",")
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("Erro ao buscar resumo do pedido:", orderError.message);

    return res.status(500).json({
      error: "Nao foi possivel buscar o pedido.",
    });
  }

  if (!order) {
    return res.status(404).json({
      error: "Pedido nao encontrado.",
    });
  }

  let fullProduct: any = null;

  if (order.product_id) {
    const { data: product, error: productError } = await supabaseAdmin
      .from("site_products")
      .select(
        "id,name,slug,subtitle,description,category,product_type,price_cents,old_price_cents,is_active,is_featured,image_url,badge,checkout_provider,accepts_pix,accepts_boleto,accepts_card,course_id"
      )
      .eq("id", order.product_id)
      .maybeSingle();

    if (productError) {
      console.warn("Produto do pedido nao encontrado para resumo:", productError.message);
    }

    fullProduct = product || null;
  }

  const purchasedProduct = buildProductFromOrder(order, fullProduct);

  const { data: products, error: productsError } = await supabaseAdmin
    .from("site_products")
    .select(
      "id,name,slug,subtitle,description,category,product_type,price_cents,old_price_cents,is_active,is_featured,image_url,badge,checkout_provider,accepts_pix,accepts_boleto,accepts_card,course_id"
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("order_index", { ascending: true })
    .limit(50);

  if (productsError) {
    console.warn("Nao foi possivel buscar upsell:", productsError.message);
  }

  const upsell = selectUpsell(products || [], purchasedProduct);
  const normalizedStatus = normalizeStatus(order.status);

  return res.status(200).json({
    success: true,
    order: {
      id: order.id,
      created_at: order.created_at,
      updated_at: order.updated_at,
      status: normalizedStatus,
      amount_cents: order.amount_cents,
      payment_provider: order.payment_provider || "appmax",
      payment_method: order.payment_method || null,
    },
    product: purchasedProduct,
    payment: {
      method: order.payment_method || null,
      status: normalizedStatus,
      pix: {
        qr_code: order.payment_method === "pix" ? order.pix_qr_code || null : null,
        copy_paste:
          order.payment_method === "pix" ? order.pix_copy_paste || null : null,
      },
      boleto: {
        url: order.payment_method === "boleto" ? order.boleto_url || null : null,
        barcode:
          order.payment_method === "boleto" ? order.boleto_barcode || null : null,
        digitable_line:
          order.payment_method === "boleto"
            ? order.boleto_digitable_line || null
            : null,
        expiration_date:
          order.payment_method === "boleto"
            ? order.boleto_expiration_date || null
            : null,
      },
    },
    next_step: {
      needs_briefing: productNeedsBriefing(purchasedProduct),
      is_academy_course: isAcademyCourseProduct(purchasedProduct),
      course_id: purchasedProduct.course_id || null,
    },
    upsell: safeUpsellProduct(upsell),
  });
}
