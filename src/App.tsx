import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Finance from "./pages/Finance";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import Mural from "./pages/Mural";
import Academy from "./pages/Academy";
import MyDeliveries from "./pages/MyDeliveries";
import AdminCourses from "./pages/AdminCourses";
import AdminLessons from "./pages/AdminLessons";
import AdminLinks from "./pages/AdminLinks";
import AdminUsers from "./pages/AdminUsers";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminOrders from "./pages/AdminOrders";
import CheckoutAcademy from "./pages/CheckoutAcademy";
import ThankYou from "./pages/ThankYou";

import Sidebar from "./components/Sidebar";
import FatorzAssistant from "./components/FatorzAssistant";

type StaffRole =
  | "none"
  | "ceo_fatorz"
  | "diretor_operacional"
  | "gestor_entregas"
  | "criador_visual"
  | "suporte_fatorz"
  | "financeiro"
  | "mentor_academy";

const ALL_TEAM_ROLES: StaffRole[] = [
  "ceo_fatorz",
  "diretor_operacional",
  "gestor_entregas",
  "criador_visual",
  "suporte_fatorz",
  "financeiro",
  "mentor_academy",
];

const ORDERS_ROLES: StaffRole[] = [
  "ceo_fatorz",
  "diretor_operacional",
  "gestor_entregas",
  "suporte_fatorz",
  "financeiro",
];

const USERS_ROLES: StaffRole[] = [
  "ceo_fatorz",
  "diretor_operacional",
  "gestor_entregas",
  "suporte_fatorz",
  "mentor_academy",
];

const ACADEMY_ACCESS_ROLES: StaffRole[] = [
  "ceo_fatorz",
  "diretor_operacional",
  "financeiro",
  "mentor_academy",
];

const ACADEMY_ADMIN_ROLES: StaffRole[] = [
  "ceo_fatorz",
  "diretor_operacional",
  "mentor_academy",
];

const PROJECTS_ROLES: StaffRole[] = [
  "ceo_fatorz",
  "diretor_operacional",
  "gestor_entregas",
  "criador_visual",
  "suporte_fatorz",
];

const FINANCE_ROLES: StaffRole[] = [
  "ceo_fatorz",
  "diretor_operacional",
  "financeiro",
];

function LoadingScreen({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      {text}
    </div>
  );
}

