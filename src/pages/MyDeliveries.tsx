import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

  boleto_url: string | null;
  boleto_digitable_line: string | null;
  pix_copy_paste: string | null;

  project_id: number | null;
  notes: string | null;
};

export default function MyDeliveries() {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<SiteProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadDeliveries();
  }, []);

  async function loadDeliveries() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.log("Erro ao buscar usuário:", userError);
      setLoading(false);
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);

    const email = user.email || "";

    const [projectsResponse, ordersResponse] = await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("client_email", email)
        .order("created_at", { ascending: false }),

      supabase
        .from("site_product_orders")
        .select("*")
        .eq("user_email", email)
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (projectsResponse.error) {
      console.log("Erro ao carregar entregas:", projectsResponse.error);
      alert("Erro ao carregar suas entregas.");
      return;
    }

    if (ordersResponse.error) {
      console.log("Erro ao carregar pedidos:", ordersResponse.error);
      alert("Erro ao carregar seus pedidos.");
      return;
    }

    setProjects(projectsResponse.data || []);
    setOrders(ordersResponse.data || []);
  }

  function formatMoney(cents: number | null | undefined) {
    return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return "Sem prazo";

    return new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  function getStatusLabel(status: string | null) {
    if (status === "pending") return "Aguardando pagamento";
    if (status === "approved") return "Pagamento aprovado";
    if (status === "project_created") return "Projeto criado";
    if (status === "completed") return "Concluído";
    if (status === "cancelled" || status === "canceled") return "Cancelado";
    if (status === "pendente") return "Pendente";
    if (status === "em andamento") return "Em andamento";
    if (status === "em revisão") return "Em revisão";
    if (status === "aguardando cliente") return "Aguardando cliente";
    if (status === "concluído") return "Concluído";
    if (status === "atrasado") return "Atrasado";
    if (status === "cancelado") return "Cancelado";

    return status || "sem status";
  }

  function getStatusStyle(status: string | null) {
    if (status === "approved" || status === "concluído") {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    }

    if (status === "project_created" || status === "em andamento") {
      return "bg-pink-500/20 text-pink-400 border-pink-500/30";
    }

    if (status === "completed") {
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }

    if (status === "em revisão") {
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }

    if (status === "aguardando cliente") {
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    }

    if (status === "pending" || status === "pendente") {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }

    if (
      status === "cancelled" ||
      status === "canceled" ||
      status === "cancelado" ||
      status === "atrasado"
    ) {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }

  function getPaymentMethodLabel(method: string | null) {
    if (method === "pix") return "Pix";
    if (method === "boleto") return "Boleto";
    if (method === "card") return "Cartão";

    return method || "—";
  }

  function getProjectById(projectId: number | null) {
    if (!projectId) return null;

    return projects.find((project) => project.id === projectId) || null;
  }

  function getDeliveryLabel(project: Project | null) {
    if (!project) return "Entrega ainda não criada";

    if (project.delivery_link) return "Entrega disponível";

    if (project.status === "concluído") return "Aguardando link";

    return "Em produção";
  }

  function getDeliveryStyle(project: Project | null) {
    if (!project) return "bg-zinc-800 text-zinc-400";

    if (project.delivery_link) return "bg-green-500/20 text-green-400";

    if (project.status === "concluído") {
      return "bg-yellow-500/20 text-yellow-400";
    }

    return "bg-zinc-800 text-zinc-400";
  }

  function openDelivery(link: string | null | undefined) {
    if (!link) {
      alert("A entrega ainda não foi disponibilizada.");
      return;
    }

    window.open(link, "_blank");
  }

  async function copyText(value: string | null | undefined, label: string) {
    if (!value) {
      alert(`${label} ainda não está disponível.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copiado!`);
    } catch {
      prompt(`Copie ${label}:`, value);
    }
  }

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return orders;

    return orders.filter((order) => {
      const project = getProjectById(order.project_id);

      return (
        order.product_name?.toLowerCase().includes(value) ||
        order.product_category?.toLowerCase().includes(value) ||
        order.product_type?.toLowerCase().includes(value) ||
        order.status?.toLowerCase().includes(value) ||
        order.payment_method?.toLowerCase().includes(value) ||
        order.appmax_order_id?.toLowerCase().includes(value) ||
        project?.title?.toLowerCase().includes(value) ||
        project?.status?.toLowerCase().includes(value)
      );
    });
  }, [orders, projects, search]);

  const filteredProjects = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return projects;

    return projects.filter((project) => {
      return (
        project.title?.toLowerCase().includes(value) ||
        project.service_type?.toLowerCase().includes(value) ||
        project.status?.toLowerCase().includes(value) ||
        project.notes?.toLowerCase().includes(value)
      );
    });
  }, [projects, search]);

  const totalOrders = orders.length;

  const totalPaid = orders.filter(
    (order) =>
      order.status === "approved" ||
      order.status === "project_created" ||
      order.status === "completed"
  ).length;

  const totalPendingPayment = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const totalProjects = projects.length;

  const totalDelivered = projects.filter(
    (project) => !!project.delivery_link
  ).length;

  const totalInProduction = projects.filter(
    (project) =>
      project.status === "pendente" ||
      project.status === "em andamento" ||
      project.status === "em revisão" ||
      project.status === "aguardando cliente" ||
      !project.delivery_link
  ).length;

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Minhas Entregas</h1>
        <p className="text-zinc-400">Carregando suas compras e entregas...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Cliente
        </p>

        <h1 className="text-4xl font-black mb-2">Minhas Entregas</h1>

        <p className="text-zinc-400 max-w-3xl">
          Acompanhe suas compras, status de pagamento, produção dos projetos e
          links finais entregues pela FatorZ.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Compras</p>
          <h2 className="text-4xl font-black">{totalOrders}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pagas</p>
          <h2 className="text-4xl font-black text-green-400">{totalPaid}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pendentes</p>
          <h2 className="text-4xl font-black text-yellow-400">
            {totalPendingPayment}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Projetos</p>
          <h2 className="text-4xl font-black text-pink-500">
            {totalProjects}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Entregas</p>
          <h2 className="text-4xl font-black text-blue-400">
            {totalDelivered}
          </h2>
          <p className="text-zinc-500 mt-2 text-sm">
            Em produção: {totalInProduction}
          </p>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <div className="grid md:grid-cols-[1fr_160px] gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por compra, projeto, serviço ou status..."
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          />

          <button
            onClick={loadDeliveries}
            className="bg-pink-500 hover:bg-pink-600 rounded-2xl p-4 font-black"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-5">
          <h2 className="text-2xl font-black">Minhas compras</h2>
          <p className="text-zinc-500">
            Aqui aparecem os pedidos feitos com o email da sua conta.
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-10">
            <h2 className="text-2xl font-black mb-3">
              Nenhuma compra encontrada.
            </h2>

            <p className="text-zinc-400 mb-6">
              Quando você comprar um produto da FatorZ usando este email, o
              pedido vai aparecer aqui.
            </p>

            <div className="bg-black border border-zinc-800 rounded-3xl p-6">
              <p className="text-zinc-500 text-sm mb-1">Email da sua conta</p>

              <p className="text-white font-bold break-all">
                {user?.email || "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const project = getProjectById(order.project_id);

              return (
                <div
                  key={order.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6"
                >
                  <div className="flex flex-col xl:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-3 mb-5">
                        <span
                          className={`border px-4 py-2 rounded-xl font-black text-sm ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>

                        <span
                          className={`px-4 py-2 rounded-xl font-black text-sm ${getDeliveryStyle(
                            project
                          )}`}
                        >
                          {getDeliveryLabel(project)}
                        </span>

                        <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                          Pedido #{order.id}
                        </span>

                        {order.appmax_order_id && (
                          <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                            Appmax #{order.appmax_order_id}
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-black mb-2">
                        {order.product_name || "Produto FatorZ"}
                      </h2>

                      <p className="text-zinc-400 mb-5">
                        Comprado em:{" "}
                        <span className="text-white font-bold">
                          {formatDateTime(order.created_at)}
                        </span>
                      </p>

                      <div className="grid md:grid-cols-4 gap-4 mb-5">
                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">Valor</p>
                          <p className="font-bold">
                            {formatMoney(order.amount_cents)}
                          </p>
                        </div>

                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">
                            Pagamento
                          </p>
                          <p className="font-bold">
                            {getPaymentMethodLabel(order.payment_method)}
                          </p>
                        </div>

                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">Projeto</p>
                          <p className="font-bold">
                            {project ? `#${project.id}` : "Ainda não criado"}
                          </p>
                        </div>

                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">Entrega</p>

                          {project?.delivery_link ? (
                            <button
                              onClick={() => openDelivery(project.delivery_link)}
                              className="font-black text-green-400 hover:text-green-300"
                            >
                              Abrir material
                            </button>
                          ) : (
                            <p className="font-bold text-zinc-400">
                              Ainda não disponível
                            </p>
                          )}
                        </div>
                      </div>

                      {project && (
                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">
                            Projeto vinculado
                          </p>

                          <p className="font-bold text-zinc-300">
                            {project.title || "Projeto FatorZ"} —{" "}
                            {getStatusLabel(project.status)}
                          </p>

                          {project.deadline && (
                            <p className="text-zinc-500 text-sm mt-2">
                              Prazo: {formatDate(project.deadline)}
                            </p>
                          )}
                        </div>
                      )}

                      {order.status === "pending" && (
                        <div className="mt-5 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                          <p className="text-yellow-300 font-bold">
                            Seu pagamento ainda está aguardando confirmação.
                            Assim que for aprovado, a FatorZ inicia a próxima
                            etapa.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="w-full xl:w-[240px] flex xl:flex-col gap-3">
                      <button
                        onClick={() => openDelivery(project?.delivery_link)}
                        disabled={!project?.delivery_link}
                        className={`flex-1 px-5 py-4 rounded-2xl font-black transition ${
                          project?.delivery_link
                            ? "bg-green-500 hover:bg-green-600 text-black"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        Abrir entrega
                      </button>

                      {order.payment_method === "pix" && order.pix_copy_paste && (
                        <button
                          onClick={() =>
                            copyText(order.pix_copy_paste, "Pix copia e cola")
                          }
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black transition"
                        >
                          Copiar Pix
                        </button>
                      )}

                      {order.payment_method === "boleto" &&
                        order.boleto_digitable_line && (
                          <button
                            onClick={() =>
                              copyText(
                                order.boleto_digitable_line,
                                "linha digitável"
                              )
                            }
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black transition"
                          >
                            Copiar boleto
                          </button>
                        )}

                      {order.payment_method === "boleto" && order.boleto_url && (
                        <button
                          onClick={() => window.open(order.boleto_url || "", "_blank")}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black transition"
                        >
                          Abrir boleto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-black">Projetos e entregas</h2>
          <p className="text-zinc-500">
            Aqui aparecem os projetos criados pela equipe FatorZ.
          </p>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-10">
            <h2 className="text-2xl font-black mb-3">
              Nenhuma entrega encontrada.
            </h2>

            <p className="text-zinc-400">
              Quando a equipe criar um projeto vinculado ao seu email, ele vai
              aparecer aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6"
              >
                <div className="flex flex-col xl:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-3 mb-5">
                      <span
                        className={`border px-4 py-2 rounded-xl font-black text-sm ${getStatusStyle(
                          project.status
                        )}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>

                      <span
                        className={`px-4 py-2 rounded-xl font-black text-sm ${getDeliveryStyle(
                          project
                        )}`}
                      >
                        {getDeliveryLabel(project)}
                      </span>

                      <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                        Projeto #{project.id}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black mb-2">
                      {project.title || "Projeto sem título"}
                    </h2>

                    <p className="text-zinc-400 mb-5">
                      Serviço:{" "}
                      <span className="text-white font-bold">
                        {project.service_type || "Não informado"}
                      </span>
                    </p>

                    <div className="grid md:grid-cols-3 gap-4 mb-5">
                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Prazo</p>

                        <p className="font-bold">{formatDate(project.deadline)}</p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Criado em</p>

                        <p className="font-bold">
                          {formatDateTime(project.created_at)}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Entrega</p>

                        {project.delivery_link ? (
                          <button
                            onClick={() => openDelivery(project.delivery_link)}
                            className="font-black text-green-400 hover:text-green-300"
                          >
                            Abrir material
                          </button>
                        ) : (
                          <p className="font-bold text-zinc-400">
                            Ainda não disponível
                          </p>
                        )}
                      </div>
                    </div>

                    {project.notes && (
                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">
                          Observações
                        </p>

                        <p className="text-zinc-300 whitespace-pre-wrap">
                          {project.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="w-full xl:w-[240px] flex xl:flex-col gap-3">
                    <button
                      onClick={() => openDelivery(project.delivery_link)}
                      disabled={!project.delivery_link}
                      className={`flex-1 px-5 py-4 rounded-2xl font-black transition ${
                        project.delivery_link
                          ? "bg-green-500 hover:bg-green-600 text-black"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      Abrir entrega
                    </button>

                    <button
                      onClick={() => navigate("/configuracoes")}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black transition"
                    >
                      Minha conta
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}