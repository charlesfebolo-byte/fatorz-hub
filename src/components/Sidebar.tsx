import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type SidebarProps = {
  profile: any;
};

type StaffRole =
  | "none"
  | "ceo_fatorz"
  | "diretor_operacional"
  | "gestor_entregas"
  | "criador_visual"
  | "suporte_fatorz"
  | "financeiro"
  | "mentor_academy";

const staffRoleLabels: Record<string, string> = {
  ceo_fatorz: "CEO FatorZ",
  diretor_operacional: "Diretor Operacional",
  gestor_entregas: "Gestor de Entregas",
  criador_visual: "Criador Visual",
  suporte_fatorz: "Suporte FatorZ",
  financeiro: "Financeiro",
  mentor_academy: "Mentor Academy",
  none: "Aluno/Cliente",
};

function getStaffRole(profile: any): StaffRole {
  if (profile?.staff_role) return profile.staff_role;

  // Compatibilidade com o sistema antigo.
  if (profile?.role === "admin") return "ceo_fatorz";

  return "none";
}

function hasAnyRole(profile: any, roles: StaffRole[]) {
  const staffRole = getStaffRole(profile);

  return roles.includes(staffRole);
}

function isTeamMember(profile: any) {
  return getStaffRole(profile) !== "none";
}

export default function Sidebar({ profile }: SidebarProps) {
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const staffRole = getStaffRole(profile);
  const roleLabel = staffRoleLabels[staffRole] || "Aluno/Cliente";

  const canSeeOrders = hasAnyRole(profile, [
    "ceo_fatorz",
    "diretor_operacional",
    "gestor_entregas",
    "suporte_fatorz",
    "financeiro",
  ]);

  const canSeeUsers = hasAnyRole(profile, [
    "ceo_fatorz",
    "diretor_operacional",
    "gestor_entregas",
    "suporte_fatorz",
    "mentor_academy",
  ]);

  const canSeeAcademyAdmin = hasAnyRole(profile, [
    "ceo_fatorz",
    "diretor_operacional",
    "mentor_academy",
  ]);

  const canSeeProjects = hasAnyRole(profile, [
    "ceo_fatorz",
    "diretor_operacional",
    "gestor_entregas",
    "criador_visual",
    "suporte_fatorz",
  ]);

  const canSeeFinance = hasAnyRole(profile, [
    "ceo_fatorz",
    "diretor_operacional",
    "financeiro",
  ]);

  const canSeeSubscriptions = hasAnyRole(profile, [
    "ceo_fatorz",
    "diretor_operacional",
    "financeiro",
    "mentor_academy",
  ]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-2xl transition font-black ${
      isActive
        ? "bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] text-white shadow-lg shadow-pink-500/10"
        : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
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

  function AccountBox() {
    return (
      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
          Conta
        </p>

        <h3 className="mt-2 text-sm font-black text-white break-all">
          {profile?.nome || profile?.name || profile?.email || "FatorZ"}
        </h3>

        <div className="mt-3 inline-flex rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-pink-300">
          {roleLabel}
        </div>
      </div>
    );
  }

  function Links() {
    return (
      <>
        <AccountBox />

        <NavLink to="/dashboard" className={linkClass} onClick={closeMobileMenu}>
          Painel
        </NavLink>

        <NavLink to="/academy" className={linkClass} onClick={closeMobileMenu}>
          Academy
        </NavLink>

        <NavLink to="/mural" className={linkClass} onClick={closeMobileMenu}>
          Mural
        </NavLink>

        <NavLink
          to="/minhas-entregas"
          className={linkClass}
          onClick={closeMobileMenu}
        >
          Minhas Entregas
        </NavLink>

        <NavLink to="/" className={linkClass} onClick={closeMobileMenu}>
          Soluções
        </NavLink>

        <NavLink
          to="/configuracoes"
          className={linkClass}
          onClick={closeMobileMenu}
        >
          Configurações
        </NavLink>

        {isTeamMember(profile) && (
          <>
            <div className="mt-6 mb-2 text-xs uppercase tracking-widest text-zinc-600 font-black">
              Operação FatorZ
            </div>

            {canSeeOrders && (
              <NavLink
                to="/admin/pedidos"
                className={linkClass}
                onClick={closeMobileMenu}
              >
                Pedidos
              </NavLink>
            )}

            {canSeeProjects && (
              <NavLink
                to="/projetos"
                className={linkClass}
                onClick={closeMobileMenu}
              >
                Projetos
              </NavLink>
            )}

            {canSeeUsers && (
              <NavLink
                to="/admin/usuarios"
                className={linkClass}
                onClick={closeMobileMenu}
              >
                Usuários
              </NavLink>
            )}

            {canSeeSubscriptions && (
              <NavLink
                to="/admin/assinaturas"
                className={linkClass}
                onClick={closeMobileMenu}
              >
                Acessos Academy
              </NavLink>
            )}

            {canSeeFinance && (
              <NavLink
                to="/financeiro"
                className={linkClass}
                onClick={closeMobileMenu}
              >
                Financeiro
              </NavLink>
            )}

            {canSeeUsers && (
              <NavLink
                to="/clientes"
                className={linkClass}
                onClick={closeMobileMenu}
              >
                Clientes
              </NavLink>
            )}
          </>
        )}

        {canSeeAcademyAdmin && (
          <>
            <div className="mt-6 mb-2 text-xs uppercase tracking-widest text-zinc-600 font-black">
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
          </>
        )}

        <div className="mt-6 pt-5 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left font-black text-red-300 transition hover:bg-red-500/20"
          >
            Sair da conta
          </button>
        </div>
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

          <aside className="absolute top-0 left-0 h-full w-[86vw] max-w-[360px] bg-zinc-950 border-r border-zinc-800 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => {
                  navigate("/dashboard");
                  closeMobileMenu();
                }}
                className="text-2xl font-black text-white"
              >
                Fator<span className="text-pink-500">Z</span>
              </button>

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-white"
              >
                Fechar
              </button>
            </div>

            <nav className="space-y-2 pb-8">
              <Links />
            </nav>
          </aside>
        </div>
      )}

      <aside className="hidden lg:block sticky top-0 h-screen w-[300px] shrink-0 border-r border-white/10 bg-black/80 p-6 overflow-y-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 text-3xl font-black text-white"
        >
          Fator<span className="text-pink-500">Z</span>
        </button>

        <nav className="space-y-2 pb-8">
          <Links />
        </nav>
      </aside>
    </>
  );
}