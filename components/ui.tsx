"use client";

import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { NICKNAME_MAX } from "@/lib/room";
import type { LiveStatus } from "@/lib/useRealtime";

export function Logo({ size = "md" }: { size?: "md" | "xl" }) {
  const big = size === "xl";
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-extrabold tracking-tight">
      <span className={`flex ${big ? "gap-1.5" : "gap-1"}`} aria-hidden>
        {["piece-p1", "piece-p2", "piece-p1", "piece-p2"].map((c, i) => (
          <span key={i} className={`${c} rounded-full ${big ? "size-7 sm:size-9" : "size-3.5"}`} />
        ))}
      </span>
      <span className={big ? "text-5xl sm:text-7xl" : "text-xl"}>Lig 4</span>
    </Link>
  );
}

export function QrCard({ url, size = 200, caption }: { url: string; size?: number; caption?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-3 shadow-2xl">
        <QRCodeSVG value={url} size={size} level="M" marginSize={0} />
      </div>
      {caption && <p className="max-w-[18rem] break-all text-center text-sm text-white/60">{caption}</p>}
    </div>
  );
}

export function LiveBadge({ status }: { status: LiveStatus }) {
  const map = {
    live: { dot: "bg-mint", text: "ao vivo" },
    connecting: { dot: "bg-white/50 animate-pulse", text: "conectando…" },
    offline: { dot: "bg-p1 animate-pulse", text: "reconectando…" },
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/70">
      <span className={`size-2 rounded-full ${map.dot}`} />
      {map.text}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "yellow" }) {
  const styles = {
    primary: "bg-p1 text-white shadow-[0_6px_0_var(--color-p1-deep)] active:translate-y-[3px] active:shadow-[0_3px_0_var(--color-p1-deep)]",
    yellow: "bg-p2 text-ink shadow-[0_6px_0_var(--color-p2-deep)] active:translate-y-[3px] active:shadow-[0_3px_0_var(--color-p2-deep)]",
    ghost: "bg-white/8 text-white ring-1 ring-white/15 active:bg-white/15",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`min-h-14 rounded-2xl px-6 text-lg font-extrabold transition disabled:opacity-50 disabled:active:translate-y-0 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function NicknameForm({
  title,
  initial,
  submitLabel,
  onSubmit,
}: {
  title: string;
  initial: string;
  submitLabel: string;
  onSubmit: (nickname: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSubmit(value);
  };
  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-center text-3xl font-extrabold">{title}</h1>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-white/70">Seu apelido</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={NICKNAME_MAX}
          autoComplete="nickname"
          enterKeyHint="go"
          placeholder="Ex.: Ana"
          className="min-h-14 rounded-2xl bg-white/10 px-4 text-xl font-bold outline-none ring-1 ring-white/15 placeholder:text-white/30 focus:ring-2 focus:ring-p2"
        />
      </label>
      <Button type="submit" disabled={!value.trim()}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-white px-5 py-3 text-center font-bold text-ink shadow-2xl"
    >
      {message}
    </div>
  );
}
