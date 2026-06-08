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
  if (profile?.role === "admin") return "ceo_fatorz";
  return "none";
}

function hasAnyRole(profile: any, roles: StaffRole[]) {
  return roles.includes(getStaffRole(profile));
}

function isTeamMember(profile: any) {
  return getStaffRole(profile) !== "none";
}

function SidebarIcon({ children }: { children: any }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-[15px]">
      {children}
    </span>
  );
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

  const canSeeProducts = hasAnyRole(profile, [
    "ceo_fatorz",
    "diretor_operacional",
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

  const canSeeSubscriptions = hasAnyRole(profile, [
    "ceo_fatorz",
    "diretor_operacional",
    "financeiro",
    "mentor_academy",
  ]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black transition ${
      isActive
        ? "bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] text-white shadow-[0_0_26px_rgba(145,35,255,0.28)]"
        : "text-zinc-500 hover:bg-white/[0.06] hover:text-white"
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

  function BrandButton({ compact = false }: { compact?: boolean }) {
    return (
      <button
        onClick={() => navigate("/dashboard")}
        className={`flex items-center gap-1 font-black text-white ${
          compact ? "text-2xl" : "mb-8 text-3xl"
        }`}
      >
        <span>Fator</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0096] via-[#9123ff] to-[#00a3ff]">
          Z
        </span>
      </button>
    );
  }

  function AccountBox() {
    return (
      <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_0_35px_rgba(145,35,255,0.08)]">
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">
            Conta
          </p>

          <h3 className="mt-2 break-all text-sm font-black text-white">
            {profile?.nome || profile?.name || profile?.email || "FatorZ"}
          </h3>

          <div className="mt-3 inline-flex rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-pink-300">
            {roleLabel}
          </div>
        </div>
      </div>
    );
  }

  function SectionTitle({ children }: { children: string }) {
    return (
      <div className="mb-2 mt-6 px-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-600">
        {children}
      </div>
    );
  }

  function Links() {
    return (
      <>
        <AccountBox />

        <NavLink to="/dashboard" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon>▦</SidebarIcon>
          <span>Painel</span>
        </NavLink>

        <NavLink to="/" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon>🛍️</SidebarIcon>
          <span>Produtos FatorZ</span>
        </NavLink>

        <NavLink to="/academy" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon>▶</SidebarIcon>
          <span>Academy</span>
        </NavLink>

        <NavLink to="/mural" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon>✦</SidebarIcon>
          <span>Mural</span>
        </NavLink>

        <NavLink to="/minhas-entregas" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon>□</SidebarIcon>
          <span>Minhas Entregas</span>
        </NavLink>

        <NavLink to="/configuracoes" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon>⚙</SidebarIcon>
          <span>Configurações</span>
        </NavLink>

        {isTeamMember(profile) && (
          <>
            <SectionTitle>Operação FatorZ</SectionTitle>

            {canSeeOrders && (
              <NavLink to="/admin/pedidos" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon>🛒</SidebarIcon>
                <span>Pedidos</span>
              </NavLink>
            )}

            {canSeeProducts && (
              <NavLink to="/admin/produtos" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon>▣</SidebarIcon>
                <span>Produtos Admin</span>
              </NavLink>
            )}

            {canSeeProjects && (
              <NavLink to="/projetos" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon>◆</SidebarIcon>
                <span>Projetos</span>
              </NavLink>
            )}

            {canSeeUsers && (
              <NavLink to="/admin/usuarios" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon>👥</SidebarIcon>
                <span>Usuários</span>
              </NavLink>
            )}

            {canSeeSubscriptions && (
              <NavLink to="/admin/assinaturas" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon>✓</SidebarIcon>
                <span>Acessos Academy</span>
              </NavLink>
            )}
          </>
        )}

        {canSeeAcademyAdmin && (
          <>
            <SectionTitle>Academy Admin</SectionTitle>

            <NavLink to="/admin/cursos" className={linkClass} onClick={closeMobileMenu}>
              <SidebarIcon>▤</SidebarIcon>
              <span>Cursos Academy</span>
            </NavLink>

            <NavLink to="/admin/aulas" className={linkClass} onClick={closeMobileMenu}>
              <SidebarIcon>▸</SidebarIcon>
              <span>Aulas Academy</span>
            </NavLink>

            <NavLink to="/admin/links" className={linkClass} onClick={closeMobileMenu}>
              <SidebarIcon>↗</SidebarIcon>
              <span>Links Academy</span>
            </NavLink>
          </>
        )}

        <div className="mt-6 border-t border-white/10 pt-5">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-left font-black text-red-300 transition hover:bg-red-500/20"
          >
            <SidebarIcon>×</SidebarIcon>
            <span>Sair da conta</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/90 px-4 py-4 backdrop-blur-xl lg:hidden">
        <BrandButton compact />

        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-black text-white shadow-[0_0_20px_rgba(145,35,255,0.15)]"
        >
          Menu
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[360px] overflow-y-auto border-r border-white/10 bg-[#050509] p-6 shadow-[0_0_70px_rgba(0,0,0,0.8)]">
            <div className="mb-8 flex items-center justify-between">
              <button
                onClick={() => {
                  navigate("/dashboard");
                  closeMobileMenu();
                }}
                className="text-2xl font-black text-white"
              >
                Fator
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0096] via-[#9123ff] to-[#00a3ff]">
                  Z
                </span>
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

      <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#050509]/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.65)] lg:block">
        <div className="pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full bg-[#ff0096]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-40 h-40 w-40 rounded-full bg-[#005cff]/10 blur-3xl" />

        <div className="relative">
          <BrandButton />

          <nav className="space-y-2 pb-8">
            <Links />
          </nav>
        </div>
      </aside>
    </>
  );
}