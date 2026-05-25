import { useNavigate } from "react-router-dom";

export default function ThankYou() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-x-hidden">
      <header className="border-b border-zinc-800 bg-[#09090B]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-2xl md:text-3xl font-black"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <button
            onClick={() => navigate("/login")}
            className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-5 py-3 rounded-2xl font-black"
          >
            Entrar
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
          <div>
            <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-5 py-3 rounded-2xl font-black w-fit mb-6">
              Pedido iniciado
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-[0.95] mb-7">
              Obrigado pela compra.
            </h1>

            <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-2xl mb-8">
              Seu pedido foi registrado na FatorZ. Assim que o pagamento for
              aprovado, ele será confirmado no sistema e a produção poderá ser
              acompanhada pelo FatorZ Hub.
            </p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 mb-8 max-w-2xl">
              <h2 className="text-2xl font-black mb-4">O que acontece agora?</h2>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <span className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center font-black shrink-0">
                    1
                  </span>

                  <div>
                    <h3 className="font-black">Pagamento em análise</h3>
                    <p className="text-zinc-400">
                      O Mercado Pago confirma se o pagamento foi aprovado.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center font-black shrink-0">
                    2
                  </span>

                  <div>
                    <h3 className="font-black">Pedido aprovado</h3>
                    <p className="text-zinc-400">
                      Quando aprovado, o pedido aparece como confirmado no painel.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center font-black shrink-0">
                    3
                  </span>

                  <div>
                    <h3 className="font-black">Produção e entrega</h3>
                    <p className="text-zinc-400">
                      A FatorZ cria o projeto e libera o link final na área de
                      entregas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/login")}
                className="bg-pink-500 hover:bg-pink-600 px-8 py-5 rounded-2xl font-black text-lg"
              >
                Entrar no Hub
              </button>

              <button
                onClick={() => navigate("/minhas-entregas")}
                className="bg-white text-black hover:bg-zinc-200 px-8 py-5 rounded-2xl font-black text-lg"
              >
                Ver minhas entregas
              </button>

              <button
                onClick={() => navigate("/")}
                className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-8 py-5 rounded-2xl font-black text-lg"
              >
                Voltar aos planos
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-6 md:p-8">
            <div className="bg-black border border-zinc-800 rounded-[32px] p-6 md:p-8 mb-5">
              <p className="text-pink-500 font-black uppercase tracking-widest mb-4">
                FatorZ Hub
              </p>

              <h2 className="text-3xl md:text-5xl font-black mb-5">
                Acompanhe tudo em um só lugar.
              </h2>

              <p className="text-zinc-400 mb-7">
                No painel do cliente você consegue acessar a Academy, ver suas
                entregas e acompanhar os materiais liberados pela FatorZ.
              </p>

              <button
                onClick={() => navigate("/login")}
                className="w-full bg-white text-black hover:bg-zinc-200 px-6 py-4 rounded-2xl font-black"
              >
                Acessar minha conta
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-zinc-500 text-sm mb-1">Status</p>
                <h3 className="text-2xl font-black text-yellow-400">
                  Aguardando
                </h3>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl p-5">
                <p className="text-zinc-500 text-sm mb-1">Entrega</p>
                <h3 className="text-2xl font-black text-green-400">Hub</h3>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}