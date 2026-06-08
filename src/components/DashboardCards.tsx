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
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#08080d]/90 p-5 shadow-[0_0_35px_rgba(0,0,0,0.35)]"
        >
          <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-white/5 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                {card.label}
              </p>

              <h3 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                {card.value}
              </h3>

              <p className="mt-2 text-[11px] font-black text-emerald-300">
                {card.trend}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}