import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { products } from "../data/products";
import { supabase } from "../lib/supabase";

type Product = {
  id: string;
  category: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  paymentLink: string;
  highlight?: boolean;
  monthly?: boolean;
};

type AcademyCoursePreview = {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  badge: string | null;
  order_index: number | null;
  created_at: string;
};

type AcademyLessonPreview = {
  id: number;
  course_id: number | null;
  module_title: string;
  lesson_title: string;
  order_index: number | null;
  created_at: string;
};

const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

export default function Landing() {
  const navigate = useNavigate();

  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [academyCourse, setAcademyCourse] =
    useState<AcademyCoursePreview | null>(null);
  const [academyLessons, setAcademyLessons] = useState<AcademyLessonPreview[]>(
    []
  );

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category))
    );

    return uniqueCategories;
  }, []);

  const academyPreviewLessons = useMemo(() => {
    if (academyLessons.length === 0) {
      return [
        "Ideias infinitas de conteúdo",
        "Como criar legendas que vendem",
        "Reels com roteiro pronto",
      ];
    }

    return academyLessons.slice(0, 4).map((lesson) => lesson.lesson_title);
  }, [academyLessons]);

  useEffect(() => {
    loadAcademyPreview();
  }, []);

  async function loadAcademyPreview() {
    const { data: coursesData, error: coursesError } = await supabase
      .from("courses")
      .select(
        "id,title,subtitle,description,cover_url,badge,order_index,created_at"
      )
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1);

    if (coursesError || !coursesData || coursesData.length === 0) {
      if (coursesError) {
        console.log("Erro ao carregar prévia da Academy:", coursesError);
      }

      return;
    }

    const firstCourse = coursesData[0];

    setAcademyCourse(firstCourse);

    const { data: lessonsData, error: lessonsError } = await supabase
      .from("lessons")
      .select("id,course_id,module_title,lesson_title,order_index,created_at")
      .eq("course_id", firstCourse.id)
      .order("module_title", { ascending: true })
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(6);

    if (lessonsError) {
      console.log("Erro ao carregar prévia das aulas:", lessonsError);
      return;
    }

    setAcademyLessons(lessonsData || []);
  }

  function scrollToPlans() {
    const section = document.getElementById("planos");
    section?.scrollIntoView({ behavior: "smooth" });
  }

  function openInstagram() {
    window.open(INSTAGRAM_URL, "_blank");
  }

  async function handleBuy(product: Product) {
    if (product.id === "academy") {
      navigate("/checkout/academy");
      return;
    }

    if (!product.paymentLink) {
      alert("Esse produto ainda não tem link de pagamento.");
      return;
    }

    setBuyingId(product.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const customerName = prompt(
      "Digite o nome do cliente:",
      user?.user_metadata?.nome || ""
    );

    if (!customerName) {
      setBuyingId(null);
      return;
    }

    const customerEmail = prompt(
      "Digite o email do cliente:",
      user?.email || ""
    );

    if (!customerEmail) {
      setBuyingId(null);
      return;
    }

    if (!customerEmail.includes("@")) {
      alert("Digite um email válido.");
      setBuyingId(null);
      return;
    }

    const { error } = await supabase.from("orders").insert({
      user_id: user?.id || null,
      customer_email: customerEmail.trim(),
      customer_name: customerName.trim(),
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      product_price: product.price,
      payment_link: product.paymentLink,
      status: "pending",
      payment_id: null,
      project_id: null,
      notes: "Pedido criado pela Landing Page.",
    });

    setBuyingId(null);

    if (error) {
      console.log("Erro ao criar pedido:", error);
      alert("Erro ao registrar pedido. Tente novamente.");
      return;
    }

    window.open(product.paymentLink, "_blank");

    navigate("/obrigado");
  }

  return (
    <div className="min-h-screen bg-[#050506] text-white overflow-x-hidden pb-28 md:pb-0">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(0,92,255,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,0,150,0.14),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.12),transparent_34%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-30 bg-[linear-gradient(115deg,transparent_0%,rgba(0,92,255,0.08)_32%,transparent_56%,rgba(255,0,150,0.08)_80%,transparent_100%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <button
            onClick={() => navigate("/")}
            className="text-2xl md:text-3xl font-black tracking-tight text-white shrink-0"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-black text-zinc-400">
            <button onClick={scrollToPlans} className="hover:text-white">
              Planos
            </button>

            <button
              onClick={() => navigate("/academy")}
              className="hover:text-white"
            >
              Academy
            </button>

            <button
              onClick={() => navigate("/mural")}
              className="hover:text-white"
            >
              Mural
            </button>

            <button
              onClick={() => navigate("/minhas-entregas")}
              className="hover:text-white"
            >
              Entregas
            </button>

            <button onClick={openInstagram} className="hover:text-white">
              Instagram
            </button>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => navigate("/login")}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:bg-white/10 md:px-6"
            >
              Entrar
            </button>

            <button
              onClick={() => navigate("/mural")}
              className="hidden rounded-2xl border border-pink-500/25 bg-pink-500/10 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-500/20 sm:block md:px-6"
            >
              Mural
            </button>

            <button
              onClick={openInstagram}
              className="hidden rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 lg:block md:px-6"
            >
              @fatorzhouse
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_18px_rgba(255,0,150,0.9)]" />
                <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-300">
                  Marketing, IA e presença digital
                </p>
              </div>

              <h1 className="mb-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl lg:text-8xl">
                Sua marca precisa parecer pronta para ser escolhida.
              </h1>

              <p className="mb-8 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
                A FatorZ organiza conteúdo, posicionamento, landing pages e
                estrutura digital para sua marca sair do improviso e ganhar
                presença com direção.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={scrollToPlans}
                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-8 py-5 text-lg font-black text-white shadow-[0_0_35px_rgba(255,0,150,0.20)] transition hover:opacity-90"
                >
                  Ver soluções
                </button>

                <button
                  onClick={() => navigate("/login")}
                  className="rounded-2xl bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-zinc-200"
                >
                  Entrar no Hub
                </button>

                <button
                  onClick={openInstagram}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-8 py-5 text-lg font-black text-white transition hover:bg-white/10"
                >
                  Ver Instagram
                </button>
              </div>

              <div className="mt-10 grid max-w-3xl grid-cols-3 gap-3 md:gap-5">
                {[
                  ["Conteúdo", "Posts, Reels e calendário"],
                  ["Sites", "Landing pages e páginas"],
                  ["IA", "Processo, prompts e escala"],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur md:p-5"
                  >
                    <h3 className="text-2xl font-black md:text-3xl">
                      {title}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-500">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-14 -top-14 h-64 w-64 rounded-full bg-[#ff0096]/20 blur-3xl" />
              <div className="absolute -bottom-14 -left-14 h-64 w-64 rounded-full bg-[#005cff]/20 blur-3xl" />

              <div className="relative overflow-hidden rounded-[42px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-7">
                <div className="rounded-[34px] border border-white/10 bg-black/75 p-6 md:p-8">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-pink-500">
                        Central FatorZ
                      </p>

                      <h2 className="max-w-md text-4xl font-black leading-none md:text-5xl">
                        Presença que vira percepção de valor.
                      </h2>
                    </div>

                    <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-pink-500/30 bg-pink-500/10 text-2xl font-black text-pink-400 md:flex">
                      FZ
                    </div>
                  </div>

                  <p className="mb-7 max-w-lg text-zinc-400 leading-relaxed">
                    Não é só postar bonito. É organizar a mensagem, provar valor
                    e conduzir o cliente para o próximo passo.
                  </p>

                  <div className="grid gap-3">
                    {[
                      ["Diagnóstico", "entender o gargalo da marca"],
                      ["Conteúdo", "criar posts com função"],
                      ["Oferta", "levar atenção para venda"],
                    ].map(([title, description]) => (
                      <div
                        key={title}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4"
                      >
                        <div>
                          <h3 className="font-black">{title}</h3>
                          <p className="text-sm text-zinc-500">
                            {description}
                          </p>
                        </div>

                        <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_18px_rgba(255,0,150,0.9)]" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <button
                    onClick={openInstagram}
                    className="rounded-3xl border border-white/10 bg-black/70 p-5 text-left transition hover:border-pink-500/50"
                  >
                    <p className="mb-1 text-sm font-bold text-zinc-500">
                      Instagram
                    </p>
                    <h3 className="break-all text-2xl font-black text-white md:text-3xl">
                      @fatorzhouse
                    </h3>
                  </button>

                  <button
                    onClick={() => navigate("/dashboard")}
                    className="rounded-3xl border border-white/10 bg-black/70 p-5 text-left transition hover:border-[#005cff]/60"
                  >
                    <p className="mb-1 text-sm font-bold text-zinc-500">
                      Plataforma
                    </p>
                    <h3 className="text-3xl font-black text-green-400">Hub</h3>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[40px] border border-white/10 bg-zinc-950/85 p-8 md:p-10">
              <p className="mb-3 text-pink-500 font-black uppercase tracking-widest">
                O que muda
              </p>

              <h2 className="mb-5 text-4xl font-black leading-tight md:text-6xl">
                A FatorZ não entrega só peça. Entrega direção.
              </h2>

              <p className="text-lg leading-relaxed text-zinc-400">
                Seu digital precisa ter função: chamar atenção, gerar confiança,
                explicar valor e facilitar a decisão do cliente.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                [
                  "Perfil com clareza",
                  "Bio, destaques, prova social e link alinhados com a venda.",
                ],
                [
                  "Conteúdo com intenção",
                  "Cada post tem um papel: atrair, educar, provar ou vender.",
                ],
                [
                  "Páginas que organizam",
                  "Landing pages e estruturas que reduzem dúvida e aumentam confiança.",
                ],
                [
                  "Academy e Hub",
                  "Ferramentas para acompanhar evolução, missões e aprendizados.",
                ],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6"
                >
                  <h3 className="mb-3 text-2xl font-black">{title}</h3>
                  <p className="leading-relaxed text-zinc-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
          <div className="relative overflow-hidden rounded-[42px] border border-white/10 bg-gradient-to-br from-black via-zinc-950 to-black p-6 md:p-10">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#ff0096]/20 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-[#005cff]/20 blur-3xl" />

            <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_420px]">
              <div>
                <p className="mb-3 text-pink-500 font-black uppercase tracking-widest">
                  Instagram oficial
                </p>

                <h2 className="mb-5 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  Acompanhe bastidores, evolução e conteúdos da FatorZ.
                </h2>

                <p className="mb-8 max-w-2xl text-lg leading-relaxed text-zinc-400">
                  O Instagram é onde mostramos a construção da marca, conteúdos,
                  lançamentos, ideias e provas do que estamos criando no digital.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={openInstagram}
                    className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-8 py-5 text-lg font-black text-white transition hover:opacity-90"
                  >
                    Abrir @fatorzhouse
                  </button>

                  <button
                    onClick={() => navigate("/login")}
                    className="rounded-2xl bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-zinc-200"
                  >
                    Entrar no Hub
                  </button>
                </div>
              </div>

              <button
                onClick={openInstagram}
                className="group rounded-[34px] border border-white/10 bg-white/[0.04] p-6 text-left transition hover:border-pink-500/60"
              >
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-zinc-500">
                      Perfil oficial
                    </p>
                    <h3 className="mt-1 break-all text-3xl font-black md:text-4xl">
                      @fatorzhouse
                    </h3>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] font-black">
                    @
                  </div>
                </div>

                <div className="space-y-3">
                  {["Bastidores", "Conteúdos", "Projetos", "Academy"].map(
                    (item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/45 px-4 py-3"
                      >
                        <span className="font-black">{item}</span>
                        <span className="text-pink-400">→</span>
                      </div>
                    )
                  )}
                </div>

                <p className="mt-6 text-sm font-bold text-zinc-500">
                  Clique para abrir o Instagram em uma nova aba.
                </p>
              </button>
            </div>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
          <div className="mb-10">
            <p className="mb-3 text-pink-500 font-black uppercase tracking-widest">
              Soluções
            </p>

            <h2 className="mb-4 text-4xl font-black md:text-6xl">
              Escolha o próximo passo.
            </h2>

            <p className="max-w-3xl text-lg text-zinc-400">
              Planos mensais, serviços avulsos, sites, landing pages e acesso ao
              FatorZ Academy.
            </p>
          </div>

          <div className="space-y-14">
            {categories.map((category) => {
              const categoryProducts = products.filter(
                (product) => product.category === category
              );

              return (
                <section key={category}>
                  <h3 className="mb-6 text-2xl font-black md:text-3xl">
                    {category}
                  </h3>

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {categoryProducts.map((product) => {
                      const isAcademy = product.id === "academy";

                      if (isAcademy) {
                        return (
                          <div
                            key={product.id}
                            className="group relative min-h-[620px] overflow-hidden rounded-[38px] border border-pink-500/35 bg-black text-white shadow-2xl shadow-pink-500/10 md:col-span-2 xl:col-span-2"
                          >
                            {academyCourse?.cover_url ? (
                              <img
                                src={academyCourse.cover_url}
                                alt={academyCourse.title}
                                className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,0,150,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(0,92,255,0.24),transparent_30%),linear-gradient(135deg,#020617,#050505,#180018)]" />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/35" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-pink-500/40 shadow-[0_0_80px_rgba(255,0,150,0.35)]" />
                            <div className="absolute -left-24 bottom-10 h-72 w-72 rounded-full border border-blue-500/35 shadow-[0_0_80px_rgba(0,92,255,0.25)]" />

                            <div className="relative z-10 flex h-full flex-col p-6 md:p-8">
                              <div className="mb-6 flex flex-wrap items-center gap-3">
                                {product.highlight && (
                                  <div className="w-fit rounded-xl bg-white px-4 py-2 text-sm font-black text-black">
                                    Destaque
                                  </div>
                                )}

                                <div className="rounded-xl border border-pink-500/40 bg-pink-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-pink-300">
                                  Academy
                                </div>

                                <div className="rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                                  Prévia aberta
                                </div>
                              </div>

                              <div className="max-w-3xl">
                                <p className="mb-4 text-sm font-black uppercase tracking-widest text-pink-400">
                                  {product.category}
                                </p>

                                <h4 className="mb-4 text-4xl font-black leading-none md:text-6xl">
                                  {academyCourse?.title || product.name}
                                </h4>

                                <p className="mb-5 max-w-2xl text-lg leading-relaxed text-zinc-200 md:text-xl">
                                  {academyCourse?.subtitle ||
                                    "Entre na área de aprendizado da FatorZ e veja o caminho para criar presença, conteúdo e direção usando IA."}
                                </p>

                                <p className="mb-7 max-w-2xl leading-relaxed text-zinc-400">
                                  {product.description}
                                </p>
                              </div>

                              <div className="my-3 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                                <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
                                  <p className="mb-2 font-bold text-zinc-400">
                                    Acesso mensal
                                  </p>

                                  <h5 className="mb-4 text-5xl font-black">
                                    {product.price}
                                  </h5>

                                  <p className="text-sm leading-relaxed text-zinc-400">
                                    A vitrine do Academy fica visível. As aulas,
                                    materiais e tarefas completas são liberadas
                                    com assinatura ativa.
                                  </p>
                                </div>

                                <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
                                  <p className="mb-4 text-xs font-black uppercase tracking-widest text-pink-400">
                                    Spoiler do conteúdo
                                  </p>

                                  <div className="space-y-3">
                                    {academyPreviewLessons.map(
                                      (lesson, index) => (
                                        <div
                                          key={`${lesson}-${index}`}
                                          className="flex items-center gap-3"
                                        >
                                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] text-sm font-black">
                                            {index + 1}
                                          </span>

                                          <p className="font-bold text-zinc-100">
                                            {lesson}
                                          </p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mb-8 mt-5 grid gap-3 sm:grid-cols-2">
                                {product.features.map((feature) => (
                                  <div
                                    key={feature}
                                    className="flex gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur"
                                  >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#005cff] to-[#ff0096] text-sm font-black">
                                      ✓
                                    </span>

                                    <p className="text-zinc-200">{feature}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-auto flex flex-col gap-3 sm:flex-row">
                                <button
                                  onClick={() => navigate("/academy")}
                                  className="rounded-2xl bg-white px-7 py-4 text-base font-black text-black transition hover:bg-zinc-200"
                                >
                                  Ver grade do Academy
                                </button>

                                <button
                                  onClick={() => handleBuy(product)}
                                  disabled={buyingId === product.id}
                                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-7 py-4 text-base font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {buyingId === product.id
                                    ? "Abrindo..."
                                    : "Desbloquear acesso"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={product.id}
                          className={`group flex flex-col rounded-[34px] border p-6 transition hover:-translate-y-1 ${
                            product.highlight
                              ? "border-pink-500/60 bg-gradient-to-br from-[#ff0096] via-[#9123ff] to-[#005cff] text-white shadow-[0_0_45px_rgba(255,0,150,0.18)]"
                              : "border-white/10 bg-white/[0.045] text-white hover:border-pink-500/50"
                          }`}
                        >
                          {product.highlight && (
                            <div className="mb-5 w-fit rounded-xl bg-white px-4 py-2 text-sm font-black text-black">
                              Destaque
                            </div>
                          )}

                          <p
                            className={`mb-3 text-sm font-black uppercase tracking-widest ${
                              product.highlight
                                ? "text-white/80"
                                : "text-pink-500"
                            }`}
                          >
                            {product.category}
                          </p>

                          <h4 className="mb-3 text-3xl font-black">
                            {product.name}
                          </h4>

                          <p
                            className={`mb-5 leading-relaxed ${
                              product.highlight
                                ? "text-white/85"
                                : "text-zinc-400"
                            }`}
                          >
                            {product.description}
                          </p>

                          <h5 className="mb-6 text-4xl font-black">
                            {product.price}
                          </h5>

                          <div className="mb-8 flex-1 space-y-3">
                            {product.features.map((feature) => (
                              <div key={feature} className="flex gap-3">
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                    product.highlight
                                      ? "bg-white text-pink-500"
                                      : "bg-pink-500 text-white"
                                  }`}
                                >
                                  ✓
                                </span>

                                <p
                                  className={
                                    product.highlight
                                      ? "text-white"
                                      : "text-zinc-300"
                                  }
                                >
                                  {feature}
                                </p>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => handleBuy(product)}
                            disabled={buyingId === product.id}
                            className={`w-full rounded-2xl px-6 py-4 font-black transition ${
                              product.highlight
                                ? "bg-white text-black hover:bg-zinc-200"
                                : "bg-white text-black hover:bg-zinc-200"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {buyingId === product.id
                              ? "Abrindo..."
                              : "Comprar agora"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 py-10 md:flex-row md:items-center md:px-8">
            <div>
              <h2 className="text-3xl font-black">
                Fator<span className="text-pink-500">Z</span>
              </h2>

              <p className="mt-2 text-zinc-500">
                Marketing, IA, conteúdo e presença digital.
              </p>
            </div>

            <button
              onClick={openInstagram}
              className="rounded-2xl border border-white/10 bg-white/[0.045] px-6 py-4 font-black transition hover:bg-white/10"
            >
              Instagram: @fatorzhouse
            </button>
          </div>
        </footer>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/95 p-3 backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => navigate("/login")}
            className="rounded-2xl bg-white px-2 py-4 text-xs font-black text-black"
          >
            Entrar
          </button>

          <button
            onClick={() => navigate("/mural")}
            className="rounded-2xl border border-pink-500/30 bg-pink-500/10 px-2 py-4 text-xs font-black text-white"
          >
            Mural
          </button>

          <button
            onClick={openInstagram}
            className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-2 py-4 text-xs font-black text-white"
          >
            Insta
          </button>

          <button
            onClick={scrollToPlans}
            className="rounded-2xl bg-pink-500 px-2 py-4 text-xs font-black text-white"
          >
            Planos
          </button>
        </div>
      </div>
    </div>
  );
}
