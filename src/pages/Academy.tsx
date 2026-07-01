import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  price_cents?: number | null;
  payment_url?: string | null;
  is_paid?: boolean | null;
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

type LessonProgress = {
  id: number;
  user_id: string | null;
  lesson_id: number | null;
  completed: boolean | null;
  watched_at: string | null;
};

type AcademyLink = {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  url: string;
  category: string | null;
  order_index: number | null;
  is_active: boolean | null;
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

function beautifyLessonText(text: string | null | undefined) {
  if (!text) return "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/-{4,}/g, "\n\n")
    .replace(/\s*Tarefa prática:/gi, "\n\nTarefa prática:")
    .replace(/\s*Responda:/gi, "\n\nResponda:")
    .replace(/\s*Exemplo:/gi, "\n\nExemplo:")
    .replace(/\s*Prompt 1:/gi, "\n\nPrompt 1:")
    .replace(/\s*Prompt 2:/gi, "\n\nPrompt 2:")
    .replace(/\s*Prompt 3:/gi, "\n\nPrompt 3:")
    .replace(/\s*Contexto:/gi, "\nContexto:")
    .replace(/\s*Objetivo:/gi, "\nObjetivo:")
    .replace(/\s*Público:/gi, "\nPúblico:")
    .replace(/\s*Publico:/gi, "\nPúblico:")
    .replace(/\s*Formato:/gi, "\nFormato:")
    .replace(/\s*Estilo:/gi, "\nEstilo:")
    .replace(/\s*Chamada para ação:/gi, "\nChamada para ação:")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatMoneyFromCents(cents: number | null | undefined) {
  const value = Number(cents || 0) / 100;

  return value.toLocaleString("pt-BR", {
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

function getStaffRole(profile: any) {
  if (profile?.staff_role) return profile.staff_role;
  if (profile?.role === "admin") return "ceo_fatorz";
  return "none";
}

function isAcademyTeam(profile: any) {
  return [
    "ceo_fatorz",
    "diretor_operacional",
    "mentor_academy",
  ].includes(getStaffRole(profile));
}

export default function Academy({ user, profile }: any) {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [links, setLinks] = useState<AcademyLink[]>([]);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const isTeam = isAcademyTeam(profile);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    loadAcademyData();
  }, [user?.id]);

  async function loadAcademyData() {
    setLoading(true);

    const [
      coursesResponse,
      progressResponse,
      linksResponse,
      purchasesResponse,
    ] = await Promise.all([
      supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true }),

      supabase.from("lesson_progress").select("*").eq("user_id", user.id),

      supabase
        .from("academy_links")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false }),

      supabase
        .from("course_purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (coursesResponse.error) {
      console.log("Erro courses:", coursesResponse.error);
      setLoading(false);
      alert("Erro ao carregar cursos.");
      return;
    }

    if (progressResponse.error) {
      console.log("Erro progress:", progressResponse.error);
    }

    if (linksResponse.error) {
      console.log("Erro links:", linksResponse.error);
    }

    if (purchasesResponse.error) {
      console.log("Erro purchases:", purchasesResponse.error);
    }

    const coursesData = coursesResponse.data || [];
    const progressData = progressResponse.data || [];
    const linksData = linksResponse.data || [];
    const purchasesData = purchasesResponse.data || [];
    const approvedCourseIds = purchasesData
      .filter(
        (purchase: CoursePurchase) =>
          purchase.status === "approved" && purchase.course_id
      )
      .map((purchase: CoursePurchase) => purchase.course_id);

    let lessonsData: Lesson[] = [];

    if (isTeam || approvedCourseIds.length > 0) {
      let lessonsQuery = supabase
        .from("lessons")
        .select("*")
        .order("course_id", { ascending: true })
        .order("module_title", { ascending: true })
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isTeam) {
        lessonsQuery = lessonsQuery.in("course_id", approvedCourseIds);
      }

      const lessonsResponse = await lessonsQuery;

      if (lessonsResponse.error) {
        console.log("Erro lessons:", lessonsResponse.error);
        setLoading(false);
        alert("Erro ao carregar aulas.");
        return;
      }

      lessonsData = lessonsResponse.data || [];
    }

    setLoading(false);

    setCourses(coursesData);
    setLessons(lessonsData);
    setProgress(progressData);
    setLinks(linksData);
    setPurchases(purchasesData);

    const modulesState: Record<string, boolean> = {};

    lessonsData.forEach((lesson) => {
      modulesState[lesson.module_title] = true;
    });

    setOpenModules(modulesState);

    const lastCourseId = localStorage.getItem("fatorz_last_course_id");
    const lastCourse = coursesData.find(
      (course: Course) => String(course.id) === String(lastCourseId)
    );

    setSelectedCourse(lastCourse || coursesData[0] || null);
  }

  function getLessonsByCourse(courseId: number) {
    return lessons.filter((lesson) => lesson.course_id === courseId);
  }

  function hasCourseAccess(courseId: number | null | undefined) {
    if (!courseId) return false;
    if (isTeam) return true;

    return purchases.some(
      (purchase) =>
        Number(purchase.course_id) === Number(courseId) &&
        purchase.status === "approved"
    );
  }

  function hasPendingPurchase(courseId: number | null | undefined) {
    if (!courseId) return false;

    return purchases.some(
      (purchase) =>
        Number(purchase.course_id) === Number(courseId) &&
        purchase.status === "pending"
    );
  }

  function getPurchaseByCourse(courseId: number | null | undefined) {
    if (!courseId) return null;

    return (
      purchases.find(
        (purchase) =>
          Number(purchase.course_id) === Number(courseId) &&
          purchase.status === "approved"
      ) ||
      purchases.find(
        (purchase) =>
          Number(purchase.course_id) === Number(courseId) &&
          purchase.status === "pending"
      ) ||
      null
    );
  }

  function isLessonCompleted(lessonId: number) {
    return progress.some(
      (item) => item.lesson_id === lessonId && item.completed === true
    );
  }

  function getCompletedByCourse(courseId: number) {
    if (!hasCourseAccess(courseId)) return 0;

    return getLessonsByCourse(courseId).filter((lesson) =>
      isLessonCompleted(lesson.id)
    ).length;
  }

  function getProgressByCourse(courseId: number) {
    if (!hasCourseAccess(courseId)) return 0;

    const courseLessons = getLessonsByCourse(courseId);

    if (courseLessons.length === 0) return 0;

    return Math.round(
      (getCompletedByCourse(courseId) / courseLessons.length) * 100
    );
  }

  function openCourse(course: Course) {
    const courseLessons = getLessonsByCourse(course.id);
    const access = hasCourseAccess(course.id);

    setSelectedCourse(course);
    setSelectedLesson(access ? courseLessons[0] || null : null);
    setSearch("");

    localStorage.setItem("fatorz_last_course_id", String(course.id));

    if (access && courseLessons[0]) {
      localStorage.setItem("fatorz_last_lesson_id", String(courseLessons[0].id));
    }

    setTimeout(() => {
      const section = document.getElementById("curso-selecionado");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function backToCourses() {
    setSelectedCourse(null);
    setSelectedLesson(null);
    setSearch("");
  }

  async function toggleLessonCompleted(lesson: Lesson) {
    if (!hasCourseAccess(lesson.course_id)) {
      navigate(`/checkout/academy?courseId=${lesson.course_id}`);
      return;
    }

    const existing = progress.find((item) => item.lesson_id === lesson.id);

    if (existing) {
      const { error } = await supabase
        .from("lesson_progress")
        .update({
          completed: !existing.completed,
          watched_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.log("Erro ao atualizar progresso:", error);
        alert("Erro ao atualizar progresso.");
        return;
      }
    } else {
      const { error } = await supabase.from("lesson_progress").insert({
        user_id: user.id,
        lesson_id: lesson.id,
        completed: true,
        watched_at: new Date().toISOString(),
      });

      if (error) {
        console.log("Erro ao salvar progresso:", error);
        alert("Erro ao salvar progresso.");
        return;
      }
    }

    await loadAcademyData();
  }

  function selectLesson(lesson: Lesson) {
    if (!hasCourseAccess(lesson.course_id)) {
      navigate(`/checkout/academy?courseId=${lesson.course_id}`);
      return;
    }

    setSelectedLesson(lesson);
    localStorage.setItem("fatorz_last_lesson_id", String(lesson.id));

    const section = document.getElementById("player");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleModule(moduleTitle: string) {
    setOpenModules((prev) => ({
      ...prev,
      [moduleTitle]: !prev[moduleTitle],
    }));
  }

  function openLink(url: string) {
    window.open(url, "_blank");
  }

  const selectedCourseLessons = useMemo(() => {
    if (!selectedCourse) return [];

    return lessons.filter((lesson) => lesson.course_id === selectedCourse.id);
  }, [lessons, selectedCourse]);

  const filteredLessons = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return selectedCourseLessons;

    return selectedCourseLessons.filter((lesson) => {
      return (
        lesson.module_title.toLowerCase().includes(value) ||
        lesson.lesson_title.toLowerCase().includes(value) ||
        lesson.description?.toLowerCase().includes(value)
      );
    });
  }, [selectedCourseLessons, search]);

  const groupedLessons = useMemo(() => {
    const grouped: Record<string, Lesson[]> = {};

    filteredLessons.forEach((lesson) => {
      if (!grouped[lesson.module_title]) {
        grouped[lesson.module_title] = [];
      }

      grouped[lesson.module_title].push(lesson);
    });

    return grouped;
  }, [filteredLessons]);

  const groupedLinks = useMemo(() => {
    const grouped: Record<string, AcademyLink[]> = {};

    links.forEach((link) => {
      const category = link.category || "Geral";

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(link);
    });

    return grouped;
  }, [links]);

  const totalLessons = selectedCourse ? selectedCourseLessons.length : lessons.length;

  const totalCompleted = selectedCourse
    ? selectedCourseLessons.filter((lesson) => isLessonCompleted(lesson.id)).length
    : lessons.filter((lesson) => isLessonCompleted(lesson.id)).length;

  const selectedCourseAccess = selectedCourse
    ? hasCourseAccess(selectedCourse.id)
    : false;

  const selectedCoursePending = selectedCourse
    ? hasPendingPurchase(selectedCourse.id)
    : false;

  const progressPercentage =
    !selectedCourseAccess || totalLessons === 0
      ? 0
      : Math.round((totalCompleted / totalLessons) * 100);

  const nextLesson = useMemo(() => {
    if (!selectedLesson || !selectedCourseAccess) return null;

    const index = selectedCourseLessons.findIndex(
      (lesson) => lesson.id === selectedLesson.id
    );

    if (index < 0) return null;

    return selectedCourseLessons[index + 1] || null;
  }, [selectedLesson, selectedCourseLessons, selectedCourseAccess]);

  const approvedCoursesCount = courses.filter((course) =>
    hasCourseAccess(course.id)
  ).length;

  const pendingCoursesCount = courses.filter((course) =>
    hasPendingPurchase(course.id)
  ).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Redirecionando...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Verificando acesso...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        Carregando Academy...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_10%,rgba(0,92,255,0.16),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(255,0,150,0.16),transparent_24%),radial-gradient(circle_at_55%_95%,rgba(145,35,255,0.12),transparent_32%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[linear-gradient(115deg,transparent_0%,rgba(0,92,255,0.08)_35%,transparent_55%,rgba(255,0,150,0.08)_78%,transparent_100%)]" />

      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/85 to-transparent">
        <div className="max-w-[1500px] mx-auto px-4 md:px-10 py-5 flex items-center justify-between gap-4">
          <button
            onClick={selectedCourse ? backToCourses : undefined}
            className="text-2xl md:text-3xl font-black tracking-tight"
          >
            Fator<span className="text-pink-500">Z</span> Academy
          </button>

          <div className="hidden md:flex items-center gap-5 text-sm font-bold text-zinc-300">
            <button
              onClick={() => {
                setSelectedCourse(null);
                setSelectedLesson(null);
              }}
              className="hover:text-white transition"
            >
              Cursos
            </button>

            <button
              onClick={() => {
                const section = document.getElementById("links");
                section?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-white transition"
            >
              Links úteis
            </button>

            {isTeam && (
              <button
                onClick={() => navigate("/admin/cursos")}
                className="hover:text-white transition"
              >
                Admin
              </button>
            )}
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Hub
          </button>
        </div>
      </header>

      <main className="relative z-10 pt-28">
        {!selectedCourse && (
          <>
            <section className="max-w-[1500px] mx-auto px-4 md:px-10 pb-10">
              <div className="relative overflow-hidden rounded-[46px] border border-white/10 bg-black p-6 md:p-12">
                <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#ff0096]/15 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#005cff]/15 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%)]" />

                <div className="relative grid gap-8 lg:grid-cols-[1.1fr_360px] lg:items-end">
                  <div>
                    <p className="text-pink-500 font-black uppercase tracking-[0.28em] text-sm mb-4">
                      Cursos vitalícios
                    </p>

                    <h1 className="text-5xl md:text-7xl font-black leading-[0.92] tracking-tight mb-6">
                      Aprenda a construir presença digital com direção.
                    </h1>

                    <p className="max-w-3xl text-zinc-400 text-lg md:text-xl leading-relaxed">
                      Na FatorZ Academy, cada curso pode ser visto publicamente,
                      mas as aulas são liberadas apenas para quem comprou aquele
                      curso. Sem mensalidade. Sem vencimento. Acesso vitalício
                      por curso.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
                        Cursos
                      </p>
                      <h2 className="mt-2 text-4xl font-black">{courses.length}</h2>
                    </div>

                    <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
                        Liberados
                      </p>
                      <h2 className="mt-2 text-4xl font-black text-emerald-300">
                        {approvedCoursesCount}
                      </h2>
                    </div>

                    <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
                        Pendentes
                      </p>
                      <h2 className="mt-2 text-4xl font-black text-orange-300">
                        {pendingCoursesCount}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="cursos" className="max-w-[1500px] mx-auto px-4 md:px-10 pb-14">
              <div className="mb-8">
                <p className="text-pink-500 font-black uppercase tracking-[0.28em] text-sm mb-3">
                  Catálogo Academy
                </p>

                <h2 className="text-4xl md:text-6xl font-black">
                  Cursos disponíveis
                </h2>

                <p className="mt-4 max-w-3xl text-zinc-400 text-lg leading-relaxed">
                  Veja a capa, explicação e valor de cada curso. Para acessar as
                  aulas, compre o curso e aguarde a liberação vitalícia no seu
                  perfil.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => {
                  const courseLessons = getLessonsByCourse(course.id);
                  const access = hasCourseAccess(course.id);
                  const pending = hasPendingPurchase(course.id);
                  const purchase = getPurchaseByCourse(course.id);
                  const courseProgress = getProgressByCourse(course.id);

                  return (
                    <article
                      key={course.id}
                      className={`overflow-hidden rounded-[36px] border transition hover:-translate-y-1 ${
                        access
                          ? "border-emerald-400/35 bg-emerald-500/[0.045]"
                          : pending
                          ? "border-orange-400/35 bg-orange-500/[0.045]"
                          : "border-white/10 bg-white/[0.045] hover:border-pink-500/30"
                      }`}
                    >
                      <button
                        onClick={() => openCourse(course)}
                        className="w-full text-left"
                      >
                        {course.cover_url ? (
                          <div className="h-56 w-full overflow-hidden bg-zinc-900">
                            <img
                              src={course.cover_url}
                              alt={course.title}
                              className="h-full w-full object-cover transition duration-500 hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="h-56 w-full bg-[radial-gradient(circle_at_center,rgba(255,0,150,0.24),transparent_38%),linear-gradient(135deg,rgba(0,92,255,0.16),rgba(145,35,255,0.12),rgba(255,0,150,0.16))]" />
                        )}

                        <div className="p-6">
                          <div className="mb-4 flex flex-wrap gap-2">
                            {course.badge && (
                              <span className="rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-pink-300">
                                {course.badge}
                              </span>
                            )}

                            {access && (
                              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
                                Liberado
                              </span>
                            )}

                            {pending && (
                              <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-orange-300">
                                Pendente
                              </span>
                            )}
                          </div>

                          <h3 className="text-2xl font-black">{course.title}</h3>

                          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                            {course.subtitle ||
                              course.description ||
                              "Curso FatorZ Academy com acesso vitalício."}
                          </p>

                          <div className="mt-5 grid grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                                Aulas
                              </p>
                              <p className="mt-1 text-xl font-black">
                                {courseLessons.length}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                                Valor
                              </p>
                              <p className="mt-1 text-sm font-black">
                                {course.is_paid
                                  ? formatMoneyFromCents(course.price_cents)
                                  : "Grátis"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                                Progresso
                              </p>
                              <p className="mt-1 text-xl font-black">
                                {courseProgress}%
                              </p>
                            </div>
                          </div>

                          {purchase?.approved_at && (
                            <p className="mt-4 text-xs font-bold text-emerald-300">
                              Liberado em {formatDate(purchase.approved_at)}
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="px-6 pb-6">
                        {access ? (
                          <button
                            onClick={() => openCourse(course)}
                            className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black transition hover:opacity-90"
                          >
                            Assistir aulas
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              navigate(`/checkout/academy?courseId=${course.id}`)
                            }
                            className="w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-4 font-black text-white transition hover:opacity-90"
                          >
                            {pending
                              ? "Ver compra pendente"
                              : "Comprar acesso vitalício"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {selectedCourse && (
          <section
            id="curso-selecionado"
            className="max-w-[1500px] mx-auto px-4 md:px-10 pb-16"
          >
            <button
              onClick={backToCourses}
              className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-black text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              ← Voltar para cursos
            </button>

            <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
              <div>
                <div className="relative overflow-hidden rounded-[42px] border border-white/10 bg-black mb-8">
                  {selectedCourse.cover_url && (
                    <div className="h-72 md:h-96 overflow-hidden bg-zinc-900">
                      <img
                        src={selectedCourse.cover_url}
                        alt={selectedCourse.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6 md:p-10">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {selectedCourse.badge && (
                        <span className="rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-pink-300">
                          {selectedCourse.badge}
                        </span>
                      )}

                      {selectedCourseAccess ? (
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-300">
                          Acesso vitalício liberado
                        </span>
                      ) : selectedCoursePending ? (
                        <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-orange-300">
                          Compra pendente
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-300">
                          Curso público
                        </span>
                      )}
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black leading-tight">
                      {selectedCourse.title}
                    </h1>

                    <p className="mt-5 max-w-4xl text-zinc-400 text-lg leading-relaxed">
                      {selectedCourse.description ||
                        selectedCourse.subtitle ||
                        "Curso da FatorZ Academy com acesso vitalício após compra aprovada."}
                    </p>

                    <div className="mt-8 grid gap-4 md:grid-cols-4">
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                        <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
                          Aulas
                        </p>
                        <p className="mt-2 text-3xl font-black">
                          {selectedCourseLessons.length}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                        <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
                          Valor
                        </p>
                        <p className="mt-2 text-xl font-black">
                          {selectedCourse.is_paid
                            ? formatMoneyFromCents(selectedCourse.price_cents)
                            : "Grátis"}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                        <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
                          Progresso
                        </p>
                        <p className="mt-2 text-3xl font-black">
                          {progressPercentage}%
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                        <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
                          Acesso
                        </p>
                        <p
                          className={`mt-2 text-xl font-black ${
                            selectedCourseAccess
                              ? "text-emerald-300"
                              : selectedCoursePending
                              ? "text-orange-300"
                              : "text-zinc-300"
                          }`}
                        >
                          {selectedCourseAccess
                            ? "Liberado"
                            : selectedCoursePending
                            ? "Pendente"
                            : "Bloqueado"}
                        </p>
                      </div>
                    </div>

                    {!selectedCourseAccess && (
                      <div className="mt-8 rounded-[28px] border border-pink-500/20 bg-pink-500/10 p-6">
                        <h2 className="text-2xl font-black mb-3">
                          As aulas deste curso estão bloqueadas.
                        </h2>

                        <p className="text-zinc-300 leading-relaxed mb-5">
                          Você pode ver a capa, descrição e estrutura do curso,
                          mas para assistir as aulas precisa comprar o acesso
                          vitalício deste curso.
                        </p>

                        <button
                          onClick={() =>
                            navigate(`/checkout/academy?courseId=${selectedCourse.id}`)
                          }
                          className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
                        >
                          {selectedCoursePending
                            ? "Ver compra pendente"
                            : "Comprar acesso vitalício"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {selectedCourseAccess && selectedLesson && (
                  <section
                    id="player"
                    className="rounded-[42px] border border-white/10 bg-black overflow-hidden mb-8"
                  >
                    <div className="aspect-video bg-zinc-950">
                      <iframe
                        src={selectedLesson.video_url}
                        title={selectedLesson.lesson_title}
                        className="h-full w-full"
                        allowFullScreen
                      />
                    </div>

                    <div className="p-6 md:p-8">
                      <p className="text-pink-500 font-black uppercase tracking-[0.22em] text-xs mb-3">
                        {selectedLesson.module_title}
                      </p>

                      <h2 className="text-3xl md:text-4xl font-black mb-4">
                        {selectedLesson.lesson_title}
                      </h2>

                      {selectedLesson.description && (
                        <div className="whitespace-pre-line text-zinc-300 leading-relaxed">
                          {beautifyLessonText(selectedLesson.description)}
                        </div>
                      )}

                      <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => toggleLessonCompleted(selectedLesson)}
                          className={`rounded-2xl px-6 py-4 font-black transition ${
                            isLessonCompleted(selectedLesson.id)
                              ? "bg-emerald-500 text-black hover:opacity-90"
                              : "bg-white text-black hover:bg-zinc-200"
                          }`}
                        >
                          {isLessonCompleted(selectedLesson.id)
                            ? "Aula concluída"
                            : "Marcar como concluída"}
                        </button>

                        {nextLesson && (
                          <button
                            onClick={() => selectLesson(nextLesson)}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white transition hover:bg-white/[0.08]"
                          >
                            Próxima aula
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <aside className="xl:sticky xl:top-28 h-fit">
                <div className="rounded-[36px] border border-white/10 bg-black/70 p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
                        Aulas do curso
                      </p>
                      <h2 className="mt-2 text-2xl font-black">
                        Conteúdo
                      </h2>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black text-zinc-300">
                      {selectedCourseLessons.length} aulas
                    </span>
                  </div>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar aula..."
                    className="mb-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                  />

                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    {Object.entries(groupedLessons).map(([moduleTitle, moduleLessons]) => (
                      <div
                        key={moduleTitle}
                        className="rounded-[24px] border border-white/10 bg-white/[0.035] overflow-hidden"
                      >
                        <button
                          onClick={() => toggleModule(moduleTitle)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
                        >
                          <span className="font-black text-white">
                            {moduleTitle}
                          </span>

                          <span className="text-zinc-500 text-sm">
                            {openModules[moduleTitle] ? "−" : "+"}
                          </span>
                        </button>

                        {openModules[moduleTitle] && (
                          <div className="border-t border-white/10 p-3 space-y-2">
                            {moduleLessons.map((lesson) => {
                              const completed = isLessonCompleted(lesson.id);
                              const active = selectedLesson?.id === lesson.id;

                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => selectLesson(lesson)}
                                  className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                                    active
                                      ? "bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] text-white"
                                      : "bg-black/30 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-black text-sm">
                                        {lesson.lesson_title}
                                      </p>

                                      {!selectedCourseAccess && (
                                        <p className="mt-1 text-xs text-zinc-500">
                                          Aula bloqueada
                                        </p>
                                      )}
                                    </div>

                                    {selectedCourseAccess ? (
                                      <span
                                        className={`mt-1 h-3 w-3 rounded-full ${
                                          completed
                                            ? "bg-emerald-400"
                                            : "bg-zinc-700"
                                        }`}
                                      />
                                    ) : (
                                      <span className="text-xs text-zinc-500">
                                        🔒
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}

                    {!selectedCourseLessons.length && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-zinc-400">
                        Este curso ainda não tem aulas cadastradas.
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        {!!links.length && (
          <section id="links" className="max-w-[1500px] mx-auto px-4 md:px-10 pb-16">
            <div className="mb-8">
              <p className="text-pink-500 font-black uppercase tracking-[0.28em] text-sm mb-3">
                Materiais extras
              </p>

              <h2 className="text-4xl md:text-5xl font-black">
                Links úteis
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(groupedLinks).map(([category, categoryLinks]) => (
                <div
                  key={category}
                  className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6"
                >
                  <h3 className="text-2xl font-black mb-5">{category}</h3>

                  <div className="space-y-3">
                    {categoryLinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => openLink(link.url)}
                        className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-left transition hover:bg-white/[0.06]"
                      >
                        <p className="font-black text-white">{link.title}</p>

                        {link.description && (
                          <p className="mt-1 text-sm text-zinc-500">
                            {link.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
