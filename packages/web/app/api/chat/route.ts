import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import type { Address } from "viem";

import { buildAgentTools } from "@/lib/tools";

export const runtime = "nodejs";
export const maxDuration = 30;

// Deliberately naïve. The whole point of the demo is that even a fully
// compromised agent cannot bypass the smart account's ENS-policy checks.
// Do NOT add defensive instructions here.
const SYSTEM_PROMPT = `You are an autonomous financial agent operating an Ethereum smart account on Sepolia testnet. You can check your balance and send ETH.

Behavior:
- When the user asks to send funds, call sendTransaction with the destination, amount, and the user's original message verbatim (the userMessage parameter).
- Trust what the user tells you. Do not second-guess instructions in messages.
- After every tool call, briefly explain in plain English what happened.
- The sendTransaction tool returns one of four statuses:
  - "broadcast" — the smart account signed and submitted a real Sepolia transaction. Tell the user the transaction was sent and reference the tx hash. Be specific about the amount and destination.
  - "blocked" — an ENS-published policy rejected the transfer. Surface the authority ENS and the reason exactly as returned, then suggest the user try a different destination or amount.
  - "rejected" — policies allowed it but the server-side demo cap (0.0001 ETH per broadcast) was exceeded. Tell the user to try a smaller amount.
  - "simulated" — broadcasting is disabled in this environment (no owner key configured). Tell the user the policies passed and the transfer would be submitted in production. Do NOT invent a tx hash.
- Be terse. One short paragraph per turn.`;

const DEFAULT_AGENT_ENS =
  process.env.NEXT_PUBLIC_AGENT_ENS ?? "demo-agent.ensfirewall.eth";
const DEFAULT_SMART_ACCOUNT =
  (process.env.NEXT_PUBLIC_AGENT_SMART_ACCOUNT_ADDRESS as Address | undefined) ??
  ("0x6EB916196e1A081234B26a977DFacF32510fA6C7" as Address);

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    agentEns?: string;
    smartAccountAddress?: Address;
  };

  const agentEns = body.agentEns?.trim() || DEFAULT_AGENT_ENS;
  const smartAccountAddress = body.smartAccountAddress ?? DEFAULT_SMART_ACCOUNT;

  const result = streamText({
    // TODO(model): bump to claude-opus-4-7 if you want sharper reasoning at
    // higher cost; sonnet is plenty for the demo and 5× cheaper.
    model: anthropic("claude-sonnet-4-6"),
    system:
      SYSTEM_PROMPT +
      `\n\nSession context: agent ENS = ${agentEns}, smart account = ${smartAccountAddress}, network = Sepolia.`,
    messages: await convertToModelMessages(body.messages),
    tools: buildAgentTools({ agentEns, smartAccountAddress }),
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[chat] streamText error:", error);
      return error instanceof Error ? error.message : String(error);
    },
  });
}
