// Lógica pura do Lig 4: sem React, sem Supabase. Usada pela API e pelo bot.

export const ROWS = 6;
export const COLS = 7;
export const CELLS = ROWS * COLS;

export const EMPTY = 0;
export const RED = 1;
export const YELLOW = 2;

export type Player = typeof RED | typeof YELLOW;
export type Cell = typeof EMPTY | Player;
/** 42 casas, índice = linha * COLS + coluna; a linha 0 é a de cima. */
export type Board = readonly Cell[];
/** null = em andamento, 0 = empate, 1/2 = vencedor. */
export type Outcome = null | 0 | Player;

export interface GameState {
  board: Board;
  currentTurn: Player;
  moveCount: number;
  winner: Outcome;
  winningCells: number[];
}

export type MoveError = "invalid_column" | "column_full" | "game_over";

export type MoveResult =
  | { ok: true; state: GameState; cell: number }
  | { ok: false; error: MoveError };

export function createBoard(): Cell[] {
  return Array<Cell>(CELLS).fill(EMPTY);
}

export function createGame(startingPlayer: Player = RED): GameState {
  return { board: createBoard(), currentTurn: startingPlayer, moveCount: 0, winner: null, winningCells: [] };
}

export function other(player: Player): Player {
  return player === RED ? YELLOW : RED;
}

export function cellIndex(row: number, col: number): number {
  return row * COLS + col;
}

/** Linha onde a peça para ao cair na coluna, ou -1 se a coluna está cheia. */
export function dropRow(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[cellIndex(row, col)] === EMPTY) return row;
  }
  return -1;
}

export function validColumns(board: Board): number[] {
  const cols: number[] = [];
  for (let col = 0; col < COLS; col++) if (board[col] === EMPTY) cols.push(col);
  return cols;
}

// Direções: horizontal, vertical, diagonal ↘ e diagonal ↗.
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
];

/** Todas as janelas de 4 casas alinhadas do tabuleiro (69 no 7x6). */
export const WINDOWS: ReadonlyArray<readonly [number, number, number, number]> = (() => {
  const windows: Array<[number, number, number, number]> = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dr, dc] of DIRECTIONS) {
        const endRow = row + dr * 3;
        const endCol = col + dc * 3;
        if (endRow < 0 || endRow >= ROWS || endCol >= COLS) continue;
        windows.push([
          cellIndex(row, col),
          cellIndex(row + dr, col + dc),
          cellIndex(row + dr * 2, col + dc * 2),
          cellIndex(endRow, endCol),
        ]);
      }
    }
  }
  return windows;
})();

/** Vencedor e todas as casas que fazem parte de linhas de 4 (ou mais). */
export function findWinner(board: Board): { winner: Player; cells: number[] } | null {
  let winner: Player | null = null;
  const cells = new Set<number>();
  for (const window of WINDOWS) {
    const first = board[window[0]];
    if (first === EMPTY || first === undefined) continue;
    if (window.every((i) => board[i] === first)) {
      winner ??= first;
      if (first === winner) window.forEach((i) => cells.add(i));
    }
  }
  return winner === null ? null : { winner, cells: [...cells].sort((a, b) => a - b) };
}

export function isFull(board: Board): boolean {
  return board.every((cell) => cell !== EMPTY);
}

export function isDraw(board: Board): boolean {
  return isFull(board) && findWinner(board) === null;
}

/** Aplica a jogada do jogador da vez. Não altera o estado recebido. */
export function playMove(state: GameState, col: number): MoveResult {
  if (state.winner !== null) return { ok: false, error: "game_over" };
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return { ok: false, error: "invalid_column" };

  const row = dropRow(state.board, col);
  if (row === -1) return { ok: false, error: "column_full" };

  const cell = cellIndex(row, col);
  const board = [...state.board];
  board[cell] = state.currentTurn;

  const win = findWinner(board);
  const winner: Outcome = win ? win.winner : isFull(board) ? 0 : null;

  return {
    ok: true,
    cell,
    state: {
      board,
      currentTurn: winner === null ? other(state.currentTurn) : state.currentTurn,
      moveCount: state.moveCount + 1,
      winner,
      winningCells: win ? win.cells : [],
    },
  };
}
