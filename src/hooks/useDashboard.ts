import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type UseDashboardProps = {
  user: any;
  profile: any;
};

type AnyRow = Record<string, any>;

function moneyValue(value: any) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const clean = String(value)
    .replace("R$", "")
    .replace("/mês", "")
    .replace("/mes", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function centsToMoney(value: any) {
  return Number(value || 0) / 100;
}

function normalizeStatus(status: any) {
  return String(status || "").toLowerCase().trim();
}

function isPaid(status: any) {
  return [
    "paid",
    "pago",
    "approved",
    "aprovado",
    "completed",
    "concluido",
    "concluído",
    "success",
    "succeeded",
    "project_created",
  ].includes(normalizeStatus(status));
}

function isPending(status: any) {
  return [
    "",
    "pending",
    "pendente",
    "processing",
    "in_progress",
    "andamento",
    "em andamento",
  ].includes(normalizeStatus(status));
}

function isCancelled(status: any) {
  return [
    "cancelled",
    "canceled",
    "cancelado",
    "refunded",
    "reembolsado",
  ].includes(normalizeStatus(status));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function between(value: string | null, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date < end;
}

function getStaffRole(profile: any) {
  if (profile?.staff_role) return profile.staff_role;
  if (profile?.role === "admin") return "ceo_fatorz";
  return "none";
}

function normalizeLegacyOrder(order: AnyRow) {
  return {
    id: `order-${order.id}`,
    source: "orders",
    rawId: order.id,
    created_at: order.created_at,
    customer_name: order.customer_name || null,
    customer_email: order.customer_email || null,
    customer_phone: order.customer_whatsapp || null,
    product_name: order.product_name || `Pedido #${order.id}`,
    product_category: order.product_category || "Pedido antigo",
    status: order.status || "pending",
    amount: moneyValue(
      order.product_price ??
        order.amount ??
        order.total_amount ??
        order.total ??
        order.price ??
        order.value
    ),
  };
}

function normalizeSiteProductOrder(order: AnyRow) {
  return {
    id: `site-product-${order.id}`,
    source: "site_product_orders",
    rawId: order.id,
    created_at: order.created_at,
    customer_name: order.customer_name || null,
    customer_email: order.user_email || null,
    customer_phone: order.customer_phone || null,
    product_name: order.product_name || `Produto #${order.product_id || order.id}`,
    product_category: order.product_category || order.product_type || "Produto",
    status: order.status || "pending",
    amount: centsToMoney(order.amount_cents),
  };
}

function normalizePayment(payment: AnyRow) {
  return {
    id: `payment-${payment.id}`,
    source: "payments",
    rawId: payment.id,
    created_at: payment.created_at,
    customer_name: payment.client_name || null,
    customer_email: null,
    customer_phone: null,
    product_name: payment.product_name || `Pagamento #${payment.id}`,
    product_category: "Financeiro manual",
    status: payment.status || "pendente",
    amount: moneyValue(payment.amount),
  };
}

export function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function useDashboard({ user, profile }: UseDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [coursePurchases, setCoursePurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const staffRole = getStaffRole(profile);
  const isTeam = staffRole !== "none";

  async function loadDashboard() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [
      legacyOrdersResponse,
      siteOrdersResponse,
      paymentsResponse,
      clientsResponse,
      projectsResponse,
      coursesResponse,
      purchasesResponse,
    ] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("site_product_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("course_purchases").select("*").order("created_at", { ascending: false }),
    ]);

    const legacyOrders = legacyOrdersResponse.data || [];
    const siteOrders = siteOrdersResponse.data || [];
    const payments = paymentsResponse.data || [];

    const unified = [
      ...legacyOrders.map(normalizeLegacyOrder),
      ...siteOrders.map(normalizeSiteProductOrder),
      ...payments.map(normalizePayment),
    ].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    const scopedOrders = isTeam
      ? unified
      : unified.filter((item) => {
          const email = String(user.email || "").toLowerCase();
          return String(item.customer_email || "").toLowerCase() === email;
        });

    setOrders(scopedOrders);
    setClients(clientsResponse.data || []);
    setProjects(projectsResponse.data || []);
    setCourses(coursesResponse.data || []);
    setCoursePurchases(purchasesResponse.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, [user?.id, user?.email, profile?.staff_role, profile?.role]);

  const metrics = useMemo(() => {
    const now = new Date();

    const todayStart = startOfDay(now);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const monthStart = startOfMonth(now);
    const nextMonthStart = endOfMonth(now);

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);

    const paidOrders = orders.filter((item) => isPaid(item.status));
    const pendingOrders = orders.filter((item) => isPending(item.status));
    const cancelledOrders = orders.filter((item) => isCancelled(item.status));

    const sum = (items: any[]) =>
      items.reduce((total, item) => total + Number(item.amount || 0), 0);

    const revenueToday = sum(
      paidOrders.filter((item) => between(item.created_at, todayStart, tomorrowStart))
    );

    const revenueYesterday = sum(
      paidOrders.filter((item) => between(item.created_at, yesterdayStart, todayStart))
    );

    const revenueMonth = sum(
      paidOrders.filter((item) => between(item.created_at, monthStart, nextMonthStart))
    );

    const revenueLastMonth = sum(
      paidOrders.filter((item) => between(item.created_at, lastMonthStart, lastMonthEnd))
    );

    const revenueTotal = sum(paidOrders);
    const pendingValue = sum(pendingOrders);
    const cancelledValue = sum(cancelledOrders);

    return {
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      cancelledOrders: cancelledOrders.length,
      revenueToday,
      revenueYesterday,
      revenueMonth,
      revenueLastMonth,
      revenueTotal,
      pendingValue,
      cancelledValue,
      averageTicket: paidOrders.length ? revenueTotal / paidOrders.length : 0,
      activeClients: clients.filter((client) => client.status === "Ativo").length,
      totalClients: clients.length,
      activeProjects: projects.filter((project) =>
        ["pendente", "em andamento", "em revisão", "aguardando cliente"].includes(
          normalizeStatus(project.status)
        )
      ).length,
      totalProjects: projects.length,
    };
  }, [orders, clients, projects]);

  const productRanking = useMemo(() => {
    const map = new Map<string, any>();

    orders.forEach((order) => {
      const name = order.product_name || "Produto sem nome";

      const current = map.get(name) || {
        name,
        category: order.product_category || "Sem categoria",
        totalOrders: 0,
        paidOrders: 0,
        pendingOrders: 0,
        revenue: 0,
        pendingValue: 0,
        lastSale: null,
      };

      current.totalOrders += 1;

      if (isPaid(order.status)) {
        current.paidOrders += 1;
        current.revenue += Number(order.amount || 0);
      }

      if (isPending(order.status)) {
        current.pendingOrders += 1;
        current.pendingValue += Number(order.amount || 0);
      }

      if (!current.lastSale || new Date(order.created_at) > new Date(current.lastSale)) {
        current.lastSale = order.created_at;
      }

      map.set(name, current);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.paidOrders !== a.paidOrders) return b.paidOrders - a.paidOrders;
      return b.totalOrders - a.totalOrders;
    });
  }, [orders]);

  return {
    loading,
    isTeam,
    staffRole,
    orders,
    clients,
    projects,
    courses,
    coursePurchases,
    metrics,
    productRanking,
    reload: loadDashboard,
  };
}