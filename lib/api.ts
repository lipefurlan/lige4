import "server-only";
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "bad_request"
  | "not_found"
  | "not_a_player"
  | "not_your_turn"
  | "waiting_opponent"
  | "game_over"
  | "game_not_over"
  | "column_full"
  | "invalid_column"
  | "stale"
  | "server_error";

const MESSAGES: Record<ApiErrorCode, string> = {
  bad_request: "Requisição inválida.",
  not_found: "Sala não encontrada.",
  not_a_player: "Você está assistindo esta partida.",
  not_your_turn: "Não é a sua vez.",
  waiting_opponent: "Aguardando o segundo jogador.",
  game_over: "A partida já acabou.",
  game_not_over: "A partida ainda não acabou.",
  column_full: "Essa coluna está cheia.",
  invalid_column: "Coluna inválida.",
  stale: "O tabuleiro mudou. Sincronizando…",
  server_error: "Erro no servidor. Tente de novo.",
};

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  not_a_player: 403,
  not_your_turn: 409,
  waiting_opponent: 409,
  game_over: 409,
  game_not_over: 409,
  column_full: 400,
  invalid_column: 400,
  stale: 409,
  server_error: 500,
};

export function apiError(code: ApiErrorCode, detail?: unknown) {
  if (detail) console.error(`[api] ${code}`, detail);
  return NextResponse.json({ error: code, message: MESSAGES[code] }, { status: STATUS[code] });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
