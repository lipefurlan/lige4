"use client";

/**
 * Origem usada nos QR codes. Ordem: NEXT_PUBLIC_SITE_URL; em dev aberto via localhost,
 * o IP da rede local (o celular não alcança "localhost"); senão o endereço atual.
 */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const { hostname, origin } = window.location;
  const lan = process.env.NEXT_PUBLIC_DEV_LAN_ORIGIN;
  if (lan && (hostname === "localhost" || hostname === "127.0.0.1")) return lan;
  return origin;
}

export function multiplayerEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
