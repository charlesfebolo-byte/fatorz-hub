import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  LayoutGrid,
  ShoppingBag,
  PlayCircle,
  Sparkles,
  PackageCheck,
  Settings,
  ShoppingCart,
  Boxes,
  Layers,
  Users,
  CheckCircle2,
  BookOpen,
  Video,
  Link2,
  LogOut,
  type LucideIcon,
} from "lucide-react";

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

function SidebarIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#111120]">
      <Icon className="h-[15px] w-[15px]" strokeWidth={2.25} />
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
    `group flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "border border-[#8b5cf6]/30 bg-gradient-to-r from-[#8b5cf6]/16 to-[#3b82f6]/6 text-white"
        : "border border-transparent text-zinc-400 hover:bg-white/[0.035] hover:text-white"
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
        className={`flex items-center gap-1 font-['Sora',sans-serif] font-black text-white ${
          compact ? "text-xl" : "mb-6 px-1 text-xl"
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
      <div className="mb-5 overflow-hidden rounded-xl border border-white/[0.12] bg-[#111120] p-3">
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Conta</p>

          <h3 className="mt-2 break-all text-sm font-black text-white">
            {profile?.nome || profile?.name || profile?.email || "FatorZ"}
          </h3>

          <div className="mt-3 inline-flex rounded-md bg-[#8b5cf6]/14 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#a78bfa]">
            {roleLabel}
          </div>
        </div>
      </div>
    );
  }

  function SectionTitle({ children }: { children: string }) {
    return (
      <div className="mb-2 mt-5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
        {children}
      </div>
    );
  }

  function Links() {
    return (
      <>
        <AccountBox />

        <NavLink to="/dashboard" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon icon={LayoutGrid} />
          <span>Painel</span>
        </NavLink>

        <NavLink to="/" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon icon={ShoppingBag} />
          <span>Produtos FatorZ</span>
        </NavLink>

        <NavLink to="/academy" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon icon={PlayCircle} />
          <span>Academy</span>
        </NavLink>

        <NavLink to="/mural" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon icon={Sparkles} />
          <span>Mural</span>
        </NavLink>

        <NavLink to="/minhas-entregas" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon icon={PackageCheck} />
          <span>Minhas Entregas</span>
        </NavLink>

        <NavLink to="/configuracoes" className={linkClass} onClick={closeMobileMenu}>
          <SidebarIcon icon={Settings} />
          <span>ConfiguraÃ§Ãµes</span>
        </NavLink>

        {isTeamMember(profile) && (
          <>
            <SectionTitle>OperaÃ§Ã£o FatorZ</SectionTitle>

            {hasAnyRole(profile, ["ceo_fatorz", "diretor_operacional"]) && (
              <NavLink to="/admin/landing" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon icon={Sparkles} />
                <span>Landing</span>
              </NavLink>
            )}

            {canSeeOrders && (
              <NavLink to="/admin/pedidos" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon icon={ShoppingCart} />
                <span>Pedidos</span>
              </NavLink>
            )}

            {canSeeProducts && (
              <NavLink to="/admin/produtos" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon icon={Boxes} />
                <span>Produtos Admin</span>
              </NavLink>
            )}

            {canSeeProjects && (
              <NavLink to="/projetos" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon icon={Layers} />
                <span>Projetos</span>
              </NavLink>
            )}

            {canSeeUsers && (
              <NavLink to="/admin/usuarios" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon icon={Users} />
                <span>UsuÃ¡rios</span>
              </NavLink>
            )}

            {canSeeSubscriptions && (
              <NavLink to="/admin/assinaturas" className={linkClass} onClick={closeMobileMenu}>
                <SidebarIcon icon={CheckCircle2} />
                <span>Acessos Academy</span>
              </NavLink>
            )}
          </>
        )}

        {canSeeAcademyAdmin && (
          <>
            <SectionTitle>Academy Admin</SectionTitle>

            <NavLink to="/admin/cursos" className={linkClass} onClick={closeMobileMenu}>
              <SidebarIcon icon={BookOpen} />
              <span>Cursos Academy</span>
            </NavLink>

            <NavLink to="/admin/aulas" className={linkClass} onClick={closeMobileMenu}>
              <SidebarIcon icon={Video} />
              <span>Aulas Academy</span>
            </NavLink>

            <NavLink to="/admin/links" className={linkClass} onClick={closeMobileMenu}>
              <SidebarIcon icon={Link2} />
              <span>Links Academy</span>
            </NavLink>
          </>
        )}

        <div className="mt-6 border-t border-white/10 pt-5">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-left font-black text-red-300 transition hover:bg-red-500/20"
          >
            <SidebarIcon icon={LogOut} />
            <span>Sair da conta</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#050509]/95 px-4 py-4 backdrop-blur-xl lg:hidden">
        <BrandButton compact />

        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-xl border border-white/10 bg-[#111120] px-5 py-3 font-black text-white"
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

          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[360px] overflow-y-auto border-r border-white/10 bg-[#0c0c16] p-5 shadow-[0_0_70px_rgba(0,0,0,0.8)]">
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

      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 overflow-y-auto border-r border-white/[0.07] bg-[#0c0c16] p-4 lg:block">
        <div className="pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full bg-[#8b5cf6]/8 blur-3xl" />

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

