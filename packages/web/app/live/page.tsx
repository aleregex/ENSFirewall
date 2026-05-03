import { Shield } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { Address } from "viem";

import { ChatPanel } from "@/components/chat-panel";
import { AgentWalletPanel } from "@/components/agent-wallet-panel";
import { EnsStatePanel } from "@/components/ens-state-panel";
import { EvidencePanel } from "@/components/evidence-panel";
import { getSubscriptions } from "@/lib/ens-firewall";

export const dynamic = "force-dynamic";

const AGENT_ENS =
  process.env.NEXT_PUBLIC_AGENT_ENS ?? "demo-agent.ensfirewall.eth";
const SMART_ACCOUNT =
  (process.env.NEXT_PUBLIC_AGENT_SMART_ACCOUNT_ADDRESS as Address | undefined) ??
  ("0x6EB916196e1A081234B26a977DFacF32510fA6C7" as Address);

export default async function LivePage() {
  const subscriptions = await getSubscriptions(AGENT_ENS);
  return (
    <main className="relative flex min-h-screen flex-col md:h-screen md:min-h-0 md:overflow-hidden">
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

      <div className="relative z-10 grid min-h-[640px] grid-cols-1 gap-4 px-4 pb-4 md:min-h-0 md:flex-1 md:grid-cols-[3fr_2fr_2fr] md:grid-rows-1 md:px-6 md:pb-4">
        <ChatPanel agentEns={AGENT_ENS} smartAccountAddress={SMART_ACCOUNT} />
        <EnsStatePanel
          agentEns={AGENT_ENS}
          smartAccountAddress={SMART_ACCOUNT}
          subscriptions={subscriptions}
        />
        <AgentWalletPanel agentEns={AGENT_ENS} smartAccountAddress={SMART_ACCOUNT} />
      </div>

      <EvidencePanel />
    </main>
  );
}