function DashboardLayout({ children, profile }: any) {
  return (
    <div className="min-h-screen bg-[#09090B] flex overflow-x-hidden">
      <Sidebar profile={profile} />

      <main className="flex-1 w-full min-w-0 px-4 py-6 pt-24 lg:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

function getStaffRole(profile: any): StaffRole {
  if (profile?.staff_role) return profile.staff_role;

  // Compatibilidade com o sistema antigo.
  // Enquanto o banco ainda usa role = admin, você continua entrando como CEO.
  if (profile?.role === "admin") return "ceo_fatorz";

  return "none";
}

function canAccess(profile: any, allowedRoles: StaffRole[]) {
  const staffRole = getStaffRole(profile);

  return allowedRoles.includes(staffRole);
}

function ProtectedRoute({ user, profile, children }: any) {
  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return <LoadingScreen text="Verificando acesso..." />;
  }

  return children;
}

function StaffRoute({
  user,
  profile,
  allowedRoles = ALL_TEAM_ROLES,
  children,
}: any) {
  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return <LoadingScreen text="Verificando permissões..." />;
  }

  if (!canAccess(profile, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [appLoading, setAppLoading] = useState(true);

  const currentUserIdRef = useRef<string | null>(null);
  const profileRequestIdRef = useRef(0);

  async function loadProfile(currentUser: any) {
    const requestId = profileRequestIdRef.current + 1;
    profileRequestIdRef.current = requestId;

    try {
      const [profileResponse, adminResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle(),

        supabase.rpc("is_admin"),
      ]);

      if (profileRequestIdRef.current !== requestId) return;

      const isAdminFromDatabase = adminResponse.data === true;

      if (adminResponse.error) {
        console.log("Erro ao verificar admin:", adminResponse.error);
      }

      if (profileResponse.error) {
        console.log("Erro ao carregar profile:", profileResponse.error);

        setProfile({
          id: currentUser.id,
          email: currentUser.email,
          nome: currentUser.email,
          role: isAdminFromDatabase ? "admin" : "user",
          staff_role: isAdminFromDatabase ? "ceo_fatorz" : "none",
          customer_tag: "free",
          academy_expires_at: null,
          total_spent: 0,
        });

        return;
      }

      const profileData =
        profileResponse.data || {
          id: currentUser.id,
          email: currentUser.email,
          nome: currentUser.email,
          role: "user",
          staff_role: "none",
          customer_tag: "free",
          academy_expires_at: null,
          total_spent: 0,
        };

      const finalRole = isAdminFromDatabase
        ? "admin"
        : profileData.role || "user";

      const finalStaffRole =
        profileData.staff_role ||
        (isAdminFromDatabase || profileData.role === "admin"
          ? "ceo_fatorz"
          : "none");

      setProfile({
        ...profileData,
        email: profileData.email || currentUser.email,
        role: finalRole,
        staff_role: finalStaffRole,
        customer_tag: profileData.customer_tag || "free",
        total_spent: profileData.total_spent || 0,
      });
    } catch (err) {
      if (profileRequestIdRef.current !== requestId) return;

      console.log("Erro inesperado ao carregar profile:", err);

      setProfile({
        id: currentUser.id,
        email: currentUser.email,
        nome: currentUser.email,
        role: "user",
        staff_role: "none",
        customer_tag: "free",
        academy_expires_at: null,
        total_spent: 0,
      });
    }
  }

  useEffect(() => {
    let mounted = true;

    async function startApp() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        const currentUser = session?.user ?? null;

        setUser(currentUser);
        currentUserIdRef.current = currentUser?.id ?? null;

        if (currentUser) {
          await loadProfile(currentUser);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.log("Erro ao iniciar app:", err);

        setUser(null);
        setProfile(null);
        currentUserIdRef.current = null;
      } finally {
        if (mounted) {
          setAppLoading(false);
        }
      }
    }

    startApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      const newUserId = currentUser?.id ?? null;

      if (event === "INITIAL_SESSION") return;
      if (event === "TOKEN_REFRESHED") return;

      if (!currentUser) {
        currentUserIdRef.current = null;
        setUser(null);
        setProfile(null);
        setAppLoading(false);
        return;
      }

      setUser(currentUser);

      if (currentUserIdRef.current === newUserId) {
        return;
      }

      currentUserIdRef.current = newUserId;
      setProfile(null);

      loadProfile(currentUser).finally(() => {
        setAppLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (appLoading) {
    return <LoadingScreen text="Carregando..." />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/obrigado" element={<ThankYou />} />

        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        <Route
          path="/checkout/academy"
          element={<CheckoutAcademy user={user} />}
        />

        <Route
          path="/academy"
          element={
            <ProtectedRoute user={user} profile={profile}>
              <Academy user={user} profile={profile} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <Dashboard user={user} profile={profile} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/minhas-entregas"
          element={
            <ProtectedRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <MyDeliveries />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <Settings user={user} profile={profile} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mural"
          element={
            <ProtectedRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <Mural user={user} profile={profile} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/pedidos"
          element={
            <StaffRoute user={user} profile={profile} allowedRoles={ORDERS_ROLES}>
              <DashboardLayout profile={profile}>
                <AdminOrders />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route
          path="/admin/assinaturas"
          element={
            <StaffRoute
              user={user}
              profile={profile}
              allowedRoles={ACADEMY_ACCESS_ROLES}
            >
              <DashboardLayout profile={profile}>
                <AdminSubscriptions />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <StaffRoute user={user} profile={profile} allowedRoles={USERS_ROLES}>
              <DashboardLayout profile={profile}>
                <AdminUsers />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route
          path="/admin/cursos"
          element={
            <StaffRoute
              user={user}
              profile={profile}
              allowedRoles={ACADEMY_ADMIN_ROLES}
            >
              <DashboardLayout profile={profile}>
                <AdminCourses />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route
          path="/admin/aulas"
          element={
            <StaffRoute
              user={user}
              profile={profile}
              allowedRoles={ACADEMY_ADMIN_ROLES}
            >
              <DashboardLayout profile={profile}>
                <AdminLessons />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route
          path="/admin/links"
          element={
            <StaffRoute
              user={user}
              profile={profile}
              allowedRoles={ACADEMY_ADMIN_ROLES}
            >
              <DashboardLayout profile={profile}>
                <AdminLinks />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <StaffRoute user={user} profile={profile} allowedRoles={USERS_ROLES}>
              <DashboardLayout profile={profile}>
                <Clients />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route
          path="/projetos"
          element={
            <StaffRoute user={user} profile={profile} allowedRoles={PROJECTS_ROLES}>
              <DashboardLayout profile={profile}>
                <Projects />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route
          path="/financeiro"
          element={
            <StaffRoute user={user} profile={profile} allowedRoles={FINANCE_ROLES}>
              <DashboardLayout profile={profile}>
                <Finance />
              </DashboardLayout>
            </StaffRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <FatorzAssistant user={user} profile={profile} />
    </BrowserRouter>
  );
}