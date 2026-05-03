import { type Address, type Hex } from "viem";

import { getPublicClient } from "../chain/clients.js";
import { getEnsRegistryAddress } from "../ens/addresses.js";
import { ensRegistryAbi } from "../abi/ensRegistry.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Look up the resolver contract that an ENS node is configured to use,
 * by asking the registry. Returns null if no resolver is set.
 *
 * This is intentionally separate from the env-hardcoded
 * ENS_PUBLIC_RESOLVER_ADDRESS used by the write helpers — names on a
 * non-default resolver (which is the case for our authority subnames on
 * Sepolia) need their resolver looked up dynamically before any text()
 * call, otherwise reads come back empty.
 */
export async function resolveResolverAddress(
  node: Hex,
): Promise<Address | null> {
  const client = getPublicClient();
  const registry = getEnsRegistryAddress();

  const resolver = (await client.readContract({
    address: registry,
    abi: ensRegistryAbi,
    functionName: "resolver",
    args: [node],
  })) as Address;

  if (resolver === ZERO_ADDRESS) return null;
  return resolver;
}
