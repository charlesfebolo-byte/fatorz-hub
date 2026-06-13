const BASE_URL = "https://fatorz-hub.vercel.app";

const urls = [
  "/",
  "/servicos",
  "/mapa-do-site",
  "/agencia-de-marketing-em-pelotas",
  "/servicos/agencia-de-marketing-digital",
  "/servicos/gestao-de-instagram",
  "/servicos/edicao-de-reels",
  "/servicos/criacao-de-artes-para-instagram",
  "/servicos/landing-page",
  "/servicos/identidade-visual",
  "/servicos/marketing-para-barbeiros",
  "/blog",
  "/blog/o-que-e-uma-agencia-de-marketing-digital",
  "/blog/quanto-custa-uma-landing-page",
  "/blog/vale-a-pena-editar-reels",
  "/blog/como-organizar-instagram-comercial",
  "/blog/identidade-visual-para-instagram",
  "/blog/criacao-de-artes-para-instagram",
  "/blog/marketing-para-barbeiros",
  "/blog/site-para-pequenos-negocios",
  "/blog/diagnostico-de-instagram",
  "/blog/plano-basic-marketing-digital",
  "/blog/plano-plus-marketing-digital",
  "/blog/plano-pro-marketing-digital",
];

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getChangeFreq(path: string) {
  if (
    path === "/" ||
    path === "/servicos" ||
    path === "/blog" ||
    path === "/mapa-do-site"
  ) {
    return "weekly";
  }

  return "monthly";
}

function getPriority(path: string) {
  if (path === "/") return "1.0";
  if (path === "/servicos") return "0.95";
  if (path === "/agencia-de-marketing-em-pelotas") return "0.95";
  if (path === "/mapa-do-site") return "0.9";
  if (path === "/blog") return "0.85";
  if (path.startsWith("/servicos/")) return "0.85";
  return "0.75";
}

function buildSitemap() {
  const lastmod = "2026-06-13";

  const items = urls
    .map((path) => {
      const loc = path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`;

      return `<url><loc>${escapeXml(
        loc
      )}</loc><lastmod>${lastmod}</lastmod><changefreq>${getChangeFreq(
        path
      )}</changefreq><priority>${getPriority(path)}</priority></url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export default function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method Not Allowed");
  }

  const sitemap = buildSitemap();

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Robots-Tag", "index, follow");
  res.setHeader("X-Content-Type-Options", "nosniff");

  return res.status(200).send(sitemap);
}