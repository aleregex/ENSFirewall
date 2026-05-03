import { CheckCircle2, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

type EvidenceItem = {
  title: string;
  subtitle: string;
  txHash: string | null;
  status: "EXECUTED" | "REVERTED";
  href: string;
  errorMessage?: string;
  highlight?: boolean;
};

const SMART_ACCOUNT_URL =
  "https://sepolia.etherscan.io/address/0x6EB916196e1A081234B26a977DFacF32510fA6C7";

const EVIDENCE: EvidenceItem[] = [
  {
    title: "Safe transfer passed",
    subtitle: "Smart account allowed transfer to a non-blocked address.",
    txHash: "0x52a52a4169925e271a8625c5151dd9dec7cc0a52d1821e7f3a76659b343821a7",
    status: "EXECUTED",
    href: "https://sepolia.etherscan.io/tx/0x52a52a4169925e271a8625c5151dd9dec7cc0a52d1821e7f3a76659b343821a7",
  },
  {
    title: "Blocked transfer reverted onchain",
    subtitle:
      "Smart account read ENS, found target in blocklist, reverted with PolicyViolation.",
    txHash: null,
    status: "REVERTED",
    href: SMART_ACCOUNT_URL,
    errorMessage: "PolicyViolation('destination is on blocklist')",
  },
  {
    title: "ENS text record updated",
    subtitle: "Authority publisher removed an address from the blocklist.",
    txHash: "0x1013862193843acb2533adf3afe92151a6c7c38494f6eb1eb15e89fd3c2c59c0",
    status: "EXECUTED",
    href: "https://sepolia.etherscan.io/tx/0x1013862193843acb2533adf3afe92151a6c7c38494f6eb1eb15e89fd3c2c59c0",
  },
  {
    title: "Same blocked transfer now passes",
    subtitle:
      "Same smart account, same destination — now allowed because ENS changed. No contract redeploy.",
    txHash: "0xaf500081ecfab3e05ebd198b53ebc2269fd2def6e65f6d27f96acca68070183f",
    status: "EXECUTED",
    href: "https://sepolia.etherscan.io/tx/0xaf500081ecfab3e05ebd198b53ebc2269fd2def6e65f6d27f96acca68070183f",
    highlight: true,
  },
];

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function EvidencePanel() {
  return (
    <section className="relative z-10 mx-4 mb-4 rounded-2xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)]/70 p-4 shadow-[0_0_40px_-12px_rgba(44,228,255,0.20)] backdrop-blur-sm md:mx-6 md:mb-6 md:p-4">
      <header className="mb-3 flex flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert
            size={14}
            className="text-[color:var(--color-accent-cyan)]"
          />
          <h2 className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-muted)]">
            Verifiable evidence on Sepolia
          </h2>
        </div>
        <p className="text-[11px] text-[color:var(--color-muted)] md:text-right">
          Four real onchain txs prove the firewall enforces policies without
          redeploys. Click to verify on Etherscan.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {EVIDENCE.map((item) => (
          <EvidenceCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const isExecuted = item.status === "EXECUTED";
  const baseBorder = item.highlight
    ? "border-[color:var(--color-accent-cyan)]/50"
    : "border-[color:var(--color-border-subtle)]";
  const baseShadow = item.highlight
    ? "shadow-[0_0_28px_-6px_rgba(44,228,255,0.45)]"
    : "shadow-none";

  return (
    <Link
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      title={item.txHash ?? item.href}
      className={`group relative flex flex-col gap-2 rounded-xl border ${baseBorder} bg-black/30 p-3 ${baseShadow} transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-accent-cyan)]/60 hover:bg-black/40`}
    >
      {item.highlight && (
        <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full border border-[color:var(--color-accent-cyan)]/60 bg-[color:var(--color-background)] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[color:var(--color-accent-cyan)]">
          <Sparkles size={9} />
          Key result
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <StatusBadge status={item.status} />
        <ExternalLink
          size={12}
          className="text-[color:var(--color-muted)] transition-colors group-hover:text-[color:var(--color-accent-cyan)]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold leading-snug text-[color:var(--color-foreground)]">
          {item.title}
        </h3>
        <p className="text-xs leading-relaxed text-[color:var(--color-muted)]">
          {item.subtitle}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        {item.txHash ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider text-[color:var(--color-muted)]">
              Tx hash
            </span>
            <span
              aria-label={item.txHash}
              className={`font-mono text-[11px] ${
                isExecuted
                  ? "text-[color:var(--color-accent-cyan)]"
                  : "text-[color:var(--color-foreground)]"
              }`}
            >
              {truncateHash(item.txHash)}
            </span>
          </div>
        ) : item.errorMessage ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider text-[color:var(--color-muted)]">
              Revert reason
            </span>
            <span className="font-mono text-[11px] leading-snug text-[color:var(--color-danger)]">
              {item.errorMessage}
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: EvidenceItem["status"] }) {
  if (status === "EXECUTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[color:var(--color-success)]">
        <CheckCircle2 size={10} />
        Executed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[color:var(--color-danger)]">
      <ShieldAlert size={10} />
      Reverted
    </span>
  );
}
