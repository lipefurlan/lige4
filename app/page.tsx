"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Logo, Toast } from "@/components/ui";
import { getNickname, getPlayerId, saveNickname } from "@/lib/player";
import { CODE_PATTERN, NICKNAME_MAX, normalizeCode } from "@/lib/room";
import { multiplayerEnabled } from "@/lib/site";

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const online = multiplayerEnabled();

  useEffect(() => setNickname(getNickname()), []);

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  };

  const requireNick = () => {
    const nick = saveNickname(nickname);
    if (!nick) flash("Escolha um apelido primeiro");
    return nick;
  };

  async function createRoom() {
    const nick = requireNick();
    if (!nick) return;
    setBusy(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: getPlayerId(), nickname: nick }),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      if (!res.ok || !data.code) throw new Error(data.message ?? "Não foi possível criar a sala.");
      router.push(`/sala/${data.code}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Sem conexão. Tente de novo.");
      setBusy(false);
    }
  }

  function joinRoom(e: FormEvent) {
    e.preventDefault();
    if (!CODE_PATTERN.test(code)) return flash("O código tem 4 letras");
    if (!requireNick()) return;
    router.push(`/sala/${code}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <header className="flex flex-col items-center gap-2 text-center">
        <Logo size="xl" />
        <p className="text-lg text-white/70">Junte uma dupla e ligue quatro antes do outro.</p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-white/70">Seu apelido</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX}
          autoComplete="nickname"
          placeholder="Como vão te chamar no placar?"
          className="min-h-14 rounded-2xl bg-white/10 px-4 text-xl font-bold outline-none ring-1 ring-white/15 placeholder:text-base placeholder:font-medium placeholder:text-white/35 focus:ring-2 focus:ring-p2"
        />
      </label>

      {online ? (
        <section className="flex flex-col gap-5">
          <Button onClick={createRoom} disabled={busy} className="min-h-16 text-xl">
            {busy ? "Criando…" : "Criar sala"}
          </Button>

          <div className="flex items-center gap-3 text-sm font-semibold text-white/40">
            <span className="h-px flex-1 bg-white/15" /> ou entre numa sala <span className="h-px flex-1 bg-white/15" />
          </div>

          <form onSubmit={joinRoom} className="flex gap-3">
            <input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              placeholder="ABCD"
              aria-label="Código da sala"
              className="min-h-16 w-0 flex-1 rounded-2xl bg-white/10 px-4 text-center font-mono text-3xl font-extrabold tracking-[0.4em] uppercase outline-none ring-1 ring-white/15 placeholder:text-white/20 focus:ring-2 focus:ring-p2"
            />
            <Button type="submit" variant="yellow" className="min-h-16">
              Entrar
            </Button>
          </form>
        </section>
      ) : (
        <p className="rounded-2xl bg-p2/10 p-4 text-p2 ring-1 ring-p2/30">
          Multiplayer desligado: configure o Supabase no <code>.env.local</code> (veja o README). Dá para jogar contra o
          bot.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <Link
          href="/bot"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-white/8 text-lg font-extrabold ring-1 ring-white/15 active:bg-white/15"
        >
          🤖 Jogar contra o bot
        </Link>
        <Link href="/telao" className="text-center text-sm font-semibold text-white/50 underline-offset-4 hover:underline">
          Abrir o telão (placar ao vivo)
        </Link>
      </section>

      <Toast message={toast} />
    </main>
  );
}
