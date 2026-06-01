import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type SettingsProps = {
  user: any;
  profile: any;
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

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
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

export default function Settings({ user, profile }: SettingsProps) {
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.nome || profile?.name || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [instagram, setInstagram] = useState(profile?.instagram || "");
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);

  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const customerTag = getCustomerTag(profile);
  const staffRole = getStaffRole(profile);

  const customerLabel = customerTagLabels[customerTag] || "Free";
  const staffLabel = staffRoleLabels[staffRole] || "Aluno/Cliente";

  const isTeam = staffRole !== "none";

  useEffect(() => {
    loadPurchases();
  }, [user?.id]);

  async function loadPurchases() {
    if (!user?.id) {
      setLoadingPurchases(false);
      return;
    }

    setLoadingPurchases(true);

    const { data, error } = await supabase
      .from("course_purchases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLoadingPurchases(false);

    if (error) {
      console.log("Erro ao carregar compras Academy:", error);
      return;
    }

    setPurchases(data || []);
  }

  const approvedPurchases = useMemo(() => {
    return purchases.filter((purchase) => purchase.status === "approved");
  }, [purchases]);

  const pendingPurchases = useMemo(() => {
    return purchases.filter((purchase) => purchase.status === "pending");
  }, [purchases]);

  const profileCompletion = useMemo(() => {
    let score = 25;

    if (name.trim()) score += 25;
    if (whatsapp.trim()) score += 20;
    if (instagram.trim()) score += 15;
    if (user?.email) score += 15;

    return Math.min(score, 100);
  }, [name, whatsapp, instagram, user?.email]);

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
      console.log("Erro ao sair da conta:", error);
      alert("Erro ao sair da conta.");
      return;
    }

    navigate("/login");
  }

  const quickActions = [
    {
      title: "Academy",
      description:
        approvedPurchases.length > 0
          ? "Acesse seus cursos liberados e continue assistindo suas aulas."
          : "Veja os cursos disponíveis e compre acesso vitalício individual.",
      button: approvedPurchases.length > 0 ? "Abrir Academy" : "Ver cursos",
      action: () => navigate("/academy"),
    },
    {
      title: "Minhas Entregas",
      description:
        "Acompanhe materiais, projetos, arquivos finais e status das suas entregas.",
      button: "Abrir entregas",
      action: () => navigate("/minhas-entregas"),
    },
    {
      title: "Soluções FatorZ",
      description:
        "Veja produtos, serviços únicos, sites, landing pages e assessorias mensais.",
      button: "Ver soluções",
      action: () => navigate("/"),
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
              Sua conta dentro do{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
                Hub FatorZ.
              </span>
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-3xl">
              Ajuste seus dados, acompanhe seus cursos vitalícios, veja o status
              da sua conta e mantenha seu perfil organizado dentro da plataforma.
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
                {approvedPurchases.length} curso(s) liberado(s)
              </span>

              {pendingPurchases.length > 0 && (
                <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-300">
                  {pendingPurchases.length} compra(s) pendente(s)
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
                Perfil completo
              </p>

              <h2 className="text-5xl font-black mt-3">
                {profileCompletion}%
              </h2>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed mt-5">
                Quanto mais completo estiver seu perfil, mais fácil fica para a
                FatorZ organizar suas entregas, cursos, contatos e suporte.
              </p>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="mt-6 rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar dados"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
            Tag da conta
          </p>
          <h2 className="text-3xl font-black mt-3">{customerLabel}</h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
            Cargo
          </p>
          <h2 className="text-2xl font-black mt-3">{staffLabel}</h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
            Cursos liberados
          </p>
          <h2 className="text-4xl font-black mt-3 text-emerald-300">
            {approvedPurchases.length}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
            Total gasto
          </p>
          <h2 className="text-3xl font-black mt-3 text-yellow-300">
            {formatMoney(profile?.total_spent)}
          </h2>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1fr_420px] gap-8">
        <div className="space-y-8">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <div className="mb-6">
              <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
                Dados do perfil
              </p>

              <h2 className="text-3xl md:text-4xl font-black">
                Informações principais
              </h2>

              <p className="text-zinc-400 mt-3">
                Esses dados ajudam a FatorZ a identificar sua conta, organizar
                entregas e manter contato quando necessário.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Nome
                </label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Email
                </label>

                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-2xl border border-white/10 bg-black/60 px-5 py-4 text-zinc-400 outline-none"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  WhatsApp
                </label>

                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="51999999999"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Instagram
                </label>

                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seuinstagram"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>
            </div>

            {message && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">
                {message}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>

              <button
                onClick={resetPassword}
                disabled={resetLoading}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                {resetLoading ? "Enviando..." : "Redefinir senha"}
              </button>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <div className="mb-6">
              <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
                Academy
              </p>

              <h2 className="text-3xl md:text-4xl font-black">
                Seus cursos vitalícios
              </h2>

              <p className="text-zinc-400 mt-3">
                Aqui aparecem os cursos comprados e liberados na sua conta. Cada
                curso tem acesso individual e vitalício após aprovação.
              </p>
            </div>

            {loadingPurchases ? (
              <p className="text-zinc-400">Carregando cursos...</p>
            ) : approvedPurchases.length ? (
              <div className="space-y-3">
                {approvedPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-white">
                          {purchase.course_title || `Curso #${purchase.course_id}`}
                        </h3>

                        <p className="text-sm text-emerald-200/70 mt-1">
                          Liberado em {formatDate(purchase.approved_at)}
                        </p>
                      </div>

                      <button
                        onClick={() => navigate("/academy")}
                        className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black transition hover:opacity-90"
                      >
                        Assistir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/40 p-6">
                <h3 className="text-xl font-black mb-2">
                  Nenhum curso liberado ainda.
                </h3>

                <p className="text-zinc-400 mb-5">
                  Você pode ver o catálogo público da Academy e comprar cursos
                  com acesso vitalício individual.
                </p>

                <button
                  onClick={() => navigate("/academy")}
                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
                >
                  Ver cursos
                </button>
              </div>
            )}

            {pendingPurchases.length > 0 && (
              <div className="mt-6">
                <p className="text-orange-300 font-black uppercase tracking-[0.22em] text-xs mb-3">
                  Compras pendentes
                </p>

                <div className="space-y-3">
                  {pendingPurchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="rounded-[24px] border border-orange-400/20 bg-orange-500/10 p-5"
                    >
                      <h3 className="font-black text-white">
                        {purchase.course_title || `Curso #${purchase.course_id}`}
                      </h3>

                      <p className="text-sm text-orange-100/70 mt-1">
                        Criado em {formatDateTime(purchase.created_at)}. Após
                        confirmação, a FatorZ libera seu acesso vitalício.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[36px] border border-white/10 bg-black/70 p-6">
            <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
              Ações rápidas
            </p>

            <h2 className="text-3xl font-black mb-5">
              Continue pelo próximo passo
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
              Segurança
            </p>

            <h2 className="text-2xl font-black mb-3">Sessão da conta</h2>

            <p className="text-zinc-400 text-sm leading-relaxed mb-5">
              Encerre a sessão quando estiver usando computador compartilhado ou
              quiser trocar de conta.
            </p>

            <button
              onClick={logout}
              disabled={logoutLoading}
              className="w-full rounded-2xl bg-red-500 px-6 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {logoutLoading ? "Saindo..." : "Sair da conta"}
            </button>
          </div>

          {isTeam && (
            <div className="rounded-[36px] border border-blue-400/20 bg-blue-500/10 p-6">
              <p className="text-xs uppercase tracking-widest font-black text-blue-300 mb-3">
                Equipe FatorZ
              </p>

              <h2 className="text-2xl font-black mb-3">{staffLabel}</h2>

              <p className="text-blue-100/70 text-sm leading-relaxed">
                Sua conta possui cargo interno. As permissões do painel são
                definidas pelo nível operacional configurado pelo CEO FatorZ.
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}