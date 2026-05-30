import { useEffect, useState } from "react";
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

function formatMoneyFromCents(cents: number | null | undefined) {
  const value = Number(cents || 0) / 100;

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function convertMoneyToCents(value: string) {
  const cleanValue = value
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numberValue = Number(cleanValue);

  if (Number.isNaN(numberValue)) return 0;

  return Math.round(numberValue * 100);
}

function convertCentsToInput(cents: number | null | undefined) {
  const value = Number(cents || 0) / 100;

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [badge, setBadge] = useState("");
  const [orderIndex, setOrderIndex] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const [isPaid, setIsPaid] = useState(false);
  const [priceInput, setPriceInput] = useState("0,00");
  const [paymentUrl, setPaymentUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar cursos.");
      console.log(error);
      return;
    }

    setCourses(data || []);
  }

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setDescription("");
    setCoverUrl("");
    setBadge("");
    setOrderIndex(1);
    setIsActive(true);
    setIsPaid(false);
    setPriceInput("0,00");
    setPaymentUrl("");
  }

  function validateForm() {
    if (!title.trim()) {
      alert("Preencha o nome do curso.");
      return false;
    }

    if (!orderIndex || orderIndex < 1) {
      alert("A ordem precisa ser maior que 0.");
      return false;
    }

    if (isPaid) {
      const priceCents = convertMoneyToCents(priceInput);

      if (priceCents <= 0) {
        alert("Informe um valor maior que R$ 0,00 para curso pago.");
        return false;
      }

      if (!paymentUrl.trim()) {
        alert("Informe o link de pagamento desse curso.");
        return false;
      }
    }

    return true;
  }

  function sanitizeFileName(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function uploadCover(file: File) {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Use uma imagem PNG, JPG ou WEBP.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("A capa precisa ter no máximo 5MB.");
      return;
    }

    setUploadingCover(true);

    const extension = file.name.split(".").pop() || "png";
    const safeTitle = sanitizeFileName(title || "curso");
    const fileName = `${safeTitle}-${Date.now()}.${extension}`;
    const filePath = `covers/${fileName}`;

    const { error } = await supabase.storage
      .from("course-covers")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      setUploadingCover(false);
      alert("Erro ao enviar capa.");
      console.log(error);
      return;
    }

    const { data } = supabase.storage
      .from("course-covers")
      .getPublicUrl(filePath);

    setCoverUrl(data.publicUrl);
    setUploadingCover(false);
  }

  async function saveCourse() {
    if (loading) return;

    const isValid = validateForm();

    if (!isValid) return;

    setLoading(true);

    const priceCents = isPaid ? convertMoneyToCents(priceInput) : 0;

    const courseData = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      cover_url: coverUrl.trim(),
      badge: badge.trim(),
      order_index: Number(orderIndex),
      is_active: isActive,
      is_paid: isPaid,
      price_cents: priceCents,
      payment_url: isPaid ? paymentUrl.trim() : "",
    };

    if (editingId) {
      const { error } = await supabase
        .from("courses")
        .update(courseData)
        .eq("id", editingId);

      setLoading(false);

      if (error) {
        alert("Erro ao editar curso.");
        console.log(error);
        return;
      }

      alert("Curso atualizado!");
    } else {
      const { error } = await supabase.from("courses").insert(courseData);

      setLoading(false);

      if (error) {
        alert("Erro ao cadastrar curso.");
        console.log(error);
        return;
      }

      alert("Curso cadastrado!");
    }

    clearForm();
    loadCourses();
  }

  function startEdit(course: Course) {
    setEditingId(course.id);
    setTitle(course.title || "");
    setSubtitle(course.subtitle || "");
    setDescription(course.description || "");
    setCoverUrl(course.cover_url || "");
    setBadge(course.badge || "");
    setOrderIndex(course.order_index || 1);
    setIsActive(course.is_active !== false);

    setIsPaid(course.is_paid === true);
    setPriceInput(convertCentsToInput(course.price_cents));
    setPaymentUrl(course.payment_url || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCourse(id: number) {
    const confirmDelete = confirm(
      "Tem certeza que quer apagar este curso? As aulas ligadas a ele ficarão sem curso."
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("courses").delete().eq("id", id);

    if (error) {
      alert("Erro ao apagar curso.");
      console.log(error);
      return;
    }

    alert("Curso apagado!");
    loadCourses();
  }

  return (
    <div className="text-white">
      <div className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Admin
        </p>

        <h1 className="text-4xl font-black mb-2">Gerenciar Cursos</h1>

        <p className="text-zinc-400">
          Cadastre cursos, capas, valores e links de pagamento da FatorZ
          Academy.
        </p>
      </div>

      <div className="grid lg:grid-cols-[430px_1fr] gap-8">
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-fit">
          <h2 className="text-2xl font-black mb-6">
            {editingId ? "Editar curso" : "Novo curso"}
          </h2>

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Nome do curso
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: CRIADOR INICIAL"
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none focus:border-pink-500"
          />

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Subtítulo
          </label>

          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Ex: Comece do jeito certo"
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none focus:border-pink-500"
          />

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Descrição
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Resumo do curso"
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none h-32 resize-none focus:border-pink-500"
          />

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Capa do curso
          </label>

          <div className="bg-black border border-zinc-800 rounded-2xl p-4 mb-4">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  uploadCover(file);
                }
              }}
              className="w-full text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-pink-500 file:px-4 file:py-3 file:font-black file:text-white hover:file:bg-pink-600"
            />

            <p className="text-xs text-zinc-500 mt-3">
              Formatos aceitos: PNG, JPG ou WEBP. Tamanho máximo: 5MB.
            </p>

            {uploadingCover && (
              <p className="text-pink-500 font-black mt-3">
                Enviando capa...
              </p>
            )}
          </div>

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Link da capa
          </label>

          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="O link aparece aqui depois do upload"
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none focus:border-pink-500"
          />

          {coverUrl.trim() && (
            <div className="mb-4">
              <p className="text-sm font-bold text-zinc-400 mb-2">
                Prévia da capa
              </p>

              <div className="aspect-video bg-black border border-zinc-800 rounded-2xl overflow-hidden">
                <img
                  src={coverUrl}
                  alt="Prévia da capa"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Tipo de acesso
          </label>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setIsPaid(false)}
              className={`p-4 rounded-2xl font-black border transition ${
                !isPaid
                  ? "bg-green-500 text-black border-green-500"
                  : "bg-black border-zinc-800 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              Grátis
            </button>

            <button
              type="button"
              onClick={() => setIsPaid(true)}
              className={`p-4 rounded-2xl font-black border transition ${
                isPaid
                  ? "bg-pink-500 text-white border-pink-500"
                  : "bg-black border-zinc-800 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              Pago
            </button>
          </div>

          {isPaid && (
            <div className="bg-black border border-zinc-800 rounded-2xl p-4 mb-4">
              <label className="block mb-2 text-sm font-bold text-zinc-400">
                Valor do curso
              </label>

              <input
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="297,00"
                className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-xl mb-4 outline-none focus:border-pink-500"
              />

              <label className="block mb-2 text-sm font-bold text-zinc-400">
                Link de pagamento
              </label>

              <input
                value={paymentUrl}
                onChange={(e) => setPaymentUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-xl outline-none focus:border-pink-500"
              />

              <p className="text-xs text-zinc-500 mt-3">
                Você pode trocar esse link quando quiser. Pode ser Mercado Pago,
                Hotmart, Kiwify, Perfect Pay ou qualquer checkout.
              </p>
            </div>
          )}

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Etiqueta
          </label>

          <input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="Ex: FatorZ Academy"
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none focus:border-pink-500"
          />

          <label className="block mb-2 text-sm font-bold text-zinc-400">
            Ordem
          </label>

          <input
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            min={1}
            className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-4 outline-none focus:border-pink-500"
          />

          <label className="flex items-center gap-3 bg-black border border-zinc-800 rounded-2xl p-4 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5"
            />

            <span className="font-bold">Curso ativo na Academy</span>
          </label>

          <button
            onClick={saveCourse}
            disabled={loading || uploadingCover}
            className={`w-full px-8 py-4 rounded-2xl font-black transition ${
              loading || uploadingCover
                ? "bg-zinc-700 cursor-not-allowed"
                : "bg-pink-500 hover:scale-[1.02]"
            }`}
          >
            {loading
              ? "Salvando..."
              : editingId
              ? "Salvar Alterações"
              : "Cadastrar Curso"}
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
              <h2 className="text-2xl font-black">Cursos cadastrados</h2>

              <p className="text-zinc-500 text-sm mt-1">
                Total: {courses.length} curso{courses.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="bg-zinc-800 rounded-3xl p-8">
              <p className="text-zinc-400">Nenhum curso cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid xl:grid-cols-2 gap-5">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-black border border-zinc-800 rounded-3xl overflow-hidden"
                >
                  <div className="aspect-video bg-zinc-950 overflow-hidden">
                    {course.cover_url ? (
                      <img
                        src={course.cover_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 via-black to-pink-950">
                        <span className="text-zinc-500 font-black">
                          Sem capa
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-pink-500 font-black uppercase tracking-widest text-xs">
                        {course.badge || "Curso"}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            course.is_paid
                              ? "bg-pink-500 text-white"
                              : "bg-green-500 text-black"
                          }`}
                        >
                          {course.is_paid ? "Pago" : "Grátis"}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            course.is_active
                              ? "bg-green-500 text-black"
                              : "bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          {course.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black mb-2">
                      {course.title}
                    </h3>

                    {course.subtitle && (
                      <p className="text-zinc-300 font-bold mb-2">
                        {course.subtitle}
                      </p>
                    )}

                    {course.description && (
                      <p className="text-zinc-500 text-sm mb-5">
                        {course.description}
                      </p>
                    )}

                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-5">
                      <p className="text-zinc-400 text-sm mb-1">Valor</p>

                      <h4 className="text-2xl font-black">
                        {course.is_paid
                          ? formatMoneyFromCents(course.price_cents)
                          : "Grátis"}
                      </h4>

                      {course.is_paid && course.payment_url && (
                        <p className="text-zinc-600 text-xs mt-3 break-all">
                          {course.payment_url}
                        </p>
                      )}
                    </div>

                    <p className="text-zinc-600 text-xs mb-5">
                      Ordem: {course.order_index || 1}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEdit(course)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl font-bold"
                      >
                        Editar
                      </button>

                      {course.is_paid && course.payment_url && (
                        <button
                          onClick={() =>
                            window.open(course.payment_url || "", "_blank")
                          }
                          className="bg-pink-500 hover:bg-pink-600 px-4 py-3 rounded-xl font-bold"
                        >
                          Ver checkout
                        </button>
                      )}

                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-xl font-bold"
                      >
                        Excluir
                      </button>
                    </div>
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