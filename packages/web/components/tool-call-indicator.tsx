"use client";

import { CheckCircle2, Loader2, ShieldOff, Wrench, XCircle } from "lucide-react";

type Variant = "running" | "success" | "blocked" | "error";

const variantStyles: Record<Variant, string> = {
  running:
    "border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 text-[color:var(--color-accent-cyan)]",
  success: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  blocked: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  error: "border-rose-400/40 bg-rose-400/10 text-rose-300",
};

export function ToolCallIndicator({
  label,
  variant = "running",
  className = "",
}: {
  label: string;
  variant?: Variant;
  className?: string;
}) {
  const Icon =
    variant === "running"
      ? Loader2
      : variant === "success"
      ? CheckCircle2
      : variant === "blocked"
      ? ShieldOff
      : XCircle;
  return (
    <div
      className={`fade-slide-in inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      <Wrench size={12} className="opacity-70" />
      <Icon size={12} className={variant === "running" ? "animate-spin" : ""} />
      <span>{label}</span>
    </div>
  );
}
