import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { signIn, signUp } from "../services/auth";

export default function Login({ user }: { user?: any }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedMode = searchParams.get("mode") === "register" ? "register" : "login";
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [mode, setMode] = useState<"login" | "register">(requestedMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const title = useMemo(
    () => (mode === "register" ? "Criar conta FatorZ" : "Entrar na FatorZ"),
    [mode]
  );

  function setModeAndUrl(nextMode: "login" | "register") {
    setMode(nextMode);
    setMessage("");
    setErrorMessage("");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("mode", nextMode);
      if (!next.get("redirectTo")) next.set("redirectTo", redirectTo);
      return next;
    });
  }

  function validateFields() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Preencha e-mail e senha para continuar.");
      return false;
    }

    if (!email.includes("@")) {
      setErrorMessage("Informe um e-mail valido.");
      return false;
    }

    if (password.length < 6) {
      setErrorMessage("A senha precisa ter pelo menos 6 caracteres.");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    setMessage("");
    setErrorMessage("");

    if (!validateFields()) return;

    setLoading(true);

    try {
      if (mode === "register") {
        const result: any = await signUp(email.trim().toLowerCase(), password);

        if (result?.error) {
          setErrorMessage(result.error.message || "Nao foi possivel criar sua conta agora.");
          return;
        }

        const hasSession = Boolean(result?.data?.session || user);

        if (hasSession) {
          navigate(redirectTo || "/dashboard", { replace: true });
          return;
        }

        setMessage("Conta criada. Confira seu e-mail se a confirmacao estiver ativa e depois entre normalmente.");
        setModeAndUrl("login");
        return;
      }

      const result: any = await signIn(email.trim().toLowerCase(), password);

      if (result?.error) {
        setErrorMessage("E-mail ou senha incorretos.");
        return;
      }

      navigate(redirectTo || "/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    navigate(redirectTo || "/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#05050b] px-4 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(139,92,246,0.24),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.18),transparent_28%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <button
            onClick={() => navigate("/")}
            className="font-['Sora',sans-serif] text-2xl font-black"
          >
            FATOR<span className="text-[#8b5cf6]">Z</span>
          </button>

          <h1 className="mt-10 max-w-2xl font-['Sora',sans-serif] text-5xl font-black leading-tight">
            Acesse seu centro de controle e acompanhe sua evolucao.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
            Dashboard, pedidos, entregas, Academy e briefing em um unico lugar.
            Sua marca com mais direcao e menos improviso.
          </p>

          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              "Pedidos e pagamentos",
              "Entregas e progresso",
              "Academy e suporte",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-zinc-300">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[30px] border border-white/10 bg-[#0c0c16]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-8">
          <button
            onClick={() => navigate("/")}
            className="mb-8 font-['Sora',sans-serif] text-2xl font-black lg:hidden"
          >
            FATOR<span className="text-[#8b5cf6]">Z</span>
          </button>

          <div className="mb-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8b5cf6]">
              Conta FatorZ
            </p>
            <h1 className="mt-2 font-['Sora',sans-serif] text-3xl font-black">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {mode === "register"
                ? "Crie sua conta para acessar painel, entregas e compras."
                : "Entre para acessar seu painel, compras e conteudos."}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1">
            <button
              onClick={() => setModeAndUrl("login")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                mode === "login" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setModeAndUrl("register")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                mode === "register" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              Criar conta
            </button>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-zinc-300">E-mail</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="seuemail@gmail.com"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#8b5cf6]/70"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-zinc-300">Senha</span>
              <input
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                placeholder="Minimo 6 caracteres"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-[#8b5cf6]/70"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSubmit();
                }}
              />
            </label>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {message}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] px-5 py-4 font-black text-white shadow-[0_0_30px_rgba(139,92,246,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "register" ? "Criar conta" : "Entrar"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <button
            onClick={() => navigate("/")}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            Voltar para o site
          </button>
        </section>
      </div>
    </div>
  );
}
