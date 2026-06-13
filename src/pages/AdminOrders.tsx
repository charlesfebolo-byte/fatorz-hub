import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type LegacyOrder = {
  id: number;
  created_at: string;

  user_id: string | null;
  customer_email: string | null;
  customer_name: string | null;

  product_id: string | null;
  product_name: string | null;
  product_category: string | null;
  product_price: string | null;
  payment_link: string | null;

  status: string | null;
  payment_id: string | null;

  project_id: number | null;
  notes: string | null;
};

type SiteProductOrder = {
  id: number;
  created_at: string;
  updated_at: string | null;

  user_id: string | null;
  user_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_document: string | null;

  product_id: number | null;
  product_slug: string | null;
  product_name: string | null;
  product_category: string | null;
  product_type: string | null;

  amount_cents: number | null;
  status: string | null;

  payment_provider: string | null;
  payment_method: string | null;

  appmax_customer_id: string | null;
  appmax_order_id: string | null;
  appmax_payment_id: string | null;
  payment_id: string | null;

  pix_qr_code: string | null;
  pix_copy_paste: string | null;

  boleto_url: string | null;
  boleto_barcode: string | null;
  boleto_digitable_line: string | null;
  boleto_expiration_date: string | null;

  raw_payment_response: any;
  project_id: number | null;
  notes: string | null;
};

type Project = {
  id: number;
  created_at: string;
  title: string | null;
  client_name: string | null;
  client_email: string | null;
  service_type: string | null;
  status: string | null;
  deadline: string | null;
  amount: number | null;
  delivery_link: string | null;
  notes: string | null;
};

type UnifiedOrder = {
  source: "legacy" | "product";
  actionKey: string;

  id: number;
  created_at: string;

  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_document: string | null;

  product_name: string | null;
  product_category: string | null;
  product_type: string | null;

  product_price: string | null;
  amount_number: number;

  status: string | null;
  payment_id: string | null;
  payment_method: string | null;
  payment_provider: string | null;

  appmax_order_id: string | null;
  appmax_customer_id: string | null;
  appmax_payment_id: string | null;

  payment_link: string | null;
  boleto_url: string | null;
  boleto_digitable_line: string | null;
  pix_copy_paste: string | null;

  project_id: number | null;
  notes: string | null;

  legacy?: LegacyOrder;
  product?: SiteProductOrder;
};

type ServiceBriefing = {
  id: number;
  created_at: string;
  updated_at: string | null;
  order_id: number;
  project_id: number | null;
  user_id: string | null;
  user_email: string;
  customer_name: string | null;
  product_name: string | null;
  product_category: string | null;
  product_type: string | null;
  brand_name: string | null;
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  city: string | null;
  main_objective: string | null;
  offer_description: string | null;
  target_audience: string | null;
  colors: string | null;
  avoid_colors: string | null;
  visual_style: string | null;
  references_like: string | null;
  references_dislike: string | null;
  logo_link: string | null;
  material_links: string | null;
  copy_notes: string | null;
  extra_notes: string | null;
  status: string | null;
};

type AdvisoryStep = {
  status: string;
  title: string;
  period: string;
  description: string;
};

const ADVISORY_STEPS: AdvisoryStep[] = [
  {
    status: "aguardando cliente",
    title: "Briefing inicial",
    period: "Dia 1",
    description: "Cliente envia informações, materiais, referências e objetivo do mês.",
  },
  {
    status: "em diagnóstico",
    title: "Diagnóstico e direção",
    period: "Dias 2 a 4",
    description: "Análise da presença digital e definição da direção do ciclo.",
  },
  {
    status: "planejamento",
    title: "Planejamento mensal",
    period: "Dias 5 a 7",
    description: "Calendário, linha editorial, prioridades e ordem das entregas.",
  },
  {
    status: "produção lote 1",
    title: "Produção — lote 1",
    period: "Semana 2",
    description: "Primeira leva de conteúdos ou materiais do plano.",
  },
  {
    status: "produção lote 2",
    title: "Produção — lote 2",
    period: "Semana 3",
    description: "Segunda leva de conteúdos, materiais ou ajustes estratégicos.",
  },
  {
    status: "em revisão",
    title: "Revisão e ajustes",
    period: "Semana 4",
    description: "Ajustes finais, revisão e preparação para encerramento.",
  },
  {
    status: "concluído",
    title: "Fechamento mensal",
    period: "Final do ciclo",
    description: "Fechamento do ciclo, próximos passos e preparação para renovação.",
  },
];

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isMonthlyAdvisoryOrder(order: UnifiedOrder) {
  const searchable = normalizeText(
    [
      order.product_name,
      order.product_category,
      order.product_type,
    ].join(" ")
  );

  return (
    searchable.includes("assessoria") ||
    searchable.includes("mensal") ||
    searchable.includes("subscription")
  );
}

