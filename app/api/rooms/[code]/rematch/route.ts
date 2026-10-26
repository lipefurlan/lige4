import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { createBoard, other } from "@/lib/game/board";
import { CODE_PATTERN, isUuid, type Room } from "@/lib/room";
import { getServiceClient } from "@/lib/supabase/server";

/** Revanche: zera o tabuleiro e alterna quem começa. */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(request);
  const playerId = body?.playerId;
  if (!CODE_PATTERN.test(code) || !isUuid(playerId)) return apiError("bad_request");

  const db = getServiceClient();
  const { data: room, error } = await db.from("rooms").select("*").eq("code", code).maybeSingle<Room>();
  if (error) return apiError("server_error", error);
  if (!room) return apiError("not_found");
  if (room.status !== "finished") return apiError("game_not_over");

  const { data: seat, error: seatError } = await db
    .from("room_seats")
    .select("color")
    .eq("room_id", room.id)
    .eq("player_id", playerId)
    .maybeSingle();
  if (seatError) return apiError("server_error", seatError);
  if (!seat) return apiError("not_a_player");

  const starting = other(room.starting_color);
  // Se os dois tocarem em "Revanche" juntos, só o primeiro passa (game_number esperado).
  const { data: updated, error: updateError } = await db
    .from("rooms")
    .update({
      board: createBoard(),
      move_count: 0,
      current_turn: starting,
      starting_color: starting,
      winner: null,
      winning_cells: [],
      last_move: null,
      status: "playing",
      game_number: room.game_number + 1,
    })
    .eq("id", room.id)
    .eq("game_number", room.game_number)
    .select()
    .maybeSingle<Room>();
  if (updateError) return apiError("server_error", updateError);
  if (!updated) return apiError("stale");

  return NextResponse.json({ room: updated });
}
