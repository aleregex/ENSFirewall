import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { createPublicClient, http, isAddress, parseEther, type Address } from "viem";
import { sepolia } from "viem/chains";

import {
  buildSafeUserOp,
  PolicyViolation,
  type BuildSafeUserOpResult,
  type PolicyCheck,
} from "./ens-firewall";
import { explorerTxUrl, explorerAddressUrl } from "./utils";

export const TOOL_NAMES = {
  GET_BALANCE: "getBalance",
  SEND_TRANSACTION: "sendTransaction",
} as const;

const addressSchema = z
  .string()
  .refine((s) => isAddress(s), "Must be a valid Ethereum address (0x… 42 chars)");

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
            transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
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
        try {
          const result: BuildSafeUserOpResult = await buildSafeUserOp({
            smartAccount: smartAccountAddress,
            agentEns,
            call: {
              to: destination as Address,
              value: parseEther(amountEth.toString()),
            },
            userMessage,
          });
          return {
            status: "submitted" as const,
            userOpHash: result.userOpHash,
            txHash: result.txHash ?? null,
            explorerUrl: result.txHash ? explorerTxUrl(result.txHash) : null,
            checks: result.checks,
            destination,
            amountEth,
          };
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
      },
    }),
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