function orderNeedsBriefing(order: UnifiedOrder) {
  const searchable = normalizeText(
    [
      order.product_name,
      order.product_category,
      order.product_type,
    ].join(" ")
  );

  if (order.product_category === "academy") return false;
  if (order.product_type === "course") return false;
  if (order.product_type === "diagnostic") return false;

  if (searchable.includes("academy")) return false;
  if (searchable.includes("curso")) return false;
  if (searchable.includes("diagnostico")) return false;
  if (searchable.includes("diagnostic")) return false;
  if (searchable.includes("analise de perfil")) return false;

  return true;
}

function getBriefingProjectNotes(order: UnifiedOrder, briefing: ServiceBriefing | null) {
  if (!orderNeedsBriefing(order)) return "";

  if (!briefing) {
    return `

BRIEFING OBRIGATÓRIO:
Este produto precisa de ficha pós-compra.
Status: aguardando o cliente preencher a ficha em /briefing.`;
  }

  return `

BRIEFING RECEBIDO:
Marca: ${briefing.brand_name || "—"}
Instagram: ${briefing.instagram || "—"}
WhatsApp: ${briefing.whatsapp || "—"}
Site/link: ${briefing.website || "—"}
Cidade/atuação: ${briefing.city || "—"}
Objetivo: ${briefing.main_objective || "—"}
Oferta/produtos: ${briefing.offer_description || "—"}
Público-alvo: ${briefing.target_audience || "—"}
Cores desejadas: ${briefing.colors || "—"}
Cores proibidas: ${briefing.avoid_colors || "—"}
Estilo visual: ${briefing.visual_style || "—"}
Referências que gosta: ${briefing.references_like || "—"}
Referências que não gosta: ${briefing.references_dislike || "—"}
Logo: ${briefing.logo_link || "—"}
Materiais: ${briefing.material_links || "—"}
Textos obrigatórios: ${briefing.copy_notes || "—"}
Observações finais: ${briefing.extra_notes || "—"}`;
}

function getProjectStatusIndex(status: string | null | undefined) {
  const normalized = normalizeText(status);

  if (!normalized || normalized === "pendente" || normalized === "aguardando cliente") return 0;
  if (normalized.includes("diagnostico")) return 1;
  if (normalized.includes("planejamento")) return 2;
  if (normalized.includes("lote 1") || normalized.includes("producao lote 1")) return 3;
  if (normalized.includes("lote 2") || normalized.includes("producao lote 2")) return 4;
  if (normalized.includes("revisao")) return 5;
  if (normalized.includes("concluido") || normalized.includes("completed")) return 6;
  if (normalized === "em andamento") return 3;

  return 0;
}

