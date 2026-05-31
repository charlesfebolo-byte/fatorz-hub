import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type MuralProps = {
  user: any;
  profile: any;
};

type MuralPost = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  category: string;
  status: "published" | "archived";
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

type MuralReaction = {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

const allowedEmojis = ["🔥", "👏", "💡", "🚀", "❤️"];

export default function Mural({ user, profile }: MuralProps) {
  const [posts, setPosts] = useState<MuralPost[]>([]);
  const [reactions, setReactions] = useState<MuralReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Novidade");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    loadMural();
  }, []);

  async function loadMural() {
    setLoading(true);

    const { data: postsData, error: postsError } = await supabase
      .from("mural_posts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (postsError) {
      console.log("Erro ao carregar mural:", postsError);
      setLoading(false);
      return;
    }

    const loadedPosts = (postsData || []) as MuralPost[];
    setPosts(loadedPosts);

    if (loadedPosts.length === 0) {
      setReactions([]);
      setLoading(false);
      return;
    }

    const postIds = loadedPosts.map((post) => post.id);

    const { data: reactionsData, error: reactionsError } = await supabase
      .from("mural_reactions")
      .select("*")
      .in("post_id", postIds);

    if (reactionsError) {
      console.log("Erro ao carregar reações:", reactionsError);
    }

    setReactions((reactionsData || []) as MuralReaction[]);
    setLoading(false);
  }

  const reactionsByPost = useMemo(() => {
    const result: Record<
      string,
      {
        counts: Record<string, number>;
        mine: string | null;
      }
    > = {};

    posts.forEach((post) => {
      result[post.id] = {
        counts: {},
        mine: null,
      };

      allowedEmojis.forEach((emoji) => {
        result[post.id].counts[emoji] = 0;
      });
    });

    reactions.forEach((reaction) => {
      if (!result[reaction.post_id]) return;

      result[reaction.post_id].counts[reaction.emoji] =
        (result[reaction.post_id].counts[reaction.emoji] || 0) + 1;

      if (reaction.user_id === user?.id) {
        result[reaction.post_id].mine = reaction.emoji;
      }
    });

    return result;
  }, [posts, reactions, user?.id]);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function createPost() {
    if (!isAdmin) return;

    if (!title.trim() || !content.trim()) {
      alert("Preencha título e conteúdo.");
      return;
    }

    setPosting(true);

    const { error } = await supabase.from("mural_posts").insert({
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || "Novidade",
      pinned,
      status: "published",
    });

    setPosting(false);

    if (error) {
      console.log("Erro ao publicar no mural:", error);
      alert("Não consegui publicar no mural.");
      return;
    }

    setTitle("");
    setContent("");
    setCategory("Novidade");
    setPinned(false);

    await loadMural();
  }

  async function reactToPost(postId: string, emoji: string) {
    if (!user?.id) return;

    const currentReaction = reactions.find(
      (reaction) => reaction.post_id === postId && reaction.user_id === user.id
    );

    if (currentReaction?.emoji === emoji) {
      const { error } = await supabase
        .from("mural_reactions")
        .delete()
        .eq("id", currentReaction.id);

      if (error) {
        console.log("Erro ao remover reação:", error);
        return;
      }

      setReactions((prev) =>
        prev.filter((reaction) => reaction.id !== currentReaction.id)
      );

      return;
    }

    const { data, error } = await supabase
      .from("mural_reactions")
      .upsert(
        {
          post_id: postId,
          user_id: user.id,
          emoji,
        },
        {
          onConflict: "post_id,user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.log("Erro ao reagir:", error);
      return;
    }

    const savedReaction = data as MuralReaction;

    setReactions((prev) => {
      const withoutOld = prev.filter(
        (reaction) =>
          !(reaction.post_id === postId && reaction.user_id === user.id)
      );

      return [...withoutOld, savedReaction];
    });
  }

  async function togglePinned(post: MuralPost) {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("mural_posts")
      .update({
        pinned: !post.pinned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      console.log("Erro ao fixar post:", error);
      return;
    }

    await loadMural();
  }

  async function archivePost(post: MuralPost) {
    if (!isAdmin) return;

    const confirmArchive = confirm("Arquivar essa publicação do mural?");

    if (!confirmArchive) return;

    const { error } = await supabase
      .from("mural_posts")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      console.log("Erro ao arquivar post:", error);
      alert("Não consegui arquivar.");
      return;
    }

    await loadMural();
  }

  const totalReactions = reactions.length;

  return (
    <div className="max-w-7xl mx-auto text-white">
      <section className="relative overflow-hidden rounded-[42px] border border-white/10 bg-black p-6 md:p-10 mb-8">
        <div className="absolute -top-28 -right-24 h-80 w-80 rounded-full bg-[#005cff]/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#ff0096]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(145,35,255,0.20),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_38%)]" />

        <div className="relative grid xl:grid-cols-[1.1fr_380px] gap-8 items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/25 bg-pink-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-pink-300 mb-6">
              Mural FatorZ
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
              Notícias, avisos e atualizações{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096]">
                sem bagunça.
              </span>
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-3xl">
              Um espaço controlado pela FatorZ: somente admins publicam, os
              membros acompanham e reagem com emojis seguros.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-zinc-950/90 p-6">
            <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">
              Status do mural
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-3xl bg-black border border-white/10 p-5">
                <p className="text-4xl font-black">{posts.length}</p>
                <p className="text-zinc-500 text-sm mt-1">publicações</p>
              </div>

              <div className="rounded-3xl bg-black border border-white/10 p-5">
                <p className="text-4xl font-black">{totalReactions}</p>
                <p className="text-zinc-500 text-sm mt-1">reações</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-[40px] border border-white/10 bg-zinc-950/85 p-6 md:p-8 mb-8">
          <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-6">
            <div>
              <p className="text-pink-500 font-black uppercase tracking-widest mb-3">
                Publicar como admin
              </p>

              <h2 className="text-3xl md:text-4xl font-black mb-3">
                Nova publicação no mural.
              </h2>

              <p className="text-zinc-400 leading-relaxed">
                Use para avisos, novidades, atualizações da Academy, mudança de
                agenda, lançamento de aula ou comunicado para clientes.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-[1fr_180px] gap-4">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Título da publicação"
                  className="rounded-3xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-pink-500"
                />

                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Categoria"
                  className="rounded-3xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-pink-500"
                />
              </div>

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Escreva o aviso, notícia ou atualização..."
                rows={5}
                className="w-full rounded-3xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-pink-500 resize-none"
              />

              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <label className="flex items-center gap-3 text-zinc-300 font-bold">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(event) => setPinned(event.target.checked)}
                    className="h-5 w-5 accent-pink-500"
                  />
                  Fixar no topo
                </label>

                <button
                  onClick={createPost}
                  disabled={posting}
                  className="bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] hover:opacity-90 disabled:opacity-60 px-8 py-4 rounded-2xl font-black transition"
                >
                  {posting ? "Publicando..." : "Publicar no mural"}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-5">
        {loading ? (
          <div className="rounded-[36px] border border-white/10 bg-zinc-950/85 p-8 text-zinc-400">
            Carregando mural...
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-[36px] border border-white/10 bg-zinc-950/85 p-8">
            <h2 className="text-3xl font-black mb-3">Mural vazio por enquanto.</h2>
            <p className="text-zinc-400">
              Assim que a FatorZ publicar uma novidade, ela vai aparecer aqui.
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const reactionInfo = reactionsByPost[post.id] || {
              counts: {},
              mine: null,
            };

            return (
              <article
                key={post.id}
                className={`rounded-[36px] border bg-zinc-950/85 p-6 md:p-8 ${
                  post.pinned
                    ? "border-pink-500/35 shadow-2xl shadow-pink-500/10"
                    : "border-white/10"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      {post.pinned && (
                        <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-pink-300">
                          Fixado
                        </span>
                      )}

                      <span className="rounded-full border border-white/10 bg-black px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-400">
                        {post.category}
                      </span>

                      <span className="text-zinc-600 text-sm font-bold">
                        {formatDate(post.created_at)} às {formatTime(post.created_at)}
                      </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black mb-4">
                      {post.title}
                    </h2>

                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex lg:flex-col gap-2 shrink-0">
                      <button
                        onClick={() => togglePinned(post)}
                        className="rounded-2xl border border-white/10 bg-black hover:bg-white/10 px-4 py-3 text-sm font-black transition"
                      >
                        {post.pinned ? "Desfixar" : "Fixar"}
                      </button>

                      <button
                        onClick={() => archivePost(post)}
                        className="rounded-2xl border border-red-500/20 bg-red-950/20 hover:bg-red-600 px-4 py-3 text-sm font-black transition"
                      >
                        Arquivar
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-7 pt-5 border-t border-white/10">
                  <p className="text-xs text-zinc-500 font-black uppercase tracking-widest mb-3">
                    Reagir
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {allowedEmojis.map((emoji) => {
                      const active = reactionInfo.mine === emoji;
                      const count = reactionInfo.counts[emoji] || 0;

                      return (
                        <button
                          key={emoji}
                          onClick={() => reactToPost(post.id, emoji)}
                          className={`rounded-2xl border px-4 py-3 font-black transition ${
                            active
                              ? "border-pink-500/60 bg-pink-500/15 text-white"
                              : "border-white/10 bg-black hover:bg-white/10 text-zinc-300"
                          }`}
                        >
                          <span className="mr-2">{emoji}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
