import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--color-accent-cyan)] to-[color:var(--color-accent-violet)] shadow-[0_0_30px_-4px_rgba(168,85,247,0.7)]">
        <Shield size={28} className="text-[#07091a]" />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          ENSFirewall
        </h1>
        <p className="max-w-xl text-base text-[color:var(--color-muted)]">
          Permissionless security for AI agents. Policies live in ENS. Enforced
          onchain by an ERC-4337 smart account that refuses to sign violating
          transactions — even if the agent itself is fully compromised.
        </p>
      </div>

      <Link
        href="/live"
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--color-accent-cyan)] to-[color:var(--color-accent-violet)] px-5 py-3 text-sm font-medium text-[#07091a] shadow-[0_0_20px_-4px_rgba(44,228,255,0.6)] transition-transform hover:scale-[1.03]"
      >
        Open live demo
        <ArrowRight size={16} />
      </Link>

      <p className="text-[11px] uppercase tracking-wider text-[color:var(--color-muted)]">
        ETHGlobal Open Agents · Sepolia testnet
      </p>
    </main>
  );
}
