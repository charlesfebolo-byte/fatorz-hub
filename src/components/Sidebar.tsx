import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Sidebar({ profile }: any) {
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block p-3 rounded-xl transition font-bold ${
      isActive
        ? "bg-purple-600 text-white"
        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
    }`;

  async function logout() {
    const confirmLogout = confirm("Tem certeza que quer sair da conta?");

    if (!confirmLogout) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log("Erro ao sair:", error);
      alert("Erro ao sair da conta.");
      return;
    }

    navigate("/login");
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function Links() {
    return (
      <>
        <NavLink to="/dashboard" className={linkClass} onClick={closeMobileMenu}>
          Painel
        </NavLink>

        <NavLink to="/academy" className={linkClass} onClick={closeMobileMenu}>
          Academy
        </NavLink>

        <NavLink
          to="/minhas-entregas"
          className={linkClass}
          onClick={closeMobileMenu}
        >
          Minhas Entregas
        </NavLink>

        <NavLink to="/" className={linkClass} onClick={closeMobileMenu}>
          Produtos
        </NavLink>

        <NavLink
          to="/configuracoes"
          className={linkClass}
          onClick={closeMobileMenu}
        >
          Configurações
        </NavLink>

        {isAdmin && (
          <>
            <div className="mt-5 mb-1 text-xs uppercase tracking-widest text-zinc-600 font-black">
              Admin
            </div>

            <NavLink
              to="/admin/pedidos"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Pedidos
            </NavLink>

            <NavLink
              to="/admin/assinaturas"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Assinaturas
            </NavLink>

            <NavLink
              to="/admin/usuarios"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Usuários
            </NavLink>

            <div className="mt-5 mb-1 text-xs uppercase tracking-widest text-zinc-600 font-black">
              Academy Admin
            </div>

            <NavLink
              to="/admin/cursos"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Cursos Academy
            </NavLink>

            <NavLink
              to="/admin/aulas"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Aulas Academy
            </NavLink>

            <NavLink
              to="/admin/links"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Links Academy
            </NavLink>

            <div className="mt-5 mb-1 text-xs uppercase tracking-widest text-zinc-600 font-black">
              Gestão
            </div>

            <NavLink
              to="/clientes"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Clientes
            </NavLink>

            <NavLink
              to="/projetos"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Projetos
            </NavLink>

            <NavLink
              to="/financeiro"
              className={linkClass}
              onClick={closeMobileMenu}
            >
              Financeiro
            </NavLink>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-2xl font-black text-white"
        >
          Fator<span className="text-pink-500">Z</span>
        </button>

        <button
          onClick={() => setMobileOpen(true)}
          className="bg-zinc-900 border border-zinc-800 text-white px-5 py-3 rounded-2xl font-black"
        >
          Menu
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute top-0 left-0 h-full w-[86vw] max-w-[340px] bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-white">
                  Fator<span className="text-pink-500">Z</span>
                </h1>

                <p className="text-zinc-500 text-sm mt-1">Hub</p>
              </div>

              <button
                onClick={() => setMobileOpen(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white w-12 h-12 rounded-2xl font-black"
              >
                X
              </button>
            </div>

            <nav className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
              <Links />
            </nav>

            <div className="mt-4 pt-4 border-t border-zinc-800">
              <button
                onClick={logout}
                className="w-full bg-zinc-900 hover:bg-red-600 text-zinc-300 hover:text-white px-4 py-3 rounded-xl font-black transition"
              >
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden lg:flex w-[260px] bg-zinc-950 border-r border-zinc-800 h-screen p-6 sticky top-0 flex-col shrink-0">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">
            Fator<span className="text-pink-500">Z</span>
          </h1>

          <p className="text-zinc-500 text-sm mt-1">Hub</p>
        </div>

        <nav className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
          <Links />
        </nav>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <button
            onClick={logout}
            className="w-full bg-zinc-900 hover:bg-red-600 text-zinc-300 hover:text-white px-4 py-3 rounded-xl font-black transition"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}