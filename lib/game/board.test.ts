import { describe, expect, it } from "vitest";
import {
  RED,
  YELLOW,
  cellIndex,
  createGame,
  findWinner,
  isDraw,
  playMove,
  type Cell,
  type GameState,
} from "./board";

/** Monta o tabuleiro a partir de 6 linhas de texto: "." vazio, "R" vermelho, "Y" amarelo. */
function parse(rows: string[]): Cell[] {
  return rows.flatMap((row) => [...row].map((ch) => (ch === "R" ? RED : ch === "Y" ? YELLOW : 0)));
}

/** Joga uma sequência de colunas a partir do início, alternando os jogadores. */
function playAll(cols: number[]): GameState {
  let state = createGame(RED);
  for (const col of cols) {
    const result = playMove(state, col);
    if (!result.ok) throw new Error(`Jogada inválida na coluna ${col}: ${result.error}`);
    state = result.state;
  }
  return state;
}

describe("checagem de vitória", () => {
  it("detecta vitória horizontal", () => {
    const state = playAll([0, 0, 1, 1, 2, 2, 3]);
    expect(state.winner).toBe(RED);
    expect(state.winningCells).toEqual([0, 1, 2, 3].map((c) => cellIndex(5, c)));
  });

  it("detecta vitória vertical", () => {
    const state = playAll([6, 0, 6, 0, 6, 0, 5, 0]);
    expect(state.winner).toBe(YELLOW);
    expect(state.winningCells).toEqual([2, 3, 4, 5].map((r) => cellIndex(r, 0)));
  });

  it("detecta vitória na diagonal ↗ (de baixo-esquerda para cima-direita)", () => {
    const board = parse([
      ".......",
      ".......",
      "...R...",
      "..RY...",
      ".RYY...",
      "RYYR...",
    ]);
    const win = findWinner(board);
    expect(win?.winner).toBe(RED);
    expect(win?.cells).toEqual([cellIndex(2, 3), cellIndex(3, 2), cellIndex(4, 1), cellIndex(5, 0)]);
  });

  it("detecta vitória na diagonal ↘ (de cima-esquerda para baixo-direita)", () => {
    const board = parse([
      ".......",
      ".......",
      "...Y...",
      "...RY..",
      "...RRY.",
      "...RRRY",
    ]);
    const win = findWinner(board);
    expect(win?.winner).toBe(YELLOW);
    expect(win?.cells).toEqual([cellIndex(2, 3), cellIndex(3, 4), cellIndex(4, 5), cellIndex(5, 6)]);
  });

  it("marca todas as casas quando a linha tem mais de 4", () => {
    const board = parse([".......", ".......", ".......", ".......", ".......", "RRRRR.."]);
    expect(findWinner(board)?.cells).toHaveLength(5);
  });

  it("não declara vitória com 3 em linha", () => {
    const state = playAll([0, 0, 1, 1, 2, 2]);
    expect(state.winner).toBeNull();
    expect(findWinner(state.board)).toBeNull();
  });

  it("detecta empate com o tabuleiro cheio e sem 4 em linha", () => {
    const board = parse(["YYRRYYR", "YYRRYYR", "RRYYRRY", "YYRRYYR", "RRYYRRY", "RRYYRRY"]);
    expect(findWinner(board)).toBeNull();
    expect(isDraw(board)).toBe(true);

    // A última jogada que fecha o tabuleiro vira empate (winner = 0).
    const almost = [...board];
    almost[0] = 0;
    const result = playMove({ board: almost, currentTurn: YELLOW, moveCount: 41, winner: null, winningCells: [] }, 0);
    expect(result.ok && result.state.winner).toBe(0);
  });

  it("tabuleiro incompleto não é empate", () => {
    expect(isDraw(createGame().board)).toBe(false);
  });
});

describe("validação de jogadas", () => {
  it("recusa coluna cheia", () => {
    const state = playAll([0, 0, 0, 0, 0, 0]);
    expect(playMove(state, 0)).toEqual({ ok: false, error: "column_full" });
  });

  it("recusa coluna fora do tabuleiro", () => {
    expect(playMove(createGame(), 7)).toEqual({ ok: false, error: "invalid_column" });
    expect(playMove(createGame(), -1)).toEqual({ ok: false, error: "invalid_column" });
    expect(playMove(createGame(), 1.5)).toEqual({ ok: false, error: "invalid_column" });
  });

  it("recusa jogada depois do fim da partida", () => {
    const state = playAll([0, 0, 1, 1, 2, 2, 3]);
    expect(playMove(state, 4)).toEqual({ ok: false, error: "game_over" });
  });

  it("alterna o turno e não altera o estado original", () => {
    const start = createGame(YELLOW);
    const result = playMove(start, 3);
    expect(result.ok && result.state.currentTurn).toBe(RED);
    expect(result.ok && result.state.board[cellIndex(5, 3)]).toBe(YELLOW);
    expect(start.board[cellIndex(5, 3)]).toBe(0);
  });
});
