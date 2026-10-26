import { chooseMove } from "@/lib/ai";
import { Difficulty, findWin, isValidBoard, validMoves } from "@/lib/game";

const DIFFICULTIES: Difficulty[] = ["facil", "medio", "dificil"];

// POST /api/move  { board, player, difficulty }  ->  { column, thinkingMs }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { board, player, difficulty } = body ?? {};

  if (!isValidBoard(board) || (player !== 1 && player !== 2) || !DIFFICULTIES.includes(difficulty)) {
    return Response.json({ error: "Requisição inválida" }, { status: 400 });
  }
  if (findWin(board) || validMoves(board).length === 0) {
    return Response.json({ error: "A partida já terminou" }, { status: 409 });
  }

  const start = performance.now();
  const column = chooseMove(board, player, difficulty);
  return Response.json({ column, thinkingMs: Math.round(performance.now() - start) });
}
