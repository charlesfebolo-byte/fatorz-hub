import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Lock, Send, Sparkles, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type AssistantResponse = {
  answer?: string | null;
  remaining?: number | null;
  limit?: number | null;
  used?: number | null;
  error?: string | null;
};

type FatorzAssistantEvent = CustomEvent<{
  prompt?: string;
  autoSend?: boolean;
}>;

const JACK_AVATAR = "/jack-avatar.png";

const STARTER_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Oi, eu sou o Jack, assistente da FatorZ. Posso te ajudar com conteúdo, Instagram, briefing, entregas, Academy e próximos passos da sua marca.",
  },
];

const QUICK_PROMPTS = [
  "Jack, qual é meu próximo passo no Hub?",
  "Me dê ideias de post para meu nicho",
  "Como melhorar meu Instagram hoje?",
  "Crie um roteiro de Reels simples",
];

function isAcademyActive(profile: any) {
  if (!profile) return false;

  const activeByDate =
    !!profile?.academy_expires_at &&
    new Date(profile.academy_expires_at).getTime() > new Date().getTime();

  return profile?.role === "admin" || profile?.role === "premium" || activeByDate;
}

function normalizeText(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

function JackAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-[#ff0096]/40 bg-black shadow-[0_0_26px_rgba(255,0,150,0.28)] ${sizes[size]}`}
    >
      <img
        src={JACK_AVATAR}
        alt="Jack, assistente FatorZ"
        className="h-full w-full object-cover"
        loading="lazy"
      />

      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
    </div>
  );
}

