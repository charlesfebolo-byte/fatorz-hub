import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type SiteProductOrder = {
  id: number;
  created_at: string;
  updated_at: string | null;

  user_id: string | null;
  user_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_document: string | null;

  product_id: number | null;
  product_slug: string | null;
  product_name: string | null;
  product_category: string | null;
  product_type: string | null;

  amount_cents: number | null;
  status: string | null;

  payment_provider: string | null;
  payment_method: string | null;

  project_id: number | null;
  notes: string | null;
};

type ServiceBriefing = {
  id: number;
  created_at: string;
  updated_at: string | null;
  order_id: number;
  project_id: number | null;
  user_id: string | null;
  user_email: string;
  customer_name: string | null;
  product_name: string | null;
  product_category: string | null;
  product_type: string | null;
  brand_name: string | null;
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  city: string | null;
  main_objective: string | null;
  offer_description: string | null;
  target_audience: string | null;
  colors: string | null;
  avoid_colors: string | null;
  visual_style: string | null;
  references_like: string | null;
  references_dislike: string | null;
  logo_link: string | null;
  material_links: string | null;
  copy_notes: string | null;
  extra_notes: string | null;
  status: string | null;
};

type BriefingFormData = {
  brandName: string;
  instagram: string;
  whatsapp: string;
  website: string;
  city: string;
  mainObjective: string;
  offerDescription: string;
  targetAudience: string;
  colors: string;
  avoidColors: string;
  visualStyle: string;
  referencesLike: string;
  referencesDislike: string;
  logoLink: string;
  materialLinks: string;
  copyNotes: string;
  extraNotes: string;
};

const emptyForm: BriefingFormData = {
  brandName: "",
  instagram: "",
  whatsapp: "",
  website: "",
  city: "",
  mainObjective: "",
  offerDescription: "",
  targetAudience: "",
  colors: "",
  avoidColors: "",
  visualStyle: "",
  referencesLike: "",
  referencesDislike: "",
  logoLink: "",
  materialLinks: "",
  copyNotes: "",
  extraNotes: "",
};

const visualStyleOptions = [
  "Elegante / premium",
  "Moderno / tecnológico",
  "Minimalista / limpo",
  "Chamativo / promocional",
  "Divertido / leve",
  "Institucional / sério",
  "Popular / direto",
  "Ainda não sei, quero sugestão da FatorZ",
];

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function orderNeedsBriefing(order: SiteProductOrder | null) {
  if (!order) return false;

  const searchable = normalizeText(
    [
      order.product_name,
      order.product_slug,
      order.product_category,
      order.product_type,
    ].join(" ")
  );

  if (order.product_category === "academy") return false;
  if (order.product_type === "course") return false;
  if (order.product_type === "diagnostic") return false;

  if (searchable.includes("academy")) return false;
  if (searchable.includes("curso")) return false;
  if (searchable.includes("diagnostico")) return false;
  if (searchable.includes("diagnostic")) return false;
  if (searchable.includes("analise de perfil")) return false;

  return true;
}

function fieldClass() {
  return "w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none transition placeholder:text-zinc-700 focus:border-pink-500/50";
}

function Label({
  title,
  helper,
  required,
}: {
  title: string;
  helper?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {title}
        {required ? <span className="text-pink-400"> *</span> : null}
      </span>

      {helper && <span className="mb-2 block text-xs leading-relaxed text-zinc-600">{helper}</span>}
    </label>
  );
}

