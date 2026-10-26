import os from "node:os";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
const VIRTUAL_IFACE = /virtual|vbox|vmware|vethernet|hyper-v|wsl|docker|loopback|bluetooth/i;

/**
 * IP da máquina na rede local, para o QR code apontar para um endereço que o celular alcança.
 * Pode ser forçado com LAN_IP=192.168.0.10 se a detecção escolher a placa errada.
 */
function lanAddress(): string | undefined {
  if (process.env.LAN_IP) return process.env.LAN_IP;
  const candidates = Object.entries(os.networkInterfaces()).flatMap(([name, list]) =>
    (list ?? [])
      .filter((a) => a.family === "IPv4" && !a.internal && PRIVATE_IP.test(a.address))
      .filter((a) => !VIRTUAL_IFACE.test(name) && !a.address.startsWith("192.168.56."))
      .map((a) => ({ name, address: a.address })),
  );
  return (candidates.find((c) => /wi-?fi|wlan|wireless/i.test(c.name)) ?? candidates[0])?.address;
}

export default function config(phase: string): NextConfig {
  const lan = phase === PHASE_DEVELOPMENT_SERVER ? lanAddress() : undefined;
  return {
    // Permite abrir o dev server pelo IP da rede local (celulares no mesmo Wi-Fi).
    allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
    env: lan ? { NEXT_PUBLIC_DEV_LAN_ORIGIN: `http://${lan}:${process.env.PORT ?? "3000"}` } : {},
  };
}
