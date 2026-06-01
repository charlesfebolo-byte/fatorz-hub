import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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

type Profile = {
  id: string;
  email: string | null;
  nome: string | null;
  role: string | null;
  customer_tag?: string | null;
  staff_role?: string | null;
  total_spent?: number | null;
};

type StatusFilter = "todos" | "pending" | "approved" | "cancelled";

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

function getAccessLabel(purchase: CoursePurchase) {
  if (purchase.status === "approved") return "Vitalício liberado";
  if (purchase.status === "pending") return "Pendente";
  if (purchase.status === "cancelled" || purchase.status === "canceled") {
    return "Cancelado";
  }

  return purchase.status || "Indefinido";
}

function getAccessClass(purchase: CoursePurchase) {
  const label = getAccessLabel(purchase);

  if (label === "Vitalício liberado") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  }

  if (label === "Pendente") {
    return "border-orange-400/30 bg-orange-500/10 text-orange-300";
  }

  if (label === "Cancelado") {
    return "border-red-400/30 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/[0.05] text-zinc-300";
}

function selectClassName() {
  return "rounded-2xl border border-white/10 bg-[#0B0B10] px-4 py-4 text-white outline-none focus:border-pink-500/40";
}

function optionStyle() {
  return {
    backgroundColor: "#0B0B10",
    color: "#ffffff",
  };
}

