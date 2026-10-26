"use client";

import { cleanNickname, isUuid } from "./room";

const ID_KEY = "lig4:playerId";
const NICK_KEY = "lig4:nickname";

let memoryId: string | null = null;

// crypto.randomUUID só existe em contexto seguro (https/localhost). Pelo IP da rede local
// (http://192.168…) ele não existe, então montamos o UUID v4 com getRandomValues.
function uuidv4(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** UUID anônimo do jogador, salvo no localStorage. */
export function getPlayerId(): string {
  try {
    const saved = localStorage.getItem(ID_KEY);
    if (isUuid(saved)) return saved;
    const id = uuidv4();
    localStorage.setItem(ID_KEY, id);
    return id;
  } catch {
    memoryId ??= uuidv4();
    return memoryId;
  }
}

export function getNickname(): string {
  try {
    return localStorage.getItem(NICK_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveNickname(input: string): string | null {
  const nick = cleanNickname(input);
  if (!nick) return null;
  try {
    localStorage.setItem(NICK_KEY, nick);
  } catch {
    // modo privado sem storage: segue só nesta aba
  }
  return nick;
}
