export function normalizeProductText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function findDiagnosticProduct<
  T extends {
    slug?: string | null;
    name?: string | null;
    product_type?: string | null;
    category?: string | null;
    subtitle?: string | null;
    description?: string | null;
    badge?: string | null;
  },
>(products: T[]) {
  return (
    products.find((product) => {
      const text = normalizeProductText(
        [
          product.slug,
          product.name,
          product.product_type,
          product.category,
          product.subtitle,
          product.description,
          product.badge,
        ].join(" ")
      );

      return (
        product.product_type === "diagnostic" ||
        text.includes("diagnostico-de-perfil") ||
        text.includes("diagnostico de perfil") ||
        (text.includes("diagnostico") && text.includes("perfil")) ||
        (text.includes("analise") && text.includes("perfil"))
      );
    }) || null
  );
}
