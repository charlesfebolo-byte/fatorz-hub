import { formatMoney } from "../hooks/useDashboard";

type FinanceiroResumoProps = {
  metrics: {
    revenueToday: number;
    revenueYesterday: number;
    revenueMonth: number;
    revenueLastMonth: number;
    revenueTotal: number;
    pendingValue: number;
    averageTicket: number;
  };
};

export default function FinanceiroResumo({ metrics }: FinanceiroResumoProps) {
  return (
    <div className="rounded-[14px] border border-white/[0.07] bg-[#0c0c16] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b5cf6]">
        Análise financeira
      </p>

      <div className="mt-5 divide-y divide-white/[0.07]">
        <Line label="Hoje" value={formatMoney(metrics.revenueToday)} />
        <Line label="Ontem" value={formatMoney(metrics.revenueYesterday)} />
        <Line label="Este mês" value={formatMoney(metrics.revenueMonth)} />
        <Line label="Mês passado" value={formatMoney(metrics.revenueLastMonth)} />
        <Line label="Receita total" value={formatMoney(metrics.revenueTotal)} />
        <Line label="Pendente" value={formatMoney(metrics.pendingValue)} />
        <Line label="Ticket médio" value={formatMoney(metrics.averageTicket)} />
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="font-mono text-sm font-bold text-white">{value}</span>
    </div>
  );
}
