import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { playMove } from "@/lib/game/board";
import { isUuid, toGameState, type Room } from "@/lib/room";
import { getServiceClient } from "@/lib/supabase/server";

/** Jogada: o servidor é a autoridade. Recebe só { roomId, playerId, column }. */
export async function POST(request: Request) {
  const body = await readJson(request);
  const roomId = body?.roomId;
  const playerId = body?.playerId;
  const column = body?.column;
  if (!isUuid(roomId) || !isUuid(playerId) || typeof column !== "number") return apiError("bad_request");

  const db = getServiceClient();
  const [roomResult, seatResult] = await Promise.all([
    db.from("rooms").select("*").eq("id", roomId).maybeSingle<Room>(),
    db.from("room_seats").select("color, nickname").eq("room_id", roomId).eq("player_id", playerId).maybeSingle(),
  ]);
  if (roomResult.error || seatResult.error) return apiError("server_error", roomResult.error ?? seatResult.error);
  const room = roomResult.data;
  const seat = seatResult.data;
  if (!room) return apiError("not_found");
  if (!seat) return apiError("not_a_player");
  if (room.status === "waiting") return apiError("waiting_opponent");
  if (room.status === "finished") return apiError("game_over");
  if (seat.color !== room.current_turn) return apiError("not_your_turn");

  const result = playMove(toGameState(room), column);
  if (!result.ok) return apiError(result.error);
  const next = result.state;

  // Concorrência otimista: só grava se ninguém jogou desde a leitura.
  const { data: updated, error } = await db
    .from("rooms")
    .update({
      board: next.board,
      move_count: next.moveCount,
      current_turn: next.currentTurn,
      winner: next.winner,
      winning_cells: next.winningCells,
      last_move: result.cell,
      status: next.winner === null ? "playing" : "finished",
    })
    .eq("id", room.id)
    .eq("move_count", room.move_count)
    .eq("game_number", room.game_number)
    .select()
    .maybeSingle<Room>();
  if (error) return apiError("server_error", error);
  if (!updated) return apiError("stale");

  if (next.winner === 1 || next.winner === 2) {
    const { error: winError } = await db
      .from("wins")
      .upsert(
        { room_id: room.id, game_number: room.game_number, nickname: seat.nickname, color: next.winner },
        { onConflict: "room_id,game_number", ignoreDuplicates: true },
      );
    if (winError) console.error("[api] wins", winError);
  }

  return NextResponse.json({ room: updated });
}
