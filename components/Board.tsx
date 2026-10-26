"use client";

import { motion } from "framer-motion";
import { COLS, ROWS, cellIndex, type Player } from "@/lib/game/board";

interface BoardProps {
  board: readonly number[];
  winningCells: readonly number[];
  lastMove: number | null;
  /** Muda a cada partida, para as peças da revanche montarem do zero. */
  gameKey: string | number;
  finished: boolean;
  /** Cor do jogador local quando ele pode jogar; null desliga os toques. */
  playable: Player | null;
  onColumn?: (col: number) => void;
}

export function Piece({ player, className = "" }: { player: number; className?: string }) {
  return <div className={`aspect-square w-full rounded-full ${player === 1 ? "piece-p1" : "piece-p2"} ${className}`} />;
}

export function Board({ board, winningCells, lastMove, gameKey, finished, playable, onColumn }: BoardProps) {
  const winning = new Set(winningCells);

  return (
    <div
      className="board-face relative mx-auto select-none rounded-[6%/7%] p-[2.2%]"
      style={{ width: "min(94vw, 560px, calc((100dvh - 250px) * 7 / 6))" }}
    >
      <div className="grid grid-cols-7 gap-[1.6%] overflow-hidden rounded-[4%/5%]">
        {Array.from({ length: COLS }, (_, col) => {
          const disabled = playable === null || board[col] !== 0;
          return (
            <button
              key={col}
              type="button"
              aria-label={`Jogar na coluna ${col + 1}`}
              disabled={disabled}
              onClick={() => onColumn?.(col)}
              className={`group relative flex flex-col rounded-full py-[6%] transition-colors ${
                disabled ? "cursor-default" : "cursor-pointer hover:bg-white/10 active:bg-white/20"
              }`}
            >
              {Array.from({ length: ROWS }, (_, row) => {
                const index = cellIndex(row, col);
                const cell = board[index] ?? 0;
                const isWin = winning.has(index);
                return (
                  // Espaçamento com padding (% da largura): gap em % numa coluna flex não é confiável.
                  <div key={row} className="w-full p-[7%]">
                    <div className="hole relative aspect-square w-full rounded-full">
                      {cell !== 0 && (
                        <motion.div
                          key={`${gameKey}-${index}`}
                          className="absolute inset-0"
                          // Só a última peça cai; cada casa mede ~117% do diâmetro da peça.
                          initial={index === lastMove ? { y: `${-(row + 1) * 117}%` } : false}
                          animate={isWin ? { y: 0, scale: [1, 1.12, 1] } : { y: 0 }}
                          transition={{
                            y: { type: "spring", stiffness: 520, damping: 26, mass: 0.9 },
                            scale: { repeat: Infinity, duration: 0.9, delay: 0.3 },
                          }}
                        >
                          <Piece
                            player={cell}
                            className={isWin ? "ring-4 ring-white" : finished ? "opacity-35" : ""}
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Tabuleiro pequeno, só leitura, para o telão. */
export function MiniBoard({ board, winningCells }: { board: readonly number[]; winningCells: readonly number[] }) {
  const winning = new Set(winningCells);
  return (
    <div className="board-face grid grid-cols-7 rounded-xl p-[3%]">
      {Array.from({ length: COLS }, (_, col) => (
        <div key={col} className="flex flex-col">
          {Array.from({ length: ROWS }, (_, row) => {
            const index = cellIndex(row, col);
            const cell = board[index] ?? 0;
            return (
              <div key={row} className="p-[8%]">
                <div className="hole aspect-square rounded-full">
                  {cell !== 0 && <Piece player={cell} className={winning.has(index) ? "ring-2 ring-white" : ""} />}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
