import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  nome: string | null;
  instagram: string | null;
  whatsapp: string | null;
  role: string | null;
  academy_expires_at: string | null;
  created_at: string | null;
};

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Erro ao carregar usuários:", error);
      alert("Erro ao carregar usuários.");
      setLoading(false);
      return;
    }

    setProfiles(data || []);
    setLoading(false);
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("pt-BR", {
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

  function getAccessStatus(profile: Profile) {
    if (profile.role === "admin") return "Admin";

    const active =
      !!profile.academy_expires_at &&
      new Date(profile.academy_expires_at).getTime() > new Date().getTime();

    return active ? "Ativo" : "Bloqueado";
  }

  function getAccessStyle(profile: Profile) {
    const status = getAccessStatus(profile);

    if (status === "Admin") {
      return "bg-purple-500/20 text-purple-400";
    }

    if (status === "Ativo") {
      return "bg-green-500/20 text-green-400";
    }

    return "bg-red-500/20 text-red-400";
  }

  function getRoleStyle(role: string | null) {
    if (role === "admin") return "bg-purple-500/20 text-purple-400";
    if (role === "premium") return "bg-pink-500/20 text-pink-400";
    return "bg-zinc-800 text-zinc-400";
  }

  async function updateUserField(
    profileId: string,
    field: keyof Profile,
    value: string | null
  ) {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId
          ? {
              ...profile,
              [field]: value,
            }
          : profile
      )
    );
  }

  async function saveUser(profile: Profile) {
    setActionLoading(profile.id);

    const { error } = await supabase
      .from("profiles")
      .update({
        nome: profile.nome || "",
        instagram: profile.instagram || "",
        whatsapp: profile.whatsapp || "",
        role: profile.role || "user",
        academy_expires_at: profile.academy_expires_at || null,
      })
      .eq("id", profile.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao salvar usuário:", error);
      alert("Erro ao salvar usuário.");
      return;
    }

    alert("Usuário atualizado!");
    loadProfiles();
  }

  async function changeRole(profile: Profile, role: string) {
    const confirmChange = confirm(
      `Alterar tipo da conta ${profile.email} para "${role}"?`
    );

    if (!confirmChange) return;

    setActionLoading(profile.id);

    const { error } = await supabase
      .from("profiles")
      .update({
        role,
      })
      .eq("id", profile.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao alterar role:", error);
      alert("Erro ao alterar tipo de conta.");
      return;
    }

    alert("Tipo de conta atualizado!");
    loadProfiles();
  }

  async function releaseAcademy(profile: Profile) {
    const confirmRelease = confirm(
      `Liberar Academy por 30 dias para ${profile.email}?`
    );

    if (!confirmRelease) return;

    setActionLoading(profile.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "premium",
        academy_expires_at: expiresAt.toISOString(),
      })
      .eq("id", profile.id);

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        user_email: profile.email,
        product_id: "academy",
        payment_id: "manual_admin",
        status: "approved",
        expires_at: expiresAt.toISOString(),
      });

    setActionLoading(null);

    if (profileError || subscriptionError) {
      console.log("Erro profile:", profileError);
      console.log("Erro assinatura:", subscriptionError);
      alert("Erro ao liberar Academy.");
      return;
    }

    alert("Academy liberado por 30 dias!");
    loadProfiles();
  }

  async function renewAcademy(profile: Profile) {
    const confirmRenew = confirm(
      `Renovar Academy por +30 dias para ${profile.email}?`
    );

    if (!confirmRenew) return;

    setActionLoading(profile.id);

    const currentExpiration =
      profile.academy_expires_at &&
      new Date(profile.academy_expires_at).getTime() > new Date().getTime()
        ? new Date(profile.academy_expires_at)
        : new Date();

    currentExpiration.setDate(currentExpiration.getDate() + 30);

    const newExpiresAt = currentExpiration.toISOString();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "premium",
        academy_expires_at: newExpiresAt,
      })
      .eq("id", profile.id);

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        user_email: profile.email,
        product_id: "academy",
        payment_id: "manual_admin_renew",
        status: "approved",
        expires_at: newExpiresAt,
      });

    setActionLoading(null);

    if (profileError || subscriptionError) {
      console.log("Erro profile:", profileError);
      console.log("Erro assinatura:", subscriptionError);
      alert("Erro ao renovar Academy.");
      return;
    }

    alert("Academy renovado por +30 dias!");
    loadProfiles();
  }

  async function removeAcademy(profile: Profile) {
    const confirmRemove = confirm(
      `Remover acesso Academy de ${profile.email}?`
    );

    if (!confirmRemove) return;

    setActionLoading(profile.id);

    const { error } = await supabase
      .from("profiles")
      .update({
        role: profile.role === "admin" ? "admin" : "user",
        academy_expires_at: null,
      })
      .eq("id", profile.id);

    setActionLoading(null);

    if (error) {
      console.log("Erro ao remover Academy:", error);
      alert("Erro ao remover acesso.");
      return;
    }

    alert("Acesso removido!");
    loadProfiles();
  }

  const filteredProfiles = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return profiles;

    return profiles.filter((profile) => {
      return (
        profile.email?.toLowerCase().includes(value) ||
        profile.nome?.toLowerCase().includes(value) ||
        profile.instagram?.toLowerCase().includes(value) ||
        profile.whatsapp?.toLowerCase().includes(value) ||
        profile.role?.toLowerCase().includes(value)
      );
    });
  }, [profiles, search]);

  const totalUsers = profiles.length;
  const totalAdmins = profiles.filter((p) => p.role === "admin").length;
  const totalPremium = profiles.filter((p) => p.role === "premium").length;
  const totalActiveAcademy = profiles.filter((p) => {
    return (
      p.role === "admin" ||
      (!!p.academy_expires_at &&
        new Date(p.academy_expires_at).getTime() > new Date().getTime())
    );
  }).length;

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
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Admin
        </p>

        <h1 className="text-4xl font-black mb-2">Gerenciar Usuários</h1>

        <p className="text-zinc-400 max-w-3xl">
          Controle dados básicos, tipo de conta, acesso Academy e vencimentos
          dos usuários da FatorZ Hub.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Usuários</p>
          <h2 className="text-4xl font-black">{totalUsers}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Admins</p>
          <h2 className="text-4xl font-black text-purple-400">
            {totalAdmins}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Premium</p>
          <h2 className="text-4xl font-black text-pink-500">
            {totalPremium}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Academy ativo</p>
          <h2 className="text-4xl font-black text-green-400">
            {totalActiveAcademy}
          </h2>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <div className="grid md:grid-cols-[1fr_160px] gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, WhatsApp, Instagram ou tipo..."
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          />

          <button
            onClick={loadProfiles}
            className="bg-pink-500 hover:bg-pink-600 rounded-2xl p-4 font-black"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="space-y-5">
        {filteredProfiles.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10">
            <h2 className="text-2xl font-black mb-2">
              Nenhum usuário encontrado.
            </h2>

            <p className="text-zinc-400">
              Tente buscar por outro nome, email ou status.
            </p>
          </div>
        ) : (
          filteredProfiles.map((profile) => {
            const isActionLoading = actionLoading === profile.id;

            return (
              <div
                key={profile.id}
                className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6"
              >
                <div className="flex flex-col xl:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-3 mb-5">
                      <span
                        className={`px-4 py-2 rounded-xl font-black text-sm ${getRoleStyle(
                          profile.role
                        )}`}
                      >
                        {profile.role || "user"}
                      </span>

                      <span
                        className={`px-4 py-2 rounded-xl font-black text-sm ${getAccessStyle(
                          profile
                        )}`}
                      >
                        {getAccessStatus(profile)}
                      </span>

                      <span className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-xl font-bold text-sm">
                        Criado em {formatDate(profile.created_at)}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-zinc-400 font-bold mb-2">
                          Nome
                        </label>

                        <input
                          value={profile.nome || ""}
                          onChange={(e) =>
                            updateUserField(profile.id, "nome", e.target.value)
                          }
                          placeholder="Nome do usuário"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 font-bold mb-2">
                          Email
                        </label>

                        <input
                          value={profile.email || ""}
                          disabled
                          className="w-full bg-black border border-zinc-800 text-zinc-500 rounded-2xl p-4 outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-zinc-400 font-bold mb-2">
                          WhatsApp
                        </label>

                        <input
                          value={profile.whatsapp || ""}
                          onChange={(e) =>
                            updateUserField(
                              profile.id,
                              "whatsapp",
                              e.target.value
                            )
                          }
                          placeholder="51999999999"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 font-bold mb-2">
                          Instagram
                        </label>

                        <input
                          value={profile.instagram || ""}
                          onChange={(e) =>
                            updateUserField(
                              profile.id,
                              "instagram",
                              e.target.value
                            )
                          }
                          placeholder="@instagram"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-zinc-400 font-bold mb-2">
                          Tipo de conta
                        </label>

                        <select
                          value={profile.role || "user"}
                          onChange={(e) =>
                            updateUserField(profile.id, "role", e.target.value)
                          }
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
                        >
                          <option value="user">user</option>
                          <option value="premium">premium</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-zinc-400 font-bold mb-2">
                          Vencimento Academy
                        </label>

                        <input
                          type="date"
                          value={
                            profile.academy_expires_at
                              ? profile.academy_expires_at.slice(0, 10)
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value
                              ? new Date(e.target.value + "T23:59:59").toISOString()
                              : null;

                            updateUserField(
                              profile.id,
                              "academy_expires_at",
                              value
                            );
                          }}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div className="mt-5 bg-black border border-zinc-800 rounded-2xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">
                        ID do usuário
                      </p>

                      <p className="text-zinc-400 text-xs break-all">
                        {profile.id}
                      </p>

                      <p className="text-zinc-600 text-xs mt-2">
                        Cadastro: {formatDateTime(profile.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="w-full xl:w-[260px] flex flex-col gap-3">
                    <button
                      onClick={() => saveUser(profile)}
                      disabled={isActionLoading}
                      className="bg-white text-black hover:bg-zinc-200 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Salvar usuário
                    </button>

                    <button
                      onClick={() => releaseAcademy(profile)}
                      disabled={isActionLoading}
                      className="bg-green-500 hover:bg-green-600 text-black px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Liberar 30 dias
                    </button>

                    <button
                      onClick={() => renewAcademy(profile)}
                      disabled={isActionLoading}
                      className="bg-pink-500 hover:bg-pink-600 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Renovar +30 dias
                    </button>

                    <button
                      onClick={() => removeAcademy(profile)}
                      disabled={isActionLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-black px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Remover acesso
                    </button>

                    <button
                      onClick={() => changeRole(profile, "user")}
                      disabled={isActionLoading}
                      className="bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Tornar user
                    </button>

                    <button
                      onClick={() => changeRole(profile, "admin")}
                      disabled={isActionLoading}
                      className="bg-purple-600 hover:bg-purple-700 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      Tornar admin
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