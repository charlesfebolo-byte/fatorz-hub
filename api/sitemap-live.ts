const BASE_URL = "https://fatorz-hub.vercel.app";

const urls = [
  "/",
  "/servicos",
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

function getPriority(path: string) {
  if (path === "/") return "1.0";
  if (path === "/servicos") return "0.95";
  if (path === "/agencia-de-marketing-em-pelotas") return "0.95";
  if (path.startsWith("/servicos/")) return "0.9";
  if (path === "/blog") return "0.85";
  return "0.75";
}

function getChangeFreq(path: string) {
  if (path === "/" || path === "/servicos" || path === "/blog") {
    return "weekly";
  }

  return "monthly";
}

function buildSitemap() {
  const lastmod = "2026-06-13";

  const urlItems = urls
    .map((path) => {
      const loc = path === "/" ? BASE_URL + "/" : BASE_URL + path;

      return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${getChangeFreq(path)}</changefreq>
    <priority>${getPriority(path)}</priority>
  </url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlItems}
</urlset>`;
}

export default function handler(_req: any, res: any) {
  const sitemap = buildSitemap();

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.status(200).send(sitemap);
}