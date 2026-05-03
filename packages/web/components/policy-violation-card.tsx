"use client";

import { ShieldOff } from "lucide-react";

import { truncateAddress } from "@/lib/utils";

type Check = {
  authorityEns: string;
  ruleType: string;
  passed: boolean;
  reason?: string;
};

export function PolicyViolationCard({
  authorityEns,
  ruleType,
  reason,
  destination,
  amountEth,
  checks,
}: {
  authorityEns: string;
  ruleType: string;
  reason: string;
  destination?: string;
  amountEth?: number;
  checks?: Check[];
}) {
  return (
    <div className="fade-slide-in flex flex-col gap-2 rounded-xl border border-amber-400/40 bg-amber-400/5 p-3">
      <div className="flex items-center gap-2">
        <ShieldOff size={14} className="text-amber-300" />
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-200">
          Blocked by {authorityEns}
        </span>
      </div>
      <p className="text-xs text-[color:var(--color-foreground)]/90">
        {reason}
      </p>
      {(destination || amountEth !== undefined) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[color:var(--color-muted)]">
          {amountEth !== undefined && (
            <span>
              amount:{" "}
              <span className="font-mono text-[color:var(--color-foreground)]">
                {amountEth} ETH
              </span>
            </span>
          )}
          {destination && (
            <span>
              to:{" "}
              <span className="font-mono text-[color:var(--color-foreground)]">
                {truncateAddress(destination, 6, 4)}
              </span>
            </span>
          )}
          <span>
            rule: <span className="font-mono">{ruleType}</span>
          </span>
        </div>
      )}
      {checks && checks.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 border-t border-amber-400/20 pt-2">
          {checks.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-[10px] text-[color:var(--color-muted)]"
            >
              <span className="font-mono">{c.authorityEns}</span>
              <span
                className={
                  c.passed ? "text-emerald-300" : "text-amber-200"
                }
              >
                {c.passed ? "PASS" : "FAIL"} · {c.ruleType}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
