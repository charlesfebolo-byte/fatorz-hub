export type SeoService = {
  slug: string;
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  keywords: string[];
  problems: string[];
  deliverables: string[];
  benefits: string[];
  faq: {
    question: string;
    answer: string;
  }[];
  ctaTitle: string;
  ctaText: string;
};

export const seoServices: SeoService[] = [
  {
    slug: "agencia-de-marketing-digital",
    path: "/servicos/agencia-de-marketing-digital",
    title: "Agência de Marketing Digital",
    metaTitle:
      "Agência de Marketing Digital | FatorZ - Conteúdo, Estratégia e Presença Online",
    metaDescription:
      "A FatorZ é uma agência de marketing digital para marcas que precisam organizar presença online, conteúdo, Instagram, landing pages e posicionamento.",
    eyebrow: "Marketing Digital",
    h1: "Agência de marketing digital para marcas que querem ser levadas a sério.",
    intro:
      "A FatorZ ajuda marcas, profissionais e pequenos negócios a saírem do improviso no digital. Organizamos presença online, conteúdo, posicionamento, estética, landing pages e estrutura para transformar percepção em valor.",
    keywords: [
      "agência de marketing digital",
      "agência de marketing",
      "marketing digital para empresas",
      "presença digital",
      "estratégia de conteúdo",
      "marketing para pequenos negócios",
    ],
    problems: [
      "Perfil bonito, mas sem estratégia.",
      "Postagens sem direção e sem consistência.",
      "Marca com aparência amadora no Instagram.",
      "Dificuldade para transformar visitas em clientes.",
      "Falta de uma estrutura clara para vender online.",
    ],
    deliverables: [
      "Diagnóstico da presença digital.",
      "Direção estratégica para conteúdo e posicionamento.",
      "Criação de artes, páginas e materiais digitais.",
      "Organização de ofertas e comunicação.",
      "Acompanhamento conforme o plano contratado.",
    ],
    benefits: [
      "Mais clareza sobre o que sua marca comunica.",
      "Perfil mais profissional e confiável.",
      "Conteúdo com função, não só postagem solta.",
      "Melhor percepção de valor.",
      "Estrutura digital mais preparada para vender.",
    ],
    faq: [
      {
        question: "A FatorZ atende apenas empresas grandes?",
        answer:
          "Não. A FatorZ foi pensada principalmente para pequenos negócios, profissionais autônomos e marcas que precisam parecer mais profissionais no digital.",
      },
      {
        question: "Marketing digital é só postar no Instagram?",
        answer:
          "Não. Postar é apenas uma parte. Marketing digital envolve posicionamento, clareza, oferta, visual, conteúdo, página, atendimento e direção.",
      },
      {
        question: "A FatorZ também faz landing pages?",
        answer:
          "Sim. A FatorZ trabalha com landing pages, páginas de venda, páginas de apresentação e estruturas digitais para negócios.",
      },
    ],
    ctaTitle: "Quer organizar a presença digital da sua marca?",
    ctaText:
      "Chame a FatorZ e veja qual solução combina melhor com o momento do seu negócio.",
  },
  {
    slug: "edicao-de-reels",
    path: "/servicos/edicao-de-reels",
    title: "Edição de Reels",
    metaTitle:
      "Edição de Reels Profissional | FatorZ - Vídeos para Instagram",
    metaDescription:
      "Edição de reels para empresas, profissionais e marcas que querem vídeos mais profissionais, dinâmicos e prontos para Instagram.",
    eyebrow: "Conteúdo em vídeo",
    h1: "Edição de reels para deixar seu conteúdo com cara profissional.",
    intro:
      "A FatorZ transforma vídeos simples em reels com mais ritmo, clareza visual, legenda, cortes e acabamento para Instagram. Ideal para marcas que querem aparecer melhor sem parecer improvisadas.",
    keywords: [
      "edição de reels",
      "editor de reels profissional",
      "edição de vídeos para Instagram",
      "reels para empresas",
      "vídeos curtos para Instagram",
    ],
    problems: [
      "Vídeos crus e sem ritmo.",
      "Conteúdo bom, mas com aparência amadora.",
      "Falta de legenda, cortes e acabamento.",
      "Dificuldade para transformar gravações em reels postáveis.",
      "Perfil com vídeos desalinhados visualmente.",
    ],
    deliverables: [
      "Cortes e ajuste de ritmo.",
      "Legendas dinâmicas.",
      "Elementos visuais conforme a identidade da marca.",
      "Ajuste para formato vertical.",
      "Arquivo final pronto para postar.",
    ],
    benefits: [
      "Conteúdo mais profissional.",
      "Mais clareza na mensagem.",
      "Melhor retenção nos primeiros segundos.",
      "Perfil visualmente mais organizado.",
      "Economia de tempo na produção.",
    ],
    faq: [
      {
        question: "A FatorZ cria o roteiro do reels também?",
        answer:
          "Pode criar, dependendo do produto contratado. A edição pode ser apenas sobre material enviado ou incluir direção de conteúdo.",
      },
      {
        question: "Preciso gravar com câmera profissional?",
        answer:
          "Não. Um bom vídeo de celular, com iluminação razoável e áudio compreensível, já pode virar um reels profissional.",
      },
      {
        question: "A edição é para Instagram?",
        answer:
          "Sim. O foco principal é reels e conteúdo vertical para Instagram, podendo ser reaproveitado em outras redes.",
      },
    ],
    ctaTitle: "Tem vídeos parados no celular?",
    ctaText:
      "A FatorZ pode transformar esse material em reels prontos para postar.",
  },
  {
    slug: "criacao-de-artes-para-instagram",
    path: "/servicos/criacao-de-artes-para-instagram",
    title: "Criação de Artes para Instagram",
    metaTitle:
      "Criação de Artes para Instagram | FatorZ - Design para Redes Sociais",
    metaDescription:
      "Criação de artes para Instagram com visual profissional, identidade, clareza e foco em posicionamento digital.",
    eyebrow: "Design para Instagram",
    h1: "Artes para Instagram que deixam sua marca mais organizada.",
    intro:
      "A FatorZ cria artes para feed, stories, destaques, posts comerciais e materiais visuais para marcas que precisam melhorar a percepção no Instagram.",
    keywords: [
      "criação de artes para Instagram",
      "design para Instagram",
      "posts para Instagram",
      "artes para redes sociais",
      "feed profissional",
    ],
    problems: [
      "Feed bagunçado e sem padrão.",
      "Artes que parecem amadoras.",
      "Falta de identidade visual.",
      "Posts sem clareza.",
      "Dificuldade para transmitir confiança.",
    ],
    deliverables: [
      "Artes para feed.",
      "Artes para stories.",
      "Capas de destaques.",
      "Posts promocionais.",
      "Criativos alinhados à identidade da marca.",
    ],
    benefits: [
      "Perfil mais bonito e confiável.",
      "Comunicação visual mais clara.",
      "Mais profissionalismo na primeira impressão.",
      "Organização estética do Instagram.",
      "Melhor percepção da marca.",
    ],
    faq: [
      {
        question: "As artes seguem a identidade da minha marca?",
        answer:
          "Sim. A FatorZ pode seguir a identidade existente ou ajudar a criar uma direção visual mais organizada.",
      },
      {
        question: "Vocês fazem carrossel?",
        answer:
          "Sim. A FatorZ pode criar posts únicos, carrosséis, stories e destaques.",
      },
      {
        question: "As artes já vêm prontas para postar?",
        answer:
          "Sim. A entrega é feita em formato adequado para uso no Instagram.",
      },
    ],
    ctaTitle: "Seu perfil precisa parecer mais profissional?",
    ctaText:
      "Chame a FatorZ para criar artes alinhadas ao posicionamento da sua marca.",
  },
  {
    slug: "landing-page",
    path: "/servicos/landing-page",
    title: "Landing Page",
    metaTitle:
      "Landing Page Profissional | FatorZ - Página para Vender e Captar Clientes",
    metaDescription:
      "Criação de landing pages profissionais para apresentar serviços, captar contatos, vender produtos e fortalecer a presença digital da sua marca.",
    eyebrow: "Sites e páginas",
    h1: "Landing page profissional para transformar visitas em ação.",
    intro:
      "A FatorZ cria landing pages para marcas, profissionais e negócios que precisam apresentar uma oferta com clareza, visual premium e chamada para ação.",
    keywords: [
      "landing page",
      "criação de landing page",
      "página de venda",
      "site para empresa",
      "landing page profissional",
    ],
    problems: [
      "Cliente chega, mas não entende sua oferta.",
      "Você depende só do direct para explicar tudo.",
      "Falta uma página profissional para apresentar o serviço.",
      "O negócio não tem um link forte para campanhas.",
      "A marca parece menos profissional por não ter estrutura.",
    ],
    deliverables: [
      "Página de apresentação.",
      "Seções de benefício, oferta e chamada para ação.",
      "Visual alinhado à marca.",
      "Botões para contato ou checkout.",
      "Publicação online conforme projeto contratado.",
    ],
    benefits: [
      "Mais clareza para quem chega.",
      "Mais confiança na apresentação da oferta.",
      "Link profissional para bio e campanhas.",
      "Melhor percepção de valor.",
      "Estrutura pronta para conversão.",
    ],
    faq: [
      {
        question: "Landing page é a mesma coisa que site completo?",
        answer:
          "Não. Landing page é uma página focada em uma oferta, serviço ou objetivo específico. Site completo pode ter várias páginas.",
      },
      {
        question: "Posso usar a landing page no link da bio?",
        answer:
          "Sim. Esse é um dos usos mais fortes: colocar a página como destino principal para quem chega pelo Instagram.",
      },
      {
        question: "A landing page pode ter botão de pagamento?",
        answer:
          "Sim. Ela pode apontar para checkout, WhatsApp, Instagram, formulário ou outro canal de conversão.",
      },
    ],
    ctaTitle: "Sua oferta precisa de uma página profissional?",
    ctaText:
      "A FatorZ cria landing pages para apresentar seu serviço com mais clareza e impacto.",
  },
  {
    slug: "identidade-visual",
    path: "/servicos/identidade-visual",
    title: "Identidade Visual",
    metaTitle:
      "Identidade Visual para Marcas | FatorZ - Presença Profissional",
    metaDescription:
      "Identidade visual para marcas que querem parecer mais profissionais, organizadas e memoráveis no digital.",
    eyebrow: "Identidade e percepção",
    h1: "Identidade visual para sua marca parar de parecer improvisada.",
    intro:
      "A FatorZ ajuda marcas a criarem uma direção visual mais clara, profissional e coerente para Instagram, materiais digitais, páginas e comunicação.",
    keywords: [
      "identidade visual",
      "identidade visual para Instagram",
      "criação de marca",
      "visual profissional",
      "branding para pequenos negócios",
    ],
    problems: [
      "Marca sem padrão visual.",
      "Cores, fontes e posts sem unidade.",
      "Perfil que não transmite confiança.",
      "Comunicação visual confusa.",
      "Dificuldade para ser lembrado.",
    ],
    deliverables: [
      "Direção visual.",
      "Paleta de cores.",
      "Estilo de posts e materiais.",
      "Elementos visuais de apoio.",
      "Aplicações para presença digital.",
    ],
    benefits: [
      "Marca mais profissional.",
      "Mais consistência visual.",
      "Melhor lembrança da marca.",
      "Perfil mais confiável.",
      "Comunicação mais forte.",
    ],
    faq: [
      {
        question: "Identidade visual é só logo?",
        answer:
          "Não. Logo é apenas uma parte. Identidade visual envolve cores, fontes, estilo, composição e percepção.",
      },
      {
        question: "Serve para quem já tem logo?",
        answer:
          "Sim. Mesmo com logo, a marca pode precisar de uma direção visual melhor para aplicar no digital.",
      },
      {
        question: "A FatorZ cria posts com essa identidade?",
        answer:
          "Sim. A identidade pode ser usada em posts, stories, landing pages e materiais digitais.",
      },
    ],
    ctaTitle: "Sua marca precisa de uma cara mais forte?",
    ctaText:
      "Chame a FatorZ para organizar a identidade visual da sua presença digital.",
  },
  {
    slug: "gestao-de-instagram",
    path: "/servicos/gestao-de-instagram",
    title: "Gestão de Instagram",
    metaTitle:
      "Gestão de Instagram | FatorZ - Conteúdo, Perfil e Presença Digital",
    metaDescription:
      "Gestão e organização de Instagram para marcas que precisam de conteúdo, posicionamento, calendário e presença digital mais profissional.",
    eyebrow: "Instagram estratégico",
    h1: "Gestão de Instagram para transformar postagem em presença digital.",
    intro:
      "A FatorZ organiza o Instagram da sua marca com direção de conteúdo, estética, comunicação e estratégia para deixar o perfil mais claro e profissional.",
    keywords: [
      "gestão de Instagram",
      "gestor de Instagram",
      "conteúdo para Instagram",
      "organização de perfil comercial",
      "marketing no Instagram",
    ],
    problems: [
      "Postar sem saber o objetivo.",
      "Perfil sem clareza na bio e nos destaques.",
      "Falta de calendário de conteúdo.",
      "Conteúdo que não gera percepção de valor.",
      "Dificuldade para manter consistência.",
    ],
    deliverables: [
      "Direção de conteúdo.",
      "Organização do perfil.",
      "Sugestões de posts, stories e reels.",
      "Calendário conforme o plano contratado.",
      "Ajustes de comunicação e posicionamento.",
    ],
    benefits: [
      "Mais consistência no Instagram.",
      "Perfil mais claro para novos visitantes.",
      "Conteúdo com função.",
      "Melhor percepção da marca.",
      "Menos improviso na comunicação.",
    ],
    faq: [
      {
        question: "Gestão de Instagram garante seguidores?",
        answer:
          "Não existe garantia séria de seguidores. O foco é melhorar presença, clareza, consistência e percepção para aumentar as chances de crescimento real.",
      },
      {
        question: "A FatorZ cria tudo por mim?",
        answer:
          "Depende do plano. A FatorZ pode atuar com direção, criação, organização e materiais conforme a contratação.",
      },
      {
        question: "Serve para perfil novo?",
        answer:
          "Sim. Perfil novo precisa ainda mais de base, posicionamento e consistência.",
      },
    ],
    ctaTitle: "Seu Instagram precisa de direção?",
    ctaText:
      "Chame a FatorZ para organizar seu perfil e transformar conteúdo em presença.",
  },
  {
    slug: "marketing-para-barbeiros",
    path: "/servicos/marketing-para-barbeiros",
    title: "Marketing para Barbeiros",
    metaTitle:
      "Marketing para Barbeiros | FatorZ - Instagram, Artes e Presença Digital",
    metaDescription:
      "Marketing para barbeiros e barbearias com foco em Instagram, artes, reels, agenda, landing page e presença digital profissional.",
    eyebrow: "Marketing por nicho",
    h1: "Marketing para barbeiros que querem agenda mais profissional.",
    intro:
      "A FatorZ ajuda barbeiros e barbearias a criarem uma presença digital mais organizada, com artes, conteúdo, página, agenda e comunicação visual mais forte.",
    keywords: [
      "marketing para barbeiros",
      "marketing para barbearia",
      "site para barbeiro",
      "artes para barbearia",
      "Instagram para barbeiro",
    ],
    problems: [
      "Perfil sem organização visual.",
      "Fotos boas, mas sem estratégia.",
      "Cliente não entende serviços e valores.",
      "Falta de link claro para agendamento.",
      "Barbearia com aparência digital inferior ao serviço real.",
    ],
    deliverables: [
      "Artes para Instagram.",
      "Destaques e organização do perfil.",
      "Landing page ou página de agendamento.",
      "Conteúdo para divulgar serviços.",
      "Direção visual para barbeiros e barbearias.",
    ],
    benefits: [
      "Perfil mais profissional.",
      "Mais clareza para o cliente agendar.",
      "Serviços melhor apresentados.",
      "Visual alinhado ao estilo da barbearia.",
      "Mais confiança na primeira impressão.",
    ],
    faq: [
      {
        question: "A FatorZ faz site para barbeiro?",
        answer:
          "Sim. A FatorZ pode criar landing page, página de apresentação ou estrutura com link de agendamento.",
      },
      {
        question: "Também cria artes de serviços?",
        answer:
          "Sim. Artes para corte, barba, freestyle, promoções, horários e divulgação fazem parte das possibilidades.",
      },
      {
        question: "Serve para barbeiro autônomo?",
        answer:
          "Sim. Serve para barbeiros autônomos, barbearias pequenas e negócios locais.",
      },
    ],
    ctaTitle: "Quer deixar sua barbearia mais forte no digital?",
    ctaText:
      "Chame a FatorZ e organize seu Instagram, agenda e presença online.",
  },
  {
    slug: "agencia-de-marketing-em-pelotas",
    path: "/agencia-de-marketing-em-pelotas",
    title: "Agência de Marketing em Pelotas",
    metaTitle:
      "Agência de Marketing em Pelotas | FatorZ - Marketing Digital no RS",
    metaDescription:
      "Agência de marketing em Pelotas para empresas, profissionais e pequenos negócios que precisam de presença digital, Instagram, sites e conteúdo.",
    eyebrow: "Marketing em Pelotas",
    h1: "Agência de marketing em Pelotas para negócios que querem presença digital.",
    intro:
      "A FatorZ atende marcas, profissionais e pequenos negócios em Pelotas e no Brasil com soluções de marketing digital, Instagram, landing pages, identidade visual e conteúdo.",
    keywords: [
      "agência de marketing em Pelotas",
      "marketing digital em Pelotas",
      "criação de site em Pelotas",
      "gestão de Instagram em Pelotas",
      "edição de reels em Pelotas",
    ],
    problems: [
      "Negócio local sem presença digital clara.",
      "Instagram pouco profissional.",
      "Falta de página para apresentar serviços.",
      "Pouca clareza na comunicação online.",
      "Dificuldade para parecer confiável no digital.",
    ],
    deliverables: [
      "Marketing digital para negócios locais.",
      "Artes e conteúdo para Instagram.",
      "Landing pages e páginas profissionais.",
      "Organização de perfil comercial.",
      "Direção de presença digital.",
    ],
    benefits: [
      "Mais profissionalismo online.",
      "Comunicação mais clara para clientes locais.",
      "Página e perfil mais preparados para receber visitantes.",
      "Melhor percepção da marca.",
      "Estrutura para divulgar serviços com mais confiança.",
    ],
    faq: [
      {
        question: "A FatorZ atende só Pelotas?",
        answer:
          "Não. A FatorZ tem base em Pelotas, mas atende marcas de outras cidades também.",
      },
      {
        question: "Negócio local precisa de marketing digital?",
        answer:
          "Sim. Hoje muitos clientes conferem Instagram, site, avaliações e aparência digital antes de chamar ou comprar.",
      },
      {
        question: "A FatorZ atende pequenos negócios?",
        answer:
          "Sim. A FatorZ foi criada pensando em marcas e negócios que precisam se organizar no digital sem parecer amadores.",
      },
    ],
    ctaTitle: "Seu negócio em Pelotas precisa aparecer melhor?",
    ctaText:
      "Chame a FatorZ e veja como organizar sua presença digital com mais clareza.",
  },
];

export function getSeoServiceBySlug(slug: string | undefined) {
  return seoServices.find((service) => service.slug === slug) || null;
}