"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "./supabase/browser";

export type LiveStatus = "connecting" | "live" | "offline";

export interface TableListener {
  table: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
}

type Payload = RealtimePostgresChangesPayload<Record<string, unknown>>;

interface Options {
  /** Nome base do canal; null desliga a assinatura. */
  channel: string | null;
  listeners: TableListener[];
  onChange: (payload: Payload) => void;
  /** Busca o estado atual no banco (chamada ao conectar, reconectar, voltar online e no polling). */
  resync: () => void | Promise<void>;
}

const POLL_LIVE_MS = 20_000;
const POLL_OFFLINE_MS = 4_000;

/**
 * Assina mudanças do Postgres via Supabase Realtime e se recupera sozinho em rede instável:
 * re-assina com backoff quando o canal cai, re-sincroniza ao voltar online / voltar para a aba
 * e faz polling (rápido enquanto desconectado) para nunca ficar com estado velho.
 */
export function useRealtime({ channel, listeners, onChange, resync }: Options): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [attempt, setAttempt] = useState(0);
  const failures = useRef(0);
  const onChangeRef = useRef(onChange);
  const resyncRef = useRef(resync);
  useEffect(() => {
    onChangeRef.current = onChange;
    resyncRef.current = resync;
  });

  const listenersKey = JSON.stringify(listeners);

  useEffect(() => {
    if (!channel) return;
    const supabase = getBrowserClient();
    if (!supabase) {
      setStatus("offline");
      return;
    }

    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    // Nome novo a cada tentativa: um canal fechado não é reaproveitado.
    const ch = supabase.channel(`${channel}:${attempt}`);
    for (const l of JSON.parse(listenersKey) as TableListener[]) {
      ch.on(
        "postgres_changes",
        { event: (l.event ?? "*") as "*", schema: "public", table: l.table, filter: l.filter },
        (payload: Payload) => onChangeRef.current(payload),
      );
    }
    ch.subscribe((state) => {
      if (disposed) return;
      if (state === "SUBSCRIBED") {
        failures.current = 0;
        setStatus("live");
        void resyncRef.current();
      } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
        setStatus("offline");
        clearTimeout(retry);
        const delay = Math.min(1000 * 2 ** failures.current, 15_000);
        failures.current++;
        retry = setTimeout(() => setAttempt((a) => a + 1), delay);
      }
    });

    return () => {
      disposed = true;
      clearTimeout(retry);
      void supabase.removeChannel(ch);
    };
  }, [channel, listenersKey, attempt]);

  useEffect(() => {
    if (!channel) return;
    const sync = () => void resyncRef.current();
    const reconnect = () => {
      sync();
      if (status !== "live") setAttempt((a) => a + 1);
    };
    const onVisibility = () => document.visibilityState === "visible" && reconnect();
    const onOffline = () => setStatus("offline");

    const timer = setInterval(sync, status === "live" ? POLL_LIVE_MS : POLL_OFFLINE_MS);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [channel, status]);

  return status;
}
