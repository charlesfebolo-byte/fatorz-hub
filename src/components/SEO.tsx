import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { seoServices } from "../data/seoServices";

const BASE_URL = "https://fatorz-hub.vercel.app";

type BasicSeo = {
  path: string;
  title: string;
  description: string;
  keywords: string[];
};

const staticSeoPages: BasicSeo[] = [
  {
    path: "/",
    title: "FatorZ | Agência de Marketing Digital, Conteúdo e Presença Online",
    description:
      "A FatorZ é uma agência de marketing digital focada em conteúdo estratégico, posicionamento, landing pages, identidade visual e presença online para marcas e pequenos negócios.",
    keywords: [
      "FatorZ",
      "agência de marketing digital",
      "marketing digital em Pelotas",
      "conteúdo para Instagram",
      "landing page",
      "identidade visual",
      "gestão de Instagram",
    ],
  },
  {
    path: "/servicos",
    title: "Serviços de Marketing Digital | FatorZ",
    description:
      "Conheça os serviços da FatorZ: gestão de Instagram, criação de artes, edição de reels, landing pages, identidade visual, posicionamento e presença online.",
    keywords: [
      "serviços de marketing digital",
      "gestão de Instagram",
      "edição de reels",
      "criação de artes para Instagram",
      "landing page",
      "identidade visual",
    ],
  },
  {
    path: "/blog",
    title: "Blog de Marketing Digital | FatorZ",
    description:
      "Conteúdos sobre marketing digital, Instagram comercial, landing pages, identidade visual, posicionamento e presença online para pequenos negócios.",
    keywords: [
      "blog de marketing digital",
      "marketing digital",
      "Instagram comercial",
      "landing page",
      "identidade visual",
      "presença online",
    ],
  },
];

const blogSeoPages: BasicSeo[] = [
  {
    path: "/blog/quanto-custa-uma-landing-page",
    title: "Quanto custa uma landing page? | FatorZ",
    description:
      "Entenda quanto custa uma landing page, o que influencia no valor e por que uma página profissional pode melhorar a apresentação da sua oferta.",
    keywords: ["quanto custa landing page", "landing page", "página de vendas"],
  },
  {
    path: "/blog/o-que-e-uma-agencia-de-marketing-digital",
    title: "O que é uma agência de marketing digital? | FatorZ",
    description:
      "Entenda o que faz uma agência de marketing digital e como ela pode ajudar marcas e pequenos negócios a organizarem sua presença online.",
    keywords: ["agência de marketing digital", "marketing digital", "presença online"],
  },
  {
    path: "/blog/vale-a-pena-editar-reels",
    title: "Vale a pena editar reels profissionalmente? | FatorZ",
    description:
      "Veja por que a edição de reels pode melhorar a percepção do seu conteúdo, deixar seus vídeos mais claros e fortalecer sua presença no Instagram.",
    keywords: ["edição de reels", "reels profissional", "vídeos para Instagram"],
  },
  {
    path: "/blog/como-organizar-instagram-comercial",
    title: "Como organizar um Instagram comercial | FatorZ",
    description:
      "Aprenda como organizar bio, destaques, conteúdo e posicionamento para deixar seu Instagram comercial mais claro e profissional.",
    keywords: ["Instagram comercial", "organizar Instagram", "bio profissional"],
  },
  {
    path: "/blog/identidade-visual-para-instagram",
    title: "Identidade visual para Instagram | FatorZ",
    description:
      "Entenda como uma identidade visual bem aplicada pode melhorar a percepção da sua marca e deixar seu perfil mais profissional.",
    keywords: ["identidade visual para Instagram", "branding", "perfil profissional"],
  },
  {
    path: "/blog/criacao-de-artes-para-instagram",
    title: "Criação de artes para Instagram | FatorZ",
    description:
      "Veja como artes profissionais para Instagram ajudam sua marca a comunicar melhor, vender com mais clareza e transmitir confiança.",
    keywords: ["criação de artes para Instagram", "design para Instagram", "posts"],
  },
  {
    path: "/blog/marketing-para-barbeiros",
    title: "Marketing para barbeiros | FatorZ",
    description:
      "Estratégias de marketing para barbeiros e barbearias melhorarem Instagram, agenda, apresentação dos serviços e presença digital.",
    keywords: ["marketing para barbeiros", "marketing para barbearia", "Instagram para barbeiro"],
  },
  {
    path: "/blog/site-para-pequenos-negocios",
    title: "Site para pequenos negócios | FatorZ",
    description:
      "Entenda por que pequenos negócios precisam de uma presença online profissional e como um site pode melhorar confiança e conversão.",
    keywords: ["site para pequenos negócios", "site profissional", "presença online"],
  },
  {
    path: "/blog/diagnostico-de-instagram",
    title: "Diagnóstico de Instagram | FatorZ",
    description:
      "Veja como um diagnóstico de Instagram ajuda a identificar problemas na bio, destaques, conteúdo, posicionamento e clareza da oferta.",
    keywords: ["diagnóstico de Instagram", "análise de perfil", "Instagram comercial"],
  },
  {
    path: "/blog/plano-basic-marketing-digital",
    title: "Plano Basic de Marketing Digital | FatorZ",
    description:
      "Conheça o Plano Basic da FatorZ para marcas que querem começar a organizar sua presença digital com conteúdo e SEO.",
    keywords: ["plano basic marketing digital", "marketing digital básico", "FatorZ"],
  },
  {
    path: "/blog/plano-plus-marketing-digital",
    title: "Plano Plus de Marketing Digital | FatorZ",
    description:
      "Conheça o Plano Plus da FatorZ para marcas que precisam de mais consistência, conteúdo estratégico e presença digital organizada.",
    keywords: ["plano plus marketing digital", "marketing digital", "gestão de Instagram"],
  },
  {
    path: "/blog/plano-pro-marketing-digital",
    title: "Plano Pro de Marketing Digital | FatorZ",
    description:
      "Conheça o Plano Pro da FatorZ para marcas que precisam de uma presença digital mais completa, estratégica e profissional.",
    keywords: ["plano pro marketing digital", "assessoria de marketing", "FatorZ"],
  },
];

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function getCanonicalUrl(path: string) {
  if (path === "/") return BASE_URL;
  return `${BASE_URL}${path}`;
}

