import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  nome: string | null;
  role: string | null;
  academy_expires_at: string | null;
  created_at: string | null;
};

type Subscription = {
  id: number;
  created_at: string;
  user_email: string | null;
  product_id: string | null;
  payment_id: string | null;
  status: string | null;
  expires_at: string | null;
};

type Order = {
  id: number;
  created_at: string;
  customer_email: string | null;
  customer_name: string | null;
  product_id: string | null;
  product_name: string | null;
  product_category: string | null;
  product_price: string | null;
  status: string | null;
  payment_id: string | null;
  project_id: number | null;
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

type Lesson = {
  id: number;
  module_title: string;
  lesson_title: string;
  created_at: string;
};

type Client = {
  id: number;
  created_at: string;
  name: string | null;
  service: string | null;
  status: string | null;
  monthly_value?: number | null;
};

type Payment = {
  id: number;
  created_at: string;
  client_name: string | null;
  product_name: string | null;
  amount: number | null;
  status: string | null;
  payment_method: string | null;
  notes: string | null;
};

export default function Dashboard({ user, profile }: any) {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  async function loadAdminData() {
    setLoading(true);

    const [
      profilesResponse,
      subscriptionsResponse,
      ordersResponse,
      projectsResponse,
      lessonsResponse,
      clientsResponse,
      paymentsResponse,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("subscriptions").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("orders").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("projects").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("lessons").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("clients").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("payments").select("*").order("created_at", {
        ascending: false,
      }),
    ]);

    if (profilesResponse.error) {
      console.log("Erro profiles:", profilesResponse.error);
    }

    if (subscriptionsResponse.error) {
      console.log("Erro subscriptions:", subscriptionsResponse.error);
    }

    if (ordersResponse.error) {
      console.log("Erro orders:", ordersResponse.error);
    }

    if (projectsResponse.error) {
      console.log("Erro projects:", projectsResponse.error);
    }

    if (lessonsResponse.error) {
      console.log("Erro lessons:", lessonsResponse.error);
    }

    if (clientsResponse.error) {
      console.log("Erro clients:", clientsResponse.error);
    }

    if (paymentsResponse.error) {
      console.log("Erro payments:", paymentsResponse.error);
    }

    setProfiles(profilesResponse.data || []);
    setSubscriptions(subscriptionsResponse.data || []);
    setOrders(ordersResponse.data || []);
    setProjects(projectsResponse.data || []);
    setLessons(lessonsResponse.data || []);
    setClients(clientsResponse.data || []);
    setPayments(paymentsResponse.data || []);

    setLoading(false);
  }

  function formatMoney(value: number | null | undefined) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("pt-BR");
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

  const academyActive =
    !!profile?.academy_expires_at &&
    new Date(profile.academy_expires_at).getTime() > new Date().getTime();

  const subscriptionsStats = useMemo(() => {
    const pending = subscriptions.filter((item) => item.status === "pending");

    const approved = subscriptions.filter(
      (item) => item.status === "approved"
    );

    const active = subscriptions.filter((item) => {
      return (
        item.status === "approved" &&
        item.expires_at &&
        new Date(item.expires_at).getTime() > new Date().getTime()
      );
    });

    const expired = subscriptions.filter((item) => {
      return (
        item.status === "approved" &&
        item.expires_at &&
        new Date(item.expires_at).getTime() <= new Date().getTime()
      );
    });

    return {
      pending: pending.length,
      approved: approved.length,
      active: active.length,
      expired: expired.length,
    };
  }, [subscriptions]);

  const ordersStats = useMemo(() => {
    const pending = orders.filter((order) => order.status === "pending");

    const approved = orders.filter((order) => order.status === "approved");

    const withProject = orders.filter((order) => !!order.project_id);

    const cancelled = orders.filter(
      (order) => order.status === "cancelled" || order.status === "canceled"
    );

    const estimatedValue = orders.reduce((sum, order) => {
      return sum + extractNumberFromPrice(order.product_price);
    }, 0);

    return {
      pending: pending.length,
      approved: approved.length,
      withProject: withProject.length,
      cancelled: cancelled.length,
      estimatedValue,
    };
  }, [orders]);

  const projectsStats = useMemo(() => {
    const pending = projects.filter((project) => project.status === "pendente");

    const inProgress = projects.filter(
      (project) => project.status === "em andamento"
    );

    const completed = projects.filter(
      (project) => project.status === "concluído"
    );

    const late = projects.filter((project) => project.status === "atrasado");

    const delivered = projects.filter((project) => !!project.delivery_link);

    const totalAmount = projects.reduce(
      (sum, project) => sum + Number(project.amount || 0),
      0
    );

    return {
      pending: pending.length,
      inProgress: inProgress.length,
      completed: completed.length,
      late: late.length,
      delivered: delivered.length,
      totalAmount,
    };
  }, [projects]);

  const financeStats = useMemo(() => {
    const paid = payments
      .filter((payment) => payment.status === "pago")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pending = payments
      .filter((payment) => payment.status === "pendente")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      paid,
      pending,
    };
  }, [payments]);

  const monthlyClientsValue = useMemo(() => {
    return clients.reduce(
      (sum, client) => sum + Number(client.monthly_value || 0),
      0
    );
  }, [clients]);

  const latestOrders = orders.slice(0, 5);
  const latestProjects = projects.slice(0, 5);
  const latestSubscriptions = subscriptions.slice(0, 5);

  if (!isAdmin) {
    return (
      <div className="text-white">
        <section className="mb-10">
          <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
            Painel
          </p>

          <h1 className="text-4xl font-black mb-3">
            Bem-vindo, {profile?.nome || user?.email || "Usuário"}
          </h1>

          <p className="text-zinc-400 max-w-3xl">
            Acompanhe sua conta, seu acesso à Academy e suas entregas da FatorZ.
          </p>
        </section>

        <section className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Seu plano</p>

            <h2 className="text-4xl font-black">
              {profile?.role === "premium"
                ? "Premium"
                : profile?.role === "admin"
                ? "Admin"
                : "Gratuito"}
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Academy</p>

            <h2
              className={`text-4xl font-black ${
                academyActive ? "text-green-400" : "text-red-400"
              }`}
            >
              {academyActive ? "Ativo" : "Bloqueado"}
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Vencimento</p>

            <h2 className="text-4xl font-black">
              {formatDate(profile?.academy_expires_at)}
            </h2>
          </div>
        </section>

        <section className="grid xl:grid-cols-2 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-10">
            <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
              FatorZ Academy
            </p>

            <h2 className="text-5xl font-black mb-6">Continue estudando.</h2>

            <p className="text-zinc-400 text-lg mb-8">
              Acesse suas aulas, acompanhe seu progresso e evolua sua presença
              digital com IA.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/academy")}
                className="bg-pink-500 hover:bg-pink-600 px-8 py-4 rounded-2xl font-black"
              >
                Abrir Academy
              </button>

              {!academyActive && (
                <button
                  onClick={() => navigate("/checkout/academy")}
                  className="bg-white text-black px-8 py-4 rounded-2xl font-black"
                >
                  Assinar Academy
                </button>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-10">
            <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
              Entregas
            </p>

            <h2 className="text-5xl font-black mb-6">Seus materiais.</h2>

            <p className="text-zinc-400 text-lg mb-8">
              Veja os projetos, status e links de entrega dos serviços feitos
              pela FatorZ.
            </p>

            <button
              onClick={() => navigate("/minhas-entregas")}
              className="bg-green-500 hover:bg-green-600 text-black px-8 py-4 rounded-2xl font-black"
            >
              Ver minhas entregas
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Painel Admin</h1>
        <p className="text-zinc-400">Carregando dados da FatorZ Hub...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Admin
        </p>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h1 className="text-4xl font-black mb-2">
              Painel Geral FatorZ Hub
            </h1>

            <p className="text-zinc-400">
              Visão geral de pedidos, projetos, entregas, Academy, clientes e
              financeiro.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="bg-pink-500 hover:bg-pink-600 px-6 py-4 rounded-2xl font-black"
          >
            Atualizar painel
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pedidos</p>

          <h2 className="text-5xl font-black">{orders.length}</h2>

          <p className="text-zinc-500 mt-3 text-sm">Compras iniciadas</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pedidos pendentes</p>

          <h2 className="text-5xl font-black text-yellow-400">
            {ordersStats.pending}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">Aguardando pagamento</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pedidos aprovados</p>

          <h2 className="text-5xl font-black text-green-400">
            {ordersStats.approved}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Com projeto: {ordersStats.withProject}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Valor estimado</p>

          <h2 className="text-4xl font-black text-green-400">
            {formatMoney(ordersStats.estimatedValue)}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Cancelados: {ordersStats.cancelled}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Projetos</p>

          <h2 className="text-5xl font-black">{projects.length}</h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Pendentes: {projectsStats.pending}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Em andamento</p>

          <h2 className="text-5xl font-black text-pink-500">
            {projectsStats.inProgress}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Atrasados: {projectsStats.late}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Entregues</p>

          <h2 className="text-5xl font-black text-green-400">
            {projectsStats.delivered}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Concluídos: {projectsStats.completed}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Valor em projetos</p>

          <h2 className="text-4xl font-black text-green-400">
            {formatMoney(projectsStats.totalAmount)}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">Soma dos projetos</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Usuários</p>

          <h2 className="text-5xl font-black">{profiles.length}</h2>

          <p className="text-zinc-500 mt-3 text-sm">Contas criadas</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Academy ativo</p>

          <h2 className="text-5xl font-black text-green-400">
            {subscriptionsStats.active}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Aprovadas: {subscriptionsStats.approved} | Pendentes:{" "}
            {subscriptionsStats.pending} | Expiradas:{" "}
            {subscriptionsStats.expired}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Clientes CRM</p>

          <h2 className="text-5xl font-black">{clients.length}</h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Mensalidade: {formatMoney(monthlyClientsValue)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Aulas Academy</p>

          <h2 className="text-5xl font-black text-pink-500">
            {lessons.length}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">Conteúdos publicados</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 xl:col-span-2">
          <p className="text-zinc-400 mb-2">Financeiro recebido</p>

          <h2 className="text-4xl font-black text-green-400">
            {formatMoney(financeStats.paid)}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Pagamentos marcados como pagos
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 xl:col-span-2">
          <p className="text-zinc-400 mb-2">Financeiro pendente</p>

          <h2 className="text-4xl font-black text-yellow-400">
            {formatMoney(financeStats.pending)}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Pagamentos ainda pendentes
          </p>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_420px] gap-8 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black">Últimos pedidos</h2>

              <p className="text-zinc-500 text-sm mt-1">
                Compras iniciadas na Landing.
              </p>
            </div>

            <button
              onClick={() => navigate("/admin/pedidos")}
              className="bg-pink-500 hover:bg-pink-600 px-5 py-3 rounded-xl font-black"
            >
              Ver pedidos
            </button>
          </div>

          {latestOrders.length === 0 ? (
            <div className="bg-black border border-zinc-800 rounded-3xl p-6">
              <p className="text-zinc-400">Nenhum pedido registrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-black">
                      {order.product_name || "Produto sem nome"}
                    </h3>

                    <p className="text-zinc-500 text-sm break-all">
                      {order.customer_email || "Sem email"}
                    </p>

                    <p className="text-zinc-600 text-xs mt-1">
                      {formatDateTime(order.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-4 py-2 rounded-xl font-black text-sm ${
                        order.status === "approved"
                          ? "bg-green-500/20 text-green-400"
                          : order.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : order.status === "project_created"
                          ? "bg-pink-500/20 text-pink-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {order.status || "sem status"}
                    </span>

                    <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                      {order.product_price || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
          <h2 className="text-2xl font-black mb-6">Ações rápidas</h2>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/admin/pedidos")}
              className="w-full text-left bg-pink-500 hover:bg-pink-600 px-5 py-4 rounded-2xl font-black"
            >
              Gerenciar Pedidos
            </button>

            <button
              onClick={() => navigate("/projetos")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              Projetos e Entregas
            </button>

            <button
              onClick={() => navigate("/admin/assinaturas")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              Assinaturas Academy
            </button>

            <button
              onClick={() => navigate("/admin/aulas")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              Postar Aulas
            </button>

            <button
              onClick={() => navigate("/clientes")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              CRM de Clientes
            </button>

            <button
              onClick={() => navigate("/financeiro")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              Financeiro
            </button>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black">Últimos projetos</h2>

              <p className="text-zinc-500 text-sm mt-1">
                Produção e entregas recentes.
              </p>
            </div>

            <button
              onClick={() => navigate("/projetos")}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-black"
            >
              Ver projetos
            </button>
          </div>

          {latestProjects.length === 0 ? (
            <div className="bg-black border border-zinc-800 rounded-3xl p-6">
              <p className="text-zinc-400">Nenhum projeto criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-black">
                      {project.title || "Projeto sem título"}
                    </h3>

                    <p className="text-zinc-500 text-sm">
                      {project.client_name || "Sem cliente"}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p
                      className={`font-black ${
                        project.delivery_link
                          ? "text-green-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {project.delivery_link ? "Entregue" : "Sem entrega"}
                    </p>

                    <p className="text-zinc-500 text-sm">
                      {project.status || "sem status"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black">Últimas assinaturas</h2>

              <p className="text-zinc-500 text-sm mt-1">
                Academy e pagamentos premium.
              </p>
            </div>

            <button
              onClick={() => navigate("/admin/assinaturas")}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-black"
            >
              Ver assinaturas
            </button>
          </div>

          {latestSubscriptions.length === 0 ? (
            <div className="bg-black border border-zinc-800 rounded-3xl p-6">
              <p className="text-zinc-400">Nenhuma assinatura ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestSubscriptions.map((subscription) => {
                const active =
                  subscription.status === "approved" &&
                  subscription.expires_at &&
                  new Date(subscription.expires_at).getTime() >
                    new Date().getTime();

                return (
                  <div
                    key={subscription.id}
                    className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-black break-all">
                        {subscription.user_email || "Sem email"}
                      </h3>

                      <p className="text-zinc-500 text-sm">
                        Vence em {formatDate(subscription.expires_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-4 py-2 rounded-xl font-black text-sm ${
                          subscription.status === "approved"
                            ? "bg-green-500/20 text-green-400"
                            : subscription.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {subscription.status || "sem status"}
                      </span>

                      <span
                        className={`px-4 py-2 rounded-xl font-black text-sm ${
                          active
                            ? "bg-pink-500/20 text-pink-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}