"use client";

import { Check, Copy, ExternalLink, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { parseEther, type Address } from "viem";
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";

import { explorerAddressUrl, explorerTxUrl, truncateAddress } from "@/lib/utils";

const FUND_AMOUNT_ETH = "0.01";

export function AgentWalletPanel({
  smartAccountAddress,
  agentEns,
}: {
  smartAccountAddress: Address;
  agentEns: string;
}) {
  const { isConnected } = useAccount();
  const { data: balance, refetch } = useBalance({
    address: smartAccountAddress,
    query: { refetchInterval: 5_000 },
  });

  const { data: txHash, sendTransaction, isPending, reset } = useSendTransaction();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [copied, setCopied] = useState(false);

  // Refresh balance when a fund tx confirms.
  useEffect(() => {
    if (isSuccess) {
      void refetch();
      const t = setTimeout(() => reset(), 3000);
      return () => clearTimeout(t);
    }
  }, [isSuccess, refetch, reset]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(smartAccountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  const onFund = () => {
    sendTransaction({
      to: smartAccountAddress,
      value: parseEther(FUND_AMOUNT_ETH),
    });
  };

  const fundDisabled = !isConnected || isPending || isMining;
  const fundLabel = isPending
    ? "Confirming in wallet…"
    : isMining
    ? "Funding…"
    : `Fund agent (${FUND_AMOUNT_ETH} ETH)`;

  return (
    <aside className="flex h-full flex-col gap-4 rounded-2xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)]/70 p-5 shadow-[0_0_40px_-12px_rgba(44,228,255,0.25)] backdrop-blur-sm">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[color:var(--color-muted)]">
          <Wallet size={14} className="text-[color:var(--color-accent-cyan)]" />
          Agent smart account
        </h2>
        <Link
          href={explorerAddressUrl(smartAccountAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
        >
          Etherscan
          <ExternalLink size={10} />
        </Link>
      </header>

      <section>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
          ENS
        </p>
        <div className="rounded-xl border border-[color:var(--color-border-subtle)] bg-black/30 px-3 py-2 font-mono text-xs text-[color:var(--color-foreground)]">
          {agentEns}
        </div>
      </section>

      <section>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
          Address
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border-subtle)] bg-black/30 px-3 py-2 font-mono text-xs">
          <span className="flex-1 truncate text-[color:var(--color-foreground)]">
            {truncateAddress(smartAccountAddress, 8, 8)}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="rounded p-1 text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            aria-label="Copy address"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </section>

      <section>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
          Balance
        </p>
        <div className="rounded-xl border border-[color:var(--color-border-subtle)] bg-black/30 px-4 py-3">
          <span className="text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)]">
            {balance ? Number(balance.formatted).toFixed(4) : "0.0000"}
            <span className="ml-2 text-base font-medium text-[color:var(--color-accent-cyan)]">
              ETH
            </span>
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={onFund}
        disabled={fundDisabled}
        className="rounded-xl bg-gradient-to-r from-[color:var(--color-accent-cyan)] to-[color:var(--color-accent-violet)] px-4 py-2.5 text-sm font-medium text-[#07091a] shadow-[0_0_20px_-4px_rgba(44,228,255,0.6)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:saturate-50"
      >
        {fundLabel}
      </button>

      {txHash && (
        <Link
          href={explorerTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-accent-cyan)] hover:underline"
        >
          {isSuccess ? "Funded ·" : "Pending ·"} {truncateAddress(txHash, 6, 4)}
          <ExternalLink size={10} />
        </Link>
      )}

      {!isConnected && (
        <p className="rounded-lg border border-dashed border-[color:var(--color-border-subtle)] p-3 text-center text-[11px] text-[color:var(--color-muted)]">
          Connect a Sepolia wallet to fund the agent.
        </p>
      )}
    </aside>
  );
}
