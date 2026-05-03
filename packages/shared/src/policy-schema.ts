import type { Address } from "viem";

/**
 * Policy types published as ENS text records under `policy:rules` (JSON form)
 * and `policy:rules-encoded` (ABI-encoded form, what the smart account reads).
 *
 * Layer 2 ships with `blocklist` only. `limits` and `patterns` are reserved
 * for Layer 4 — declared here so the discriminated union is forward-stable
 * and the SDK can route by `type` from day one.
 */

export type BlocklistRules = {
  type: "blocklist";
  addresses: Address[];
};

export type LimitsRules = {
  type: "limits";
  /** Per-transaction maximum, in wei. */
  maxPerTxWei: bigint;
  /** Per-day maximum, in wei. Counter is kept in smart-account state. */
  maxPerDayWei: bigint;
};

export type PatternsRules = {
  type: "patterns";
  /** Substrings checked against the user's original message before signing. */
  patterns: string[];
};

export type PolicyRule = BlocklistRules | LimitsRules | PatternsRules;

export type PolicyRuleType = PolicyRule["type"];

/** A policy list as resolved from a single authority's ENS name. */
export type PolicyList = {
  authorityEns: string;
  rule: PolicyRule;
};
