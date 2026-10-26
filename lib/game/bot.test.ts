import { describe, expect, it } from "vitest";
import { RED, YELLOW, type Cell } from "./board";
import { bestMove, type Difficulty } from "./bot";

function parse(rows: string[]): Cell[] {
  return rows.flatMap((row) => [...row].map((ch) => (ch === "R" ? RED : ch === "Y" ? YELLOW : 0)));
}

const levels: Difficulty[] = ["medio", "dificil"];

describe("bot", () => {
  it.each(levels)("completa a vitória quando pode (%s)", (level) => {
    const board = parse([".......", ".......", ".......", ".......", "YY.....", "RRR...."]);
    expect(bestMove(board, RED, level)).toBe(3);
  });

  it.each(levels)("bloqueia a vitória do oponente (%s)", (level) => {
    const board = parse([".......", ".......", ".......", ".......", ".......", "YYY.R.."]);
    expect(bestMove(board, RED, level)).toBe(3);
  });

  it("nível difícil responde rápido no tabuleiro vazio", () => {
    const started = performance.now();
    bestMove(parse(Array(6).fill(".......")), RED, "dificil");
    expect(performance.now() - started).toBeLessThan(3000);
  });
});