function setMetaName(name: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setMetaProperty(property: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`
  );

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setCanonical(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

function setJsonLd(data: object) {
  const oldScript = document.getElementById("fatorz-json-ld");

  if (oldScript) {
    oldScript.remove();
  }

  const script = document.createElement("script");
  script.id = "fatorz-json-ld";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function getCurrentSeo(pathname: string) {
  const path = normalizePath(pathname);

  const service = seoServices.find((item) => normalizePath(item.path) === path);

  if (service) {
    return {
      type: "service" as const,
      path: service.path,
      title: service.metaTitle,
      description: service.metaDescription,
      keywords: service.keywords,
      service,
    };
  }

  const staticPage = [...staticSeoPages, ...blogSeoPages].find(
    (item) => normalizePath(item.path) === path
  );

  if (staticPage) {
    return {
      type: "page" as const,
      path: staticPage.path,
      title: staticPage.title,
      description: staticPage.description,
      keywords: staticPage.keywords,
      service: null,
    };
  }

  return {
    type: "page" as const,
    path: "/",
    title: "FatorZ | Agência de Marketing Digital, Conteúdo e Presença Online",
    description:
      "A FatorZ é uma agência de marketing digital focada em conteúdo estratégico, posicionamento, landing pages, identidade visual e presença online para marcas e pequenos negócios.",
    keywords: [
      "FatorZ",
      "agência de marketing digital",
      "marketing digital",
      "presença online",
    ],
    service: null,
  };
}

export function SEO() {
  const location = useLocation();

  useEffect(() => {
    const seo = getCurrentSeo(location.pathname);
    const canonicalUrl = getCanonicalUrl(normalizePath(seo.path));
    const imageUrl = `${BASE_URL}/og-image.png`;

    document.documentElement.lang = "pt-BR";
    document.title = seo.title;

    setMetaName("description", seo.description);
    setMetaName("keywords", seo.keywords.join(", "));
    setMetaName("author", "FatorZ");
    setMetaName("robots", "index, follow");
    setMetaName("theme-color", "#050509");

    setCanonical(canonicalUrl);

    setMetaProperty("og:type", "website");
    setMetaProperty("og:site_name", "FatorZ");
    setMetaProperty("og:title", seo.title);
    setMetaProperty("og:description", seo.description);
    setMetaProperty("og:url", canonicalUrl);
    setMetaProperty("og:image", imageUrl);
    setMetaProperty("og:locale", "pt_BR");

    setMetaName("twitter:card", "summary_large_image");
    setMetaName("twitter:title", seo.title);
    setMetaName("twitter:description", seo.description);
    setMetaName("twitter:image", imageUrl);

    if (seo.type === "service" && seo.service) {
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "Service",
        name: seo.service.title,
        description: seo.service.metaDescription,
        url: canonicalUrl,
        provider: {
          "@type": "Organization",
          name: "FatorZ",
          url: BASE_URL,
        },
        areaServed: {
          "@type": "Country",
          name: "Brasil",
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Serviços FatorZ",
          itemListElement: seo.service.deliverables.map((item, index) => ({
            "@type": "Offer",
            position: index + 1,
            itemOffered: {
              "@type": "Service",
              name: item,
            },
          })),
        },
        mainEntity: seo.service.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      });
    } else {
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "FatorZ",
        url: BASE_URL,
        description: seo.description,
        logo: `${BASE_URL}/fatorz-favicon.svg`,
        sameAs: ["https://www.instagram.com/fatorzhouse"],
      });
    }
  }, [location.pathname]);

  return null;
}