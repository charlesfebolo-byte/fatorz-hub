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
  { value: "manual", label: "Manual / WhatsApp" },
];

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

  if (Number.isNaN(number)) return 0;

  return Math.round(number * 100);
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

function selectClassName() {
  return "w-full rounded-2xl border border-white/10 bg-[#0B0B10] px-4 py-4 text-white outline-none focus:border-pink-500/40";
}

function optionStyle() {
  return {
    backgroundColor: "#0B0B10",
    color: "#ffffff",
  };
}

export default function AdminProducts() {
  const [products, setProducts] = useState<SiteProduct[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingProduct, setEditingProduct] =
    useState<Partial<SiteProduct>>(emptyProduct);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  function resetForm() {
    setEditingProduct(emptyProduct);

    setTimeout(() => {
      document
        .getElementById("form-produto")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function editProduct(product: SiteProduct) {
    setEditingProduct(product);

    setTimeout(() => {
      document
        .getElementById("form-produto")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function updateField(field: keyof SiteProduct, value: any) {
    setEditingProduct((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  async function saveProduct() {
    if (!editingProduct.name?.trim()) {
      alert("Informe o nome do produto.");
      return;
    }

    const slug = editingProduct.slug?.trim() || makeSlug(editingProduct.name);

    if (!slug) {
      alert("Informe um slug válido.");
      return;
    }

    if (editingProduct.checkout_provider === "external") {
      if (!editingProduct.external_payment_url?.trim()) {
        alert("Produto com link externo precisa ter URL de pagamento.");
        return;
      }
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
      old_price_cents: editingProduct.old_price_cents
        ? Number(editingProduct.old_price_cents)
        : null,
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
      appmax_product_name:
        editingProduct.appmax_product_name?.trim() || editingProduct.name.trim(),
      course_id: editingProduct.course_id ? Number(editingProduct.course_id) : null,
      notes: editingProduct.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const response = editingProduct.id
      ? await supabase
          .from("site_products")
          .update(payload)
          .eq("id", editingProduct.id)
      : await supabase.from("site_products").insert(payload);

    setSaving(false);

    if (response.error) {
      console.log("Erro ao salvar produto:", response.error);
      alert("Erro ao salvar produto.");
      return;
    }

    alert(editingProduct.id ? "Produto atualizado." : "Produto criado.");
    resetForm();
    loadData();
  }

  async function toggleActive(product: SiteProduct) {
    const { error } = await supabase
      .from("site_products")
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString(),
      })
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
      .update({
        is_featured: !product.is_featured,
        updated_at: new Date().toISOString(),
      })
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
      `Apagar o produto "${product.name}"?\n\nSe ele já foi vendido, é melhor desativar em vez de apagar.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("site_products")
      .delete()
      .eq("id", product.id);

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
        product.appmax_sku?.toLowerCase().includes(value);

      const matchCategory =
        categoryFilter === "all" || product.category === categoryFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active) ||
        (statusFilter === "inactive" && !product.is_active) ||
        (statusFilter === "featured" && product.is_featured) ||
        (statusFilter === "appmax" && product.checkout_provider === "appmax") ||
        (statusFilter === "external" && product.checkout_provider === "external");

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.is_active).length;
    const inactive = products.filter((product) => !product.is_active).length;
    const featured = products.filter((product) => product.is_featured).length;
    const appmax = products.filter(
      (product) => product.checkout_provider === "appmax"
    ).length;

    return {
      total: products.length,
      active,
      inactive,
      featured,
      appmax,
    };
  }, [products]);

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-4xl font-black mb-4">Produtos FatorZ</h1>
        <p className="text-zinc-400">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-black p-6 md:p-10 mb-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#ff0096]/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#005cff]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%)]" />

        <div className="relative">
          <p className="text-pink-500 font-black uppercase tracking-[0.28em] text-sm mb-4">
            Catálogo FatorZ
          </p>

          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
            Produtos, preços e checkout{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
              no controle.
            </span>
          </h1>

          <p className="max-w-4xl text-zinc-400 text-lg leading-relaxed">
            Adicione produtos, altere valores, escolha categorias, ative ou
            desative ofertas e defina quais formas de pagamento aparecem no
            checkout.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Total
          </p>
          <h2 className="mt-3 text-4xl font-black">{stats.total}</h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Ativos
          </p>
          <h2 className="mt-3 text-4xl font-black text-emerald-300">
            {stats.active}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Ocultos
          </p>
          <h2 className="mt-3 text-4xl font-black text-zinc-300">
            {stats.inactive}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Destaques
          </p>
          <h2 className="mt-3 text-4xl font-black text-yellow-300">
            {stats.featured}
          </h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs uppercase tracking-widest font-black text-zinc-500">
            Appmax
          </p>
          <h2 className="mt-3 text-4xl font-black text-pink-300">
            {stats.appmax}
          </h2>
        </div>
      </section>

      <section className="grid xl:grid-cols-[440px_1fr] gap-8">
        <aside
          id="form-produto"
          className="rounded-[36px] border border-white/10 bg-black/60 p-6 h-fit"
        >
          <div className="mb-6">
            <p className="text-pink-500 font-black uppercase tracking-[0.25em] text-sm mb-3">
              {editingProduct.id ? "Editar produto" : "Novo produto"}
            </p>

            <h2 className="text-3xl font-black">
              {editingProduct.id ? "Atualizar oferta" : "Cadastrar oferta"}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Tudo que você alterar aqui será usado depois na landing, no
              checkout e nos pedidos do Hub.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Nome do produto
              </label>

              <input
                value={editingProduct.name || ""}
                onChange={(event) => updateName(event.target.value)}
                placeholder="Ex: Diagnóstico de Perfil"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Slug
              </label>

              <input
                value={editingProduct.slug || ""}
                onChange={(event) => updateField("slug", makeSlug(event.target.value))}
                placeholder="diagnostico-de-perfil"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Subtítulo
              </label>

              <input
                value={editingProduct.subtitle || ""}
                onChange={(event) => updateField("subtitle", event.target.value)}
                placeholder="Frase curta da oferta"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Descrição
              </label>

              <textarea
                value={editingProduct.description || ""}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Explique o que esse produto entrega."
                rows={5}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Categoria
                </label>

                <select
                  value={editingProduct.category || "servicos-unicos"}
                  onChange={(event) => updateField("category", event.target.value)}
                  className={selectClassName()}
                  style={{ colorScheme: "dark" }}
                >
                  {categories.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                      style={optionStyle()}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Tipo
                </label>

                <select
                  value={editingProduct.product_type || "service"}
                  onChange={(event) => updateField("product_type", event.target.value)}
                  className={selectClassName()}
                  style={{ colorScheme: "dark" }}
                >
                  {productTypes.map((type) => (
                    <option key={type.value} value={type.value} style={optionStyle()}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Preço atual
                </label>

                <input
                  value={centsToRealInput(editingProduct.price_cents)}
                  onChange={(event) =>
                    updateField("price_cents", realInputToCents(event.target.value))
                  }
                  placeholder="47,00"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Preço antigo
                </label>

                <input
                  value={
                    editingProduct.old_price_cents
                      ? centsToRealInput(editingProduct.old_price_cents)
                      : ""
                  }
                  onChange={(event) =>
                    updateField("old_price_cents", realInputToCents(event.target.value))
                  }
                  placeholder="Opcional"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Badge
                </label>

                <input
                  value={editingProduct.badge || ""}
                  onChange={(event) => updateField("badge", event.target.value)}
                  placeholder="Ex: Premium"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-black text-zinc-300">
                  Ordem
                </label>

                <input
                  type="number"
                  value={editingProduct.order_index || 1}
                  onChange={(event) =>
                    updateField("order_index", Number(event.target.value || 1))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none focus:border-pink-500/40"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Checkout
              </label>

              <select
                value={editingProduct.checkout_provider || "appmax"}
                onChange={(event) =>
                  updateField("checkout_provider", event.target.value)
                }
                className={selectClassName()}
                style={{ colorScheme: "dark" }}
              >
                {checkoutProviders.map((provider) => (
                  <option
                    key={provider.value}
                    value={provider.value}
                    style={optionStyle()}
                  >
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Link externo de pagamento
              </label>

              <input
                value={editingProduct.external_payment_url || ""}
                onChange={(event) =>
                  updateField("external_payment_url", event.target.value)
                }
                placeholder="Use apenas se o checkout for externo"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => updateField("accepts_pix", !editingProduct.accepts_pix)}
                className={`rounded-2xl border px-4 py-4 font-black transition ${
                  editingProduct.accepts_pix
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.04] text-zinc-500"
                }`}
              >
                Pix
              </button>

              <button
                type="button"
                onClick={() =>
                  updateField("accepts_boleto", !editingProduct.accepts_boleto)
                }
                className={`rounded-2xl border px-4 py-4 font-black transition ${
                  editingProduct.accepts_boleto
                    ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-300"
                    : "border-white/10 bg-white/[0.04] text-zinc-500"
                }`}
              >
                Boleto
              </button>

              <button
                type="button"
                onClick={() => updateField("accepts_card", !editingProduct.accepts_card)}
                className={`rounded-2xl border px-4 py-4 font-black transition ${
                  editingProduct.accepts_card
                    ? "border-blue-400/30 bg-blue-500/10 text-blue-300"
                    : "border-white/10 bg-white/[0.04] text-zinc-500"
                }`}
              >
                Cartão
              </button>
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                SKU Appmax
              </label>

              <input
                value={editingProduct.appmax_sku || ""}
                onChange={(event) => updateField("appmax_sku", event.target.value)}
                placeholder="Ex: diagnostico-perfil"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Nome do produto na Appmax
              </label>

              <input
                value={editingProduct.appmax_product_name || ""}
                onChange={(event) =>
                  updateField("appmax_product_name", event.target.value)
                }
                placeholder="Nome enviado para Appmax"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Curso vinculado
              </label>

              <select
                value={editingProduct.course_id || ""}
                onChange={(event) =>
                  updateField(
                    "course_id",
                    event.target.value ? Number(event.target.value) : null
                  )
                }
                className={selectClassName()}
                style={{ colorScheme: "dark" }}
              >
                <option value="" style={optionStyle()}>
                  Nenhum
                </option>

                {courses.map((course) => (
                  <option key={course.id} value={course.id} style={optionStyle()}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Imagem / capa
              </label>

              <input
                value={editingProduct.image_url || ""}
                onChange={(event) => updateField("image_url", event.target.value)}
                placeholder="URL da imagem"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-black text-zinc-300">
                Observações internas
              </label>

              <textarea
                value={editingProduct.notes || ""}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={4}
                placeholder="Notas internas sobre esse produto."
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateField("is_active", !editingProduct.is_active)}
                className={`rounded-2xl border px-4 py-4 font-black transition ${
                  editingProduct.is_active
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border-red-400/30 bg-red-500/10 text-red-300"
                }`}
              >
                {editingProduct.is_active ? "Ativo" : "Oculto"}
              </button>

              <button
                type="button"
                onClick={() =>
                  updateField("is_featured", !editingProduct.is_featured)
                }
                className={`rounded-2xl border px-4 py-4 font-black transition ${
                  editingProduct.is_featured
                    ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-300"
                    : "border-white/10 bg-white/[0.04] text-zinc-500"
                }`}
              >
                {editingProduct.is_featured ? "Destaque" : "Sem destaque"}
              </button>
            </div>

            <button
              onClick={saveProduct}
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving
                ? "Salvando..."
                : editingProduct.id
                ? "Salvar produto"
                : "Criar produto"}
            </button>

            {editingProduct.id && (
              <button
                onClick={resetForm}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white transition hover:bg-white/[0.08]"
              >
                Cancelar edição / novo produto
              </button>
            )}
          </div>
        </aside>

        <main className="space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 md:p-6">
            <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_160px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, slug, SKU, descrição..."
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className={selectClassName()}
                style={{ colorScheme: "dark" }}
              >
                <option value="all" style={optionStyle()}>
                  Todas categorias
                </option>

                {categories.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                    style={optionStyle()}
                  >
                    {category.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={selectClassName()}
                style={{ colorScheme: "dark" }}
              >
                <option value="all" style={optionStyle()}>
                  Todos status
                </option>
                <option value="active" style={optionStyle()}>
                  Ativos
                </option>
                <option value="inactive" style={optionStyle()}>
                  Ocultos
                </option>
                <option value="featured" style={optionStyle()}>
                  Destaques
                </option>
                <option value="appmax" style={optionStyle()}>
                  Appmax
                </option>
                <option value="external" style={optionStyle()}>
                  Link externo
                </option>
              </select>

              <button
                onClick={resetForm}
                className="rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:bg-zinc-200"
              >
                Novo
              </button>
            </div>
          </section>

          <section className="grid gap-5">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="rounded-[34px] border border-white/10 bg-black/55 p-5 md:p-6"
              >
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                  <div className="flex-1">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${
                          product.is_active
                            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                            : "border-red-400/25 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {product.is_active ? "Ativo" : "Oculto"}
                      </span>

                      {product.is_featured && (
                        <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-yellow-300">
                          Destaque
                        </span>
                      )}

                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-300">
                        {getCategoryLabel(product.category)}
                      </span>

                      <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-300">
                        {getTypeLabel(product.product_type)}
                      </span>

                      {product.checkout_provider === "appmax" && (
                        <span className="rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-pink-300">
                          Appmax
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black">
                      {product.name}
                    </h3>

                    <p className="mt-2 text-zinc-400 leading-relaxed">
                      {product.subtitle || product.description || "Sem descrição."}
                    </p>

                    <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                          Preço
                        </p>
                        <p className="mt-1 font-black text-lg">
                          {formatMoney(product.price_cents)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                          Pix
                        </p>
                        <p className="mt-1 font-black">
                          {product.accepts_pix ? "Sim" : "Não"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                          Boleto
                        </p>
                        <p className="mt-1 font-black">
                          {product.accepts_boleto ? "Sim" : "Não"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                          Cartão
                        </p>
                        <p className="mt-1 font-black">
                          {product.accepts_card ? "Sim" : "Não"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500">
                          Ordem
                        </p>
                        <p className="mt-1 font-black">{product.order_index || 1}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-zinc-500">
                      <p>
                        <span className="font-black text-zinc-300">Slug:</span>{" "}
                        {product.slug}
                      </p>
                      <p>
                        <span className="font-black text-zinc-300">SKU:</span>{" "}
                        {product.appmax_sku || "—"}
                      </p>
                      {product.course_id && (
                        <p>
                          <span className="font-black text-zinc-300">
                            Curso vinculado:
                          </span>{" "}
                          #{product.course_id}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:w-44">
                    <button
                      onClick={() => editProduct(product)}
                      className="rounded-2xl bg-white px-5 py-3 font-black text-black transition hover:bg-zinc-200"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => toggleActive(product)}
                      className={`rounded-2xl px-5 py-3 font-black transition ${
                        product.is_active
                          ? "bg-red-500 text-white hover:opacity-90"
                          : "bg-emerald-500 text-black hover:opacity-90"
                      }`}
                    >
                      {product.is_active ? "Ocultar" : "Ativar"}
                    </button>

                    <button
                      onClick={() => toggleFeatured(product)}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-black text-white transition hover:bg-white/[0.08]"
                    >
                      {product.is_featured ? "Remover destaque" : "Destacar"}
                    </button>

                    <button
                      onClick={() => deleteProduct(product)}
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-black text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          {!filteredProducts.length && (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-zinc-400">
              Nenhum produto encontrado.
            </div>
          )}
        </main>
      </section>
    </div>
  );
}