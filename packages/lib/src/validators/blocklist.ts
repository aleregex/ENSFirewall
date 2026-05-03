import { isAddressEqual, type Address, type Hex } from "viem";
import type { BlocklistRules } from "@ensfirewall/shared";

/**
 * Shape of a transaction the SDK is about to build a userOp for. Mirrors the
 * fields on the on-chain `execute(target, value, data)` call so a successful
 * offchain validation implies a successful onchain validation under the same
 * input.
 */
export type Call = {
  to: Address;
  value: bigint;
  data?: Hex;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Pure offchain blocklist check. Mirrors `PolicyValidator.validateBlocklist`
 * in Solidity:
 *
 *     for (uint i; i < blocked.length; i++)
 *         if (blocked[i] == target) revert PolicyViolation(...);
 *
 * The string in `reason` is *not* the on-chain revert reason verbatim — that
 * one is fixed by the contract — but the SDK can show a richer message to the
 * LLM/UI without changing observable contract behaviour.
 */
export function validateBlocklist(
  call: Call,
  rule: BlocklistRules,
): ValidationResult {
  for (const blocked of rule.addresses) {
    if (isAddressEqual(call.to, blocked)) {
      return {
        valid: false,
        reason: `recipient ${call.to} is on the blocklist`,
      };
    }
  }
  return { valid: true };
}
