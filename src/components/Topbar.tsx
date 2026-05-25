export default function Topbar({ user }: any) {
  return (
    <div className="w-full h-[80px] border-b border-zinc-800 flex items-center justify-between px-8">
      <div>
        <h2 className="text-white text-2xl font-bold">
          Dashboard
        </h2>

        <p className="text-zinc-400 text-sm">
          Bem-vindo de volta
        </p>
      </div>

      <div className="bg-zinc-900 px-4 py-2 rounded-xl text-white">
        {user.email}
      </div>
    </div>
  );
}