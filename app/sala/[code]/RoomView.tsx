"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Board } from "@/components/Board";
import { Button, LiveBadge, Logo, NicknameForm, QrCard, Toast } from "@/components/ui";
import type { Player } from "@/lib/game/board";
import { getNickname, getPlayerId, saveNickname } from "@/lib/player";
import { CODE_PATTERN, seatColor, type Room, type Seat } from "@/lib/room";
import { multiplayerEnabled, siteOrigin } from "@/lib/site";
import { useRoom } from "@/lib/useRoom";

const COLOR_NAME: Record<Player, string> = { 1: "Vermelho", 2: "Amarelo" };

type JoinState = { kind: "need-nick" } | { kind: "joining" } | { kind: "joined"; seat: Seat } | { kind: "error"; message: string };

interface ApiResponse {
  room?: Room;
  seat?: Seat;
  error?: string;
  message?: string;
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: ApiResponse }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({ message: "Erro no servidor." }))) as ApiResponse;
  return { ok: res.ok, status: res.status, data };
}

export function RoomView({ code }: { code: string }) {
  const valid = CODE_PATTERN.test(code);
  const { room, notFound, status, accept, resync } = useRoom(code);
  const [join, setJoin] = useState<JoinState>({ kind: "joining" });
  const [nickname, setNickname] = useState("");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => setUrl(`${siteOrigin()}/sala/${code}`), [code]);

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const doJoin = useCallback(
    async (nick: string) => {
      setJoin({ kind: "joining" });
      try {
        const { ok, data } = await post(`/api/rooms/${code}/join`, { playerId: getPlayerId(), nickname: nick });
        if (!ok || !data.seat) return setJoin({ kind: "error", message: data.message ?? "Não foi possível entrar." });
        setJoin({ kind: "joined", seat: data.seat });
        void resync();
      } catch {
        setJoin({ kind: "error", message: "Sem conexão. Tente de novo." });
      }
    },
    [code, resync],
  );

  useEffect(() => {
    if (!valid || !multiplayerEnabled()) return;
    const nick = getNickname();
    setNickname(nick);
    if (nick) void doJoin(nick);
    else setJoin({ kind: "need-nick" });
  }, [valid, doJoin]);

  const myColor = join.kind === "joined" ? seatColor(join.seat) : null;
  const isPlaying = room?.status === "playing";
  const myTurn = isPlaying && myColor !== null && room.current_turn === myColor;

  async function play(column: number) {
    if (!room || !myTurn || pending) return;
    setPending(true);
    navigator.vibrate?.(12);
    try {
      const { ok, data } = await post("/api/move", { roomId: room.id, playerId: getPlayerId(), column });
      if (ok && data.room) accept(data.room);
      else {
        // Turno, corrida ou coluna cheia: o banco manda. Re-sincroniza e avisa.
        if (data.error !== "stale") flash(data.message ?? "Jogada recusada.");
        await resync();
      }
    } catch {
      flash("Sem conexão. Sincronizando…");
      await resync();
    } finally {
      setPending(false);
    }
  }

  async function rematch() {
    if (!room) return;
    setPending(true);
    try {
      const { ok, data } = await post(`/api/rooms/${code}/rematch`, { playerId: getPlayerId() });
      if (ok && data.room) accept(data.room);
      else await resync();
    } catch {
      flash("Sem conexão. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  if (!multiplayerEnabled()) {
    return (
      <Centered>
        <p className="text-xl">Multiplayer desligado: configure o Supabase (veja o README).</p>
        <Link href="/bot" className="font-bold text-p2 underline">
          Jogar contra o bot
        </Link>
      </Centered>
    );
  }

  if (!valid || notFound || (join.kind === "error" && join.message === "Sala não encontrada.")) {
    return (
      <Centered>
        <p className="text-6xl font-extrabold tracking-[0.2em]">{code}</p>
        <p className="text-xl text-white/70">Sala não encontrada. Confira o código.</p>
        <Link href="/" className="font-bold text-p2 underline">
          Voltar ao início
        </Link>
      </Centered>
    );
  }

  if (join.kind === "need-nick") {
    return (
      <Centered>
        <NicknameForm
          title={`Entrar na sala ${code}`}
          initial={nickname}
          submitLabel="Entrar"
          onSubmit={(value) => {
            const nick = saveNickname(value);
            if (nick) void doJoin(nick);
          }}
        />
      </Centered>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3 px-1">
        <Logo />
        <div className="flex items-center gap-2">
          <LiveBadge status={status} />
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="rounded-xl bg-white/10 px-3 py-2 text-left leading-none ring-1 ring-white/15 active:bg-white/20 lg:hidden"
            aria-label="Mostrar QR code da sala"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/50">sala</span>
            <span className="font-mono text-2xl font-extrabold tracking-[0.15em]">{code}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 lg:flex-row lg:items-center lg:gap-12">
        <div className="flex w-full max-w-[560px] flex-col gap-3">
          <Players room={room} myColor={myColor} />
          <TurnBanner room={room} myColor={myColor} pending={pending} joining={join.kind === "joining"} />
          {room ? (
            <Board
              board={room.board}
              winningCells={room.winning_cells}
              lastMove={room.last_move}
              gameKey={room.game_number}
              finished={room.status === "finished"}
              playable={myTurn && !pending ? myColor : null}
              onColumn={play}
            />
          ) : (
            <div className="board-face mx-auto aspect-[7/6] w-full animate-pulse rounded-3xl opacity-40" />
          )}
          {room?.status === "finished" &&
            (myColor ? (
              <Button variant="yellow" onClick={rematch} disabled={pending} className="mx-auto min-w-56">
                Revanche
              </Button>
            ) : (
              <p className="text-center text-white/60">Aguardando os jogadores pedirem revanche…</p>
            ))}
          {join.kind === "error" && (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-p1">{join.message}</p>
              <Button variant="ghost" onClick={() => void doJoin(getNickname())}>
                Tentar de novo
              </Button>
            </div>
          )}
        </div>

        <aside className="hidden flex-col items-center gap-4 lg:flex">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/50">código da sala</p>
          <p className="font-mono text-8xl font-extrabold tracking-[0.12em]">{code}</p>
          {url && <QrCard url={url} size={240} caption={url} />}
        </aside>
      </div>

      {showQr && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-ink/95 p-6 backdrop-blur"
          onClick={() => setShowQr(false)}
        >
          <p className="font-mono text-7xl font-extrabold tracking-[0.15em]">{code}</p>
          {url && <QrCard url={url} size={260} caption={url} />}
          <p className="text-white/60">Toque para fechar</p>
        </div>
      )}

      <Toast message={toast} />
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
      {children}
    </main>
  );
}

function Players({ room, myColor }: { room: Room | null; myColor: Player | null }) {
  const chip = (color: Player, name: string | null | undefined) => {
    const active = room?.status === "playing" && room.current_turn === color;
    return (
      <div
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 py-2 ring-1 transition ${
          active ? "bg-white/12 ring-white/40" : "bg-white/5 ring-white/10"
        } ${color === 2 ? "flex-row-reverse text-right" : ""}`}
      >
        <span className={`size-6 shrink-0 rounded-full ${color === 1 ? "piece-p1" : "piece-p2"}`} />
        <span className="truncate font-bold">
          {name ?? <span className="text-white/40">aguardando…</span>}
          {myColor === color && <span className="ml-1 text-xs font-semibold text-white/50">(você)</span>}
        </span>
      </div>
    );
  };
  return (
    <div className="flex items-center gap-2">
      {chip(1, room?.red_nickname)}
      <span className="text-sm font-extrabold text-white/40">vs</span>
      {chip(2, room?.yellow_nickname)}
    </div>
  );
}

function TurnBanner({
  room,
  myColor,
  pending,
  joining,
}: {
  room: Room | null;
  myColor: Player | null;
  pending: boolean;
  joining: boolean;
}) {
  let text = "Carregando…";
  let tone: "p1" | "p2" | "neutral" | "win" = "neutral";

  if (room && !joining) {
    const turnName = (c: Player) => (c === 1 ? room.red_nickname : room.yellow_nickname) ?? COLOR_NAME[c];
    if (room.status === "waiting") {
      text = myColor ? "Aguardando oponente… mostre o código!" : "Aguardando o segundo jogador";
    } else if (room.status === "playing") {
      const turn = room.current_turn;
      tone = turn === 1 ? "p1" : "p2";
      if (!myColor) text = `Vez de ${turnName(turn)}`;
      else if (turn === myColor) text = pending ? "Jogando…" : "Sua vez!";
      else text = `Vez do oponente (${turnName(turn)})`;
    } else if (room.winner === 0) {
      text = "Empate!";
    } else if (room.winner === 1 || room.winner === 2) {
      tone = "win";
      if (!myColor) text = `${turnName(room.winner)} venceu!`;
      else text = room.winner === myColor ? "Você venceu! 🎉" : `${turnName(room.winner)} venceu`;
    }
  }

  const isMine = room?.status === "playing" && myColor !== null && room.current_turn === myColor;
  const styles = {
    p1: isMine ? "bg-p1 text-white" : "bg-p1/15 text-p1 ring-1 ring-p1/40",
    p2: isMine ? "bg-p2 text-ink" : "bg-p2/15 text-p2 ring-1 ring-p2/40",
    neutral: "bg-white/8 text-white/80 ring-1 ring-white/15",
    win: "bg-mint text-ink",
  }[tone];

  return (
    <div
      aria-live="polite"
      className={`rounded-2xl px-4 py-3 text-center text-2xl font-extrabold transition-colors ${styles} ${
        isMine && !pending ? "animate-pulse" : ""
      }`}
    >
      {text}
    </div>
  );
}
