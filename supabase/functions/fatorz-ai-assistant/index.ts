import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatHistoryItem = {
  role: "assistant" | "user";
  content: string;
};

type RequestBody = {
  message?: string;
  context?: {
    page?: string;
    userName?: string;
    role?: string;
    academyActive?: boolean;
  };
  history?: ChatHistoryItem[];
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeStatus(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isPaidStatus(value: unknown) {
  return [
    "paid",
    "pago",
    "approved",
    "aprovado",
    "completed",
    "concluido",
    "success",
    "succeeded",
    "project_created",
  ].includes(normalizeStatus(value));
}

function isAdvisoryOrder(order: any) {
  const searchable = [
    order?.product_name,
    order?.product_category,
    order?.product_type,
    order?.product_slug,
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    searchable.includes("assessoria") ||
    searchable.includes("mensal") ||
    searchable.includes("subscription") ||
    searchable.includes("plano basic") ||
    searchable.includes("plano plus") ||
    searchable.includes("plano pro") ||
    searchable.includes("presenca inicial") ||
    searchable.includes("presença inicial")
  );
}

async function getPurchaseContext(supabaseAdmin: any, user: any) {
  const purchases = new Map<string, any>();

  const { data: ordersById, error: ordersByIdError } = await supabaseAdmin
    .from("site_product_orders")
    .select("id,status,product_name,product_category,product_type,product_slug")
    .eq("user_id", user.id);

  if (ordersByIdError) {
    console.log("Erro ao buscar pedidos por user_id:", ordersByIdError);
  }

  (ordersById || []).forEach((order: any) => {
    purchases.set(`id-${order.id}`, order);
  });

  if (user.email) {
    const { data: ordersByEmail, error: ordersByEmailError } = await supabaseAdmin
      .from("site_product_orders")
      .select("id,status,product_name,product_category,product_type,product_slug")
      .eq("user_email", user.email);

    if (ordersByEmailError) {
      console.log("Erro ao buscar pedidos por email:", ordersByEmailError);
    }

    (ordersByEmail || []).forEach((order: any) => {
      purchases.set(`id-${order.id}`, order);
    });
  }

  const siteOrders = Array.from(purchases.values());
  const paidSiteOrders = siteOrders.filter((order) => isPaidStatus(order.status));
  const hasActiveAdvisory = paidSiteOrders.some((order) => isAdvisoryOrder(order));

  let approvedCourses = 0;

  const { data: coursePurchases, error: coursePurchaseError } = await supabaseAdmin
    .from("course_purchases")
    .select("id,status")
    .eq("user_id", user.id);

  if (coursePurchaseError) {
    console.log("Erro ao buscar course_purchases:", coursePurchaseError);
  } else {
    approvedCourses = (coursePurchases || []).filter((purchase: any) =>
      isPaidStatus(purchase.status)
    ).length;
  }

  return {
    paidPurchaseCount: paidSiteOrders.length + approvedCourses,
    hasActiveAdvisory,
  };
}

async function getLimit(profile: any, supabaseAdmin: any, user: any) {
  const role = profile?.role || "user";
  const staffRole = profile?.staff_role || "none";
  const customerTag = profile?.customer_tag || "free";

  if (role === "admin" || staffRole !== "none") return 100;
  if (role === "premium" || customerTag === "premium" || customerTag === "lendario") {
    return 40;
  }

  const academyActive =
    !!profile?.academy_expires_at &&
    new Date(profile.academy_expires_at).getTime() > new Date().getTime();

  const purchaseContext = await getPurchaseContext(supabaseAdmin, user);

  if (purchaseContext.hasActiveAdvisory) return 30;
  if (purchaseContext.paidPurchaseCount >= 3) return 20;
  if (purchaseContext.paidPurchaseCount >= 2) return 15;
  if (purchaseContext.paidPurchaseCount >= 1) return 10;
  if (academyActive) return 15;

  return 5;
}

function cleanText(value: string) {
  return value.replace(/\u0000/g, "").trim().slice(0, 3000);
}

function buildPrompt({
  message,
  history,
  context,
  profile,
}: {
  message: string;
  history: ChatHistoryItem[];
  context: RequestBody["context"];
  profile: any;
}) {
  const safeHistory = history
    .slice(-8)
    .map((item) => {
      const role = item.role === "user" ? "Cliente" : "Assistente";
      return `${role}: ${cleanText(item.content).slice(0, 900)}`;
    })
    .join("\n");

  const userName = context?.userName || profile?.nome || profile?.email || "cliente";
  const role = profile?.role || context?.role || "user";
  const page = context?.page || "Hub FatorZ";
  const academyActive = context?.academyActive ? "sim" : "não";

  return `
Você é o Jack, o assistente oficial da FatorZ dentro do Hub.

Identidade:
- Nome: Jack.
- Marca: FatorZ House / FatorZ Academy.
- Tom: simples, direto, humano, premium e prático.
- Estilo: presença, posicionamento e direção.
- Responda em português do Brasil.
- Seja útil para marketing digital, Instagram, conteúdo, IA, Academy, presença digital, landing pages, vendas, organização de perfil, Reels, stories, legendas, CTA e próximos passos.

Contexto do usuário:
- Nome/email visível: ${userName}
- Perfil/role: ${role}
- Academy ativa: ${academyActive}
- Página atual: ${page}

Regras de segurança e privacidade:
- Não exponha dados privados, dados administrativos, pedidos, clientes, pagamentos internos, chaves de API, tokens, banco de dados, código sensível ou informações de outros usuários.
- Se o usuário pedir algo privado ou administrativo, diga que não pode acessar ou expor esse tipo de informação.
- Não invente dados do sistema. Se não souber, oriente o usuário a verificar no painel ou falar com o suporte da FatorZ.
- Não prometa resultado garantido, dinheiro garantido, seguidores garantidos ou vendas garantidas.
- Não peça senha, documento, chave, token, dados bancários ou informações sensíveis.
- Não dê diagnóstico médico, jurídico ou financeiro de alto risco.
- Pode ajudar com ideias, textos, roteiros, checklist, explicações e orientações gerais.

Formato ideal:
- Responda de forma organizada.
- Use títulos curtos quando ajudar.
- Seja prático.
- Entregue exemplos prontos quando o pedido for de conteúdo.
- Para postagens, tente entregar: ideia, gancho, legenda, CTA e sugestão visual.
- Evite textão desnecessário.

Histórico recente:
${safeHistory || "Sem histórico anterior."}

Pedido atual do cliente:
${message}

Resposta do Jack:
`.trim();
}

async function callGemini(prompt: string) {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.75,
          topP: 0.9,
          maxOutputTokens: 1200,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro Gemini: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text || "")
      .join("\n")
      .trim() || "";

  if (!answer) {
    throw new Error("Gemini não retornou resposta.");
  }

  return answer;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(
        {
          error:
            "Função sem variáveis do Supabase configuradas. Verifique SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.",
        },
        500
      );
    }

    const authorization = req.headers.get("Authorization") || "";

    if (!authorization) {
      return jsonResponse(
        {
          error:
            "Você precisa estar logado para usar o Assistente FatorZ com IA.",
        },
        401
      );
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error:
            "Sessão inválida. Entre novamente no Hub para usar o assistente.",
        },
        401
      );
    }

    const body = (await req.json()) as RequestBody;
    const message = cleanText(body.message || "");

    if (!message) {
      return jsonResponse(
        {
          error: "Digite uma pergunta para o Assistente FatorZ responder.",
        },
        400
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.log("Erro ao buscar profile:", profileError);
    }

    const limit = await getLimit(
      profile || {
        email: user.email,
        role: "user",
      },
      supabaseAdmin,
      user
    );
    const today = getTodayKey();

    const { data: usageRow, error: usageReadError } = await supabaseAdmin
      .from("ai_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageReadError) {
      console.log("Erro ao buscar ai_usage:", usageReadError);

      return jsonResponse(
        {
          error:
            "Não consegui verificar seu limite diário agora. Tente novamente em instantes.",
        },
        500
      );
    }

    const used = Number(usageRow?.count || 0);

    if (used >= limit) {
      return jsonResponse(
        {
          error:
            "Seu limite diário do Jack acabou por hoje. Volte amanhã ou desbloqueie mais acesso comprando novas soluções da FatorZ.",
          used,
          limit,
          remaining: 0,
        },
        200
      );
    }

    const prompt = buildPrompt({
      message,
      history: Array.isArray(body.history) ? body.history : [],
      context: body.context || {},
      profile: profile || {
        email: user.email,
        role: "user",
      },
    });

    const answer = await callGemini(prompt);

    const newCount = used + 1;

    if (usageRow?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("ai_usage")
        .update({
          count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageRow.id);

      if (updateError) {
        console.log("Erro ao atualizar ai_usage:", updateError);
      }
    } else {
      const { error: insertError } = await supabaseAdmin.from("ai_usage").insert({
        user_id: user.id,
        usage_date: today,
        count: newCount,
      });

      if (insertError) {
        console.log("Erro ao inserir ai_usage:", insertError);
      }
    }

    return jsonResponse({
      answer,
      used: newCount,
      limit,
      remaining: Math.max(limit - newCount, 0),
    });
  } catch (err) {
    console.log("Erro inesperado fatorz-ai-assistant:", err);

    return jsonResponse(
      {
        error:
          "O Jack não conseguiu responder agora. Verifique a chave Gemini, a função do Supabase e tente novamente.",
      },
      500
    );
  }
});
