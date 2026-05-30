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

function ProtectedRoute({ user, profile, children }: any) {
  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return <LoadingScreen text="Verificando acesso..." />;
  }

  return children;
}

function AdminRoute({ user, profile, children }: any) {
  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return <LoadingScreen text="Verificando permissões..." />;
  }

  if (profile?.role !== "admin") {
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
          academy_expires_at: null,
        });

        return;
      }

      const profileData =
        profileResponse.data || {
          id: currentUser.id,
          email: currentUser.email,
          nome: currentUser.email,
          role: "user",
          academy_expires_at: null,
        };

      setProfile({
        ...profileData,
        email: profileData.email || currentUser.email,
        role: isAdminFromDatabase ? "admin" : profileData.role || "user",
      });
    } catch (err) {
      if (profileRequestIdRef.current !== requestId) return;

      console.log("Erro inesperado ao carregar profile:", err);

      setProfile({
        id: currentUser.id,
        email: currentUser.email,
        nome: currentUser.email,
        role: "user",
        academy_expires_at: null,
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
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/pedidos"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <AdminOrders />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/assinaturas"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <AdminSubscriptions />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <AdminUsers />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/cursos"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <AdminCourses />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/aulas"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <AdminLessons />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/links"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <AdminLinks />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <Clients />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/projetos"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <Projects />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/financeiro"
          element={
            <AdminRoute user={user} profile={profile}>
              <DashboardLayout profile={profile}>
                <Finance />
              </DashboardLayout>
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}