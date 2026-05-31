import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type SettingsProps = {
  user: any;
  profile: any;
};

export default function Settings({ user, profile }: SettingsProps) {
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.nome || profile?.name || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [instagram, setInstagram] = useState(profile?.instagram || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const isAdmin = profile?.role === "admin";
  const academyActive =
    !!profile?.academy_expires_at &&
    new Date(profile.academy_expires_at).getTime() > new Date().getTime();

  const accountType = isAdmin ? "Administrador" : "Gratuita";
  const academyStatus = academyActive ? "Liberada" : "Bloqueada";

  const profileCompletion = useMemo(() => {
    let score = 30;
    if (name.trim()) score += 25;
    if (whatsapp.trim()) score += 20;
    if (instagram.trim()) score += 15;
    if (user?.email) score += 10;
    return Math.min(score, 100);
  }, [name, whatsapp, instagram, user?.email]);

  function formatDate(date: string | null | undefined) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function saveProfile() {
    if (!user?.id) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        nome: name.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      console.log("Erro ao salvar perfil:", error);
      setMessage(
        "Não consegui salvar. Se aparecer erro de coluna, precisamos criar whatsapp/instagram na tabela profiles."
      );
      return;
    }

    setMessage("Perfil atualizado com sucesso.");
  }

  async function resetPassword() {
    if (!user?.email) {
      alert("Não encontrei o e-mail da conta.");
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + "/login",
    });

    setResetLoading(false);

    if (error) {
      console.log("Erro ao enviar redefinição:", error);
      alert("Não consegui enviar o e-mail de redefinição.");
      return;
    }

    alert("Enviamos um e-mail para redefinir sua senha.");
  }

  async function logout() {
    const confirmLogout = confirm("Tem certeza que quer sair da conta?");

    if (!confirmLogout) return;

    setLogoutLoading(true);

    const { error } = await supabase.auth.signOut();

    setLogoutLoading(false);

    if (error) {
      console.log("Erro ao sair:", error);
      alert("Erro ao sair da conta.");
      return;
    }

    navigate("/login");
  }

  const quickActions = [
    {
      title: "Academy",
      description: academyActive
        ? "Acesse suas aulas e continue evoluindo."
        : "Sua Academy ainda não está liberada.",
      button: academyActive ? "Abrir Academy" : "Ver produtos",
      action: () => navigate(academyActive ? "/academy" : "/"),
    },
    {
      title: "Mural",
      description: "Veja avisos, novidades e atualizações da FatorZ.",
      button: "Abrir mural",
      action: () => navigate("/mural"),
    },
    {
      title: "Entregas",
      description: "Acompanhe materiais, pedidos e arquivos enviados.",
      button: "Minhas entregas",
      action: () => navigate("/minhas-entregas"),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto text-white">
      <section className="relative overflow-hidden rounded-[42px] border border-white/10 bg-black p-6 md:p-10 mb-8">
        <div className="absolute -top-32 -right-28 h-80 w-80 rounded-full bg-[#005cff]/25 blur-3xl" />
        <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-[#ff0096]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_35%)]" />

        <div className="relative grid xl:grid-cols-[1.1fr_420px] gap-8 items-stretch">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/25 bg-pink-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-pink-300 mb-6">
              Conta FatorZ
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
              Configurações com cara de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
                plataforma premium.
              </span>
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-3xl">
              Ajuste seus dados, acompanhe o status da sua conta e mantenha seu
              acesso organizado dentro do Hub FatorZ.
            </p>

            <div className="grid md:grid-cols-3 gap-3 mt-8">
              <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
                  Tipo de conta
                </p>
                <p className="text-2xl font-black mt-2">{accountType}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
                  Academy
                </p>
                <p
                  className={`text-2xl font-black mt-2 ${
                    academyActive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {academyStatus}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
                  Perfil
                </p>
                <p className="text-2xl font-black mt-2">
                  {profileCompletion}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-zinc-950/90 p-6 flex flex-col justify-between">
            <div>
              <p className="text-pink-400 font-black uppercase tracking-widest text-xs mb-3">
                Resumo
              </p>

              <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden mb-6">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              <div className="space-y-3">
                <div className="rounded-3xl bg-black border border-white/10 p-5">
                  <p className="text-zinc-500 text-sm">E-mail da conta</p>
                  <p className="text-white font-black mt-1 break-all">
                    {user?.email || "—"}
                  </p>
                </div>

                <div className="rounded-3xl bg-black border border-white/10 p-5">
                  <p className="text-zinc-500 text-sm">Vencimento Academy</p>
                  <p className="text-white font-black mt-1">
                    {formatDate(profile?.academy_expires_at)}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/mural")}
              className="mt-5 w-full bg-white text-black hover:bg-zinc-200 px-6 py-4 rounded-2xl font-black transition"
            >
              Ver novidades no Mural
            </button>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_420px] gap-8">
        <div className="rounded-[40px] border border-white/10 bg-zinc-950/85 p-6 md:p-8">
          <div className="mb-8">
            <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
              Dados do perfil
            </p>

            <h2 className="text-3xl md:text-4xl font-black">
              Informações principais.
            </h2>

            <p className="text-zinc-400 mt-3">
              Esses dados ajudam a FatorZ entender sua conta, organizar suporte
              e deixar sua experiência mais personalizada.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <label className="block">
              <span className="text-sm text-zinc-400 font-black">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-pink-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-zinc-400 font-black">WhatsApp</span>
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="Ex: 51999999999"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-pink-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-zinc-400 font-black">Instagram</span>
              <input
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
                placeholder="@seuinstagram"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-pink-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-zinc-400 font-black">
                E-mail da conta
              </span>
              <input
                value={user?.email || ""}
                disabled
                className="mt-2 w-full rounded-3xl border border-white/10 bg-black/60 px-5 py-4 text-zinc-500 outline-none"
              />
            </label>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4 mt-7">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] hover:opacity-90 disabled:opacity-60 px-7 py-4 rounded-2xl font-black transition"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            {message && (
              <p className="text-sm text-zinc-400 font-bold">{message}</p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {quickActions.map((item) => (
            <div
              key={item.title}
              className="rounded-[32px] border border-white/10 bg-black p-6"
            >
              <h3 className="text-2xl font-black">{item.title}</h3>
              <p className="text-zinc-400 mt-2 leading-relaxed">
                {item.description}
              </p>

              <button
                onClick={item.action}
                className="mt-5 w-full bg-white text-black hover:bg-zinc-200 px-5 py-4 rounded-2xl font-black transition"
              >
                {item.button}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-8 mt-8">
        <div className="rounded-[36px] border border-white/10 bg-black p-6 md:p-8">
          <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
            Segurança
          </p>

          <h2 className="text-3xl font-black mb-4">Senha</h2>

          <p className="text-zinc-400 leading-relaxed mb-6">
            Envie um e-mail para redefinir sua senha de acesso com segurança.
          </p>

          <button
            onClick={resetPassword}
            disabled={resetLoading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 px-6 py-4 rounded-2xl font-black transition"
          >
            {resetLoading ? "Enviando..." : "Redefinir senha"}
          </button>
        </div>

        <div className="rounded-[36px] border border-red-500/20 bg-red-950/10 p-6 md:p-8">
          <p className="text-red-400 font-black uppercase tracking-widest mb-3">
            Sessão
          </p>

          <h2 className="text-3xl font-black mb-4">Sair da conta</h2>

          <p className="text-zinc-400 leading-relaxed mb-6">
            Encerre sua sessão neste dispositivo. Você poderá entrar novamente
            usando seu e-mail e senha.
          </p>

          <button
            onClick={logout}
            disabled={logoutLoading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 px-6 py-4 rounded-2xl font-black transition"
          >
            {logoutLoading ? "Saindo..." : "Sair da conta"}
          </button>
        </div>
      </section>
    </div>
  );
}
