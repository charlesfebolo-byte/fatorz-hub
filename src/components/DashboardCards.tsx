type Card = {
  icon: string;
  label: string;
  value: string | number;
  trend: string;
};

type DashboardCardsProps = {
  cards: Card[];
};

export default function DashboardCards({ cards }: DashboardCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#08080d]/90 p-5 shadow-[0_0_35px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#ff0096]/30 hover:shadow-[0_0_55px_rgba(255,0,150,0.14)]"
        >
          <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-[#ff0096]/10 blur-2xl transition duration-300 group-hover:bg-[#ff0096]/18" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-[#005cff]/10 blur-2xl transition duration-300 group-hover:bg-[#005cff]/18" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                {card.label}
              </p>

              <h3 className="truncate text-2xl font-black tracking-tight text-white md:text-3xl">
                {card.value}
              </h3>

              <p className="mt-2 text-[11px] font-black leading-5 text-emerald-300">
                {card.trend}
              </p>
            </div>

            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-xl shadow-[0_0_28px_rgba(0,0,0,0.35)] transition group-hover:scale-105 group-hover:border-[#ff0096]/30">
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-black text-[10px] font-black text-zinc-500">
                {index + 1}
              </span>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