function getAdvisoryCycleDeadlineDate(orderDate: string | null | undefined) {
  const start = orderDate ? new Date(orderDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return end.toISOString().slice(0, 10);
}

function getAdvisoryProjectNotes(order: UnifiedOrder, clientName: string, sourceLabel: string) {
  return `CICLO DE ASSESSORIA MENSAL — 30 DIAS

Status inicial: Briefing inicial / aguardando cliente.
Regra: as entregas são liberadas em ordem cronológica conforme o andamento do mês.

Linha do tempo:
1. Briefing inicial — Dia 1
2. Diagnóstico e direção — Dias 2 a 4
3. Planejamento mensal — Dias 5 a 7
4. Produção — lote 1 — Semana 2
5. Produção — lote 2 — Semana 3
6. Revisão e ajustes — Semana 4
7. Fechamento mensal — Final do ciclo

Projeto criado a partir do pedido #${order.id}.

Origem: ${sourceLabel}
Produto: ${order.product_name || ""}
Categoria: ${order.product_category || ""}
Tipo: ${order.product_type || ""}
Cliente: ${clientName}
Email: ${order.customer_email || ""}
WhatsApp: ${order.customer_phone || ""}
CPF: ${order.customer_document || ""}
Valor: ${order.product_price || ""}
Método: ${order.payment_method || ""}
Provider: ${order.payment_provider || ""}
Payment ID: ${order.payment_id || "—"}
Appmax Order ID: ${order.appmax_order_id || "—"}
Appmax Customer ID: ${order.appmax_customer_id || "—"}
Appmax Payment ID: ${order.appmax_payment_id || "—"}

Observações do pedido:
${order.notes || ""}`;
}


export default function AdminOrders() {
  const [legacyOrders, setLegacyOrders] = useState<LegacyOrder[]>([]);
  const [productOrders, setProductOrders] = useState<SiteProductOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [briefings, setBriefings] = useState<ServiceBriefing[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sourceFilter, setSourceFilter] = useState("todos");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [legacyResponse, productResponse, projectsResponse, briefingsResponse] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("site_product_orders")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("service_briefings")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (legacyResponse.error) {
      console.log("Erro ao carregar pedidos antigos:", legacyResponse.error);
      alert("Erro ao carregar pedidos antigos.");
      return;
    }

    if (productResponse.error) {
      console.log("Erro ao carregar pedidos de produtos:", productResponse.error);
      alert("Erro ao carregar pedidos de produtos. Confere se rodou o SQL de permissão.");
      return;
    }

    if (projectsResponse.error) {
      console.log("Erro ao carregar projetos:", projectsResponse.error);
    }

    if (briefingsResponse.error) {
      console.log("Erro ao carregar briefings:", briefingsResponse.error);
    }

    setLegacyOrders(legacyResponse.data || []);
    setProductOrders(productResponse.data || []);
    setProjects(projectsResponse.data || []);
    setBriefings(briefingsResponse.data || []);
  }

  function formatDateTime(date: string | null | undefined) {
    if (!date) return "—";

    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatMoney(cents: number | null | undefined) {
    return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function extractNumberFromPrice(price: string | null) {
    if (!price) return 0;

    const clean = price
      .replace("R$", "")
      .replace("/mês", "")
      .replace("/mes", "")
      .replace("mês", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();

    const number = Number(clean);

    return Number.isNaN(number) ? 0 : number;
  }

  function getStatusStyle(status: string | null) {
    if (status === "approved") {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    }

    if (status === "pending") {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }

    if (status === "completed") {
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }

    if (status === "cancelled" || status === "canceled") {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    if (
      status === "project_created" ||
      status === "em diagnóstico" ||
      status === "planejamento" ||
      status === "produção lote 1" ||
      status === "produção lote 2" ||
      status === "aguardando cliente" ||
      status === "em revisão"
    ) {
      return "bg-pink-500/20 text-pink-400 border-pink-500/30";
    }

    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }

  function getStatusLabel(status: string | null) {
    if (status === "pending") return "Pendente";
    if (status === "approved") return "Aprovado";
    if (status === "project_created") return "Projeto criado";
    if (status === "completed") return "Concluído";
    if (status === "aguardando cliente") return "Aguardando briefing";
    if (status === "em diagnóstico") return "Em diagnóstico";
    if (status === "planejamento") return "Planejamento";
    if (status === "produção lote 1") return "Produção — lote 1";
    if (status === "produção lote 2") return "Produção — lote 2";
    if (status === "em revisão") return "Em revisão";
    if (status === "concluído") return "Concluído";
    if (status === "cancelled" || status === "canceled") return "Cancelado";

    return status || "sem status";
  }

  function getSourceStyle(source: "legacy" | "product") {
    if (source === "product") {
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }

    return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }

  function getSourceLabel(source: "legacy" | "product") {
    if (source === "product") return "Produto Appmax";

    return "Pedido antigo";
  }

  function getProjectById(projectId: number | null) {
    if (!projectId) return null;

    return projects.find((project) => project.id === projectId) || null;
  }

  function getBriefingByOrderId(orderId: number | null | undefined) {
    if (!orderId) return null;

    return briefings.find((briefing) => briefing.order_id === orderId) || null;
  }

  function getBriefingLabel(order: UnifiedOrder) {
    if (!orderNeedsBriefing(order)) return "Não precisa";

    const briefing = getBriefingByOrderId(order.id);

    return briefing ? "Briefing recebido" : "Aguardando briefing";
  }

  function getBriefingStyle(order: UnifiedOrder) {
    if (!orderNeedsBriefing(order)) {
      return "bg-zinc-800 text-zinc-500 border-zinc-700";
    }

    const briefing = getBriefingByOrderId(order.id);

    if (briefing) {
      return "bg-green-500/10 text-green-300 border-green-500/30";
    }

    return "bg-yellow-500/10 text-yellow-300 border-yellow-500/30";
  }

  function viewBriefing(order: UnifiedOrder) {
    const briefing = getBriefingByOrderId(order.id);

    if (!briefing) {
      alert("Esse cliente ainda não enviou a ficha de briefing.");
      return;
    }

    alert(`BRIEFING DO PEDIDO #${order.id}

Marca: ${briefing.brand_name || "—"}
Instagram: ${briefing.instagram || "—"}
WhatsApp: ${briefing.whatsapp || "—"}
Site/link: ${briefing.website || "—"}
Cidade/atuação: ${briefing.city || "—"}

Objetivo:
${briefing.main_objective || "—"}

Oferta/produtos:
${briefing.offer_description || "—"}

Público-alvo:
${briefing.target_audience || "—"}

Cores desejadas:
${briefing.colors || "—"}

Cores proibidas:
${briefing.avoid_colors || "—"}

Estilo:
${briefing.visual_style || "—"}

Referências que gosta:
${briefing.references_like || "—"}

Referências que não gosta:
${briefing.references_dislike || "—"}

Logo:
${briefing.logo_link || "—"}

Materiais:
${briefing.material_links || "—"}

Textos obrigatórios:
${briefing.copy_notes || "—"}

Observações finais:
${briefing.extra_notes || "—"}`);
  }

  function normalizeOrders(): UnifiedOrder[] {
    const normalizedLegacy: UnifiedOrder[] = legacyOrders.map((order) => ({
      source: "legacy",
      actionKey: `legacy-${order.id}`,

      id: order.id,
      created_at: order.created_at,

      customer_email: order.customer_email,
      customer_name: order.customer_name,
      customer_phone: null,
      customer_document: null,

      product_name: order.product_name,
      product_category: order.product_category,
      product_type: null,

      product_price: order.product_price,
      amount_number: extractNumberFromPrice(order.product_price),

      status: order.status,
      payment_id: order.payment_id,
      payment_method: null,
      payment_provider: "manual",

      appmax_order_id: null,
      appmax_customer_id: null,
      appmax_payment_id: null,

      payment_link: order.payment_link,
      boleto_url: null,
      boleto_digitable_line: null,
      pix_copy_paste: null,

      project_id: order.project_id,
      notes: order.notes,

      legacy: order,
    }));

    const normalizedProducts: UnifiedOrder[] = productOrders.map((order) => ({
      source: "product",
      actionKey: `product-${order.id}`,

      id: order.id,
      created_at: order.created_at,

      customer_email: order.user_email,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_document: order.customer_document,

      product_name: order.product_name,
      product_category: order.product_category,
      product_type: order.product_type,

      product_price: formatMoney(order.amount_cents),
      amount_number: Number(order.amount_cents || 0) / 100,

      status: order.status,
      payment_id: order.payment_id,
      payment_method: order.payment_method,
      payment_provider: order.payment_provider,

      appmax_order_id: order.appmax_order_id,
      appmax_customer_id: order.appmax_customer_id,
      appmax_payment_id: order.appmax_payment_id,

      payment_link: order.boleto_url,
      boleto_url: order.boleto_url,
      boleto_digitable_line: order.boleto_digitable_line,
      pix_copy_paste: order.pix_copy_paste,

      project_id: order.project_id,
      notes: order.notes,

      product: order,
    }));

    return [...normalizedProducts, ...normalizedLegacy].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  function canCreateProject(order: UnifiedOrder) {
    if (order.project_id) return false;
    if (order.status === "completed") return false;
    if (order.status === "cancelled" || order.status === "canceled") return false;

    return order.status === "approved";
  }

  function canCompleteOrder(order: UnifiedOrder) {
    if (order.status === "completed") return false;
    if (order.status === "cancelled" || order.status === "canceled") return false;
    if (order.status === "pending") return false;

    return order.status === "approved" || order.status === "project_created" || !!order.project_id;
  }

  function getCreateProjectButtonText(order: UnifiedOrder) {
    if (order.project_id) return "Projeto criado";

    if (order.status === "completed") {
      return "Pedido concluído";
    }

    if (order.status !== "approved") {
      return "Aguardando aprovação";
    }

    return "Criar projeto";
  }

  function getCompleteButtonText(order: UnifiedOrder) {
    if (order.status === "completed") return "Concluído";

    if (order.status === "pending") return "Aguardando pagamento";

    if (order.status === "cancelled" || order.status === "canceled") {
      return "Pedido cancelado";
    }

    return "Marcar concluído";
  }

  async function updateOrderStatus(order: UnifiedOrder, status: string) {
    const statusLabel = getStatusLabel(status);

    const confirmUpdate = confirm(
      `Alterar pedido #${order.id} para status "${statusLabel}"?`
    );

    if (!confirmUpdate) return;

    setActionLoading(order.actionKey);

    if (briefing) {
      await supabase
        .from("service_briefings")
        .update({ project_id: createdProject.id, updated_at: new Date().toISOString() })
        .eq("id", briefing.id);
    }

    const response =
      order.source === "legacy"
        ? await supabase
            .from("orders")
            .update({
              status,
            })
            .eq("id", order.id)
        : await supabase
            .from("site_product_orders")
            .update({
              status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

    setActionLoading(null);

    if (response.error) {
      console.log("Erro ao atualizar pedido:", response.error);
      alert("Erro ao atualizar pedido.");
      return;
    }

    alert("Pedido atualizado!");
    loadData();
  }

  async function savePaymentId(order: UnifiedOrder) {
    const paymentId = prompt(
      order.source === "product"
        ? "Cole o ID do pagamento/Appmax:"
        : "Cole o ID do pagamento:",
      order.payment_id || order.appmax_payment_id || ""
    );

    if (paymentId === null) return;

    setActionLoading(order.actionKey);

    const cleanPaymentId = paymentId.trim();

    const response =
      order.source === "legacy"
        ? await supabase
            .from("orders")
            .update({
              payment_id: cleanPaymentId,
            })
            .eq("id", order.id)
        : await supabase
            .from("site_product_orders")
            .update({
              payment_id: cleanPaymentId,
              appmax_payment_id: cleanPaymentId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

    setActionLoading(null);

    if (response.error) {
      console.log("Erro ao salvar payment_id:", response.error);
      alert("Erro ao salvar ID do pagamento.");
      return;
    }

    alert("ID do pagamento salvo!");
    loadData();
  }

  async function createProjectFromOrder(order: UnifiedOrder) {
    if (!order.product_name) {
      alert("Esse pedido não tem produto.");
      return;
    }

    if (order.project_id) {
      alert("Esse pedido já tem um projeto vinculado.");
      return;
    }

    if (order.status !== "approved") {
      alert(
        "Esse pedido ainda não está aprovado. Só é possível criar projeto depois que o pagamento estiver aprovado."
      );
      return;
    }

    const clientName =
      order.customer_name ||
      order.customer_email ||
      `Cliente pedido #${order.id}`;

    const confirmCreate = confirm(
      `Criar projeto para o pedido #${order.id}?\n\nProduto: ${
        order.product_name
      }\nCliente: ${clientName}\nEmail: ${
        order.customer_email || "sem email"
      }\n\nConfirme apenas se o pagamento realmente foi aprovado.`
    );

    if (!confirmCreate) return;

    setActionLoading(order.actionKey);

    const isAdvisoryOrder = isMonthlyAdvisoryOrder(order);
    const needsBriefing = orderNeedsBriefing(order);
    const briefing = getBriefingByOrderId(order.id);
    const sourceLabel = getSourceLabel(order.source);
    const projectInitialStatus = needsBriefing
      ? briefing
        ? "em diagnóstico"
        : "aguardando cliente"
      : "pendente";
    const projectDeadline = isAdvisoryOrder
      ? getAdvisoryCycleDeadlineDate(order.created_at)
      : null;
    const projectNotes = isAdvisoryOrder
      ? `${getAdvisoryProjectNotes(order, clientName, sourceLabel)}${getBriefingProjectNotes(order, briefing)}`
      : `Projeto criado a partir do pedido #${order.id}.

Origem: ${sourceLabel}
Produto: ${order.product_name || ""}
Categoria: ${order.product_category || ""}
Tipo: ${order.product_type || ""}
Cliente: ${clientName}
Email: ${order.customer_email || ""}
WhatsApp: ${order.customer_phone || ""}
CPF: ${order.customer_document || ""}
Valor: ${order.product_price || ""}
Método: ${order.payment_method || ""}
Provider: ${order.payment_provider || ""}
Payment ID: ${order.payment_id || "—"}
Appmax Order ID: ${order.appmax_order_id || "—"}
Appmax Customer ID: ${order.appmax_customer_id || "—"}
Appmax Payment ID: ${order.appmax_payment_id || "—"}

Observações do pedido:
${order.notes || ""}${getBriefingProjectNotes(order, briefing)}`;

    const { data: createdProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: `${order.product_name} - ${clientName}`,
        client_name: clientName,
        client_email: order.customer_email || "",
        service_type: order.product_category || order.product_name,
        status: projectInitialStatus,
        deadline: projectDeadline,
        amount: order.amount_number,
        delivery_link: "",
        notes: projectNotes,
      })
      .select("*")
      .single();

    if (projectError || !createdProject) {
      setActionLoading(null);
      console.log("Erro ao criar projeto:", projectError);
      alert("Erro ao criar projeto.");
      return;
    }

    const response =
      order.source === "legacy"
        ? await supabase
            .from("orders")
            .update({
              project_id: createdProject.id,
              status: "project_created",
            })
            .eq("id", order.id)
        : await supabase
            .from("site_product_orders")
            .update({
              project_id: createdProject.id,
              status: "project_created",
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

    setActionLoading(null);

    if (response.error) {
      console.log("Erro ao vincular projeto:", response.error);
      alert(
        "Projeto criado, mas deu erro ao vincular no pedido. Confira em Projetos."
      );
      loadData();
      return;
    }

    alert("Projeto criado e vinculado ao pedido!");
    loadData();
  }



  async function updateProjectStatus(project: Project | null, status: string) {
    if (!project?.id) {
      alert("Esse pedido ainda não tem projeto vinculado.");
      return;
    }

    const step = ADVISORY_STEPS.find((item) => item.status === status);
    const confirmUpdate = confirm(
      `Atualizar ciclo mensal para "${step?.title || status}"?`
    );

    if (!confirmUpdate) return;

    setActionLoading(`project-${project.id}`);

    const { error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", project.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao atualizar etapa da assessoria:", error);
      alert("Erro ao atualizar etapa da assessoria.");
      return;
    }

    alert("Etapa da assessoria atualizada!");
    loadData();
  }

  async function advanceAdvisoryCycle(project: Project | null) {
    if (!project?.id) {
      alert("Crie o projeto antes de avançar as etapas da assessoria.");
      return;
    }

    const currentIndex = getProjectStatusIndex(project.status);
    const nextIndex = Math.min(currentIndex + 1, ADVISORY_STEPS.length - 1);
    const nextStep = ADVISORY_STEPS[nextIndex];

    await updateProjectStatus(project, nextStep.status);
  }

  async function chooseAdvisoryStep(project: Project | null) {
    if (!project?.id) {
      alert("Crie o projeto antes de escolher a etapa.");
      return;
    }

    const options = ADVISORY_STEPS.map(
      (step, index) => `${index + 1}. ${step.title}`
    ).join("\n");

    const answer = prompt(
      `Escolha a etapa do ciclo mensal:\n\n${options}\n\nDigite o número da etapa:`,
      String(getProjectStatusIndex(project.status) + 1)
    );

    if (answer === null) return;

    const index = Number(answer) - 1;
    const step = ADVISORY_STEPS[index];

    if (!step) {
      alert("Etapa inválida.");
      return;
    }

    await updateProjectStatus(project, step.status);
  }

  async function editNotes(order: UnifiedOrder) {
    const notes = prompt("Observações do pedido:", order.notes || "");

    if (notes === null) return;

    setActionLoading(order.actionKey);

    const response =
      order.source === "legacy"
        ? await supabase
            .from("orders")
            .update({
              notes,
            })
            .eq("id", order.id)
        : await supabase
            .from("site_product_orders")
            .update({
              notes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

    setActionLoading(null);

    if (response.error) {
      console.log("Erro ao salvar observações:", response.error);
      alert("Erro ao salvar observações.");
      return;
    }

    alert("Observações salvas!");
    loadData();
  }

  async function deleteOrder(order: UnifiedOrder) {
    const confirmDelete = confirm(
      `Apagar pedido #${order.id}?\n\n${order.product_name || ""}\n${
        order.customer_email || ""
      }`
    );

    if (!confirmDelete) return;

    setActionLoading(order.actionKey);

    const response =
      order.source === "legacy"
        ? await supabase.from("orders").delete().eq("id", order.id)
        : await supabase.from("site_product_orders").delete().eq("id", order.id);

    setActionLoading(null);

    if (response.error) {
      console.log("Erro ao apagar pedido:", response.error);
      alert("Erro ao apagar pedido.");
      return;
    }

    alert("Pedido apagado.");
    loadData();
  }

  async function copyText(value: string | null, label: string) {
    if (!value) {
      alert(`Esse pedido não tem ${label}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copiado!`);
    } catch {
      alert(`Não consegui copiar ${label}. Copie manualmente.`);
    }
  }

  function openPaymentLink(order: UnifiedOrder) {
    if (order.boleto_url) {
      window.open(order.boleto_url, "_blank");
      return;
    }

    if (order.payment_link) {
      window.open(order.payment_link, "_blank");
      return;
    }

    if (order.pix_copy_paste) {
      copyText(order.pix_copy_paste, "Pix copia e cola");
      return;
    }

    alert("Esse pedido não tem link de pagamento disponível.");
  }

  function openProject(projectId: number | null) {
    if (!projectId) {
      alert("Esse pedido ainda não tem projeto vinculado.");
      return;
    }

    window.location.href = "/projetos";
  }

  const unifiedOrders = useMemo(() => {
    return normalizeOrders();
  }, [legacyOrders, productOrders]);

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    return unifiedOrders.filter((order) => {
      const matchesSearch =
        !value ||
        order.customer_email?.toLowerCase().includes(value) ||
        order.customer_name?.toLowerCase().includes(value) ||
        order.customer_phone?.toLowerCase().includes(value) ||
        order.customer_document?.toLowerCase().includes(value) ||
        order.product_name?.toLowerCase().includes(value) ||
        order.product_category?.toLowerCase().includes(value) ||
        order.product_type?.toLowerCase().includes(value) ||
        order.product_price?.toLowerCase().includes(value) ||
        order.status?.toLowerCase().includes(value) ||
        order.payment_id?.toLowerCase().includes(value) ||
        order.payment_method?.toLowerCase().includes(value) ||
        order.appmax_order_id?.toLowerCase().includes(value) ||
        order.appmax_customer_id?.toLowerCase().includes(value) ||
        order.appmax_payment_id?.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "todos" || order.status === statusFilter;

      const matchesSource =
        sourceFilter === "todos" || order.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [unifiedOrders, search, statusFilter, sourceFilter]);

  const totalOrders = unifiedOrders.length;

  const totalProductOrders = unifiedOrders.filter(
    (order) => order.source === "product"
  ).length;

  const totalPending = unifiedOrders.filter(
    (order) => order.status === "pending"
  ).length;

  const totalApproved = unifiedOrders.filter(
    (order) => order.status === "approved"
  ).length;

  const totalWithProject = unifiedOrders.filter(
    (order) => !!order.project_id || order.status === "project_created"
  ).length;

  const totalCompleted = unifiedOrders.filter(
    (order) => order.status === "completed"
  ).length;

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Pedidos</h1>
        <p className="text-zinc-400">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Admin
        </p>

        <h1 className="text-4xl font-black mb-2">Pedidos</h1>

        <p className="text-zinc-400 max-w-3xl">
          Controle pedidos antigos, compras novas via Appmax, Pix, boleto,
          pagamentos aprovados, projetos criados e pedidos concluídos.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pedidos</p>
          <h2 className="text-4xl font-black">{totalOrders}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Produtos Appmax</p>
          <h2 className="text-4xl font-black text-blue-400">
            {totalProductOrders}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pendentes</p>
          <h2 className="text-4xl font-black text-yellow-400">
            {totalPending}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Aprovados</p>
          <h2 className="text-4xl font-black text-green-400">
            {totalApproved}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Com projeto</p>
          <h2 className="text-4xl font-black text-pink-500">
            {totalWithProject}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Concluídos</p>
          <h2 className="text-4xl font-black text-blue-300">
            {totalCompleted}
          </h2>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <div className="grid md:grid-cols-[1fr_200px_200px_160px] gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, email, produto, Appmax Order ID..."
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          >
            <option value="todos">Todos status</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="project_created">Com projeto</option>
            <option value="completed">Concluídos</option>
            <option value="cancelled">Cancelados</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          >
            <option value="todos">Todas origens</option>
            <option value="product">Produtos Appmax</option>
            <option value="legacy">Pedidos antigos</option>
          </select>

          <button
            onClick={loadData}
            className="bg-pink-500 hover:bg-pink-600 rounded-2xl p-4 font-black"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="space-y-5">
        {filteredOrders.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10">
            <h2 className="text-2xl font-black mb-2">
              Nenhum pedido encontrado.
            </h2>

            <p className="text-zinc-400">
              Quando alguém comprar por Pix, boleto ou checkout antigo, o pedido
              vai aparecer aqui.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const project = getProjectById(order.project_id);
            const isActionLoading = actionLoading === order.actionKey || actionLoading === `project-${project?.id}`;
            const projectAllowed = canCreateProject(order);
            const completeAllowed = canCompleteOrder(order);
            const isAdvisoryOrder = isMonthlyAdvisoryOrder(order);
            const needsBriefing = orderNeedsBriefing(order);
            const briefing = getBriefingByOrderId(order.id);
            const advisoryStepIndex = getProjectStatusIndex(project?.status);

            return (
              <div
                key={order.actionKey}
                className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6"
              >
                <div className="flex flex-col xl:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      <span
                        className={`border px-4 py-2 rounded-xl font-black text-sm ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>

                      <span
                        className={`border px-4 py-2 rounded-xl font-black text-sm ${getSourceStyle(
                          order.source
                        )}`}
                      >
                        {getSourceLabel(order.source)}
                      </span>

                      {isAdvisoryOrder && (
                        <span className="border border-pink-500/30 bg-pink-500/10 text-pink-300 px-4 py-2 rounded-xl font-black text-sm">
                          Assessoria mensal
                        </span>
                      )}

                      {needsBriefing && (
                        <span
                          className={`border px-4 py-2 rounded-xl font-black text-sm ${getBriefingStyle(order)}`}
                        >
                          {getBriefingLabel(order)}
                        </span>
                      )}

                      <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                        Pedido #{order.id}
                      </span>

                      {order.appmax_order_id && (
                        <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                          Appmax #{order.appmax_order_id}
                        </span>
                      )}

                      <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                        {formatDateTime(order.created_at)}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black mb-2">
                      {order.product_name || "Produto sem nome"}
                    </h2>

                    <p className="text-zinc-400 mb-5">
                      Cliente:{" "}
                      <span className="text-white font-bold">
                        {order.customer_name ||
                          order.customer_email ||
                          "Cliente não identificado"}
                      </span>
                    </p>

                    {order.status === "pending" && !order.project_id && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-5">
                        <p className="text-yellow-400 font-bold">
                          Esse pedido ainda não está aprovado. Não crie projeto
                          antes da confirmação do pagamento.
                        </p>
                      </div>
                    )}

                    {order.status === "completed" && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-5">
                        <p className="text-blue-300 font-bold">
                          Pedido marcado como concluído. Use esse status quando
                          a entrega já foi finalizada.
                        </p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Email</p>
                        <p className="font-bold break-all">
                          {order.customer_email || "—"}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">WhatsApp</p>
                        <p className="font-bold">
                          {order.customer_phone || "—"}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Categoria</p>
                        <p className="font-bold">
                          {order.product_category || "—"}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Valor</p>
                        <p className="font-bold">
                          {order.product_price || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Método</p>
                        <p className="font-bold uppercase">
                          {order.payment_method || "—"}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Provider</p>
                        <p className="font-bold">
                          {order.payment_provider || "—"}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">
                          Payment ID
                        </p>
                        <p className="font-bold break-all">
                          {order.payment_id || "—"}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">
                          Appmax Order
                        </p>
                        <p className="font-bold break-all">
                          {order.appmax_order_id || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">
                          Projeto vinculado
                        </p>

                        {project ? (
                          <button
                            onClick={() => openProject(project.id)}
                            className="font-bold text-pink-400 hover:text-pink-300 text-left"
                          >
                            #{project.id} — {project.title}
                          </button>
                        ) : (
                          <p className="font-bold text-zinc-400">
                            Nenhum projeto criado
                          </p>
                        )}
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">
                          Observações
                        </p>

                        <p className="font-bold text-zinc-300 whitespace-pre-wrap">
                          {order.notes || "—"}
                        </p>
                      </div>
                    </div>

                    {needsBriefing && (
                      <div className={`mt-5 rounded-[28px] border p-5 ${briefing ? "border-green-500/25 bg-green-500/10" : "border-yellow-500/25 bg-yellow-500/10"}`}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className={`text-xs font-black uppercase tracking-[0.25em] ${briefing ? "text-green-300" : "text-yellow-300"}`}>
                              Ficha de briefing
                            </p>
                            <h3 className="mt-2 text-xl font-black">
                              {briefing ? "Briefing recebido do cliente" : "Aguardando o cliente preencher"}
                            </h3>
                            <p className="mt-2 text-sm text-zinc-300">
                              {briefing
                                ? `Recebido em ${formatDateTime(briefing.created_at)}. Use as respostas para produzir a entrega.`
                                : "Esse produto precisa de briefing antes da produção começar."}
                            </p>
                          </div>

                          <button
                            onClick={() => viewBriefing(order)}
                            disabled={!briefing}
                            className={`rounded-2xl px-5 py-4 font-black transition disabled:cursor-not-allowed ${briefing ? "bg-green-500 text-black hover:bg-green-600" : "bg-zinc-800 text-zinc-500"}`}
                          >
                            Ver respostas
                          </button>
                        </div>
                      </div>
                    )}

                    {isAdvisoryOrder && (
                      <div className="mt-5 rounded-[28px] border border-pink-500/20 bg-black/35 p-5">
                        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-300">
                              Esteira da Assessoria Mensal
                            </p>
                            <h3 className="mt-2 text-2xl font-black">
                              Controle cronológico do ciclo
                            </h3>
                            <p className="mt-2 text-sm text-zinc-400">
                              O cliente vê essa linha do tempo em Minhas Entregas. Avance uma etapa por vez para não liberar tudo de uma vez.
                            </p>
                          </div>

                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-300">
                            Etapa {project ? advisoryStepIndex + 1 : 0}/{ADVISORY_STEPS.length}
                          </span>
                        </div>

                        {!project ? (
                          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm font-bold text-yellow-300">
                            Crie o projeto para iniciar a esteira mensal. Depois disso, o status inicial será Briefing inicial.
                          </div>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {ADVISORY_STEPS.map((step, index) => {
                              const isCompleted = advisoryStepIndex > index;
                              const isCurrent = advisoryStepIndex === index;

                              return (
                                <div
                                  key={step.status}
                                  className={`rounded-2xl border p-4 ${
                                    isCompleted
                                      ? "border-green-500/25 bg-green-500/10"
                                      : isCurrent
                                      ? "border-pink-500/35 bg-pink-500/10"
                                      : "border-white/10 bg-zinc-950/60 opacity-70"
                                  }`}
                                >
                                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                                    {step.period}
                                  </p>
                                  <h4 className="mt-2 font-black text-white">
                                    {index + 1}. {step.title}
                                  </h4>
                                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                                    {step.description}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  <div className="w-full xl:w-[260px] flex flex-col gap-3">
                    <button
                      onClick={() => openPaymentLink(order)}
                      disabled={isActionLoading}
                      className="bg-white text-black hover:bg-zinc-200 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      {order.boleto_url
                        ? "Abrir boleto"
                        : order.pix_copy_paste
                        ? "Copiar Pix"
                        : "Abrir pagamento"}
                    </button>

                    {order.pix_copy_paste && (
                      <button
                        onClick={() =>
                          copyText(order.pix_copy_paste, "Pix copia e cola")
                        }
                        disabled={isActionLoading}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                      >
                        Copiar Pix
                      </button>
                    )}

                    {order.boleto_digitable_line && (
                      <button
                        onClick={() =>
                          copyText(
                            order.boleto_digitable_line,
                            "linha digitável"
                          )
                        }
                        disabled={isActionLoading}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                      >
                        Copiar boleto
                      </button>
                    )}

                    <button
                      onClick={() => updateOrderStatus(order, "approved")}
                      disabled={isActionLoading || order.status === "approved"}
                      className="bg-green-500 hover:bg-green-600 text-black px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Marcar aprovado
                    </button>

                    <button
                      onClick={() => createProjectFromOrder(order)}
                      disabled={isActionLoading || !projectAllowed}
                      className={`px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400 ${
                        projectAllowed
                          ? "bg-pink-500 hover:bg-pink-600"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      {getCreateProjectButtonText(order)}
                    </button>

                    {needsBriefing && (
                      <button
                        onClick={() => viewBriefing(order)}
                        disabled={isActionLoading || !briefing}
                        className={`px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400 ${
                          briefing
                            ? "bg-green-500 hover:bg-green-600 text-black"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        {briefing ? "Ver briefing" : "Sem briefing"}
                      </button>
                    )}

                    {isAdvisoryOrder && project && (
                      <button
                        onClick={() => advanceAdvisoryCycle(project)}
                        disabled={isActionLoading}
                        className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                      >
                        Avançar etapa
                      </button>
                    )}

                    {isAdvisoryOrder && project && (
                      <button
                        onClick={() => chooseAdvisoryStep(project)}
                        disabled={isActionLoading}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                      >
                        Escolher etapa
                      </button>
                    )}

                    <button
                      onClick={() => updateOrderStatus(order, "completed")}
                      disabled={isActionLoading || !completeAllowed}
                      className={`px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400 ${
                        completeAllowed
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      {getCompleteButtonText(order)}
                    </button>

                    <button
                      onClick={() => savePaymentId(order)}
                      disabled={isActionLoading}
                      className="bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Salvar Payment ID
                    </button>

                    <button
                      onClick={() => editNotes(order)}
                      disabled={isActionLoading}
                      className="bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Observações
                    </button>

                    <button
                      onClick={() => updateOrderStatus(order, "cancelled")}
                      disabled={isActionLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-black px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={() => deleteOrder(order)}
                      disabled={isActionLoading}
                      className="bg-red-600 hover:bg-red-700 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}