export default function BriefingForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("orderId") || "";

  const [user, setUser] = useState<any>(null);
  const [order, setOrder] = useState<SiteProductOrder | null>(null);
  const [briefing, setBriefing] = useState<ServiceBriefing | null>(null);

  const [form, setForm] = useState<BriefingFormData>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPage();
  }, [orderId]);

  async function loadPage() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.log("Erro ao buscar usuário:", userError);
      setLoading(false);
      alert("Erro ao verificar sua conta.");
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);

    if (!orderId) {
      setLoading(false);
      return;
    }

    const { data: orderData, error: orderError } = await supabase
      .from("site_product_orders")
      .select("*")
      .eq("id", Number(orderId))
      .single();

    if (orderError || !orderData) {
      console.log("Erro ao carregar pedido:", orderError);
      setLoading(false);
      return;
    }

    const userEmail = String(user.email || "").toLowerCase();
    const orderEmail = String(orderData.user_email || "").toLowerCase();

    if (orderData.user_id && orderData.user_id !== user.id && orderEmail !== userEmail) {
      setLoading(false);
      alert("Esse pedido não pertence à sua conta.");
      navigate("/minhas-entregas");
      return;
    }

    if (!orderData.user_id && orderEmail && orderEmail !== userEmail) {
      setLoading(false);
      alert("Esse pedido foi comprado com outro email.");
      navigate("/minhas-entregas");
      return;
    }

    setOrder(orderData);

    const { data: briefingData, error: briefingError } = await supabase
      .from("service_briefings")
      .select("*")
      .eq("order_id", Number(orderId))
      .maybeSingle();

    if (briefingError) {
      console.log("Erro ao carregar briefing:", briefingError);
    }

    if (briefingData) {
      setBriefing(briefingData);
      setForm({
        brandName: briefingData.brand_name || "",
        instagram: briefingData.instagram || "",
        whatsapp: briefingData.whatsapp || "",
        website: briefingData.website || "",
        city: briefingData.city || "",
        mainObjective: briefingData.main_objective || "",
        offerDescription: briefingData.offer_description || "",
        targetAudience: briefingData.target_audience || "",
        colors: briefingData.colors || "",
        avoidColors: briefingData.avoid_colors || "",
        visualStyle: briefingData.visual_style || "",
        referencesLike: briefingData.references_like || "",
        referencesDislike: briefingData.references_dislike || "",
        logoLink: briefingData.logo_link || "",
        materialLinks: briefingData.material_links || "",
        copyNotes: briefingData.copy_notes || "",
        extraNotes: briefingData.extra_notes || "",
      });
    } else {
      setForm((prev) => ({
        ...prev,
        brandName: orderData.customer_name || "",
        whatsapp: orderData.customer_phone || "",
      }));
    }

    setLoading(false);
  }

  function updateField(field: keyof BriefingFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const needsBriefing = useMemo(() => orderNeedsBriefing(order), [order]);

  async function saveBriefing() {
    if (!order) return;

    if (!needsBriefing) {
      alert("Esse produto não precisa de ficha de briefing.");
      return;
    }

    if (!form.brandName.trim()) {
      alert("Informe o nome da marca.");
      return;
    }

    if (!form.instagram.trim()) {
      alert("Informe o Instagram da marca. Se não tiver, escreva 'não tenho'.");
      return;
    }

    if (!form.mainObjective.trim()) {
      alert("Explique o objetivo principal da entrega.");
      return;
    }

    if (!form.visualStyle.trim()) {
      alert("Escolha ou descreva o estilo visual desejado.");
      return;
    }

    setSaving(true);

    const payload = {
      order_id: order.id,
      project_id: order.project_id || null,
      user_id: user?.id || order.user_id || null,
      user_email: user?.email || order.user_email || "",
      customer_name: order.customer_name || form.brandName.trim(),
      product_name: order.product_name || "",
      product_category: order.product_category || "",
      product_type: order.product_type || "",
      brand_name: form.brandName.trim(),
      instagram: form.instagram.trim(),
      whatsapp: form.whatsapp.trim(),
      website: form.website.trim(),
      city: form.city.trim(),
      main_objective: form.mainObjective.trim(),
      offer_description: form.offerDescription.trim(),
      target_audience: form.targetAudience.trim(),
      colors: form.colors.trim(),
      avoid_colors: form.avoidColors.trim(),
      visual_style: form.visualStyle.trim(),
      references_like: form.referencesLike.trim(),
      references_dislike: form.referencesDislike.trim(),
      logo_link: form.logoLink.trim(),
      material_links: form.materialLinks.trim(),
      copy_notes: form.copyNotes.trim(),
      extra_notes: form.extraNotes.trim(),
      status: "submitted",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("service_briefings")
      .upsert(payload, { onConflict: "order_id" });

    if (error) {
      setSaving(false);
      console.log("Erro ao salvar briefing:", error);
      alert("Erro ao salvar ficha. Confira se você rodou o SQL da tabela service_briefings.");
      return;
    }

    if (order.project_id) {
      await supabase
        .from("projects")
        .update({ status: "em diagnóstico" })
        .eq("id", order.project_id);
    }

    setSaving(false);
    alert("Ficha enviada com sucesso! Agora a FatorZ já pode iniciar a próxima etapa.");
    navigate("/minhas-entregas");
  }

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Ficha de Briefing</h1>
        <p className="text-zinc-400">Carregando informações do pedido...</p>
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Ficha de Briefing</h1>

        <div className="rounded-[32px] border border-yellow-500/25 bg-yellow-500/10 p-8">
          <h2 className="text-2xl font-black text-yellow-300">Pedido não encontrado</h2>
          <p className="mt-3 text-zinc-300">
            Acesse Minhas Entregas e abra a ficha pelo pedido correto.
          </p>

          <button
            onClick={() => navigate("/minhas-entregas")}
            className="mt-6 rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
          >
            Ir para Minhas Entregas
          </button>
        </div>
      </div>
    );
  }

  if (!needsBriefing) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Ficha de Briefing</h1>

        <div className="rounded-[32px] border border-blue-500/25 bg-blue-500/10 p-8">
          <h2 className="text-2xl font-black text-blue-300">Esse produto não precisa de ficha</h2>
          <p className="mt-3 text-zinc-300">
            Produtos Academy e Diagnóstico de Perfil não exigem briefing pós-compra.
          </p>

          <button
            onClick={() => navigate("/minhas-entregas")}
            className="mt-6 rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
          >
            Voltar para Minhas Entregas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="mb-8">
        <p className="mb-3 text-pink-500 font-black uppercase tracking-widest">
          Pós-compra
        </p>

        <h1 className="text-4xl font-black mb-3">Ficha de Briefing</h1>

        <p className="max-w-3xl text-zinc-400">
          Preencha com calma. Essas informações guiam a entrega do seu serviço.
          O prazo de produção começa após o envio completo desta ficha.
        </p>
      </section>

      <section className="mb-8 rounded-[32px] border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Pedido #{order.id}
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {order.product_name || "Produto FatorZ"}
            </h2>
            <p className="mt-2 text-zinc-500">
              {order.product_category || "Serviço"} • {order.product_type || "produto"}
            </p>
          </div>

          <span
            className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest ${
              briefing
                ? "border-green-500/25 bg-green-500/10 text-green-300"
                : "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
            }`}
          >
            {briefing ? "Briefing já enviado" : "Aguardando envio"}
          </span>
        </div>
      </section>

      <section className="rounded-[36px] border border-white/10 bg-zinc-900 p-5 shadow-[0_0_80px_rgba(236,72,153,0.08)] md:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label
              title="Nome da marca"
              helper="Pode ser diferente do nome usado na compra."
              required
            />
            <input
              value={form.brandName}
              onChange={(e) => updateField("brandName", e.target.value)}
              placeholder="Ex: LK House"
              className={fieldClass()}
            />
          </div>

          <div>
            <Label title="Instagram" helper="Pode ser @perfil ou link completo." required />
            <input
              value={form.instagram}
              onChange={(e) => updateField("instagram", e.target.value)}
              placeholder="@suaempresa"
              className={fieldClass()}
            />
          </div>

          <div>
            <Label
              title="WhatsApp"
              helper="Trouxemos o número da compra quando disponível. Altere se o contato da marca for outro."
            />
            <input
              value={form.whatsapp}
              onChange={(e) => updateField("whatsapp", e.target.value)}
              placeholder="(00) 00000-0000"
              className={fieldClass()}
            />
          </div>

          <div>
            <Label title="Site ou link atual" />
            <input
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://..."
              className={fieldClass()}
            />
          </div>

          <div>
            <Label title="Cidade / área de atuação" />
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Ex: Pelotas/RS, Brasil todo, online..."
              className={fieldClass()}
            />
          </div>

          <div>
            <Label title="Estilo visual desejado" required />
            <select
              value={form.visualStyle}
              onChange={(e) => updateField("visualStyle", e.target.value)}
              className={`${fieldClass()} appearance-none`}
            >
              <option value="">Escolha um estilo</option>
              {visualStyleOptions.map((style) => (
                <option key={style} value={style} className="bg-zinc-950">
                  {style}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <Label
              title="Objetivo principal"
              helper="O que você quer alcançar com essa entrega?"
              required
            />
            <textarea
              value={form.mainObjective}
              onChange={(e) => updateField("mainObjective", e.target.value)}
              placeholder="Ex: Quero organizar meu Instagram, vender mais um serviço específico, melhorar a percepção da marca..."
              className={`${fieldClass()} min-h-[120px] resize-y`}
            />
          </div>

          <div className="md:col-span-2">
            <Label title="Produtos ou serviços que quer divulgar" />
            <textarea
              value={form.offerDescription}
              onChange={(e) => updateField("offerDescription", e.target.value)}
              placeholder="Liste os produtos, serviços, preços, diferenciais e o que precisa aparecer."
              className={`${fieldClass()} min-h-[120px] resize-y`}
            />
          </div>

          <div>
            <Label title="Público-alvo" />
            <textarea
              value={form.targetAudience}
              onChange={(e) => updateField("targetAudience", e.target.value)}
              placeholder="Quem você quer atingir? Ex: mulheres 25+, empreendedores locais, noivas, barbeiros..."
              className={`${fieldClass()} min-h-[120px] resize-y`}
            />
          </div>

          <div>
            <Label title="Cores que gosta / quer usar" />
            <textarea
              value={form.colors}
              onChange={(e) => updateField("colors", e.target.value)}
              placeholder="Ex: preto, dourado, bege, roxo, azul..."
              className={`${fieldClass()} min-h-[120px] resize-y`}
            />
          </div>

          <div>
            <Label title="Cores que não quer usar" />
            <textarea
              value={form.avoidColors}
              onChange={(e) => updateField("avoidColors", e.target.value)}
              placeholder="Ex: não quero vermelho, verde, cores infantis..."
              className={`${fieldClass()} min-h-[120px] resize-y`}
            />
          </div>

          <div>
            <Label title="Referências que você gosta" />
            <textarea
              value={form.referencesLike}
              onChange={(e) => updateField("referencesLike", e.target.value)}
              placeholder="Cole links de perfis, posts, sites ou estilos que você acha bonito."
              className={`${fieldClass()} min-h-[120px] resize-y`}
            />
          </div>

          <div>
            <Label title="Referências que você NÃO gosta" />
            <textarea
              value={form.referencesDislike}
              onChange={(e) => updateField("referencesDislike", e.target.value)}
              placeholder="Cole exemplos ou explique o que você quer evitar."
              className={`${fieldClass()} min-h-[120px] resize-y`}
            />
          </div>

          <div>
            <Label title="Link da logo" helper="Google Drive, Dropbox, Canva, etc." />
            <input
              value={form.logoLink}
              onChange={(e) => updateField("logoLink", e.target.value)}
              placeholder="Cole o link da logo aqui"
              className={fieldClass()}
            />
          </div>

          <div>
            <Label title="Links de materiais" helper="Fotos, vídeos, catálogo, textos, identidade visual..." />
            <input
              value={form.materialLinks}
              onChange={(e) => updateField("materialLinks", e.target.value)}
              placeholder="Cole links de arquivos/materiais"
              className={fieldClass()}
            />
          </div>

          <div className="md:col-span-2">
            <Label title="Textos ou informações obrigatórias" />
            <textarea
              value={form.copyNotes}
              onChange={(e) => updateField("copyNotes", e.target.value)}
              placeholder="Ex: endereço, horário, formas de pagamento, CTA, promoções, frases que precisam aparecer..."
              className={`${fieldClass()} min-h-[120px] resize-y`}
            />
          </div>

          <div className="md:col-span-2">
            <Label title="Observações finais" />
            <textarea
              value={form.extraNotes}
              onChange={(e) => updateField("extraNotes", e.target.value)}
              placeholder="Explique qualquer detalhe importante para a FatorZ."
              className={`${fieldClass()} min-h-[140px] resize-y`}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            onClick={() => navigate("/minhas-entregas")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white transition hover:bg-white/10"
          >
            Voltar
          </button>

          <button
            onClick={saveBriefing}
            disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Enviando..." : briefing ? "Atualizar briefing" : "Enviar briefing"}
          </button>
        </div>
      </section>
    </div>
  );
}
