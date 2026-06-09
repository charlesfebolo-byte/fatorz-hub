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
  payment_provider?: string | null;
  payment_method?: string | null;
  amount_cents?: number | null;
  pix_qr_code?: string | null;
  pix_copy_paste?: string | null;
  appmax_customer_id?: string | null;
  appmax_order_id?: string | null;
  appmax_payment_id?: string | null;
};

type PaymentMethod = "pix" | "card" | "boleto";

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);

  return numbers
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatPhone(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);

  if (numbers.length <= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numbers
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

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

function isQrImage(value: string | null | undefined) {
  if (!value) return false;

  return (
    value.startsWith("data:image") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

export default function CheckoutAcademy({ user, profile }: any) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const courseIdFromUrl = searchParams.get("courseId");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);

  const [customerName, setCustomerName] = useState(
    profile?.nome || profile?.name || ""
  );
  const [customerPhone, setCustomerPhone] = useState(profile?.whatsapp || "");
  const [documentNumber, setDocumentNumber] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingPix, setLoadingPix] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [message, setMessage] = useState("");

  const [pixCopyPaste, setPixCopyPaste] = useState("");
  const [pixQrCode, setPixQrCode] = useState("");
  const [appmaxOrderId, setAppmaxOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

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

    let course: Course | null = null;

    if (courseIdFromUrl) {
      course =
        activeCourses.find(
          (item: Course) => String(item.id) === String(courseIdFromUrl)
        ) || null;
    }

    setSelectedCourse(course || activeCourses[0] || null);

    const currentPurchase =
      userPurchases.find(
        (purchase: CoursePurchase) =>
          Number(purchase.course_id) === Number(course?.id || courseIdFromUrl) &&
          purchase.status === "pending"
      ) || null;

    if (currentPurchase?.pix_copy_paste) {
      setPixCopyPaste(currentPurchase.pix_copy_paste);
      setPixQrCode(currentPurchase.pix_qr_code || "");
      setAppmaxOrderId(currentPurchase.appmax_order_id || "");
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

  async function createAppmaxPix() {
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

    const cleanCpf = onlyNumbers(documentNumber);
    const cleanPhone = onlyNumbers(customerPhone);

    if (!customerName.trim()) {
      alert("Informe seu nome completo.");
      return;
    }

    if (cleanPhone.length < 10) {
      alert("Informe seu WhatsApp com DDD.");
      return;
    }

    if (cleanCpf.length !== 11) {
      alert("Informe um CPF válido com 11 números.");
      return;
    }

    setMessage("");
    setPixCopyPaste("");
    setPixQrCode("");
    setAppmaxOrderId("");
    setLoadingPix(true);

    try {
      const response = await fetch("/api/create-academy-pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          customerName,
          customerPhone: cleanPhone,
          documentNumber: cleanCpf,
          courseId: selectedCourse.id,
        }),
      });

      const data = await response.json();

      setLoadingPix(false);

      if (!response.ok || data.error) {
        console.log("Erro Pix Appmax:", data);
        setMessage(data.error || "Erro ao gerar Pix.");
        return;
      }

      if (data.alreadyApproved) {
        setMessage("Esse curso já está liberado na sua conta.");
        navigate("/academy");
        return;
      }

      const copyPaste =
        data?.pix?.copy_paste ||
        data?.purchase?.pix_copy_paste ||
        data?.pix?.qr_code ||
        "";

      const qrCode =
        data?.pix?.qr_code ||
        data?.purchase?.pix_qr_code ||
        "";

      setPixCopyPaste(copyPaste || "");
      setPixQrCode(qrCode || "");
      setAppmaxOrderId(String(data?.appmax?.order_id || ""));

      if (data.purchase) {
        setPurchases((prev) => {
          const withoutCurrent = prev.filter((item) => item.id !== data.purchase.id);
          return [data.purchase, ...withoutCurrent];
        });
      }

      setMessage(
        "Pix gerado com sucesso. Após o pagamento ser confirmado, a FatorZ libera seu acesso vitalício."
      );
    } catch (error: any) {
      setLoadingPix(false);
      console.log("Erro ao chamar API Pix:", error);
      setMessage(
        "Erro ao conectar com a função de pagamento. Verifique se você está rodando com npx vercel dev."
      );
    }
  }

  async function copyPix() {
    if (!pixCopyPaste) {
      alert("Nenhum código Pix disponível.");
      return;
    }

    await navigator.clipboard.writeText(pixCopyPaste);
    alert("Código Pix copiado.");
  }

  function openExternalCoursePayment(method: "card" | "boleto") {
    if (!selectedCourse) {
      alert("Escolha um curso primeiro.");
      return;
    }

    if (hasApprovedAccess) {
      navigate("/academy");
      return;
    }

    if (!selectedCourse.payment_url) {
      alert(
        method === "card"
          ? "Cadastre o link de pagamento por cartão neste curso."
          : "Cadastre o link de pagamento por boleto neste curso."
      );
      return;
    }

    setMessage(
      method === "card"
        ? "Abrindo pagamento por cartão. Depois do pagamento, volte aqui e clique em Verificar acesso."
        : "Abrindo pagamento por boleto. Depois do pagamento, volte aqui e clique em Verificar acesso."
    );

    window.open(selectedCourse.payment_url, "_blank", "noopener,noreferrer");
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
        "Ainda não encontramos uma compra registrada para esse curso. Gere o Pix ou pague pelo link de cartão/boleto primeiro."
      );
      return;
    }

    setPurchases((prev) => {
      const withoutCurrent = prev.filter((item) => item.id !== data.id);
      return [data, ...withoutCurrent];
    });

    if (data.pix_copy_paste) {
      setPixCopyPaste(data.pix_copy_paste);
      setPixQrCode(data.pix_qr_code || "");
      setAppmaxOrderId(data.appmax_order_id || "");
    }

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
              Checkout FatorZ
            </p>

            <h2 className="text-4xl md:text-6xl font-black leading-tight mb-4">
              Escolha como pagar{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
                seu curso.
              </span>
            </h2>

            <p className="max-w-4xl text-zinc-400 text-lg leading-relaxed">
              Use Pix dentro do Hub ou abra o pagamento externo por cartão ou boleto,
              conforme o link configurado no curso.
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
                  const approved = purchases.find(
                    (item) =>
                      Number(item.course_id) === Number(course.id) &&
                      item.status === "approved"
                  );

                  const pending = purchases.find(
                    (item) =>
                      Number(item.course_id) === Number(course.id) &&
                      item.status === "pending"
                  );

                  return (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course);
                        setMessage("");
                        setPixCopyPaste(pending?.pix_copy_paste || "");
                        setPixQrCode(pending?.pix_qr_code || "");
                        setAppmaxOrderId(pending?.appmax_order_id || "");
                        setPaymentMethod("pix");
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

                          {approved && (
                            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
                              Liberado
                            </span>
                          )}

                          {pending && (
                            <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-orange-300">
                              Pagamento pendente
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

                  <h3 className="text-3xl font-black">{selectedCourse.title}</h3>

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

                  {!hasApprovedAccess && (
                    <div className="mb-5 rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-4">
                        Forma de pagamento
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("pix")}
                          className={`rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-widest transition ${
                            paymentMethod === "pix"
                              ? "border-pink-500/50 bg-pink-500/15 text-pink-200"
                              : "border-white/10 bg-black/40 text-zinc-400 hover:bg-white/[0.06]"
                          }`}
                        >
                          Pix
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod("card")}
                          className={`rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-widest transition ${
                            paymentMethod === "card"
                              ? "border-blue-500/50 bg-blue-500/15 text-blue-200"
                              : "border-white/10 bg-black/40 text-zinc-400 hover:bg-white/[0.06]"
                          }`}
                        >
                          Cartão
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod("boleto")}
                          className={`rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-widest transition ${
                            paymentMethod === "boleto"
                              ? "border-yellow-500/50 bg-yellow-500/15 text-yellow-200"
                              : "border-white/10 bg-black/40 text-zinc-400 hover:bg-white/[0.06]"
                          }`}
                        >
                          Boleto
                        </button>
                      </div>

                      {paymentMethod !== "pix" && (
                        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                          Cartão e boleto usam o link de pagamento configurado no curso.
                          Após pagar, volte aqui e clique em Verificar acesso.
                        </p>
                      )}
                    </div>
                  )}

                  {!hasApprovedAccess && paymentMethod === "pix" && (
                    <div className="mb-5 rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-4">
                        Dados para gerar Pix
                      </p>

                      <div className="space-y-3">
                        <input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Nome completo"
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                        />

                        <input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                          placeholder="WhatsApp com DDD"
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                        />

                        <input
                          value={documentNumber}
                          onChange={(e) =>
                            setDocumentNumber(formatCpf(e.target.value))
                          }
                          placeholder="CPF"
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {paymentMethod === "pix" && (
                      <button
                        onClick={createAppmaxPix}
                        disabled={loadingPix}
                        className="w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {loadingPix
                          ? "Gerando Pix..."
                          : hasApprovedAccess
                          ? "Abrir Academy"
                          : hasPendingPurchase
                          ? "Gerar novo Pix"
                          : "Gerar Pix"}
                      </button>
                    )}

                    {paymentMethod === "card" && (
                      <button
                        onClick={() => openExternalCoursePayment("card")}
                        className="w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
                      >
                        {hasApprovedAccess ? "Abrir Academy" : "Pagar com cartão"}
                      </button>
                    )}

                    {paymentMethod === "boleto" && (
                      <button
                        onClick={() => openExternalCoursePayment("boleto")}
                        className="w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
                      >
                        {hasApprovedAccess ? "Abrir Academy" : "Pagar com boleto"}
                      </button>
                    )}

                    <button
                      onClick={checkAccess}
                      disabled={checkingAccess}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white transition hover:bg-white/[0.08] disabled:opacity-60"
                    >
                      {checkingAccess ? "Verificando..." : "Verificar acesso"}
                    </button>
                  </div>

                  {(pixCopyPaste || pixQrCode) && (
                    <div className="mt-5 rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-emerald-300 mb-3">
                        Pix gerado
                      </p>

                      {appmaxOrderId && (
                        <p className="mb-3 text-xs text-emerald-100/70">
                          Pedido Appmax: {appmaxOrderId}
                        </p>
                      )}

                      {isQrImage(pixQrCode) && (
                        <div className="mb-4 overflow-hidden rounded-2xl bg-white p-3">
                          <img
                            src={pixQrCode}
                            alt="QR Code Pix"
                            className="mx-auto h-56 w-56 object-contain"
                          />
                        </div>
                      )}

                      {pixCopyPaste && (
                        <>
                          <textarea
                            value={pixCopyPaste}
                            readOnly
                            rows={5}
                            className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 p-4 text-xs text-zinc-300 outline-none"
                          />

                          <button
                            onClick={copyPix}
                            className="mt-3 w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black transition hover:opacity-90"
                          >
                            Copiar código Pix
                          </button>
                        </>
                      )}

                      {!pixCopyPaste && pixQrCode && !isQrImage(pixQrCode) && (
                        <>
                          <textarea
                            value={pixQrCode}
                            readOnly
                            rows={5}
                            className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 p-4 text-xs text-zinc-300 outline-none"
                          />

                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(pixQrCode);
                              alert("Código Pix copiado.");
                            }}
                            className="mt-3 w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black transition hover:opacity-90"
                          >
                            Copiar código Pix
                          </button>
                        </>
                      )}
                    </div>
                  )}

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