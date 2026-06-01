export type Product = {
  id: string;
  category: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  paymentLink: string;
  highlight?: boolean;
  monthly?: boolean;
};

const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

export const products: Product[] = [
  // =====================================================
  // ASSESSORIA MENSAL
  // =====================================================
  {
    id: "plano-basico",
    category: "Assessoria Mensal",
    name: "Plano Básico",
    price: "R$ 97/mês",
    description:
      "Plano de entrada para negócios que querem começar a organizar a presença digital com mais clareza, direção e constância.",
    features: [
      "Organização básica da presença digital",
      "Direção inicial de conteúdo",
      "Sugestões simples de melhoria",
      "Apoio para manter o perfil ativo",
      "Ideal para quem está começando",
    ],
    paymentLink: "https://mpago.la/2ZVjf71",
    monthly: true,
  },
  {
    id: "plano-plus",
    category: "Assessoria Mensal",
    name: "Plano Plus",
    price: "R$ 297/mês",
    description:
      "Para marcas que querem sair do improviso e manter um Instagram mais estratégico, organizado e preparado para atrair clientes.",
    features: [
      "Direção mensal de conteúdo",
      "Ajustes de presença digital",
      "Sugestões de posts e stories",
      "Acompanhamento básico",
      "Mais clareza para comunicar valor",
    ],
    paymentLink: "https://mpago.la/1oRiw7k",
    monthly: true,
  },
  {
    id: "plano-pro",
    category: "Assessoria Mensal",
    name: "Plano Pro",
    price: "R$ 497/mês",
    description:
      "Plano para marcas que precisam de consistência, conteúdo com intenção e uma presença mais profissional no Instagram.",
    features: [
      "Estratégia mensal de conteúdo",
      "Organização visual do perfil",
      "Direção de comunicação",
      "Acompanhamento de posicionamento",
      "Suporte para melhorar a presença digital",
    ],
    paymentLink: "https://mpago.la/2AhRi8V",
    monthly: true,
  },
  {
    id: "plano-start",
    category: "Assessoria Mensal",
    name: "Plano Start",
    price: "R$ 997/mês",
    description:
      "Para negócios que querem estruturar presença digital com mais força, planejamento e uma comunicação mais clara para vender.",
    features: [
      "Planejamento estratégico mensal",
      "Direção de conteúdo",
      "Ajustes de posicionamento",
      "Organização do perfil",
      "Suporte para tomada de decisão digital",
    ],
    paymentLink: "https://mpago.la/1vTvPoh",
    monthly: true,
    highlight: true,
  },
  {
    id: "plano-grow",
    category: "Assessoria Mensal",
    name: "Plano Grow",
    price: "R$ 1.497/mês",
    description:
      "Plano para marcas que querem crescer com mais consistência, melhorar percepção de valor e transformar conteúdo em estratégia.",
    features: [
      "Estratégia de crescimento orgânico",
      "Calendário de conteúdo com direção",
      "Análise de presença digital",
      "Acompanhamento mais próximo",
      "Direção para campanhas e ofertas",
    ],
    paymentLink: "https://mpago.la/1uVLL2o",
    monthly: true,
  },
  {
    id: "plano-dominante",
    category: "Assessoria Mensal",
    name: "Plano Dominante",
    price: "R$ 2.497/mês",
    description:
      "Plano premium para marcas que querem presença forte, posicionamento mais agressivo e acompanhamento estratégico completo.",
    features: [
      "Estratégia premium de presença digital",
      "Direção criativa da marca",
      "Acompanhamento prioritário",
      "Planejamento de conteúdo e ofertas",
      "Foco em posicionamento, confiança e conversão",
    ],
    paymentLink: "https://mpago.la/1j3XXjz",
    monthly: true,
    highlight: true,
  },

  // =====================================================
  // SERVIÇOS ÚNICOS
  // =====================================================
  {
    id: "edicao-reels",
    category: "Serviços Únicos",
    name: "Edição de Reels",
    price: "R$ 197",
    description:
      "Edição de vídeo curto com ritmo, texto na tela e acabamento profissional para melhorar a percepção do seu conteúdo.",
    features: [
      "Edição de vídeo curto",
      "Texto na tela",
      "Cortes dinâmicos",
      "Formato para Instagram",
      "Entrega única",
    ],
    paymentLink: "https://mpago.la/2n8Do7V",
    monthly: false,
  },
  {
    id: "arte-feed",
    category: "Serviços Únicos",
    name: "Arte para Feed",
    price: "R$ 120",
    description:
      "Arte profissional para feed, criada para comunicar melhor sua mensagem e deixar sua marca mais organizada visualmente.",
    features: [
      "Arte estática para Instagram",
      "Visual profissional",
      "Formato feed",
      "Alinhamento com a identidade da marca",
      "Entrega única",
    ],
    paymentLink: "https://mpago.la/1E297Qs",
    monthly: false,
  },
  {
    id: "carrossel-estrategico",
    category: "Serviços Únicos",
    name: "Carrossel Estratégico",
    price: "R$ 197",
    description:
      "Carrossel pensado para prender atenção, entregar valor e conduzir o público até uma ação clara.",
    features: [
      "Estrutura de carrossel",
      "Design profissional",
      "Texto com direção",
      "CTA final",
      "Entrega única",
    ],
    paymentLink: "https://mpago.la/1rFeUeh",
    monthly: false,
    highlight: true,
  },
  {
    id: "pacote-stories",
    category: "Serviços Únicos",
    name: "Pacote de Stories",
    price: "A combinar",
    description:
      "Sequência de stories para engajar, vender, explicar uma oferta ou fortalecer a presença da marca no dia a dia.",
    features: [
      "Stories com intenção",
      "Sequência organizada",
      "Texto e visual estratégico",
      "Ideal para campanhas rápidas",
      "Orçamento pelo direct",
    ],
    paymentLink: INSTAGRAM_URL,
    monthly: false,
  },
  {
    id: "bio-otimizada",
    category: "Serviços Únicos",
    name: "Bio Profissional Otimizada",
    price: "R$ 97",
    description:
      "Ajuste da bio para deixar claro o que você faz, para quem faz e qual próximo passo o cliente deve tomar.",
    features: [
      "Bio mais clara",
      "Melhoria de CTA",
      "Organização da promessa",
      "Direção para link ou WhatsApp",
      "Entrega única",
    ],
    paymentLink: INSTAGRAM_URL,
    monthly: false,
  },
  {
    id: "diagnostico-perfil",
    category: "Serviços Únicos",
    name: "Diagnóstico de Perfil",
    price: "R$ 47",
    description:
      "Análise rápida para identificar o que está travando seu perfil e quais ajustes podem melhorar sua presença digital.",
    features: [
      "Análise do perfil",
      "Pontos de melhoria",
      "Clareza de comunicação",
      "Direção inicial",
      "Entrega única",
    ],
    paymentLink: "https://mpago.la/1SSrTr2",
    monthly: false,
  },
  {
    id: "roteiro-reels",
    category: "Serviços Únicos",
    name: "Roteiro de Reels",
    price: "R$ 97",
    description:
      "Roteiro pronto para Reels com gancho, desenvolvimento e chamada para ação, pensado para atrair o público certo.",
    features: [
      "Gancho inicial",
      "Texto do vídeo",
      "Direção de gravação",
      "CTA final",
      "Entrega única",
    ],
    paymentLink: "https://mpago.la/1w4qtgM",
    monthly: false,
  },
  {
    id: "legenda-seo",
    category: "Serviços Únicos",
    name: "Legenda Estratégica com SEO",
    price: "R$ 47",
    description:
      "Legenda pensada para melhorar entendimento do conteúdo, fortalecer palavras-chave e guiar o público para a ação.",
    features: [
      "Legenda estratégica",
      "Palavras-chave",
      "Hashtags direcionadas",
      "Comentário fixado sugerido",
      "CTA final",
    ],
    paymentLink: "https://mpago.la/13pnFv6",
    monthly: false,
  },
  {
    id: "otimizacao-completa-perfil",
    category: "Serviços Únicos",
    name: "Otimização Completa do Perfil",
    price: "R$ 397",
    description:
      "Revisão completa do perfil para melhorar clareza, aparência, confiança, CTA, destaques e direção comercial.",
    features: [
      "Análise do perfil",
      "Bio otimizada",
      "Sugestão de destaques",
      "Direção visual",
      "SEO básico para Instagram",
      "CTA mais claro",
    ],
    paymentLink: "https://mpago.la/2dWKbHd",
    monthly: false,
    highlight: true,
  },

  // =====================================================
  // SITES E LANDING PAGES
  // =====================================================
  {
    id: "pagina-links-premium",
    category: "Sites e Landing Pages",
    name: "Página de Links Premium",
    price: "R$ 347",
    description:
      "Página de links personalizada para substituir o link genérico da bio por uma experiência mais profissional e estratégica.",
    features: [
      "Página personalizada",
      "Botões estratégicos",
      "Visual da marca",
      "Integração com redes e WhatsApp",
      "Mais profissional que Linktree comum",
    ],
    paymentLink: "https://mpago.la/2zvZZTt",
    monthly: false,
  },
  {
    id: "one-page-start",
    category: "Sites e Landing Pages",
    name: "One Page Start",
    price: "R$ 697",
    description:
      "Página única profissional para apresentar seu negócio de forma clara e direcionar o cliente para uma ação.",
    features: [
      "Página única",
      "Design responsivo",
      "Botões de ação",
      "Integração com WhatsApp",
      "Estrutura simples e objetiva",
    ],
    paymentLink: "https://mpago.la/1anEtV9",
    monthly: false,
  },
  {
    id: "one-page-pro",
    category: "Sites e Landing Pages",
    name: "One Page Pro",
    price: "R$ 1.297",
    description:
      "Landing page mais completa, com estrutura persuasiva, apresentação profissional e foco em conversão.",
    features: [
      "Página premium",
      "Estrutura de venda",
      "Copy mais estratégica",
      "Seções comerciais",
      "CTA forte",
      "Integração com WhatsApp",
    ],
    paymentLink: "https://mpago.la/31zuomD",
    monthly: false,
    highlight: true,
  },
  {
    id: "landing-page-conversao",
    category: "Sites e Landing Pages",
    name: "Landing Page de Conversão",
    price: "R$ 1.497",
    description:
      "Página criada para transformar visitantes em contatos, leads ou clientes, com foco em oferta, clareza e ação.",
    features: [
      "Estrutura focada em conversão",
      "Copy direcionada",
      "Design profissional",
      "CTA estratégico",
      "Ideal para campanhas, serviços e infoprodutos",
    ],
    paymentLink: "https://mpago.la/2shVf2w",
    monthly: false,
  },
  {
    id: "site-completo",
    category: "Sites e Landing Pages",
    name: "Site Completo",
    price: "A combinar",
    description:
      "Site completo para marcas que precisam de uma presença digital mais robusta, com várias páginas e estrutura profissional.",
    features: [
      "Projeto sob medida",
      "Mais páginas e seções",
      "Estrutura institucional",
      "Visual profissional",
      "Orçamento pelo direct da FatorZ",
    ],
    paymentLink: INSTAGRAM_URL,
    monthly: false,
  },

  // =====================================================
  // IDENTIDADE E POSICIONAMENTO
  // =====================================================
  {
    id: "kit-visual-instagram",
    category: "Identidade e Posicionamento",
    name: "Kit Visual Instagram",
    price: "R$ 297",
    description:
      "Kit para deixar o perfil mais organizado, bonito e coerente, com peças visuais que fortalecem a percepção da marca.",
    features: [
      "Direção visual para Instagram",
      "Peças para organizar o perfil",
      "Base visual profissional",
      "Mais consistência na comunicação",
      "Entrega única",
    ],
    paymentLink: "https://mpago.la/1F9tssg",
    monthly: false,
  },
  {
    id: "calendario-conteudo",
    category: "Identidade e Posicionamento",
    name: "Calendário Estratégico de Conteúdo",
    price: "R$ 297",
    description:
      "Calendário para organizar ideias, temas e publicações com intenção, evitando postagem aleatória e sem direção.",
    features: [
      "Ideias de conteúdo",
      "Organização por objetivo",
      "Sugestões de Reels, posts e stories",
      "Direção para atrair e gerar confiança",
      "Entrega única",
    ],
    paymentLink: "https://mpago.la/2i5GMwM",
    monthly: false,
  },
  {
    id: "perfil-premium-fatorz",
    category: "Identidade e Posicionamento",
    name: "Perfil Premium FatorZ",
    price: "R$ 497",
    description:
      "Reestruturação do perfil para transmitir mais confiança, clareza, profissionalismo e direção comercial.",
    features: [
      "Bio otimizada",
      "Direção de destaques",
      "Análise visual",
      "SEO básico do perfil",
      "Sugestão de conteúdo",
      "CTA mais claro",
    ],
    paymentLink: "https://mpago.la/1mTcKqB",
    monthly: false,
    highlight: true,
  },
  {
    id: "identidade-visual-express",
    category: "Identidade e Posicionamento",
    name: "Identidade Visual Express",
    price: "R$ 497",
    description:
      "Criação de uma base visual para sua marca parecer mais profissional, coerente e pronta para ser escolhida.",
    features: [
      "Paleta visual",
      "Direção de estilo",
      "Aplicação básica",
      "Referência visual para conteúdos",
      "Entrega única",
    ],
    paymentLink: "https://mpago.la/21Sbehs",
    monthly: false,
  },
  {
    id: "posicionamento-marca",
    category: "Identidade e Posicionamento",
    name: "Posicionamento de Marca",
    price: "R$ 797",
    description:
      "Definição estratégica para deixar claro o que sua marca comunica, para quem comunica e por que ela deve ser escolhida.",
    features: [
      "Clareza de público",
      "Promessa da marca",
      "Diferenciação",
      "Tom de comunicação",
      "Direção estratégica",
    ],
    paymentLink: "https://mpago.la/1mQeAcb",
    monthly: false,
  },
  {
    id: "presenca-digital-start",
    category: "Identidade e Posicionamento",
    name: "Presença Digital Start",
    price: "R$ 997",
    description:
      "Pacote para organizar o início da presença digital com perfil, conteúdo, direção visual e comunicação mais clara.",
    features: [
      "Bio otimizada",
      "Direção de destaques",
      "Sugestão de conteúdo",
      "Ajustes de posicionamento",
      "Direção visual básica",
      "Caminho inicial de presença digital",
    ],
    paymentLink: "https://mpago.la/2XBrXCh",
    monthly: false,
    highlight: true,
  },

  // =====================================================
  // ACADEMY
  // =====================================================
  {
    id: "renda-com-ia",
    category: "Academy",
    name: "Renda com IA",
    price: "Acesso vitalício",
    description:
      "Curso para aprender a usar inteligência artificial como ferramenta para criar ideias, serviços, conteúdos e oportunidades digitais.",
    features: [
      "Acesso vitalício",
      "Curso individual",
      "Conteúdo prático",
      "Foco em iniciantes",
      "Aprenda no seu ritmo",
    ],
    paymentLink: "https://mpago.la/2UVQQdR",
    monthly: false,
  },
  {
    id: "instagram-estrategico",
    category: "Academy",
    name: "Instagram Estratégico para Negócios",
    price: "Acesso vitalício",
    description:
      "Curso para entender como transformar o Instagram em uma ferramenta de posicionamento, confiança e venda.",
    features: [
      "Acesso vitalício",
      "Instagram para negócios",
      "Posicionamento",
      "Conteúdo com intenção",
      "Perfil mais estratégico",
    ],
    paymentLink: "https://mpago.la/11EkGKg",
    monthly: false,
    highlight: true,
  },
  {
    id: "conteudo-com-ia",
    category: "Academy",
    name: "Conteúdo com IA",
    price: "Acesso vitalício",
    description:
      "Curso para criar ideias, legendas, roteiros e conteúdos com apoio de inteligência artificial.",
    features: [
      "Acesso vitalício",
      "Ideias de conteúdo",
      "Legendas",
      "Roteiros de Reels",
      "Aplicação prática com IA",
    ],
    paymentLink: "https://mpago.la/21CcahA",
    monthly: false,
  },
  {
    id: "seo-instagram",
    category: "Academy",
    name: "SEO para Instagram",
    price: "Acesso vitalício",
    description:
      "Curso para melhorar palavras-chave, legenda, bio e estrutura do perfil para o Instagram entender melhor sua marca.",
    features: [
      "Acesso vitalício",
      "SEO para Instagram",
      "Palavras-chave",
      "Bio otimizada",
      "Conteúdo mais encontrável",
    ],
    paymentLink: "https://mpago.la/1XSHWwt",
    monthly: false,
  },
  {
    id: "design-social-media",
    category: "Academy",
    name: "Design Estratégico para Social Media",
    price: "Acesso vitalício",
    description:
      "Curso para entender como o visual ajuda uma marca a transmitir profissionalismo, valor e confiança.",
    features: [
      "Acesso vitalício",
      "Design para Instagram",
      "Percepção de valor",
      "Organização visual",
      "Comunicação profissional",
    ],
    paymentLink: "https://mpago.la/1ahtZ48",
    monthly: false,
  },
  {
    id: "curso-inicial",
    category: "Academy",
    name: "Curso Inicial",
    price: "R$ 47",
    description:
      "Curso de entrada para quem quer começar dentro da FatorZ Academy e entender os primeiros passos da presença digital.",
    features: [
      "Acesso vitalício",
      "Curso de entrada",
      "Conteúdo inicial",
      "Ideal para começar",
      "Aprenda no seu ritmo",
    ],
    paymentLink: "https://mpago.la/23pc3L3",
    monthly: false,
  },
];