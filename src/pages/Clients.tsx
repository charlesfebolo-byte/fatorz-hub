import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    service: "",
    status: "Ativo",
    instagram: "",
    whatsapp: "",
    email: "",
    notes: "",
    monthly_value: "",
    plan: "",
    started_at: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });

    setClients(data || []);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function saveClient() {
    if (!form.name || !form.service) {
      alert("Nome e serviço obrigatórios.");
      return;
    }

    const payload = {
      ...form,
      monthly_value: Number(form.monthly_value || 0),
    };

    if (editing) {
      await supabase
        .from("clients")
        .update(payload)
        .eq("id", editing.id);

      alert("Cliente atualizado.");
    } else {
      await supabase
        .from("clients")
        .insert(payload);

      alert("Cliente cadastrado.");
    }

    resetForm();
    loadClients();
  }

  async function deleteClient(id: number) {
    const ok = confirm("Excluir cliente?");

    if (!ok) return;

    await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    loadClients();
  }

  function editClient(client: any) {
    setEditing(client);

    setForm({
      name: client.name || "",
      service: client.service || "",
      status: client.status || "Ativo",
      instagram: client.instagram || "",
      whatsapp: client.whatsapp || "",
      email: client.email || "",
      notes: client.notes || "",
      monthly_value: String(client.monthly_value || ""),
      plan: client.plan || "",
      started_at: client.started_at || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditing(null);

    setForm({
      name: "",
      service: "",
      status: "Ativo",
      instagram: "",
      whatsapp: "",
      email: "",
      notes: "",
      monthly_value: "",
      plan: "",
      started_at: "",
    });
  }

  function money(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="text-white">

      <div className="mb-10">
        <h1 className="text-4xl font-black mb-2">
          CRM Clientes
        </h1>

        <p className="text-zinc-400">
          Gestão profissional da carteira FatorZ.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">

        <h2 className="text-2xl font-black mb-6">
          {editing ? "Editar Cliente" : "Novo Cliente"}
        </h2>

        <div className="grid md:grid-cols-2 gap-4">

          <input
            placeholder="Nome"
            value={form.name}
            onChange={(e)=>updateField("name",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="Serviço"
            value={form.service}
            onChange={(e)=>updateField("service",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="Plano"
            value={form.plan}
            onChange={(e)=>updateField("plan",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="Valor mensal"
            value={form.monthly_value}
            onChange={(e)=>updateField("monthly_value",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="@Instagram"
            value={form.instagram}
            onChange={(e)=>updateField("instagram",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="WhatsApp"
            value={form.whatsapp}
            onChange={(e)=>updateField("whatsapp",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e)=>updateField("email",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <input
            type="date"
            value={form.started_at}
            onChange={(e)=>updateField("started_at",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          />

          <select
            value={form.status}
            onChange={(e)=>updateField("status",e.target.value)}
            className="bg-zinc-800 p-4 rounded-xl outline-none"
          >
            <option>Ativo</option>
            <option>Pausado</option>
            <option>Finalizado</option>
          </select>

        </div>

        <textarea
          placeholder="Observações"
          value={form.notes}
          onChange={(e)=>updateField("notes",e.target.value)}
          className="bg-zinc-800 p-4 rounded-xl outline-none w-full mt-4 h-32"
        />

        <div className="flex gap-4 mt-6">

          <button
            onClick={saveClient}
            className="bg-pink-500 px-8 py-4 rounded-2xl font-black"
          >
            {editing ? "Salvar Alterações" : "Cadastrar Cliente"}
          </button>

          {editing && (
            <button
              onClick={resetForm}
              className="bg-zinc-700 px-8 py-4 rounded-2xl font-black"
            >
              Cancelar
            </button>
          )}

        </div>

      </div>

      <div className="grid gap-6">

        {clients.map((client)=>{

          const statusColor =
            client.status === "Ativo"
              ? "text-green-400"
              : client.status === "Pausado"
              ? "text-yellow-400"
              : "text-red-400";

          return (

            <div
              key={client.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8"
            >

              <div className="flex flex-col lg:flex-row justify-between gap-8">

                <div>

                  <h2 className="text-3xl font-black mb-2">
                    {client.name}
                  </h2>

                  <p className="text-zinc-400 mb-3">
                    {client.service}
                  </p>

                  <p className={`${statusColor} font-bold mb-5`}>
                    {client.status}
                  </p>

                  <div className="space-y-2 text-zinc-400">

                    <p>
                      Plano: {client.plan || "-"}
                    </p>

                    <p>
                      Mensal: {money(client.monthly_value || 0)}
                    </p>

                    <p>
                      Início: {client.started_at || "-"}
                    </p>

                    <p>
                      Instagram: {client.instagram || "-"}
                    </p>

                    <p>
                      WhatsApp: {client.whatsapp || "-"}
                    </p>

                    <p>
                      Email: {client.email || "-"}
                    </p>

                  </div>

                  {client.notes && (
                    <div className="mt-6 text-zinc-500">
                      {client.notes}
                    </div>
                  )}

                </div>

                <div className="flex flex-col gap-4">

                  <button
                    onClick={()=>editClient(client)}
                    className="bg-blue-600 px-6 py-3 rounded-xl font-bold"
                  >
                    Editar
                  </button>

                  <button
                    onClick={()=>deleteClient(client.id)}
                    className="bg-red-600 px-6 py-3 rounded-xl font-bold"
                  >
                    Excluir
                  </button>

                  {client.whatsapp && (
                    <a
                      href={`https://wa.me/55${client.whatsapp.replace(/\D/g,"")}`}
                      target="_blank"
                      className="bg-green-600 px-6 py-3 rounded-xl font-bold text-center"
                    >
                      WhatsApp
                    </a>
                  )}

                  {client.instagram && (
                    <a
                      href={`https://instagram.com/${client.instagram.replace("@","")}`}
                      target="_blank"
                      className="bg-pink-600 px-6 py-3 rounded-xl font-bold text-center"
                    >
                      Instagram
                    </a>
                  )}

                </div>

              </div>

            </div>

          );
        })}

      </div>

    </div>
  );
}