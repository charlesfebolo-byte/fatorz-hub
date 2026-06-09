import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Course = {
  id: number;
  created_at: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  badge: string | null;
  order_index: number | null;
  is_active: boolean | null;
  price_cents: number | null;
  payment_url: string | null;
  is_paid: boolean | null;
};

type AcademyProduct = {
  id: number;
  name: string;
  slug: string;
  course_id: number | null;
  is_active: boolean | null;
  accepts_pix: boolean | null;
  accepts_boleto: boolean | null;
  accepts_card: boolean | null;
  checkout_provider: string | null;
  external_payment_url: string | null;
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
  payment_provider?: string | null;
  payment_method?: string | null;
  amount_cents?: number | null;
  appmax_customer_id?: string | null;
  appmax_order_id?: string | null;
  appmax_payment_id?: string | null;
};

type PaymentMethod = "pix" | "boleto" | "card";

function formatMoneyFromCents(cents: number | null | undefined) {
  const value = Number(cents || 0) / 100;

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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

function getPurchaseStatusLabel(status: string | null | undefined) {
  if (status === "approved") return "Acesso liberado";
  if (status === "pending") return "Pagamento pendente";
  if (status === "cancelled" || status === "canceled") return "Cancelado";

  return "Não comprado";
}

function getPurchaseStatusClass(status: string | null | undefined) {
  if (status === "approved") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "pending") {
    return "border-orange-400/30 bg-orange-500/10 text-orange-300";
  }

  if (status === "cancelled" || status === "canceled") {
    return "border-red-400/30 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/[0.05] text-zinc-300";
}

function getMethodLabel(method: PaymentMethod) {
  if (method === "pix") return "Pix";
  if (method === "boleto") return "Boleto";
  return "Cartão";
}

function getMethodDescription(method: PaymentMethod) {
  if (method === "pix") return "Gera o Pix no checkout completo e registra a compra.";
  if (method === "boleto") return "Gera boleto no checkout completo da FatorZ.";
  return "Pagamento com cartão no checkout completo da FatorZ.";
}

export default function CheckoutAcademy({ user }: any) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const courseIdFromUrl = searchParams.get("courseId");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
  const [courseProducts, setCourseProducts] = useState<AcademyProduct[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("pix");

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCheckoutData();
  }, [user?.id, courseIdFromUrl]);

  async function loadCheckoutData() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [coursesResponse, purchasesResponse, productsResponse] = await Promise.all([
      supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true }),

      supabase
        .from("course_purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("site_products")
        .select(
          "id,name,slug,course_id,is_active,accepts_pix,accepts_boleto,accepts_card,checkout_provider,external_payment_url"
        )
        .eq("category", "academy")
        .eq("product_type", "course")
        .eq("is_active", true),
    ]);

    setLoading(false);

    if (coursesResponse.error) {
      console.log("Erro ao carregar cursos:", coursesResponse.error);
      alert("Erro ao carregar cursos da Academy.");
      return;
    }

    if (purchasesResponse.error) {
      console.log("Erro ao carregar compras:", purchasesResponse.error);
    }

    if (productsResponse.error) {
      console.log("Erro ao carregar produtos Academy:", productsResponse.error);
    }

    const activeCourses = coursesResponse.data || [];
    const userPurchases = purchasesResponse.data || [];
    const products = productsResponse.data || [];

    setCourses(activeCourses);
    setPurchases(userPurchases);
    setCourseProducts(products);

    let course: Course | null = null;

    if (courseIdFromUrl) {
      course =
        activeCourses.find(
          (item: Course) => String(item.id) === String(courseIdFromUrl)
        ) || null;
    }

    setSelectedCourse(course || activeCourses[0] || null);
  }

  const selectedPurchase = useMemo(() => {
    if (!selectedCourse) return null;

    return (
      purchases.find(
        (purchase) =>
          Number(purchase.course_id) === Number(selectedCourse.id) &&
          purchase.status === "approved"
      ) ||
      purchases.find(
        (purchase) =>
          Number(purchase.course_id) === Number(selectedCourse.id) &&
          purchase.status === "pending"
      ) ||
      null
    );
  }, [purchases, selectedCourse]);

  const selectedCourseProduct = useMemo(() => {
    if (!selectedCourse) return null;

    return (
      courseProducts.find(
        (product) => Number(product.course_id) === Number(selectedCourse.id)
      ) || null
    );
  }, [courseProducts, selectedCourse]);

  const paymentOptions = useMemo(() => {
    if (!selectedCourseProduct) return [];

    const options: PaymentMethod[] = [];

    if (selectedCourseProduct.accepts_pix) options.push("pix");
    if (selectedCourseProduct.accepts_boleto) options.push("boleto");
    if (selectedCourseProduct.accepts_card) options.push("card");

    return options;
  }, [selectedCourseProduct]);

  useEffect(() => {
    if (!paymentOptions.length) return;

    if (!paymentOptions.includes(selectedMethod)) {
      setSelectedMethod(paymentOptions[0]);
    }
  }, [paymentOptions, selectedMethod]);

  function openUnifiedCheckout(method: PaymentMethod) {
    if (!selectedCourse) {
      alert("Escolha um curso primeiro.");
      return;
    }

    if (selectedPurchase?.status === "approved") {
      navigate("/academy");
      return;
    }

    if (!selectedCourseProduct?.slug) {
      alert(
        "Esse curso ainda não tem um produto Academy vinculado. Vá em Produtos, categoria Academy, tipo Curso, e vincule o produto ao curso correto."
      );
      return;
    }

    if (selectedCourseProduct.checkout_provider === "manual") {
      alert("Esse curso está configurado para atendimento manual.");
      return;
    }

    navigate(
      `/checkout/produto?slug=${selectedCourseProduct.slug}&method=${method}&source=academy`
    );
  }

  async function checkAccess() {
    if (!user?.id) {
      navigate("/login");
      return;
    }

    if (!selectedCourse) {
      alert("Escolha um curso primeiro.");
      return;
    }

    setMessage("");
    setCheckingAccess(true);

    const { data, error } = await supabase
      .from("course_purchases")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", selectedCourse.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCheckingAccess(false);

    if (error) {
      console.log("Erro ao verificar acesso:", error);
      setMessage("Erro ao verificar acesso. Tente novamente em alguns segundos.");
      return;
    }

    if (!data) {
      setMessage("Ainda não encontramos uma compra registrada para esse curso.");
      return;
    }

    setPurchases((prev) => {
      const withoutCurrent = prev.filter((item) => item.id !== data.id);
      return [data, ...withoutCurrent];
    });

    if (data.status === "approved") {
      setMessage("Acesso vitalício confirmado. Redirecionando para o Academy...");

      setTimeout(() => {
        navigate("/academy");
      }, 800);

      return;
    }

    if (data.status === "pending") {
      setMessage(
        "Sua compra ainda está pendente. Se você já pagou, aguarde a aprovação ou o webhook da Appmax."
      );
      return;
    }

    setMessage(`Status atual da compra: ${data.status || "indefinido"}.`);
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-6">
        <div className="relative overflow-hidden max-w-2xl rounded-[42px] border border-white/10 bg-black p-8 md:p-12 text-center">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#ff0096]/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#005cff]/15 blur-3xl" />

          <div className="relative">
            <p className="text-pink-500 font-black uppercase tracking-[0.28em] mb-4">
              Login necessário
            </p>

            <h1 className="text-4xl md:text-6xl font-black mb-5">
              Fator<span className="text-pink-500">Z</span> Academy
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              Para comprar um curso e manter seu acesso vitalício na conta,
              primeiro entre ou crie seu login.
            </p>

            <button
              onClick={() => navigate("/login")}
              className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-8 py-5 font-black text-white transition hover:opacity-90"
            >
              Fazer login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center">
        Carregando checkout...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(0,92,255,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,0,150,0.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.14),transparent_34%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/80 px-4 py-5 backdrop-blur-2xl md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button
            onClick={() => navigate("/academy")}
            className="font-black text-zinc-400 transition hover:text-white"
          >
            ← Voltar para Academy
          </button>

          <h1 className="text-2xl font-black">
            Fator<span className="text-pink-500">Z</span>
          </h1>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <section className="relative mb-8 overflow-hidden rounded-[42px] border border-white/10 bg-black p-6 md:p-10">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff0096]/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#005cff]/15 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%)]" />

          <div className="relative">
            <p className="mb-4 text-sm font-black uppercase tracking-[0.28em] text-pink-500">
              Checkout FatorZ Academy
            </p>

            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              Escolha o curso e siga para o pagamento.
            </h1>

            <p className="mt-5 max-w-3xl text-zinc-400 md:text-lg">
              Os dados do cliente são preenchidos apenas no checkout final. Aqui
              você só escolhe o curso e a forma de pagamento.
            </p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <section className="rounded-[36px] border border-white/10 bg-white/[0.045] p-6">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Escolha o curso
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              {courses.map((course) => {
                const active = Number(selectedCourse?.id) === Number(course.id);

                return (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={`overflow-hidden rounded-[28px] border text-left transition hover:-translate-y-1 ${
                      active
                        ? "border-pink-500/55 bg-pink-500/10 shadow-[0_0_30px_rgba(255,0,150,0.15)]"
                        : "border-white/10 bg-black/35 hover:border-pink-500/30"
                    }`}
                  >
                    {course.cover_url && (
                      <div className="h-44 overflow-hidden bg-zinc-900">
                        <img
                          src={course.cover_url}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {course.badge && (
                          <span className="rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-pink-300">
                            {course.badge}
                          </span>
                        )}

                        {active && (
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white">
                            Selecionado
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-black">{course.title}</h2>

                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                        {course.subtitle ||
                          course.description ||
                          "Curso com acesso vitalício dentro da FatorZ Academy."}
                      </p>

                      <p className="mt-4 text-2xl font-black">
                        {course.is_paid
                          ? formatMoneyFromCents(course.price_cents)
                          : "Gratuito"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="h-fit rounded-[36px] border border-white/10 bg-black/70 p-6 lg:sticky lg:top-8">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
              Resumo da compra
            </p>

            {selectedCourse ? (
              <>
                {selectedCourse.cover_url && (
                  <div className="mb-5 h-44 overflow-hidden rounded-[26px] border border-white/10 bg-zinc-900">
                    <img
                      src={selectedCourse.cover_url}
                      alt={selectedCourse.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <h2 className="text-3xl font-black">{selectedCourse.title}</h2>

                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {selectedCourse.description ||
                    selectedCourse.subtitle ||
                    "Curso com acesso vitalício dentro da FatorZ Academy."}
                </p>

                <div className="my-6 rounded-[26px] border border-white/10 bg-white/[0.045] p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                    Valor
                  </p>

                  <p className="mt-2 text-4xl font-black">
                    {selectedCourse.is_paid
                      ? formatMoneyFromCents(selectedCourse.price_cents)
                      : "Gratuito"}
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    Acesso vitalício após aprovação.
                  </p>
                </div>

                <div
                  className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-black ${getPurchaseStatusClass(
                    selectedPurchase?.status
                  )}`}
                >
                  {getPurchaseStatusLabel(selectedPurchase?.status)}
                  {selectedPurchase?.created_at && (
                    <span className="mt-1 block text-xs font-bold opacity-80">
                      Registro: {formatDateTime(selectedPurchase.created_at)}
                    </span>
                  )}
                </div>

                {!selectedCourseProduct && (
                  <div className="mb-5 rounded-2xl border border-orange-400/25 bg-orange-500/10 p-4 text-sm font-bold leading-relaxed text-orange-200">
                    Esse curso ainda não tem produto vinculado no catálogo. Crie
                    ou edite um produto em Produtos → Categoria Academy → Tipo
                    Curso → vincule o Course ID correto.
                  </div>
                )}

                {!!paymentOptions.length && selectedPurchase?.status !== "approved" && (
                  <div className="mb-5 rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                    <p className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-500">
                      Forma de pagamento
                    </p>

                    <div className="grid gap-3">
                      {paymentOptions.map((method) => {
                        const active = selectedMethod === method;

                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setSelectedMethod(method)}
                            className={`rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-pink-500/45 bg-pink-500/10"
                                : "border-white/10 bg-black/30 hover:bg-white/[0.05]"
                            }`}
                          >
                            <p className="text-lg font-black uppercase">
                              {getMethodLabel(method)}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                              {getMethodDescription(method)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedPurchase?.status === "approved" ? (
                  <button
                    onClick={() => navigate("/academy")}
                    className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black transition hover:opacity-90"
                  >
                    Abrir curso
                  </button>
                ) : (
                  <button
                    onClick={() => openUnifiedCheckout(selectedMethod)}
                    disabled={!selectedCourseProduct || !paymentOptions.length}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-4 font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continuar para pagamento
                  </button>
                )}

                <button
                  onClick={checkAccess}
                  disabled={checkingAccess}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-black text-white transition hover:bg-white/[0.08] disabled:opacity-60"
                >
                  {checkingAccess ? "Verificando..." : "Verificar acesso"}
                </button>

                {message && (
                  <div className="mt-5 rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4 text-sm font-bold leading-relaxed text-blue-100">
                    {message}
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs leading-relaxed text-zinc-500">
                  Nome, e-mail, WhatsApp e CPF serão solicitados uma única vez
                  no checkout final. Dados de cartão nunca ficam salvos no Hub.
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-zinc-400">
                Nenhum curso disponível.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
