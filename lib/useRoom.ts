"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { roomVersion, type Room } from "./room";
import { getBrowserClient } from "./supabase/browser";
import { useRealtime, type LiveStatus } from "./useRealtime";

// Garante arrays mesmo se algum caminho devolver o formato texto do Postgres ("{0,1,2}").
function toNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") return value.replace(/[{}]/g, "").split(",").filter(Boolean).map(Number);
  return [];
}

export function normalizeRoom(raw: Record<string, unknown>): Room {
  const room = raw as unknown as Room;
  return { ...room, board: toNumberArray(raw.board), winning_cells: toNumberArray(raw.winning_cells) };
}

export interface RoomHandle {
  room: Room | null;
  notFound: boolean;
  status: LiveStatus;
  /** Aplica um estado vindo da API (descarta se for mais velho que o atual). */
  accept: (room: Room) => void;
  resync: () => Promise<void>;
}

/** Estado da sala: lê do banco com a anon key e acompanha via Realtime. */
export function useRoom(code: string): RoomHandle {
  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);

  const accept = useCallback((next: Room) => {
    setRoom((prev) => (!prev || prev.id !== next.id || roomVersion(next) >= roomVersion(prev) ? next : prev));
  }, []);

  const resync = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const { data, error } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
    if (error) return; // rede instável: o polling tenta de novo
    if (!data) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    // A versão (partida, jogadas) só cresce: uma resposta atrasada não desfaz um estado mais novo.
    accept(normalizeRoom(data));
  }, [code, accept]);

  useEffect(() => {
    void resync();
  }, [resync]);

  const roomId = room?.id ?? null;
  const listeners = useMemo(
    () => (roomId ? [{ table: "rooms", event: "UPDATE" as const, filter: `id=eq.${roomId}` }] : []),
    [roomId],
  );

  const status = useRealtime({
    channel: roomId ? `room-${roomId}` : null,
    listeners,
    onChange: (payload) => {
      if (payload.eventType === "UPDATE") accept(normalizeRoom(payload.new));
    },
    resync,
  });

  return { room, notFound, status, accept, resync };
}
