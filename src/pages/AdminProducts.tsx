import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type SiteProduct = {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  product_type: string;
  price_cents: number;
  old_price_cents: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  order_index: number | null;
  image_url: string | null;
  badge: string | null;
  checkout_provider: string | null;
  external_payment_url: string | null;
  accepts_pix: boolean | null;
  accepts_boleto: boolean | null;
  accepts_card: boolean | null;
  appmax_sku: string | null;
  appmax_product_name: string | null;
  course_id: number | null;
  notes: string | null;
};

type Course = {
  id: number;
  title: string;
};

type EditorTab = "base" | "price" | "offer" | "visual" | "advanced";

const categories = [
  { value: "academy", label: "Academy" },
  { value: "servicos-unicos", label: "Serviços Únicos" },
  { value: "sites", label: "Sites e Landing Pages" },
  { value: "identidade", label: "Identidade e Posicionamento" },
  { value: "assessoria", label: "Assessoria Mensal" },
];

const productTypes = [
  { value: "course", label: "Curso" },
  { value: "service", label: "Serviço" },
  { value: "site", label: "Site / Landing Page" },
  { value: "branding", label: "Identidade / Branding" },
  { value: "subscription", label: "Assessoria / Mensal" },
  { value: "diagnostic", label: "Diagnóstico" },
];

const checkoutProviders = [
  { value: "appmax", label: "Appmax" },
  { value: "external", label: "Link externo" },
  { value: "manual", label: "Manual / Instagram" },
];

const PRODUCT_COVERS_BUCKET = "product-covers";
// V3 GLOBAL: upload de capa fica dentro da aba Visual e funciona para qualquer categoria de produto.

const emptyProduct: Partial<SiteProduct> = {
  name: "",
  slug: "",
  subtitle: "",
  description: "",
  category: "servicos-unicos",
  product_type: "service",
  price_cents: 4700,
  old_price_cents: null,
  is_active: true,
  is_featured: false,
  order_index: 1,
  image_url: "",
  badge: "",
  checkout_provider: "appmax",
  external_payment_url: "",
  accepts_pix: true,
  accepts_boleto: true,
  accepts_card: true,
  appmax_sku: "",
  appmax_product_name: "",
  course_id: null,
  notes: "",
};

