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
    <div className="rounded-[30px] border border-white/10 bg-[#08080d]/90 p-6">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff0096]">
        Análise financeira
      </p>

      <div className="mt-5 space-y-4">
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
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-xl font-black text-white">{value}</span>
    </div>
  );
}