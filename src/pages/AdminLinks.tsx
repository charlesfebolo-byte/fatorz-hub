import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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

const initialForm = {
  title: "",
  description: "",
  url: "",
  category: "Geral",
  order_index: "1",
  is_active: true,
};

export default function AdminLinks() {
  const [links, setLinks] = useState<AcademyLink[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    setLoading(true);

    const { data, error } = await supabase
      .from("academy_links")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      console.log("Erro ao carregar links:", error);
      alert("Erro ao carregar links úteis.");
      return;
    }

    setLinks(data || []);
  }

  function updateField(field: keyof typeof initialForm, value: any) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function validateUrl(url: string) {
    return url.startsWith("http://") || url.startsWith("https://");
  }

  async function saveLink() {
    if (!form.title.trim()) {
      alert("Preencha o título do link.");
      return;
    }

    if (!form.url.trim()) {
      alert("Preencha a URL do link.");
      return;
    }

    if (!validateUrl(form.url.trim())) {
      alert("O link precisa começar com http:// ou https://");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
      category: form.category.trim() || "Geral",
      order_index: Number(form.order_index || 1),
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase
        .from("academy_links")
        .update(payload)
        .eq("id", editingId);

      setSaving(false);

      if (error) {
        console.log("Erro ao editar link:", error);
        alert("Erro ao editar link.");
        return;
      }

      alert("Link atualizado!");
    } else {
      const { error } = await supabase.from("academy_links").insert(payload);

      setSaving(false);

      if (error) {
        console.log("Erro ao criar link:", error);
        alert("Erro ao criar link.");
        return;
      }

      alert("Link criado!");
    }

    resetForm();
    loadLinks();
  }

  function editLink(link: AcademyLink) {
    setEditingId(link.id);

    setForm({
      title: link.title || "",
      description: link.description || "",
      url: link.url || "",
      category: link.category || "Geral",
      order_index: String(link.order_index || 1),
      is_active: !!link.is_active,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(link: AcademyLink) {
    const { error } = await supabase
      .from("academy_links")
      .update({
        is_active: !link.is_active,
      })
      .eq("id", link.id);

    if (error) {
      console.log("Erro ao alterar status:", error);
      alert("Erro ao alterar status do link.");
      return;
    }

    loadLinks();
  }

  async function deleteLink(link: AcademyLink) {
    const confirmDelete = confirm(
      `Tem certeza que quer apagar o link?\n\n${link.title}`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("academy_links")
      .delete()
      .eq("id", link.id);

    if (error) {
      console.log("Erro ao apagar link:", error);
      alert("Erro ao apagar link.");
      return;
    }

    alert("Link apagado!");
    loadLinks();
  }

  function openLink(url: string) {
    window.open(url, "_blank");
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copiado!");
    } catch (error) {
      console.log("Erro ao copiar:", error);
      prompt("Copie o link:", url);
    }
  }

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(links.map((link) => link.category || "Geral"))
    );

    return unique;
  }, [links]);

  const filteredLinks = useMemo(() => {
    const value = search.trim().toLowerCase();

    return links.filter((link) => {
      const matchesSearch =
        !value ||
        link.title?.toLowerCase().includes(value) ||
        link.description?.toLowerCase().includes(value) ||
        link.url?.toLowerCase().includes(value) ||
        link.category?.toLowerCase().includes(value);

      const matchesCategory =
        categoryFilter === "todas" ||
        (link.category || "Geral") === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [links, search, categoryFilter]);

  const totalLinks = links.length;
  const totalActive = links.filter((link) => link.is_active).length;
  const totalInactive = links.filter((link) => !link.is_active).length;

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Links Academy</h1>
        <p className="text-zinc-400">Carregando links úteis...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Admin
        </p>

        <h1 className="text-4xl font-black mb-2">Links Academy</h1>

        <p className="text-zinc-400 max-w-3xl">
          Cadastre links úteis, ferramentas, prompts, materiais extras e sites
          importantes para os alunos da FatorZ Academy.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Links cadastrados</p>
          <h2 className="text-4xl font-black">{totalLinks}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Ativos</p>
          <h2 className="text-4xl font-black text-green-400">{totalActive}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Inativos</p>
          <h2 className="text-4xl font-black text-red-400">{totalInactive}</h2>
        </div>
      </section>

      <section className="grid xl:grid-cols-[420px_1fr] gap-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 h-fit">
          <h2 className="text-2xl font-black mb-6">
            {editingId ? "Editar link" : "Novo link útil"}
          </h2>

          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Título do link"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Descrição curta"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500 h-28 resize-none"
            />

            <input
              value={form.url}
              onChange={(e) => updateField("url", e.target.value)}
              placeholder="https://..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <input
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="Categoria. Ex: IA, Design, Prompts"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <input
              type="number"
              value={form.order_index}
              onChange={(e) => updateField("order_index", e.target.value)}
              placeholder="Ordem"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <label className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-2xl p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
                className="w-5 h-5"
              />

              <span className="font-bold">Link ativo na Academy</span>
            </label>

            <button
              onClick={saveLink}
              disabled={saving}
              className={`w-full px-8 py-4 rounded-2xl font-black transition ${
                saving
                  ? "bg-zinc-700 cursor-not-allowed"
                  : "bg-pink-500 hover:bg-pink-600"
              }`}
            >
              {saving
                ? "Salvando..."
                : editingId
                ? "Salvar alterações"
                : "Criar link"}
            </button>

            {editingId && (
              <button
                onClick={resetForm}
                className="w-full bg-zinc-700 hover:bg-zinc-600 px-8 py-4 rounded-2xl font-black transition"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </div>

        <div>
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6">
            <div className="grid md:grid-cols-[1fr_220px_140px] gap-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, descrição, link ou categoria..."
                className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
              >
                <option value="todas">Todas</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                onClick={loadLinks}
                className="bg-pink-500 hover:bg-pink-600 rounded-2xl p-4 font-black"
              >
                Atualizar
              </button>
            </div>
          </section>

          <section className="space-y-5">
            {filteredLinks.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10">
                <h2 className="text-2xl font-black mb-2">
                  Nenhum link encontrado.
                </h2>

                <p className="text-zinc-400">
                  Cadastre o primeiro link útil da Academy.
                </p>
              </div>
            ) : (
              filteredLinks.map((link) => (
                <div
                  key={link.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6"
                >
                  <div className="flex flex-col xl:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-3 mb-4">
                        <span
                          className={`px-4 py-2 rounded-xl font-black text-sm ${
                            link.is_active
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {link.is_active ? "Ativo" : "Inativo"}
                        </span>

                        <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                          {link.category || "Geral"}
                        </span>

                        <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                          Ordem {link.order_index || 1}
                        </span>
                      </div>

                      <h2 className="text-2xl font-black mb-2">
                        {link.title}
                      </h2>

                      {link.description && (
                        <p className="text-zinc-400 mb-4">
                          {link.description}
                        </p>
                      )}

                      <button
                        onClick={() => openLink(link.url)}
                        className="text-pink-400 hover:text-pink-300 font-bold break-all text-left"
                      >
                        {link.url}
                      </button>
                    </div>

                    <div className="w-full xl:w-[220px] flex xl:flex-col gap-3">
                      <button
                        onClick={() => editLink(link)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 px-5 py-4 rounded-2xl font-black"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => toggleActive(link)}
                        className={`flex-1 px-5 py-4 rounded-2xl font-black ${
                          link.is_active
                            ? "bg-orange-500 hover:bg-orange-600 text-black"
                            : "bg-green-500 hover:bg-green-600 text-black"
                        }`}
                      >
                        {link.is_active ? "Desativar" : "Ativar"}
                      </button>

                      <button
                        onClick={() => copyLink(link.url)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black"
                      >
                        Copiar
                      </button>

                      <button
                        onClick={() => deleteLink(link)}
                        className="flex-1 bg-red-600 hover:bg-red-700 px-5 py-4 rounded-2xl font-black"
                      >
                        Apagar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </section>
    </div>
  );
}