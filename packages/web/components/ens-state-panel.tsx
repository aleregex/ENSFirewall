import { Network } from "lucide-react";

import { truncateAddress } from "@/lib/utils";

const KNOWN_RULE_BY_AUTHORITY: Record<string, string> = {
  "scamlist.ensfirewall.eth": "blocklist",
};

export function EnsStatePanel({
  agentEns,
  smartAccountAddress,
  subscriptions,
}: {
  agentEns: string;
  smartAccountAddress: string;
  subscriptions: string[];
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
        {subscriptions.map((name) => {
          const rule = KNOWN_RULE_BY_AUTHORITY[name] ?? "policy";
          return (
            <div
              key={name}
              className="flex items-center justify-between rounded-lg border border-[color:var(--color-border-subtle)] bg-black/30 px-3 py-2"
            >
              <span className="font-mono text-xs text-[color:var(--color-foreground)]">
                {name}
              </span>
              <span className="rounded-full border border-[color:var(--color-accent-violet)]/40 bg-[color:var(--color-accent-violet)]/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[color:var(--color-accent-violet)]">
                {rule}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