export default function FatorzAssistant({ user, profile }: any) {
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<{
    remaining: number | null;
    limit: number | null;
    used: number | null;
  }>({
    remaining: null,
    limit: null,
    used: null,
  });

  const [playerVisible, setPlayerVisible] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isLogged = !!user;
  const hasAcademy = isAcademyActive(profile);

  const shouldHideOnPlayer =
    location.pathname.includes("/academy") && playerVisible;

  const isCheckout = location.pathname.includes("/checkout");
  const isLogin = location.pathname.includes("/login");

  const shouldHideCompletely = isCheckout || isLogin || shouldHideOnPlayer;

  const dailyLabel = useMemo(() => {
    if (!isLogged) return "Entre para usar";
    if (usage.remaining === null || usage.limit === null) return "Jack online";
    return `${usage.remaining}/${usage.limit} usos hoje`;
  }, [isLogged, usage.remaining, usage.limit]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const player = document.getElementById("player");

      if (!player) {
        setPlayerVisible(false);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          setPlayerVisible(entry.isIntersecting && entry.intersectionRatio > 0.18);
        },
        {
          threshold: [0, 0.18, 0.35],
        }
      );

      observer.observe(player);

      return () => observer.disconnect();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleOpenAssistant(event: Event) {
      const customEvent = event as FatorzAssistantEvent;
      const prompt = customEvent.detail?.prompt?.trim() || "";
      const autoSend = customEvent.detail?.autoSend === true;

      setOpen(true);
      setMinimized(false);

      if (prompt) {
        setInput(prompt);

        window.setTimeout(() => {
          textareaRef.current?.focus();

          if (autoSend) {
            sendMessage(prompt);
          }
        }, 120);
      }
    }

    window.addEventListener("fatorz:open-assistant", handleOpenAssistant);

    return () => {
      window.removeEventListener("fatorz:open-assistant", handleOpenAssistant);
    };
  }, [loading, isLogged, messages, profile, user, location.pathname, hasAcademy]);

  function addAssistantMessage(content: string) {
    setMessages((prev): ChatMessage[] => [
      ...prev,
      {
        role: "assistant",
        content,
      },
    ]);
  }

  function updateUsage(data: AssistantResponse | null | undefined) {
    if (
      typeof data?.remaining === "number" &&
      typeof data?.limit === "number" &&
      typeof data?.used === "number"
    ) {
      setUsage({
        remaining: data.remaining,
        limit: data.limit,
        used: data.used,
      });
    }
  }

  function handleQuickPrompt(prompt: string) {
    if (!isLogged) {
      setOpen(true);
      addAssistantMessage(
        "Pra usar o Jack com IA, primeiro entre na sua conta. Assim eu consigo proteger o uso e manter seu limite diário organizado."
      );
      return;
    }

    setInput(prompt);
    setOpen(true);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }

  async function sendMessage(customText?: string) {
    const text = (customText || input).trim();

    if (!text || loading) return;

    setOpen(true);

    if (!isLogged) {
      setMessages((prev): ChatMessage[] => [
        ...prev,
        { role: "user", content: text },
        {
          role: "assistant",
          content:
            "Pra eu responder usando IA dentro do Hub, você precisa entrar na sua conta. Isso protege o assistente, evita abuso e mantém seu limite diário organizado.",
        },
      ]);

      setInput("");
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke<AssistantResponse>(
        "fatorz-ai-assistant",
        {
          body: {
            message: text,
            context: {
              page: location.pathname,
              userName: profile?.nome || user?.email || "usuário",
              role: profile?.role || "user",
              academyActive: hasAcademy,
            },
            history: nextMessages.slice(-8).map((item) => ({
              role: item.role,
              content: item.content,
            })),
          },
        }
      );

      if (error) {
        console.log("Erro no Jack:", error);

        setMessages((prev): ChatMessage[] => [
          ...prev,
          {
            role: "assistant",
            content:
              "Não consegui responder agora. Confere se a função `fatorz-ai-assistant` está publicada no Supabase e se a chave GEMINI_API_KEY foi configurada.",
          },
        ]);

        return;
      }

      if (data?.error) {
        const assistantErrorMessage = normalizeText(
          data.error,
          "O Jack encontrou um erro, mas não recebeu uma mensagem clara do servidor."
        );

        setMessages((prev): ChatMessage[] => [
          ...prev,
          {
            role: "assistant",
            content: assistantErrorMessage,
          },
        ]);

        updateUsage(data);
        return;
      }

      const assistantAnswer = normalizeText(
        data?.answer,
        "Não consegui montar uma resposta boa agora. Tenta me mandar a dúvida com um pouco mais de contexto."
      );

      setMessages((prev): ChatMessage[] => [
        ...prev,
        {
          role: "assistant",
          content: assistantAnswer,
        },
      ]);

      updateUsage(data);
    } catch (err) {
      console.log("Erro inesperado no Jack:", err);

      setMessages((prev): ChatMessage[] => [
        ...prev,
        {
          role: "assistant",
          content:
            "Deu erro ao chamar a IA. O visual do Jack está pronto, mas a função do Supabase precisa estar publicada e configurada.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (shouldHideCompletely) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] pointer-events-none md:bottom-6 md:right-6">
      {open && !minimized && (
        <div className="pointer-events-auto mb-4 h-[650px] max-h-[calc(100vh-120px)] w-[calc(100vw-32px)] max-w-[430px] overflow-hidden rounded-[34px] border border-white/10 bg-[#050508]/95 text-white shadow-[0_30px_120px_rgba(0,0,0,0.78)] backdrop-blur-2xl">
          <div className="relative overflow-hidden border-b border-white/10 p-5">
            <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#ff0096]/20 blur-3xl" />
            <div className="absolute -left-16 -bottom-20 h-44 w-44 rounded-full bg-[#005cff]/20 blur-3xl" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <JackAvatar size="lg" />

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-pink-400">
                    Assistente FatorZ
                  </p>

                  <h2 className="mt-1 text-2xl font-black leading-tight">
                    Jack
                  </h2>

                  <p className="mt-1 text-xs font-bold text-emerald-300">
                    Online agora · {dailyLabel}
                  </p>

                  <p className="mt-2 max-w-[250px] text-xs leading-5 text-zinc-500">
                    Presença, conteúdo, briefing e próximos passos da sua marca.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setMinimized(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                  title="Minimizar"
                >
                  <ChevronDown size={18} />
                </button>

                <button
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100%-142px)] flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && <JackAvatar size="sm" />}

                    <div
                      className={`max-w-[82%] whitespace-pre-line rounded-[24px] px-4 py-3 text-sm leading-6 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] text-white"
                          : "border border-white/10 bg-white/[0.055] text-zinc-200"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start gap-2">
                    <JackAvatar size="sm" />
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-zinc-400">
                      O Jack está pensando na melhor resposta...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {messages.length <= 1 && (
              <div className="border-t border-white/10 px-4 py-3">
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left text-xs font-bold text-zinc-300 transition hover:border-pink-500/60 hover:text-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-white/10 p-4">
              {!isLogged && (
                <div className="mb-3 rounded-2xl border border-pink-500/20 bg-pink-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <Lock className="mt-0.5 shrink-0 text-pink-400" size={16} />
                    <p className="text-xs font-bold leading-5 text-zinc-300">
                      Entre na conta para conversar com o Jack e manter seu limite diário protegido.
                    </p>
                  </div>

                  <button
                    onClick={() => navigate("/login")}
                    className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-black hover:bg-zinc-200"
                  >
                    Entrar no Hub
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isLogged
                      ? "Fale com o Jack sobre conteúdo, entregas, briefing..."
                      : "Entre para usar o Jack..."
                  }
                  rows={2}
                  disabled={loading}
                  className="max-h-28 min-h-[52px] flex-1 resize-none rounded-2xl border border-[#ff0096]/50 bg-black/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-pink-400 disabled:opacity-60"
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] text-white shadow-[0_0_28px_rgba(255,0,150,0.24)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Enviar"
                >
                  <Send size={19} />
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] font-bold text-zinc-600">
                Não compartilhe senhas, documentos ou dados sensíveis no chat.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        className="pointer-events-auto group flex items-center gap-3 rounded-full border border-white/10 bg-black/85 px-3 py-3 text-white shadow-[0_18px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-pink-500/60"
      >
        <JackAvatar size="md" />

        <div className="hidden pr-2 text-left sm:block">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-400">
            Assistente
          </p>

          <p className="flex items-center gap-1 text-sm font-black text-white">
            Jack <Sparkles size={14} className="text-pink-400" />
          </p>
        </div>
      </button>
    </div>
  );
}
