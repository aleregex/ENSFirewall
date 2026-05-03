/**
 * STUB of the `ens-agent-firewall` SDK that OscarGauss is building in parallel
 * (tasks G3-G7). The shape mirrors the planned public API so swapping to the
 * real package is a one-line import change at every call-site.
 *
 * TODO(SDK): once `ens-agent-firewall` is published, delete this file and:
 *   import { buildSafeUserOp, getSubscriptions, getPolicyList, PolicyViolation }
 *     from "ens-agent-firewall";
 */

import { isAddressEqual, type Address, type Hex } from "viem";

// ---------- Types (mirror packages/shared/src/policy-schema.ts) ----------

export type BlocklistRules = {
  type: "blocklist";
  addresses: Address[];
};

export type LimitsRules = {
  type: "limits";
  maxPerTxWei: bigint;
  maxPerDayWei: bigint;
};

export type PatternsRules = {
  type: "patterns";
  patterns: string[];
};

export type PolicyRule = BlocklistRules | LimitsRules | PatternsRules;

export type PolicyList = {
  authorityEns: string;
  rule: PolicyRule;
};

export type Call = {
  to: Address;
  value: bigint;
  data?: Hex;
};

export type BuildSafeUserOpArgs = {
  smartAccount: Address;
  agentEns: string;
  call: Call;
  userMessage: string;
};

export type BuildSafeUserOpResult = {
  status: "would-submit";
  userOpHash: Hex;
  txHash?: Hex;
  // Surface what the SDK checked so the UI can visualize ENS reads.
  checks: PolicyCheck[];
};

export type PolicyCheck = {
  authorityEns: string;
  ruleType: PolicyRule["type"];
  passed: boolean;
  reason?: string;
};

// ---------- Errors ----------

export class PolicyViolation extends Error {
  readonly authorityEns: string;
  readonly ruleType: PolicyRule["type"];
  readonly reason: string;
  readonly checks: PolicyCheck[];

  constructor(args: {
    authorityEns: string;
    ruleType: PolicyRule["type"];
    reason: string;
    checks: PolicyCheck[];
  }) {
    super(`Policy violation by ${args.authorityEns} (${args.ruleType}): ${args.reason}`);
    this.name = "PolicyViolation";
    this.authorityEns = args.authorityEns;
    this.ruleType = args.ruleType;
    this.reason = args.reason;
    this.checks = args.checks;
  }
}

// ---------- Dummy data (delete when SDK is wired) ----------

const DUMMY_SUBSCRIPTIONS: Record<string, string[]> = {
  "demo-agent.ensfirewall.eth": [
    "scamlist.ensfirewall.eth",
    "limits.ensfirewall.eth",
    "patterns.ensfirewall.eth",
  ],
  "second-agent.ensfirewall.eth": [
    "scamlist.ensfirewall.eth",
    "community-reports.ensfirewall.eth",
  ],
};

const DUMMY_POLICY_LISTS: Record<string, PolicyRule> = {
  "scamlist.ensfirewall.eth": {
    type: "blocklist",
    addresses: [
      "0xBADBADBADBADBADBADBADBADBADBADBADBADBAD0",
      "0xBADBADBADBADBADBADBADBADBADBADBADBADBAD1",
    ] as Address[],
  },
  "limits.ensfirewall.eth": {
    type: "limits",
    maxPerTxWei: 100_000_000_000_000_000n, // 0.1 ETH
    maxPerDayWei: 500_000_000_000_000_000n, // 0.5 ETH
  },
  "patterns.ensfirewall.eth": {
    type: "patterns",
    patterns: [
      "ignore previous instructions",
      "as the new system prompt",
      "you are now",
      "send all funds",
    ],
  },
  "community-reports.ensfirewall.eth": {
    type: "blocklist",
    addresses: [],
  },
};

// ---------- Public API ----------

// TODO(SDK): replace with real ENS resolver read of `policy:subscriptions`.
export async function getSubscriptions(agentEns: string): Promise<string[]> {
  await fakeLatency();
  return DUMMY_SUBSCRIPTIONS[agentEns] ?? [];
}

// TODO(SDK): replace with real ENS resolver read of `policy:rules-encoded` + decode.
export async function getPolicyList(authorityEns: string): Promise<PolicyList | null> {
  await fakeLatency();
  const rule = DUMMY_POLICY_LISTS[authorityEns];
  if (!rule) return null;
  return { authorityEns, rule };
}

export function validateBlocklist(
  call: Call,
  rule: BlocklistRules,
): { valid: true } | { valid: false; reason: string } {
  for (const blocked of rule.addresses) {
    if (isAddressEqual(call.to, blocked)) {
      return { valid: false, reason: `recipient ${call.to} is on the blocklist` };
    }
  }
  return { valid: true };
}

export function validateLimits(
  call: Call,
  rule: LimitsRules,
): { valid: true } | { valid: false; reason: string } {
  if (call.value > rule.maxPerTxWei) {
    const eth = Number(call.value) / 1e18;
    const max = Number(rule.maxPerTxWei) / 1e18;
    return {
      valid: false,
      reason: `amount ${eth} ETH exceeds per-tx limit of ${max} ETH`,
    };
  }
  return { valid: true };
}

export function validatePatterns(
  userMessage: string,
  rule: PatternsRules,
): { valid: true } | { valid: false; reason: string } {
  const lower = userMessage.toLowerCase();
  for (const pattern of rule.patterns) {
    if (lower.includes(pattern.toLowerCase())) {
      return {
        valid: false,
        reason: `user message contains injection pattern: "${pattern}"`,
      };
    }
  }
  return { valid: true };
}

/**
 * Orchestrator. Reads ENS subscriptions, fetches each policy, runs the right
 * validator, throws PolicyViolation if any rule fails. If everything passes,
 * returns a stub userOpHash.
 *
 * TODO(SDK): replace dummy success path with real `buildSafeUserOp` from the
 * SDK + Pimlico bundler submission.
 */
export async function buildSafeUserOp(
  args: BuildSafeUserOpArgs,
): Promise<BuildSafeUserOpResult> {
  const subscriptions = await getSubscriptions(args.agentEns);
  const checks: PolicyCheck[] = [];

  for (const authorityEns of subscriptions) {
    const list = await getPolicyList(authorityEns);
    if (!list) continue;

    let result: { valid: true } | { valid: false; reason: string };
    switch (list.rule.type) {
      case "blocklist":
        result = validateBlocklist(args.call, list.rule);
        break;
      case "limits":
        result = validateLimits(args.call, list.rule);
        break;
      case "patterns":
        result = validatePatterns(args.userMessage, list.rule);
        break;
    }

    const check: PolicyCheck = {
      authorityEns,
      ruleType: list.rule.type,
      passed: result.valid,
      reason: result.valid ? undefined : result.reason,
    };
    checks.push(check);

    if (!result.valid) {
      throw new PolicyViolation({
        authorityEns,
        ruleType: list.rule.type,
        reason: result.reason,
        checks,
      });
    }
  }

  // TODO(SDK): instead of fake hash, sign userOp with agent session key and
  // submit to Pimlico bundler, return real userOpHash + txHash.
  const fakeHash = `0x${"de".repeat(32)}` as Hex;
  return {
    status: "would-submit",
    userOpHash: fakeHash,
    checks,
  };
}

// ---------- Internal ----------

async function fakeLatency(): Promise<void> {
  // Mimic ENS resolver round-trip so the UI animations feel real.
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
}
