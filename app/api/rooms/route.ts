import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { cleanNickname, isUuid, randomCode, type Room } from "@/lib/room";
import { getServiceClient } from "@/lib/supabase/server";

/** Cria uma sala; quem cria fica com o vermelho. */
export async function POST(request: Request) {
  const body = await readJson(request);
  const playerId = body?.playerId;
  const nickname = cleanNickname(body?.nickname);
  if (!isUuid(playerId) || !nickname) return apiError("bad_request");

  const db = getServiceClient();
  // Aproveita a criação para limpar salas inativas há mais de 2h.
  const cleanup = await db.rpc("cleanup_old_rooms");
  if (cleanup.error) console.warn("[api] cleanup", cleanup.error.message);

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: room, error } = await db
      .from("rooms")
      .insert({ code: randomCode(), red_nickname: nickname })
      .select()
      .single<Room>();
    if (error?.code === "23505") continue; // código já existe: sorteia outro
    if (error || !room) return apiError("server_error", error);

    const { error: seatError } = await db
      .from("room_seats")
      .insert({ room_id: room.id, color: 1, player_id: playerId, nickname });
    if (seatError) return apiError("server_error", seatError);

    return NextResponse.json({ code: room.code, roomId: room.id, seat: "red" }, { status: 201 });
  }
  return apiError("server_error", "não foi possível gerar um código livre");
}