export default function AdminSubscriptions() {
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [purchasesResponse, profilesResponse] = await Promise.all([
      supabase
        .from("course_purchases")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setLoading(false);

    if (purchasesResponse.error) {
      console.log("Erro ao carregar compras:", purchasesResponse.error);
      alert("Erro ao carregar compras Academy.");
      return;
    }

    if (profilesResponse.error) {
      console.log("Erro ao carregar usuários:", profilesResponse.error);
    }

    setPurchases(purchasesResponse.data || []);
    setProfiles(profilesResponse.data || []);
  }

  function getProfileByEmail(email: string | null) {
    if (!email) return null;

    return (
      profiles.find(
        (profile) => profile.email?.toLowerCase() === email.toLowerCase()
      ) || null
    );
  }

  function getProfileByUserId(userId: string | null) {
    if (!userId) return null;

    return profiles.find((profile) => profile.id === userId) || null;
  }

  function getPurchaseProfile(purchase: CoursePurchase) {
    return getProfileByUserId(purchase.user_id) || getProfileByEmail(purchase.user_email);
  }

  async function updateProfileAfterApproval(purchase: CoursePurchase) {
    const profile = getPurchaseProfile(purchase);

    if (!profile) return;

    const currentSpent = Number(profile.total_spent || 0);

    await supabase
      .from("profiles")
      .update({
        customer_tag:
          currentSpent >= 5000 || profile.customer_tag === "lendario"
            ? "lendario"
            : "premium",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  async function approveLifetime(purchase: CoursePurchase) {
    const confirmApprove = confirm(
      `Liberar acesso vitalício?\n\nCliente: ${
        purchase.user_email || "sem email"
      }\nCurso: ${purchase.course_title || `Curso #${purchase.course_id}`}`
    );

    if (!confirmApprove) return;

    setActionLoading(purchase.id);

    const { error } = await supabase
      .from("course_purchases")
      .update({
        status: "approved",
        access_type: "lifetime",
        approved_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);

    await updateProfileAfterApproval(purchase);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao liberar vitalício:", error);
      alert("Erro ao liberar acesso vitalício.");
      return;
    }

    alert("Acesso vitalício liberado.");
    loadData();
  }

  async function cancelAccess(purchase: CoursePurchase) {
    const confirmCancel = confirm(
      `Cancelar esta compra/acesso?\n\nCliente: ${
        purchase.user_email || "sem email"
      }\nCurso: ${purchase.course_title || `Curso #${purchase.course_id}`}`
    );

    if (!confirmCancel) return;

    setActionLoading(purchase.id);

    const { error } = await supabase
      .from("course_purchases")
      .update({
        status: "cancelled",
      })
      .eq("id", purchase.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao cancelar acesso:", error);
      alert("Erro ao cancelar acesso.");
      return;
    }

    alert("Compra/acesso cancelado.");
    loadData();
  }

  async function savePaymentId(purchase: CoursePurchase) {
    const paymentId = prompt(
      "Cole o ID do pagamento Mercado Pago:",
      purchase.payment_id || ""
    );

    if (paymentId === null) return;

    setActionLoading(purchase.id);

    const { error } = await supabase
      .from("course_purchases")
      .update({
        payment_id: paymentId.trim() || null,
      })
      .eq("id", purchase.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao salvar payment_id:", error);
      alert("Erro ao salvar ID do pagamento.");
      return;
    }

    alert("Payment ID salvo.");
    loadData();
  }

  async function addAdminNote(purchase: CoursePurchase) {
    const note = prompt("Observação interna:", purchase.notes || "");

    if (note === null) return;

    setActionLoading(purchase.id);

    const { error } = await supabase
      .from("course_purchases")
      .update({
        notes: note.trim() || null,
      })
      .eq("id", purchase.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao salvar observação:", error);
      alert("Erro ao salvar observação.");
      return;
    }

    alert("Observação salva.");
    loadData();
  }

  const filteredPurchases = useMemo(() => {
    const value = search.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const profile = getPurchaseProfile(purchase);

      const matchesSearch =
        !value ||
        purchase.user_email?.toLowerCase().includes(value) ||
        purchase.course_title?.toLowerCase().includes(value) ||
        String(purchase.course_id || "").includes(value) ||
        purchase.payment_id?.toLowerCase().includes(value) ||
        purchase.status?.toLowerCase().includes(value) ||
        profile?.nome?.toLowerCase().includes(value) ||
        profile?.email?.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "pending" && purchase.status === "pending") ||
        (statusFilter === "approved" && purchase.status === "approved") ||
        (statusFilter === "cancelled" &&
          (purchase.status === "cancelled" || purchase.status === "canceled"));

      return matchesSearch && matchesStatus;
    });
  }, [purchases, profiles, search, statusFilter]);

  const stats = useMemo(() => {
    const total = purchases.length;
    const pending = purchases.filter((item) => item.status === "pending").length;
    const approved = purchases.filter((item) => item.status === "approved").length;
    const cancelled = purchases.filter(
      (item) => item.status === "cancelled" || item.status === "canceled"
    ).length;

    const uniqueStudents = new Set(
      purchases
        .filter((item) => item.status === "approved")
        .map((item) => item.user_id || item.user_email)
        .filter(Boolean)
    ).size;

    return {
      total,
      pending,
      approved,
      cancelled,
      uniqueStudents,
    };
  }, [purchases]);

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Acessos Academy</h1>
        <p className="text-zinc-400">Carregando compras vitalícias...</p>
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
            Academy Admin
          </p>

          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
            Compras vitalícias{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
              por curso.
            </span>
          </h1>

          <p className="max-w-4xl text-zinc-400 text-lg leading-relaxed">
            Gerencie compras pendentes, libere cursos vitalícios, salve Payment
            ID e acompanhe alunos da FatorZ Academy. Sem assinatura mensal e sem
            vencimento de 30 dias.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Total de compras
          </p>
          <h2 className="mt-3 text-4xl font-black">{stats.total}</h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Pendentes
          </p>
          <h2 className="mt-3 text-4xl font-black text-orange-300">
            {stats.pending}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Liberadas
          </p>
          <h2 className="mt-3 text-4xl font-black text-emerald-300">
            {stats.approved}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Alunos com acesso
          </p>
          <h2 className="mt-3 text-4xl font-black text-blue-300">
            {stats.uniqueStudents}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Canceladas
          </p>
          <h2 className="mt-3 text-4xl font-black text-red-300">
            {stats.cancelled}
          </h2>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 md:p-6 mb-8">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email, nome, curso, status ou payment ID..."
            className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={selectClassName()}
            style={{ colorScheme: "dark" }}
          >
            <option style={optionStyle()} value="todos">
              Todas as compras
            </option>
            <option style={optionStyle()} value="pending">
              Pendentes
            </option>
            <option style={optionStyle()} value="approved">
              Liberadas
            </option>
            <option style={optionStyle()} value="cancelled">
              Canceladas
            </option>
          </select>

          <button
            onClick={loadData}
            className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="space-y-5">
        {filteredPurchases.map((purchase) => {
          const profile = getPurchaseProfile(purchase);
          const actionDisabled = actionLoading === purchase.id;

          return (
            <article
              key={purchase.id}
              className="overflow-hidden rounded-[34px] border border-white/10 bg-black/50 backdrop-blur-xl"
            >
              <div className="border-b border-white/10 px-5 py-5 md:px-7">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${getAccessClass(
                        purchase
                      )}`}
                    >
                      {getAccessLabel(purchase)}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-400">
                      Compra #{purchase.id}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-400">
                      Criado em {formatDate(purchase.created_at)}
                    </span>

                    {purchase.access_type === "lifetime" && (
                      <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-yellow-300">
                        Vitalício
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-zinc-500">
                    Aprovado em:{" "}
                    <span className="font-black text-white">
                      {formatDateTime(purchase.approved_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[1.2fr_360px]">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-2">
                      Cliente
                    </p>

                    <h3 className="text-xl font-black break-all">
                      {profile?.nome || purchase.user_email || "Sem email"}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-400 break-all">
                      {purchase.user_email || profile?.email || "—"}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-2">
                      Curso
                    </p>

                    <h3 className="text-xl font-black">
                      {purchase.course_title || `Curso #${purchase.course_id}`}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-400">
                      ID do curso: {purchase.course_id || "—"}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-2">
                      Payment ID
                    </p>

                    <p className="text-sm text-zinc-300 break-all">
                      {purchase.payment_id || "Ainda não informado"}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-2">
                      Datas
                    </p>

                    <p className="text-sm text-zinc-300">
                      Criado: {formatDateTime(purchase.created_at)}
                    </p>

                    <p className="mt-2 text-sm text-zinc-300">
                      Aprovado: {formatDateTime(purchase.approved_at)}
                    </p>
                  </div>

                  {purchase.payment_url && (
                    <div className="md:col-span-2 rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-2">
                        Link de pagamento
                      </p>

                      <button
                        onClick={() => window.open(purchase.payment_url || "", "_blank")}
                        className="break-all text-left text-sm font-black text-pink-300 hover:text-pink-200"
                      >
                        {purchase.payment_url}
                      </button>
                    </div>
                  )}

                  {purchase.notes && (
                    <div className="md:col-span-2 rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-2">
                        Observação interna
                      </p>

                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                        {purchase.notes}
                      </p>
                    </div>
                  )}

                  {!profile && (
                    <div className="md:col-span-2 rounded-[24px] border border-orange-400/20 bg-orange-500/10 p-5">
                      <p className="font-black text-orange-300">
                        Atenção: não encontrei um usuário cadastrado com esse
                        email em profiles.
                      </p>

                      <p className="mt-2 text-sm text-orange-100/70">
                        A compra pode ficar registrada, mas o curso só aparece
                        corretamente na conta quando o email ou user_id bater com
                        um usuário cadastrado.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => savePaymentId(purchase)}
                    disabled={actionDisabled}
                    className="w-full rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:bg-zinc-200 disabled:opacity-60"
                  >
                    Salvar Payment ID
                  </button>

                  <button
                    onClick={() => approveLifetime(purchase)}
                    disabled={actionDisabled || purchase.status === "approved"}
                    className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black transition hover:opacity-90 disabled:opacity-40"
                  >
                    Liberar acesso vitalício
                  </button>

                  <button
                    onClick={() => addAdminNote(purchase)}
                    disabled={actionDisabled}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#9123ff] to-[#ff0096] px-5 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    Observação interna
                  </button>

                  <button
                    onClick={() => cancelAccess(purchase)}
                    disabled={actionDisabled}
                    className="w-full rounded-2xl bg-red-500 px-5 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    Cancelar compra/acesso
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {!filteredPurchases.length && (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-zinc-400">
          Nenhuma compra Academy encontrada com esse filtro.
        </div>
      )}
    </div>
  );
}