# Lig 4 ao vivo

Lig 4 (Connect Four) multiplayer para jogar pelo celular durante uma palestra: a plateia entra por QR code, joga em duplas e o telão mostra as partidas e o placar em tempo real.

- **Next.js (App Router) + TypeScript + Tailwind**, animação com **Framer Motion**
- **Supabase**: Postgres guarda o estado das salas; **Realtime** sincroniza os celulares
- Sem login: cada jogador tem um UUID anônimo no `localStorage` + um apelido
- Servidor é a autoridade: o cliente manda só `{ roomId, playerId, column }` para `/api/move`

| Rota | O que é |
| --- | --- |
| `/` | Criar sala / entrar com código de 4 letras |
| `/sala/ABCD` | Partida: 1º a entrar = vermelho, 2º = amarelo, o resto assiste |
| `/bot` | Contra o bot (minimax com poda alfa-beta, 3 níveis, roda só no navegador) |
| `/telao` | Partidas ao vivo + placar, para projetor |

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No painel, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e clique em **Run**. Isso cria as tabelas, liga o RLS (o cliente só lê) e adiciona `rooms` e `wins` ao Realtime.
3. Em **Project Settings → API**, copie a URL do projeto, a chave pública (`anon` / publishable) e a chave secreta (`service_role` / secret).

## 2. Rodar local

Requer Node 20.9+.

```bash
npm install
cp .env.example .env.local   # e preencha as 3 variáveis do Supabase
npm run dev:lan
```

`dev:lan` escuta em todas as interfaces, para os celulares no mesmo Wi-Fi acessarem `http://IP-DA-MÁQUINA:3000`. Em dev, o QR code já usa o IP da rede mesmo se você abrir pelo `localhost`. Se ele escolher a placa de rede errada, force com `LAN_IP=192.168.0.10 npm run dev:lan`. No Windows, permita o Node no firewall quando ele perguntar (rede privada).

Sem as variáveis do Supabase o app sobe mesmo assim, só com o modo contra o bot.

```bash
npm test          # testes da lógica do jogo (vitória, empate, bot)
npm run typecheck
```

## 3. Deploy na Vercel

1. Importe o repositório na Vercel (framework detectado: Next.js).
2. Em **Settings → Environment Variables**, cadastre:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (anon / publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta (service_role / secret). **Nunca** com prefixo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | opcional: URL pública usada no QR (ex.: `https://lig4.vercel.app`) |

3. Faça o deploy. Não precisa de servidor WebSocket: o Realtime é do Supabase e as jogadas passam por Route Handlers serverless.

## Como funciona

- **Lógica pura** em [`lib/game`](lib/game): `playMove`, `findWinner`, `isDraw` e o bot, sem React nem Supabase. A API e o bot usam o mesmo código.
- **Concorrência otimista**: o `UPDATE` da jogada só passa se `move_count` no banco ainda for o lido. Dois toques ao mesmo tempo → o segundo recebe 409 e o cliente re-sincroniza.
- **Segurança**: RLS ligado; o anon só lê `rooms` (ativas nas últimas 2h) e `wins`. Os UUIDs dos jogadores ficam em `room_seats`, que o anon não lê, para ninguém jogar no lugar de outro. Toda escrita usa a service role, só no servidor.
- **Rede instável**: se o canal Realtime cair, o cliente re-assina com backoff, re-sincroniza ao voltar online ou à aba, e faz polling (a cada 4s desconectado, 20s conectado).
- **Limpeza**: salas sem atividade há 2h somem da leitura pública (RLS) e são apagadas quando alguém cria uma sala nova. O placar fica.
