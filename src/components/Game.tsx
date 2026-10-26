"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Board, COLS, Difficulty, Player, ROWS, createBoard, drop, findWin, isFull, other } from "@/lib/game";

type Mode = "cpu" | "pvp";

const PIECE: Record<Player, string> = {
  1: "bg-gradient-to-br from-red-400 to-red-600 shadow-[inset_0_-4px_0_rgba(0,0,0,0.25)]",
  2: "bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]",
};
const DIFFICULTY_LABEL: Record<Difficulty, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };

export default function Game() {
  const [mode, setMode] = useState<Mode>("cpu");
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [board, setBoard] = useState<Board>(createBoard);
  const [starter, setStarter] = useState<Player>(1);
  const [turn, setTurn] = useState<Player>(1);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [score, setScore] = useState({ 1: 0, 2: 0, draws: 0 });
  const gameId = useRef(0);

  const win = findWin(board);
  const draw = !win && isFull(board);
  const over = Boolean(win) || draw;
  const cpuTurn = mode === "cpu" && turn === 2 && !over;
  const names: Record<Player, string> = mode === "cpu" ? { 1: "Você", 2: "Computador" } : { 1: "Vermelho", 2: "Amarelo" };

  const play = useCallback(
    (col: number) => {
      const result = drop(board, col, turn);
      if (!result) return;
      setBoard(result.board);
      setLastMove({ row: result.row, col });
      const w = findWin(result.board);
      if (w) setScore((s) => ({ ...s, [w.player]: s[w.player] + 1 }));
      else if (isFull(result.board)) setScore((s) => ({ ...s, draws: s.draws + 1 }));
      else setTurn(other(turn));
    },
    [board, turn],
  );

  const humanPlay = (col: number) => {
    if (!over && !cpuTurn) play(col);
  };

  // Vez do computador: pergunta a jogada para o back-end.
  useEffect(() => {
    if (!cpuTurn) return;
    const id = gameId.current;
    const minDelay = new Promise((r) => setTimeout(r, 450));
    fetch("/api/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board, player: 2, difficulty }),
    })
      .then((res) => res.json())
      .then(async ({ column }) => {
        await minDelay;
        if (id === gameId.current && typeof column === "number") play(column);
      });
  }, [cpuTurn, board, difficulty, play]);

  const newGame = (nextMode = mode, nextStarter = other(starter)) => {
    gameId.current++;
    setBoard(createBoard());
    setStarter(nextStarter);
    setTurn(nextStarter);
    setLastMove(null);
    setMode(nextMode);
  };

  const changeMode = (m: Mode) => {
    if (m === mode) return;
    setScore({ 1: 0, 2: 0, draws: 0 });
    newGame(m, 1);
  };

  // Teclas 1–7 jogam na coluna correspondente (bom pra demo no telão).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= COLS) humanPlay(n - 1);
      if (e.key === "n" || e.key === "N") newGame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isWinning = (r: number, c: number) => win?.cells.some(([wr, wc]) => wr === r && wc === c) ?? false;

  let status: React.ReactNode;
  if (win) status = <>🎉 {names[win.player]} {mode === "cpu" && win.player === 1 ? "ganhou!" : "venceu!"}</>;
  else if (draw) status = <>Empate! Tabuleiro cheio.</>;
  else if (cpuTurn) status = <>Computador pensando…</>;
  else status = <>Vez de <b>{names[turn]}</b></>;

  return (
    // Largura limitada pela altura da janela para o tabuleiro inteiro caber no telão.
    <div className="flex w-full max-w-[max(320px,min(640px,calc(100dvh-330px)))] flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex rounded-full bg-white/10 p-1 text-sm font-medium">
          {(["cpu", "pvp"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              className={`rounded-full px-4 py-1.5 transition ${mode === m ? "bg-white text-slate-900" : "text-white/80 hover:text-white"}`}
            >
              {m === "cpu" ? "vs Computador" : "2 Jogadores"}
            </button>
          ))}
        </div>
        {mode === "cpu" && (
          <div className="flex rounded-full bg-white/10 p-1 text-sm font-medium">
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`rounded-full px-3 py-1.5 transition ${difficulty === d ? "bg-white text-slate-900" : "text-white/80 hover:text-white"}`}
              >
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid w-full grid-cols-3 items-center gap-2 text-center">
        <ScoreCard label={names[1]} value={score[1]} color={PIECE[1]} active={!over && turn === 1} />
        <div className="text-sm text-white/60">
          Empates
          <div className="text-2xl font-bold text-white">{score.draws}</div>
        </div>
        <ScoreCard label={names[2]} value={score[2]} color={PIECE[2]} active={!over && turn === 2} />
      </div>

      <p className="h-8 text-xl text-white" aria-live="polite">
        {status}
      </p>

      <div className="w-full select-none">
        {/* Fileira de "mira": mostra onde a peça vai cair */}
        <div className="grid grid-cols-7 px-[2%]">
          {Array.from({ length: COLS }, (_, c) => (
            <div key={c} className="aspect-square p-[12%]">
              {hoverCol === c && !over && !cpuTurn && <div className={`h-full w-full rounded-full opacity-60 ${PIECE[turn]}`} />}
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-7 rounded-2xl bg-blue-700 px-[2%] py-[2%] shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_-8px_0_rgba(0,0,0,0.25)]"
          onMouseLeave={() => setHoverCol(null)}
        >
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={c}
              aria-label={`Coluna ${c + 1}`}
              disabled={over || cpuTurn || board[0][c] !== 0}
              onClick={() => humanPlay(c)}
              onMouseEnter={() => setHoverCol(c)}
              className="flex flex-col rounded-xl transition enabled:cursor-pointer enabled:hover:bg-white/10 disabled:cursor-default"
            >
              {Array.from({ length: ROWS }, (_, r) => {
                const cell = board[r][c];
                const isLast = lastMove?.row === r && lastMove?.col === c;
                const dimmed = win && cell !== 0 && !isWinning(r, c);
                return (
                  <div key={r} className="aspect-square w-full p-[10%]">
                    <div className="relative h-full w-full rounded-full bg-slate-950 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]">
                      {cell !== 0 && (
                        <div
                          className={`absolute inset-0 rounded-full ${PIECE[cell]} ${isLast ? "animate-drop" : ""} ${isWinning(r, c) ? "animate-win ring-4 ring-white" : ""} ${dimmed ? "opacity-40" : ""}`}
                          style={isLast ? ({ "--drop": `${-(r + 1) * 125}%` } as React.CSSProperties) : undefined}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => newGame()}
          className="rounded-full bg-white px-6 py-2.5 font-semibold text-slate-900 shadow-lg transition hover:scale-105 active:scale-95"
        >
          Nova partida
        </button>
        <p className="text-xs text-white/40">Atalhos: teclas 1–7 jogam · N = nova partida</p>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, color, active }: { label: string; value: number; color: string; active: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-3 rounded-2xl px-3 py-2 transition ${active ? "bg-white/15 ring-2 ring-white/40" : "bg-white/5"}`}>
      <div className={`h-7 w-7 shrink-0 rounded-full ${color}`} />
      <div className="text-left">
        <div className="text-xs text-white/60">{label}</div>
        <div className="text-2xl leading-none font-bold text-white">{value}</div>
      </div>
    </div>
  );
}
