import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  isAddress,
  parseAbi,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import {
  buildSafeUserOp,
  PolicyViolation,
  type BuildSafeUserOpResult,
  type PolicyCheck,
} from "./ens-firewall";
import { explorerAddressUrl, explorerTxUrl } from "./utils";

export const TOOL_NAMES = {
  GET_BALANCE: "getBalance",
  SEND_TRANSACTION: "sendTransaction",
} as const;

const addressSchema = z
  .string()
  .refine((s) => isAddress(s), "Must be a valid Ethereum address (0x… 42 chars)");

// Demo safety cap: even if the policies allow a transfer, the server caps each
// broadcast to this amount so a malicious visitor can't drain the smart account
// by repeatedly asking the agent to send to their own address.
const MAX_DEMO_BROADCAST_ETH = 0.0001;

const EXECUTE_ABI = parseAbi([
  "function execute(address dest, uint256 value, bytes func)",
]);

function getRpcUrl(): string | undefined {
  return process.env.SEPOLIA_RPC_URL ?? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
}

function getOwnerKey(): Hex | null {
  const raw = process.env.DEPLOYER_PRIVATE_KEY;
  if (!raw) return null;
  if (!raw.startsWith("0x") || raw.length !== 66) {
    console.error(
      "[tools] DEPLOYER_PRIVATE_KEY is set but malformed (expected 0x + 64 hex chars). Falling back to simulated mode.",
    );
    return null;
  }
  return raw as Hex;
}

/**
 * Builds the tool set for a chat session bound to a specific agent + smart
 * account. The visitor connects their own wallet client-side to fund the
 * smart account; the agent's tools always operate on the project's smart
 * account, never on the visitor's EOA.
 */
export function buildAgentTools(args: {
  agentEns: string;
  smartAccountAddress: Address;
}): ToolSet {
  const { agentEns, smartAccountAddress } = args;

  return {
    [TOOL_NAMES.GET_BALANCE]: tool({
      description:
        "Returns the current ETH balance of the agent's smart account on Sepolia.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const client = createPublicClient({
            chain: sepolia,
            transport: http(getRpcUrl()),
          });
          const wei = await client.getBalance({ address: smartAccountAddress });
          const eth = Number(wei) / 1e18;
          return {
            address: smartAccountAddress,
            explorerUrl: explorerAddressUrl(smartAccountAddress),
            wei: wei.toString(),
            eth: eth.toFixed(6),
          };
        } catch (err) {
          return { error: errorMessage(err) };
        }
      },
    }),

    [TOOL_NAMES.SEND_TRANSACTION]: tool({
      description:
        "Sends ETH from the agent's smart account to a destination address. " +
        "The smart account validates against ENS-published policies before signing. " +
        "If any policy is violated the transaction is rejected and an explanation is returned.",
      inputSchema: z.object({
        destination: addressSchema.describe(
          "Destination address (0x… 42 chars).",
        ),
        amountEth: z
          .number()
          .positive()
          .max(10, "Demo cap: max 10 ETH per request.")
          .describe("Amount of ETH to send."),
        userMessage: z
          .string()
          .describe(
            "The original user prompt that triggered this transaction. " +
              "Pattern policies validate against this string.",
          ),
      }),
      execute: async ({ destination, amountEth, userMessage }) => {
        // Step 1 — offchain validation against ENS-published policies.
        let result: BuildSafeUserOpResult;
        try {
          result = await buildSafeUserOp({
            smartAccount: smartAccountAddress,
            agentEns,
            call: {
              to: destination as Address,
              value: parseEther(amountEth.toString()),
            },
            userMessage,
          });
        } catch (err) {
          if (err instanceof PolicyViolation) {
            return {
              status: "blocked" as const,
              authorityEns: err.authorityEns,
              ruleType: err.ruleType,
              reason: err.reason,
              checks: err.checks satisfies PolicyCheck[],
              destination,
              amountEth,
            };
          }
          return { status: "error" as const, error: errorMessage(err) };
        }

        // Step 2 — broadcast if owner key is available; otherwise simulate.
        const ownerKey = getOwnerKey();
        if (!ownerKey) {
          return {
            status: "simulated" as const,
            smartAccount: smartAccountAddress,
            smartAccountUrl: explorerAddressUrl(smartAccountAddress),
            message:
              "Policy validation passed. Broadcasting is disabled in this environment (no DEPLOYER_PRIVATE_KEY set).",
            checks: result.checks,
            destination,
            amountEth,
          };
        }

        // Demo safety cap.
        if (amountEth > MAX_DEMO_BROADCAST_ETH) {
          return {
            status: "rejected" as const,
            reason: `Demo broadcast cap: max ${MAX_DEMO_BROADCAST_ETH} ETH per call (you requested ${amountEth} ETH). Policies allowed it, but the server-side cap limits real transfers to protect the demo smart account from drain attacks. Try a smaller amount.`,
            checks: result.checks,
            destination,
            amountEth,
          };
        }

        // Step 3 — sign and broadcast execute(target, value, "0x") on the
        // smart account. Method 1 (direct owner call). The contract will
        // re-validate the policy onchain before forwarding the transfer.
        try {
          const account = privateKeyToAccount(ownerKey);
          const walletClient = createWalletClient({
            account,
            chain: sepolia,
            transport: http(getRpcUrl()),
          });

          const calldata = encodeFunctionData({
            abi: EXECUTE_ABI,
            functionName: "execute",
            args: [destination as Address, parseEther(amountEth.toString()), "0x"],
          });

          const txHash = await walletClient.sendTransaction({
            to: smartAccountAddress,
            data: calldata,
          });

          console.info(
            `[tools] broadcast: ${amountEth} ETH from ${smartAccountAddress} → ${destination}, tx=${txHash}`,
          );

          return {
            status: "broadcast" as const,
            txHash,
            explorerUrl: explorerTxUrl(txHash),
            smartAccount: smartAccountAddress,
            smartAccountUrl: explorerAddressUrl(smartAccountAddress),
            checks: result.checks,
            destination,
            amountEth,
          };
        } catch (err) {
          // RPC failures, gas estimation reverts (e.g., onchain validator
          // catches something the offchain validator missed — defense in
          // depth). Return the underlying error verbatim.
          return {
            status: "error" as const,
            error: errorMessage(err),
            destination,
            amountEth,
          };
        }
      },
    }),
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
