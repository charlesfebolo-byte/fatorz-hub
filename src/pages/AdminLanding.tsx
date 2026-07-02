import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Save, RotateCcw, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  FATORZ_FACEBOOK_URL,
  FATORZ_INSTAGRAM_URL,
  FATORZ_WHATSAPP_NUMBER,
} from "../lib/fatorzContacts";

type LandingConfig = {
  id: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_highlight: string;
  hero_subtitle: string;
  primary_cta_label: string;
  secondary_cta_label: string;
  diagnostic_title: string;
  diagnostic_subtitle: string;
  diagnostic_cta_label: string;
  proof_stats: any[];
  problem_cards: any[];
  pillars: any[];
  process_steps: any[];
  result_case: Record<string, any>;
  seo_title: string;
  seo_description: string;
  contact_whatsapp: string;
  contact_instagram: string;
  contact_facebook: string;
};

const DEFAULT_CONFIG: LandingConfig = {
  id: "default",
  hero_eyebrow: "Percepcao · Presenca · Direcao",
  hero_title: "Sua marca nao precisa so aparecer. Precisa ser",
  hero_highlight: "impossivel de ignorar.",
  hero_subtitle:
    "Posicionamento, conteudo estrategico e direcao constante para transformar presenca digital em autoridade e vendas reais.",
  primary_cta_label: "Agendar Diagnostico",
  secondary_cta_label: "Falar no WhatsApp",
  diagnostic_title: "Diagnostico de Perfil",
  diagnostic_subtitle:
    "A porta de entrada da FatorZ: descubra o que trava seu perfil antes de investir em conteudo, site ou gestao.",
  diagnostic_cta_label: "Comecar pelo Diagnostico",
  proof_stats: [],
  problem_cards: [],
  pillars: [],
  process_steps: [],
  result_case: {},
  seo_title: "FatorZ | Percepcao, Presenca e Direcao",
  seo_description:
    "Marketing, posicionamento, conteudo estrategico e landing pages para marcas que querem vender melhor.",
  contact_whatsapp: FATORZ_WHATSAPP_NUMBER,
  contact_instagram: FATORZ_INSTAGRAM_URL,
  contact_facebook: FATORZ_FACEBOOK_URL,
};

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value || [], null, 2);
  } catch {
    return "[]";
  }
}

