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
    description:
      "Envio das informações, referências, materiais, objetivos e prioridades do mês.",
  },
  {
    status: "em diagnóstico",
    title: "Diagnóstico e direção",
    period: "Dias 2 a 4",
    description:
      "Análise da presença digital e definição do foco estratégico do ciclo mensal.",
  },
  {
    status: "planejamento",
    title: "Planejamento mensal",
    period: "Dias 5 a 7",
    description:
      "Organização do calendário, linhas de conteúdo e ordem das entregas do mês.",
  },
  {
    status: "produção lote 1",
    title: "Produção — lote 1",
    period: "Semana 2",
    description:
      "Primeira leva de conteúdos, materiais ou orientações conforme o plano contratado.",
  },
  {
    status: "produção lote 2",
    title: "Produção — lote 2",
    period: "Semana 3",
    description:
      "Segunda leva de materiais e ajustes estratégicos conforme o andamento do mês.",
  },
  {
    status: "em revisão",
    title: "Revisão e ajustes",
    period: "Semana 4",
    description:
      "Ajustes finais, revisão de materiais e preparação para fechamento do ciclo.",
  },
  {
    status: "concluído",
    title: "Fechamento mensal",
    period: "Final do ciclo",
    description:
      "Fechamento da assessoria, próximos passos e preparação para o próximo mês.",
  },
];

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isMonthlyAdvisoryOrder(order: SiteProductOrder, project?: Project | null) {
  const searchable = normalizeText(
    [
      order.product_name,
      order.product_category,
      order.product_type,
      order.product_slug,
      project?.title,
      project?.service_type,
      project?.notes,
    ].join(" ")
  );

  return (
    searchable.includes("assessoria") ||
    searchable.includes("mensal") ||
    searchable.includes("subscription") ||
    searchable.includes("ciclo de assessoria") ||
    searchable.includes("plano basic") ||
    searchable.includes("plano plus") ||
    searchable.includes("plano pro") ||
    searchable.includes("presenca inicial") ||
    searchable.includes("presença inicial")
  );
}

