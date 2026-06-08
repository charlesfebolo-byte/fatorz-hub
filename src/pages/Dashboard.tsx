import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatMoney, useDashboard } from "../hooks/useDashboard";
import { useClientes } from "../hooks/useClientes";
import DashboardCards from "../components/DashboardCards";
import FinanceiroResumo from "../components/FinanceiroResumo";
import ManualSaleModal from "../components/ManualSaleModal";

type DashboardProps = {
  user: any;
  profile: any;
};

const customerTagLabels: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  lendario: "Lendário",
};

const staffRoleLabels: Record<string, string> = {
  none: "Aluno/Cliente",
  ceo_fatorz: "CEO FatorZ",
  diretor_operacional: "Diretor Operacional",
  gestor_entregas: "Gestor de Entregas",
  criador_visual: "Criador Visual",
  suporte_fatorz: "Suporte FatorZ",
  financeiro: "Financeiro",
  mentor_academy: "Mentor Academy",
};

function getCustomerTag(profile: any) {
  if (profile?.customer_tag === "lendario") return "lendario";
  if (profile?.customer_tag === "premium") return "premium";
  return "free";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: string | null | undefined) {
  const value = String(status || "").toLowerCase();

  if (["paid", "pago", "approved", "aprovado"].includes(value)) return "Pago";
  if (["completed", "concluido", "concluído"].includes(value)) return "Concluído";
  if (["pending", "pendente", ""].includes(value)) return "Pendente";
  if (["project_created"].includes(value)) return "Projeto criado";
  if (["cancelled", "canceled", "cancelado"].includes(value)) return "Cancelado";

  return status || "Em análise";
}

function getStatusClass(status: string | null | undefined) {
  const value = String(status || "").toLowerCase();

  if (
    [
      "paid",
      "pago",
      "approved",
      "aprovado",
      "completed",
      "concluido",
      "concluído",
      "project_created",
    ].includes(value)
  ) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  }

  if (["pending", "pendente", ""].includes(value)) {
    return "border-orange-400/30 bg-orange-500/10 text-orange-300";
  }

  if (["cancelled", "canceled", "cancelado"].includes(value)) {
    return "border-red-400/30 bg-red-500/10 text-red-300";
  }

  return "border-blue-400/30 bg-blue-500/10 text-blue-300";
}

