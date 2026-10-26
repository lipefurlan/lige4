"use client";

import { useEffect, useState } from "react";
import { Board } from "@/components/Board";
import { Button, Logo } from "@/components/ui";
import { RED, YELLOW, createGame, other, playMove, type GameState, type Player } from "@/lib/game/board";
import { bestMove, type Difficulty } from "@/lib/game/bot";

const HUMAN: Player = RED;
const BOT: Player = YELLOW;
const LEVELS: { id: Difficulty; label: string }[] = [
  { id: "facil", label: "Fácil" },
  { id: "medio", label: "Médio" },
  { id: "dificil", label: "Difícil" },
];

// Partida contra o bot: tudo no cliente, sem back-end.
export default function BotPage() {
  const [level, setLevel] = useState<Difficulty>("medio");
  const [starter, setStarter] = useState<Player>(HUMAN);
  const [game, setGame] = useState<GameState>(() => createGame(HUMAN));
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ you: 0, bot: 0, draws: 0 });

  const finished = game.winner !== null;
  const botTurn = !finished && game.currentTurn === BOT;

  function apply(col: number) {
    const result = playMove(game, col);
    if (!result.ok) return;
    setGame(result.state);
    setLastMove(result.cell);
    const w = result.state.winner;
    if (w !== null) setScore((s) => (w === 0 ? { ...s, draws: s.draws + 1 } : w === HUMAN ? { ...s, you: s.you + 1 } : { ...s, bot: s.bot + 1 }));
  }

  useEffect(() => {
    if (!botTurn) return;
    // Espera a peça do jogador terminar de cair antes de "pensar".
    const timer = setTimeout(() => apply(bestMove(game.board, BOT, level)), 550);
    return () => clearTimeout(timer);
  }, [botTurn, game]);

  function newGame(nextLevel = level) {
    const nextStarter = finished ? other(starter) : starter;
    setLevel(nextLevel);
    setStarter(nextStarter);
    setGame(createGame(nextStarter));
    setLastMove(null);
    setRound((r) => r + 1);
  }

  const banner = finished
    ? game.winner === 0
      ? "Empate!"
      : game.winner === HUMAN
        ? "Você venceu! 🎉"
        : "O bot venceu 🤖"
    : botTurn
      ? "Bot pensando…"
      : "Sua vez!";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between px-1">
        <Logo />
        <span className="rounded-full bg-white/8 px-3 py-1 text-sm font-bold">
          Você {score.you} × {score.bot} Bot
        </span>
      </header>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Dificuldade">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={level === l.id}
            onClick={() => (game.moveCount === 0 || finished ? newGame(l.id) : setLevel(l.id))}
            className={`min-h-12 rounded-xl font-extrabold ring-1 transition ${
              level === l.id ? "bg-white text-ink ring-white" : "bg-white/5 text-white/70 ring-white/15"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div
        aria-live="polite"
        className={`rounded-2xl px-4 py-3 text-center text-2xl font-extrabold ${
          finished ? "bg-mint text-ink" : botTurn ? "bg-p2/15 text-p2 ring-1 ring-p2/40" : "animate-pulse bg-p1 text-white"
        }`}
      >
        {banner}
      </div>

      <div className="flex flex-1 items-center">
        <Board
          board={game.board}
          winningCells={game.winningCells}
          lastMove={lastMove}
          gameKey={round}
          finished={finished}
          playable={!finished && !botTurn ? HUMAN : null}
          onColumn={apply}
        />
      </div>

      {finished ? (
        <Button variant="yellow" onClick={() => newGame()} className="mx-auto min-w-56">
          Revanche
        </Button>
      ) : (
        <p className="text-center text-sm text-white/50">
          Você é o vermelho · {starter === HUMAN ? "você começou" : "o bot começou"}
        </p>
      )}
    </main>
  );
}
