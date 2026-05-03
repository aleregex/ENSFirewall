import { getPublicClient } from "../chain/clients.js";
import { writeSafeContract } from "../chain/tx.js";
import {
  getEnsPublicResolverAddress,
  getEnsRegistryAddress,
} from "./addresses.js";
import { ensRegistryAbi } from "../abi/ensRegistry.js";
import { publicResolverAbi } from "../abi/publicResolver.js";

/**
 * Ensure that an ENS node has the Public Resolver configured.
 * Returns the tx hash if a write occurred, or undefined if already correct.
 */
export async function ensureResolver(
  node: `0x${string}`
): Promise<`0x${string}` | undefined> {
  const publicClient = getPublicClient();
  const ensRegistryAddress = getEnsRegistryAddress();
  const ensPublicResolverAddress = getEnsPublicResolverAddress();

  console.log("🔍 Checking resolver for node:", node);

  const currentResolver = await publicClient.readContract({
    address: ensRegistryAddress,
    abi: ensRegistryAbi,
    functionName: "resolver",
    args: [node],
  });

  console.log("  Current resolver:", currentResolver);
  console.log("  Expected resolver:", ensPublicResolverAddress);

  if (
    currentResolver.toLowerCase() === ensPublicResolverAddress.toLowerCase()
  ) {
    console.log("✅ Resolver already set correctly");
    return undefined;
  }

  console.log("🔧 Setting resolver to Public Resolver...");

  try {
    const result = await writeSafeContract(
      {
        address: ensRegistryAddress,
        abi: ensRegistryAbi,
        functionName: "setResolver",
        args: [node, ensPublicResolverAddress],
      },
      true
    );

    console.log("✅ Resolver set successfully:", {
      txHash: result.hash,
      blockNumber: result.receipt?.blockNumber,
    });

    return result.hash;
  } catch (error: any) {
    console.error("❌ Failed to set resolver:", error);
    throw new Error(`CANNOT_SET_RESOLVER: ${error.message}`);
  }
}

export interface TextRecord {
  key: string;
  value: string;
}

/**
 * Write a single text record (key/value) to the Public Resolver for a node.
 * The key is generic — pass any policy key from `@ensfirewall/shared`'s ENS_KEYS.
 */
export async function setTextRecord(
  node: `0x${string}`,
  key: string,
  value: string
): Promise<`0x${string}`> {
  const ensPublicResolverAddress = getEnsPublicResolverAddress();

  console.log(`📝 Setting "${key}" on ${node}`);

  try {
    const result = await writeSafeContract(
      {
        address: ensPublicResolverAddress,
        abi: publicResolverAbi,
        functionName: "setText",
        args: [node, key, value],
      },
      true
    );

    console.log(`  ✅ Text record set: ${key} (tx: ${result.hash})`);
    return result.hash;
  } catch (error: any) {
    console.error(`  ❌ Failed to set text record "${key}":`, error);
    throw new Error(`SET_TEXT_FAILED for "${key}": ${error.message}`);
  }
}

/**
 * Write multiple text records sequentially to the Public Resolver for a node.
 */
export async function setTextRecords(
  node: `0x${string}`,
  records: TextRecord[]
): Promise<`0x${string}`[]> {
  if (records.length === 0) {
    console.log("⚠️  No text records to set");
    return [];
  }

  console.log(`📝 Setting ${records.length} text record(s)...`);

  const txHashes: `0x${string}`[] = [];
  for (const record of records) {
    const hash = await setTextRecord(node, record.key, record.value);
    txHashes.push(hash);
  }

  console.log(`✅ All ${records.length} text record(s) set successfully`);
  return txHashes;
}

/**
 * Read a single text record (key) from the Public Resolver for a node.
 */
export async function getTextRecord(
  node: `0x${string}`,
  key: string
): Promise<string> {
  const publicClient = getPublicClient();
  const ensPublicResolverAddress = getEnsPublicResolverAddress();

  return (await publicClient.readContract({
    address: ensPublicResolverAddress,
    abi: publicResolverAbi,
    functionName: "text",
    args: [node, key],
  })) as string;
}
