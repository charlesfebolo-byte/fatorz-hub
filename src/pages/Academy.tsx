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

export default function Academy({ user, profile }: any) {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [links, setLinks] = useState<AcademyLink[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const isAdmin = profile?.role === "admin";

  const academyActive =
    !!profile?.academy_expires_at &&
    new Date(profile.academy_expires_at).getTime() > new Date().getTime();

  const hasAccess = isAdmin || academyActive || profile?.role === "premium";

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (hasAccess) {
      loadAcademyData();
    } else {
      setLoading(false);
    }
  }, [user, hasAccess]);

  async function loadAcademyData() {
    setLoading(true);

    const [coursesResponse, lessonsResponse, progressResponse, linksResponse] =
      await Promise.all([
        supabase
          .from("courses")
          .select("*")
          .eq("is_active", true)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true }),

        supabase
          .from("lessons")
          .select("*")
          .order("course_id", { ascending: true })
          .order("module_title", { ascending: true })
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true }),

        supabase.from("lesson_progress").select("*").eq("user_id", user.id),

        supabase
          .from("academy_links")
          .select("*")
          .eq("is_active", true)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

    setLoading(false);

    if (coursesResponse.error) {
      console.log("Erro courses:", coursesResponse.error);
      alert("Erro ao carregar cursos.");
      return;
    }

    if (lessonsResponse.error) {
      console.log("Erro lessons:", lessonsResponse.error);
      alert("Erro ao carregar aulas.");
      return;
    }

    if (progressResponse.error) {
      console.log("Erro progress:", progressResponse.error);
    }

    if (linksResponse.error) {
      console.log("Erro links:", linksResponse.error);
    }

    const coursesData = coursesResponse.data || [];
    const lessonsData = lessonsResponse.data || [];
    const progressData = progressResponse.data || [];
    const linksData = linksResponse.data || [];

    setCourses(coursesData);
    setLessons(lessonsData);
    setProgress(progressData);
    setLinks(linksData);

    const modulesState: Record<string, boolean> = {};

    lessonsData.forEach((lesson) => {
      modulesState[lesson.module_title] = true;
    });

    setOpenModules(modulesState);
  }

  function getLessonsByCourse(courseId: number) {
    return lessons.filter((lesson) => lesson.course_id === courseId);
  }

  function isLessonCompleted(lessonId: number) {
    return progress.some(
      (item) => item.lesson_id === lessonId && item.completed === true
    );
  }

  function getCompletedByCourse(courseId: number) {
    return getLessonsByCourse(courseId).filter((lesson) =>
      isLessonCompleted(lesson.id)
    ).length;
  }

  function getProgressByCourse(courseId: number) {
    const courseLessons = getLessonsByCourse(courseId);

    if (courseLessons.length === 0) return 0;

    return Math.round(
      (getCompletedByCourse(courseId) / courseLessons.length) * 100
    );
  }

  function openCourse(course: Course) {
    const courseLessons = getLessonsByCourse(course.id);

    setSelectedCourse(course);
    setSelectedLesson(courseLessons[0] || null);
    setSearch("");

    localStorage.setItem("fatorz_last_course_id", String(course.id));

    if (courseLessons[0]) {
      localStorage.setItem("fatorz_last_lesson_id", String(courseLessons[0].id));
    }
  }

  function backToCourses() {
    setSelectedCourse(null);
    setSelectedLesson(null);
    setSearch("");
  }

  async function toggleLessonCompleted(lesson: Lesson) {
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
    setSelectedLesson(lesson);
    localStorage.setItem("fatorz_last_lesson_id", String(lesson.id));
  }

  function toggleModule(moduleTitle: string) {
    setOpenModules((prev) => ({
      ...prev,
      [moduleTitle]: !prev[moduleTitle],
    }));
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("pt-BR");
  }

  function openLink(url: string) {
    window.open(url, "_blank");
  }

  const featuredCourse = courses[0] || null;

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

  const totalLessons = selectedCourse
    ? selectedCourseLessons.length
    : lessons.length;

  const totalCompleted = selectedCourse
    ? selectedCourseLessons.filter((lesson) => isLessonCompleted(lesson.id))
        .length
    : lessons.filter((lesson) => isLessonCompleted(lesson.id)).length;

  const progressPercentage =
    totalLessons === 0 ? 0 : Math.round((totalCompleted / totalLessons) * 100);

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

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#050505] text-white px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-5 py-3 rounded-2xl font-black mb-10"
          >
            Voltar ao painel
          </button>

          <div className="relative overflow-hidden bg-zinc-950 border border-zinc-800 rounded-[40px] p-8 md:p-14">
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-pink-950/40" />

            <div className="relative z-10">
              <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
                Academy bloqueada
              </p>

              <h1 className="text-5xl md:text-7xl font-black mb-6 max-w-4xl">
                Acesso premium necessário.
              </h1>

              <p className="text-zinc-400 text-lg md:text-xl max-w-3xl mb-8">
                Para assistir às aulas da FatorZ Academy e acessar os materiais
                extras, assine o acesso mensal.
              </p>

              <button
                onClick={() => navigate("/checkout/academy")}
                className="bg-pink-500 hover:bg-pink-600 px-8 py-5 rounded-2xl font-black text-lg"
              >
                Assinar Academy
              </button>
            </div>
          </div>
        </div>
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
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/80 to-transparent">
        <div className="max-w-[1500px] mx-auto px-4 md:px-10 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <button
              onClick={selectedCourse ? backToCourses : undefined}
              className="text-pink-500 text-2xl md:text-3xl font-black tracking-tight"
            >
              FatorZ Academy
            </button>

            <div className="hidden md:flex items-center gap-5 text-sm font-bold text-zinc-300">
              <button
                onClick={backToCourses}
                className="hover:text-white transition"
              >
                Início
              </button>

              <button
                onClick={() => {
                  const section = document.getElementById("cursos");
                  section?.scrollIntoView({ behavior: "smooth" });
                }}
                className="hover:text-white transition"
              >
                Cursos
              </button>

              <button
                onClick={() => {
                  const section = document.getElementById("materiais");
                  section?.scrollIntoView({ behavior: "smooth" });
                }}
                className="hover:text-white transition"
              >
                Materiais
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="hidden sm:block bg-white/10 border border-white/10 hover:bg-white/20 px-4 py-3 rounded-xl font-black text-sm"
            >
              Painel
            </button>

            <button
              onClick={() => navigate("/checkout/academy")}
              className="bg-pink-500 hover:bg-pink-600 px-4 py-3 rounded-xl font-black text-sm"
            >
              Renovar
            </button>
          </div>
        </div>
      </header>

      {!selectedCourse && (
        <main className="pb-16">
          <section className="relative min-h-[82vh] flex items-end overflow-hidden">
            {featuredCourse?.cover_url && (
              <img
                src={featuredCourse.cover_url}
                alt={featuredCourse.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />

            {!featuredCourse?.cover_url && (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-pink-950" />
            )}

            <div className="relative z-10 max-w-[1500px] mx-auto w-full px-4 md:px-10 pb-16 pt-32">
              <p className="text-pink-500 font-black uppercase tracking-[0.35em] mb-4">
                Treinamento em destaque
              </p>

              <h1 className="text-5xl md:text-8xl font-black mb-5 max-w-5xl leading-none">
                {featuredCourse?.title || "FatorZ Academy"}
              </h1>

              <p className="text-zinc-200 text-lg md:text-2xl max-w-3xl font-medium mb-4">
                {featuredCourse?.subtitle ||
                  "Cursos premium para criar presença digital, autoridade e percepção de valor."}
              </p>

              <p className="text-zinc-400 max-w-2xl mb-8">
                {featuredCourse?.description ||
                  "Escolha um curso, avance pelos módulos e transforme sua marca em uma presença mais forte, estratégica e profissional."}
              </p>

              <div className="flex flex-wrap gap-3">
                {featuredCourse && (
                  <button
                    onClick={() => openCourse(featuredCourse)}
                    className="bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-xl font-black text-lg"
                  >
                    ▶ Assistir agora
                  </button>
                )}

                <button
                  onClick={() => {
                    const section = document.getElementById("cursos");
                    section?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-white/15 border border-white/10 hover:bg-white/25 px-8 py-4 rounded-xl font-black text-lg backdrop-blur"
                >
                  Ver cursos
                </button>
              </div>

              <div className="grid grid-cols-3 max-w-xl gap-3 mt-10">
                <div className="bg-black/45 border border-white/10 backdrop-blur rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Cursos</p>
                  <h3 className="text-3xl font-black">{courses.length}</h3>
                </div>

                <div className="bg-black/45 border border-white/10 backdrop-blur rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Aulas</p>
                  <h3 className="text-3xl font-black">{lessons.length}</h3>
                </div>

                <div className="bg-black/45 border border-white/10 backdrop-blur rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Acesso</p>
                  <h3 className="text-xl font-black">
                    {isAdmin ? "Admin" : formatDate(profile?.academy_expires_at)}
                  </h3>
                </div>
              </div>
            </div>
          </section>

          <section
            id="cursos"
            className="max-w-[1500px] mx-auto px-4 md:px-10 -mt-10 relative z-20"
          >
            <div className="mb-12">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-pink-500 font-black uppercase tracking-widest text-xs mb-2">
                    Continue aprendendo
                  </p>

                  <h2 className="text-3xl md:text-5xl font-black">
                    Cursos disponíveis
                  </h2>
                </div>
              </div>

              {courses.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-8">
                  <h3 className="text-3xl font-black mb-3">
                    Nenhum curso publicado.
                  </h3>

                  <p className="text-zinc-400">
                    Assim que os cursos forem cadastrados, eles aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="flex gap-5 overflow-x-auto pb-5 snap-x">
                  {courses.map((course) => {
                    const courseLessons = getLessonsByCourse(course.id);
                    const courseProgress = getProgressByCourse(course.id);

                    return (
                      <button
                        key={course.id}
                        onClick={() => openCourse(course)}
                        className="group snap-start min-w-[280px] md:min-w-[360px] max-w-[360px] text-left bg-zinc-950 border border-zinc-900 hover:border-pink-500 rounded-[26px] overflow-hidden transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-pink-500/10"
                      >
                        <div className="aspect-video bg-black overflow-hidden relative">
                          {course.cover_url ? (
                            <img
                              src={course.cover_url}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-pink-950">
                              <span className="text-zinc-500 font-black">
                                Sem capa
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                          <div className="absolute left-4 bottom-4">
                            <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                              {course.badge || "FatorZ"}
                            </span>
                          </div>
                        </div>

                        <div className="p-5">
                          <h3 className="text-2xl font-black mb-2">
                            {course.title}
                          </h3>

                          {course.subtitle && (
                            <p className="text-zinc-400 text-sm mb-5 line-clamp-2">
                              {course.subtitle}
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="text-zinc-500 font-bold text-sm">
                              {courseLessons.length} aula
                              {courseLessons.length !== 1 ? "s" : ""}
                            </span>

                            <span className="text-pink-500 font-black text-sm">
                              {courseProgress}%
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pink-500 rounded-full"
                              style={{ width: `${courseProgress}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-12">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-pink-500 font-black uppercase tracking-widest text-xs mb-2">
                    Biblioteca
                  </p>

                  <h2 className="text-3xl md:text-5xl font-black">
                    Todos os treinamentos
                  </h2>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {courses.map((course) => {
                  const courseLessons = getLessonsByCourse(course.id);
                  const courseProgress = getProgressByCourse(course.id);

                  return (
                    <button
                      key={course.id}
                      onClick={() => openCourse(course)}
                      className="group text-left bg-zinc-950 border border-zinc-900 hover:border-zinc-600 rounded-3xl overflow-hidden transition"
                    >
                      <div className="aspect-video bg-black overflow-hidden">
                        {course.cover_url ? (
                          <img
                            src={course.cover_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <span className="text-zinc-600 font-black">
                              Sem capa
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-black text-xl mb-2">
                          {course.title}
                        </h3>

                        <p className="text-zinc-500 text-sm mb-4">
                          {courseLessons.length} aula
                          {courseLessons.length !== 1 ? "s" : ""} disponíveis
                        </p>

                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pink-500 rounded-full"
                            style={{ width: `${courseProgress}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section
            id="materiais"
            className="max-w-[1500px] mx-auto px-4 md:px-10"
          >
            <div className="bg-zinc-950 border border-zinc-900 rounded-[36px] p-6 md:p-8">
              <div className="mb-8">
                <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                  Materiais extras
                </p>

                <h2 className="text-3xl md:text-5xl font-black mb-4">
                  Links úteis da Academy
                </h2>

                <p className="text-zinc-400 max-w-3xl">
                  Ferramentas, prompts, sites, materiais de apoio e recursos
                  importantes para acelerar seus estudos.
                </p>
              </div>

              {links.length === 0 ? (
                <div className="bg-black border border-zinc-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-black mb-2">
                    Nenhum link útil publicado ainda.
                  </h3>

                  <p className="text-zinc-400">
                    Quando novos materiais forem adicionados, eles aparecerão
                    aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedLinks).map(
                    ([category, categoryLinks]) => (
                      <div key={category}>
                        <h3 className="text-2xl font-black mb-4">
                          {category}
                        </h3>

                        <div className="flex gap-5 overflow-x-auto pb-4">
                          {categoryLinks.map((link) => (
                            <div
                              key={link.id}
                              className="min-w-[260px] bg-black border border-zinc-800 rounded-3xl p-6 flex flex-col"
                            >
                              <p className="text-pink-500 font-black uppercase tracking-widest text-xs mb-3">
                                {link.category || "Geral"}
                              </p>

                              <h4 className="text-2xl font-black mb-3">
                                {link.title}
                              </h4>

                              {link.description && (
                                <p className="text-zinc-400 mb-6 flex-1 text-sm">
                                  {link.description}
                                </p>
                              )}

                              <button
                                onClick={() => openLink(link.url)}
                                className="bg-pink-500 hover:bg-pink-600 px-5 py-4 rounded-2xl font-black mt-auto"
                              >
                                Abrir link
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {selectedCourse && (
        <main className="pt-24 pb-16">
          <section className="relative min-h-[430px] flex items-end overflow-hidden">
            {selectedCourse.cover_url && (
              <img
                src={selectedCourse.cover_url}
                alt={selectedCourse.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />

            <div className="relative z-10 max-w-[1500px] mx-auto w-full px-4 md:px-10 pb-10">
              <button
                onClick={backToCourses}
                className="bg-white/10 border border-white/10 hover:bg-white/20 px-5 py-3 rounded-xl font-black mb-6 backdrop-blur"
              >
                ← Voltar para cursos
              </button>

              <p className="text-pink-500 font-black uppercase tracking-[0.35em] mb-3">
                {selectedCourse.badge || "FatorZ Academy"}
              </p>

              <h1 className="text-5xl md:text-8xl font-black mb-5 leading-none">
                {selectedCourse.title}
              </h1>

              {selectedCourse.subtitle && (
                <p className="text-zinc-200 text-lg md:text-2xl max-w-4xl font-medium mb-4">
                  {selectedCourse.subtitle}
                </p>
              )}

              {selectedCourse.description && (
                <p className="text-zinc-400 max-w-3xl mb-8">
                  {selectedCourse.description}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {selectedLesson && (
                  <button
                    onClick={() => {
                      const section = document.getElementById("player");
                      section?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-xl font-black text-lg"
                  >
                    ▶ Continuar
                  </button>
                )}

                <button
                  onClick={() => {
                    const section = document.getElementById("aulas");
                    section?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-white/15 border border-white/10 hover:bg-white/25 px-8 py-4 rounded-xl font-black text-lg backdrop-blur"
                >
                  Ver aulas
                </button>
              </div>
            </div>
          </section>

          <section className="max-w-[1500px] mx-auto px-4 md:px-10 -mt-4 relative z-20 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5">
                <p className="text-zinc-400 mb-2">Aulas</p>
                <h2 className="text-4xl font-black">{totalLessons}</h2>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5">
                <p className="text-zinc-400 mb-2">Concluídas</p>
                <h2 className="text-4xl font-black text-green-400">
                  {totalCompleted}
                </h2>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5">
                <p className="text-zinc-400 mb-2">Progresso</p>
                <h2 className="text-4xl font-black text-pink-500">
                  {progressPercentage}%
                </h2>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5">
                <p className="text-zinc-400 mb-2">Acesso</p>
                <h2 className="text-2xl font-black">
                  {isAdmin ? "Admin" : formatDate(profile?.academy_expires_at)}
                </h2>
              </div>
            </div>
          </section>

          <section
            id="player"
            className="max-w-[1500px] mx-auto px-4 md:px-10 grid xl:grid-cols-[1fr_410px] gap-8 mb-10"
          >
            <div className="bg-black border border-zinc-900 rounded-[32px] p-3 md:p-5">
              {selectedLesson ? (
                <>
                  <div className="aspect-video bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-900 mb-6">
                    <iframe
                      src={selectedLesson.video_url}
                      title={selectedLesson.lesson_title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 px-2 pb-2">
                    <div>
                      <p className="text-pink-500 font-black uppercase tracking-widest text-sm mb-2">
                        {selectedLesson.module_title}
                      </p>

                      <h2 className="text-3xl md:text-5xl font-black mb-3">
                        {selectedLesson.lesson_title}
                      </h2>

                      {selectedLesson.description && (
                        <p className="text-zinc-400 max-w-3xl">
                          {selectedLesson.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => toggleLessonCompleted(selectedLesson)}
                      className={`px-6 py-4 rounded-2xl font-black shrink-0 ${
                        isLessonCompleted(selectedLesson.id)
                          ? "bg-green-500 text-black"
                          : "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
                      }`}
                    >
                      {isLessonCompleted(selectedLesson.id)
                        ? "Concluída"
                        : "Marcar concluída"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center">
                  <h2 className="text-3xl font-black mb-3">
                    Nenhuma aula publicada neste curso.
                  </h2>

                  <p className="text-zinc-400">
                    As aulas aparecerão aqui quando forem cadastradas.
                  </p>
                </div>
              )}
            </div>

            <aside
              id="aulas"
              className="bg-zinc-950 border border-zinc-900 rounded-[32px] p-5 h-fit"
            >
              <h2 className="text-2xl font-black mb-5">Episódios</h2>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar aula..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none focus:border-pink-500 mb-5"
              />

              <div className="space-y-4 max-h-[720px] overflow-y-auto pr-1">
                {Object.keys(groupedLessons).length === 0 ? (
                  <p className="text-zinc-400">Nenhuma aula encontrada.</p>
                ) : (
                  Object.entries(groupedLessons).map(
                    ([moduleTitle, moduleLessons]) => (
                      <div
                        key={moduleTitle}
                        className="bg-black border border-zinc-900 rounded-2xl overflow-hidden"
                      >
                        <button
                          onClick={() => toggleModule(moduleTitle)}
                          className="w-full text-left p-4 font-black flex items-center justify-between gap-3"
                        >
                          <span>{moduleTitle}</span>
                          <span>{openModules[moduleTitle] ? "−" : "+"}</span>
                        </button>

                        {openModules[moduleTitle] && (
                          <div className="p-3 pt-0 space-y-2">
                            {moduleLessons.map((lesson) => (
                              <button
                                key={lesson.id}
                                onClick={() => selectLesson(lesson)}
                                className={`w-full text-left p-4 rounded-xl transition ${
                                  selectedLesson?.id === lesson.id
                                    ? "bg-pink-500 text-white"
                                    : "bg-zinc-950 hover:bg-zinc-900 text-zinc-300"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-black">
                                      {lesson.lesson_title}
                                    </p>

                                    <p className="text-sm opacity-70 mt-1">
                                      Aula #{lesson.order_index || lesson.id}
                                    </p>
                                  </div>

                                  {isLessonCompleted(lesson.id) && (
                                    <span className="bg-green-500 text-black px-2 py-1 rounded-lg text-xs font-black">
                                      OK
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )
                )}
              </div>
            </aside>
          </section>
        </main>
      )}
    </div>
  );
}