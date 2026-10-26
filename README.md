# Lig 4

Lig 4 (Connect Four) feito com Next.js: jogue contra o computador (3 níveis) ou com um amigo no mesmo PC.

## Stack

- **Front-end:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- **Back-end:** Route Handler `POST /api/move` (vira função serverless no Vercel) com a IA em minimax + poda alfa-beta
- **Regras compartilhadas:** `src/lib/game.ts` é usado tanto pelo front quanto pelo back

```
src/
  app/page.tsx            página
  app/api/move/route.ts   back-end: recebe o tabuleiro, devolve a coluna do computador
  components/Game.tsx     tabuleiro, placar, modos
  lib/game.ts             regras (queda da peça, vitória, empate)
  lib/ai.ts               IA (minimax)
```

## Rodar local

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Atalhos: teclas 1–7 jogam na coluna, N começa nova partida.

## Deploy no Vercel

Suba o repositório no GitHub e importe em https://vercel.com/new (o Next.js é detectado sozinho, não precisa configurar nada). Ou, pela CLI:

```bash
npx vercel
```
