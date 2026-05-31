import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  nome: string | null;
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

type Order = {
  id: number;
  created_at: string;
  customer_email: string | null;
  customer_name: string | null;
  product_id: string | null;
  product_name: string | null;
  product_category: string | null;
  product_price: string | null;
  status: string | null;
  payment_id: string | null;
  project_id: number | null;
};

type Project = {
  id: number;
  created_at: string;
  title: string | null;
  client_name: string | null;
  client_email: string | null;
  service_type: string | null;
  status: string | null;
  deadline: string | null;
  amount: number | null;
  delivery_link: string | null;
  notes: string | null;
};

type Lesson = {
  id: number;
  module_title: string;
  lesson_title: string;
  created_at: string;
};

type Client = {
  id: number;
  created_at: string;
  name: string | null;
  service: string | null;
  status: string | null;
  monthly_value?: number | null;
};

type Payment = {
  id: number;
  created_at: string;
  client_name: string | null;
  product_name: string | null;
  amount: number | null;
  status: string | null;
  payment_method: string | null;
  notes: string | null;
};

const checklistItems = [
  {
    id: "bio",
    title: "Bio clara",
    description: "Deixe óbvio o que você faz, para quem faz e como a pessoa avança.",
  },
  {
    id: "destaques",
    title: "Destaques organizados",
    description: "Use destaques como serviços, resultados, feedbacks, localização e dúvidas.",
  },
  {
    id: "link",
    title: "Link funcionando",
    description: "Confira se o link da bio leva para WhatsApp, página ou oferta certa.",
  },
  {
    id: "prova",
    title: "Prova social",
    description: "Publique feedbacks, bastidores, entregas, antes/depois ou resultados reais.",
  },
  {
    id: "conteudo",
    title: "Conteúdo da semana",
    description: "Tenha pelo menos uma ideia de post, story ou Reels para os próximos dias.",
  },
  {
    id: "cta",
    title: "Chamada para ação",
    description: "Todo conteúdo precisa indicar o próximo passo: comentar, chamar, salvar ou clicar.",
  },
];

const weeklyMissions = [
  {
    title: "Poste uma prova social",
    description:
      "Mostre um feedback, bastidor, entrega ou transformação que aumente confiança na sua marca.",
    action: "Criar um story ou post com uma prova real.",
  },
  {
    title: "Responda uma dúvida em Reels",
    description:
      "Pegue uma pergunta comum do seu público e responda de forma simples em até 30 segundos.",
    action: "Gravar um Reels curto com uma resposta direta.",
  },
  {
    title: "Revise sua bio",
    description:
      "Sua bio precisa dizer o que você faz, para quem faz e como a pessoa fala com você.",
    action: "Ajustar a bio e conferir o link principal.",
  },
  {
    title: "Mostre um bastidor",
    description:
      "Bastidor gera proximidade. Mostre seu processo, rotina, organização ou preparação.",
    action: "Postar 3 stories mostrando o processo.",
  },
  {
    title: "Crie um conteúdo de autoridade",
    description:
      "Ensine algo pequeno, mas útil. O objetivo é a pessoa sentir que você entende do assunto.",
    action: "Publicar uma dica prática com CTA leve.",
  },
];

type DiagnosticState = {
  nicho: string;
  objetivo: string;
  maiorDificuldade: string;
  frequencia: string;
  estrutura: string;
  provaSocial: string;
  linkVenda: string;
  clarezaOferta: string;
};

function getDiagnosticInitialState(): DiagnosticState {
  const empty: DiagnosticState = {
    nicho: "",
    objetivo: "",
    maiorDificuldade: "",
    frequencia: "",
    estrutura: "",
    provaSocial: "",
    linkVenda: "",
    clarezaOferta: "",
  };

  if (typeof window === "undefined") return empty;

  try {
    const saved = window.localStorage.getItem("fatorz_brand_diagnostic");
    return saved ? { ...empty, ...JSON.parse(saved) } : empty;
  } catch {
    return empty;
  }
}

function getMissionByArea(area: string) {
  if (area === "Conteúdo") {
    return {
      title: "Crie 3 conteúdos com função",
      description:
        "Sua missão é publicar um conteúdo para atrair, um para gerar confiança e um para levar a pessoa para o próximo passo.",
      action: "Criar 1 Reels curto, 1 story de bastidor e 1 post com CTA leve.",
    };
  }

  if (area === "Perfil") {
    return {
      title: "Arrume a vitrine do perfil",
      description:
        "Antes de postar mais, deixe claro quem você ajuda, o que você entrega e como o cliente fala com você.",
      action:
        "Revisar bio, link principal, destaques e pelo menos uma prova social visível.",
    };
  }

  if (area === "Vendas") {
    return {
      title: "Crie um caminho de venda simples",
      description:
        "A atenção precisa virar ação. Sua missão é deixar a oferta e o próximo passo mais claros.",
      action:
        "Criar uma oferta simples, escrever um CTA direto e apontar para WhatsApp ou landing page.",
    };
  }

  if (area === "Posicionamento") {
    return {
      title: "Mostre por que sua marca vale mais",
      description:
        "Seu conteúdo precisa deixar claro o valor, a diferença e a confiança da sua marca.",
      action:
        "Publicar um conteúdo de autoridade explicando um erro comum do seu público.",
    };
  }

  return getCurrentWeeklyMission();
}

