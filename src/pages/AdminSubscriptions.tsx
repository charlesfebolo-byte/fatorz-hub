import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Subscription = {
  id: number;
  created_at: string;
  user_email: string | null;
  product_id: string | null;
  payment_id: string | null;
  status: string | null;
  expires_at: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  nome: string | null;
  role: string | null;
  academy_expires_at: string | null;
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: subscriptionsData, error: subscriptionsError } =
      await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (subscriptionsError) {
      console.log("Erro ao carregar assinaturas:", subscriptionsError);
      alert("Erro ao carregar assinaturas.");
    }

    if (profilesError) {
      console.log("Erro ao carregar usuários:", profilesError);
      alert("Erro ao carregar usuários.");
    }

    setSubscriptions(subscriptionsData || []);
    setProfiles(profilesData || []);
    setLoading(false);
  }

  function getProfileByEmail(email: string | null) {
    if (!email) return null;

    return (
      profiles.find(
        (profile) => profile.email?.toLowerCase() === email.toLowerCase()
      ) || null
    );
  }

  function formatDate(date: string | null) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(date: string | null) {
    if (!date) return "—";

    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

    return "bg-zinc-700 text-zinc-300 border-zinc-600";
  }

  function getAccessLabel(subscription: Subscription) {
    if (subscription.status !== "approved") {
      return "Sem acesso";
    }

    if (!subscription.expires_at) {
      return "Sem vencimento";
    }

    const expired =
      new Date(subscription.expires_at).getTime() <= new Date().getTime();

    return expired ? "Vencido" : "Ativo";
  }

  function getAccessStyle(subscription: Subscription) {
    const label = getAccessLabel(subscription);

    if (label === "Ativo") {
      return "bg-green-500/20 text-green-400";
    }

    if (label === "Vencido") {
      return "bg-red-500/20 text-red-400";
    }

    return "bg-zinc-800 text-zinc-400";
  }

  async function approveSubscription(subscription: Subscription) {
    if (!subscription.user_email) {
      alert("Essa assinatura não tem email.");
      return;
    }

    const profile = getProfileByEmail(subscription.user_email);

    if (!profile) {
      alert(
        "Não encontrei um usuário com esse email em profiles. O usuário precisa ter conta criada."
      );
      return;
    }

    const confirmApprove = confirm(
      `Liberar Academy por 30 dias para ${subscription.user_email}?`
    );

    if (!confirmApprove) return;

    setActionLoading(subscription.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .update({
        status: "approved",
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", subscription.id);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "premium",
        academy_expires_at: expiresAt.toISOString(),
      })
      .eq("id", profile.id);

    setActionLoading(null);

    if (subscriptionError || profileError) {
      console.log("Erro assinatura:", subscriptionError);
      console.log("Erro profile:", profileError);
      alert("Erro ao liberar Academy.");
      return;
    }

    alert("Academy liberado por 30 dias.");
    loadData();
  }

  async function renewSubscription(subscription: Subscription) {
    if (!subscription.user_email) {
      alert("Essa assinatura não tem email.");
      return;
    }

    const profile = getProfileByEmail(subscription.user_email);

    if (!profile) {
      alert(
        "Não encontrei um usuário com esse email em profiles. O usuário precisa ter conta criada."
      );
      return;
    }

    const confirmRenew = confirm(
      `Renovar Academy por +30 dias para ${subscription.user_email}?`
    );

    if (!confirmRenew) return;

    setActionLoading(subscription.id);

    const currentExpiration =
      subscription.expires_at &&
      new Date(subscription.expires_at).getTime() > new Date().getTime()
        ? new Date(subscription.expires_at)
        : new Date();

    currentExpiration.setDate(currentExpiration.getDate() + 30);

    const newExpiresAt = currentExpiration.toISOString();

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .update({
        status: "approved",
        expires_at: newExpiresAt,
      })
      .eq("id", subscription.id);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "premium",
        academy_expires_at: newExpiresAt,
      })
      .eq("id", profile.id);

    setActionLoading(null);

    if (subscriptionError || profileError) {
      console.log("Erro assinatura:", subscriptionError);
      console.log("Erro profile:", profileError);
      alert("Erro ao renovar Academy.");
      return;
    }

    alert("Academy renovado por +30 dias.");
    loadData();
  }

  async function cancelSubscription(subscription: Subscription) {
    if (!subscription.user_email) {
      alert("Essa assinatura não tem email.");
      return;
    }

    const profile = getProfileByEmail(subscription.user_email);

    const confirmCancel = confirm(
      `Cancelar/remover acesso Academy de ${subscription.user_email}?`
    );

    if (!confirmCancel) return;

    setActionLoading(subscription.id);

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        expires_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    let profileError = null;

    if (profile) {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: "user",
          academy_expires_at: null,
        })
        .eq("id", profile.id);

      profileError = error;
    }

    setActionLoading(null);

    if (subscriptionError || profileError) {
      console.log("Erro assinatura:", subscriptionError);
      console.log("Erro profile:", profileError);
      alert("Erro ao cancelar acesso.");
      return;
    }

    alert("Acesso cancelado.");
    loadData();
  }

  async function deleteSubscription(subscription: Subscription) {
    const confirmDelete = confirm(
      `Apagar esta assinatura do histórico?\n\n${subscription.user_email}`
    );

    if (!confirmDelete) return;

    setActionLoading(subscription.id);

    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", subscription.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao apagar assinatura:", error);
      alert("Erro ao apagar assinatura.");
      return;
    }

    alert("Assinatura apagada.");
    loadData();
  }

  const filteredSubscriptions = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return subscriptions.filter((subscription) => {
      const matchesSearch =
        !searchValue ||
        subscription.user_email?.toLowerCase().includes(searchValue) ||
        subscription.product_id?.toLowerCase().includes(searchValue) ||
        subscription.payment_id?.toLowerCase().includes(searchValue) ||
        subscription.status?.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "todos" || subscription.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, search, statusFilter]);

  const totalPending = subscriptions.filter(
    (item) => item.status === "pending"
  ).length;

  const totalApproved = subscriptions.filter(
    (item) => item.status === "approved"
  ).length;

  const totalActive = subscriptions.filter((item) => {
    return (
      item.status === "approved" &&
      item.expires_at &&
      new Date(item.expires_at).getTime() > new Date().getTime()
    );
  }).length;

  const totalExpired = subscriptions.filter((item) => {
    return (
      item.status === "approved" &&
      item.expires_at &&
      new Date(item.expires_at).getTime() <= new Date().getTime()
    );
  }).length;

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Assinaturas</h1>
        <p className="text-zinc-400">Carregando assinaturas...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <div className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Admin
        </p>

        <h1 className="text-4xl font-black mb-2">Assinaturas Academy</h1>

        <p className="text-zinc-400">
          Controle pagamentos, pendências, liberações e vencimentos do Academy.
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pendentes</p>
          <h2 className="text-4xl font-black text-yellow-400">
            {totalPending}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Aprovadas</p>
          <h2 className="text-4xl font-black text-green-400">
            {totalApproved}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Ativas</p>
          <h2 className="text-4xl font-black text-pink-500">{totalActive}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Vencidas</p>
          <h2 className="text-4xl font-black text-red-400">{totalExpired}</h2>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <div className="grid md:grid-cols-[1fr_220px_160px] gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email, pagamento, status..."
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          >
            <option value="todos">Todos status</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovadas</option>
            <option value="cancelled">Canceladas</option>
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
        {filteredSubscriptions.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10">
            <h2 className="text-2xl font-black mb-2">
              Nenhuma assinatura encontrada.
            </h2>

            <p className="text-zinc-400">
              Quando alguém iniciar ou concluir pagamento, vai aparecer aqui.
            </p>
          </div>
        ) : (
          filteredSubscriptions.map((subscription) => {
            const profile = getProfileByEmail(subscription.user_email);
            const isActionLoading = actionLoading === subscription.id;

            return (
              <div
                key={subscription.id}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
              >
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span
                        className={`border px-4 py-2 rounded-xl font-black text-sm ${getStatusStyle(
                          subscription.status
                        )}`}
                      >
                        {subscription.status || "sem status"}
                      </span>

                      <span
                        className={`px-4 py-2 rounded-xl font-black text-sm ${getAccessStyle(
                          subscription
                        )}`}
                      >
                        {getAccessLabel(subscription)}
                      </span>

                      <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                        {subscription.product_id || "academy"}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black mb-2 break-all">
                      {subscription.user_email || "Sem email"}
                    </h2>

                    <p className="text-zinc-400 mb-4">
                      {profile
                        ? `Usuário encontrado: ${profile.nome || profile.email}`
                        : "Nenhum usuário encontrado com esse email em profiles."}
                    </p>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Criado em</p>
                        <p className="font-bold">
                          {formatDateTime(subscription.created_at)}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">Vence em</p>
                        <p className="font-bold">
                          {formatDate(subscription.expires_at)}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">
                          Payment ID
                        </p>
                        <p className="font-bold break-all">
                          {subscription.payment_id || "—"}
                        </p>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <p className="text-zinc-500 text-sm mb-1">
                          Role atual
                        </p>
                        <p className="font-bold">
                          {profile?.role || "sem perfil"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full xl:w-[260px] flex flex-col gap-3">
                    <button
                      onClick={() => approveSubscription(subscription)}
                      disabled={isActionLoading}
                      className="bg-green-500 hover:bg-green-600 text-black px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Liberar 30 dias
                    </button>

                    <button
                      onClick={() => renewSubscription(subscription)}
                      disabled={isActionLoading}
                      className="bg-pink-500 hover:bg-pink-600 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Renovar +30 dias
                    </button>

                    <button
                      onClick={() => cancelSubscription(subscription)}
                      disabled={isActionLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-black px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Cancelar acesso
                    </button>

                    <button
                      onClick={() => deleteSubscription(subscription)}
                      disabled={isActionLoading}
                      className="bg-red-600 hover:bg-red-700 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Apagar registro
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