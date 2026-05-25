import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

type Subscription = {
  id: number;
  created_at: string;
  user_email: string | null;
  product_id: string | null;
  payment_id: string | null;
  status: string | null;
  expires_at: string | null;
};

export default function Settings() {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [nome, setNome] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
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

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.log("Erro ao carregar perfil:", profileError);
    }

    setProfile(profileData || null);
    setNome(profileData?.nome || "");
    setInstagram(profileData?.instagram || "");
    setWhatsapp(profileData?.whatsapp || "");

    const { data: subscriptionsData, error: subscriptionsError } =
      await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_email", user.email)
        .eq("product_id", "academy")
        .order("created_at", { ascending: false });

    if (subscriptionsError) {
      console.log("Erro ao carregar assinaturas:", subscriptionsError);
    }

    setSubscriptions(subscriptionsData || []);
    setLoading(false);
  }

  async function saveProfile() {
    if (!user?.id) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        nome: nome.trim(),
        instagram: instagram.trim(),
        whatsapp: whatsapp.trim(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      console.log("Erro ao salvar perfil:", error);
      alert("Erro ao salvar alterações.");
      return;
    }

    alert("Conta atualizada com sucesso!");
    loadAccount();
  }

  async function sendPasswordReset() {
    if (!user?.email) return;

    const confirmSend = confirm(
      `Enviar email de redefinição de senha para ${user.email}?`
    );

    if (!confirmSend) return;

    setSendingPasswordEmail(true);

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + "/login",
    });

    setSendingPasswordEmail(false);

    if (error) {
      console.log("Erro ao enviar redefinição de senha:", error);
      alert("Erro ao enviar email de redefinição de senha.");
      return;
    }

    alert("Email de redefinição enviado.");
  }

  async function logout() {
    const confirmLogout = confirm("Tem certeza que quer sair da conta?");

    if (!confirmLogout) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log("Erro ao sair:", error);
      alert("Erro ao sair.");
      return;
    }

    navigate("/login");
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

  const academyActive =
    !!profile?.academy_expires_at &&
    new Date(profile.academy_expires_at).getTime() > new Date().getTime();

  const isAdmin = profile?.role === "admin";
  const lastSubscription = subscriptions[0];

  if (loading) {
    return (
      <div className="text-white w-full">
        <h1 className="text-4xl font-black mb-4">Minha conta</h1>
        <p className="text-zinc-400">Carregando informações da conta...</p>
      </div>
    );
  }

  return (
    <div className="text-white w-full">
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Minha conta
        </p>

        <h1 className="text-4xl font-black mb-2">
          Configurações da conta
        </h1>

        <p className="text-zinc-400 max-w-3xl">
          Edite seus dados básicos, veja seu status de acesso e gerencie
          opções simples da sua conta.
        </p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8">
            <h2 className="text-2xl font-black mb-6">Dados do perfil</h2>

            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-zinc-400 font-bold mb-2">
                  Nome
                </label>

                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-2">
                  WhatsApp
                </label>

                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: 51999999999"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-zinc-400 font-bold mb-2">
                  Instagram
                </label>

                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seuinstagram"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-2">
                  Email da conta
                </label>

                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full bg-black border border-zinc-800 text-zinc-500 rounded-2xl p-4 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className={`px-8 py-4 rounded-2xl font-black transition ${
                saving
                  ? "bg-zinc-700 cursor-not-allowed"
                  : "bg-pink-500 hover:bg-pink-600"
              }`}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8">
            <h2 className="text-2xl font-black mb-6">Segurança</h2>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-black border border-zinc-800 rounded-3xl p-6">
                <h3 className="text-xl font-black mb-3">Senha</h3>

                <p className="text-zinc-400 mb-5">
                  Envie um email para redefinir sua senha de acesso.
                </p>

                <button
                  onClick={sendPasswordReset}
                  disabled={sendingPasswordEmail}
                  className={`w-full px-6 py-4 rounded-2xl font-black transition ${
                    sendingPasswordEmail
                      ? "bg-zinc-700 cursor-not-allowed"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {sendingPasswordEmail
                    ? "Enviando..."
                    : "Redefinir senha"}
                </button>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl p-6">
                <h3 className="text-xl font-black mb-3">Sessão</h3>

                <p className="text-zinc-400 mb-5">
                  Saia da sua conta neste dispositivo.
                </p>

                <button
                  onClick={logout}
                  className="w-full bg-red-600 hover:bg-red-700 px-6 py-4 rounded-2xl font-black transition"
                >
                  Sair da conta
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8">
            <h2 className="text-2xl font-black mb-6">Histórico Academy</h2>

            {subscriptions.length === 0 ? (
              <div className="bg-black border border-zinc-800 rounded-3xl p-6">
                <p className="text-zinc-400">
                  Nenhuma assinatura Academy encontrada para sua conta.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptions.slice(0, 5).map((subscription) => {
                  const active =
                    subscription.status === "approved" &&
                    subscription.expires_at &&
                    new Date(subscription.expires_at).getTime() >
                      new Date().getTime();

                  return (
                    <div
                      key={subscription.id}
                      className="bg-black border border-zinc-800 rounded-3xl p-5"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-black">FatorZ Academy</h3>

                          <p className="text-zinc-500 text-sm">
                            Criado em {formatDateTime(subscription.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`px-4 py-2 rounded-xl font-black text-sm ${
                              subscription.status === "approved"
                                ? "bg-green-500/20 text-green-400"
                                : subscription.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
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
                            {active ? "Ativo" : "Sem acesso"}
                          </span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">
                            Vencimento
                          </p>

                          <p className="font-bold">
                            {formatDate(subscription.expires_at)}
                          </p>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">
                            Pagamento
                          </p>

                          <p className="font-bold break-all">
                            {subscription.payment_id || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8">
            <h2 className="text-2xl font-black mb-6">Resumo</h2>

            <div className="space-y-4">
              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-zinc-500 mb-1">Tipo de conta</p>

                <h3 className="text-3xl font-black">
                  {isAdmin
                    ? "Admin"
                    : profile?.role === "premium"
                    ? "Premium"
                    : "Gratuita"}
                </h3>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-zinc-500 mb-1">Academy</p>

                <h3
                  className={`text-3xl font-black ${
                    isAdmin || academyActive
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {isAdmin ? "Liberado" : academyActive ? "Ativo" : "Bloqueado"}
                </h3>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-zinc-500 mb-1">Vencimento</p>

                <h3 className="text-3xl font-black">
                  {isAdmin ? "Admin" : formatDate(profile?.academy_expires_at)}
                </h3>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-zinc-500 mb-1">Última assinatura</p>

                <h3 className="text-xl font-black">
                  {lastSubscription?.status || "Nenhuma"}
                </h3>

                {lastSubscription && (
                  <p className="text-zinc-500 text-sm mt-1">
                    {formatDateTime(lastSubscription.created_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate("/academy")}
                className="w-full bg-pink-500 hover:bg-pink-600 px-6 py-4 rounded-2xl font-black transition"
              >
                Abrir Academy
              </button>

              {!academyActive && !isAdmin && (
                <button
                  onClick={() => navigate("/checkout/academy")}
                  className="w-full bg-white text-black hover:bg-zinc-200 px-6 py-4 rounded-2xl font-black transition"
                >
                  Assinar Academy
                </button>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}