function parseJsonField(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default function AdminLanding() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<LandingConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [proofStatsJson, setProofStatsJson] = useState("[]");
  const [problemCardsJson, setProblemCardsJson] = useState("[]");
  const [pillarsJson, setPillarsJson] = useState("[]");
  const [processStepsJson, setProcessStepsJson] = useState("[]");
  const [resultCaseJson, setResultCaseJson] = useState("{}");

  const hasLoadedFallback = useMemo(() => !loading && config.id === "default", [loading, config.id]);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("landing_config")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    setLoading(false);

    if (error) {
      console.log("Erro ao carregar landing_config:", error);
      applyConfig(DEFAULT_CONFIG);
      setMessage("Usando configuracao local. A migration landing_config pode ainda nao ter sido aplicada.");
      return;
    }

    applyConfig({ ...DEFAULT_CONFIG, ...(data || {}) });
  }

  function applyConfig(next: LandingConfig) {
    setConfig(next);
    setProofStatsJson(safeJsonStringify(next.proof_stats));
    setProblemCardsJson(safeJsonStringify(next.problem_cards));
    setPillarsJson(safeJsonStringify(next.pillars));
    setProcessStepsJson(safeJsonStringify(next.process_steps));
    setResultCaseJson(safeJsonStringify(next.result_case || {}));
  }

  function updateField(field: keyof LandingConfig, value: string) {
    setConfig((current) => ({ ...current, [field]: value }));
  }

  async function saveConfig() {
    setSaving(true);
    setMessage("");

    const payload = {
      ...config,
      id: "default",
      proof_stats: parseJsonField(proofStatsJson, []),
      problem_cards: parseJsonField(problemCardsJson, []),
      pillars: parseJsonField(pillarsJson, []),
      process_steps: parseJsonField(processStepsJson, []),
      result_case: parseJsonField(resultCaseJson, {}),
    };

    const { error } = await supabase
      .from("landing_config")
      .upsert(payload, { onConflict: "id" });

    setSaving(false);

    if (error) {
      console.log("Erro ao salvar landing_config:", error);
      setMessage("Erro ao salvar. Confere se a migration foi aplicada e se sua conta e staff/admin.");
      return;
    }

    applyConfig(payload as LandingConfig);
    setMessage("Landing atualizada com sucesso.");
  }

  function resetLocal() {
    applyConfig(DEFAULT_CONFIG);
    setMessage("Padrao local restaurado. Clique em Salvar para gravar no Supabase.");
  }

  if (loading) {
    return <div className="text-zinc-400">Carregando editor da landing...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl text-white">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b5cf6]">
            Admin · Landing FatorZ
          </p>
          <h1 className="mt-2 font-['Sora',sans-serif] text-3xl font-black">
            Editor da landing
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Edite textos principais, diagnostico, SEO e contatos sem abrir codigo.
            A landing publica usa fallback se essa tabela falhar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            <ExternalLink className="h-4 w-4" />
            Ver site
          </button>
          <button
            onClick={resetLocal}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">
          {message}
        </div>
      )}

      {hasLoadedFallback && null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Hero principal">
          <Field label="Eyebrow" value={config.hero_eyebrow} onChange={(v) => updateField("hero_eyebrow", v)} />
          <Field label="Titulo" value={config.hero_title} onChange={(v) => updateField("hero_title", v)} />
          <Field label="Destaque" value={config.hero_highlight} onChange={(v) => updateField("hero_highlight", v)} />
          <TextArea label="Subtitulo" value={config.hero_subtitle} onChange={(v) => updateField("hero_subtitle", v)} />
          <Field label="CTA primario" value={config.primary_cta_label} onChange={(v) => updateField("primary_cta_label", v)} />
          <Field label="CTA secundario" value={config.secondary_cta_label} onChange={(v) => updateField("secondary_cta_label", v)} />
        </Panel>

        <Panel title="Diagnostico · porta de entrada">
          <Field label="Titulo" value={config.diagnostic_title} onChange={(v) => updateField("diagnostic_title", v)} />
          <TextArea label="Descricao" value={config.diagnostic_subtitle} onChange={(v) => updateField("diagnostic_subtitle", v)} />
          <Field label="CTA" value={config.diagnostic_cta_label} onChange={(v) => updateField("diagnostic_cta_label", v)} />
        </Panel>

        <Panel title="SEO e contatos">
          <Field label="SEO title" value={config.seo_title} onChange={(v) => updateField("seo_title", v)} />
          <TextArea label="SEO description" value={config.seo_description} onChange={(v) => updateField("seo_description", v)} />
          <Field label="WhatsApp" value={config.contact_whatsapp} onChange={(v) => updateField("contact_whatsapp", v)} />
          <Field label="Instagram" value={config.contact_instagram} onChange={(v) => updateField("contact_instagram", v)} />
          <Field label="Facebook" value={config.contact_facebook} onChange={(v) => updateField("contact_facebook", v)} />
        </Panel>

        <Panel title="JSON avançado">
          <TextArea label="Métricas/provas" value={proofStatsJson} onChange={setProofStatsJson} rows={5} />
          <TextArea label="Problemas" value={problemCardsJson} onChange={setProblemCardsJson} rows={5} />
          <TextArea label="Pilares" value={pillarsJson} onChange={setPillarsJson} rows={5} />
          <TextArea label="Processo" value={processStepsJson} onChange={setProcessStepsJson} rows={5} />
          <TextArea label="Case/resultado" value={resultCaseJson} onChange={setResultCaseJson} rows={5} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[#0c0c16] p-5 shadow-2xl shadow-black/20">
      <h2 className="mb-5 font-['Sora',sans-serif] text-lg font-black">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#8b5cf6]/60"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <textarea
        rows={rows}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#8b5cf6]/60"
      />
    </label>
  );
}
