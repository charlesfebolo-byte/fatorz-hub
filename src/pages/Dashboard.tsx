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

function getTagClass(tag: string) {
  if (tag === "lendario") {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  if (tag === "premium") {
    return "border-pink-500/30 bg-pink-500/10 text-pink-300";
  }

  return "border-white/10 bg-white/[0.05] text-zinc-300";
}

function getStaffClass(role: string) {
  if (role === "ceo_fatorz") {
    return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300";
  }

  if (role !== "none") {
    return "border-blue-400/30 bg-blue-500/10 text-blue-300";
  }

  return "border-white/10 bg-white/[0.05] text-zinc-300";
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

  const quickActions = [
    {
      title: "Abrir Academy",
      description:
        approvedPurchases.length > 0
          ? "Continue assistindo seus cursos vitalícios liberados."
          : "Veja o catálogo de cursos e compre acesso vitalício individual.",
      button: approvedPurchases.length > 0 ? "Continuar aulas" : "Ver cursos",
      action: () => navigate("/academy"),
    },
    {
      title: "Soluções FatorZ",
      description:
        "Contrate sites, landing pages, criativos, SEO, identidade e assessorias.",
      button: "Ver produtos",
      action: () => navigate("/"),
    },
    {
      title: "Minhas Entregas",
      description:
        "Acompanhe pedidos, materiais, arquivos e status dos projetos com a FatorZ.",
      button: "Ver entregas",
      action: () => navigate("/minhas-entregas"),
    },
    {
      title: "Configurações",
      description:
        "Atualize seus dados, WhatsApp, Instagram, senha e status da conta.",
      button: "Editar conta",
      action: () => navigate("/configuracoes"),
    },
  ];

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Dashboard</h1>
        <p className="text-zinc-400">Carregando seu Hub FatorZ...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="relative overflow-hidden rounded-[42px] border border-white/10 bg-black p-6 md:p-10 mb-8">
        <div className="absolute -top-32 -right-28 h-80 w-80 rounded-full bg-[#ff0096]/20 blur-3xl" />
        <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-[#005cff]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_35%)]" />

        <div className="relative grid xl:grid-cols-[1.15fr_420px] gap-8 items-stretch">
          <div>
            <p className="text-pink-500 font-black uppercase tracking-[0.28em] text-sm mb-4">
              Hub FatorZ
            </p>

            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
              Bem-vindo,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
                {greetingName}.
              </span>
            </h1>

            <p className="max-w-4xl text-zinc-400 text-lg leading-relaxed">
              Aqui você acompanha seus cursos vitalícios, compras pendentes,
              pedidos, entregas e acessos dentro da estrutura digital da FatorZ.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <span
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest ${getTagClass(
                  customerTag
                )}`}
              >
                Cliente {customerLabel}
              </span>

              <span
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest ${getStaffClass(
                  staffRole
                )}`}
              >
                {staffLabel}
              </span>

              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-300">
                {approvedPurchases.length} curso(s) vitalício(s)
              </span>

              {pendingPurchases.length > 0 && (
                <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-300">
                  {pendingPurchases.length} compra(s) pendente(s)
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-4">
              Resumo da conta
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-400">Cursos liberados</span>
                <span className="text-2xl font-black text-emerald-300">
                  {approvedPurchases.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-400">Compras pendentes</span>
                <span className="text-2xl font-black text-orange-300">
                  {pendingPurchases.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-400">Pedidos em andamento</span>
                <span className="text-2xl font-black text-blue-300">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-400">Entregas concluídas</span>
                <span className="text-2xl font-black text-pink-300">
                  {completedOrders.length}
                </span>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-400">Total gasto</span>
                <span className="text-xl font-black text-yellow-300">
                  {formatMoney(profile?.total_spent)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Cursos liberados
          </p>
          <h2 className="mt-3 text-4xl font-black text-emerald-300">
            {approvedPurchases.length}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Compras pendentes
          </p>
          <h2 className="mt-3 text-4xl font-black text-orange-300">
            {pendingPurchases.length}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Pedidos ativos
          </p>
          <h2 className="mt-3 text-4xl font-black text-blue-300">
            {pendingOrders.length}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Tag da conta
          </p>
          <h2 className="mt-3 text-3xl font-black">{customerLabel}</h2>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_420px] gap-8">
        <div className="space-y-8">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
                  Academy
                </p>

                <h2 className="text-3xl md:text-4xl font-black">
                  Seus cursos vitalícios
                </h2>

                <p className="text-zinc-400 mt-3">
                  Cada curso comprado fica liberado individualmente na sua conta.
                </p>
              </div>

              <button
                onClick={() => navigate("/academy")}
                className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
              >
                Abrir Academy
              </button>
            </div>

            {approvedPurchases.length ? (
              <div className="grid md:grid-cols-2 gap-4">
                {approvedPurchases.slice(0, 4).map((purchase) => (
                  <div
                    key={purchase.id}
                    className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-5"
                  >
                    <p className="text-xs uppercase tracking-widest font-black text-emerald-300 mb-2">
                      Acesso vitalício
                    </p>

                    <h3 className="text-xl font-black">
                      {purchase.course_title || `Curso #${purchase.course_id}`}
                    </h3>

                    <p className="text-sm text-emerald-100/70 mt-2">
                      Liberado em {formatDate(purchase.approved_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[26px] border border-white/10 bg-black/40 p-6">
                <h3 className="text-2xl font-black mb-3">
                  Você ainda não tem cursos liberados.
                </h3>

                <p className="text-zinc-400 mb-5">
                  Acesse o catálogo da Academy, escolha um curso e compre acesso
                  vitalício individual.
                </p>

                <button
                  onClick={() => navigate("/academy")}
                  className="rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
                >
                  Ver cursos disponíveis
                </button>
              </div>
            )}

            {pendingPurchases.length > 0 && (
              <div className="mt-6">
                <p className="text-orange-300 font-black uppercase tracking-[0.22em] text-xs mb-3">
                  Compras pendentes
                </p>

                <div className="space-y-3">
                  {pendingPurchases.slice(0, 3).map((purchase) => (
                    <div
                      key={purchase.id}
                      className="rounded-[22px] border border-orange-400/20 bg-orange-500/10 p-4"
                    >
                      <h3 className="font-black">
                        {purchase.course_title || `Curso #${purchase.course_id}`}
                      </h3>

                      <p className="text-sm text-orange-100/70 mt-1">
                        Criado em {formatDateTime(purchase.created_at)}. Após
                        confirmação, a FatorZ libera o acesso vitalício.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
                  Pedidos
                </p>

                <h2 className="text-3xl md:text-4xl font-black">
                  Últimas solicitações
                </h2>

                <p className="text-zinc-400 mt-3">
                  Acompanhe produtos, serviços e projetos solicitados na FatorZ.
                </p>
              </div>

              <button
                onClick={() => navigate("/minhas-entregas")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white transition hover:bg-white/[0.08]"
              >
                Ver entregas
              </button>
            </div>

            {orders.length ? (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[24px] border border-white/10 bg-black/35 p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">
                          {order.product_name || `Pedido #${order.id}`}
                        </h3>

                        <p className="text-sm text-zinc-500 mt-1">
                          Criado em {formatDateTime(order.created_at)}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${getOrderStatusClass(
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
              <div className="rounded-[26px] border border-white/10 bg-black/40 p-6">
                <h3 className="text-2xl font-black mb-3">
                  Nenhum pedido encontrado.
                </h3>

                <p className="text-zinc-400 mb-5">
                  Quando você contratar uma solução FatorZ, ela aparecerá aqui
                  para acompanhamento.
                </p>

                <button
                  onClick={() => navigate("/")}
                  className="rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
                >
                  Ver soluções
                </button>
              </div>
            )}
          </div>

          {availableCourses.length > 0 && (
            <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-6 md:p-8">
              <div className="mb-6">
                <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
                  Próximos cursos
                </p>

                <h2 className="text-3xl md:text-4xl font-black">
                  Disponíveis para compra
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {availableCourses.slice(0, 4).map((course) => (
                  <button
                    key={course.id}
                    onClick={() => navigate(`/checkout/academy?courseId=${course.id}`)}
                    className="rounded-[26px] border border-white/10 bg-black/35 p-5 text-left transition hover:border-pink-500/30 hover:bg-white/[0.06]"
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      {course.badge && (
                        <span className="rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-pink-300">
                          {course.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-black">{course.title}</h3>

                    <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                      {course.subtitle ||
                        course.description ||
                        "Curso FatorZ Academy com acesso vitalício."}
                    </p>

                    <p className="text-lg font-black mt-4">
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

        <aside className="space-y-6">
          <div className="rounded-[36px] border border-white/10 bg-black/70 p-6">
            <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
              Ações rápidas
            </p>

            <h2 className="text-3xl font-black mb-5">
              O que você quer fazer?
            </h2>

            <div className="space-y-4">
              {quickActions.map((item) => (
                <button
                  key={item.title}
                  onClick={item.action}
                  className="w-full rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:bg-white/[0.08]"
                >
                  <h3 className="font-black text-white">{item.title}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {item.description}
                  </p>

                  <span className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-black text-black">
                    {item.button}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-3">
              Dados da conta
            </p>

            <div className="space-y-4 text-sm">
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
                <p className="font-black text-yellow-300">
                  {formatMoney(profile?.total_spent)}
                </p>
              </div>
            </div>
          </div>

          {isTeam && (
            <div className="rounded-[36px] border border-blue-400/20 bg-blue-500/10 p-6">
              <p className="text-xs uppercase tracking-widest font-black text-blue-300 mb-3">
                Equipe FatorZ
              </p>

              <h2 className="text-2xl font-black mb-3">{staffLabel}</h2>

              <p className="text-blue-100/70 text-sm leading-relaxed mb-5">
                Sua conta possui cargo interno e pode acessar áreas
                administrativas conforme as permissões configuradas.
              </p>

              <button
                onClick={() => navigate("/admin")}
                className="rounded-2xl bg-blue-500 px-5 py-3 font-black text-black transition hover:opacity-90"
              >
                Abrir painel admin
              </button>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}