function orderNeedsBriefing(order: SiteProductOrder) {
  const searchable = normalizeText(
    [
      order.product_name,
      order.product_category,
      order.product_type,
      order.product_slug,
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

function getAdvisoryStepIndex(project: Project | null, order: SiteProductOrder) {
  if (order.status === "pending") return -1;
  if (!project) return 0;

  const status = normalizeText(project.status);

  if (!status || status === "pendente" || status === "aguardando cliente") return 0;
  if (status.includes("diagnostico")) return 1;
  if (status.includes("planejamento")) return 2;
  if (status.includes("lote 1") || status.includes("producao lote 1")) return 3;
  if (status.includes("lote 2") || status.includes("producao lote 2")) return 4;
  if (status.includes("revisao")) return 5;
  if (status.includes("concluido") || status.includes("completed")) return 6;
  if (status === "em andamento") return 3;

  return 0;
}

function getAdvisoryCycle(orderDate: string | null | undefined) {
  const start = orderDate ? new Date(orderDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);

  const now = new Date();
  const totalDays = 30;
  const diffMs = end.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.min(totalDays, Math.max(0, totalDays - daysRemaining));
  const progress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  const isExpired = daysRemaining <= 0;

  return {
    start: start.toLocaleDateString("pt-BR"),
    end: end.toLocaleDateString("pt-BR"),
    daysRemaining,
    elapsedDays,
    progress,
    isExpired,
  };
}

function isPaymentPending(order: SiteProductOrder) {
  const status = normalizeText(order.status);

  return status === "pending" || status === "pendente" || status === "processing";
}

function isPaidOrStarted(order: SiteProductOrder) {
  const status = normalizeText(order.status);

  return [
    "approved",
    "aprovado",
    "paid",
    "pago",
    "project_created",
    "completed",
    "concluido",
    "concluído",
  ].includes(status);
}


export default function MyDeliveries() {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<SiteProductOrder[]>([]);
  const [briefings, setBriefings] = useState<ServiceBriefing[]>([]);
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

    const [projectsResponse, ordersResponse, briefingsResponse] = await Promise.all([
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

      supabase
        .from("service_briefings")
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

    if (briefingsResponse.error) {
      console.log("Erro ao carregar briefings:", briefingsResponse.error);
    }

    setProjects(projectsResponse.data || []);
    setOrders(ordersResponse.data || []);
    setBriefings(briefingsResponse.data || []);
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
    if (status === "em diagnóstico") return "Em diagnóstico";
    if (status === "planejamento") return "Planejamento";
    if (status === "produção lote 1") return "Produção — lote 1";
    if (status === "produção lote 2") return "Produção — lote 2";
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

    if (
      status === "project_created" ||
      status === "em andamento" ||
      status === "em diagnóstico" ||
      status === "planejamento" ||
      status === "produção lote 1" ||
      status === "produção lote 2"
    ) {
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

  function getBriefingByOrderId(orderId: number | null | undefined) {
    if (!orderId) return null;

    return briefings.find((briefing) => briefing.order_id === orderId) || null;
  }

  function getBriefingLabel(order: SiteProductOrder) {
    if (!orderNeedsBriefing(order)) return "Não precisa de briefing";

    const briefing = getBriefingByOrderId(order.id);

    return briefing ? "Briefing enviado" : "Aguardando briefing";
  }

  function getBriefingStyle(order: SiteProductOrder) {
    if (!orderNeedsBriefing(order)) {
      return "border-zinc-700 bg-zinc-800 text-zinc-400";
    }

    const briefing = getBriefingByOrderId(order.id);

    if (briefing) {
      return "border-green-500/30 bg-green-500/10 text-green-300";
    }

    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  function openBriefing(orderId: number) {
    navigate(`/briefing?orderId=${orderId}`);
  }

  function renewAdvisory(order: SiteProductOrder) {
    if (!order.product_slug) {
      alert("Não consegui encontrar o link de renovação deste plano. Chame a FatorZ para renovar.");
      return;
    }

    navigate(`/checkout/produto?slug=${order.product_slug}&renovar=1`);
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
              const isAdvisory = isMonthlyAdvisoryOrder(order, project);
              const needsBriefing = orderNeedsBriefing(order);
              const briefing = getBriefingByOrderId(order.id);
              const advisoryStepIndex = getAdvisoryStepIndex(project, order);
              const advisoryCycle = getAdvisoryCycle(order.created_at);

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

                        {isAdvisory && (
                          <span className="border border-pink-500/30 bg-pink-500/10 text-pink-300 px-4 py-2 rounded-xl font-black text-sm">
                            Ciclo mensal
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
                          {isAdvisory && isPaidOrStarted(order) ? (
                            <>
                              <p className="text-zinc-500 text-sm mb-1">
                                Tempo de assessoria
                              </p>
                              <p
                                className={`font-black ${
                                  advisoryCycle.isExpired
                                    ? "text-yellow-300"
                                    : "text-green-400"
                                }`}
                              >
                                {advisoryCycle.isExpired
                                  ? "Ciclo vencido"
                                  : `${advisoryCycle.daysRemaining} dias restantes`}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Até {advisoryCycle.end}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-zinc-500 text-sm mb-1">
                                Pagamento
                              </p>
                              <p className="font-bold">
                                {getPaymentMethodLabel(order.payment_method)}
                              </p>
                            </>
                          )}
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

                      {needsBriefing && (
                        <div className={`mt-5 rounded-2xl border p-5 ${briefing ? "border-green-500/25 bg-green-500/10" : "border-yellow-500/25 bg-yellow-500/10"}`}>
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className={`text-xs font-black uppercase tracking-[0.25em] ${briefing ? "text-green-300" : "text-yellow-300"}`}>
                                Ficha de briefing
                              </p>
                              <h3 className="mt-2 text-xl font-black">
                                {briefing ? "Briefing recebido" : "Preencha a ficha para iniciarmos"}
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                                {briefing
                                  ? "A FatorZ já recebeu suas informações de marca, objetivo, estilo, cores e referências."
                                  : "O prazo da entrega começa após o envio das informações necessárias para produção."}
                              </p>
                            </div>

                            <button
                              onClick={() => openBriefing(order.id)}
                              className={`rounded-2xl px-5 py-4 font-black transition ${briefing ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-yellow-500 text-black hover:bg-yellow-600"}`}
                            >
                              {briefing ? "Ver/editar ficha" : "Preencher ficha"}
                            </button>
                          </div>
                        </div>
                      )}

                      {isAdvisory && (
                        <div id={`assessoria-${order.id}`} className="mt-5 scroll-mt-28 rounded-[28px] border border-pink-500/20 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.14),transparent_34%),rgba(0,0,0,0.32)] p-5">
                          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-300">
                                Assessoria mensal
                              </p>
                              <h3 className="mt-2 text-2xl font-black">
                                Linha do tempo do ciclo
                              </h3>
                              <p className="mt-2 text-sm text-zinc-400">
                                Ciclo atual: {advisoryCycle.start} até {advisoryCycle.end}. As etapas são liberadas em ordem, conforme briefing, aprovação e andamento do mês.
                              </p>
                            </div>

                            <div className="flex flex-col gap-2 md:items-end">
                              <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-300">
                                Etapa {Math.max(advisoryStepIndex + 1, 0)}/{ADVISORY_STEPS.length}
                              </span>

                              {isPaidOrStarted(order) && (
                                <span
                                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest ${
                                    advisoryCycle.isExpired
                                      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                                      : "border-green-500/30 bg-green-500/10 text-green-300"
                                  }`}
                                >
                                  {advisoryCycle.isExpired
                                    ? "Renovação disponível"
                                    : `${advisoryCycle.daysRemaining} dias restantes`}
                                </span>
                              )}
                            </div>
                          </div>

                          {isPaidOrStarted(order) && (
                            <div className="mb-5 rounded-2xl border border-white/10 bg-black/35 p-4">
                              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <p className="text-sm font-bold text-zinc-300">
                                  {advisoryCycle.isExpired
                                    ? "Seu ciclo mensal chegou ao fim. Para continuar a assessoria, renove o plano."
                                    : `Você ainda tem ${advisoryCycle.daysRemaining} dias neste ciclo mensal.`}
                                </p>

                                <button
                                  onClick={() => renewAdvisory(order)}
                                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
                                >
                                  Renovar assessoria
                                </button>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]"
                                  style={{ width: `${advisoryCycle.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            {ADVISORY_STEPS.map((step, index) => {
                              const isCompleted = advisoryStepIndex > index;
                              const isCurrent = advisoryStepIndex === index;
                              const isLocked = advisoryStepIndex < index;

                              return (
                                <div
                                  key={step.status}
                                  className={`rounded-2xl border p-4 transition ${
                                    isCompleted
                                      ? "border-green-500/25 bg-green-500/10"
                                      : isCurrent
                                      ? "border-pink-500/35 bg-pink-500/10 shadow-[0_0_35px_rgba(236,72,153,0.10)]"
                                      : "border-white/10 bg-black/35 opacity-70"
                                  }`}
                                >
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                                            isCompleted
                                              ? "bg-green-500 text-black"
                                              : isCurrent
                                              ? "bg-pink-500 text-white"
                                              : "bg-zinc-800 text-zinc-500"
                                          }`}
                                        >
                                          {isCompleted ? "✓" : index + 1}
                                        </span>

                                        <h4 className="font-black text-white">
                                          {step.title}
                                        </h4>
                                      </div>

                                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                                        {step.description}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 md:justify-end">
                                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-300">
                                        {step.period}
                                      </span>

                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-black ${
                                          isCompleted
                                            ? "bg-green-500/20 text-green-300"
                                            : isCurrent
                                            ? "bg-pink-500/20 text-pink-300"
                                            : "bg-zinc-800 text-zinc-500"
                                        }`}
                                      >
                                        {isCompleted
                                          ? "Concluída"
                                          : isCurrent
                                          ? "Em andamento"
                                          : isLocked
                                          ? "Bloqueada"
                                          : "—"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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
                        onClick={() => {
                          if (project?.delivery_link) {
                            openDelivery(project.delivery_link);
                            return;
                          }

                          if (isAdvisory) {
                            document
                              .getElementById(`assessoria-${order.id}`)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            return;
                          }

                          openDelivery(project?.delivery_link);
                        }}
                        disabled={!project?.delivery_link && !isAdvisory}
                        className={`flex-1 px-5 py-4 rounded-2xl font-black transition ${
                          project?.delivery_link
                            ? "bg-green-500 hover:bg-green-600 text-black"
                            : isAdvisory
                            ? "bg-pink-500/20 hover:bg-pink-500/30 text-pink-200 border border-pink-500/25"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        {isAdvisory && !project?.delivery_link ? "Acompanhar etapas" : "Abrir entrega"}
                      </button>

                      {needsBriefing && (
                        <button
                          onClick={() => openBriefing(order.id)}
                          className={`flex-1 px-5 py-4 rounded-2xl font-black transition ${briefing ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-black"}`}
                        >
                          {briefing ? "Editar briefing" : "Preencher briefing"}
                        </button>
                      )}

                      {isAdvisory && isPaidOrStarted(order) && (
                        <button
                          onClick={() => renewAdvisory(order)}
                          className="flex-1 rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-4 font-black text-white transition hover:scale-[1.02]"
                        >
                          Renovar assessoria
                        </button>
                      )}

                      {isPaymentPending(order) && order.payment_method === "pix" && order.pix_copy_paste && (
                        <button
                          onClick={() =>
                            copyText(order.pix_copy_paste, "Pix copia e cola")
                          }
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black transition"
                        >
                          Copiar Pix
                        </button>
                      )}

                      {isPaymentPending(order) &&
                        order.payment_method === "boleto" &&
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

                      {isPaymentPending(order) && order.payment_method === "boleto" && order.boleto_url && (
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