import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type CustomerTag = "free" | "premium" | "lendario";

type StaffRole =
  | "none"
  | "ceo_fatorz"
  | "diretor_operacional"
  | "gestor_entregas"
  | "criador_visual"
  | "suporte_fatorz"
  | "financeiro"
  | "mentor_academy";

type ProfileRow = {
  id: string;
  created_at: string | null;
  updated_at?: string | null;
  email: string | null;
  nome: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  role?: string | null;
  customer_tag?: CustomerTag | null;
  staff_role?: StaffRole | null;
  total_spent?: number | null;
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

const customerTagLabels: Record<CustomerTag, string> = {
  free: "Free",
  premium: "Premium",
  lendario: "Lendário",
};

const staffRoleLabels: Record<StaffRole, string> = {
  none: "Aluno/Cliente",
  ceo_fatorz: "CEO FatorZ",
  diretor_operacional: "Diretor Operacional",
  gestor_entregas: "Gestor de Entregas",
  criador_visual: "Criador Visual",
  suporte_fatorz: "Suporte FatorZ",
  financeiro: "Financeiro",
  mentor_academy: "Mentor Academy",
};

function getSafeCustomerTag(user: ProfileRow): CustomerTag {
  if (user.customer_tag === "premium") return "premium";
  if (user.customer_tag === "lendario") return "lendario";
  return "free";
}

function getSafeStaffRole(user: ProfileRow): StaffRole {
  if (user.staff_role) return user.staff_role;
  if (user.role === "admin") return "ceo_fatorz";
  return "none";
}

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

function selectClassName() {
  return "w-full rounded-2xl border border-white/10 bg-[#0B0B10] px-4 py-4 text-white outline-none focus:border-pink-500/40";
}

function optionStyle() {
  return {
    backgroundColor: "#0B0B10",
    color: "#ffffff",
  };
}

export default function AdminUsers() {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "todos" | "equipe" | "premium" | "lendario" | "comprou" | "pendente"
  >("todos");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);

    const [profilesResponse, purchasesResponse] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("course_purchases")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (profilesResponse.error) {
      console.log("Erro ao carregar usuários:", profilesResponse.error);
      alert("Erro ao carregar usuários.");
      return;
    }

    if (purchasesResponse.error) {
      console.log("Erro ao carregar compras:", purchasesResponse.error);
    }

    const normalized = (profilesResponse.data || []).map((item: any) => ({
      ...item,
      customer_tag: getSafeCustomerTag(item),
      staff_role: getSafeStaffRole(item),
      total_spent: Number(item.total_spent || 0),
    }));

    setUsers(normalized);
    setPurchases(purchasesResponse.data || []);
  }

  async function refreshUsers() {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }

  function updateUserField(
    userId: string,
    field: keyof ProfileRow,
    value: string | number | null
  ) {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              [field]: value,
            }
          : user
      )
    );
  }

  function getPurchasesByUser(user: ProfileRow) {
    return purchases.filter((purchase) => {
      const sameId =
        purchase.user_id && user.id && String(purchase.user_id) === String(user.id);

      const sameEmail =
        purchase.user_email &&
        user.email &&
        purchase.user_email.toLowerCase() === user.email.toLowerCase();

      return sameId || sameEmail;
    });
  }

  function getApprovedPurchasesByUser(user: ProfileRow) {
    return getPurchasesByUser(user).filter(
      (purchase) => purchase.status === "approved"
    );
  }

  function getPendingPurchasesByUser(user: ProfileRow) {
    return getPurchasesByUser(user).filter(
      (purchase) => purchase.status === "pending"
    );
  }

  async function saveUser(user: ProfileRow) {
    if (!user.id) return;

    setSavingId(user.id);

    const payload = {
      nome: user.nome?.trim() || null,
      whatsapp: user.whatsapp?.trim() || null,
      instagram: user.instagram?.trim() || null,
      customer_tag: getSafeCustomerTag(user),
      staff_role: getSafeStaffRole(user),
      total_spent: Number(user.total_spent || 0),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    setSavingId(null);

    if (error) {
      console.log("Erro ao salvar usuário:", error);
      alert("Erro ao salvar usuário.");
      return;
    }

    alert("Usuário salvo com sucesso.");
    loadUsers();
  }

  async function quickSetCustomerTag(user: ProfileRow, tag: CustomerTag) {
    const { error } = await supabase
      .from("profiles")
      .update({
        customer_tag: tag,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.log("Erro ao atualizar tag:", error);
      alert("Erro ao atualizar tag do usuário.");
      return;
    }

    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? {
              ...item,
              customer_tag: tag,
            }
          : item
      )
    );
  }

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    return users.filter((user) => {
      const customerTag = getSafeCustomerTag(user);
      const staffRole = getSafeStaffRole(user);
      const approvedPurchases = getApprovedPurchasesByUser(user);
      const pendingPurchases = getPendingPurchasesByUser(user);

      const courseNames = getPurchasesByUser(user)
        .map((purchase) => purchase.course_title || "")
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !value ||
        user.nome?.toLowerCase().includes(value) ||
        user.email?.toLowerCase().includes(value) ||
        user.whatsapp?.toLowerCase().includes(value) ||
        user.instagram?.toLowerCase().includes(value) ||
        customerTag.toLowerCase().includes(value) ||
        staffRole.toLowerCase().includes(value) ||
        courseNames.includes(value);

      const isTeam = staffRole !== "none";
      const isPremium = customerTag === "premium" || customerTag === "lendario";
      const isLendario = customerTag === "lendario";
      const bought = approvedPurchases.length > 0;
      const pending = pendingPurchases.length > 0;

      const matchesFilter =
        filter === "todos" ||
        (filter === "equipe" && isTeam) ||
        (filter === "premium" && isPremium) ||
        (filter === "lendario" && isLendario) ||
        (filter === "comprou" && bought) ||
        (filter === "pendente" && pending);

      return matchesSearch && matchesFilter;
    });
  }, [users, purchases, search, filter]);

  const stats = useMemo(() => {
    const total = users.length;
    const team = users.filter((user) => getSafeStaffRole(user) !== "none").length;

    const premium = users.filter((user) => {
      const tag = getSafeCustomerTag(user);
      return tag === "premium" || tag === "lendario";
    }).length;

    const lendario = users.filter(
      (user) => getSafeCustomerTag(user) === "lendario"
    ).length;

    const approvedPurchases = purchases.filter(
      (purchase) => purchase.status === "approved"
    ).length;

    const pendingPurchases = purchases.filter(
      (purchase) => purchase.status === "pending"
    ).length;

    const faturamento = users.reduce(
      (sum, user) => sum + Number(user.total_spent || 0),
      0
    );

    return {
      total,
      team,
      premium,
      lendario,
      approvedPurchases,
      pendingPurchases,
      faturamento,
    };
  }, [users, purchases]);

  function getTagClass(tag: CustomerTag) {
    if (tag === "lendario") {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }

    if (tag === "premium") {
      return "border-pink-500/30 bg-pink-500/10 text-pink-300";
    }

    return "border-white/10 bg-white/[0.05] text-zinc-300";
  }

  function getStaffRoleClass(role: StaffRole) {
    if (role === "ceo_fatorz") {
      return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300";
    }

    if (role !== "none") {
      return "border-blue-400/30 bg-blue-500/10 text-blue-300";
    }

    return "border-white/10 bg-white/[0.05] text-zinc-300";
  }

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Usuários</h1>
        <p className="text-zinc-400">Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-black p-6 md:p-10 mb-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#ff0096]/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#005cff]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%)]" />

        <div className="relative">
          <p className="text-pink-500 font-black uppercase tracking-[0.28em] text-sm mb-4">
            Administração FatorZ
          </p>

          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
            Usuários, equipe e{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
              compras vitalícias.
            </span>
          </h1>

          <p className="max-w-4xl text-zinc-400 text-lg leading-relaxed">
            Controle clientes, equipe interna, classificação Free / Premium /
            Lendário e compras vitalícias da FatorZ Academy. Sem ativação mensal.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5 mb-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Usuários
          </p>
          <h2 className="mt-3 text-4xl font-black">{stats.total}</h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Equipe
          </p>
          <h2 className="mt-3 text-4xl font-black text-blue-300">
            {stats.team}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Premium
          </p>
          <h2 className="mt-3 text-4xl font-black text-pink-300">
            {stats.premium}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Lendários
          </p>
          <h2 className="mt-3 text-4xl font-black text-yellow-300">
            {stats.lendario}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Cursos liberados
          </p>
          <h2 className="mt-3 text-4xl font-black text-emerald-300">
            {stats.approvedPurchases}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Pendentes
          </p>
          <h2 className="mt-3 text-4xl font-black text-orange-300">
            {stats.pendingPurchases}
          </h2>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 md:p-6 mb-8">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
          <div className="flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email, WhatsApp, Instagram, tag, cargo ou curso..."
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
            />
          </div>

          <button
            onClick={refreshUsers}
            className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { key: "todos", label: "Todos" },
            { key: "equipe", label: "Equipe" },
            { key: "premium", label: "Premium" },
            { key: "lendario", label: "Lendários" },
            { key: "comprou", label: "Comprou curso" },
            { key: "pendente", label: "Compra pendente" },
          ].map((item) => {
            const active = filter === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as any)}
                className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                  active
                    ? "border-pink-500/40 bg-pink-500/10 text-pink-300"
                    : "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        {filteredUsers.map((user) => {
          const customerTag = getSafeCustomerTag(user);
          const staffRole = getSafeStaffRole(user);
          const approvedPurchases = getApprovedPurchasesByUser(user);
          const pendingPurchases = getPendingPurchasesByUser(user);

          return (
            <article
              key={user.id}
              className="overflow-hidden rounded-[34px] border border-white/10 bg-black/50 backdrop-blur-xl"
            >
              <div className="border-b border-white/10 px-5 py-5 md:px-7">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${getTagClass(
                        customerTag
                      )}`}
                    >
                      {customerTagLabels[customerTag]}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${getStaffRoleClass(
                        staffRole
                      )}`}
                    >
                      {staffRoleLabels[staffRole]}
                    </span>

                    <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-300">
                      {approvedPurchases.length} curso(s) liberado(s)
                    </span>

                    {pendingPurchases.length > 0 && (
                      <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-orange-300">
                        {pendingPurchases.length} pendente(s)
                      </span>
                    )}

                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-400">
                      Criado em {formatDate(user.created_at)}
                    </span>
                  </div>

                  <div className="text-sm text-zinc-500">
                    Última atualização: {formatDateTime(user.updated_at)}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[1.25fr_340px]">
                <div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-black text-zinc-300">
                        Nome
                      </label>

                      <input
                        value={user.nome || ""}
                        onChange={(e) =>
                          updateUserField(user.id, "nome", e.target.value)
                        }
                        placeholder="Nome do usuário"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-black text-zinc-300">
                        Email
                      </label>

                      <input
                        value={user.email || ""}
                        disabled
                        className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-zinc-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-black text-zinc-300">
                        WhatsApp
                      </label>

                      <input
                        value={user.whatsapp || ""}
                        onChange={(e) =>
                          updateUserField(user.id, "whatsapp", e.target.value)
                        }
                        placeholder="51999999999"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-black text-zinc-300">
                        Instagram
                      </label>

                      <input
                        value={user.instagram || ""}
                        onChange={(e) =>
                          updateUserField(user.id, "instagram", e.target.value)
                        }
                        placeholder="@instagram"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-black text-zinc-300">
                        Tag do cliente
                      </label>

                      <select
                        value={customerTag}
                        onChange={(e) =>
                          updateUserField(
                            user.id,
                            "customer_tag",
                            e.target.value as CustomerTag
                          )
                        }
                        className={selectClassName()}
                        style={{ colorScheme: "dark" }}
                      >
                        <option style={optionStyle()} value="free">
                          Free
                        </option>
                        <option style={optionStyle()} value="premium">
                          Premium
                        </option>
                        <option style={optionStyle()} value="lendario">
                          Lendário
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-black text-zinc-300">
                        Cargo interno
                      </label>

                      <select
                        value={staffRole}
                        onChange={(e) =>
                          updateUserField(
                            user.id,
                            "staff_role",
                            e.target.value as StaffRole
                          )
                        }
                        className={selectClassName()}
                        style={{ colorScheme: "dark" }}
                      >
                        <option style={optionStyle()} value="none">
                          Aluno/Cliente
                        </option>
                        <option style={optionStyle()} value="ceo_fatorz">
                          CEO FatorZ
                        </option>
                        <option
                          style={optionStyle()}
                          value="diretor_operacional"
                        >
                          Diretor Operacional
                        </option>
                        <option style={optionStyle()} value="gestor_entregas">
                          Gestor de Entregas
                        </option>
                        <option style={optionStyle()} value="criador_visual">
                          Criador Visual
                        </option>
                        <option style={optionStyle()} value="suporte_fatorz">
                          Suporte FatorZ
                        </option>
                        <option style={optionStyle()} value="financeiro">
                          Financeiro
                        </option>
                        <option style={optionStyle()} value="mentor_academy">
                          Mentor Academy
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-black text-zinc-300">
                        Total gasto
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={user.total_spent || 0}
                        onChange={(e) =>
                          updateUserField(
                            user.id,
                            "total_spent",
                            Number(e.target.value || 0)
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none focus:border-pink-500/40"
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-3">
                      ID do usuário
                    </p>

                    <p className="break-all text-sm text-zinc-400">{user.id}</p>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-3">
                      Cursos liberados
                    </p>

                    {approvedPurchases.length ? (
                      <div className="flex flex-wrap gap-2">
                        {approvedPurchases.map((purchase) => (
                          <span
                            key={purchase.id}
                            className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300"
                          >
                            {purchase.course_title || `Curso #${purchase.course_id}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Nenhum curso liberado ainda.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-4">
                      Resumo rápido
                    </p>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400">Tag atual</span>
                        <span className="font-black text-white">
                          {customerTagLabels[customerTag]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400">Cargo</span>
                        <span className="font-black text-white text-right">
                          {staffRoleLabels[staffRole]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400">Cursos liberados</span>
                        <span className="font-black text-emerald-300">
                          {approvedPurchases.length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400">Compras pendentes</span>
                        <span className="font-black text-orange-300">
                          {pendingPurchases.length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400">Total gasto</span>
                        <span className="font-black text-white">
                          {formatMoney(user.total_spent)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => saveUser(user)}
                    disabled={savingId === user.id}
                    className="w-full rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:bg-zinc-200 disabled:opacity-60"
                  >
                    {savingId === user.id ? "Salvando..." : "Salvar usuário"}
                  </button>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => quickSetCustomerTag(user, "free")}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-black text-zinc-300 transition hover:bg-white/[0.08]"
                    >
                      Free
                    </button>

                    <button
                      onClick={() => quickSetCustomerTag(user, "premium")}
                      className="rounded-2xl border border-pink-500/20 bg-pink-500/10 px-3 py-3 text-sm font-black text-pink-300 transition hover:bg-pink-500/20"
                    >
                      Premium
                    </button>

                    <button
                      onClick={() => quickSetCustomerTag(user, "lendario")}
                      className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/20"
                    >
                      Lendário
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {!filteredUsers.length && (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-zinc-400">
          Nenhum usuário encontrado com esse filtro.
        </div>
      )}
    </div>
  );
}