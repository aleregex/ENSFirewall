import type { Abi, Address } from "viem";
import { getPublicClient, getWalletClient } from "./clients.js";

export interface WriteContractParams<TAbi extends Abi = Abi> {
  address: Address;
  abi: TAbi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

export interface WriteContractResult {
  hash: `0x${string}`;
  receipt?: {
    status: "success" | "reverted";
    blockNumber: bigint;
    gasUsed: bigint;
    transactionHash: `0x${string}`;
  };
}

export async function writeSafeContract<TAbi extends Abi>(
  params: WriteContractParams<TAbi>,
  waitForReceipt = true
): Promise<WriteContractResult> {
  const publicClient = getPublicClient();
  const walletClient = getWalletClient();

  try {
    console.log("🔍 Simulating contract call:", {
      address: params.address,
      functionName: params.functionName,
      args: params.args,
    });

    const { request } = await publicClient.simulateContract({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
      value: params.value,
      account: walletClient.account,
    } as any);

    console.log("✅ Simulation successful, sending transaction...");

    const hash = await walletClient.writeContract(request as any);

    console.log("📤 Transaction sent:", hash);

    if (waitForReceipt) {
      console.log("⏳ Waiting for transaction receipt...");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

      console.log("✅ Transaction confirmed:", {
        hash: receipt.transactionHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      });

      return {
        hash,
        receipt: {
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          transactionHash: receipt.transactionHash,
        },
      };
    }

    return { hash };
  } catch (error) {
    console.error("❌ Error writing contract:", error);

    if (error instanceof Error) {
      throw new Error(`Contract call failed: ${error.message}`);
    }

    throw error;
  }
}
