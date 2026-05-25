import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Lesson = {
  id: number;
  created_at: string;
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

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [links, setLinks] = useState<AcademyLink[]>([]);
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

    const [lessonsResponse, progressResponse, linksResponse] =
      await Promise.all([
        supabase
          .from("lessons")
          .select("*")
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true }),

        supabase
          .from("lesson_progress")
          .select("*")
          .eq("user_id", user.id),

        supabase
          .from("academy_links")
          .select("*")
          .eq("is_active", true)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

    setLoading(false);

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

    const lessonsData = lessonsResponse.data || [];
    const progressData = progressResponse.data || [];
    const linksData = linksResponse.data || [];

    setLessons(lessonsData);
    setProgress(progressData);
    setLinks(linksData);

    const modulesState: Record<string, boolean> = {};

    lessonsData.forEach((lesson) => {
      modulesState[lesson.module_title] = true;
    });

    setOpenModules(modulesState);

    const savedLessonId = localStorage.getItem("fatorz_last_lesson_id");

    if (savedLessonId) {
      const savedLesson = lessonsData.find(
        (lesson) => String(lesson.id) === savedLessonId
      );

      if (savedLesson) {
        setSelectedLesson(savedLesson);
        return;
      }
    }

    setSelectedLesson(lessonsData[0] || null);
  }

  function isLessonCompleted(lessonId: number) {
    return progress.some(
      (item) => item.lesson_id === lessonId && item.completed === true
    );
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

    loadAcademyData();
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

  const filteredLessons = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return lessons;

    return lessons.filter((lesson) => {
      return (
        lesson.module_title.toLowerCase().includes(value) ||
        lesson.lesson_title.toLowerCase().includes(value) ||
        lesson.description?.toLowerCase().includes(value)
      );
    });
  }, [lessons, search]);

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

  const totalLessons = lessons.length;

  const totalCompleted = lessons.filter((lesson) =>
    isLessonCompleted(lesson.id)
  ).length;

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
      <div className="min-h-screen bg-[#09090B] text-white px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-5 py-3 rounded-2xl font-black mb-10"
          >
            Voltar ao painel
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 md:p-12">
            <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
              Academy bloqueada
            </p>

            <h1 className="text-5xl md:text-7xl font-black mb-6">
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
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center">
        Carregando Academy...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-pink-500 font-black uppercase tracking-widest text-sm mb-2">
              FatorZ Academy
            </p>

            <h1 className="text-3xl md:text-5xl font-black">
              Área premium de aprendizado
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-5 py-3 rounded-2xl font-black"
            >
              Painel
            </button>

            <button
              onClick={() => navigate("/checkout/academy")}
              className="bg-pink-500 hover:bg-pink-600 px-5 py-3 rounded-2xl font-black"
            >
              Renovar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Aulas</p>
            <h2 className="text-4xl font-black">{totalLessons}</h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Concluídas</p>
            <h2 className="text-4xl font-black text-green-400">
              {totalCompleted}
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Progresso</p>
            <h2 className="text-4xl font-black text-pink-500">
              {progressPercentage}%
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Acesso até</p>
            <h2 className="text-3xl font-black">
              {isAdmin ? "Admin" : formatDate(profile?.academy_expires_at)}
            </h2>
          </div>
        </section>

        <section className="grid xl:grid-cols-[1fr_390px] gap-8 mb-10">
          <div className="bg-black border border-zinc-800 rounded-[32px] p-4 md:p-6">
            {selectedLesson ? (
              <>
                <div className="aspect-video bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 mb-6">
                  <iframe
                    src={selectedLesson.video_url}
                    title={selectedLesson.lesson_title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <p className="text-pink-500 font-black uppercase tracking-widest text-sm mb-2">
                      {selectedLesson.module_title}
                    </p>

                    <h2 className="text-3xl font-black mb-3">
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
                        : "bg-zinc-800 hover:bg-zinc-700"
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
                  Nenhuma aula publicada.
                </h2>

                <p className="text-zinc-400">
                  As aulas aparecerão aqui quando forem cadastradas.
                </p>
              </div>
            )}
          </div>

          <aside className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-5 h-fit">
            <h2 className="text-2xl font-black mb-5">Aulas</h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aula..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500 mb-5"
            />

            <div className="space-y-4 max-h-[680px] overflow-y-auto pr-1">
              {Object.keys(groupedLessons).length === 0 ? (
                <p className="text-zinc-400">Nenhuma aula encontrada.</p>
              ) : (
                Object.entries(groupedLessons).map(
                  ([moduleTitle, moduleLessons]) => (
                    <div
                      key={moduleTitle}
                      className="bg-black border border-zinc-800 rounded-2xl overflow-hidden"
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
                                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
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

        <section className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-6 md:p-8">
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
                Quando novos materiais forem adicionados, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedLinks).map(([category, categoryLinks]) => (
                <div key={category}>
                  <h3 className="text-2xl font-black mb-4">{category}</h3>

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {categoryLinks.map((link) => (
                      <div
                        key={link.id}
                        className="bg-black border border-zinc-800 rounded-3xl p-6 flex flex-col"
                      >
                        <p className="text-pink-500 font-black uppercase tracking-widest text-xs mb-3">
                          {link.category || "Geral"}
                        </p>

                        <h4 className="text-2xl font-black mb-3">
                          {link.title}
                        </h4>

                        {link.description && (
                          <p className="text-zinc-400 mb-6 flex-1">
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
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}