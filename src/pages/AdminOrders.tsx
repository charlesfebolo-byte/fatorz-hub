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

export default function AdminOrders() {
  const [legacyOrders, setLegacyOrders] = useState<LegacyOrder[]>([]);
  const [productOrders, setProductOrders] = useState<SiteProductOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

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

    const [legacyResponse, productResponse, projectsResponse] = await Promise.all([
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

    setLegacyOrders(legacyResponse.data || []);
    setProductOrders(productResponse.data || []);
    setProjects(projectsResponse.data || []);
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

    if (status === "project_created") {
      return "bg-pink-500/20 text-pink-400 border-pink-500/30";
    }

    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }

  function getStatusLabel(status: string | null) {
    if (status === "pending") return "Pendente";
    if (status === "approved") return "Aprovado";
    if (status === "project_created") return "Projeto criado";
    if (status === "completed") return "Concluído";
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

    const { data: createdProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: `${order.product_name} - ${clientName}`,
        client_name: clientName,
        client_email: order.customer_email || "",
        service_type: order.product_category || order.product_name,
        status: "pendente",
        deadline: null,
        amount: order.amount_number,
        delivery_link: "",
        notes: `Projeto criado a partir do pedido #${order.id}.

Origem: ${getSourceLabel(order.source)}
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
${order.notes || ""}`,
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
            const isActionLoading = actionLoading === order.actionKey;
            const projectAllowed = canCreateProject(order);
            const completeAllowed = canCompleteOrder(order);

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