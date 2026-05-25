import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Order = {
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

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (ordersError) {
      console.log("Erro ao carregar pedidos:", ordersError);
      alert("Erro ao carregar pedidos.");
      return;
    }

    if (projectsError) {
      console.log("Erro ao carregar projetos:", projectsError);
    }

    setOrders(ordersData || []);
    setProjects(projectsData || []);
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

    if (status === "cancelled" || status === "canceled") {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    if (status === "project_created") {
      return "bg-pink-500/20 text-pink-400 border-pink-500/30";
    }

    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }

  function getProjectById(projectId: number | null) {
    if (!projectId) return null;

    return projects.find((project) => project.id === projectId) || null;
  }

  function canCreateProject(order: Order) {
    if (order.project_id) return false;

    return order.status === "approved";
  }

  function getCreateProjectButtonText(order: Order) {
    if (order.project_id) return "Projeto criado";

    if (order.status !== "approved") {
      return "Aguardando aprovação";
    }

    return "Criar projeto";
  }

  async function updateOrderStatus(order: Order, status: string) {
    const confirmUpdate = confirm(
      `Alterar pedido #${order.id} para status "${status}"?`
    );

    if (!confirmUpdate) return;

    setActionLoading(order.id);

    const { error } = await supabase
      .from("orders")
      .update({
        status,
      })
      .eq("id", order.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao atualizar pedido:", error);
      alert("Erro ao atualizar pedido.");
      return;
    }

    alert("Pedido atualizado!");
    loadData();
  }

  async function savePaymentId(order: Order) {
    const paymentId = prompt(
      "Cole o ID do pagamento Mercado Pago:",
      order.payment_id || ""
    );

    if (paymentId === null) return;

    setActionLoading(order.id);

    const { error } = await supabase
      .from("orders")
      .update({
        payment_id: paymentId.trim(),
      })
      .eq("id", order.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao salvar payment_id:", error);
      alert("Erro ao salvar ID do pagamento.");
      return;
    }

    alert("ID do pagamento salvo!");
    loadData();
  }

  async function createProjectFromOrder(order: Order) {
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

    setActionLoading(order.id);

    const { data: createdProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: `${order.product_name} - ${clientName}`,
        client_name: clientName,
        client_email: order.customer_email || "",
        service_type: order.product_category || order.product_name,
        status: "pendente",
        deadline: null,
        amount: extractNumberFromPrice(order.product_price),
        delivery_link: "",
        notes: `Projeto criado a partir do pedido #${order.id}.

Produto: ${order.product_name || ""}
Categoria: ${order.product_category || ""}
Cliente: ${clientName}
Email: ${order.customer_email || ""}
Valor: ${order.product_price || ""}
Payment ID: ${order.payment_id || "—"}

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

    const { error: orderError } = await supabase
      .from("orders")
      .update({
        project_id: createdProject.id,
        status: "project_created",
      })
      .eq("id", order.id);

    setActionLoading(null);

    if (orderError) {
      console.log("Erro ao vincular projeto:", orderError);
      alert(
        "Projeto criado, mas deu erro ao vincular no pedido. Confira em Projetos."
      );
      loadData();
      return;
    }

    alert("Projeto criado e vinculado ao pedido!");
    loadData();
  }

  async function editNotes(order: Order) {
    const notes = prompt("Observações do pedido:", order.notes || "");

    if (notes === null) return;

    setActionLoading(order.id);

    const { error } = await supabase
      .from("orders")
      .update({
        notes,
      })
      .eq("id", order.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao salvar observações:", error);
      alert("Erro ao salvar observações.");
      return;
    }

    alert("Observações salvas!");
    loadData();
  }

  async function deleteOrder(order: Order) {
    const confirmDelete = confirm(
      `Apagar pedido #${order.id}?\n\n${order.product_name || ""}\n${
        order.customer_email || ""
      }`
    );

    if (!confirmDelete) return;

    setActionLoading(order.id);

    const { error } = await supabase.from("orders").delete().eq("id", order.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao apagar pedido:", error);
      alert("Erro ao apagar pedido.");
      return;
    }

    alert("Pedido apagado.");
    loadData();
  }

  function openPaymentLink(order: Order) {
    if (!order.payment_link) {
      alert("Esse pedido não tem link de pagamento.");
      return;
    }

    window.open(order.payment_link, "_blank");
  }

  function openProject(projectId: number | null) {
    if (!projectId) {
      alert("Esse pedido ainda não tem projeto vinculado.");
      return;
    }

    window.location.href = "/projetos";
  }

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !value ||
        order.customer_email?.toLowerCase().includes(value) ||
        order.customer_name?.toLowerCase().includes(value) ||
        order.product_name?.toLowerCase().includes(value) ||
        order.product_category?.toLowerCase().includes(value) ||
        order.product_price?.toLowerCase().includes(value) ||
        order.status?.toLowerCase().includes(value) ||
        order.payment_id?.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "todos" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const totalOrders = orders.length;
  const totalPending = orders.filter(
    (order) => order.status === "pending"
  ).length;
  const totalApproved = orders.filter(
    (order) => order.status === "approved"
  ).length;
  const totalWithProject = orders.filter((order) => !!order.project_id).length;

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
          Controle compras iniciadas, pagamentos, pedidos aprovados e criação de
          projetos. Projetos só podem ser criados após o pedido estar aprovado.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pedidos</p>
          <h2 className="text-4xl font-black">{totalOrders}</h2>
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
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <div className="grid md:grid-cols-[1fr_220px_160px] gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, email, produto, pagamento..."
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          >
            <option value="todos">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="project_created">Com projeto</option>
            <option value="cancelled">Cancelados</option>
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
              Quando alguém clicar em comprar um produto, o pedido vai aparecer
              aqui.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const project = getProjectById(order.project_id);
            const isActionLoading = actionLoading === order.id;
            const projectAllowed = canCreateProject(order);

            return (
              <div
                key={order.id}
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
                        {order.status || "sem status"}
                      </span>

                      <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                        Pedido #{order.id}
                      </span>

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

                    {order.status !== "approved" && !order.project_id && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-5">
                        <p className="text-yellow-400 font-bold">
                          Esse pedido ainda não está aprovado. Não crie projeto
                          antes da confirmação do pagamento.
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

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">
                          Pagamento
                        </p>
                        <p className="font-bold break-all">
                          {order.payment_id || "—"}
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
                      Abrir pagamento
                    </button>

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