export default function Dashboard({ user, profile }: DashboardProps) {
  const navigate = useNavigate();
  const [manualSaleOpen, setManualSaleOpen] = useState(false);

  const dashboard = useDashboard({ user, profile });
  const crm = useClientes();

  const {
    loading,
    isTeam,
    staffRole,
    orders,
    projects,
    coursePurchases,
    metrics,
    productRanking,
    reload,
  } = dashboard;

  const customerTag = getCustomerTag(profile);
  const customerLabel = customerTagLabels[customerTag] || "Free";
  const staffLabel = staffRoleLabels[staffRole] || "Aluno/Cliente";

  const greetingName =
    profile?.nome || profile?.name || user?.email?.split("@")[0] || "cliente";

  const approvedPurchases = useMemo(() => {
    return coursePurchases.filter((purchase) => purchase.status === "approved");
  }, [coursePurchases]);

  const pendingPurchases = useMemo(() => {
    return coursePurchases.filter((purchase) => purchase.status === "pending");
  }, [coursePurchases]);

  const recentClients = useMemo(() => {
    return crm.clientes.slice(0, 5);
  }, [crm.clientes]);

  const recentProjects = useMemo(() => {
    return projects.slice(0, 5);
  }, [projects]);

  const chartBars = useMemo(() => {
    const values = [
      metrics.revenueToday,
      metrics.revenueYesterday,
      metrics.revenueMonth,
      metrics.revenueLastMonth,
    ];

    const max = Math.max(...values, 1);

    return [
      { label: "Hoje", value: metrics.revenueToday },
      { label: "Ontem", value: metrics.revenueYesterday },
      { label: "Mês", value: metrics.revenueMonth },
      { label: "Mês ant.", value: metrics.revenueLastMonth },
    ].map((item) => ({
      ...item,
      percent: Math.max(6, Math.round((item.value / max) * 100)),
    }));
  }, [metrics]);

  const cards = isTeam
    ? [
        {
          icon: "💰",
          label: "Receita hoje",
          value: formatMoney(metrics.revenueToday),
          trend: "Pedidos pagos de hoje",
        },
        {
          icon: "🚀",
          label: "Este mês",
          value: formatMoney(metrics.revenueMonth),
          trend: "Receita mensal atual",
        },
        {
          icon: "⏳",
          label: "Pendente",
          value: formatMoney(metrics.pendingValue),
          trend: `${metrics.pendingOrders} pedido(s) pendente(s)`,
        },
        {
          icon: "🎯",
          label: "Ticket médio",
          value: formatMoney(metrics.averageTicket),
          trend: "Média por venda paga",
        },
        {
          icon: "🛒",
          label: "Pedidos pagos",
          value: metrics.paidOrders,
          trend: `${metrics.totalOrders} pedido(s) total`,
        },
        {
          icon: "👥",
          label: "Clientes automáticos",
          value: crm.metrics.totalClientes,
          trend: `${crm.metrics.clientesPagantes} cliente(s) pagante(s)`,
        },
        {
          icon: "📦",
          label: "Projetos ativos",
          value: metrics.activeProjects,
          trend: `${metrics.totalProjects} projeto(s) total`,
        },
        {
          icon: "🏆",
          label: "Produtos vendidos",
          value: productRanking.reduce((sum, item) => sum + item.paidOrders, 0),
          trend: `${productRanking.length} produto(s) no ranking`,
        },
      ]
    : [
        {
          icon: "🛒",
          label: "Pedidos",
          value: orders.length,
          trend: `${metrics.pendingOrders} ativo(s)`,
        },
        {
          icon: "📦",
          label: "Cursos",
          value: approvedPurchases.length,
          trend: `${pendingPurchases.length} pendente(s)`,
        },
        {
          icon: "📅",
          label: "Entregas",
          value: projects.length,
          trend: "Acompanhamento de projetos",
        },
        {
          icon: "🛍️",
          label: "Produtos FatorZ",
          value: "Acessar",
          trend: "Sites, criativos, SEO e Academy",
        },
      ];

  async function handleManualSaleSaved() {
    await Promise.all([reload(), crm.reload()]);
  }

  if (loading) {
    return (
      <div className="text-white">
        <div className="rounded-[34px] border border-white/10 bg-[#08080d] p-8">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff0096]">
            FatorZ
          </p>

          <h1 className="mt-4 text-4xl font-black">Carregando dashboard...</h1>

          <p className="mt-3 text-zinc-500">
            Preparando métricas, vendas, clientes e financeiro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative text-white">
      <ManualSaleModal
        open={manualSaleOpen}
        onClose={() => setManualSaleOpen(false)}
        onSaved={handleManualSaleSaved}
      />

      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#9123ff]/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-32 -z-10 h-[380px] w-[380px] rounded-full bg-[#005cff]/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[380px] w-[380px] rounded-full bg-[#ff0096]/10 blur-[100px]" />

      <section className="mb-6 overflow-hidden rounded-[32px] border border-white/10 bg-[#050509]/95 p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] md:p-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-[#ff0096]">
              {isTeam ? "Dashboard FatorZ" : "Hub FatorZ"}
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              Centro de controle
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-500 md:text-base">
              {isTeam
                ? `Bem-vindo, ${greetingName}. Aqui você acompanha vendas, clientes, projetos, produtos e movimentações da FatorZ em um só lugar.`
                : `Bem-vindo, ${greetingName}. Acompanhe seus pedidos, cursos, entregas e movimentações da sua conta.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-yellow-400/25 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-300">
              Cliente {customerLabel}
            </span>

            <span className="rounded-full border border-[#ff0096]/25 bg-[#ff0096]/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#ff7bd0]">
              {staffLabel}
            </span>

            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-300">
              {isTeam
                ? `${metrics.paidOrders} venda(s) paga(s)`
                : `${approvedPurchases.length} curso(s)`}
            </span>
          </div>
        </div>

        <DashboardCards cards={cards} />
      </section>

      {isTeam && (
        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                  Performance
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  Resumo visual da receita
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  Leitura rápida dos principais períodos financeiros.
                </p>
              </div>

              <button
                onClick={() => setManualSaleOpen(true)}
                className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
              >
                + Nova venda manual
              </button>
            </div>

            <div className="space-y-4">
              {chartBars.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-zinc-300">
                      {item.label}
                    </span>

                    <span className="text-sm font-black text-white">
                      {formatMoney(item.value)}
                    </span>
                  </div>

                  <div className="h-4 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <FinanceiroResumo metrics={metrics} />

            <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                Ações rápidas
              </p>

              <div className="mt-5 space-y-3">
                <button
                  onClick={() => setManualSaleOpen(true)}
                  className="w-full rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-500/15"
                >
                  <h3 className="font-black text-emerald-300">
                    Registrar venda manual
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Para vendas fechadas fora do site.
                  </p>
                </button>

                <button
                  onClick={() => navigate("/admin/pedidos")}
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#ff0096]/40 hover:bg-white/[0.07]"
                >
                  <h3 className="font-black">Gerenciar pedidos</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Acompanhar vendas, status e projetos gerados.
                  </p>
                </button>

                <button
                  onClick={() => navigate("/projetos")}
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#00a3ff]/40 hover:bg-white/[0.07]"
                >
                  <h3 className="font-black">Projetos</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Ver entregas e produção em andamento.
                  </p>
                </button>
              </div>
            </div>
          </aside>
        </section>
      )}

      {isTeam && (
        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                CRM automático
              </p>

              <h2 className="mt-3 text-3xl font-black">Últimos clientes</h2>

              <p className="mt-2 text-sm text-zinc-500">
                Gerado automaticamente pelas vendas, pedidos e pagamentos manuais.
              </p>
            </div>

            {recentClients.length ? (
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <div
                    key={client.key}
                    className="rounded-[22px] border border-white/10 bg-black/35 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black">
                          {client.name}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          {client.email || client.phone || "Sem contato"} ·{" "}
                          {client.totalOrders} compra(s)
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          Último produto: {client.lastProduct || "—"}
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xl font-black text-emerald-300">
                          {formatMoney(client.totalSpent)}
                        </p>

                        <p className="text-xs text-zinc-500">
                          {client.paidOrders} paga(s)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/40 p-5">
                <h3 className="text-xl font-black">
                  Nenhum cliente detectado ainda.
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Quando entrar venda, o CRM aparece automaticamente aqui.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                Operação
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Projetos em andamento
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Entregas e serviços que precisam de atenção.
              </p>
            </div>

            {recentProjects.length ? (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-[22px] border border-white/10 bg-black/35 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-black">
                          {project.title || "Projeto sem título"}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          {project.client_name || project.client_email || "Cliente não informado"}
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          Serviço: {project.service_type || "—"}
                        </p>
                      </div>

                      <span className="w-fit rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                        {project.status || "sem status"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/40 p-5">
                <h3 className="text-xl font-black">
                  Nenhum projeto encontrado.
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Quando um pedido virar entrega, ele aparece aqui.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {isTeam && (
        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                Produtos
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Produtos mais vendidos
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Ranking somando pedidos antigos, checkout de produtos e lançamentos manuais.
              </p>
            </div>

            {productRanking.length ? (
              <div className="space-y-3">
                {productRanking.slice(0, 8).map((product, index) => {
                  const maxRevenue = Math.max(productRanking[0]?.revenue || 1, 1);
                  const percent = Math.min(
                    100,
                    Math.round((product.revenue / maxRevenue) * 100)
                  );

                  return (
                    <div
                      key={product.name}
                      className="rounded-[22px] border border-white/10 bg-black/35 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-[#ff7bd0]">
                            #{index + 1}
                          </span>

                          <div className="min-w-0">
                            <h3 className="truncate font-black text-white">
                              {product.name}
                            </h3>

                            <p className="mt-1 text-xs text-zinc-500">
                              {product.paidOrders} venda(s) paga(s) ·{" "}
                              {product.totalOrders} pedido(s) total
                            </p>
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-lg font-black text-emerald-300">
                            {formatMoney(product.revenue)}
                          </p>

                          <p className="text-xs font-bold text-orange-300">
                            Pendente: {formatMoney(product.pendingValue)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/40 p-5">
                <h3 className="text-xl font-black">
                  Sem vendas registradas ainda.
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Quando entrar venda paga, ela aparece aqui.
                </p>
              </div>
            )}
          </div>

          <aside className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
              Maior cliente
            </p>

            {crm.metrics.maiorCliente ? (
              <div className="mt-5">
                <h2 className="text-3xl font-black">
                  {crm.metrics.maiorCliente.name}
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  {crm.metrics.maiorCliente.email ||
                    crm.metrics.maiorCliente.phone ||
                    "Sem contato"}
                </p>

                <div className="mt-6 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                    Total gasto
                  </p>

                  <p className="mt-3 text-4xl font-black text-emerald-300">
                    {formatMoney(crm.metrics.maiorCliente.totalSpent)}
                  </p>
                </div>

                <p className="mt-4 text-sm text-zinc-500">
                  Último produto: {crm.metrics.maiorCliente.lastProduct || "—"}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm text-zinc-500">
                Ainda não há cliente pagante registrado.
              </p>
            )}
          </aside>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                  Pedidos
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  Últimas movimentações
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  Pedidos, checkouts e lançamentos financeiros mais recentes.
                </p>
              </div>

              <button
                onClick={() =>
                  navigate(isTeam ? "/admin/pedidos" : "/minhas-entregas")
                }
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
              >
                {isTeam ? "Ver pedidos" : "Ver entregas"}
              </button>
            </div>

            {orders.length ? (
              <div className="space-y-3">
                {orders.slice(0, 8).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[22px] border border-white/10 bg-black/35 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-black">
                          {order.product_name || "Movimentação sem nome"}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          {order.customer_name ||
                            order.customer_email ||
                            "Cliente não informado"}{" "}
                          · {formatDateTime(order.created_at)} ·{" "}
                          {formatMoney(order.amount)}
                        </p>

                        <p className="mt-1 text-[11px] uppercase tracking-widest text-zinc-600">
                          Origem: {order.source}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/40 p-5">
                <h3 className="text-xl font-black">
                  Nenhuma movimentação encontrada.
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Quando entrar venda, pedido ou pagamento manual, aparece aqui.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
              {isTeam ? "Resumo operacional" : "Resumo da conta"}
            </p>

            <div className="mt-5 space-y-4">
              {isTeam ? (
                <>
                  <Line label="Receita total" value={formatMoney(metrics.revenueTotal)} />
                  <Line label="Valor pendente" value={formatMoney(metrics.pendingValue)} />
                  <Line label="Pedidos totais" value={String(metrics.totalOrders)} />
                  <Line label="Clientes automáticos" value={String(crm.metrics.totalClientes)} />
                  <Line label="Projetos ativos" value={String(metrics.activeProjects)} />
                </>
              ) : (
                <>
                  <Line label="Cursos liberados" value={String(approvedPurchases.length)} />
                  <Line label="Compras pendentes" value={String(pendingPurchases.length)} />
                  <Line label="Pedidos ativos" value={String(metrics.pendingOrders)} />
                  <Line label="Total gasto" value={formatMoney(profile?.total_spent || 0)} />
                </>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">
              Dados da conta
            </p>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-zinc-500">Email</p>
                <p className="break-all font-black">{user?.email}</p>
              </div>

              <div>
                <p className="text-zinc-500">Tag</p>
                <p className="font-black">{customerLabel}</p>
              </div>

              <div>
                <p className="text-zinc-500">Cargo</p>
                <p className="font-black">{staffLabel}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-xl font-black text-white">{value}</span>
    </div>
  );
}