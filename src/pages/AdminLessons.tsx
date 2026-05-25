import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Lesson = {
  id: number;
  module_title: string;
  lesson_title: string;
  description: string | null;
  video_url: string;
  order_index: number;
  created_at: string;
};

function isYoutubeUrl(url: string) {
  return (
    url.includes("youtube.com/watch?v=") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/embed/")
  );
}

function convertYoutubeToEmbed(url: string) {
  const cleanUrl = url.trim();

  if (cleanUrl.includes("youtube.com/embed/")) {
    return cleanUrl;
  }

  if (cleanUrl.includes("youtube.com/watch?v=")) {
    const videoId = cleanUrl.split("v=")[1]?.split("&")[0];

    if (!videoId) return "";

    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (cleanUrl.includes("youtu.be/")) {
    const videoId = cleanUrl.split("youtu.be/")[1]?.split("?")[0];

    if (!videoId) return "";

    return `https://www.youtube.com/embed/${videoId}`;
  }

  return "";
}

export default function AdminLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [orderIndex, setOrderIndex] = useState(1);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("module_title", { ascending: true })
      .order("order_index", { ascending: true });

    if (error) {
      alert("Erro ao carregar aulas.");
      console.log(error);
      return;
    }

    setLessons(data || []);
  }

  function clearForm() {
    setEditingId(null);
    setModuleTitle("");
    setLessonTitle("");
    setDescription("");
    setVideoUrl("");
    setOrderIndex(1);
  }

  function validateForm() {
    if (!moduleTitle.trim()) {
      alert("Preencha o nome do módulo.");
      return false;
    }

    if (!lessonTitle.trim()) {
      alert("Preencha o título da aula.");
      return false;
    }

    if (!videoUrl.trim()) {
      alert("Cole o link do vídeo do YouTube.");
      return false;
    }

    if (!isYoutubeUrl(videoUrl)) {
      alert(
        "Link inválido. Use um link do YouTube, tipo:\n\nhttps://www.youtube.com/watch?v=...\n\nou\n\nhttps://youtu.be/..."
      );
      return false;
    }

    const embedUrl = convertYoutubeToEmbed(videoUrl);

    if (!embedUrl) {
      alert("Não consegui converter esse link. Use um link válido do YouTube.");
      return false;
    }

    if (!orderIndex || orderIndex < 1) {
      alert("A ordem da aula precisa ser maior que 0.");
      return false;
    }

    return true;
  }

  async function saveLesson() {
    if (loading) return;

    const isValid = validateForm();

    if (!isValid) return;

    setLoading(true);

    const lessonData = {
      module_title: moduleTitle.trim(),
      lesson_title: lessonTitle.trim(),
      description: description.trim(),
      video_url: convertYoutubeToEmbed(videoUrl),
      order_index: Number(orderIndex),
    };

    if (editingId) {
      const { error } = await supabase
        .from("lessons")
        .update(lessonData)
        .eq("id", editingId);

      setLoading(false);

      if (error) {
        alert("Erro ao editar aula.");
        console.log(error);
        return;
      }

      alert("Aula atualizada!");
    } else {
      const { error } = await supabase.from("lessons").insert(lessonData);

      setLoading(false);

      if (error) {
        alert("Erro ao cadastrar aula.");
        console.log(error);
        return;
      }

      alert("Aula cadastrada!");
    }

    clearForm();
    loadLessons();
  }

  function startEdit(lesson: Lesson) {
    setEditingId(lesson.id);
    setModuleTitle(lesson.module_title);
    setLessonTitle(lesson.lesson_title);
    setDescription(lesson.description || "");
    setVideoUrl(lesson.video_url);
    setOrderIndex(lesson.order_index);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteLesson(id: number) {
    const confirmDelete = confirm("Tem certeza que quer apagar esta aula?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      alert("Erro ao apagar aula.");
      console.log(error);
      return;
    }

    alert("Aula apagada!");
    loadLessons();
  }

  function openPreview(url: string) {
    window.open(url, "_blank");
  }

  const modules = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    if (!acc[lesson.module_title]) {
      acc[lesson.module_title] = [];
    }

    acc[lesson.module_title].push(lesson);
    return acc;
  }, {});

  return (
    <div className="text-white">
      <div className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Admin
        </p>

        <h1 className="text-4xl font-black mb-2">Gerenciar Aulas</h1>

        <p className="text-zinc-400">
          Poste, edite, organize e apague aulas da FatorZ Academy.
        </p>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-8">
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-fit">
          <h2 className="text-2xl font-black mb-6">
            {editingId ? "Editar aula" : "Nova aula"}
          </h2>

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Módulo
          </label>

          <input
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="Ex: Módulo 1"
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none focus:border-pink-500"
          />

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Título da aula
          </label>

          <input
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="Ex: Marketing"
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none focus:border-pink-500"
          />

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Descrição
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Resumo da aula"
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none h-32 resize-none focus:border-pink-500"
          />

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Link do YouTube
          </label>

          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-3 outline-none focus:border-pink-500"
          />

          <div className="bg-black border border-zinc-800 rounded-2xl p-4 mb-4">
            <p className="text-sm text-zinc-400 mb-2">
              Links aceitos:
            </p>

            <p className="text-xs text-zinc-500">
              youtube.com/watch?v=...
            </p>

            <p className="text-xs text-zinc-500">
              youtu.be/...
            </p>

            <p className="text-xs text-zinc-500">
              youtube.com/embed/...
            </p>
          </div>

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Ordem da aula
          </label>

          <input
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            placeholder="1"
            min={1}
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-6 outline-none focus:border-pink-500"
          />

          <button
            onClick={saveLesson}
            disabled={loading}
            className={`w-full px-8 py-4 rounded-2xl font-black transition ${
              loading
                ? "bg-zinc-700 cursor-not-allowed"
                : "bg-pink-500 hover:scale-[1.02]"
            }`}
          >
            {loading
              ? "Salvando..."
              : editingId
              ? "Salvar Alterações"
              : "Publicar Aula"}
          </button>

          {editingId && (
            <button
              onClick={clearForm}
              className="w-full mt-3 bg-zinc-700 hover:bg-zinc-600 px-8 py-4 rounded-2xl font-black"
            >
              Cancelar edição
            </button>
          )}
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black">Aulas cadastradas</h2>

              <p className="text-zinc-500 text-sm mt-1">
                Total: {lessons.length} aulas
              </p>
            </div>
          </div>

          {lessons.length === 0 ? (
            <div className="bg-zinc-800 rounded-3xl p-8">
              <p className="text-zinc-400">
                Nenhuma aula cadastrada ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(modules).map(([moduleName, moduleLessons]) => (
                <div key={moduleName} className="bg-zinc-800 rounded-3xl p-5">
                  <div className="mb-4">
                    <h3 className="text-xl font-black">{moduleName}</h3>

                    <p className="text-zinc-500 text-sm">
                      {moduleLessons.length} aula
                      {moduleLessons.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {moduleLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div>
                            <p className="text-pink-500 font-bold">
                              Aula {lesson.order_index}
                            </p>

                            <h4 className="text-lg font-black">
                              {lesson.lesson_title}
                            </h4>

                            <p className="text-zinc-400 text-sm mt-1">
                              {lesson.description || "Sem descrição"}
                            </p>

                            <p className="text-zinc-600 text-xs mt-3 break-all">
                              {lesson.video_url}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => openPreview(lesson.video_url)}
                              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-xl font-bold"
                            >
                              Ver vídeo
                            </button>

                            <button
                              onClick={() => startEdit(lesson)}
                              className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl font-bold"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => deleteLesson(lesson.id)}
                              className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-xl font-bold"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>

                        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800">
                          <iframe
                            src={lesson.video_url}
                            title={lesson.lesson_title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}