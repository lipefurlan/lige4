"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MiniBoard } from "@/components/Board";
import { LiveBadge, Logo, QrCard } from "@/components/ui";
import type { Room, ScoreRow } from "@/lib/room";
import { multiplayerEnabled, siteOrigin } from "@/lib/site";
import { getBrowserClient } from "@/lib/supabase/browser";
import { useRealtime } from "@/lib/useRealtime";
import { normalizeRoom } from "@/lib/useRoom";

// Partidas encerradas continuam no telão por alguns minutos, para o resultado aparecer.
const FINISHED_VISIBLE_MS = 3 * 60_000;
const LISTENERS = [{ table: "rooms" }, { table: "wins", event: "INSERT" as const }];

export default function TelaoPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [origin, setOrigin] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setOrigin(siteOrigin()), []);

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const since = new Date(Date.now() - FINISHED_VISIBLE_MS).toISOString();
    const [roomsRes, scoresRes] = await Promise.all([
      supabase
        .from("rooms")
        .select("*")
        .or(`status.neq.finished,updated_at.gt.${since}`)
        .order("updated_at", { ascending: false })
        .limit(24),
      supabase
        .from("scoreboard")
        .select("*")
        .order("wins", { ascending: false })
        .order("last_win_at", { ascending: true })
        .limit(10),
    ]);
    if (!roomsRes.error) setRooms(roomsRes.data.map(normalizeRoom));
    if (!scoresRes.error) setScores(scoresRes.data as ScoreRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const status = useRealtime({
    channel: multiplayerEnabled() ? "telao" : null,
    listeners: LISTENERS,
    onChange: () => {
      // Várias jogadas por segundo com a plateia toda: agrupa os eventos e busca de uma vez.
      clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void load(), 300);
    },
    resync: load,
  });

  const sorted = useMemo(() => {
    const rank = { playing: 0, waiting: 1, finished: 2 } as const;
    return [...rooms].sort((a, b) => rank[a.status] - rank[b.status]);
  }, [rooms]);
  const playing = rooms.filter((r) => r.status === "playing").length;

  return (
    <main className="flex min-h-dvh flex-col gap-8 p-8 xl:p-12">
      <header className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <Logo size="xl" />
          <LiveBadge status={status} />
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-bold text-white/60">Entre pelo celular</p>
            <p className="text-3xl font-extrabold">{origin.replace(/^https?:\/\//, "")}</p>
          </div>
          {origin && <QrCard url={origin} size={150} />}
        </div>
      </header>

      {!multiplayerEnabled() && (
        <p className="text-3xl text-p2">Configure o Supabase para ver as partidas ao vivo.</p>
      )}

      <div className="grid flex-1 gap-10 xl:grid-cols-[1fr_28rem]">
        <section className="flex flex-col gap-5">
          <h2 className="text-4xl font-extrabold">
            Partidas agora <span className="text-white/50">· {playing} em jogo</span>
          </h2>
          {sorted.length === 0 ? (
            <p className="text-3xl text-white/50">Nenhuma partida ainda. Crie uma sala pelo celular!</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 2xl:grid-cols-4">
              {sorted.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-4xl font-extrabold">Placar</h2>
          {scores.length === 0 ? (
            <p className="text-2xl text-white/50">Ninguém venceu ainda.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {scores.map((s, i) => (
                <li
                  key={s.nickname}
                  className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-3xl font-extrabold ${
                    i === 0 ? "bg-p2 text-ink" : "bg-white/8"
                  }`}
                >
                  <span className="w-10 text-center opacity-60">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{s.nickname}</span>
                  <span className="tabular-nums">{s.wins}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

function RoomCard({ room }: { room: Room }) {
  const name = (c: 1 | 2) => (c === 1 ? room.red_nickname : room.yellow_nickname) ?? "—";
  let status: string;
  if (room.status === "waiting") status = "Aguardando oponente";
  else if (room.status === "playing") status = `Vez de ${name(room.current_turn)}`;
  else if (room.winner === 0) status = "Empate";
  else status = `${name(room.winner === 2 ? 2 : 1)} venceu!`;

  return (
    <article
      className={`flex flex-col gap-3 rounded-3xl bg-white/5 p-4 ring-1 ${
        room.status === "finished" ? "ring-mint/60" : "ring-white/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xl font-extrabold tracking-[0.15em]">{room.code}</span>
        <span className="text-lg font-bold text-white/50">{room.move_count} jogadas</span>
      </div>
      <MiniBoard board={room.board} winningCells={room.winning_cells} />
      <div className="flex items-center justify-between gap-2 text-xl font-bold">
        <span className="flex min-w-0 items-center gap-2">
          <span className="piece-p1 size-4 shrink-0 rounded-full" />
          <span className="truncate">{name(1)}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{name(2)}</span>
          <span className="piece-p2 size-4 shrink-0 rounded-full" />
        </span>
      </div>
      <p
        className={`rounded-xl px-3 py-2 text-center text-xl font-extrabold ${
          room.status === "finished"
            ? "bg-mint text-ink"
            : room.status === "playing"
              ? room.current_turn === 1
                ? "bg-p1/20 text-p1"
                : "bg-p2/20 text-p2"
              : "bg-white/8 text-white/60"
        }`}
      >
        {status}
      </p>
    </article>
  );
}
