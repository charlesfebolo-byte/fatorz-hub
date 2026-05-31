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

    return academyLessons.slice(0, 3).map((lesson) => lesson.lesson_title);
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
    <div className="min-h-screen bg-[#09090B] text-white overflow-x-hidden pb-28 md:pb-0">
      <header className="sticky top-0 z-50 bg-[#09090B]/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-2xl md:text-3xl font-black text-white shrink-0"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <nav className="hidden lg:flex items-center gap-8 text-zinc-400 font-bold">
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
              className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white px-4 md:px-6 py-3 rounded-2xl font-black text-sm md:text-base"
            >
              Entrar
            </button>

            <button
              onClick={openInstagram}
              className="hidden sm:block bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 px-5 md:px-6 py-3 rounded-2xl font-black text-sm md:text-base"
            >
              @fatorzhouse
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-24 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-pink-500 font-black uppercase tracking-widest mb-5 text-sm md:text-base">
                Marketing, IA e presença digital
              </p>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] mb-7">
                Sua marca com presença de verdade.
              </h1>

              <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mb-8 leading-relaxed">
                A FatorZ cria conteúdo, sites, landing pages, estratégia digital
                e uma estrutura completa para transformar sua presença online em
                resultado.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={scrollToPlans}
                  className="bg-pink-500 hover:bg-pink-600 px-8 py-5 rounded-2xl font-black text-lg"
                >
                  Ver planos
                </button>

                <button
                  onClick={() => navigate("/login")}
                  className="bg-white text-black hover:bg-zinc-200 px-8 py-5 rounded-2xl font-black text-lg"
                >
                  Entrar no Hub
                </button>

                <button
                  onClick={openInstagram}
                  className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-8 py-5 rounded-2xl font-black text-lg"
                >
                  Ver Instagram
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-5 mt-10 max-w-2xl">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-5">
                  <h3 className="text-2xl md:text-3xl font-black">Conteúdo</h3>
                  <p className="text-zinc-500 text-sm mt-2">Posts e reels</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-5">
                  <h3 className="text-2xl md:text-3xl font-black">Sites</h3>
                  <p className="text-zinc-500 text-sm mt-2">Páginas e vendas</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-5">
                  <h3 className="text-2xl md:text-3xl font-black">IA</h3>
                  <p className="text-zinc-500 text-sm mt-2">Estratégia</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-6 md:p-8 shadow-2xl">
              <div className="bg-black border border-zinc-800 rounded-[32px] p-6 md:p-8 mb-5">
                <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
                  Siga a FatorZ
                </p>

                <h2 className="text-3xl md:text-5xl font-black mb-4">
                  Bastidores, projetos e resultados.
                </h2>

                <p className="text-zinc-400 mb-6">
                  Acompanhe os trabalhos, novidades e conteúdos da FatorZ no
                  Instagram oficial.
                </p>

                <button
                  onClick={openInstagram}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 px-6 py-4 rounded-2xl font-black"
                >
                  Seguir @fatorzhouse
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                  <p className="text-zinc-500 text-sm mb-1">Instagram</p>
                  <h3 className="text-2xl md:text-3xl font-black">
                    @fatorzhouse
                  </h3>
                </div>

                <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                  <p className="text-zinc-500 text-sm mb-1">Entregas</p>
                  <h3 className="text-3xl font-black text-green-400">Hub</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <div className="bg-gradient-to-r from-pink-500 to-purple-700 rounded-[40px] p-8 md:p-12 overflow-hidden relative">
            <div className="max-w-3xl relative z-10">
              <p className="font-black uppercase tracking-widest mb-4 text-white/80">
                Instagram oficial
              </p>

              <h2 className="text-4xl md:text-6xl font-black mb-5">
                Veja a FatorZ em ação.
              </h2>

              <p className="text-white/80 text-lg md:text-xl mb-8 leading-relaxed">
                Acompanhe bastidores, divulgações, conteúdos, clientes e
                novidades da agência pelo Instagram{" "}
                <span className="font-black text-white">@fatorzhouse</span>.
              </p>

              <button
                onClick={openInstagram}
                className="bg-white text-black hover:bg-zinc-200 px-8 py-5 rounded-2xl font-black text-lg"
              >
                Abrir Instagram da FatorZ
              </button>
            </div>

            <div className="hidden lg:block absolute -right-10 -bottom-16 text-[220px] font-black text-white/10 leading-none">
              @
            </div>
          </div>
        </section>

        <section id="planos" className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <div className="mb-10">
            <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
              Produtos
            </p>

            <h2 className="text-4xl md:text-6xl font-black mb-4">
              Escolha o plano ideal.
            </h2>

            <p className="text-zinc-400 text-lg max-w-3xl">
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
                  <h3 className="text-2xl md:text-3xl font-black mb-6">
                    {category}
                  </h3>

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {categoryProducts.map((product) => {
                      const isAcademy = product.id === "academy";

                      if (isAcademy) {
                        return (
                          <div
                            key={product.id}
                            className="group relative overflow-hidden rounded-[36px] border border-pink-500/40 bg-black text-white shadow-2xl shadow-pink-500/10 md:col-span-2 xl:col-span-2 min-h-[620px]"
                          >
                            {academyCourse?.cover_url ? (
                              <img
                                src={academyCourse.cover_url}
                                alt={academyCourse.title}
                                className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition duration-700"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.32),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.24),transparent_30%),linear-gradient(135deg,#020617,#050505,#180018)]" />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/35" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                            <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full border border-pink-500/40 shadow-[0_0_80px_rgba(236,72,153,0.35)]" />
                            <div className="absolute -left-24 bottom-10 w-72 h-72 rounded-full border border-blue-500/35 shadow-[0_0_80px_rgba(37,99,235,0.25)]" />

                            <div className="relative z-10 p-6 md:p-8 h-full flex flex-col">
                              <div className="flex flex-wrap items-center gap-3 mb-6">
                                {product.highlight && (
                                  <div className="bg-white text-black px-4 py-2 rounded-xl font-black text-sm w-fit">
                                    Destaque
                                  </div>
                                )}

                                <div className="bg-pink-500/15 border border-pink-500/40 text-pink-300 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-[0.25em]">
                                  Academy
                                </div>

                                <div className="bg-blue-500/15 border border-blue-500/40 text-blue-300 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-[0.25em]">
                                  Prévia liberada
                                </div>
                              </div>

                              <div className="max-w-3xl">
                                <p className="text-pink-400 font-black uppercase tracking-widest text-sm mb-4">
                                  {product.category}
                                </p>

                                <h4 className="text-4xl md:text-6xl font-black leading-none mb-4">
                                  {academyCourse?.title || product.name}
                                </h4>

                                <p className="text-zinc-200 text-lg md:text-xl leading-relaxed max-w-2xl mb-5">
                                  {academyCourse?.subtitle ||
                                    "Entre na área de aprendizado da FatorZ e veja o caminho para criar presença, conteúdo e direção usando IA."}
                                </p>

                                <p className="text-zinc-400 leading-relaxed max-w-2xl mb-7">
                                  {product.description}
                                </p>
                              </div>

                              <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5 my-3">
                                <div className="bg-white/[0.06] border border-white/10 rounded-[28px] p-6 backdrop-blur">
                                  <p className="text-zinc-400 font-bold mb-2">
                                    Acesso mensal
                                  </p>

                                  <h5 className="text-5xl font-black mb-4">
                                    {product.price}
                                  </h5>

                                  <p className="text-zinc-400 text-sm leading-relaxed">
                                    A vitrine do Academy fica visível. As aulas,
                                    materiais e tarefas completas são
                                    desbloqueadas com assinatura ativa.
                                  </p>
                                </div>

                                <div className="bg-white/[0.06] border border-white/10 rounded-[28px] p-6 backdrop-blur">
                                  <p className="text-pink-400 font-black uppercase tracking-widest text-xs mb-4">
                                    Spoiler do que tem dentro
                                  </p>

                                  <div className="space-y-3">
                                    {academyPreviewLessons.map((lesson, index) => (
                                      <div
                                        key={`${lesson}-${index}`}
                                        className="flex items-center gap-3"
                                      >
                                        <span className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center font-black text-sm shrink-0">
                                          {index + 1}
                                        </span>

                                        <p className="text-zinc-100 font-bold">
                                          {lesson}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-3 mb-8 mt-5">
                                {product.features.map((feature) => (
                                  <div
                                    key={feature}
                                    className="flex gap-3 bg-black/35 border border-white/10 rounded-2xl p-4 backdrop-blur"
                                  >
                                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-pink-500 flex items-center justify-center text-sm font-black shrink-0">
                                      ✓
                                    </span>

                                    <p className="text-zinc-200">{feature}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-auto flex flex-col sm:flex-row gap-3">
                                <button
                                  onClick={() => navigate("/academy")}
                                  className="bg-white text-black hover:bg-zinc-200 px-7 py-4 rounded-2xl font-black text-base transition"
                                >
                                  Ver grade do Academy
                                </button>

                                <button
                                  onClick={() => handleBuy(product)}
                                  disabled={buyingId === product.id}
                                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:opacity-90 text-white px-7 py-4 rounded-2xl font-black text-base transition disabled:opacity-60 disabled:cursor-not-allowed"
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
                          className={`rounded-[32px] p-6 border flex flex-col ${
                            product.highlight
                              ? "bg-pink-500 text-white border-pink-400"
                              : "bg-zinc-900 text-white border-zinc-800"
                          }`}
                        >
                          {product.highlight && (
                            <div className="bg-white text-black px-4 py-2 rounded-xl font-black text-sm w-fit mb-5">
                              Destaque
                            </div>
                          )}

                          <p
                            className={`font-black uppercase tracking-widest text-sm mb-3 ${
                              product.highlight
                                ? "text-white/80"
                                : "text-pink-500"
                            }`}
                          >
                            {product.category}
                          </p>

                          <h4 className="text-3xl font-black mb-3">
                            {product.name}
                          </h4>

                          <p
                            className={`mb-5 leading-relaxed ${
                              product.highlight
                                ? "text-white/80"
                                : "text-zinc-400"
                            }`}
                          >
                            {product.description}
                          </p>

                          <h5 className="text-4xl font-black mb-6">
                            {product.price}
                          </h5>

                          <div className="space-y-3 mb-8 flex-1">
                            {product.features.map((feature) => (
                              <div key={feature} className="flex gap-3">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
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
                            className={`w-full px-6 py-4 rounded-2xl font-black transition ${
                              product.highlight
                                ? "bg-white text-black hover:bg-zinc-200"
                                : "bg-pink-500 hover:bg-pink-600 text-white"
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
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

        <footer className="border-t border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black">
                Fator<span className="text-pink-500">Z</span>
              </h2>

              <p className="text-zinc-500 mt-2">
                Marketing, IA, conteúdo e presença digital.
              </p>
            </div>

            <button
              onClick={openInstagram}
              className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-6 py-4 rounded-2xl font-black"
            >
              Instagram: @fatorzhouse
            </button>
          </div>
        </footer>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-3">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate("/login")}
            className="bg-white text-black px-3 py-4 rounded-2xl font-black text-sm"
          >
            Entrar
          </button>

          <button
            onClick={openInstagram}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-4 rounded-2xl font-black text-sm"
          >
            Insta
          </button>

          <button
            onClick={scrollToPlans}
            className="bg-pink-500 text-white px-3 py-4 rounded-2xl font-black text-sm"
          >
            Planos
          </button>
        </div>
      </div>
    </div>
  );
}
