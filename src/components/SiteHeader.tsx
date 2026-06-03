import { useState } from "react";
import { useNavigate } from "react-router-dom";

const INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";

const serviceLinks = [
  {
    label: "Agência de Marketing Digital",
    path: "/servicos/agencia-de-marketing-digital",
    description: "Estratégia, presença digital e posicionamento.",
  },
  {
    label: "Edição de Reels",
    path: "/servicos/edicao-de-reels",
    description: "Vídeos curtos com acabamento profissional.",
  },
  {
    label: "Artes para Instagram",
    path: "/servicos/criacao-de-artes-para-instagram",
    description: "Posts, criativos, feed, stories e destaques.",
  },
  {
    label: "Landing Page",
    path: "/servicos/landing-page",
    description: "Páginas para apresentar ofertas e vender melhor.",
  },
  {
    label: "Identidade Visual",
    path: "/servicos/identidade-visual",
    description: "Direção visual para sua marca parecer profissional.",
  },
  {
    label: "Gestão de Instagram",
    path: "/servicos/gestao-de-instagram",
    description: "Perfil, conteúdo, calendário e presença digital.",
  },
  {
    label: "Marketing para Barbeiros",
    path: "/servicos/marketing-para-barbeiros",
    description: "Instagram, agenda e presença digital para barbearias.",
  },
];

const specialLinks = [
  {
    label: "Plano Local Pelotas",
    path: "/agencia-de-marketing-em-pelotas",
    description: "Presença digital para negócios locais em Pelotas e região.",
  },
  {
    label: "Blog FatorZ",
    path: "/blog",
    description: "Conteúdos sobre marketing, Instagram, sites e presença digital.",
  },
  {
    label: "FatorZ Academy",
    path: "/academy",
    description: "Aprenda marketing, IA e criação de conteúdo no seu ritmo.",
  },
];

export default function SiteHeader() {
  const navigate = useNavigate();

  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openInstagram() {
    window.open(INSTAGRAM_URL, "_blank");
  }

  function goToProducts() {
    setServicesOpen(false);
    setMobileOpen(false);

    if (window.location.pathname === "/") {
      const section = document.getElementById("produtos");
      section?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    navigate("/");

    setTimeout(() => {
      const section = document.getElementById("produtos");
      section?.scrollIntoView({ behavior: "smooth" });
    }, 250);
  }

  function goTo(path: string) {
    setServicesOpen(false);
    setMobileOpen(false);
    navigate(path);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-8">
        <button
          onClick={() => goTo("/")}
          className="text-2xl md:text-3xl font-black tracking-tight text-white shrink-0"
        >
          Fator<span className="text-pink-500">Z</span>
        </button>

        <nav className="hidden lg:flex items-center gap-8 text-sm font-black text-zinc-400">
          <button onClick={() => goTo("/")} className="hover:text-white">
            Início
          </button>

          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              onClick={() => setServicesOpen((prev) => !prev)}
              className="flex items-center gap-1 hover:text-white"
            >
              Serviços
              <span className="text-pink-500">▾</span>
            </button>

            {servicesOpen && (
              <div className="absolute left-0 top-full pt-4">
                <div className="w-[680px] rounded-[30px] border border-white/10 bg-[#08080a] p-5 shadow-2xl shadow-black">
                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                        Menu de soluções
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        Escolha pelo que sua marca precisa melhorar agora.
                      </p>
                    </div>

                    <button
                      onClick={() => goTo("/servicos")}
                      className="rounded-xl bg-white px-4 py-3 text-xs font-black text-black hover:bg-zinc-200"
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className="grid grid-cols-[1.2fr_0.8fr] gap-4">
                    <div>
                      <p className="mb-3 px-1 text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                        Serviços principais
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {serviceLinks.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => goTo(item.path)}
                            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-pink-500/40 hover:bg-white/[0.075]"
                          >
                            <p className="text-sm font-black text-white">
                              {item.label}
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                              {item.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 px-1 text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                        Local, blog e aprendizado
                      </p>

                      <div className="grid gap-2">
                        {specialLinks.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => goTo(item.path)}
                            className="rounded-2xl border border-pink-500/20 bg-pink-500/[0.06] p-4 text-left transition hover:border-pink-500/50 hover:bg-pink-500/[0.10]"
                          >
                            <p className="text-sm font-black text-white">
                              {item.label}
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                              {item.description}
                            </p>
                          </button>
                        ))}

                        <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                          <p className="text-sm font-black text-white">
                            Não sabe qual escolher?
                          </p>

                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                            Chama no Instagram e a FatorZ indica a melhor solução.
                          </p>

                          <button
                            onClick={openInstagram}
                            className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-xs font-black text-black hover:bg-zinc-200"
                          >
                            Chamar no direct
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => goTo("/blog")} className="hover:text-white">
            Blog
          </button>

          <button onClick={goToProducts} className="hover:text-white">
            Produtos
          </button>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => goTo("/login")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Entrar no Hub
          </button>

          <button
            onClick={openInstagram}
            className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-3 text-sm font-black text-white transition hover:opacity-90"
          >
            @fatorzhouse
          </button>
        </div>

        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="lg:hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white"
        >
          Menu
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-black/95 px-4 pb-5">
          <div className="mx-auto max-w-7xl pt-4">
            <div className="grid gap-3">
              <button
                onClick={() => goTo("/")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left font-black text-white"
              >
                Início
              </button>

              <button
                onClick={() => goTo("/servicos")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left font-black text-white"
              >
                Todos os serviços
              </button>

              <button
                onClick={() => goTo("/blog")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left font-black text-white"
              >
                Blog
              </button>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-3 px-2 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                  Serviços principais
                </p>

                <div className="grid gap-2">
                  {serviceLinks.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className="rounded-xl bg-black/50 p-3 text-left"
                    >
                      <p className="font-black text-white">{item.label}</p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-pink-500/20 bg-pink-500/[0.05] p-3">
                <p className="mb-3 px-2 text-xs font-black uppercase tracking-[0.25em] text-pink-400">
                  Local, blog e aprendizado
                </p>

                <div className="grid gap-2">
                  {specialLinks.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className="rounded-xl bg-black/50 p-3 text-left"
                    >
                      <p className="font-black text-white">{item.label}</p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={goToProducts}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left font-black text-white"
              >
                Produtos
              </button>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => goTo("/login")}
                  className="rounded-2xl border border-white/10 bg-white px-5 py-4 text-sm font-black text-black"
                >
                  Entrar
                </button>

                <button
                  onClick={openInstagram}
                  className="rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-5 py-4 text-sm font-black text-white"
                >
                  Instagram
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}