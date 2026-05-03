/**
 * STUB of the `ens-agent-firewall` SDK that OscarGauss is building in parallel
 * (tasks G3-G7). The shape mirrors the planned public API so swapping to the
 * real package is a one-line import change at every call-site.
 *
 * TODO(SDK): once `ens-agent-firewall` is published, delete this file and:
 *   import { buildSafeUserOp, getSubscriptions, getPolicyList, PolicyViolation }
 *     from "ens-agent-firewall";
 */

import {
  createPublicClient,
  decodeAbiParameters,
  http,
  isAddressEqual,
  namehash,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";

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
  status: "validated";
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

// ---------- ENS resolver client ----------

const PUBLIC_RESOLVER = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5" as Address;
const RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

const client = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

const TEXT_ABI = parseAbi([
  "function text(bytes32, string) view returns (string)",
]);

async function readText(authorityEns: string, key: string): Promise<string> {
  const node = namehash(authorityEns);
  return await client.readContract({
    address: PUBLIC_RESOLVER,
    abi: TEXT_ABI,
    functionName: "text",
    args: [node, key],
  });
}

// ---------- Public API ----------

export async function getSubscriptions(agentEns: string): Promise<string[]> {
  try {
    const value = await readText(agentEns, "policy:subscriptions");

    if (!value || value.length === 0) {
      // Fallback to known subscriptions for the demo agent since not every
      // agent ENS will have a subscription record written yet.
      if (agentEns === "demo-agent.ensfirewall.eth") {
        return ["scamlist.ensfirewall.eth"];
      }
      return [];
    }

    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (err) {
    console.error("Failed to read subscriptions from ENS:", err);
    if (agentEns === "demo-agent.ensfirewall.eth") {
      return ["scamlist.ensfirewall.eth"];
    }
    return [];
  }
}

export async function getPolicyList(authorityEns: string): Promise<PolicyList | null> {
  try {
    // Try blocklist first.
    const blocklistHex = await readText(authorityEns, "policy:rules-encoded");
    if (blocklistHex && blocklistHex.length > 2) {
      const [addresses] = decodeAbiParameters(
        [{ type: "address[]" }],
        blocklistHex as `0x${string}`,
      );
      return {
        authorityEns,
        rule: {
          type: "blocklist",
          addresses: addresses as Address[],
        },
      };
    }

    // Then limits.
    const limitsHex = await readText(authorityEns, "policy:limits-encoded");
    if (limitsHex && limitsHex.length > 2) {
      const [maxPerTx, maxPerDay] = decodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        limitsHex as `0x${string}`,
      );
      return {
        authorityEns,
        rule: {
          type: "limits",
          maxPerTxWei: maxPerTx as bigint,
          maxPerDayWei: maxPerDay as bigint,
        },
      };
    }

    // Patterns aren't onchain yet — keep a static fallback for the demo
    // authority so the prompt-injection path still has something to validate.
    if (authorityEns === "patterns.ensfirewall.eth") {
      return {
        authorityEns,
        rule: {
          type: "patterns",
          patterns: [
            "ignore previous instructions",
            "as the new system prompt",
            "you are now",
            "send all funds",
          ],
        },
      };
    }

    return null;
  } catch (err) {
    console.error(`Failed to read policy from ${authorityEns}:`, err);
    return null;
  }
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

  // TODO(SDK): once wired to Pimlico, sign userOp with agent session key and
  // broadcast — return real userOpHash + txHash and switch status to "submitted".
  // For now the demo only validates; it does not broadcast.
  return {
    status: "validated",
    checks,
  };
}
