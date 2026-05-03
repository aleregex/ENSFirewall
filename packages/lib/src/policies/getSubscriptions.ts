import { namehash } from "viem/ens";

import { ENS_KEYS } from "@ensfirewall/shared";

import { getPublicClient } from "../chain/clients.js";
import { publicResolverAbi } from "../abi/publicResolver.js";
import { resolveResolverAddress } from "./resolveResolver.js";

/**
 * Read the `policy:subscriptions` text record from an agent's ENS name and
 * return the list of authorities the agent trusts.
 *
 * Format (per aleregex's spec): comma-separated string, no whitespace, no
 * newlines, no JSON. We `.trim()` defensively in case a human edited the
 * record by hand in the ENS app, but encoders should write exactly:
 *
 *   "scamlist.ensfirewall.eth,limits.ensfirewall.eth"
 *
 * Returns [] when the name has no resolver, no record, or an empty record.
 */
export async function getSubscriptions(agentEns: string): Promise<string[]> {
  const node = namehash(agentEns);

  const resolver = await resolveResolverAddress(node);
  if (!resolver) return [];

  const client = getPublicClient();
  const csv = (await client.readContract({
    address: resolver,
    abi: publicResolverAbi,
    functionName: "text",
    args: [node, ENS_KEYS.POLICY_SUBSCRIPTIONS],
  })) as string;

  if (!csv) return [];

  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
