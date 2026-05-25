import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function MyDeliveries() {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadDeliveries();
  }, []);

  async function loadDeliveries() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.log("Erro ao buscar usuário:", userError);
      setLoading(false);
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("client_email", user.email)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      console.log("Erro ao carregar entregas:", error);
      alert("Erro ao carregar suas entregas.");
      return;
    }

    setProjects(data || []);
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return "Sem prazo";

    return new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(date: string | null | undefined) {
    if (!date) return "—";

    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusStyle(status: string | null) {
    if (status === "concluído") {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    }

    if (status === "em andamento") {
      return "bg-pink-500/20 text-pink-400 border-pink-500/30";
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

  function getDeliveryLabel(project: Project) {
    if (project.delivery_link) {
      return "Entrega disponível";
    }

    if (project.status === "concluído") {
      return "Aguardando link";
    }

    return "Em produção";
  }

  function getDeliveryStyle(project: Project) {
    if (project.delivery_link) {
      return "bg-green-500/20 text-green-400";
    }

    if (project.status === "concluído") {
      return "bg-yellow-500/20 text-yellow-400";
    }

    return "bg-zinc-800 text-zinc-400";
  }

  function openDelivery(link: string | null) {
    if (!link) {
      alert("A entrega ainda não foi disponibilizada.");
      return;
    }

    window.open(link, "_blank");
  }

  const filteredProjects = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return projects;

    return projects.filter((project) => {
      return (
        project.title?.toLowerCase().includes(value) ||
        project.service_type?.toLowerCase().includes(value) ||
        project.status?.toLowerCase().includes(value) ||
        project.notes?.toLowerCase().includes(value)
      );
    });
  }, [projects, search]);

  const totalProjects = projects.length;

  const totalDelivered = projects.filter(
    (project) => !!project.delivery_link
  ).length;

  const totalInProduction = projects.filter(
    (project) =>
      project.status === "pendente" ||
      project.status === "em andamento" ||
      !project.delivery_link
  ).length;

  const totalCompleted = projects.filter(
    (project) => project.status === "concluído"
  ).length;

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Minhas Entregas</h1>
        <p className="text-zinc-400">Carregando suas entregas...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="mb-10">
        <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
          Cliente
        </p>

        <h1 className="text-4xl font-black mb-2">Minhas Entregas</h1>

        <p className="text-zinc-400 max-w-3xl">
          Acompanhe seus projetos, prazos, status e acesse os links finais dos
          materiais entregues pela FatorZ.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Projetos</p>

          <h2 className="text-4xl font-black">{totalProjects}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Entregues</p>

          <h2 className="text-4xl font-black text-green-400">
            {totalDelivered}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Em produção</p>

          <h2 className="text-4xl font-black text-pink-500">
            {totalInProduction}
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-zinc-400 mb-2">Concluídos</p>

          <h2 className="text-4xl font-black text-blue-400">
            {totalCompleted}
          </h2>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <div className="grid md:grid-cols-[1fr_160px] gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por projeto, serviço ou status..."
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 outline-none focus:border-pink-500"
          />

          <button
            onClick={loadDeliveries}
            className="bg-pink-500 hover:bg-pink-600 rounded-2xl p-4 font-black"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="space-y-5">
        {filteredProjects.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-10">
            <h2 className="text-2xl font-black mb-3">
              Nenhuma entrega encontrada.
            </h2>

            <p className="text-zinc-400 mb-6">
              Quando a FatorZ criar um projeto vinculado ao seu email, ele vai
              aparecer aqui.
            </p>

            <div className="bg-black border border-zinc-800 rounded-3xl p-6">
              <p className="text-zinc-500 text-sm mb-1">Email da sua conta</p>

              <p className="text-white font-bold break-all">
                {user?.email || "—"}
              </p>

              <p className="text-zinc-500 text-sm mt-3">
                Os projetos aparecem aqui quando o email do projeto é igual ao
                email da sua conta.
              </p>
            </div>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6"
            >
              <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-3 mb-5">
                    <span
                      className={`border px-4 py-2 rounded-xl font-black text-sm ${getStatusStyle(
                        project.status
                      )}`}
                    >
                      {project.status || "sem status"}
                    </span>

                    <span
                      className={`px-4 py-2 rounded-xl font-black text-sm ${getDeliveryStyle(
                        project
                      )}`}
                    >
                      {getDeliveryLabel(project)}
                    </span>

                    <span className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-bold text-sm">
                      Projeto #{project.id}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black mb-2">
                    {project.title || "Projeto sem título"}
                  </h2>

                  <p className="text-zinc-400 mb-5">
                    Serviço:{" "}
                    <span className="text-white font-bold">
                      {project.service_type || "Não informado"}
                    </span>
                  </p>

                  <div className="grid md:grid-cols-3 gap-4 mb-5">
                    <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">Prazo</p>

                      <p className="font-bold">{formatDate(project.deadline)}</p>
                    </div>

                    <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">Criado em</p>

                      <p className="font-bold">
                        {formatDateTime(project.created_at)}
                      </p>
                    </div>

                    <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">Entrega</p>

                      {project.delivery_link ? (
                        <button
                          onClick={() => openDelivery(project.delivery_link)}
                          className="font-black text-green-400 hover:text-green-300"
                        >
                          Abrir material
                        </button>
                      ) : (
                        <p className="font-bold text-zinc-400">
                          Ainda não disponível
                        </p>
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
                    onClick={() => openDelivery(project.delivery_link)}
                    disabled={!project.delivery_link}
                    className={`flex-1 px-5 py-4 rounded-2xl font-black transition ${
                      project.delivery_link
                        ? "bg-green-500 hover:bg-green-600 text-black"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    }`}
                  >
                    Abrir entrega
                  </button>

                  <button
                    onClick={() => navigate("/configuracoes")}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-2xl font-black transition"
                  >
                    Minha conta
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}