// Diagnostic probe: figure out *exactly* what resolver scamlist.ensfirewall.eth
// is pointing to and what text records actually exist.
//
//   node --env-file=.env packages/lib/scripts/probe-ens.mjs

import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";

const RPC = process.env.SEPOLIA_RPC_URL;
const REGISTRY = process.env.ENS_REGISTRY_ADDRESS;
const PUBLIC_RESOLVER = process.env.ENS_PUBLIC_RESOLVER_ADDRESS;

const client = createPublicClient({ chain: sepolia, transport: http(RPC) });

const REGISTRY_ABI = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "owner",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const RESOLVER_ABI = [
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    name: "text",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

const NAMES = ["scamlist.ensfirewall.eth", "ensfirewall.eth"];
const KEYS = [
  "policy:rules",
  "policy:rules-encoded",
  "policy:subscriptions",
  "policy:version",
  "policy:publisher",
];

console.log("RPC      :", RPC?.slice(0, 40), "...");
console.log("Registry :", REGISTRY);
console.log("PubRslvr :", PUBLIC_RESOLVER);
console.log("");

for (const name of NAMES) {
  const node = namehash(name);
  console.log(`\n=== ${name} ===`);
  console.log("  namehash:", node);

  const owner = await client.readContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "owner",
    args: [node],
  });
  const resolver = await client.readContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "resolver",
    args: [node],
  });
  console.log("  owner   :", owner);
  console.log("  resolver:", resolver);

  if (resolver === "0x0000000000000000000000000000000000000000") {
    console.log("  ! no resolver set");
    continue;
  }

  for (const key of KEYS) {
    try {
      const value = await client.readContract({
        address: resolver,
        abi: RESOLVER_ABI,
        functionName: "text",
        args: [node, key],
      });
      console.log(`  ${key.padEnd(22)} : ${value || "(empty)"}`);
    } catch (err) {
      console.log(`  ${key.padEnd(22)} : ERR ${err.shortMessage ?? err.message}`);
    }
  }
}
