"use client";

import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from "ai";
import Link from "next/link";

import { ToolCallIndicator } from "./tool-call-indicator";
import { PolicyViolationCard } from "./policy-violation-card";
import { truncateAddress } from "@/lib/utils";

const TOOL_LABELS: Record<
  string,
  { running: string; success: string; blocked: string; error: string }
> = {
  "tool-getBalance": {
    running: "Reading balance…",
    success: "Balance read",
    blocked: "Balance read",
    error: "Balance read failed",
  },
  "tool-sendTransaction": {
    running: "Building userOp + ENS policy check…",
    success: "Policy Check Passed",
    blocked: "Transaction blocked by ENS policy",
    error: "Transaction failed",
  },
};

type AnyPart = UIMessagePart<UIDataTypes, UITools>;

export function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`fade-slide-in flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`min-w-0 max-w-[88%] space-y-2 wrap-anywhere rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "border border-[color:var(--color-accent-violet)]/40 bg-gradient-to-br from-[color:var(--color-accent-violet)]/25 to-[color:var(--color-accent-violet)]/10 text-[color:var(--color-foreground)]"
            : "border border-[color:var(--color-accent-cyan)]/30 bg-[color:var(--color-surface)]/80 text-[color:var(--color-foreground)] backdrop-blur-sm"
        }`}
      >
        {message.parts.map((part, i) => (
          <PartRenderer key={i} part={part} />
        ))}
      </div>
    </div>
  );
}

function PartRenderer({ part }: { part: AnyPart }) {
  if (part.type === "text") {
    return <RichText text={part.text} />;
  }

  if (part.type.startsWith("tool-")) {
    const labels = TOOL_LABELS[part.type] ?? {
      running: `Running ${part.type.replace("tool-", "")}…`,
      success: `${part.type.replace("tool-", "")} done`,
      blocked: `${part.type.replace("tool-", "")} blocked`,
      error: `${part.type.replace("tool-", "")} failed`,
    };

    const toolPart = part as Extract<AnyPart, { state: string; toolCallId: string }>;
    const state = toolPart.state;

    if (state === "input-streaming" || state === "input-available") {
      return <ToolCallIndicator label={labels.running} variant="running" />;
    }
    if (state === "output-error") {
      const errorText = (toolPart as { errorText?: string }).errorText;
      return (
        <div className="flex flex-col gap-1">
          <ToolCallIndicator label={labels.error} variant="error" />
          {errorText && (
            <span className="text-xs text-rose-300/80">{errorText}</span>
          )}
        </div>
      );
    }
    if (state === "output-available") {
      const output = (toolPart as { output?: unknown }).output;
      return <ToolOutputView type={part.type} labels={labels} output={output} />;
    }
    return null;
  }

  return null;
}

function ToolOutputView({
  type,
  labels,
  output,
}: {
  type: string;
  labels: { success: string; blocked: string; error: string };
  output: unknown;
}) {
  if (!output || typeof output !== "object") return null;
  const data = output as Record<string, unknown>;

  // sendTransaction → blocked variant gets full PolicyViolationCard
  if (type === "tool-sendTransaction" && data.status === "blocked") {
    return (
      <div className="flex flex-col gap-1.5">
        <ToolCallIndicator label={labels.blocked} variant="blocked" />
        <PolicyViolationCard
          authorityEns={String(data.authorityEns ?? "")}
          ruleType={String(data.ruleType ?? "")}
          reason={String(data.reason ?? "")}
          destination={
            typeof data.destination === "string" ? data.destination : undefined
          }
          amountEth={
            typeof data.amountEth === "number" ? data.amountEth : undefined
          }
          checks={Array.isArray(data.checks) ? (data.checks as never) : undefined}
        />
      </div>
    );
  }

  if (type === "tool-sendTransaction" && data.status === "broadcast") {
    const txHash = typeof data.txHash === "string" ? data.txHash : null;
    const explorerUrl =
      typeof data.explorerUrl === "string" ? data.explorerUrl : null;
    const destination =
      typeof data.destination === "string" ? data.destination : null;
    const amountEth =
      typeof data.amountEth === "number" ? data.amountEth : null;
    return (
      <div className="flex flex-col gap-1.5">
        <ToolCallIndicator
          label="Broadcast onchain"
          variant="success"
        />
        <div className="flex flex-col gap-1 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3">
          <p className="text-xs leading-relaxed text-[color:var(--color-foreground)]">
            All ENS-published policies allowed this call. The smart account
            signed and submitted it to Sepolia.
          </p>
          {amountEth !== null && destination && (
            <p className="text-[11px] text-[color:var(--color-muted)]">
              Sent{" "}
              <span className="font-mono text-[color:var(--color-foreground)]">
                {amountEth} ETH
              </span>{" "}
              to{" "}
              <span className="font-mono text-[color:var(--color-foreground)]">
                {truncateAddress(destination, 6, 4)}
              </span>
            </p>
          )}
          {txHash && (
            <Link
              href={explorerUrl ?? `https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-[color:var(--color-accent-cyan)] underline-offset-2 hover:underline"
            >
              {`${txHash.slice(0, 10)}…${txHash.slice(-8)}`}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (type === "tool-sendTransaction" && data.status === "rejected") {
    const reason = typeof data.reason === "string" ? data.reason : "";
    return (
      <div className="flex flex-col gap-1.5">
        <ToolCallIndicator
          label="Demo cap exceeded"
          variant="blocked"
        />
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-relaxed text-[color:var(--color-foreground)]/90">
          {reason}
        </p>
      </div>
    );
  }

  if (type === "tool-sendTransaction" && data.status === "simulated") {
    const smartAccount =
      typeof data.smartAccount === "string" ? data.smartAccount : null;
    const smartAccountUrl =
      typeof data.smartAccountUrl === "string" ? data.smartAccountUrl : null;
    return (
      <div className="flex flex-col gap-1.5">
        <ToolCallIndicator label={labels.success} variant="success" />
        <p className="text-xs leading-relaxed text-[color:var(--color-muted)]">
          All ENS-published policies allow this transaction. In production, the
          smart account at{" "}
          {smartAccount && smartAccountUrl ? (
            <Link
              href={smartAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[color:var(--color-accent-cyan)] underline-offset-2 hover:underline"
            >
              {truncateAddress(smartAccount, 6, 4)}
            </Link>
          ) : (
            <span className="font-mono">the agent</span>
          )}{" "}
          would now sign and broadcast onchain.
        </p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex flex-col gap-1">
        <ToolCallIndicator label={labels.error} variant="error" />
        <span className="text-xs text-rose-300/80">{String(data.error)}</span>
      </div>
    );
  }

  if (type === "tool-getBalance" && typeof data.eth === "string") {
    return (
      <div className="flex flex-col gap-1">
        <ToolCallIndicator label={labels.success} variant="success" />
        <span className="text-xs text-[color:var(--color-muted)]">
          Balance:{" "}
          <span className="font-mono text-[color:var(--color-foreground)]">
            {data.eth} ETH
          </span>
          {typeof data.address === "string" && (
            <>
              {" "}
              · <span className="font-mono">{truncateAddress(data.address, 6, 4)}</span>
            </>
          )}
        </span>
      </div>
    );
  }

  return <ToolCallIndicator label={labels.success} variant="success" />;
}

function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = linkRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <Link
        key={key++}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[color:var(--color-accent-cyan)] underline underline-offset-2 hover:opacity-80"
      >
        {match[1]}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return <p className="whitespace-pre-wrap">{parts}</p>;
}
