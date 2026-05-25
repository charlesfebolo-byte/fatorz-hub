export default function Card({ title, value }: any) {
  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
      <h3 className="text-zinc-400 text-sm mb-2">
        {title}
      </h3>

      <p className="text-white text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}