import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Project = {
  id: number;
  created_at: string;
  title: string | null;
  client_name: string | null;
  client_email: string | null;
  service_type: string | null;
  status: string | null;
  deadline: string | null;
  amount: number | null;
  delivery_link: string | null;
  notes: string | null;
};

const initialForm = {
  title: "",
  client_name: "",
  client_email: "",
  service_type: "",
  status: "em andamento",
  deadline: "",
  amount: "",
  delivery_link: "",
  notes: "",
};

const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "em andamento", label: "Em andamento" },
  { value: "em revisão", label: "Em revisão" },
  { value: "aguardando cliente", label: "Aguardando cliente" },
  { value: "concluído", label: "Concluído" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      console.log("Erro ao carregar projetos:", error);
      alert("Erro ao carregar projetos.");
      return;
    }

    setProjects(data || []);
  }

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function editProject(project: Project) {
    setEditingId(project.id);

    setForm({
      title: project.title || "",
      client_name: project.client_name || "",
      client_email: project.client_email || "",
      service_type: project.service_type || "",
      status: project.status || "em andamento",
      deadline: project.deadline || "",
      amount: String(project.amount || ""),
      delivery_link: project.delivery_link || "",
      notes: project.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function parseAmount(value: string) {
    const clean = String(value || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const number = Number(clean || 0);

    return Number.isNaN(number) ? 0 : number;
  }

  async function saveProject() {
    if (!form.title.trim()) {
      alert("Preencha o nome do projeto.");
      return;
    }

    if (!form.client_name.trim()) {
      alert("Preencha o nome do cliente.");
      return;
    }

    if (form.client_email.trim() && !form.client_email.includes("@")) {
      alert("O email do cliente parece inválido.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      client_name: form.client_name.trim(),
      client_email: form.client_email.trim(),
      service_type: form.service_type.trim(),
      status: form.status,
      deadline: form.deadline || null,
      amount: parseAmount(form.amount),
      delivery_link: form.delivery_link.trim(),
      notes: form.notes.trim(),
    };

    const response = editingId
      ? await supabase.from("projects").update(payload).eq("id", editingId)
      : await supabase.from("projects").insert(payload);

    setSaving(false);

    if (response.error) {
      console.log("Erro ao salvar projeto:", response.error);
      alert("Erro ao salvar projeto.");
      return;
    }

    alert(editingId ? "Projeto atualizado!" : "Projeto criado!");
    resetForm();
    loadProjects();
  }

  async function deleteProject(id: number) {
    const confirmDelete = confirm("Tem certeza que quer apagar este projeto?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      console.log("Erro ao apagar projeto:", error);
      alert("Erro ao apagar projeto.");
      return;
    }

    alert("Projeto apagado!");
    loadProjects();
  }

  async function updateProjectStatus(project: Project, status: string) {
    const confirmUpdate = confirm(
      `Alterar o projeto "${project.title}" para "${getStatusLabel(status)}"?`
    );

    if (!confirmUpdate) return;

    const { error } = await supabase
      .from("projects")
      .update({
        status,
      })
      .eq("id", project.id);

    if (error) {
      console.log("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status do projeto.");
      return;
    }

    alert("Status atualizado!");
    loadProjects();
  }

  async function markAsDelivered(project: Project) {
    if (!project.delivery_link) {
      alert(
        "Antes de marcar como entregue, coloque o link de entrega no projeto."
      );
      editProject(project);
      return;
    }

    const confirmDelivered = confirm(
      `Marcar o projeto "${project.title}" como concluído/entregue?\n\nIsso também tentará marcar o pedido vinculado como completed.`
    );

    if (!confirmDelivered) return;

    const { error: projectError } = await supabase
      .from("projects")
      .update({
        status: "concluído",
      })
      .eq("id", project.id);

    if (projectError) {
      console.log("Erro ao marcar como entregue:", projectError);
      alert("Erro ao marcar projeto como entregue.");
      return;
    }

    await Promise.all([
      supabase
        .from("orders")
        .update({
          status: "completed",
        })
        .eq("project_id", project.id),

      supabase
        .from("site_product_orders")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", project.id),
    ]);

    alert("Projeto entregue e pedido vinculado marcado como concluído!");
    loadProjects();
  }

  async function copyDeliveryLink(project: Project) {
    if (!project.delivery_link) {
      alert("Esse projeto ainda não tem link de entrega.");
      return;
    }

    try {
      await navigator.clipboard.writeText(project.delivery_link);
      alert("Link de entrega copiado!");
    } catch (error) {
      console.log("Erro ao copiar link:", error);
      prompt("Copie o link abaixo:", project.delivery_link);
    }
  }

  async function copyClientMessage(project: Project) {
    const message = `Olá, ${project.client_name || "tudo bem"}!

Sua entrega da FatorZ está pronta.

Projeto: ${project.title || "Projeto FatorZ"}
Link de entrega: ${project.delivery_link || "link ainda não informado"}

Qualquer ajuste, me chama por aqui.`;

    try {
      await navigator.clipboard.writeText(message);
      alert("Mensagem para cliente copiada!");
    } catch {
      prompt("Copie a mensagem:", message);
    }
  }

  function openDeliveryLink(project: Project) {
    if (!project.delivery_link) {
      alert("Esse projeto ainda não tem link de entrega.");
      return;
    }

    window.open(project.delivery_link, "_blank");
  }

  function formatMoney(value: number | null | undefined) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return "Sem prazo";

    return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
  }

  function getDaysUntilDeadline(date: string | null | undefined) {
    if (!date) return null;

    const today = new Date();
    const deadline = new Date(date + "T23:59:59");

    today.setHours(0, 0, 0, 0);

    const difference = deadline.getTime() - today.getTime();

    return Math.ceil(difference / (1000 * 60 * 60 * 24));
  }

  function getDeadlineText(project: Project) {
    const days = getDaysUntilDeadline(project.deadline);

    if (days === null) return "Sem prazo";

    if (project.status === "concluído") return "Entregue";

    if (days < 0) return `Atrasado ${Math.abs(days)} dia(s)`;

    if (days === 0) return "Vence hoje";

    if (days === 1) return "Vence amanhã";

    return `Faltam ${days} dias`;
  }

  function isProjectLate(project: Project) {
    const days = getDaysUntilDeadline(project.deadline);

    if (days === null) return false;

    return days < 0 && project.status !== "concluído";
  }

  function getStatusLabel(status: string | null) {
    if (status === "pendente") return "Pendente";
    if (status === "em andamento") return "Em andamento";
    if (status === "em revisão") return "Em revisão";
    if (status === "aguardando cliente") return "Aguardando cliente";
    if (status === "concluído") return "Concluído";
    if (status === "atrasado") return "Atrasado";
    if (status === "cancelado") return "Cancelado";

    return status || "sem status";
  }

  function getStatusStyle(status: string | null) {
    if (status === "concluído") {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    }

    if (status === "em andamento") {
      return "bg-pink-500/20 text-pink-400 border-pink-500/30";
    }

    if (status === "em revisão") {
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }

    if (status === "aguardando cliente") {
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    }

    if (status === "pendente") {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }

    if (status === "atrasado") {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    if (status === "cancelado") {
      return "bg-zinc-700 text-zinc-300 border-zinc-600";
    }

    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }

  function getDeadlineStyle(project: Project) {
    const days = getDaysUntilDeadline(project.deadline);

    if (project.status === "concluído") {
      return "bg-green-500/20 text-green-400 border-green-500/20";
    }

    if (days === null) {
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }

    if (days < 0) {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    if (days <= 2) {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }

    return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  }

  function getDeliveryStatus(project: Project) {
    if (project.delivery_link && project.status === "concluído") {
      return "Entregue";
    }

    if (project.delivery_link) {
      return "Link pronto";
    }

    return "Sem entrega";
  }

  function getDeliveryStatusStyle(project: Project) {
    if (project.delivery_link && project.status === "concluído") {
      return "bg-green-500/20 text-green-400";
    }

    if (project.delivery_link) {
      return "bg-blue-500/20 text-blue-400";
    }

    return "bg-zinc-800 text-zinc-400";
  }

  const filteredProjects = useMemo(() => {
    const value = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !value ||
        project.title?.toLowerCase().includes(value) ||
        project.client_name?.toLowerCase().includes(value) ||
        project.client_email?.toLowerCase().includes(value) ||
        project.service_type?.toLowerCase().includes(value) ||
        project.status?.toLowerCase().includes(value) ||
        project.notes?.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "todos" ||
        project.status === statusFilter ||
        (statusFilter === "atrasado-auto" && isProjectLate(project));

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const totalProjects = projects.length;

  const totalPending = projects.filter(
    (project) => project.status === "pendente"
  ).length;

  const totalInProgress = projects.filter(
    (project) => project.status === "em andamento"
  ).length;

  const totalReview = projects.filter(
    (project) =>
      project.status === "em revisão" || project.status === "aguardando cliente"
  ).length;

  const totalCompleted = projects.filter(
    (project) => project.status === "concluído"
  ).length;

  const totalLate = projects.filter((project) => isProjectLate(project)).length;

  const totalDelivered = projects.filter(
    (project) => !!project.delivery_link
  ).length;

  const totalAmount = projects.reduce(
    (sum, project) => sum + Number(project.amount || 0),
    0
  );

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Projetos</h1>
        <p className="text-zinc-400">Carregando projetos...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Operação FatorZ
        </p>

        <h1 className="text-4xl font-black mb-2">Projetos e Entregas</h1>

        <p className="text-zinc-400 max-w-3xl">
          Controle a produção da FatorZ, acompanhe prazos, publique links de
          entrega e finalize pedidos vinculados automaticamente.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Projetos</p>
          <h2 className="text-4xl font-black">{totalProjects}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Pendentes</p>
          <h2 className="text-4xl font-black text-yellow-400">
            {totalPending}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Andamento</p>
          <h2 className="text-4xl font-black text-pink-500">
            {totalInProgress}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Revisão</p>
          <h2 className="text-4xl font-black text-blue-300">{totalReview}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Atrasados</p>
          <h2 className="text-4xl font-black text-red-400">{totalLate}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Valor total</p>
          <h2 className="text-3xl font-black text-green-400">
            {formatMoney(totalAmount)}
          </h2>
          <p className="text-zinc-500 mt-2 text-sm">
            Entregues: {totalDelivered} | Concluídos: {totalCompleted}
          </p>
        </div>
      </section>

      <section className="grid xl:grid-cols-[420px_1fr] gap-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 h-fit">
          <h2 className="text-2xl font-black mb-6">
            {editingId ? "Editar projeto" : "Novo projeto"}
          </h2>

          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Nome do projeto"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <input
              value={form.client_name}
              onChange={(e) => updateField("client_name", e.target.value)}
              placeholder="Nome do cliente"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <input
              value={form.client_email}
              onChange={(e) => updateField("client_email", e.target.value)}
              placeholder="Email do cliente"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <input
              value={form.service_type}
              onChange={(e) => updateField("service_type", e.target.value)}
              placeholder="Tipo de serviço. Ex: Landing Page"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={form.deadline}
              onChange={(e) => updateField("deadline", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <input
              value={form.amount}
              onChange={(e) => updateField("amount", e.target.value)}
              placeholder="Valor do projeto. Ex: 697,00"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <input
              value={form.delivery_link}
              onChange={(e) => updateField("delivery_link", e.target.value)}
              placeholder="Link de entrega: Drive, Canva, site, pasta..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
            />

            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Observações do projeto"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500 h-32 resize-none"
            />

            <button
              onClick={saveProject}
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
                : "Criar projeto"}
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
                placeholder="Buscar projeto, cliente, email, serviço..."
                className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="em andamento">Em andamento</option>
                <option value="em revisão">Em revisão</option>
                <option value="aguardando cliente">Aguardando cliente</option>
                <option value="concluído">Concluído</option>
                <option value="atrasado">Atrasado</option>
                <option value="atrasado-auto">Atrasado automático</option>
                <option value="cancelado">Cancelado</option>
              </select>

              <button
                onClick={loadProjects}
                className="bg-pink-500 hover:bg-pink-600 rounded-2xl p-4 font-black"
              >
                Atualizar
              </button>
            </div>
          </section>

          <section className="space-y-5">
            {filteredProjects.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10">
                <h2 className="text-2xl font-black mb-2">
                  Nenhum projeto encontrado.
                </h2>

                <p className="text-zinc-400">
                  Cadastre um projeto novo ou altere os filtros.
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6"
                >
                  <div className="flex flex-col xl:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-3 mb-4">
                        <span
                          className={`border px-4 py-2 rounded-xl font-black text-sm ${getStatusStyle(
                            project.status
                          )}`}
                        >
                          {getStatusLabel(project.status)}
                        </span>

                        <span
                          className={`border px-4 py-2 rounded-xl font-black text-sm ${getDeadlineStyle(
                            project
                          )}`}
                        >
                          {getDeadlineText(project)}
                        </span>

                        <span
                          className={`px-4 py-2 rounded-xl font-black text-sm ${getDeliveryStatusStyle(
                            project
                          )}`}
                        >
                          {getDeliveryStatus(project)}
                        </span>

                        <span className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-xl font-bold text-sm">
                          {project.service_type || "Sem serviço"}
                        </span>
                      </div>

                      <h2 className="text-2xl font-black mb-2">
                        {project.title || "Sem título"}
                      </h2>

                      <p className="text-zinc-400 mb-5">
                        Cliente:{" "}
                        <span className="text-white font-bold">
                          {project.client_name || "Sem cliente"}
                        </span>
                      </p>

                      <div className="grid md:grid-cols-4 gap-4 mb-5">
                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">Email</p>
                          <p className="font-black break-all">
                            {project.client_email || "—"}
                          </p>
                        </div>

                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">Valor</p>
                          <p className="font-black">
                            {formatMoney(project.amount)}
                          </p>
                        </div>

                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">Prazo</p>
                          <p className="font-black">
                            {formatDate(project.deadline)}
                          </p>
                        </div>

                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">
                            Entrega
                          </p>

                          {project.delivery_link ? (
                            <button
                              onClick={() => openDeliveryLink(project)}
                              className="font-black text-green-400 hover:text-green-300"
                            >
                              Abrir link
                            </button>
                          ) : (
                            <p className="font-black">—</p>
                          )}
                        </div>
                      </div>

                      {project.notes && (
                        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                          <p className="text-zinc-500 text-sm mb-1">
                            Observações
                          </p>

                          <p className="text-zinc-300 whitespace-pre-wrap">
                            {project.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="w-full xl:w-[240px] flex xl:flex-col gap-3">
                      <button
                        onClick={() => editProject(project)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 px-5 py-4 rounded-2xl font-black"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => updateProjectStatus(project, "em andamento")}
                        disabled={project.status === "em andamento"}
                        className="flex-1 bg-pink-500 hover:bg-pink-600 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-800 disabled:text-zinc-500"
                      >
                        Andamento
                      </button>

                      <button
                        onClick={() => updateProjectStatus(project, "em revisão")}
                        disabled={project.status === "em revisão"}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 px-5 py-4 rounded-2xl font-black disabled:bg-zinc-800 disabled:text-zinc-500"
                      >
                        Revisão
                      </button>

                      <button
                        onClick={() => markAsDelivered(project)}
                        disabled={!project.delivery_link}
                        className={`flex-1 px-5 py-4 rounded-2xl font-black ${
                          project.delivery_link
                            ? "bg-green-500 hover:bg-green-600 text-black"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        Marcar entregue
                      </button>

                      <button
                        onClick={() => copyClientMessage(project)}
                        disabled={!project.delivery_link}
                        className={`flex-1 px-5 py-4 rounded-2xl font-black ${
                          project.delivery_link
                            ? "bg-zinc-800 hover:bg-zinc-700"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        Mensagem cliente
                      </button>

                      <button
                        onClick={() => copyDeliveryLink(project)}
                        disabled={!project.delivery_link}
                        className={`flex-1 px-5 py-4 rounded-2xl font-black ${
                          project.delivery_link
                            ? "bg-zinc-800 hover:bg-zinc-700"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        Copiar link
                      </button>

                      <button
                        onClick={() => deleteProject(project.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 px-5 py-4 rounded-2xl font-black"
                      >
                        Excluir
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