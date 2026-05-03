import { namehash } from "viem/ens";
import type { Hex } from "viem";

import {
  ENS_KEYS,
  decodeBlocklist,
  type PolicyList,
} from "@ensfirewall/shared";

import { getPublicClient } from "../chain/clients.js";
import { publicResolverAbi } from "../abi/publicResolver.js";
import { resolveResolverAddress } from "./resolveResolver.js";

/**
 * Read and decode the policy list published at `authorityEns`.
 *
 *   policy:rules-encoded → ABI-encoded `address[]` (Layer 2: blocklist only)
 *
 * Returns null when:
 *   - the name has no resolver
 *   - the resolver has no `policy:rules-encoded` text record
 *
 * Layer 2 only knows blocklist. Discriminating between blocklist / limits /
 * patterns will need either a separate `policy:rules-type` text key, a
 * version byte at the head of the encoded blob, or sniffing the JSON sibling
 * at `policy:rules`. That decision lives with aleregex when limits/patterns
 * land in Layer 4.
 */
export async function getPolicyList(
  authorityEns: string,
): Promise<PolicyList | null> {
  const node = namehash(authorityEns);

  const resolver = await resolveResolverAddress(node);
  if (!resolver) return null;

  const client = getPublicClient();
  const hex = (await client.readContract({
    address: resolver,
    abi: publicResolverAbi,
    functionName: "text",
    args: [node, ENS_KEYS.POLICY_RULES_ENCODED],
  })) as string;

  if (!hex) return null;

  const addresses = decodeBlocklist(hex as Hex);

  return {
    authorityEns,
    rule: { type: "blocklist", addresses },
  };
}
