import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { products } from "../data/products";
import { supabase } from "../lib/supabase";

type Lesson = {
  id: number;
  module_title: string;
  lesson_title: string;
  description: string | null;
  video_url: string;
  order_index: number;
};

type LessonProgress = {
  id: number;
  user_id: string;
  lesson_id: number;
  completed: boolean;
  watched_at: string | null;
};

export default function Academy({ user, profile }: any) {
  const navigate = useNavigate();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loadingAcademy, setLoadingAcademy] = useState(true);
  const [search, setSearch] = useState("");
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const academy = products.find((p) => p.id === "academy");

  const isAdmin = profile?.role === "admin";

  const academyActive =
    !!profile?.academy_expires_at &&
    new Date(profile.academy_expires_at).getTime() > new Date().getTime();

  const hasAccess = isAdmin || academyActive;

  useEffect(() => {
    if (!user) {
      setLoadingAcademy(false);
      return;
    }

    if (!profile) {
      setLoadingAcademy(true);
      return;
    }

    if (!hasAccess) {
      setLoadingAcademy(false);
      return;
    }

    loadAcademy();
  }, [user?.id, profile?.id, profile?.role, profile?.academy_expires_at]);

  async function loadAcademy() {
    if (!user?.id) return;

    setLoadingAcademy(true);

    const { data: lessonsData, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .order("module_title", { ascending: true })
      .order("order_index", { ascending: true });

    if (lessonsError) {
      console.log("Erro ao carregar aulas:", lessonsError);
      setLessons([]);
      setProgress([]);
      setSelectedLesson(null);
      setLoadingAcademy(false);
      return;
    }

    const loadedLessons = lessonsData || [];

    const { data: progressData, error: progressError } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", user.id);

    if (progressError) {
      console.log("Erro ao carregar progresso:", progressError);
    }

    const loadedProgress = progressError ? [] : progressData || [];

    setLessons(loadedLessons);
    setProgress(loadedProgress);

    const modulesOpened = loadedLessons.reduce<Record<string, boolean>>(
      (acc, lesson) => {
        acc[lesson.module_title] = true;
        return acc;
      },
      {}
    );

    setOpenModules(modulesOpened);

    const savedLastLessonId = localStorage.getItem(
      `fatorz_last_lesson_${user.id}`
    );

    const lastLessonByStorage = loadedLessons.find(
      (lesson) => String(lesson.id) === savedLastLessonId
    );

    const firstNotCompleted = loadedLessons.find(
      (lesson) =>
        !loadedProgress.some(
          (item) => item.lesson_id === lesson.id && item.completed
        )
    );

    const firstLesson = loadedLessons[0] || null;

    setSelectedLesson(lastLessonByStorage || firstNotCompleted || firstLesson);

    setLoadingAcademy(false);
  }

  const completedLessonIds = useMemo(() => {
    return new Set(
      progress
        .filter((item) => item.completed)
        .map((item) => Number(item.lesson_id))
    );
  }, [progress]);

  const completedCount = lessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length;

  const progressPercent =
    lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  const filteredLessons = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return lessons;

    return lessons.filter((lesson) => {
      return (
        lesson.lesson_title.toLowerCase().includes(value) ||
        lesson.module_title.toLowerCase().includes(value) ||
        (lesson.description || "").toLowerCase().includes(value)
      );
    });
  }, [lessons, search]);

  const modules = useMemo(() => {
    return filteredLessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
      if (!acc[lesson.module_title]) {
        acc[lesson.module_title] = [];
      }

      acc[lesson.module_title].push(lesson);
      return acc;
    }, {});
  }, [filteredLessons]);

  const hasNextLesson =
    selectedLesson &&
    lessons.findIndex((lesson) => lesson.id === selectedLesson.id) <
      lessons.length - 1;

  function goToCheckout() {
    navigate("/checkout/academy");
  }

  function toggleModule(moduleTitle: string) {
    setOpenModules((prev) => ({
      ...prev,
      [moduleTitle]: !prev[moduleTitle],
    }));
  }

  function selectLesson(lesson: Lesson) {
    setSelectedLesson(lesson);

    if (user?.id) {
      localStorage.setItem(`fatorz_last_lesson_${user.id}`, String(lesson.id));
    }
  }

  async function toggleCompleted(lessonId: number) {
    if (!user?.id) return;

    const alreadyCompleted = completedLessonIds.has(lessonId);

    const { data: existingData, error: existingError } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .limit(1);

    if (existingError) {
      console.log("Erro ao buscar progresso:", existingError);
      return;
    }

    const existing = existingData?.[0];

    if (existing) {
      const { error } = await supabase
        .from("lesson_progress")
        .update({
          completed: !alreadyCompleted,
          watched_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.log("Erro ao atualizar progresso:", error);
        return;
      }

      setProgress((prev) =>
        prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                completed: !alreadyCompleted,
                watched_at: new Date().toISOString(),
              }
            : item
        )
      );

      return;
    }

    const { data: created, error } = await supabase
      .from("lesson_progress")
      .insert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        watched_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.log("Erro ao criar progresso:", error);
      return;
    }

    if (created) {
      setProgress((prev) => [...prev, created]);
    }
  }

  function goToNextLesson() {
    if (!selectedLesson) return;

    const currentIndex = lessons.findIndex(
      (lesson) => lesson.id === selectedLesson.id
    );

    const nextLesson = lessons[currentIndex + 1];

    if (nextLesson) {
      selectLesson(nextLesson);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-8">
        <div className="max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center">
          <h1 className="text-5xl font-black mb-6">FatorZ Academy</h1>

          <p className="text-zinc-400 text-lg mb-8">
            Para acessar as aulas, primeiro entre na sua conta.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="bg-white text-black px-8 py-4 rounded-2xl font-black"
          >
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-black mb-3">Verificando acesso...</h1>

          <p className="text-zinc-400">
            Aguarde enquanto carregamos sua conta.
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-8">
        <div className="max-w-3xl bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center">
          <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
            Acesso bloqueado
          </p>

          <h1 className="text-5xl font-black mb-6">FatorZ Academy</h1>

          <p className="text-zinc-400 text-lg mb-8">
            Seu acesso ao Academy ainda não está ativo. A assinatura libera a
            plataforma por 30 dias após o pagamento.
          </p>

          <div className="bg-black border border-zinc-800 rounded-3xl p-8 mb-8">
            <h2 className="text-3xl font-black mb-2">
              {academy?.price || "R$ 297/mês"}
            </h2>

            <p className="text-zinc-400">
              Acesso mensal com aulas, módulos e estratégias premium.
            </p>
          </div>

          <button
            onClick={goToCheckout}
            className="bg-pink-500 px-10 py-4 rounded-2xl font-black hover:scale-105 transition"
          >
            Assinar Academy
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="block mx-auto mt-5 text-zinc-400 hover:text-white"
          >
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }

  if (loadingAcademy) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-black mb-3">Carregando Academy...</h1>

          <p className="text-zinc-400">Preparando suas aulas e progresso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <header className="border-b border-zinc-800 px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between lg:items-center gap-5">
          <div>
            <h1 className="text-2xl font-black">
              Fator<span className="text-pink-500">Z</span> Academy
            </h1>

            <p className="text-zinc-500 text-sm mt-1">
              Continue evoluindo sua presença digital com IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {profile?.academy_expires_at && (
              <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-xl font-bold">
                Acesso até{" "}
                {new Date(profile.academy_expires_at).toLocaleDateString(
                  "pt-BR"
                )}
              </span>
            )}

            {isAdmin && (
              <span className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-xl font-bold">
                Admin
              </span>
            )}

            <button
              onClick={goToCheckout}
              className="bg-pink-500 px-5 py-3 rounded-xl font-bold"
            >
              Renovar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        <section className="mb-10">
          <p className="text-pink-500 font-bold mb-3">Área premium mensal</p>

          <h2 className="text-5xl font-black mb-4">
            Aulas organizadas por módulos.
          </h2>

          <p className="text-zinc-400 max-w-3xl text-lg">
            Assista, marque aulas como concluídas e acompanhe seu progresso
            dentro da FatorZ Academy.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Progresso</p>

            <h3 className="text-5xl font-black text-pink-500">
              {progressPercent}%
            </h3>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <p className="text-zinc-400 mb-2">Concluídas</p>

            <h3 className="text-5xl font-black">
              {completedCount}
              <span className="text-xl text-zinc-500">/{lessons.length}</span>
            </h3>
          </div>

          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <div className="flex justify-between mb-3">
              <p className="text-zinc-400 font-bold">Barra de progresso</p>

              <p className="text-zinc-400 font-bold">
                {completedCount} de {lessons.length}
              </p>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-5 overflow-hidden">
              <div
                className="bg-pink-500 h-full rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>

        <div className="mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aula, módulo ou descrição..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none"
          />
        </div>

        {lessons.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10">
            <h3 className="text-2xl font-bold mb-3">
              Nenhuma aula cadastrada ainda.
            </h3>

            <p className="text-zinc-400">
              Quando o admin postar aulas, elas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_420px] gap-8">
            <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-fit">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-bold">Continuar assistindo</h3>

                {selectedLesson && (
                  <button
                    onClick={() => toggleCompleted(selectedLesson.id)}
                    className={`px-5 py-3 rounded-xl font-black transition ${
                      completedLessonIds.has(selectedLesson.id)
                        ? "bg-green-500/20 text-green-400"
                        : "bg-pink-500 text-white"
                    }`}
                  >
                    {completedLessonIds.has(selectedLesson.id)
                      ? "✓ Aula concluída"
                      : "Marcar como concluída"}
                  </button>
                )}
              </div>

              {selectedLesson && (
                <div>
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-6 border border-zinc-800">
                    <iframe
                      src={selectedLesson.video_url}
                      title={selectedLesson.lesson_title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>

                  <p className="text-pink-500 font-bold mb-2">
                    {selectedLesson.module_title}
                  </p>

                  <h2 className="text-4xl font-black mb-4">
                    {selectedLesson.lesson_title}
                  </h2>

                  <p className="text-zinc-400 text-lg mb-6">
                    {selectedLesson.description || "Sem descrição."}
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => toggleCompleted(selectedLesson.id)}
                      className={`px-8 py-4 rounded-2xl font-black transition ${
                        completedLessonIds.has(selectedLesson.id)
                          ? "bg-green-500/20 text-green-400"
                          : "bg-pink-500 text-white"
                      }`}
                    >
                      {completedLessonIds.has(selectedLesson.id)
                        ? "✓ Concluída"
                        : "Concluir aula"}
                    </button>

                    {hasNextLesson && (
                      <button
                        onClick={goToNextLesson}
                        className="bg-white text-black px-8 py-4 rounded-2xl font-black"
                      >
                        Próxima aula
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-5">
              {Object.entries(modules).map(([moduleTitle, moduleLessons]) => {
                const moduleCompleted = moduleLessons.filter((lesson) =>
                  completedLessonIds.has(lesson.id)
                ).length;

                return (
                  <div
                    key={moduleTitle}
                    className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
                  >
                    <button
                      onClick={() => toggleModule(moduleTitle)}
                      className="w-full flex justify-between items-center text-left mb-4"
                    >
                      <div>
                        <h3 className="text-xl font-black">{moduleTitle}</h3>

                        <p className="text-zinc-500 text-sm mt-1">
                          {moduleCompleted}/{moduleLessons.length} aulas
                          concluídas
                        </p>
                      </div>

                      <span className="text-zinc-500 text-2xl">
                        {openModules[moduleTitle] ? "−" : "+"}
                      </span>
                    </button>

                    {openModules[moduleTitle] && (
                      <div className="space-y-3">
                        {moduleLessons.map((lesson) => {
                          const isSelected = selectedLesson?.id === lesson.id;
                          const isCompleted = completedLessonIds.has(lesson.id);

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(lesson)}
                              className={`w-full text-left p-4 rounded-2xl transition border ${
                                isSelected
                                  ? "bg-pink-500 text-white border-pink-400"
                                  : isCompleted
                                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                                  : "bg-zinc-800 hover:bg-zinc-700 border-transparent text-zinc-300"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${
                                    isCompleted
                                      ? "bg-green-500 text-black"
                                      : isSelected
                                      ? "bg-white text-black"
                                      : "bg-zinc-700 text-zinc-300"
                                  }`}
                                >
                                  {isCompleted ? "✓" : lesson.order_index}
                                </span>

                                <div>
                                  <p className="font-bold">
                                    Aula {lesson.order_index}
                                  </p>

                                  <p className="text-sm opacity-90">
                                    {lesson.lesson_title}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}