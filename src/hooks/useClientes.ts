import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type AnyRow = Record<string, any>;

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

function getClientKey(client: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const email = String(client.email || "").toLowerCase().trim();
  const phone = String(client.phone || "").replace(/\D/g, "");
  const name = String(client.name || "").toLowerCase().trim();

  return email || phone || name || "cliente-sem-identificacao";
}

function normalizeLegacyOrder(order: AnyRow) {
  return {
    id: `order-${order.id}`,
    source: "orders",
    created_at: order.created_at,
    name: order.customer_name || "Cliente sem nome",
    email: order.customer_email || null,
    phone: order.customer_whatsapp || null,
    product_name: order.product_name || `Pedido #${order.id}`,
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

function normalizeSiteOrder(order: AnyRow) {
  return {
    id: `site-product-${order.id}`,
    source: "site_product_orders",
    created_at: order.created_at,
    name: order.customer_name || "Cliente sem nome",
    email: order.user_email || null,
    phone: order.customer_phone || null,
    product_name: order.product_name || `Produto #${order.product_id || order.id}`,
    status: order.status || "pending",
    amount: centsToMoney(order.amount_cents),
  };
}

function normalizePayment(payment: AnyRow) {
  return {
    id: `payment-${payment.id}`,
    source: "payments",
    created_at: payment.created_at,
    name: payment.client_name || "Cliente sem nome",
    email: null,
    phone: null,
    product_name: payment.product_name || `Pagamento #${payment.id}`,
    status: payment.status || "pendente",
    amount: moneyValue(payment.amount),
  };
}

export function useClientes() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadClientes() {
    setLoading(true);

    const [legacyOrdersResponse, siteOrdersResponse, paymentsResponse] =
      await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase
          .from("site_product_orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
      ]);

    const legacyOrders = legacyOrdersResponse.data || [];
    const siteOrders = siteOrdersResponse.data || [];
    const payments = paymentsResponse.data || [];

    const unified = [
      ...legacyOrders.map(normalizeLegacyOrder),
      ...siteOrders.map(normalizeSiteOrder),
      ...payments.map(normalizePayment),
    ].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    setOrders(unified);
    setLoading(false);
  }

  useEffect(() => {
    loadClientes();
  }, []);

  const clientes = useMemo(() => {
    const map = new Map<string, any>();

    orders.forEach((order) => {
      const key = getClientKey({
        name: order.name,
        email: order.email,
        phone: order.phone,
      });

      const current = map.get(key) || {
        key,
        name: order.name || "Cliente sem nome",
        email: order.email || null,
        phone: order.phone || null,
        totalOrders: 0,
        paidOrders: 0,
        totalSpent: 0,
        lastPurchaseAt: null,
        lastProduct: null,
        orders: [],
      };

      current.totalOrders += 1;
      current.orders.push(order);

      if (isPaid(order.status)) {
        current.paidOrders += 1;
        current.totalSpent += Number(order.amount || 0);
      }

      if (
        !current.lastPurchaseAt ||
        new Date(order.created_at) > new Date(current.lastPurchaseAt)
      ) {
        current.lastPurchaseAt = order.created_at;
        current.lastProduct = order.product_name;
      }

      if (!current.email && order.email) current.email = order.email;
      if (!current.phone && order.phone) current.phone = order.phone;
      if (current.name === "Cliente sem nome" && order.name) current.name = order.name;

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
      return (
        new Date(b.lastPurchaseAt || 0).getTime() -
        new Date(a.lastPurchaseAt || 0).getTime()
      );
    });
  }, [orders]);

  const metrics = useMemo(() => {
    const totalClientes = clientes.length;
    const clientesPagantes = clientes.filter((cliente) => cliente.paidOrders > 0).length;
    const receitaTotal = clientes.reduce(
      (sum, cliente) => sum + Number(cliente.totalSpent || 0),
      0
    );

    const maiorCliente = clientes[0] || null;

    return {
      totalClientes,
      clientesPagantes,
      receitaTotal,
      maiorCliente,
    };
  }, [clientes]);

  return {
    loading,
    clientes,
    orders,
    metrics,
    reload: loadClientes,
  };
}