import {
  COLS,
  EMPTY,
  WINDOWS,
  cellIndex,
  dropRow,
  findWinner,
  other,
  validColumns,
  type Board,
  type Cell,
  type Player,
} from "./board";

export type Difficulty = "facil" | "medio" | "dificil";

const SETTINGS: Record<Difficulty, { depth: number; randomness: number }> = {
  facil: { depth: 2, randomness: 0.3 },
  medio: { depth: 4, randomness: 0 },
  dificil: { depth: 7, randomness: 0 },
};

// Colunas do centro primeiro: melhora muito a poda alfa-beta.
const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6].filter((c) => c < COLS);
const WIN_SCORE = 1_000_000;

function scoreWindow(board: Cell[], window: readonly number[], me: Player): number {
  let mine = 0;
  let theirs = 0;
  for (const i of window) {
    const cell = board[i];
    if (cell === me) mine++;
    else if (cell !== EMPTY) theirs++;
  }
  if (mine > 0 && theirs > 0) return 0;
  if (mine === 3) return 5;
  if (mine === 2) return 2;
  if (theirs === 3) return -4;
  if (theirs === 2) return -1;
  return 0;
}

/** Heurística do ponto de vista de `me`. */
function evaluate(board: Cell[], me: Player): number {
  let score = 0;
  for (let row = 0; row < 6; row++) {
    const center = board[cellIndex(row, 3)];
    if (center === me) score += 3;
    else if (center !== EMPTY) score -= 3;
  }
  for (const window of WINDOWS) score += scoreWindow(board, window, me);
  return score;
}

function negamax(board: Cell[], depth: number, alpha: number, beta: number, player: Player, ply: number): number {
  const win = findWinner(board);
  // A última jogada foi do oponente; se alguém venceu, foi ele.
  if (win) return -(WIN_SCORE - ply);
  const moves = MOVE_ORDER.filter((c) => board[c] === EMPTY);
  if (moves.length === 0) return 0;
  if (depth === 0) return evaluate(board, player);

  let best = -Infinity;
  for (const col of moves) {
    const cell = cellIndex(dropRow(board, col), col);
    board[cell] = player;
    const score = -negamax(board, depth - 1, -beta, -alpha, other(player), ply + 1);
    board[cell] = EMPTY;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Melhor coluna para `player` (minimax/negamax com poda alfa-beta). */
export function bestMove(board: Board, player: Player, difficulty: Difficulty, random: () => number = Math.random): number {
  const moves = validColumns(board);
  if (moves.length === 0) throw new Error("Tabuleiro cheio");

  const { depth, randomness } = SETTINGS[difficulty];
  if (randomness > 0 && random() < randomness) {
    return moves[Math.floor(random() * moves.length)] ?? moves[0]!;
  }

  const work = [...board];
  let bestCols: number[] = [];
  let bestScore = -Infinity;
  for (const col of MOVE_ORDER) {
    if (work[col] !== EMPTY) continue;
    const cell = cellIndex(dropRow(work, col), col);
    work[cell] = player;
    const score = -negamax(work, depth - 1, -Infinity, Infinity, other(player), 1);
    work[cell] = EMPTY;
    if (score > bestScore) {
      bestScore = score;
      bestCols = [col];
    } else if (score === bestScore) {
      bestCols.push(col);
    }
  }
  // Empate de pontuação: sorteia, para o bot não jogar sempre igual.
  return bestCols[Math.floor(random() * bestCols.length)] ?? bestCols[0]!;
}