function formatMoney(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function centsToRealInput(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toFixed(2).replace(".", ",");
}

function realInputToCents(value: string) {
  const clean = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(clean || 0);
  return Number.isNaN(number) ? 0 : Math.round(number * 100);
}

function makeSlug(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCategoryLabel(value: string | null | undefined) {
  return categories.find((category) => category.value === value)?.label || value || "—";
}

function getTypeLabel(value: string | null | undefined) {
  return productTypes.find((type) => type.value === value)?.label || value || "—";
}

function getCheckoutLabel(value: string | null | undefined) {
  return checkoutProviders.find((provider) => provider.value === value)?.label || value || "—";
}

function fieldClass() {
  return "w-full rounded-2xl border border-white/10 bg-[#08080d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-pink-500/50 focus:bg-black";
}

function selectClass() {
  return `${fieldClass()} appearance-none`;
}

function optionStyle() {
  return { backgroundColor: "#08080d", color: "#ffffff" };
}

function Label({ children, helper }: { children: string; helper?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {children}
      </span>
      {helper && <span className="mb-2 block text-xs leading-relaxed text-zinc-600">{helper}</span>}
    </label>
  );
}

function Pill({ children, tone = "default" }: { children: string; tone?: "default" | "green" | "pink" | "blue" | "yellow" }) {
  const tones = {
    default: "border-white/10 bg-white/[0.05] text-zinc-300",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    pink: "border-pink-500/25 bg-pink-500/10 text-pink-300",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState<SiteProduct[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<SiteProduct>>(emptyProduct);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("base");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [productsResponse, coursesResponse] = await Promise.all([
      supabase
        .from("site_products")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("courses").select("id,title").order("id", { ascending: true }),
    ]);

    setLoading(false);

    if (productsResponse.error) {
      console.log("Erro ao carregar produtos:", productsResponse.error);
      alert("Erro ao carregar produtos.");
      return;
    }

    if (coursesResponse.error) {
      console.log("Erro ao carregar cursos:", coursesResponse.error);
    }

    setProducts(productsResponse.data || []);
    setCourses(coursesResponse.data || []);
  }

  function openNewProduct() {
    const nextOrder = products.length ? Math.max(...products.map((product) => Number(product.order_index || 0))) + 1 : 1;
    setEditingProduct({ ...emptyProduct, order_index: nextOrder });
    setActiveTab("base");
    setIsEditorOpen(true);
  }

  function editProduct(product: SiteProduct) {
    setEditingProduct({ ...product });
    setActiveTab("base");
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingProduct(emptyProduct);
    setActiveTab("base");
  }

  function updateField(field: keyof SiteProduct, value: any) {
    setEditingProduct((prev) => ({ ...prev, [field]: value }));
  }

  function updateName(value: string) {
    setEditingProduct((prev) => ({
      ...prev,
      name: value,
      slug: prev.id ? prev.slug : makeSlug(value),
      appmax_product_name: prev.appmax_product_name || value,
      appmax_sku: prev.appmax_sku || makeSlug(value),
    }));
  }

  async function uploadProductCover(file: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Envie apenas imagem: PNG, JPG ou WEBP.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("A imagem precisa ter no máximo 5MB.");
      return;
    }

    setUploadingCover(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeSlug =
        editingProduct.slug ||
        makeSlug(editingProduct.name || "produto-fatorz") ||
        "produto-fatorz";

      const filePath = `${safeSlug}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_COVERS_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.log("Erro ao importar capa:", uploadError);
        alert("Erro ao importar capa.");
        return;
      }

      const { data } = supabase.storage
        .from(PRODUCT_COVERS_BUCKET)
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        alert("Imagem enviada, mas não consegui gerar o link público.");
        return;
      }

      updateField("image_url", data.publicUrl);
    } catch (error) {
      console.log("Erro inesperado ao importar capa:", error);
      alert("Erro inesperado ao importar capa.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function saveProduct() {
    if (!editingProduct.name?.trim()) {
      alert("Informe o nome do produto.");
      setActiveTab("base");
      return;
    }

    const slug = editingProduct.slug?.trim() || makeSlug(editingProduct.name);

    if (!slug) {
      alert("Informe um slug válido.");
      setActiveTab("base");
      return;
    }

    if (editingProduct.checkout_provider === "external" && !editingProduct.external_payment_url?.trim()) {
      alert("Produto com link externo precisa ter URL de pagamento.");
      setActiveTab("price");
      return;
    }

    setSaving(true);

    const payload = {
      name: editingProduct.name.trim(),
      slug,
      subtitle: editingProduct.subtitle?.trim() || null,
      description: editingProduct.description?.trim() || null,
      category: editingProduct.category || "servicos-unicos",
      product_type: editingProduct.product_type || "service",
      price_cents: Number(editingProduct.price_cents || 0),
      old_price_cents: editingProduct.old_price_cents ? Number(editingProduct.old_price_cents) : null,
      is_active: Boolean(editingProduct.is_active),
      is_featured: Boolean(editingProduct.is_featured),
      order_index: Number(editingProduct.order_index || 1),
      image_url: editingProduct.image_url?.trim() || null,
      badge: editingProduct.badge?.trim() || null,
      checkout_provider: editingProduct.checkout_provider || "appmax",
      external_payment_url: editingProduct.external_payment_url?.trim() || null,
      accepts_pix: Boolean(editingProduct.accepts_pix),
      accepts_boleto: Boolean(editingProduct.accepts_boleto),
      accepts_card: Boolean(editingProduct.accepts_card),
      appmax_sku: editingProduct.appmax_sku?.trim() || slug,
      appmax_product_name: editingProduct.appmax_product_name?.trim() || editingProduct.name.trim(),
      course_id: editingProduct.course_id ? Number(editingProduct.course_id) : null,
      notes: editingProduct.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const response = editingProduct.id
      ? await supabase.from("site_products").update(payload).eq("id", editingProduct.id)
      : await supabase.from("site_products").insert(payload);

    setSaving(false);

    if (response.error) {
      console.log("Erro ao salvar produto:", response.error);
      alert("Erro ao salvar produto.");
      return;
    }

    alert(editingProduct.id ? "Produto atualizado." : "Produto criado.");
    closeEditor();
    loadData();
  }

  async function duplicateProduct(product: SiteProduct) {
    const copy = {
      name: `${product.name} - cópia`,
      slug: `${product.slug}-copia-${Date.now()}`,
      subtitle: product.subtitle,
      description: product.description,
      category: product.category,
      product_type: product.product_type,
      price_cents: product.price_cents,
      old_price_cents: product.old_price_cents,
      is_active: false,
      is_featured: false,
      order_index: Number(product.order_index || 1) + 1,
      image_url: product.image_url,
      badge: product.badge,
      checkout_provider: product.checkout_provider,
      external_payment_url: product.external_payment_url,
      accepts_pix: product.accepts_pix,
      accepts_boleto: product.accepts_boleto,
      accepts_card: product.accepts_card,
      appmax_sku: `${product.appmax_sku || product.slug}-copia-${Date.now()}`,
      appmax_product_name: `${product.appmax_product_name || product.name} - cópia`,
      course_id: product.course_id,
      notes: product.notes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("site_products").insert(copy);

    if (error) {
      console.log("Erro ao duplicar produto:", error);
      alert("Erro ao duplicar produto.");
      return;
    }

    alert("Produto duplicado como oculto.");
    loadData();
  }

  async function toggleActive(product: SiteProduct) {
    const { error } = await supabase
      .from("site_products")
      .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) {
      console.log("Erro ao alterar status:", error);
      alert("Erro ao alterar status.");
      return;
    }

    loadData();
  }

  async function toggleFeatured(product: SiteProduct) {
    const { error } = await supabase
      .from("site_products")
      .update({ is_featured: !product.is_featured, updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) {
      console.log("Erro ao alterar destaque:", error);
      alert("Erro ao alterar destaque.");
      return;
    }

    loadData();
  }

  async function deleteProduct(product: SiteProduct) {
    const confirmDelete = confirm(
      `Apagar o produto "${product.name}"?\n\nSe ele já foi vendido, é melhor ocultar em vez de apagar.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("site_products").delete().eq("id", product.id);

    if (error) {
      console.log("Erro ao apagar produto:", error);
      alert("Erro ao apagar produto.");
      return;
    }

    alert("Produto apagado.");
    loadData();
  }

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchSearch =
        !value ||
        product.name.toLowerCase().includes(value) ||
        product.slug.toLowerCase().includes(value) ||
        product.subtitle?.toLowerCase().includes(value) ||
        product.description?.toLowerCase().includes(value) ||
        product.appmax_sku?.toLowerCase().includes(value) ||
        product.badge?.toLowerCase().includes(value);

      const matchCategory = categoryFilter === "all" || product.category === categoryFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active) ||
        (statusFilter === "inactive" && !product.is_active) ||
        (statusFilter === "featured" && product.is_featured) ||
        (statusFilter === "appmax" && product.checkout_provider === "appmax") ||
        (statusFilter === "external" && product.checkout_provider === "external") ||
        (statusFilter === "manual" && product.checkout_provider === "manual");

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter((product) => product.is_active).length,
      inactive: products.filter((product) => !product.is_active).length,
      featured: products.filter((product) => product.is_featured).length,
      appmax: products.filter((product) => product.checkout_provider === "appmax").length,
    };
  }, [products]);

  const previewBenefits = useMemo(() => {
    return String(editingProduct.notes || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }, [editingProduct.notes]);

  const tabs: { id: EditorTab; label: string }[] = [
    { id: "base", label: "Informações" },
    { id: "price", label: "Preço" },
    { id: "offer", label: "Oferta" },
    { id: "visual", label: "Visual" },
    { id: "advanced", label: "Avançado" },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] text-white">
        <h1 className="text-4xl font-black mb-4">Produtos FatorZ</h1>
        <p className="text-zinc-400">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="relative text-white">
      <section className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-black p-6 md:p-9">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff0096]/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#005cff]/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-500">Central de ofertas</p>
            <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              Produtos organizados, edição rápida e visual profissional.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 md:text-base">
              Edite preço, checkout, descrição, benefícios, ordem, destaque e status sem ficar perdido em campos espalhados.
            </p>
          </div>

          <button
            onClick={openNewProduct}
            className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-black transition hover:bg-zinc-200"
          >
            + Novo produto
          </button>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Total", value: stats.total, tone: "text-white" },
          { label: "Ativos", value: stats.active, tone: "text-emerald-300" },
          { label: "Ocultos", value: stats.inactive, tone: "text-zinc-300" },
          { label: "Destaques", value: stats.featured, tone: "text-yellow-300" },
          { label: "Appmax", value: stats.appmax, tone: "text-pink-300" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</p>
            <h2 className={`mt-2 text-3xl font-black ${stat.tone}`}>{stat.value}</h2>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-[28px] border border-white/10 bg-black/50 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, slug, SKU, descrição..."
            className={fieldClass()}
          />

          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={selectClass()}>
            <option value="all" style={optionStyle()}>Todas categorias</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value} style={optionStyle()}>{category.label}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={selectClass()}>
            <option value="all" style={optionStyle()}>Todos status</option>
            <option value="active" style={optionStyle()}>Ativos</option>
            <option value="inactive" style={optionStyle()}>Ocultos</option>
            <option value="featured" style={optionStyle()}>Destaques</option>
            <option value="appmax" style={optionStyle()}>Appmax</option>
            <option value="external" style={optionStyle()}>Link externo</option>
            <option value="manual" style={optionStyle()}>Manual</option>
          </select>

          <button onClick={loadData} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black transition hover:bg-white/10">
            Atualizar
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center text-zinc-400">
            Nenhum produto encontrado com esses filtros.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <article key={product.id} className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-pink-500/30 hover:bg-white/[0.055]">
              <div className="grid gap-5 xl:grid-cols-[1fr_230px_280px] xl:items-center">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Pill tone={product.is_active ? "green" : "default"}>{product.is_active ? "Ativo" : "Oculto"}</Pill>
                    {product.is_featured && <Pill tone="yellow">Destaque</Pill>}
                    <Pill tone="pink">{getCategoryLabel(product.category)}</Pill>
                    <Pill tone="blue">{getCheckoutLabel(product.checkout_provider)}</Pill>
                    {product.badge && <Pill>{product.badge}</Pill>}
                  </div>

                  <h2 className="truncate text-2xl font-black">{product.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{product.subtitle || product.description || "Sem texto de apoio cadastrado."}</p>

                  <div className="mt-4 grid gap-3 text-xs text-zinc-500 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                      <span className="block font-black uppercase tracking-widest text-zinc-600">Slug</span>
                      <span className="mt-1 block truncate text-zinc-300">{product.slug}</span>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                      <span className="block font-black uppercase tracking-widest text-zinc-600">Tipo</span>
                      <span className="mt-1 block text-zinc-300">{getTypeLabel(product.product_type)}</span>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                      <span className="block font-black uppercase tracking-widest text-zinc-600">Ordem</span>
                      <span className="mt-1 block text-zinc-300">{product.order_index || 1}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/40 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Preço</p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    {product.old_price_cents && (
                      <span className="pb-1 text-sm font-black text-zinc-600 line-through">{formatMoney(product.old_price_cents)}</span>
                    )}
                    <strong className="text-3xl font-black">{formatMoney(product.price_cents)}</strong>
                  </div>
                  <p className="mt-3 text-xs font-bold text-zinc-500">
                    Pix {product.accepts_pix ? "sim" : "não"} · Boleto {product.accepts_boleto ? "sim" : "não"} · Cartão {product.accepts_card ? "sim" : "não"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                  <button onClick={() => editProduct(product)} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-zinc-200">Editar</button>
                  <button onClick={() => duplicateProduct(product)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black transition hover:bg-white/10">Duplicar</button>
                  <button onClick={() => toggleFeatured(product)} className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm font-black text-yellow-200 transition hover:bg-yellow-500/15">
                    {product.is_featured ? "Tirar destaque" : "Destacar"}
                  </button>
                  <button onClick={() => toggleActive(product)} className="rounded-2xl border border-pink-500/20 bg-pink-500/10 px-4 py-3 text-sm font-black text-pink-200 transition hover:bg-pink-500/15">
                    {product.is_active ? "Ocultar" : "Ativar"}
                  </button>
                  <button onClick={() => deleteProduct(product)} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/15 sm:col-span-3 xl:col-span-2">Apagar</button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {isEditorOpen && (
        <div className="fixed inset-0 z-[999] flex justify-end bg-black/70 backdrop-blur-sm">
          <button className="hidden flex-1 cursor-default lg:block" onClick={closeEditor} aria-label="Fechar editor" />

          <aside className="h-full w-full overflow-y-auto border-l border-white/10 bg-[#050506] shadow-2xl lg:max-w-4xl">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-black/90 px-5 py-4 backdrop-blur-2xl md:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-500">
                    {editingProduct.id ? "Editar produto" : "Novo produto"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black md:text-3xl">{editingProduct.name || "Oferta sem nome"}</h2>
                </div>

                <button onClick={closeEditor} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black transition hover:bg-white/10">
                  Fechar
                </button>
              </div>

              <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition ${
                      activeTab === tab.id
                        ? "border-pink-500/40 bg-pink-500/15 text-pink-200"
                        : "border-white/10 bg-white/[0.035] text-zinc-500 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1fr_320px]">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
                {activeTab === "base" && (
                  <div className="space-y-5">
                    <div>
                      <Label>Nome do produto</Label>
                      <input value={editingProduct.name || ""} onChange={(event) => updateName(event.target.value)} className={fieldClass()} placeholder="Ex: Plano Básico" />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label>Slug do link</Label>
                        <input value={editingProduct.slug || ""} onChange={(event) => updateField("slug", makeSlug(event.target.value))} className={fieldClass()} placeholder="plano-basico" />
                      </div>
                      <div>
                        <Label>Categoria</Label>
                        <select value={editingProduct.category || "servicos-unicos"} onChange={(event) => updateField("category", event.target.value)} className={selectClass()}>
                          {categories.map((category) => <option key={category.value} value={category.value} style={optionStyle()}>{category.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label helper="Linha curta que aparece logo abaixo do nome no painel e pode apoiar a oferta.">Subtítulo</Label>
                      <input value={editingProduct.subtitle || ""} onChange={(event) => updateField("subtitle", event.target.value)} className={fieldClass()} placeholder="Assessoria mensal de entrada" />
                    </div>

                    <div>
                      <Label helper="Texto principal que aparece no card público do site.">Descrição pública</Label>
                      <textarea value={editingProduct.description || ""} onChange={(event) => updateField("description", event.target.value)} rows={5} className={fieldClass()} placeholder="Explique de forma clara o que esse produto entrega." />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label>Tipo de produto</Label>
                        <select value={editingProduct.product_type || "service"} onChange={(event) => updateField("product_type", event.target.value)} className={selectClass()}>
                          {productTypes.map((type) => <option key={type.value} value={type.value} style={optionStyle()}>{type.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Ordem na vitrine</Label>
                        <input type="number" value={editingProduct.order_index || 1} onChange={(event) => updateField("order_index", Number(event.target.value))} className={fieldClass()} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "price" && (
                  <div className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label>Preço atual</Label>
                        <input value={centsToRealInput(editingProduct.price_cents)} onChange={(event) => updateField("price_cents", realInputToCents(event.target.value))} className={fieldClass()} placeholder="97,00" />
                      </div>
                      <div>
                        <Label>Preço antigo</Label>
                        <input value={editingProduct.old_price_cents ? centsToRealInput(editingProduct.old_price_cents) : ""} onChange={(event) => updateField("old_price_cents", event.target.value ? realInputToCents(event.target.value) : null)} className={fieldClass()} placeholder="197,00" />
                      </div>
                    </div>

                    <div>
                      <Label>Checkout</Label>
                      <select value={editingProduct.checkout_provider || "appmax"} onChange={(event) => updateField("checkout_provider", event.target.value)} className={selectClass()}>
                        {checkoutProviders.map((provider) => <option key={provider.value} value={provider.value} style={optionStyle()}>{provider.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <Label helper="Obrigatório somente quando o checkout for Link externo.">Link externo de pagamento</Label>
                      <input value={editingProduct.external_payment_url || ""} onChange={(event) => updateField("external_payment_url", event.target.value)} className={fieldClass()} placeholder="https://..." />
                    </div>

                    <div>
                      <Label>Formas de pagamento visíveis</Label>
                      <div className="grid gap-3 md:grid-cols-3">
                        {[
                          { field: "accepts_pix" as keyof SiteProduct, label: "Pix" },
                          { field: "accepts_boleto" as keyof SiteProduct, label: "Boleto" },
                          { field: "accepts_card" as keyof SiteProduct, label: "Cartão" },
                        ].map((item) => {
                          const active = Boolean(editingProduct[item.field]);
                          return (
                            <button key={item.field} onClick={() => updateField(item.field, !active)} className={`rounded-2xl border px-4 py-4 text-sm font-black transition ${active ? "border-pink-500/35 bg-pink-500/15 text-pink-200" : "border-white/10 bg-white/[0.03] text-zinc-500"}`}>
                              {item.label}: {active ? "sim" : "não"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "offer" && (
                  <div className="space-y-5">
                    <div>
                      <Label helper="Cada linha vira uma bolinha no card do produto. É aqui que você altera os benefícios que aparecem no site.">Benefícios públicos da oferta</Label>
                      <textarea value={editingProduct.notes || ""} onChange={(event) => updateField("notes", event.target.value)} rows={8} className={fieldClass()} placeholder={"Acompanhamento recorrente\nDireção de presença digital\nOrganização de conteúdo e posicionamento\nEstrutura para crescer com consistência"} />
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-black/35 p-5">
                      <p className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-500">Prévia dos benefícios</p>
                      {previewBenefits.length ? (
                        <ul className="space-y-3">
                          {previewBenefits.map((benefit) => (
                            <li key={benefit} className="flex gap-3 text-sm text-zinc-300">
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(255,0,150,0.8)]" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-zinc-500">Sem benefícios personalizados. A landing usará os textos padrão pelo tipo do produto.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "visual" && (
                  <div className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label>Badge</Label>
                        <input value={editingProduct.badge || ""} onChange={(event) => updateField("badge", event.target.value)} className={fieldClass()} placeholder="Ex: Premium, Mais vendido" />
                      </div>
                      <div>
                        <Label helper="Importe uma imagem do computador ou cole um link externo. Funciona para qualquer categoria de produto.">
                          Imagem / capa do produto
                        </Label>

                        <div className="space-y-3">
                          <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-pink-500/30 bg-pink-500/10 px-4 py-4 text-sm font-black text-pink-200 transition hover:bg-pink-500/15">
                            {uploadingCover ? "Importando capa..." : "Importar capa do produto"}

                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              disabled={uploadingCover}
                              onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                  uploadProductCover(file);
                                }

                                event.target.value = "";
                              }}
                              className="hidden"
                            />
                          </label>

                          <input
                            value={editingProduct.image_url || ""}
                            onChange={(event) => updateField("image_url", event.target.value)}
                            className={fieldClass()}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <button onClick={() => updateField("is_active", !editingProduct.is_active)} className={`rounded-2xl border px-5 py-4 text-sm font-black transition ${editingProduct.is_active ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-zinc-500"}`}>
                        {editingProduct.is_active ? "Produto ativo" : "Produto oculto"}
                      </button>
                      <button onClick={() => updateField("is_featured", !editingProduct.is_featured)} className={`rounded-2xl border px-5 py-4 text-sm font-black transition ${editingProduct.is_featured ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-300" : "border-white/10 bg-white/[0.03] text-zinc-500"}`}>
                        {editingProduct.is_featured ? "Está em destaque" : "Sem destaque"}
                      </button>
                    </div>

                    {editingProduct.image_url && (
                      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/40">
                        <img src={editingProduct.image_url} alt="Prévia" className="h-64 w-full object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "advanced" && (
                  <div className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label>SKU Appmax</Label>
                        <input value={editingProduct.appmax_sku || ""} onChange={(event) => updateField("appmax_sku", event.target.value)} className={fieldClass()} placeholder="plano-basico" />
                      </div>
                      <div>
                        <Label>Nome Appmax</Label>
                        <input value={editingProduct.appmax_product_name || ""} onChange={(event) => updateField("appmax_product_name", event.target.value)} className={fieldClass()} placeholder="Plano Básico" />
                      </div>
                    </div>

                    <div>
                      <Label>Curso vinculado</Label>
                      <select value={editingProduct.course_id || ""} onChange={(event) => updateField("course_id", event.target.value ? Number(event.target.value) : null)} className={selectClass()}>
                        <option value="" style={optionStyle()}>Nenhum curso vinculado</option>
                        {courses.map((course) => <option key={course.id} value={course.id} style={optionStyle()}>{course.title}</option>)}
                      </select>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-black/35 p-5 text-sm leading-relaxed text-zinc-500">
                      Link público do checkout interno: <br />
                      <span className="font-bold text-zinc-300">/checkout/produto?slug={editingProduct.slug || "slug-do-produto"}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="rounded-[30px] border border-white/10 bg-black/55 p-5">
                  <p className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-500">Card público</p>
                  <div className={`rounded-[28px] border p-5 ${editingProduct.is_featured ? "border-pink-500/40 bg-pink-500/[0.08]" : "border-white/10 bg-white/[0.04]"}`}>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {editingProduct.is_featured && <Pill tone="pink">Destaque</Pill>}
                      {editingProduct.badge && <Pill>{editingProduct.badge}</Pill>}
                    </div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-500">{getTypeLabel(editingProduct.product_type)}</p>
                    <h3 className="text-2xl font-black">{editingProduct.name || "Nome do produto"}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">{editingProduct.description || editingProduct.subtitle || "Descrição da oferta aparecerá aqui."}</p>
                    <div className="mt-5 rounded-3xl border border-white/10 bg-black/45 p-5">
                      <p className="text-sm font-bold text-zinc-500">Valor</p>
                      <div className="mt-1 flex items-end gap-2">
                        {editingProduct.old_price_cents && <span className="pb-1 text-sm font-black text-zinc-600 line-through">{formatMoney(editingProduct.old_price_cents)}</span>}
                        <strong className="text-3xl font-black">{formatMoney(editingProduct.price_cents)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 rounded-[28px] border border-white/10 bg-black p-4 shadow-2xl">
                  <button onClick={saveProduct} disabled={saving} className="w-full rounded-2xl bg-white px-6 py-4 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? "Salvando..." : editingProduct.id ? "Salvar alterações" : "Criar produto"}
                  </button>
                  <button onClick={closeEditor} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-black transition hover:bg-white/10">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
