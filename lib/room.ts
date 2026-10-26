import type { Cell, GameState, Outcome, Player } from "./game/board";

export type RoomStatus = "waiting" | "playing" | "finished";
export type Seat = "red" | "yellow" | "spectator";

/** Linha da tabela public.rooms. */
export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  board: number[];
  move_count: number;
  current_turn: Player;
  starting_color: Player;
  winner: Outcome;
  winning_cells: number[];
  last_move: number | null;
  red_nickname: string | null;
  yellow_nickname: string | null;
  game_number: number;
  created_at: string;
  updated_at: string;
}

export interface ScoreRow {
  nickname: string;
  wins: number;
  last_win_at: string;
}

// Sem O e I (confundem com 0 e 1).
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_PATTERN = /^[A-HJ-NP-Z]{4}$/;

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, "").replace(/[IO]/g, "").slice(0, 4);
}

export function randomCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function seatColor(seat: Seat): Player | null {
  return seat === "red" ? 1 : seat === "yellow" ? 2 : null;
}

export function toGameState(room: Room): GameState {
  return {
    board: room.board as Cell[],
    currentTurn: room.current_turn,
    moveCount: room.move_count,
    winner: room.winner,
    winningCells: room.winning_cells,
  };
}

/** Versão do estado: maior = mais novo. Usada para descartar eventos atrasados. */
export function roomVersion(room: Pick<Room, "game_number" | "move_count">): number {
  return room.game_number * 1000 + room.move_count;
}

export const NICKNAME_MAX = 16;

export function cleanNickname(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const nick = input.replace(/\s+/g, " ").trim().slice(0, NICKNAME_MAX);
  return nick.length > 0 ? nick : null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
