import { Wallet, Rocket, Hourglass, Target, ShoppingCart, Users, Package, Trophy, ShoppingBag, CalendarClock } from "lucide-react";
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


const clientJourneySteps = [
  "Briefing",
  "Diagnóstico",
  "Direção",
  "Produção",
  "Revisão",
  "Entrega",
];

function normalizeStatusValue(status: unknown) {
  return String(status || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isPaidStatusValue(status: unknown) {
  return [
    "paid",
    "pago",
    "approved",
    "aprovado",
    "completed",
    "concluido",
    "project_created",
  ].includes(normalizeStatusValue(status));
}

function isPendingStatusValue(status: unknown) {
  return ["", "pending", "pendente", "processing"].includes(
    normalizeStatusValue(status)
  );
}

function getReadableProjectStatus(status: unknown) {
  const value = normalizeStatusValue(status);

  if (!value || value === "pendente") return "Em análise";
  if (value.includes("aguardando cliente")) return "Aguardando cliente";
  if (value.includes("briefing")) return "Aguardando briefing";
  if (value.includes("diagnostico")) return "Diagnóstico";
  if (value.includes("planejamento")) return "Planejamento";
  if (value.includes("lote 1")) return "Produção — lote 1";
  if (value.includes("lote 2")) return "Produção — lote 2";
  if (value.includes("revisao")) return "Em revisão";
  if (value.includes("concluido") || value.includes("completed")) return "Concluído";
  if (value.includes("andamento")) return "Em produção";

  return String(status || "Em andamento");
}

function getProjectProgress(status: unknown) {
  const value = normalizeStatusValue(status);

  if (value.includes("concluido") || value.includes("completed")) return 100;
  if (value.includes("revisao")) return 82;
  if (value.includes("lote 2")) return 68;
  if (value.includes("lote 1") || value.includes("andamento")) return 52;
  if (value.includes("planejamento")) return 38;
  if (value.includes("diagnostico")) return 24;
  if (value.includes("aguardando") || value.includes("briefing")) return 10;

  return 18;
}

function getProjectStepIndex(status: unknown) {
  const progress = getProjectProgress(status);

  if (progress >= 100) return 5;
  if (progress >= 82) return 4;
  if (progress >= 52) return 3;
  if (progress >= 38) return 2;
  if (progress >= 24) return 1;
  return 0;
}

function getActiveProject(projects: any[]) {
  if (!projects.length) return null;

  const active = projects.find((project) => {
    const status = normalizeStatusValue(project?.status);
    return !status.includes("concluido") && !status.includes("cancelado");
  });

  return active || projects[0];
}

function getServiceNameFromProject(project: any, fallback = "Projeto FatorZ") {
  if (!project) return fallback;

  return (
    project.service_type ||
    project.title ||
    project.product_name ||
    fallback
  );
}

function getClientNextStep(orders: any[], projects: any[]) {
  const pendingOrder = orders.find((order) => isPendingStatusValue(order?.status));
  const activeProject = getActiveProject(projects);
  const latestOrder = orders[0] || null;

  if (pendingOrder) {
    return {
      eyebrow: "Pagamento pendente",
      title: "Finalize sua compra para liberar a próxima etapa.",
      description:
        "Assim que o pagamento for aprovado, sua entrega entra no fluxo da FatorZ e aparece com status atualizado por aqui.",
      cta: "Ver pagamento",
      path: "/minhas-entregas",
      tone: "yellow",
    };
  }

  if (activeProject) {
    const status = normalizeStatusValue(activeProject.status);

    if (status.includes("aguardando") || status.includes("briefing")) {
      return {
        eyebrow: "Próximo passo",
        title: "Envie o briefing da sua marca.",
        description:
          "A equipe precisa das suas referências, objetivos, Instagram, cores e materiais para iniciar a entrega com direção.",
        cta: "Preencher briefing",
        path: latestOrder?.id ? `/briefing?orderId=${latestOrder.id}` : "/briefing",
        tone: "pink",
      };
    }

    if (status.includes("diagnostico")) {
      return {
        eyebrow: "Em análise",
        title: "Seu diagnóstico está sendo preparado.",
        description:
          "Estamos lendo seu briefing, avaliando presença digital e organizando a direção da entrega.",
        cta: "Acompanhar entrega",
        path: "/minhas-entregas",
        tone: "blue",
      };
    }

    if (status.includes("planejamento")) {
      return {
        eyebrow: "Direção definida",
        title: "Seu planejamento está em construção.",
        description:
          "A FatorZ está organizando prioridades, conteúdo e ordem de produção para manter a entrega estratégica.",
        cta: "Ver andamento",
        path: "/minhas-entregas",
        tone: "blue",
      };
    }

    if (status.includes("lote") || status.includes("andamento")) {
      return {
        eyebrow: "Produção ativa",
        title: "Sua entrega está em produção.",
        description:
          "Os materiais já entraram na fila criativa. Você pode acompanhar o status e abrir os links finais quando forem liberados.",
        cta: "Acompanhar produção",
        path: "/minhas-entregas",
        tone: "green",
      };
    }

    if (status.includes("revisao")) {
      return {
        eyebrow: "Revisão",
        title: "Sua entrega está em fase de ajustes.",
        description:
          "Estamos refinando os detalhes finais para manter consistência visual e clareza na mensagem.",
        cta: "Ver entrega",
        path: "/minhas-entregas",
        tone: "green",
      };
    }

    if (status.includes("concluido") || status.includes("completed")) {
      return {
        eyebrow: "Entrega concluída",
        title: "Seu material já está disponível para conferência.",
        description:
          "Confira os links finais e fale com a FatorZ se precisar iniciar um novo ciclo ou contratar outra solução.",
        cta: "Abrir entregas",
        path: "/minhas-entregas",
        tone: "green",
      };
    }

    return {
      eyebrow: "Projeto ativo",
      title: "Sua marca está no fluxo de produção.",
      description:
        "Acompanhe as etapas por aqui. O painel será atualizado conforme o avanço da equipe FatorZ.",
      cta: "Ver entregas",
      path: "/minhas-entregas",
      tone: "blue",
    };
  }

  if (orders.length) {
    return {
      eyebrow: "Compra registrada",
      title: "Sua compra já está no Hub FatorZ.",
      description:
        "Assim que o projeto for criado, ele aparece como uma entrega acompanhável no seu painel.",
      cta: "Ver minhas entregas",
      path: "/minhas-entregas",
      tone: "blue",
    };
  }

  return {
    eyebrow: "Comece por aqui",
    title: "Escolha uma solução para evoluir sua presença digital.",
    description:
      "Você pode contratar serviços, acessar a Academy ou falar com o Jack para entender qual caminho faz mais sentido agora.",
    cta: "Ver produtos FatorZ",
    path: "/servicos",
    tone: "pink",
  };
}

function getToneClasses(tone: string) {
  if (tone === "green") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
  }

  if (tone === "yellow") {
    return "border-yellow-400/25 bg-yellow-400/10 text-yellow-300";
  }

  if (tone === "blue") {
    return "border-blue-400/25 bg-blue-500/10 text-blue-300";
  }

  return "border-[#ff0096]/25 bg-[#ff0096]/10 text-[#ff7bd0]";
}

function openJack(prompt: string) {
  window.dispatchEvent(
    new CustomEvent("fatorz:open-assistant", {
      detail: {
        prompt,
        autoSend: false,
      },
    })
  );
}

function ClientExperienceSection({
  navigate,
  greetingName,
  orders,
  projects,
  approvedPurchases,
  pendingPurchases,
  customerLabel,
}: any) {
  const activeProject = getActiveProject(projects);
  const nextStep = getClientNextStep(orders, projects);
  const progress = activeProject ? getProjectProgress(activeProject.status) : 0;
  const currentStepIndex = activeProject ? getProjectStepIndex(activeProject.status) : 0;
  const paidOrders = orders.filter((order: any) => isPaidStatusValue(order?.status));
  const pendingOrders = orders.filter((order: any) => isPendingStatusValue(order?.status));
  const latestOrder = orders[0] || null;
  const activeServiceName =
    getServiceNameFromProject(activeProject, latestOrder?.product_name || "Presença digital");

  const toneClasses = getToneClasses(nextStep.tone);

  return (
    <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#050509]/95 p-6 shadow-[0_0_80px_rgba(145,35,255,0.12)] md:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#ff0096]/15 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#005cff]/15 blur-[90px]" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_220px] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
              Experiência FatorZ
            </span>

            <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight md:text-5xl">
              {greetingName}, sua presença digital está em construção.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
              Este é o seu ponto de acompanhamento: briefing, produção, revisão,
              entregas e próximos passos ficam organizados aqui para você não se perder.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate(nextStep.path)}
                className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 text-sm font-black text-white shadow-[0_0_34px_rgba(255,0,150,0.24)] transition hover:scale-[1.02]"
              >
                {nextStep.cta}
              </button>

              <button
                onClick={() =>
                  openJack(
                    "Jack, me explica meu próximo passo dentro do Hub FatorZ."
                  )
                }
                className="rounded-2xl border border-white/10 bg-white/[0.045] px-6 py-4 text-sm font-black text-white transition hover:border-[#ff0096]/40 hover:bg-white/[0.08]"
              >
                Falar com o Jack
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/35 p-5 shadow-[0_0_50px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ff0096]/15 blur-[55px]" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#005cff]/15 blur-[55px]" />

            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff7bd0]">
                Central de acompanhamento
              </p>

              <h3 className="mt-4 text-2xl font-black leading-tight">
                Tudo que a FatorZ precisa entregar fica organizado aqui.
              </h3>

              <div className="mt-5 space-y-3 text-sm text-zinc-400">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  Briefing, materiais e referências do cliente.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  Produção, revisão e liberação das entregas.
                </div>
                <div className="rounded-2xl border border-[#ff0096]/20 bg-[#ff0096]/10 p-3 text-[#ffb7e2]">
                  Jack disponível para orientar o próximo passo.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="grid gap-5">
        <div className="rounded-[34px] border border-white/10 bg-[#08080d]/95 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
              Próximo passo
            </p>

            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${toneClasses}`}>
              {nextStep.eyebrow}
            </span>
          </div>

          <h3 className="text-2xl font-black leading-tight">{nextStep.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            {nextStep.description}
          </p>

          <button
            onClick={() => navigate(nextStep.path)}
            className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm font-black text-white transition hover:border-[#ff0096]/40 hover:bg-white/[0.08]"
          >
            {nextStep.cta}
          </button>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-[#08080d]/95 p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
                Status da entrega
              </p>
              <h3 className="mt-3 text-2xl font-black">
                {activeProject ? activeServiceName : "Nenhuma entrega ativa"}
              </h3>
            </div>

            <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
              {activeProject ? getReadableProjectStatus(activeProject.status) : "Stand-by"}
            </span>
          </div>

          <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {clientJourneySteps.map((step, index) => {
              const active = index <= currentStepIndex && !!activeProject;

              return (
                <div
                  key={step}
                  className={`rounded-2xl border p-3 text-center text-[10px] font-black uppercase leading-4 tracking-widest ${
                    active
                      ? "border-[#ff0096]/30 bg-[#ff0096]/10 text-[#ff7bd0]"
                      : "border-white/10 bg-white/[0.035] text-zinc-600"
                  }`}
                >
                  {step}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Compras pagas" value={String(paidOrders.length)} />
          <MiniStat label="Pendências" value={String(pendingOrders.length + pendingPurchases.length)} />
          <MiniStat label="Cursos" value={String(approvedPurchases.length)} />
          <MiniStat label="Plano" value={customerLabel} />
        </div>
      </aside>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#08080d]/90 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
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
          icon: Wallet,
          label: "Receita hoje",
          value: formatMoney(metrics.revenueToday),
          trend: "Pedidos pagos de hoje",
        },
        {
          icon: Rocket,
          label: "Este mês",
          value: formatMoney(metrics.revenueMonth),
          trend: "Receita mensal atual",
        },
        {
          icon: Hourglass,
          label: "Pendente",
          value: formatMoney(metrics.pendingValue),
          trend: `${metrics.pendingOrders} pedido(s) pendente(s)`,
        },
        {
          icon: Target,
          label: "Ticket médio",
          value: formatMoney(metrics.averageTicket),
          trend: "Média por venda paga",
        },
        {
          icon: ShoppingCart,
          label: "Pedidos pagos",
          value: metrics.paidOrders,
          trend: `${metrics.totalOrders} pedido(s) total`,
        },
        {
          icon: Users,
          label: "Clientes automáticos",
          value: crm.metrics.totalClientes,
          trend: `${crm.metrics.clientesPagantes} cliente(s) pagante(s)`,
        },
        {
          icon: Package,
          label: "Projetos ativos",
          value: metrics.activeProjects,
          trend: `${metrics.totalProjects} projeto(s) total`,
        },
        {
          icon: Trophy,
          label: "Produtos vendidos",
          value: productRanking.reduce((sum, item) => sum + item.paidOrders, 0),
          trend: `${productRanking.length} produto(s) no ranking`,
        },
      ]
    : [
        {
          icon: ShoppingCart,
          label: "Pedidos",
          value: orders.length,
          trend: `${metrics.pendingOrders} ativo(s)`,
        },
        {
          icon: Package,
          label: "Cursos",
          value: approvedPurchases.length,
          trend: `${pendingPurchases.length} pendente(s)`,
        },
        {
          icon: CalendarClock,
          label: "Entregas",
          value: projects.length,
          trend: "Acompanhamento de projetos",
        },
        {
          icon: ShoppingBag,
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

      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[380px] w-[640px] -translate-x-1/2 rounded-full bg-[#8b5cf6]/8 blur-[110px]" />

      <section className="mb-5">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b5cf6]">
              <span className="h-1 w-1 rounded-full bg-[#8b5cf6]" />
              {isTeam ? "Dashboard FatorZ" : "Hub FatorZ"}
            </p>

            <h1 className="mt-2 font-['Sora',sans-serif] text-3xl font-bold tracking-tight md:text-[40px]">
              Centro de controle
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
              {isTeam
                ? `Bem-vindo, ${greetingName}. Aqui você acompanha vendas, clientes, projetos, produtos e movimentações da FatorZ em um só lugar.`
                : `Bem-vindo, ${greetingName}. Acompanhe seus pedidos, cursos, entregas e movimentações da sua conta.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-300">
              Cliente {customerLabel}
            </span>

            <span className="rounded-full border border-[#8b5cf6]/25 bg-[#8b5cf6]/10 px-3 py-2 text-xs font-bold text-[#a78bfa]">
              {staffLabel}
            </span>

            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
              {isTeam
                ? `${metrics.paidOrders} venda(s) paga(s)`
                : `${approvedPurchases.length} curso(s)`}
            </span>
          </div>
        </div>

        <DashboardCards cards={cards} />
      </section>

      {!isTeam && (
        <ClientExperienceSection
          navigate={navigate}
          greetingName={greetingName}
          orders={orders}
          projects={projects}
          approvedPurchases={approvedPurchases}
          pendingPurchases={pendingPurchases}
          customerLabel={customerLabel}
        />
      )}

      {isTeam && (
        <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[14px] border border-white/[0.07] bg-[#0c0c16] p-5">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b5cf6]">
                  Performance
                </p>

                <h2 className="mt-2 font-['Sora',sans-serif] text-xl font-bold">
                  Resumo visual da receita
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  Leitura rápida dos principais períodos financeiros.
                </p>
              </div>

              <button
                onClick={() => setManualSaleOpen(true)}
                className="rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] px-4 py-2.5 text-sm font-bold text-white transition hover:scale-[1.01]"
              >
                + Nova venda manual
              </button>
            </div>

            <div className="space-y-4">
              {chartBars.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-zinc-300">
                      {item.label}
                    </span>

                    <span className="font-mono text-sm font-bold text-white">
                      {formatMoney(item.value)}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#111120]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <FinanceiroResumo metrics={metrics} />

            <div className="rounded-[14px] border border-white/[0.07] bg-[#0c0c16] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b5cf6]">
                Ações rápidas
              </p>

              <div className="mt-5 space-y-3">
                <button
                  onClick={() => setManualSaleOpen(true)}
                  className="w-full rounded-[10px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-500/15"
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
                  className="w-full rounded-[10px] border border-white/[0.07] bg-[#111120] p-4 text-left transition hover:border-[#8b5cf6]/40 hover:bg-white/[0.04]"
                >
                  <h3 className="font-black">Gerenciar pedidos</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Acompanhar vendas, status e projetos gerados.
                  </p>
                </button>

                <button
                  onClick={() => navigate("/projetos")}
                  className="w-full rounded-[10px] border border-white/[0.07] bg-[#111120] p-4 text-left transition hover:border-[#3b82f6]/40 hover:bg-white/[0.04]"
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
