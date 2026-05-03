"use client";

import { Network } from "lucide-react";

import { truncateAddress } from "@/lib/utils";

// TODO(layer-5/G27): wire to live SDK reads + Framer Motion animations
// triggered by chat tool-call lifecycle. For now this is a static schematic so
// the 3-panel layout reads correctly during early dev.
export function EnsStatePanel({
  agentEns,
  smartAccountAddress,
}: {
  agentEns: string;
  smartAccountAddress: string;
}) {
  return (
    <aside className="flex h-full flex-col gap-4 rounded-2xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)]/70 p-5 shadow-[0_0_40px_-12px_rgba(168,85,247,0.20)] backdrop-blur-sm">
      <header className="flex items-center gap-2">
        <Network size={14} className="text-[color:var(--color-accent-violet)]" />
        <h2 className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-muted)]">
          ENS policy graph
        </h2>
      </header>

      <div className="rounded-xl border border-[color:var(--color-border-subtle)] bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
          Agent
        </p>
        <p className="mt-1 font-mono text-sm text-[color:var(--color-foreground)]">
          {agentEns}
        </p>
        <p className="mt-1 font-mono text-[10px] text-[color:var(--color-muted)]">
          {truncateAddress(smartAccountAddress, 6, 4)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
          Subscribed authorities
        </p>
        {[
          { name: "scamlist.ensfirewall.eth", rule: "blocklist" },
          { name: "limits.ensfirewall.eth", rule: "limits" },
          { name: "patterns.ensfirewall.eth", rule: "patterns" },
        ].map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between rounded-lg border border-[color:var(--color-border-subtle)] bg-black/30 px-3 py-2"
          >
            <span className="font-mono text-xs text-[color:var(--color-foreground)]">
              {s.name}
            </span>
            <span className="rounded-full border border-[color:var(--color-accent-violet)]/40 bg-[color:var(--color-accent-violet)]/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[color:var(--color-accent-violet)]">
              {s.rule}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-lg border border-dashed border-[color:var(--color-border-subtle)] p-3 text-center text-[10px] text-[color:var(--color-muted)]">
        Animations + live ENS reads coming in G27 (Layer 5).
      </div>
    </aside>
  );
}
