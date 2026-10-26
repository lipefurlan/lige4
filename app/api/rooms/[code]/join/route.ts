import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { CODE_PATTERN, cleanNickname, isUuid, type Room, type Seat } from "@/lib/room";
import { getServiceClient } from "@/lib/supabase/server";

const SEAT_BY_COLOR: Record<number, Seat> = { 1: "red", 2: "yellow" };

/**
 * Entra na sala: primeiro a chegar = vermelho, segundo = amarelo, o resto assiste.
 * Idempotente: o mesmo playerId sempre volta para o mesmo assento.
 */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(request);
  const playerId = body?.playerId;
  const nickname = cleanNickname(body?.nickname);
  if (!CODE_PATTERN.test(code) || !isUuid(playerId) || !nickname) return apiError("bad_request");

  const db = getServiceClient();
  const { data: room, error } = await db.from("rooms").select("*").eq("code", code).maybeSingle<Room>();
  if (error) return apiError("server_error", error);
  if (!room) return apiError("not_found");

  // Se outro celular pegar o mesmo assento no mesmo instante, a chave única decide e tentamos de novo.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: seats, error: seatsError } = await db
      .from("room_seats")
      .select("color, player_id")
      .eq("room_id", room.id);
    if (seatsError) return apiError("server_error", seatsError);

    const mine = seats.find((s) => s.player_id === playerId);
    if (mine) return NextResponse.json({ roomId: room.id, seat: SEAT_BY_COLOR[mine.color as number] });

    const taken = new Set(seats.map((s) => s.color as number));
    const color = !taken.has(1) ? 1 : !taken.has(2) ? 2 : null;
    if (color === null) return NextResponse.json({ roomId: room.id, seat: "spectator" satisfies Seat });

    const { error: insertError } = await db
      .from("room_seats")
      .insert({ room_id: room.id, color, player_id: playerId, nickname });
    if (insertError?.code === "23505") continue;
    if (insertError) return apiError("server_error", insertError);

    const update =
      color === 1
        ? { red_nickname: nickname }
        : { yellow_nickname: nickname, status: room.status === "waiting" ? "playing" : room.status };
    const { error: updateError } = await db.from("rooms").update(update).eq("id", room.id);
    if (updateError) return apiError("server_error", updateError);

    return NextResponse.json({ roomId: room.id, seat: SEAT_BY_COLOR[color] });
  }
  return apiError("server_error", "conflito ao reservar assento");
}
