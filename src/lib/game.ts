// Regras do Lig 4, compartilhadas entre front-end e back-end.

export const ROWS = 6;
export const COLS = 7;

export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Board = Cell[][]; // board[linha][coluna], linha 0 é o topo
export type Difficulty = "facil" | "medio" | "dificil";

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

export function other(player: Player): Player {
  return player === 1 ? 2 : 1;
}

/** Linha onde a peça cai na coluna, ou -1 se a coluna estiver cheia. */
export function landingRow(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

export function validMoves(board: Board): number[] {
  const moves: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === 0) moves.push(col);
  }
  return moves;
}

export function drop(board: Board, col: number, player: Player): { board: Board; row: number } | null {
  const row = landingRow(board, col);
  if (row === -1) return null;
  const next = board.map((r) => [...r]);
  next[row][col] = player;
  return { board: next, row };
}

const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal ↘
  [1, -1], // diagonal ↙
];

/** Casas da sequência vencedora, ou null se ninguém ganhou ainda. */
export function findWin(board: Board): { player: Player; cells: [number, number][] } | null {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const player = board[row][col];
      if (player === 0) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const cells: [number, number][] = [[row, col]];
        for (let k = 1; k < 4; k++) {
          const r = row + dr * k;
          const c = col + dc * k;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
          cells.push([r, c]);
        }
        if (cells.length === 4) return { player, cells };
      }
    }
  }
  return null;
}

export function isFull(board: Board): boolean {
  return validMoves(board).length === 0;
}

export function isValidBoard(value: unknown): value is Board {
  return (
    Array.isArray(value) &&
    value.length === ROWS &&
    value.every(
      (row) => Array.isArray(row) && row.length === COLS && row.every((c) => c === 0 || c === 1 || c === 2),
    )
  );
}
