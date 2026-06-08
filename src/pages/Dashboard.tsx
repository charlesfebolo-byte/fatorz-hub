import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type DashboardProps = {
  user: any;
  profile: any;
};

type Order = {
  id: number;
  created_at: string;
  product_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  status: string | null;
  notes?: string | null;
};

type CoursePurchase = {
  id: number;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  course_id: number | null;
  course_title: string | null;
  payment_id: string | null;
  payment_url: string | null;
  status: string | null;
  access_type: string | null;
  approved_at: string | null;
  notes: string | null;
};

type Course = {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  badge: string | null;
  is_active: boolean | null;
  price_cents: number | null;
  payment_url: string | null;
  is_paid: boolean | null;
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

function getStaffRole(profile: any) {
  if (profile?.staff_role) return profile.staff_role;
  if (profile?.role === "admin") return "ceo_fatorz";
  return "none";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatMoneyFromCents(value: number | null | undefined) {
  const cents = Number(value || 0);

  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getOrderStatusClass(status: string | null | undefined) {
  if (status === "completed" || status === "concluido") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "pending" || status === "pendente") {
    return "border-orange-400/30 bg-orange-500/10 text-orange-300";
  }

  if (status === "cancelled" || status === "cancelado") {
    return "border-red-400/30 bg-red-500/10 text-red-300";
  }

  return "border-blue-400/30 bg-blue-500/10 text-blue-300";
}

function getOrderStatusLabel(status: string | null | undefined) {
  if (status === "completed" || status === "concluido") return "Concluído";
  if (status === "pending" || status === "pendente") return "Pendente";
  if (status === "cancelled" || status === "cancelado") return "Cancelado";
  if (status === "in_progress" || status === "andamento") return "Em andamento";

  return status || "Em análise";
}

function PanelIcon({
  children,
  color = "text-[#ff0096]",
}: {
  children: string;
  color?: string;
}) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl shadow-[0_0_24px_rgba(255,255,255,0.03)] ${color}`}
    >
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  color = "text-[#ff0096]",
}: {
  icon: string;
  label: string;
  value: string | number;
  trend: string;
  color?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#08080d]/90 p-5 shadow-[0_0_35px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#0d0d15]">
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-white/5 blur-2xl transition group-hover:bg-white/10" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
            {label}
          </p>

          <h3 className="truncate text-2xl font-black tracking-tight text-white md:text-3xl">
            {value}
          </h3>

          <p className="mt-2 text-[11px] font-black text-emerald-300">
            {trend}
          </p>
        </div>

        <PanelIcon color={color}>{icon}</PanelIcon>
      </div>
    </div>
  );
}

function MiniChart() {
  return (
    <div className="relative h-[260px] overflow-hidden rounded-[28px] border border-white/10 bg-[#08080d]/90 p-5 shadow-[0_0_45px_rgba(124,58,237,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-black text-zinc-200">Resumo de atividades</p>

        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-zinc-500">
          Este mês
        </span>
      </div>

      <div className="absolute left-5 top-16 bottom-10 flex flex-col justify-between text-[10px] text-zinc-700">
        <span>4K</span>
        <span>3K</span>
        <span>2K</span>
        <span>1K</span>
        <span>0</span>
      </div>

      <div className="absolute left-14 right-5 top-16 bottom-12">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />

        <svg viewBox="0 0 520 180" className="relative h-full w-full">
          <defs>
            <linearGradient id="fatorzLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ff0096" />
              <stop offset="48%" stopColor="#9123ff" />
              <stop offset="100%" stopColor="#00a3ff" />
            </linearGradient>

            <linearGradient id="fatorzArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#9123ff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#005cff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M0 150 L35 120 L70 135 L110 80 L145 95 L185 45 L230 70 L275 32 L320 98 L365 58 L410 76 L460 24 L520 48 L520 180 L0 180 Z"
            fill="url(#fatorzArea)"
          />

          <path
            d="M0 150 C22 132 24 120 35 120 C52 120 54 138 70 135 C92 130 91 82 110 80 C134 78 124 96 145 95 C166 94 168 46 185 45 C211 44 204 72 230 70 C252 68 251 34 275 32 C302 30 293 98 320 98 C344 98 342 58 365 58 C386 58 389 78 410 76 C437 74 433 24 460 24 C487 24 492 48 520 48"
            fill="none"
            stroke="url(#fatorzLine)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="absolute bottom-5 left-14 right-5 flex justify-between text-[10px] text-zinc-700">
        <span>01</span>
        <span>05</span>
        <span>10</span>
        <span>15</span>
        <span>20</span>
        <span>25</span>
        <span>30</span>
      </div>
    </div>
  );
}

export default function Dashboard({ user, profile }: DashboardProps) {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const customerTag = getCustomerTag(profile);
  const staffRole = getStaffRole(profile);

  const customerLabel = customerTagLabels[customerTag] || "Free";
  const staffLabel = staffRoleLabels[staffRole] || "Aluno/Cliente";

  const isTeam = staffRole !== "none";

  useEffect(() => {
    loadDashboard();
  }, [user?.id, user?.email]);

  async function loadDashboard() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [ordersResponse, purchasesResponse, coursesResponse] =
      await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .or(`customer_email.eq.${user.email},user_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(8),

        supabase
          .from("course_purchases")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("courses")
          .select("*")
          .eq("is_active", true)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(6),
      ]);

    setLoading(false);

    if (ordersResponse.error) {
      console.log("Erro ao carregar pedidos:", ordersResponse.error);
    } else {
      setOrders(ordersResponse.data || []);
    }

    if (purchasesResponse.error) {
      console.log("Erro ao carregar compras Academy:", purchasesResponse.error);
    } else {
      setPurchases(purchasesResponse.data || []);
    }

    if (coursesResponse.error) {
      console.log("Erro ao carregar cursos:", coursesResponse.error);
    } else {
      setCourses(coursesResponse.data || []);
    }
  }

  const approvedPurchases = useMemo(() => {
    return purchases.filter((purchase) => purchase.status === "approved");
  }, [purchases]);

  const pendingPurchases = useMemo(() => {
    return purchases.filter((purchase) => purchase.status === "pending");
  }, [purchases]);

  const availableCourses = useMemo(() => {
    return courses.filter((course) => {
      const alreadyBought = approvedPurchases.some(
        (purchase) => Number(purchase.course_id) === Number(course.id)
      );

      return !alreadyBought;
    });
  }, [courses, approvedPurchases]);

  const pendingOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status === "pending" ||
        order.status === "pendente" ||
        order.status === "in_progress" ||
        order.status === "andamento" ||
        !order.status
    );
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === "completed" || order.status === "concluido"
    );
  }, [orders]);

  const greetingName =
    profile?.nome || profile?.name || user?.email?.split("@")[0] || "cliente";

  const totalSpent = formatMoney(profile?.total_spent);

  const recentActivities = [
    {
      icon: "🛒",
      title: orders[0]?.product_name || "Novo pedido recebido",
      subtitle: orders[0]
        ? getOrderStatusLabel(orders[0].status)
        : "#1025 - R$ 497,00",
      time: orders[0] ? formatDate(orders[0].created_at) : "há 5 min",
      color: "text-[#ff0096]",
    },
    {
      icon: "📦",
      title: approvedPurchases[0]?.course_title || "Curso liberado",
      subtitle: approvedPurchases[0]
        ? "Acesso vitalício"
        : "FatorZ Academy",
      time: approvedPurchases[0]
        ? formatDate(approvedPurchases[0].approved_at)
        : "há 15 min",
      color: "text-[#9123ff]",
    },
    {
      icon: "📅",
      title: pendingOrders.length ? "Pedido em andamento" : "Novo agendamento",
      subtitle: pendingOrders.length
        ? `${pendingOrders.length} ativo(s)`
        : "25/05 - 14:00",
      time: pendingOrders.length ? "agora" : "há 1 h",
      color: "text-[#00a3ff]",
    },
    {
      icon: "📄",
      title: "Conteúdo publicado",
      subtitle: "Promoção de Maio",
      time: "há 2 h",
      color: "text-[#00a3ff]",
    },
  ];

  if (loading) {
    return (
      <div className="text-white">
        <div className="rounded-[34px] border border-white/10 bg-[#08080d] p-8">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff0096]">
            FatorZ
          </p>

          <h1 className="mt-4 text-4xl font-black">
            Carregando dashboard...
          </h1>

          <p className="mt-3 text-zinc-500">Preparando seu painel premium.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#9123ff]/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-32 -z-10 h-[380px] w-[380px] rounded-full bg-[#005cff]/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[380px] w-[380px] rounded-full bg-[#ff0096]/10 blur-[100px]" />

      <section className="mb-6 overflow-hidden rounded-[32px] border border-white/10 bg-[#050509]/95 p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] md:p-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-[#ff0096]">
              Hub FatorZ
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              Dashboard
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-500 md:text-base">
              Bem-vindo ao centro de controle, {greetingName}. Acompanhe pedidos,
              cursos, entregas, serviços e movimentações da sua conta.
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
              {approvedPurchases.length} curso(s)
            </span>
          </div>
        </div>

        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            icon="🛒"
            label="Pedidos"
            value={orders.length}
            trend={`+${pendingOrders.length} ativo(s)`}
            color="text-[#ff0096]"
          />

          <StatCard
            icon="📦"
            label="Cursos"
            value={approvedPurchases.length}
            trend={`+${pendingPurchases.length} pendente(s)`}
            color="text-[#9123ff]"
          />

          <StatCard
            icon="📅"
            label="Agenda"
            value={pendingOrders.length}
            trend="+5% este mês"
            color="text-[#ff0096]"
          />

          <StatCard
            icon="👥"
            label="Total investido"
            value={totalSpent}
            trend="+18% este mês"
            color="text-[#00a3ff]"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.9fr]">
          <MiniChart />

          <div className="rounded-[28px] border border-white/10 bg-[#08080d]/90 p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-black text-zinc-200">
                Atividades recentes
              </p>

              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
            </div>

            <div className="space-y-4">
              {recentActivities.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg ${item.color}`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-white">
                        {item.title}
                      </h3>

                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="whitespace-nowrap text-xs text-zinc-600">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                  Academy
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  Seus cursos vitalícios
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  Cada curso comprado fica liberado individualmente na sua conta.
                </p>
              </div>

              <button
                onClick={() => navigate("/academy")}
                className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
              >
                Abrir Academy
              </button>
            </div>

            {approvedPurchases.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {approvedPurchases.slice(0, 4).map((purchase) => (
                  <div
                    key={purchase.id}
                    className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                      Acesso vitalício
                    </p>

                    <h3 className="mt-2 text-lg font-black">
                      {purchase.course_title || `Curso #${purchase.course_id}`}
                    </h3>

                    <p className="mt-2 text-xs text-emerald-100/60">
                      Liberado em {formatDate(purchase.approved_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/40 p-5">
                <h3 className="text-xl font-black">
                  Você ainda não tem cursos liberados.
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Acesse o catálogo da Academy, escolha um curso e compre acesso
                  vitalício individual.
                </p>

                <button
                  onClick={() => navigate("/academy")}
                  className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-zinc-200"
                >
                  Ver cursos disponíveis
                </button>
              </div>
            )}

            {pendingPurchases.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                  Compras pendentes
                </p>

                <div className="space-y-3">
                  {pendingPurchases.slice(0, 3).map((purchase) => (
                    <div
                      key={purchase.id}
                      className="rounded-[20px] border border-orange-400/20 bg-orange-500/10 p-4"
                    >
                      <h3 className="font-black">
                        {purchase.course_title || `Curso #${purchase.course_id}`}
                      </h3>

                      <p className="mt-1 text-sm text-orange-100/70">
                        Criado em {formatDateTime(purchase.created_at)}. Após
                        confirmação, a FatorZ libera o acesso vitalício.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                  Pedidos
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  Últimas solicitações
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  Acompanhe produtos, serviços e projetos solicitados na FatorZ.
                </p>
              </div>

              <button
                onClick={() => navigate("/minhas-entregas")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
              >
                Ver entregas
              </button>
            </div>

            {orders.length ? (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[22px] border border-white/10 bg-black/35 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-black">
                          {order.product_name || `Pedido #${order.id}`}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          Criado em {formatDateTime(order.created_at)}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getOrderStatusClass(
                          order.status
                        )}`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/40 p-5">
                <h3 className="text-xl font-black">
                  Nenhum pedido encontrado.
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Quando você contratar uma solução FatorZ, ela aparecerá aqui
                  para acompanhamento.
                </p>

                <button
                  onClick={() => navigate("/")}
                  className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-zinc-200"
                >
                  Ver soluções
                </button>
              </div>
            )}
          </div>

          {availableCourses.length > 0 && (
            <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
                Próximos cursos
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Disponíveis para compra
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {availableCourses.slice(0, 6).map((course) => (
                  <button
                    key={course.id}
                    onClick={() =>
                      navigate(`/checkout/academy?courseId=${course.id}`)
                    }
                    className="rounded-[22px] border border-white/10 bg-black/35 p-5 text-left transition hover:-translate-y-1 hover:border-[#ff0096]/30 hover:bg-white/[0.06]"
                  >
                    {course.badge && (
                      <span className="mb-3 inline-flex rounded-full border border-[#ff0096]/25 bg-[#ff0096]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#ff7bd0]">
                        {course.badge}
                      </span>
                    )}

                    <h3 className="text-lg font-black">{course.title}</h3>

                    <p className="mt-2 text-sm text-zinc-500">
                      {course.subtitle ||
                        course.description ||
                        "Curso FatorZ Academy com acesso vitalício."}
                    </p>

                    <p className="mt-4 text-lg font-black">
                      {course.is_paid
                        ? formatMoneyFromCents(course.price_cents)
                        : "Gratuito"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
              Resumo da conta
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Cursos liberados</span>
                <span className="text-xl font-black text-emerald-300">
                  {approvedPurchases.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Compras pendentes</span>
                <span className="text-xl font-black text-orange-300">
                  {pendingPurchases.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Pedidos ativos</span>
                <span className="text-xl font-black text-blue-300">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  Entregas concluídas
                </span>
                <span className="text-xl font-black text-[#ff7bd0]">
                  {completedOrders.length}
                </span>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Total gasto</span>
                <span className="text-xl font-black text-yellow-300">
                  {totalSpent}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
              Ações rápidas
            </p>

            <h2 className="mt-3 text-3xl font-black">
              O que você quer fazer?
            </h2>

            <div className="mt-5 space-y-3">
              <button
                onClick={() => navigate("/academy")}
                className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#9123ff]/40 hover:bg-white/[0.07]"
              >
                <h3 className="font-black">Abrir Academy</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Veja cursos liberados e disponíveis.
                </p>
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#ff0096]/40 hover:bg-white/[0.07]"
              >
                <h3 className="font-black">Soluções FatorZ</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Sites, landing pages, criativos e SEO.
                </p>
              </button>

              <button
                onClick={() => navigate("/minhas-entregas")}
                className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#00a3ff]/40 hover:bg-white/[0.07]"
              >
                <h3 className="font-black">Minhas Entregas</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Acompanhe status, pedidos e projetos.
                </p>
              </button>

              <button
                onClick={() => navigate("/configuracoes")}
                className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#00a3ff]/40 hover:bg-white/[0.07]"
              >
                <h3 className="font-black">Configurações</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Atualize seus dados da conta.
                </p>
              </button>

              {isTeam && (
                <button
                  onClick={() => navigate("/admin")}
                  className="w-full rounded-[20px] border border-blue-400/20 bg-blue-500/10 p-4 text-left transition hover:bg-blue-500/15"
                >
                  <h3 className="font-black text-blue-200">
                    Abrir painel admin
                  </h3>

                  <p className="mt-1 text-sm text-blue-100/60">
                    Acesso interno da equipe FatorZ.
                  </p>
                </button>
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
                <p className="font-black break-all">{user?.email}</p>
              </div>

              <div>
                <p className="text-zinc-500">Tag</p>
                <p className="font-black">{customerLabel}</p>
              </div>

              <div>
                <p className="text-zinc-500">Cargo</p>
                <p className="font-black">{staffLabel}</p>
              </div>

              <div>
                <p className="text-zinc-500">Total gasto</p>
                <p className="font-black text-yellow-300">{totalSpent}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
