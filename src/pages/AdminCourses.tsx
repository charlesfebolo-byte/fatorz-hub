import { useEffect, useMemo, useState } from "react";
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

type Lesson = {
  id: number;
  created_at: string;
  course_id: number | null;
  module_title: string;
  lesson_title: string;
  description: string | null;
  video_url: string;
  order_index: number | null;
};

type CoursePurchase = {
  id: number;
  course_id: number | null;
  status: string | null;
};

const emptyCourse: Partial<Course> = {
  title: "",
  subtitle: "",
  description: "",
  cover_url: "",
  badge: "",
  order_index: 1,
  is_active: true,
  price_cents: 4700,
  payment_url: "",
  is_paid: true,
};

const emptyLesson: Partial<Lesson> = {
  course_id: null,
  module_title: "",
  lesson_title: "",
  description: "",
  video_url: "",
  order_index: 1,
};

function formatMoneyFromCents(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function selectClassName() {
  return "w-full rounded-2xl border border-white/10 bg-[#0B0B10] px-4 py-4 text-white outline-none focus:border-pink-500/40";
}

function optionStyle() {
  return {
    backgroundColor: "#0B0B10",
    color: "#ffffff",
  };
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editingCourse, setEditingCourse] = useState<Partial<Course>>(emptyCourse);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson>>(emptyLesson);

  const [courseMode, setCourseMode] = useState<"create" | "edit">("create");
  const [lessonMode, setLessonMode] = useState<"create" | "edit">("create");

  const [loading, setLoading] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [coursesResponse, lessonsResponse, purchasesResponse] =
      await Promise.all([
        supabase
          .from("courses")
          .select("*")
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true }),

        supabase
          .from("lessons")
          .select("*")
          .order("course_id", { ascending: true })
          .order("module_title", { ascending: true })
          .order("order_index", { ascending: true }),

        supabase.from("course_purchases").select("id, course_id, status"),
      ]);

    setLoading(false);

    if (coursesResponse.error) {
      console.log("Erro ao carregar cursos:", coursesResponse.error);
      alert("Erro ao carregar cursos.");
      return;
    }

    if (lessonsResponse.error) {
      console.log("Erro ao carregar aulas:", lessonsResponse.error);
      alert("Erro ao carregar aulas.");
      return;
    }

    if (purchasesResponse.error) {
      console.log("Erro ao carregar compras:", purchasesResponse.error);
    }

    const courseData = coursesResponse.data || [];
    setCourses(courseData);
    setLessons(lessonsResponse.data || []);
    setPurchases(purchasesResponse.data || []);

    if (!selectedCourseId && courseData.length > 0) {
      setSelectedCourseId(courseData[0].id);
    }
  }

  function resetCourseForm() {
    setCourseMode("create");
    setEditingCourse(emptyCourse);
  }

  function resetLessonForm() {
    setLessonMode("create");
    setEditingLesson({
      ...emptyLesson,
      course_id: selectedCourseId,
    });
  }

  function editCourse(course: Course) {
    setCourseMode("edit");
    setEditingCourse(course);
    setSelectedCourseId(course.id);

    setTimeout(() => {
      document
        .getElementById("form-curso")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function editLesson(lesson: Lesson) {
    setLessonMode("edit");
    setEditingLesson(lesson);
    setSelectedCourseId(lesson.course_id);

    setTimeout(() => {
      document
        .getElementById("form-aula")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function saveCourse() {
    if (!editingCourse.title?.trim()) {
      alert("Informe o título do curso.");
      return;
    }

    if (editingCourse.is_paid && !editingCourse.payment_url?.trim()) {
      const confirmSave = confirm(
        "Esse curso está marcado como pago, mas não tem link de pagamento. Quer salvar mesmo assim?"
      );

      if (!confirmSave) return;
    }

    setSavingCourse(true);

    const payload = {
      title: editingCourse.title?.trim(),
      subtitle: editingCourse.subtitle?.trim() || null,
      description: editingCourse.description?.trim() || null,
      cover_url: editingCourse.cover_url?.trim() || null,
      badge: editingCourse.badge?.trim() || null,
      order_index: Number(editingCourse.order_index || 1),
      is_active: Boolean(editingCourse.is_active),
      price_cents: Number(editingCourse.price_cents || 0),
      payment_url: editingCourse.payment_url?.trim() || null,
      is_paid: Boolean(editingCourse.is_paid),
    };

    const response =
      courseMode === "edit" && editingCourse.id
        ? await supabase.from("courses").update(payload).eq("id", editingCourse.id)
        : await supabase.from("courses").insert(payload);

    setSavingCourse(false);

    if (response.error) {
      console.log("Erro ao salvar curso:", response.error);
      alert("Erro ao salvar curso.");
      return;
    }

    alert(courseMode === "edit" ? "Curso atualizado." : "Curso criado.");
    resetCourseForm();
    loadData();
  }

  async function saveLesson() {
    if (!editingLesson.course_id) {
      alert("Escolha o curso da aula.");
      return;
    }

    if (!editingLesson.module_title?.trim()) {
      alert("Informe o módulo da aula.");
      return;
    }

    if (!editingLesson.lesson_title?.trim()) {
      alert("Informe o título da aula.");
      return;
    }

    if (!editingLesson.video_url?.trim()) {
      alert("Informe a URL do vídeo.");
      return;
    }

    setSavingLesson(true);

    const payload = {
      course_id: Number(editingLesson.course_id),
      module_title: editingLesson.module_title?.trim(),
      lesson_title: editingLesson.lesson_title?.trim(),
      description: editingLesson.description?.trim() || null,
      video_url: editingLesson.video_url?.trim(),
      order_index: Number(editingLesson.order_index || 1),
    };

    const response =
      lessonMode === "edit" && editingLesson.id
        ? await supabase.from("lessons").update(payload).eq("id", editingLesson.id)
        : await supabase.from("lessons").insert(payload);

    setSavingLesson(false);

    if (response.error) {
      console.log("Erro ao salvar aula:", response.error);
      alert("Erro ao salvar aula.");
      return;
    }

    alert(lessonMode === "edit" ? "Aula atualizada." : "Aula criada.");
    resetLessonForm();
    loadData();
  }

  async function deleteCourse(course: Course) {
    const confirmDelete = confirm(
      `Tem certeza que quer apagar o curso "${course.title}"?\n\nIsso pode apagar ou quebrar aulas vinculadas e compras antigas. Só faça se tiver certeza.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("courses").delete().eq("id", course.id);

    if (error) {
      console.log("Erro ao apagar curso:", error);
      alert("Erro ao apagar curso. Talvez existam aulas ou compras vinculadas.");
      return;
    }

    alert("Curso apagado.");
    setSelectedCourseId(null);
    resetCourseForm();
    loadData();
  }

  async function deleteLesson(lesson: Lesson) {
    const confirmDelete = confirm(
      `Apagar a aula "${lesson.lesson_title}"?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);

    if (error) {
      console.log("Erro ao apagar aula:", error);
      alert("Erro ao apagar aula.");
      return;
    }

    alert("Aula apagada.");
    resetLessonForm();
    loadData();
  }

  async function toggleCourseActive(course: Course) {
    const { error } = await supabase
      .from("courses")
      .update({
        is_active: !course.is_active,
      })
      .eq("id", course.id);

    if (error) {
      console.log("Erro ao alterar status:", error);
      alert("Erro ao alterar status do curso.");
      return;
    }

    loadData();
  }

  async function uploadCover(file: File) {
    if (!file) return;

    setUploadingCover(true);

    const ext = file.name.split(".").pop();
    const fileName = `course-cover-${Date.now()}.${ext}`;
    const filePath = `courses/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("academy")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    setUploadingCover(false);

    if (uploadError) {
      console.log("Erro upload capa:", uploadError);
      alert(
        "Erro ao subir capa. Verifique se existe um bucket público chamado academy no Supabase Storage."
      );
      return;
    }

    const { data } = supabase.storage.from("academy").getPublicUrl(filePath);

    setEditingCourse((prev) => ({
      ...prev,
      cover_url: data.publicUrl,
    }));
  }

  function getLessonsByCourse(courseId: number) {
    return lessons.filter((lesson) => Number(lesson.course_id) === Number(courseId));
  }

  function getPurchasesByCourse(courseId: number) {
    return purchases.filter(
      (purchase) => Number(purchase.course_id) === Number(courseId)
    );
  }

  function getApprovedPurchasesByCourse(courseId: number) {
    return getPurchasesByCourse(courseId).filter(
      (purchase) => purchase.status === "approved"
    );
  }

  function getPendingPurchasesByCourse(courseId: number) {
    return getPurchasesByCourse(courseId).filter(
      (purchase) => purchase.status === "pending"
    );
  }

  const selectedCourse = useMemo(() => {
    return courses.find((course) => course.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const selectedLessons = useMemo(() => {
    if (!selectedCourseId) return [];

    return getLessonsByCourse(selectedCourseId);
  }, [lessons, selectedCourseId]);

  const filteredCourses = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return courses;

    return courses.filter((course) => {
      return (
        course.title.toLowerCase().includes(value) ||
        course.subtitle?.toLowerCase().includes(value) ||
        course.description?.toLowerCase().includes(value) ||
        course.badge?.toLowerCase().includes(value)
      );
    });
  }, [courses, search]);

  const stats = useMemo(() => {
    const activeCourses = courses.filter((course) => course.is_active).length;
    const paidCourses = courses.filter((course) => course.is_paid).length;
    const freeCourses = courses.filter((course) => !course.is_paid).length;
    const totalLessons = lessons.length;
    const approvedPurchases = purchases.filter(
      (purchase) => purchase.status === "approved"
    ).length;
    const pendingPurchases = purchases.filter(
      (purchase) => purchase.status === "pending"
    ).length;

    return {
      activeCourses,
      paidCourses,
      freeCourses,
      totalLessons,
      approvedPurchases,
      pendingPurchases,
    };
  }, [courses, lessons, purchases]);

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Cursos Academy</h1>
        <p className="text-zinc-400">Carregando cursos...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-black p-6 md:p-10 mb-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#ff0096]/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#005cff]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%)]" />

        <div className="relative">
          <p className="text-pink-500 font-black uppercase tracking-[0.28em] text-sm mb-4">
            FatorZ Academy
          </p>

          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
            Cursos com acesso{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
              vitalício.
            </span>
          </h1>

          <p className="max-w-4xl text-zinc-400 text-lg leading-relaxed">
            Cadastre cursos públicos, defina preço único, link do Mercado Pago,
            capa, aulas e estrutura. Sem assinatura mensal, sem renovação de 30
            dias e sem vencimento.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5 mb-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Cursos ativos
          </p>
          <h2 className="mt-3 text-4xl font-black text-emerald-300">
            {stats.activeCourses}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Cursos pagos
          </p>
          <h2 className="mt-3 text-4xl font-black text-pink-300">
            {stats.paidCourses}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Gratuitos
          </p>
          <h2 className="mt-3 text-4xl font-black">{stats.freeCourses}</h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Aulas
          </p>
          <h2 className="mt-3 text-4xl font-black text-blue-300">
            {stats.totalLessons}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Liberados
          </p>
          <h2 className="mt-3 text-4xl font-black text-emerald-300">
            {stats.approvedPurchases}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Pendentes
          </p>
          <h2 className="mt-3 text-4xl font-black text-orange-300">
            {stats.pendingPurchases}
          </h2>
        </div>
      </section>

      <section className="grid xl:grid-cols-[430px_1fr] gap-8">
        <aside className="space-y-8">
          <div
            id="form-curso"
            className="rounded-[36px] border border-white/10 bg-black/60 p-6"
          >
            <div className="mb-6">
              <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
                {courseMode === "edit" ? "Editar curso" : "Novo curso"}
              </p>

              <h2 className="text-3xl font-black">
                {courseMode === "edit" ? "Atualizar curso" : "Cadastrar curso"}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                O curso aparece no catálogo público da Academy. As aulas só
                liberam quando a compra estiver aprovada em Acessos Academy.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Nome do curso
                </label>

                <input
                  value={editingCourse.title || ""}
                  onChange={(e) =>
                    setEditingCourse((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Ex: Curso Inicial"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Subtítulo
                </label>

                <input
                  value={editingCourse.subtitle || ""}
                  onChange={(e) =>
                    setEditingCourse((prev) => ({
                      ...prev,
                      subtitle: e.target.value,
                    }))
                  }
                  placeholder="Frase curta do curso"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Descrição
                </label>

                <textarea
                  value={editingCourse.description || ""}
                  onChange={(e) =>
                    setEditingCourse((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Explique o que o aluno vai aprender"
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-sm font-black text-zinc-300">
                    Badge
                  </label>

                  <input
                    value={editingCourse.badge || ""}
                    onChange={(e) =>
                      setEditingCourse((prev) => ({
                        ...prev,
                        badge: e.target.value,
                      }))
                    }
                    placeholder="Entrada"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-black text-zinc-300">
                    Ordem
                  </label>

                  <input
                    type="number"
                    value={editingCourse.order_index || 1}
                    onChange={(e) =>
                      setEditingCourse((prev) => ({
                        ...prev,
                        order_index: Number(e.target.value || 1),
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none focus:border-pink-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-sm font-black text-zinc-300">
                    Curso pago?
                  </label>

                  <select
                    value={editingCourse.is_paid ? "true" : "false"}
                    onChange={(e) =>
                      setEditingCourse((prev) => ({
                        ...prev,
                        is_paid: e.target.value === "true",
                      }))
                    }
                    className={selectClassName()}
                    style={{ colorScheme: "dark" }}
                  >
                    <option style={optionStyle()} value="true">
                      Sim, curso pago
                    </option>
                    <option style={optionStyle()} value="false">
                      Gratuito
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-black text-zinc-300">
                    Ativo no catálogo?
                  </label>

                  <select
                    value={editingCourse.is_active ? "true" : "false"}
                    onChange={(e) =>
                      setEditingCourse((prev) => ({
                        ...prev,
                        is_active: e.target.value === "true",
                      }))
                    }
                    className={selectClassName()}
                    style={{ colorScheme: "dark" }}
                  >
                    <option style={optionStyle()} value="true">
                      Ativo
                    </option>
                    <option style={optionStyle()} value="false">
                      Oculto
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Preço em centavos
                </label>

                <input
                  type="number"
                  min="0"
                  value={editingCourse.price_cents || 0}
                  onChange={(e) =>
                    setEditingCourse((prev) => ({
                      ...prev,
                      price_cents: Number(e.target.value || 0),
                    }))
                  }
                  placeholder="4700 = R$ 47,00"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Exemplo: 4700 aparece como{" "}
                  {formatMoneyFromCents(editingCourse.price_cents)}.
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Link de pagamento Mercado Pago
                </label>

                <input
                  value={editingCourse.payment_url || ""}
                  onChange={(e) =>
                    setEditingCourse((prev) => ({
                      ...prev,
                      payment_url: e.target.value,
                    }))
                  }
                  placeholder="https://mpago.la/..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Capa do curso
                </label>

                <input
                  value={editingCourse.cover_url || ""}
                  onChange={(e) =>
                    setEditingCourse((prev) => ({
                      ...prev,
                      cover_url: e.target.value,
                    }))
                  }
                  placeholder="URL da imagem"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />

                <label className="mt-3 block cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center font-black text-zinc-300 transition hover:bg-white/[0.08]">
                  {uploadingCover ? "Enviando capa..." : "Enviar imagem de capa"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCover(file);
                    }}
                  />
                </label>
              </div>

              {editingCourse.cover_url && (
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900">
                  <img
                    src={editingCourse.cover_url}
                    alt="Capa"
                    className="h-48 w-full object-cover"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={saveCourse}
                  disabled={savingCourse}
                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {savingCourse
                    ? "Salvando..."
                    : courseMode === "edit"
                    ? "Salvar curso"
                    : "Criar curso"}
                </button>

                {courseMode === "edit" && (
                  <button
                    onClick={resetCourseForm}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-black text-white transition hover:bg-white/[0.08]"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </div>
          </div>

          <div
            id="form-aula"
            className="rounded-[36px] border border-white/10 bg-black/60 p-6"
          >
            <div className="mb-6">
              <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
                {lessonMode === "edit" ? "Editar aula" : "Nova aula"}
              </p>

              <h2 className="text-3xl font-black">
                {lessonMode === "edit" ? "Atualizar aula" : "Cadastrar aula"}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                A aula fica vinculada ao curso. Ela só será assistida por alunos
                com compra vitalícia aprovada.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Curso
                </label>

                <select
                  value={editingLesson.course_id || selectedCourseId || ""}
                  onChange={(e) =>
                    setEditingLesson((prev) => ({
                      ...prev,
                      course_id: Number(e.target.value),
                    }))
                  }
                  className={selectClassName()}
                  style={{ colorScheme: "dark" }}
                >
                  <option style={optionStyle()} value="">
                    Escolha um curso
                  </option>

                  {courses.map((course) => (
                    <option style={optionStyle()} key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Módulo
                </label>

                <input
                  value={editingLesson.module_title || ""}
                  onChange={(e) =>
                    setEditingLesson((prev) => ({
                      ...prev,
                      module_title: e.target.value,
                    }))
                  }
                  placeholder="Ex: Módulo 1 — Começando"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Título da aula
                </label>

                <input
                  value={editingLesson.lesson_title || ""}
                  onChange={(e) =>
                    setEditingLesson((prev) => ({
                      ...prev,
                      lesson_title: e.target.value,
                    }))
                  }
                  placeholder="Ex: Como usar IA para criar ideias"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  URL do vídeo
                </label>

                <input
                  value={editingLesson.video_url || ""}
                  onChange={(e) =>
                    setEditingLesson((prev) => ({
                      ...prev,
                      video_url: e.target.value,
                    }))
                  }
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Use link embed quando possível. Exemplo:
                  https://www.youtube.com/embed/ID_DO_VIDEO
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Ordem da aula
                </label>

                <input
                  type="number"
                  value={editingLesson.order_index || 1}
                  onChange={(e) =>
                    setEditingLesson((prev) => ({
                      ...prev,
                      order_index: Number(e.target.value || 1),
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Descrição / tarefa da aula
                </label>

                <textarea
                  value={editingLesson.description || ""}
                  onChange={(e) =>
                    setEditingLesson((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={7}
                  placeholder="Resumo da aula, tarefa prática, prompts, links e orientação."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={saveLesson}
                  disabled={savingLesson}
                  className="rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:bg-zinc-200 disabled:opacity-60"
                >
                  {savingLesson
                    ? "Salvando..."
                    : lessonMode === "edit"
                    ? "Salvar aula"
                    : "Criar aula"}
                </button>

                {lessonMode === "edit" && (
                  <button
                    onClick={resetLessonForm}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-black text-white transition hover:bg-white/[0.08]"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-8">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 md:p-6">
            <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar curso por nome, descrição ou badge..."
                className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />

              <button
                onClick={resetCourseForm}
                className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
              >
                Novo curso
              </button>
            </div>
          </section>

          <section className="grid gap-5">
            {filteredCourses.map((course) => {
              const courseLessons = getLessonsByCourse(course.id);
              const approved = getApprovedPurchasesByCourse(course.id).length;
              const pending = getPendingPurchasesByCourse(course.id).length;
              const active = selectedCourseId === course.id;

              return (
                <article
                  key={course.id}
                  className={`overflow-hidden rounded-[34px] border bg-black/50 backdrop-blur-xl transition ${
                    active
                      ? "border-pink-500/40 shadow-[0_0_35px_rgba(255,0,150,0.12)]"
                      : "border-white/10"
                  }`}
                >
                  <div className="grid md:grid-cols-[260px_1fr]">
                    <button
                      onClick={() => setSelectedCourseId(course.id)}
                      className="min-h-[220px] bg-zinc-900 text-left"
                    >
                      {course.cover_url ? (
                        <img
                          src={course.cover_url}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full min-h-[220px] w-full bg-[radial-gradient(circle_at_center,rgba(255,0,150,0.22),transparent_38%),linear-gradient(135deg,rgba(0,92,255,0.16),rgba(145,35,255,0.14),rgba(255,0,150,0.16))]" />
                      )}
                    </button>

                    <div className="p-5 md:p-7">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${
                            course.is_active
                              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                              : "border-zinc-500/25 bg-zinc-500/10 text-zinc-300"
                          }`}
                        >
                          {course.is_active ? "Ativo" : "Oculto"}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${
                            course.is_paid
                              ? "border-pink-500/25 bg-pink-500/10 text-pink-300"
                              : "border-white/10 bg-white/[0.05] text-zinc-300"
                          }`}
                        >
                          {course.is_paid ? "Pago" : "Gratuito"}
                        </span>

                        <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-yellow-300">
                          Acesso vitalício
                        </span>

                        {course.badge && (
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-300">
                            {course.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-3xl font-black">{course.title}</h3>

                      <p className="mt-3 text-zinc-400 leading-relaxed">
                        {course.subtitle ||
                          course.description ||
                          "Curso FatorZ Academy com acesso vitalício individual."}
                      </p>

                      <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                            Preço
                          </p>
                          <p className="mt-1 font-black">
                            {course.is_paid
                              ? formatMoneyFromCents(course.price_cents)
                              : "Grátis"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                            Aulas
                          </p>
                          <p className="mt-1 font-black">{courseLessons.length}</p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                            Liberados
                          </p>
                          <p className="mt-1 font-black text-emerald-300">
                            {approved}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                            Pendentes
                          </p>
                          <p className="mt-1 font-black text-orange-300">
                            {pending}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                            Ordem
                          </p>
                          <p className="mt-1 font-black">{course.order_index || 1}</p>
                        </div>
                      </div>

                      {course.payment_url && (
                        <button
                          onClick={() => window.open(course.payment_url || "", "_blank")}
                          className="mt-4 block break-all text-left text-sm font-black text-pink-300 hover:text-pink-200"
                        >
                          {course.payment_url}
                        </button>
                      )}

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          onClick={() => setSelectedCourseId(course.id)}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-black text-white transition hover:bg-white/[0.08]"
                        >
                          Ver aulas
                        </button>

                        <button
                          onClick={() => editCourse(course)}
                          className="rounded-2xl bg-white px-5 py-3 font-black text-black transition hover:bg-zinc-200"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => toggleCourseActive(course)}
                          className="rounded-2xl bg-gradient-to-r from-[#9123ff] to-[#ff0096] px-5 py-3 font-black text-white transition hover:opacity-90"
                        >
                          {course.is_active ? "Ocultar" : "Ativar"}
                        </button>

                        <button
                          onClick={() => deleteCourse(course)}
                          className="rounded-2xl bg-red-500 px-5 py-3 font-black text-white transition hover:opacity-90"
                        >
                          Apagar
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="rounded-[36px] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
                  Aulas do curso
                </p>

                <h2 className="text-3xl md:text-4xl font-black">
                  {selectedCourse?.title || "Selecione um curso"}
                </h2>

                <p className="mt-3 text-zinc-400">
                  Organize módulos, vídeos, tarefas e ordem das aulas.
                </p>
              </div>

              <button
                onClick={resetLessonForm}
                className="rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
              >
                Nova aula
              </button>
            </div>

            {selectedLessons.length ? (
              <div className="space-y-3">
                {selectedLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="rounded-[24px] border border-white/10 bg-black/35 p-5"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest font-black text-pink-300 mb-2">
                          {lesson.module_title}
                        </p>

                        <h3 className="text-xl font-black">
                          {lesson.order_index || 1}. {lesson.lesson_title}
                        </h3>

                        {lesson.description && (
                          <p className="mt-2 text-sm leading-relaxed text-zinc-500 line-clamp-2">
                            {lesson.description}
                          </p>
                        )}

                        <button
                          onClick={() => window.open(lesson.video_url, "_blank")}
                          className="mt-3 break-all text-left text-sm font-black text-blue-300 hover:text-blue-200"
                        >
                          {lesson.video_url}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => editLesson(lesson)}
                          className="rounded-2xl bg-white px-5 py-3 font-black text-black transition hover:bg-zinc-200"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => deleteLesson(lesson)}
                          className="rounded-2xl bg-red-500 px-5 py-3 font-black text-white transition hover:opacity-90"
                        >
                          Apagar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedCourse ? (
              <div className="rounded-[26px] border border-white/10 bg-black/40 p-6 text-zinc-400">
                Esse curso ainda não tem aulas cadastradas.
              </div>
            ) : (
              <div className="rounded-[26px] border border-white/10 bg-black/40 p-6 text-zinc-400">
                Selecione um curso para ver as aulas.
              </div>
            )}
          </section>
        </main>
      </section>

      {!filteredCourses.length && (
        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-zinc-400">
          Nenhum curso encontrado.
        </div>
      )}
    </div>
  );
}