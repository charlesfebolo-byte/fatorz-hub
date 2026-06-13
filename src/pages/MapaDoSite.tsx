import { Link } from "react-router-dom";

const serviceLinks = [
  {
    title: "Serviços FatorZ",
    url: "/servicos",
    text: "Central de serviços online, marketing digital, Instagram, sites, landing pages e soluções digitais.",
  },
  {
    title: "Agência de Marketing Digital",
    url: "/servicos/agencia-de-marketing-digital",
    text: "Estratégia, conteúdo, presença digital e posicionamento para marcas e pequenos negócios.",
  },
  {
    title: "Gestão de Instagram",
    url: "/servicos/gestao-de-instagram",
    text: "Organização de Instagram comercial, conteúdo, bio, destaques, posts e presença digital.",
  },
  {
    title: "Edição de Reels",
    url: "/servicos/edicao-de-reels",
    text: "Edição de vídeos curtos, reels para Instagram, cortes, legendas e acabamento profissional.",
  },
  {
    title: "Criação de Artes para Instagram",
    url: "/servicos/criacao-de-artes-para-instagram",
    text: "Artes para feed, stories, carrosséis, criativos comerciais e materiais visuais.",
  },
  {
    title: "Landing Page",
    url: "/servicos/landing-page",
    text: "Criação de landing pages, páginas de venda, páginas de apresentação e estruturas de conversão.",
  },
  {
    title: "Identidade Visual",
    url: "/servicos/identidade-visual",
    text: "Identidade visual, branding, posicionamento visual e percepção profissional da marca.",
  },
  {
    title: "Marketing para Barbeiros",
    url: "/servicos/marketing-para-barbeiros",
    text: "Marketing para barbeiros e barbearias, Instagram, sites, artes e páginas de agendamento.",
  },
  {
    title: "Agência de Marketing em Pelotas",
    url: "/agencia-de-marketing-em-pelotas",
    text: "Marketing digital em Pelotas para negócios locais, prestadores de serviço, lojas e profissionais.",
  },
];

const blogLinks = [
  {
    title: "Blog FatorZ",
    url: "/blog",
    text: "Conteúdos sobre marketing digital, Instagram, sites, landing pages e presença online.",
  },
  {
    title: "O que é uma agência de marketing digital?",
    url: "/blog/o-que-e-uma-agencia-de-marketing-digital",
    text: "Como uma agência ajuda marcas a organizarem presença online, conteúdo e vendas.",
  },
  {
    title: "Quanto custa uma landing page?",
    url: "/blog/quanto-custa-uma-landing-page",
    text: "O que influencia no preço de uma landing page profissional.",
  },
  {
    title: "Vale a pena editar reels?",
    url: "/blog/vale-a-pena-editar-reels",
    text: "Como a edição de reels melhora a percepção do conteúdo.",
  },
  {
    title: "Como organizar Instagram comercial",
    url: "/blog/como-organizar-instagram-comercial",
    text: "Bio, destaques, conteúdo, identidade visual e CTA para perfil comercial.",
  },
  {
    title: "Identidade visual para Instagram",
    url: "/blog/identidade-visual-para-instagram",
    text: "Por que identidade visual ajuda sua marca a parecer mais profissional.",
  },
  {
    title: "Criação de artes para Instagram",
    url: "/blog/criacao-de-artes-para-instagram",
    text: "Como artes profissionais ajudam na comunicação e percepção da marca.",
  },
  {
    title: "Marketing para barbeiros",
    url: "/blog/marketing-para-barbeiros",
    text: "Estratégias digitais para barbeiros e barbearias.",
  },
  {
    title: "Site para pequenos negócios",
    url: "/blog/site-para-pequenos-negocios",
    text: "Por que pequenos negócios precisam de presença online profissional.",
  },
  {
    title: "Diagnóstico de Instagram",
    url: "/blog/diagnostico-de-instagram",
    text: "Como identificar gargalos em bio, conteúdo, destaques e posicionamento.",
  },
  {
    title: "Plano Basic de Marketing Digital",
    url: "/blog/plano-basic-marketing-digital",
    text: "Plano de entrada para organizar presença digital com clareza.",
  },
  {
    title: "Plano Plus de Marketing Digital",
    url: "/blog/plano-plus-marketing-digital",
    text: "Plano para marcas que precisam de consistência e conteúdo estratégico.",
  },
  {
    title: "Plano Pro de Marketing Digital",
    url: "/blog/plano-pro-marketing-digital",
    text: "Plano para presença digital mais completa e profissional.",
  },
];

function LinkCard({
  title,
  url,
  text,
}: {
  title: string;
  url: string;
  text: string;
}) {
  return (
    <Link
      to={url}
      className="block rounded-[28px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-pink-500/40 hover:bg-pink-500/[0.06]"
    >
      <h2 className="text-xl font-black text-white">{title}</h2>

      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{text}</p>

      <span className="mt-4 inline-block text-sm font-black text-pink-300">
        Acessar página →
      </span>
    </Link>
  );
}

export default function MapaDoSite() {
  return (
    <main className="fz-grid-bg min-h-screen overflow-x-hidden bg-[#050506] text-white">
      <div className="fz-space-orbs" aria-hidden="true" />

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <Link
          to="/"
          className="mb-8 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          ← Voltar para o início
        </Link>

        <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
          Mapa do site FatorZ
        </p>

        <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
          Todas as páginas importantes da FatorZ em um só lugar.
        </h1>

        <p className="mt-6 max-w-3xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Encontre serviços online, marketing digital, criação de sites,
          landing pages, gestão de Instagram, edição de reels, identidade
          visual, conteúdo estratégico e materiais para marcas que querem
          melhorar sua presença digital.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="mb-7 rounded-[32px] border border-white/10 bg-white/[0.035] p-6">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-pink-400">
            Serviços e soluções
          </p>

          <h2 className="text-3xl font-black md:text-5xl">
            Páginas comerciais
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {serviceLinks.map((item) => (
            <LinkCard key={item.url} {...item} />
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="mb-7 rounded-[32px] border border-white/10 bg-white/[0.035] p-6">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-blue-300">
            Conteúdos de apoio
          </p>

          <h2 className="text-3xl font-black md:text-5xl">
            Blog e páginas informativas
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {blogLinks.map((item) => (
            <LinkCard key={item.url} {...item} />
          ))}
        </div>
      </section>
    </main>
  );
}
