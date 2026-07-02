import type { LucideIcon } from "lucide-react";

type Card = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend: string;
};

type DashboardCardsProps = {
  cards: Card[];
};

export default function DashboardCards({ cards }: DashboardCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0c0c16] p-5 transition duration-200 hover:border-[#8b5cf6]/35 hover:bg-[#111120]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] opacity-0 transition group-hover:opacity-100" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">
                  {card.label}
                </p>

                <h3 className="truncate font-['Sora',sans-serif] text-2xl font-black tracking-tight text-white">
                  {card.value}
                </h3>

                <p className="mt-2 text-[11px] font-semibold leading-5 text-zinc-500 group-hover:text-emerald-300">
                  {card.trend}
                </p>
              </div>

              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#111120] text-[#8b5cf6] transition group-hover:border-[#8b5cf6]/35">
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-[#050509] text-[9px] font-black text-zinc-600">
                  {index + 1}
                </span>
                <Icon className="h-[16px] w-[16px]" strokeWidth={2.2} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
