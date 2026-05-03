import { Shield } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { Address } from "viem";

import { ChatPanel } from "@/components/chat-panel";
import { AgentWalletPanel } from "@/components/agent-wallet-panel";
import { EnsStatePanel } from "@/components/ens-state-panel";

export const dynamic = "force-dynamic";

const AGENT_ENS =
  process.env.NEXT_PUBLIC_AGENT_ENS ?? "demo-agent.ensfirewall.eth";
const SMART_ACCOUNT =
  (process.env.NEXT_PUBLIC_AGENT_SMART_ACCOUNT_ADDRESS as Address | undefined) ??
  ("0x000000000000000000000000000000000000dEaD" as Address);

// Note: this page renders client components inside; it stays a server component
// itself so the env vars can be read at build/request time without leaking the
// values into a public client bundle (they're already NEXT_PUBLIC_, so this is
// pure tidiness).
export default function LivePage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[color:var(--color-accent-cyan)] to-[color:var(--color-accent-violet)] shadow-[0_0_18px_-4px_rgba(168,85,247,0.7)]">
            <Shield size={18} className="text-[#07091a]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold leading-tight">ENSFirewall</h1>
            <span className="text-[11px] uppercase tracking-wider text-[color:var(--color-muted)]">
              Live demo · Sepolia
            </span>
          </div>
        </div>
        <ConnectButton chainStatus="icon" accountStatus="address" showBalance={false} />
      </header>

      <div className="relative z-10 grid h-[calc(100vh-72px)] grid-cols-1 gap-4 px-4 pb-4 md:grid-cols-[3fr_2fr_2fr] md:px-6 md:pb-6">
        <ChatPanel agentEns={AGENT_ENS} smartAccountAddress={SMART_ACCOUNT} />
        <EnsStatePanel agentEns={AGENT_ENS} smartAccountAddress={SMART_ACCOUNT} />
        <AgentWalletPanel agentEns={AGENT_ENS} smartAccountAddress={SMART_ACCOUNT} />
      </div>
    </main>
  );
}
