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

export default function CheckoutAcademy({ user }: any) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const courseIdFromUrl = searchParams.get("courseId");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCheckoutData();
  }, [user?.id, courseIdFromUrl]);

  async function loadCheckoutData() {
    setLoading(true);

    const coursesQuery = supabase
      .from("courses")
      .select("*")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    const [coursesResponse, purchasesResponse] = await Promise.all([
      coursesQuery,
      user?.id
        ? supabase
            .from("course_purchases")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null } as any),
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

    const activeCourses = coursesResponse.data || [];
    const userPurchases = purchasesResponse.data || [];

    setCourses(activeCourses);
    setPurchases(userPurchases);

    if (courseIdFromUrl) {
      const course = activeCourses.find(
        (item: Course) => String(item.id) === String(courseIdFromUrl)
      );

      setSelectedCourse(course || activeCourses[0] || null);
    } else {
      setSelectedCourse(activeCourses[0] || null);
    }
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

  const hasApprovedAccess = selectedPurchase?.status === "approved";
  const hasPendingPurchase = selectedPurchase?.status === "pending";

  async function createPendingPurchase(course: Course) {
    if (!user?.email || !user?.id) {
      alert("Você precisa estar logado para comprar um curso.");
      navigate("/login");
      return null;
    }

    const existingPending = purchases.find(
      (purchase) =>
        Number(purchase.course_id) === Number(course.id) &&
        purchase.status === "pending"
    );

    if (existingPending) {
      return existingPending;
    }

    const { data, error } = await supabase
      .from("course_purchases")
      .insert({
        user_id: user.id,
        user_email: user.email,
        course_id: course.id,
        course_title: course.title,
        payment_id: null,
        payment_url: course.payment_url || "",
        status: "pending",
        access_type: "lifetime",
        approved_at: null,
        notes: "Compra vitalícia criada pelo Checkout Academy.",
      })
      .select("*")
      .single();

    if (error) {
      console.log("Erro ao criar compra pendente:", error);
      return null;
    }

    setPurchases((prev) => [data, ...prev]);

    return data as CoursePurchase;
  }

  async function openPayment() {
    if (!selectedCourse) {
      alert("Escolha um curso primeiro.");
      return;
    }

    if (!user?.email || !user?.id) {
      alert("Você precisa estar logado para comprar.");
      navigate("/login");
      return;
    }

    if (hasApprovedAccess) {
      navigate("/academy");
      return;
    }

    if (!selectedCourse.payment_url) {
      alert("Esse curso ainda não tem link de pagamento cadastrado.");
      return;
    }

    setMessage("");
    setLoadingPayment(true);

    const purchase = await createPendingPurchase(selectedCourse);

    setLoadingPayment(false);

    if (!purchase) {
      const continuar = confirm(
        "Não consegui registrar a intenção de compra no sistema, mas você ainda pode abrir o pagamento. Quer continuar?"
      );

      if (!continuar) return;
    }

    window.open(selectedCourse.payment_url, "_blank");

    setMessage(
      "Pagamento aberto. Depois de pagar, aguarde a liberação manual ou clique em verificar acesso."
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
      setMessage(
        "Ainda não encontramos uma compra registrada para esse curso. Clique em comprar primeiro."
      );
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
        "Sua compra ainda está pendente. Se você já pagou, aguarde a aprovação manual da FatorZ."
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

  if (!courses.length) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-6">
        <div className="max-w-2xl rounded-[42px] border border-white/10 bg-black p-8 md:p-12 text-center">
          <p className="text-pink-500 font-black uppercase tracking-[0.28em] mb-4">
            Academy
          </p>

          <h1 className="text-4xl font-black mb-5">
            Nenhum curso ativo encontrado.
          </h1>

          <p className="text-zinc-400 mb-8">
            Cadastre ou ative um curso no painel admin da Academy.
          </p>

          <button
            onClick={() => navigate("/academy")}
            className="rounded-2xl bg-white px-8 py-4 font-black text-black"
          >
            Voltar para Academy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(0,92,255,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,0,150,0.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.14),transparent_34%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/80 px-4 py-5 backdrop-blur-2xl md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <button
            onClick={() => navigate("/academy")}
            className="text-zinc-400 hover:text-white font-black"
          >
            ← Voltar para Academy
          </button>

          <h1 className="text-2xl font-black">
            Fator<span className="text-pink-500">Z</span>
          </h1>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-10 md:px-8 md:py-14">
        <section className="relative overflow-hidden rounded-[42px] border border-white/10 bg-black p-6 md:p-10 mb-8">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#ff0096]/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#005cff]/15 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%)]" />

          <div className="relative">
            <p className="text-pink-500 font-black uppercase tracking-[0.28em] text-sm mb-4">
              Checkout Academy
            </p>

            <h2 className="text-4xl md:text-6xl font-black leading-tight mb-4">
              Compra vitalícia por{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
                curso.
              </span>
            </h2>

            <p className="max-w-4xl text-zinc-400 text-lg leading-relaxed">
              Escolha o curso, registre sua compra, pague pelo Mercado Pago e,
              após aprovação da FatorZ, o acesso fica liberado na sua conta para
              sempre.
            </p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <section className="space-y-5">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 md:p-6">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                Escolha o curso
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {courses.map((course) => {
                  const active = selectedCourse?.id === course.id;
                  const purchase = purchases.find(
                    (item) =>
                      Number(item.course_id) === Number(course.id) &&
                      item.status === "approved"
                  );

                  return (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course);
                        setMessage("");
                      }}
                      className={`overflow-hidden rounded-[28px] border text-left transition hover:-translate-y-1 ${
                        active
                          ? "border-pink-500/45 bg-pink-500/[0.08] shadow-[0_0_35px_rgba(255,0,150,0.12)]"
                          : "border-white/10 bg-black/40 hover:border-white/20"
                      }`}
                    >
                      {course.cover_url && (
                        <div className="h-36 w-full overflow-hidden bg-zinc-900">
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

                          {purchase && (
                            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
                              Comprado
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-black">{course.title}</h3>

                        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                          {course.subtitle ||
                            course.description ||
                            "Curso FatorZ Academy com acesso vitalício."}
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
            </div>
          </section>

          <aside className="lg:sticky lg:top-8 h-fit">
            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-black/70 p-6">
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

                  <h3 className="text-3xl font-black">
                    {selectedCourse.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {selectedCourse.description ||
                      selectedCourse.subtitle ||
                      "Curso com acesso vitalício dentro da FatorZ Academy."}
                  </p>

                  <div className="my-6 rounded-[26px] border border-white/10 bg-white/[0.045] p-5">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
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
                      <span className="block mt-1 text-xs font-bold opacity-80">
                        Registro: {formatDateTime(selectedPurchase.created_at)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={openPayment}
                      disabled={loadingPayment}
                      className="w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {loadingPayment
                        ? "Registrando..."
                        : hasApprovedAccess
                        ? "Abrir Academy"
                        : hasPendingPurchase
                        ? "Abrir pagamento novamente"
                        : "Comprar acesso vitalício"}
                    </button>

                    <button
                      onClick={checkAccess}
                      disabled={checkingAccess}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white transition hover:bg-white/[0.08] disabled:opacity-60"
                    >
                      {checkingAccess ? "Verificando..." : "Verificar acesso"}
                    </button>
                  </div>

                  {message && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-zinc-300">
                      {message}
                    </div>
                  )}

                  <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-3">
                      Conta
                    </p>

                    <p className="break-all text-sm font-black text-white">
                      {user.email}
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                      O curso será vinculado a esta conta.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-zinc-400">Escolha um curso para continuar.</p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}