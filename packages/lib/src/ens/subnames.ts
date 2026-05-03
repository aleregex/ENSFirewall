import { namehash, normalize } from "viem/ens";
import { getAccount, getPublicClient } from "../chain/clients.js";
import { writeSafeContract } from "../chain/tx.js";
import { getEnsRootName } from "../chain/config.js";
import {
  getEnsPublicResolverAddress,
  getNameWrapperAddress,
} from "./addresses.js";
import { nameWrapperAbi } from "../abi/nameWrapper.js";

export interface EnsureSubnameResult {
  fqdn: string;
  node: `0x${string}`;
}

/**
 * Create or verify a wrapped ENS subdomain under the configured root name.
 * Idempotent: if the subname already exists with the deployer as owner, returns early.
 *
 * @param label - Subname label (e.g. "alice" → "alice.<ENS_ROOT_NAME>"). Lowercased before namehashing.
 * @throws SUBNAME_TAKEN if the subname exists with a different owner.
 */
export async function ensureSubname(params: {
  label: string;
}): Promise<EnsureSubnameResult> {
  const { label: rawLabel } = params;
  const account = getAccount();
  const publicClient = getPublicClient();
  const nameWrapperAddress = getNameWrapperAddress();
  const ensPublicResolverAddress = getEnsPublicResolverAddress();
  const ensRootName = getEnsRootName();

  const fqdn = `${rawLabel.toLowerCase()}.${ensRootName}`;
  const normalizedFqdn = normalize(fqdn);
  const node = namehash(normalizedFqdn) as `0x${string}`;

  const normalizedRoot = normalize(ensRootName);
  const parentNode = namehash(normalizedRoot) as `0x${string}`;
  const label = rawLabel.toLowerCase();

  console.log("🏷️  Ensuring ENS subname:", {
    fqdn: normalizedFqdn,
    node,
    parentNode,
    label,
  });

  try {
    const existingOwner = await publicClient.readContract({
      address: nameWrapperAddress,
      abi: nameWrapperAbi,
      functionName: "ownerOf",
      args: [BigInt(node)],
    });

    console.log("ℹ️  Subname already exists, owner:", existingOwner);

    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    if (existingOwner.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      console.log(
        "⚠️  Subname exists but is abandoned (owner is 0x0), will attempt to reclaim"
      );
    } else if (
      existingOwner.toLowerCase() === account.address.toLowerCase()
    ) {
      console.log("✅ Subname already owned by us, skipping creation");
      return { fqdn: normalizedFqdn, node };
    } else {
      throw new Error(
        `SUBNAME_TAKEN: ${normalizedFqdn} already exists with owner ${existingOwner}`
      );
    }
  } catch (error: any) {
    const isNotFoundError =
      error.message?.includes("ERC721") ||
      error.message?.includes("does not exist") ||
      error.message?.includes("owner query");

    if (!isNotFoundError && !error.message?.includes("SUBNAME_TAKEN")) {
      console.warn("⚠️  Unexpected error checking ownership:", error.message);
    } else if (error.message?.includes("SUBNAME_TAKEN")) {
      throw error;
    }
  }

  console.log("🔨 Creating wrapped subname with setSubnodeRecord...");

  const owner = account.address;
  const resolver = ensPublicResolverAddress;
  const ttl = BigInt(0);
  const fuses = 0;
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 31536000);

  try {
    const result = await writeSafeContract(
      {
        address: nameWrapperAddress,
        abi: nameWrapperAbi,
        functionName: "setSubnodeRecord",
        args: [parentNode, label, owner, resolver, ttl, fuses, expiry],
      },
      true
    );

    console.log("✅ Subname created successfully:", {
      fqdn: normalizedFqdn,
      node,
      txHash: result.hash,
      blockNumber: result.receipt?.blockNumber,
    });

    return { fqdn: normalizedFqdn, node };
  } catch (error: any) {
    if (
      error.message?.includes("already") ||
      error.message?.includes("exists")
    ) {
      console.log(
        "✅ Subname creation reverted (already exists), treating as success"
      );
      return { fqdn: normalizedFqdn, node };
    }

    console.error("❌ Failed to create subname:", error);
    throw new Error(`Failed to create ENS subname: ${error.message}`);
  }
}
