// IA do computador: minimax com poda alfa-beta. Roda só no servidor (/api/move).

import { Board, COLS, Difficulty, Player, ROWS, drop, findWin, other, validMoves } from "./game";

const DEPTH: Record<Difficulty, number> = { facil: 2, medio: 4, dificil: 7 };
const WIN_SCORE = 1_000_000;

// Testa primeiro as colunas do centro: a poda corta muito mais galhos.
const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

function scoreWindow(window: number[], me: Player): number {
  const mine = window.filter((c) => c === me).length;
  const theirs = window.filter((c) => c === other(me)).length;
  const empty = window.filter((c) => c === 0).length;
  if (mine === 3 && empty === 1) return 5;
  if (mine === 2 && empty === 2) return 2;
  if (theirs === 3 && empty === 1) return -4;
  return 0;
}

/** Nota heurística da posição para `me` quando ninguém ganhou ainda. */
function evaluate(board: Board, me: Player): number {
  let score = 0;
  for (let row = 0; row < ROWS; row++) {
    if (board[row][3] === me) score += 3;
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (col + 3 < COLS) score += scoreWindow([0, 1, 2, 3].map((k) => board[row][col + k]), me);
      if (row + 3 < ROWS) score += scoreWindow([0, 1, 2, 3].map((k) => board[row + k][col]), me);
      if (row + 3 < ROWS && col + 3 < COLS)
        score += scoreWindow([0, 1, 2, 3].map((k) => board[row + k][col + k]), me);
      if (row + 3 < ROWS && col - 3 >= 0)
        score += scoreWindow([0, 1, 2, 3].map((k) => board[row + k][col - k]), me);
    }
  }
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  turn: Player,
  me: Player,
): number {
  const win = findWin(board);
  // Vitória mais rápida vale mais; derrota mais demorada dói menos.
  if (win) return win.player === me ? WIN_SCORE + depth : -WIN_SCORE - depth;
  const moves = validMoves(board);
  if (moves.length === 0) return 0;
  if (depth === 0) return evaluate(board, me);

  const ordered = MOVE_ORDER.filter((c) => moves.includes(c));
  if (turn === me) {
    let best = -Infinity;
    for (const col of ordered) {
      best = Math.max(best, minimax(drop(board, col, turn)!.board, depth - 1, alpha, beta, other(turn), me));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const col of ordered) {
    best = Math.min(best, minimax(drop(board, col, turn)!.board, depth - 1, alpha, beta, other(turn), me));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseMove(board: Board, me: Player, difficulty: Difficulty): number {
  const moves = validMoves(board);
  // No fácil, de vez em quando o computador "se distrai".
  if (difficulty === "facil" && Math.random() < 0.35) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestScore = -Infinity;
  let bestMoves: number[] = [];
  for (const col of MOVE_ORDER.filter((c) => moves.includes(c))) {
    const score = minimax(drop(board, col, me)!.board, DEPTH[difficulty] - 1, -Infinity, Infinity, other(me), me);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [col];
    } else if (score === bestScore) {
      bestMoves.push(col);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