function getChecklistInitialState() {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem("fatorz_presence_checklist");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function getCurrentWeeklyMission() {
  const start = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  const days = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const week = Math.floor(days / 7);

  return weeklyMissions[week % weeklyMissions.length];
}

export default function Dashboard({ user, profile }: any) {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    getChecklistInitialState
  );

  const [diagnostic, setDiagnostic] = useState<DiagnosticState>(
    getDiagnosticInitialState
  );

  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  async function loadAdminData() {
    setLoading(true);

    const [
      profilesResponse,
      subscriptionsResponse,
      ordersResponse,
      projectsResponse,
      lessonsResponse,
      clientsResponse,
      paymentsResponse,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("subscriptions").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("orders").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("projects").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("lessons").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("clients").select("*").order("created_at", {
        ascending: false,
      }),

      supabase.from("payments").select("*").order("created_at", {
        ascending: false,
      }),
    ]);

    if (profilesResponse.error) {
      console.log("Erro profiles:", profilesResponse.error);
    }

    if (subscriptionsResponse.error) {
      console.log("Erro subscriptions:", subscriptionsResponse.error);
    }

    if (ordersResponse.error) {
      console.log("Erro orders:", ordersResponse.error);
    }

    if (projectsResponse.error) {
      console.log("Erro projects:", projectsResponse.error);
    }

    if (lessonsResponse.error) {
      console.log("Erro lessons:", lessonsResponse.error);
    }

    if (clientsResponse.error) {
      console.log("Erro clients:", clientsResponse.error);
    }

    if (paymentsResponse.error) {
      console.log("Erro payments:", paymentsResponse.error);
    }

    setProfiles(profilesResponse.data || []);
    setSubscriptions(subscriptionsResponse.data || []);
    setOrders(ordersResponse.data || []);
    setProjects(projectsResponse.data || []);
    setLessons(lessonsResponse.data || []);
    setClients(clientsResponse.data || []);
    setPayments(paymentsResponse.data || []);

    setLoading(false);
  }

  function formatMoney(value: number | null | undefined) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("pt-BR");
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

  function extractNumberFromPrice(price: string | null) {
    if (!price) return 0;

    const clean = price
      .replace("R$", "")
      .replace("/mês", "")
      .replace("/mes", "")
      .replace("mês", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();

    const number = Number(clean);

    return Number.isNaN(number) ? 0 : number;
  }

  const academyActive =
    !!profile?.academy_expires_at &&
    new Date(profile.academy_expires_at).getTime() > new Date().getTime();

  const subscriptionsStats = useMemo(() => {
    const pending = subscriptions.filter((item) => item.status === "pending");

    const approved = subscriptions.filter(
      (item) => item.status === "approved"
    );

    const active = subscriptions.filter((item) => {
      return (
        item.status === "approved" &&
        item.expires_at &&
        new Date(item.expires_at).getTime() > new Date().getTime()
      );
    });

    const expired = subscriptions.filter((item) => {
      return (
        item.status === "approved" &&
        item.expires_at &&
        new Date(item.expires_at).getTime() <= new Date().getTime()
      );
    });

    return {
      pending: pending.length,
      approved: approved.length,
      active: active.length,
      expired: expired.length,
    };
  }, [subscriptions]);

  const ordersStats = useMemo(() => {
    const pending = orders.filter((order) => order.status === "pending");

    const approved = orders.filter((order) => order.status === "approved");

    const withProject = orders.filter((order) => !!order.project_id);

    const cancelled = orders.filter(
      (order) => order.status === "cancelled" || order.status === "canceled"
    );

    const estimatedValue = orders.reduce((sum, order) => {
      return sum + extractNumberFromPrice(order.product_price);
    }, 0);

    return {
      pending: pending.length,
      approved: approved.length,
      withProject: withProject.length,
      cancelled: cancelled.length,
      estimatedValue,
    };
  }, [orders]);

  const projectsStats = useMemo(() => {
    const pending = projects.filter((project) => project.status === "pendente");

    const inProgress = projects.filter(
      (project) => project.status === "em andamento"
    );

    const completed = projects.filter(
      (project) => project.status === "concluído"
    );

    const late = projects.filter((project) => project.status === "atrasado");

    const delivered = projects.filter((project) => !!project.delivery_link);

    const totalAmount = projects.reduce(
      (sum, project) => sum + Number(project.amount || 0),
      0
    );

    return {
      pending: pending.length,
      inProgress: inProgress.length,
      completed: completed.length,
      late: late.length,
      delivered: delivered.length,
      totalAmount,
    };
  }, [projects]);

  const financeStats = useMemo(() => {
    const paid = payments
      .filter((payment) => payment.status === "pago")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pending = payments
      .filter((payment) => payment.status === "pendente")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      paid,
      pending,
    };
  }, [payments]);

  const monthlyClientsValue = useMemo(() => {
    return clients.reduce(
      (sum, client) => sum + Number(client.monthly_value || 0),
      0
    );
  }, [clients]);

  const latestOrders = orders.slice(0, 5);
  const latestProjects = projects.slice(0, 5);
  const latestSubscriptions = subscriptions.slice(0, 5);


  useEffect(() => {
    try {
      localStorage.setItem(
        "fatorz_presence_checklist",
        JSON.stringify(checklist)
      );
    } catch {
      // Mantém funcionando mesmo se o navegador bloquear localStorage.
    }
  }, [checklist]);

  useEffect(() => {
    try {
      localStorage.setItem("fatorz_brand_diagnostic", JSON.stringify(diagnostic));
    } catch {
      // Mantém funcionando mesmo se o navegador bloquear localStorage.
    }
  }, [diagnostic]);

  function toggleChecklistItem(id: string) {
    setChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  const checklistCompleted = checklistItems.filter((item) => checklist[item.id])
    .length;

  const checklistPercentage = Math.round(
    (checklistCompleted / checklistItems.length) * 100
  );

  const diagnosticResult = useMemo(() => {
    const answers = Object.values(diagnostic).filter(Boolean).length;

    let score = 20;

    if (diagnostic.nicho) score += 8;
    if (diagnostic.objetivo) score += 10;
    if (diagnostic.maiorDificuldade) score += 12;

    if (diagnostic.frequencia === "constante") score += 16;
    if (diagnostic.frequencia === "semanal") score += 11;
    if (diagnostic.frequencia === "as-vezes") score += 6;

    if (diagnostic.estrutura === "sim") score += 16;
    if (diagnostic.estrutura === "quase") score += 11;
    if (diagnostic.estrutura === "mais-ou-menos") score += 6;

    if (diagnostic.provaSocial === "sim") score += 10;
    if (diagnostic.provaSocial === "pouca") score += 5;

    if (diagnostic.linkVenda === "sim") score += 10;
    if (diagnostic.linkVenda === "confuso") score += 4;

    if (diagnostic.clarezaOferta === "sim") score += 12;
    if (diagnostic.clarezaOferta === "mais-ou-menos") score += 6;

    score = Math.min(score, 100);

    if (answers < 2) {
      return {
        title: "Comece pelo diagnóstico",
        area: "Direção",
        description:
          "Responda pelo menos duas perguntas para o Hub indicar o próximo passo da sua marca.",
        recommendation: "Abra o diagnóstico completo e responda as perguntas principais.",
        score: 25,
      };
    }

    if (diagnostic.maiorDificuldade === "conteudo") {
      return {
        title: "Seu maior gargalo parece ser conteúdo",
        area: "Conteúdo",
        description:
          "Sua marca precisa de ideias mais claras, consistentes e com função: atrair, gerar confiança e vender.",
        recommendation:
          "Use o Assistente FatorZ para criar ideias, legendas e roteiros. Depois cumpra a missão da semana.",
        score,
      };
    }

    if (diagnostic.maiorDificuldade === "perfil") {
      return {
        title: "Seu maior gargalo parece ser perfil",
        area: "Perfil",
        description:
          "Antes de vender, o perfil precisa passar confiança em poucos segundos: bio, destaques, prova social e link.",
        recommendation:
          "Complete o checklist de presença digital e revise sua bio, destaques, link e provas.",
        score,
      };
    }

    if (diagnostic.maiorDificuldade === "vendas") {
      return {
        title: "Seu maior gargalo parece ser venda",
        area: "Vendas",
        description:
          "Talvez o problema não seja só postagem. Pode faltar uma oferta clara, CTA melhor e uma página que conduza o cliente.",
        recommendation:
          "Revise sua oferta, CTA e considere usar uma landing page para organizar a venda.",
        score,
      };
    }

    if (diagnostic.maiorDificuldade === "posicionamento") {
      return {
        title: "Seu maior gargalo parece ser posicionamento",
        area: "Posicionamento",
        description:
          "Quando a marca não comunica bem o valor, o público compara só por preço e demora para confiar.",
        recommendation:
          "Defina uma promessa clara, organize a comunicação visual e publique conteúdos de autoridade.",
        score,
      };
    }

    return {
      title: "Sua marca precisa de direção",
      area: "Presença digital",
      description:
        "O próximo passo é organizar o básico: perfil, conteúdo, prova social e uma rotina simples de postagem.",
      recommendation:
        "Comece pelo checklist e use o Assistente FatorZ para transformar isso em posts práticos.",
      score,
    };
  }, [diagnostic]);

  const weeklyMission = getMissionByArea(diagnosticResult.area);

  const assistantPrompt = useMemo(() => {
    return `Sou do nicho ${diagnostic.nicho || "[coloque seu nicho]"}. Meu objetivo é ${
      diagnostic.objetivo || "[atrair, vender ou gerar confiança]"
    }. Meu maior gargalo hoje é ${diagnosticResult.area}. Crie um plano simples com 3 ideias de conteúdo, 1 roteiro de Reels, 1 legenda e 1 CTA para cumprir esta missão: ${weeklyMission.action}`;
  }, [diagnostic, diagnosticResult.area, weeklyMission.action]);

  function resetDiagnostic() {
    setDiagnostic({
      nicho: "",
      objetivo: "",
      maiorDificuldade: "",
      frequencia: "",
      estrutura: "",
      provaSocial: "",
      linkVenda: "",
      clarezaOferta: "",
    });
  }

  async function copyAssistantPrompt() {
    try {
      await navigator.clipboard.writeText(assistantPrompt);
      setCopiedPrompt(true);

      window.setTimeout(() => {
        setCopiedPrompt(false);
      }, 2200);
    } catch {
      alert("Não consegui copiar. Você pode selecionar o texto manualmente.");
    }
  }


  if (!isAdmin) {
    return (
      <div className="text-white relative overflow-hidden">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(0,92,255,0.18),transparent_26%),radial-gradient(circle_at_85%_5%,rgba(255,0,150,0.15),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.13),transparent_32%)]" />

        <div className="relative z-10">
          <section className="mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 md:p-10 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 mb-6">
                  <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_20px_rgba(255,0,150,0.9)]" />
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-300">
                    Hub FatorZ
                  </p>
                </div>

                <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                  Painel inteligente
                </p>

                <h1 className="text-4xl md:text-6xl font-black leading-none mb-5">
                  Bem-vindo, {profile?.nome || user?.email || "Usuário"}.
                </h1>

                <p className="text-zinc-400 text-lg max-w-3xl leading-relaxed mb-7">
                  Use o Hub para entender o próximo passo da sua marca, organizar
                  sua presença digital, cumprir missões de postagem e acessar a
                  FatorZ Academy.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setDiagnosticOpen(true)}
                    className="bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] hover:opacity-90 px-7 py-4 rounded-2xl font-black shadow-[0_0_35px_rgba(255,0,150,0.25)]"
                  >
                    Fazer diagnóstico
                  </button>

                  <button
                    onClick={() => navigate("/academy")}
                    className="bg-white text-black hover:bg-zinc-200 px-7 py-4 rounded-2xl font-black"
                  >
                    Abrir Academy
                  </button>

                  <button
                    onClick={() => {
                      const section = document.getElementById("missao");
                      section?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="bg-white/10 border border-white/10 hover:bg-white/15 px-7 py-4 rounded-2xl font-black"
                  >
                    Ver missão da semana
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl" />
                <div className="absolute -left-16 -bottom-16 h-52 w-52 rounded-full bg-blue-500/15 blur-3xl" />

                <div className="relative z-10">
                  <p className="text-zinc-500 font-bold mb-2">
                    Radar da sua marca
                  </p>

                  <h2 className="text-3xl md:text-4xl font-black mb-4">
                    {diagnosticResult.area}
                  </h2>

                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-zinc-400">
                        Nível de clareza
                      </span>
                      <span className="text-sm font-black text-pink-400">
                        {diagnosticResult.score}%
                      </span>
                    </div>

                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]"
                        style={{ width: `${diagnosticResult.score}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xl font-black mb-3">
                    {diagnosticResult.title}
                  </p>

                  <p className="text-zinc-400 leading-relaxed mb-5">
                    {diagnosticResult.description}
                  </p>

                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-pink-400 mb-2">
                      Próximo passo recomendado
                    </p>
                    <p className="text-zinc-300 font-bold leading-relaxed">
                      {diagnosticResult.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid md:grid-cols-3 gap-5 mb-8">
            <div className="rounded-[30px] border border-white/10 bg-zinc-950/80 p-6">
              <p className="text-zinc-500 mb-2 font-bold">Seu plano</p>

              <h2 className="text-4xl font-black">
                {profile?.role === "premium"
                  ? "Premium"
                  : profile?.role === "admin"
                  ? "Admin"
                  : "Gratuito"}
              </h2>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-zinc-950/80 p-6">
              <p className="text-zinc-500 mb-2 font-bold">Academy</p>

              <h2
                className={`text-4xl font-black ${
                  academyActive ? "text-green-400" : "text-pink-500"
                }`}
              >
                {academyActive ? "Ativo" : "Prévia"}
              </h2>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-zinc-950/80 p-6">
              <p className="text-zinc-500 mb-2 font-bold">Checklist</p>

              <h2 className="text-4xl font-black text-pink-500">
                {checklistCompleted}/{checklistItems.length}
              </h2>
            </div>
          </section>

          <section
            id="diagnostico"
            className="grid xl:grid-cols-[1fr_420px] gap-8 mb-8"
          >
            <div className="rounded-[40px] border border-white/10 bg-zinc-950/85 p-6 md:p-8">
              <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                Diagnóstico rápido
              </p>

              <h2 className="text-3xl md:text-5xl font-black mb-4">
                Onde sua marca mais precisa evoluir?
              </h2>

              <p className="text-zinc-400 max-w-3xl mb-6 leading-relaxed">
                Responda de forma simples. O Hub usa isso para te mostrar o
                próximo passo mais inteligente.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  onClick={() => setDiagnosticOpen(true)}
                  className="bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] hover:opacity-90 px-6 py-4 rounded-2xl font-black"
                >
                  Abrir diagnóstico completo
                </button>

                <button
                  onClick={resetDiagnostic}
                  className="bg-white/10 border border-white/10 hover:bg-white/15 px-6 py-4 rounded-2xl font-black"
                >
                  Limpar respostas
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-sm font-black text-zinc-300">
                    Qual seu nicho?
                  </span>
                  <input
                    value={diagnostic.nicho}
                    onChange={(event) =>
                      setDiagnostic((prev) => ({
                        ...prev,
                        nicho: event.target.value,
                      }))
                    }
                    placeholder="Ex: barbearia, loja, estética, delivery..."
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-zinc-300">
                    Qual seu objetivo principal?
                  </span>
                  <select
                    value={diagnostic.objetivo}
                    onChange={(event) =>
                      setDiagnostic((prev) => ({
                        ...prev,
                        objetivo: event.target.value,
                      }))
                    }
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                  >
                    <option value="">Escolha uma opção</option>
                    <option value="atrair">Atrair mais pessoas</option>
                    <option value="confianca">Gerar mais confiança</option>
                    <option value="vender">Vender melhor</option>
                    <option value="organizar">Organizar minha presença</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black text-zinc-300">
                    Qual é sua maior dificuldade?
                  </span>
                  <select
                    value={diagnostic.maiorDificuldade}
                    onChange={(event) =>
                      setDiagnostic((prev) => ({
                        ...prev,
                        maiorDificuldade: event.target.value,
                      }))
                    }
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                  >
                    <option value="">Escolha uma opção</option>
                    <option value="conteudo">Criar conteúdo</option>
                    <option value="perfil">Organizar o perfil</option>
                    <option value="posicionamento">Posicionamento</option>
                    <option value="vendas">Transformar atenção em venda</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black text-zinc-300">
                    Com que frequência você posta?
                  </span>
                  <select
                    value={diagnostic.frequencia}
                    onChange={(event) =>
                      setDiagnostic((prev) => ({
                        ...prev,
                        frequencia: event.target.value,
                      }))
                    }
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                  >
                    <option value="">Escolha uma opção</option>
                    <option value="quase-nunca">Quase nunca</option>
                    <option value="as-vezes">Às vezes</option>
                    <option value="semanal">Toda semana</option>
                    <option value="constante">Com constância</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black text-zinc-300">
                    Seu perfil já parece profissional?
                  </span>
                  <select
                    value={diagnostic.estrutura}
                    onChange={(event) =>
                      setDiagnostic((prev) => ({
                        ...prev,
                        estrutura: event.target.value,
                      }))
                    }
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                  >
                    <option value="">Escolha uma opção</option>
                    <option value="nao">Ainda não</option>
                    <option value="mais-ou-menos">Mais ou menos</option>
                    <option value="quase">Quase pronto</option>
                    <option value="sim">Sim, mas quero melhorar</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-[40px] border border-pink-500/20 bg-gradient-to-br from-black via-zinc-950 to-pink-950/25 p-6 md:p-8">
              <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                Resultado
              </p>

              <h3 className="text-3xl font-black mb-4">
                {diagnosticResult.title}
              </h3>

              <p className="text-zinc-400 leading-relaxed mb-6">
                {diagnosticResult.description}
              </p>

              <div className="rounded-3xl bg-black/50 border border-white/10 p-5 mb-6">
                <p className="text-zinc-500 text-sm font-bold mb-2">
                  Recomendação
                </p>

                <p className="text-white font-bold leading-relaxed">
                  {diagnosticResult.recommendation}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    const section = document.getElementById("checklist");
                    section?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full bg-white text-black hover:bg-zinc-200 px-6 py-4 rounded-2xl font-black"
                >
                  Ir para o checklist
                </button>

                <button
                  onClick={copyAssistantPrompt}
                  className="w-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] hover:opacity-90 px-6 py-4 rounded-2xl font-black"
                >
                  {copiedPrompt ? "Prompt copiado" : "Copiar pedido para o Assistente"}
                </button>
              </div>
            </div>
          </section>

          <section
            id="checklist"
            className="grid xl:grid-cols-[1fr_420px] gap-8 mb-8"
          >
            <div className="rounded-[40px] border border-white/10 bg-zinc-950/85 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
                <div>
                  <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                    Checklist de presença
                  </p>

                  <h2 className="text-3xl md:text-5xl font-black">
                    Organize o básico que vende confiança.
                  </h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/50 px-5 py-4">
                  <p className="text-zinc-500 text-sm font-bold">Progresso</p>
                  <p className="text-3xl font-black text-pink-500">
                    {checklistPercentage}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {checklistItems.map((item) => {
                  const checked = !!checklist[item.id];

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`w-full text-left rounded-[26px] border p-5 transition ${
                        checked
                          ? "border-green-400/30 bg-green-500/10"
                          : "border-white/10 bg-black/35 hover:border-pink-500/50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-black ${
                            checked
                              ? "border-green-400 bg-green-400 text-black"
                              : "border-white/20 text-zinc-500"
                          }`}
                        >
                          {checked ? "✓" : ""}
                        </div>

                        <div>
                          <h3 className="text-xl font-black mb-1">
                            {item.title}
                          </h3>

                          <p className="text-zinc-400 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              id="missao"
              className="rounded-[40px] border border-white/10 bg-gradient-to-br from-[#005cff]/15 via-zinc-950 to-[#ff0096]/15 p-6 md:p-8 h-fit"
            >
              <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                Missão da semana
              </p>

              <h2 className="text-3xl md:text-4xl font-black mb-4">
                {weeklyMission.title}
              </h2>

              <p className="text-zinc-400 leading-relaxed mb-6">
                {weeklyMission.description}
              </p>

              <div className="rounded-3xl border border-white/10 bg-black/45 p-5 mb-6">
                <p className="text-zinc-500 text-sm font-bold mb-2">
                  Tarefa prática
                </p>

                <p className="text-white font-black leading-relaxed">
                  {weeklyMission.action}
                </p>
              </div>

              <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                Dica: use o botão flutuante do Assistente FatorZ para pedir
                ideias, legenda, CTA e roteiro para cumprir essa missão.
              </p>

              <button
                onClick={() =>
                  setDiagnostic((prev) => ({
                    ...prev,
                    maiorDificuldade: "conteudo",
                  }))
                }
                className="w-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] hover:opacity-90 px-6 py-4 rounded-2xl font-black"
              >
                Quero criar conteúdo
              </button>
            </div>
          </section>

          <section className="grid xl:grid-cols-3 gap-6">
            <div className="rounded-[38px] border border-white/10 bg-zinc-950 p-7">
              <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
                FatorZ Academy
              </p>

              <h2 className="text-4xl font-black mb-5">
                Continue estudando.
              </h2>

              <p className="text-zinc-400 leading-relaxed mb-7">
                Veja a grade de cursos, acompanhe sua evolução e acesse aulas
                premium quando seu plano estiver ativo.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/academy")}
                  className="bg-pink-500 hover:bg-pink-600 px-6 py-4 rounded-2xl font-black"
                >
                  Abrir Academy
                </button>

                {!academyActive && (
                  <button
                    onClick={() => navigate("/checkout/academy")}
                    className="bg-white text-black hover:bg-zinc-200 px-6 py-4 rounded-2xl font-black"
                  >
                    Assinar
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[38px] border border-white/10 bg-zinc-950 p-7">
              <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
                Assistente FatorZ
              </p>

              <h2 className="text-4xl font-black mb-5">Peça ajuda rápida.</h2>

              <p className="text-zinc-400 leading-relaxed mb-7">
                Use o botão flutuante no canto da tela para gerar ideias,
                legendas, roteiros, CTAs e tirar dúvidas do Hub.
              </p>

              <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
                <p className="font-black text-white">
                  Sugestão de pedido:
                </p>

                <p className="text-zinc-400 mt-2">
                  “Crie 5 ideias de Reels para minha marca vender melhor sem
                  parecer forçado.”
                </p>
              </div>
            </div>

            <div className="rounded-[38px] border border-white/10 bg-zinc-950 p-7">
              <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
                Entregas
              </p>

              <h2 className="text-4xl font-black mb-5">Seus materiais.</h2>

              <p className="text-zinc-400 leading-relaxed mb-7">
                Veja seus projetos, status, arquivos e links de entrega dos
                serviços feitos pela FatorZ.
              </p>

              <button
                onClick={() => navigate("/minhas-entregas")}
                className="bg-white text-black hover:bg-zinc-200 px-6 py-4 rounded-2xl font-black"
              >
                Ver minhas entregas
              </button>
            </div>
          </section>

          {diagnosticOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
              <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setDiagnosticOpen(false)}
              />

              <div className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[42px] border border-white/10 bg-[#050508] p-5 md:p-8 shadow-[0_40px_160px_rgba(0,0,0,0.85)]">
                <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />
                <div className="absolute -left-28 -bottom-28 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-5 mb-8">
                    <div>
                      <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                        Diagnóstico completo
                      </p>

                      <h2 className="text-3xl md:text-5xl font-black leading-tight">
                        Descubra o próximo passo da sua marca.
                      </h2>

                      <p className="text-zinc-400 mt-4 max-w-3xl leading-relaxed">
                        Responda sem complicar. O Hub vai transformar isso em uma
                        leitura simples, uma missão da semana e um pedido pronto
                        para usar no Assistente FatorZ.
                      </p>
                    </div>

                    <button
                      onClick={() => setDiagnosticOpen(false)}
                      className="shrink-0 bg-white/10 border border-white/10 hover:bg-white/15 w-12 h-12 rounded-2xl font-black"
                    >
                      X
                    </button>
                  </div>

                  <div className="grid lg:grid-cols-[1fr_360px] gap-6">
                    <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
                      <div className="grid md:grid-cols-2 gap-5">
                        <label className="block">
                          <span className="text-sm font-black text-zinc-300">
                            Qual seu nicho?
                          </span>
                          <input
                            value={diagnostic.nicho}
                            onChange={(event) =>
                              setDiagnostic((prev) => ({
                                ...prev,
                                nicho: event.target.value,
                              }))
                            }
                            placeholder="Ex: barbearia, loja, estética..."
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-zinc-300">
                            Qual seu objetivo principal?
                          </span>
                          <select
                            value={diagnostic.objetivo}
                            onChange={(event) =>
                              setDiagnostic((prev) => ({
                                ...prev,
                                objetivo: event.target.value,
                              }))
                            }
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                          >
                            <option value="">Escolha uma opção</option>
                            <option value="atrair">Atrair mais pessoas</option>
                            <option value="confianca">Gerar mais confiança</option>
                            <option value="vender">Vender melhor</option>
                            <option value="organizar">Organizar minha presença</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-zinc-300">
                            Qual é sua maior dificuldade?
                          </span>
                          <select
                            value={diagnostic.maiorDificuldade}
                            onChange={(event) =>
                              setDiagnostic((prev) => ({
                                ...prev,
                                maiorDificuldade: event.target.value,
                              }))
                            }
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                          >
                            <option value="">Escolha uma opção</option>
                            <option value="conteudo">Criar conteúdo</option>
                            <option value="perfil">Organizar o perfil</option>
                            <option value="posicionamento">Posicionamento</option>
                            <option value="vendas">Transformar atenção em venda</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-zinc-300">
                            Com que frequência você posta?
                          </span>
                          <select
                            value={diagnostic.frequencia}
                            onChange={(event) =>
                              setDiagnostic((prev) => ({
                                ...prev,
                                frequencia: event.target.value,
                              }))
                            }
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                          >
                            <option value="">Escolha uma opção</option>
                            <option value="quase-nunca">Quase nunca</option>
                            <option value="as-vezes">Às vezes</option>
                            <option value="semanal">Toda semana</option>
                            <option value="constante">Com constância</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-zinc-300">
                            Seu perfil já parece profissional?
                          </span>
                          <select
                            value={diagnostic.estrutura}
                            onChange={(event) =>
                              setDiagnostic((prev) => ({
                                ...prev,
                                estrutura: event.target.value,
                              }))
                            }
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                          >
                            <option value="">Escolha uma opção</option>
                            <option value="nao">Ainda não</option>
                            <option value="mais-ou-menos">Mais ou menos</option>
                            <option value="quase">Quase pronto</option>
                            <option value="sim">Sim, mas quero melhorar</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-zinc-300">
                            Você já tem prova social visível?
                          </span>
                          <select
                            value={diagnostic.provaSocial}
                            onChange={(event) =>
                              setDiagnostic((prev) => ({
                                ...prev,
                                provaSocial: event.target.value,
                              }))
                            }
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                          >
                            <option value="">Escolha uma opção</option>
                            <option value="nao">Ainda não</option>
                            <option value="pouca">Tenho pouca</option>
                            <option value="sim">Tenho feedbacks/resultados</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-zinc-300">
                            Seu link leva para uma ação clara?
                          </span>
                          <select
                            value={diagnostic.linkVenda}
                            onChange={(event) =>
                              setDiagnostic((prev) => ({
                                ...prev,
                                linkVenda: event.target.value,
                              }))
                            }
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                          >
                            <option value="">Escolha uma opção</option>
                            <option value="nao">Não tenho link</option>
                            <option value="confuso">Tenho, mas está confuso</option>
                            <option value="sim">Sim, leva para ação certa</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-zinc-300">
                            Sua oferta está clara?
                          </span>
                          <select
                            value={diagnostic.clarezaOferta}
                            onChange={(event) =>
                              setDiagnostic((prev) => ({
                                ...prev,
                                clarezaOferta: event.target.value,
                              }))
                            }
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-pink-500"
                          >
                            <option value="">Escolha uma opção</option>
                            <option value="nao">Não está clara</option>
                            <option value="mais-ou-menos">Mais ou menos</option>
                            <option value="sim">Sim, está clara</option>
                          </select>
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-6">
                        <button
                          onClick={resetDiagnostic}
                          className="bg-white/10 border border-white/10 hover:bg-white/15 px-6 py-4 rounded-2xl font-black"
                        >
                          Limpar respostas
                        </button>

                        <button
                          onClick={() => setDiagnosticOpen(false)}
                          className="bg-white text-black hover:bg-zinc-200 px-6 py-4 rounded-2xl font-black"
                        >
                          Salvar diagnóstico
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[34px] border border-pink-500/20 bg-gradient-to-br from-black via-zinc-950 to-pink-950/25 p-5 md:p-6 h-fit">
                      <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                        Resultado ao vivo
                      </p>

                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-zinc-400">
                            Clareza digital
                          </span>
                          <span className="text-sm font-black text-pink-400">
                            {diagnosticResult.score}%
                          </span>
                        </div>

                        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]"
                            style={{ width: `${diagnosticResult.score}%` }}
                          />
                        </div>
                      </div>

                      <h3 className="text-3xl font-black mb-4">
                        {diagnosticResult.title}
                      </h3>

                      <p className="text-zinc-400 leading-relaxed mb-5">
                        {diagnosticResult.description}
                      </p>

                      <div className="rounded-3xl bg-black/50 border border-white/10 p-5 mb-5">
                        <p className="text-zinc-500 text-sm font-bold mb-2">
                          Missão recomendada
                        </p>

                        <p className="text-white font-black leading-relaxed">
                          {weeklyMission.action}
                        </p>
                      </div>

                      <button
                        onClick={copyAssistantPrompt}
                        className="w-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] hover:opacity-90 px-6 py-4 rounded-2xl font-black mb-3"
                      >
                        {copiedPrompt ? "Prompt copiado" : "Copiar pedido para o Assistente"}
                      </button>

                      <p className="text-zinc-500 text-xs leading-relaxed">
                        Depois de copiar, cole no botão flutuante do Assistente
                        FatorZ para gerar conteúdo, legenda, roteiro e CTA.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Painel Admin</h1>
        <p className="text-zinc-400">Carregando dados da FatorZ Hub...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Admin
        </p>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h1 className="text-4xl font-black mb-2">
              Painel Geral FatorZ Hub
            </h1>

            <p className="text-zinc-400">
              Visão geral de pedidos, projetos, entregas, Academy, clientes e
              financeiro.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="bg-pink-500 hover:bg-pink-600 px-6 py-4 rounded-2xl font-black"
          >
            Atualizar painel
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pedidos</p>

          <h2 className="text-5xl font-black">{orders.length}</h2>

          <p className="text-zinc-500 mt-3 text-sm">Compras iniciadas</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pedidos pendentes</p>

          <h2 className="text-5xl font-black text-yellow-400">
            {ordersStats.pending}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">Aguardando pagamento</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pedidos aprovados</p>

          <h2 className="text-5xl font-black text-green-400">
            {ordersStats.approved}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Com projeto: {ordersStats.withProject}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Valor estimado</p>

          <h2 className="text-4xl font-black text-green-400">
            {formatMoney(ordersStats.estimatedValue)}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Cancelados: {ordersStats.cancelled}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Projetos</p>

          <h2 className="text-5xl font-black">{projects.length}</h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Pendentes: {projectsStats.pending}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Em andamento</p>

          <h2 className="text-5xl font-black text-pink-500">
            {projectsStats.inProgress}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Atrasados: {projectsStats.late}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Entregues</p>

          <h2 className="text-5xl font-black text-green-400">
            {projectsStats.delivered}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Concluídos: {projectsStats.completed}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Valor em projetos</p>

          <h2 className="text-4xl font-black text-green-400">
            {formatMoney(projectsStats.totalAmount)}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">Soma dos projetos</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Usuários</p>

          <h2 className="text-5xl font-black">{profiles.length}</h2>

          <p className="text-zinc-500 mt-3 text-sm">Contas criadas</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Academy ativo</p>

          <h2 className="text-5xl font-black text-green-400">
            {subscriptionsStats.active}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Aprovadas: {subscriptionsStats.approved} | Pendentes:{" "}
            {subscriptionsStats.pending} | Expiradas:{" "}
            {subscriptionsStats.expired}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Clientes CRM</p>

          <h2 className="text-5xl font-black">{clients.length}</h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Mensalidade: {formatMoney(monthlyClientsValue)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Aulas Academy</p>

          <h2 className="text-5xl font-black text-pink-500">
            {lessons.length}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">Conteúdos publicados</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 xl:col-span-2">
          <p className="text-zinc-400 mb-2">Financeiro recebido</p>

          <h2 className="text-4xl font-black text-green-400">
            {formatMoney(financeStats.paid)}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Pagamentos marcados como pagos
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 xl:col-span-2">
          <p className="text-zinc-400 mb-2">Financeiro pendente</p>

          <h2 className="text-4xl font-black text-yellow-400">
            {formatMoney(financeStats.pending)}
          </h2>

          <p className="text-zinc-500 mt-3 text-sm">
            Pagamentos ainda pendentes
          </p>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_420px] gap-8 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black">Últimos pedidos</h2>

              <p className="text-zinc-500 text-sm mt-1">
                Compras iniciadas na Landing.
              </p>
            </div>

            <button
              onClick={() => navigate("/admin/pedidos")}
              className="bg-pink-500 hover:bg-pink-600 px-5 py-3 rounded-xl font-black"
            >
              Ver pedidos
            </button>
          </div>

          {latestOrders.length === 0 ? (
            <div className="bg-black border border-zinc-800 rounded-3xl p-6">
              <p className="text-zinc-400">Nenhum pedido registrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-black">
                      {order.product_name || "Produto sem nome"}
                    </h3>

                    <p className="text-zinc-500 text-sm break-all">
                      {order.customer_email || "Sem email"}
                    </p>

                    <p className="text-zinc-600 text-xs mt-1">
                      {formatDateTime(order.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-4 py-2 rounded-xl font-black text-sm ${
                        order.status === "approved"
                          ? "bg-green-500/20 text-green-400"
                          : order.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : order.status === "project_created"
                          ? "bg-pink-500/20 text-pink-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {order.status || "sem status"}
                    </span>

                    <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                      {order.product_price || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
          <h2 className="text-2xl font-black mb-6">Ações rápidas</h2>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/admin/pedidos")}
              className="w-full text-left bg-pink-500 hover:bg-pink-600 px-5 py-4 rounded-2xl font-black"
            >
              Gerenciar Pedidos
            </button>

            <button
              onClick={() => navigate("/projetos")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              Projetos e Entregas
            </button>

            <button
              onClick={() => navigate("/admin/assinaturas")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              Assinaturas Academy
            </button>

            <button
              onClick={() => navigate("/admin/aulas")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              Postar Aulas
            </button>

            <button
              onClick={() => navigate("/clientes")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              CRM de Clientes
            </button>

            <button
              onClick={() => navigate("/financeiro")}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
            >
              Financeiro
            </button>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black">Últimos projetos</h2>

              <p className="text-zinc-500 text-sm mt-1">
                Produção e entregas recentes.
              </p>
            </div>

            <button
              onClick={() => navigate("/projetos")}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-black"
            >
              Ver projetos
            </button>
          </div>

          {latestProjects.length === 0 ? (
            <div className="bg-black border border-zinc-800 rounded-3xl p-6">
              <p className="text-zinc-400">Nenhum projeto criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-black">
                      {project.title || "Projeto sem título"}
                    </h3>

                    <p className="text-zinc-500 text-sm">
                      {project.client_name || "Sem cliente"}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p
                      className={`font-black ${
                        project.delivery_link
                          ? "text-green-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {project.delivery_link ? "Entregue" : "Sem entrega"}
                    </p>

                    <p className="text-zinc-500 text-sm">
                      {project.status || "sem status"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black">Últimas assinaturas</h2>

              <p className="text-zinc-500 text-sm mt-1">
                Academy e pagamentos premium.
              </p>
            </div>

            <button
              onClick={() => navigate("/admin/assinaturas")}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-black"
            >
              Ver assinaturas
            </button>
          </div>

          {latestSubscriptions.length === 0 ? (
            <div className="bg-black border border-zinc-800 rounded-3xl p-6">
              <p className="text-zinc-400">Nenhuma assinatura ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestSubscriptions.map((subscription) => {
                const active =
                  subscription.status === "approved" &&
                  subscription.expires_at &&
                  new Date(subscription.expires_at).getTime() >
                    new Date().getTime();

                return (
                  <div
                    key={subscription.id}
                    className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-black break-all">
                        {subscription.user_email || "Sem email"}
                      </h3>

                      <p className="text-zinc-500 text-sm">
                        Vence em {formatDate(subscription.expires_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-4 py-2 rounded-xl font-black text-sm ${
                          subscription.status === "approved"
                            ? "bg-green-500/20 text-green-400"
                            : subscription.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-zinc-800 text-zinc-400"
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
                        {active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}