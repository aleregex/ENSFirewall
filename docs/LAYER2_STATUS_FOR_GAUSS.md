# Layer 2 Status & Smart Account Integration Brief

> Status update for **OscarGauss** (and your AI assistant). This document explains what aleregex completed in Layer 2 (contracts side), what's live on Sepolia, and how the SDK should integrate with the smart account.
>
> **Read this entire document before starting any SDK work that touches the smart account.**

---

## TL;DR

- Layer 2 contracts side is **DONE** and **live on Sepolia**.
- The smart account is deployed, subscribed to a policy in ENS, and end-to-end tested.
- The project's core thesis is **proven on real Sepolia transactions**: changing an ENS text record changes the smart account's behavior with no redeploy.
- Now Gauss can build the SDK against a real, live smart account.

---

## What was achieved

### The thesis is proven on Sepolia

aleregex completed 9 of 9 Layer 2 tasks. The final E2E test ran 3 scenarios on real Sepolia:

1. **Safe transfer:** smart account allowed a transfer to a non-blocked address ✅
2. **Blocked transfer:** smart account refused (reverted onchain) when the destination was on the blocklist ❌ (expected fail)
3. **ENS-driven behavior change:** updated the ENS text record to remove the blocked address, **the same transfer now passes** ✅ — without touching the contract

This is the core thesis of ENSFirewall, proven with real onchain transactions. Any judge can verify it by clicking the tx hashes (see "Evidence" below).

### What's live on Sepolia

| Item | Value |
|---|---|
| Smart Account (proxy) | `0x6EB916196e1A081234B26a977DFacF32510fA6C7` |
| Implementation | `0x43210ea5330d1Ee965b896671E7064D54d40a555` |
| EntryPoint v0.8 (Sepolia) | `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108` |
| Authority subscribed | `scamlist.ensfirewall.eth` |
| Authority namehash | `0xbbddcabcea9c861cd383a22397cc740ec468b664393240f35f21e62b04e5b567` |
| Public Resolver (Sepolia) | `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5` |
| Owner (deployer wallet) | `0xEb6aD8e0923a2890484B545c22F99b97Bc69C7eb` |
| Smart account balance | ~0.04 ETH (Sepolia) |

### Evidence (4 verifiable tx hashes)

| What happened | Tx Hash |
|---|---|
| Safe transfer passed | [`0x52a52a41...`](https://sepolia.etherscan.io/tx/0x52a52a4169925e271a8625c5151dd9dec7cc0a52d1821e7f3a76659b343821a7) |
| Blocked transfer reverted | `PolicyViolation("destination is on blocklist")` returned in `eth_estimateGas` |
| ENS text record updated | [`0x10138621...`](https://sepolia.etherscan.io/tx/0x1013862193843acb2533adf3afe92151a6c7c38494f6eb1eb15e89fd3c2c59c0) |
| Same blocked transfer now passes | [`0xaf500081...`](https://sepolia.etherscan.io/tx/0xaf500081ecfab3e05ebd198b53ebc2269fd2def6e65f6d27f96acca68070183f) |

Full details in `docs/E2E_RESULTS.md`.

---

## Quick verification commands

Anyone can run these to confirm the system is alive:

```bash
# Read the smart account's authority
cast call 0x6EB916196e1A081234B26a977DFacF32510fA6C7 \
  "authorityNode()(bytes32)" \
  --rpc-url $SEPOLIA_RPC_URL

# Read the policy from ENS
cast call 0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5 \
  "text(bytes32,string)(string)" \
  0xbbddcabcea9c861cd383a22397cc740ec468b664393240f35f21e62b04e5b567 \
  "policy:rules-encoded" \
  --rpc-url $SEPOLIA_RPC_URL

# Check smart account balance
cast balance 0x6EB916196e1A081234B26a977DFacF32510fA6C7 \
  --rpc-url $SEPOLIA_RPC_URL --ether
```

---

## Smart account: public API

Source: `packages/contracts/src/ENSFirewallAccount.sol`. Inherits from `SimpleAccount` (eth-infinitism reference, ERC-4337 v0.8).

### Read methods (no gas)

```solidity
function owner() external view returns (address);
function authorityNode() external view returns (bytes32);
function publicResolver() external view returns (address);
function entryPoint() external view returns (address);
function getNonce() external view returns (uint256);
```

### Write methods (require auth: owner OR EntryPoint)

```solidity
// Single transaction execution
function execute(address dest, uint256 value, bytes calldata func) external;

// Batch transaction execution
function executeBatch(Call[] calldata calls) external;
struct Call { address target; uint256 value; bytes data; }

// Change the subscribed authority (admin)
function setAuthority(bytes32 newNode) external;

// Change the public resolver address (admin)
function setPublicResolver(address newResolver) external;
```

### Behavior of execute()

Before executing any call, the contract:

1. Reads `text(authorityNode, "policy:rules-encoded")` from the public resolver
2. If empty string, allows the call (no policy = no restriction)
3. If not empty, decodes the hex string back to bytes, then ABI-decodes to `address[]`
4. If the destination address is in the blocklist array, reverts with `PolicyViolation("destination is on blocklist")`
5. Otherwise, executes the call

The `PolicyViolation` error comes from `packages/contracts/src/PolicyValidator.sol`. Selector: `0x698f91a4`.

---

## How to fund the smart account

The smart account is just an Ethereum address. Send ETH or ERC-20 tokens to it like any other address.

```bash
# From owner wallet, send 0.02 ETH to the smart account
cast send 0x6EB916196e1A081234B26a977DFacF32510fA6C7 \
  --value 0.02ether \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $SEPOLIA_RPC_URL
```

For ERC-20 tokens, call the token contract's `transfer(to, amount)` with the smart account address as `to`.

The smart account currently has ~0.04 ETH and is ready to execute test transactions.

---

## How the SDK should call the smart account

There are two paths. Recommend starting with Method 1 for Layer 3 dev, then upgrading to Method 2 when integrating with Pimlico.

### Method 1 — Direct call by owner (simplest, used in A9 tests)

The owner wallet calls `execute()` directly. This is what aleregex used in the A9 tests. No bundler, no userOp, no signature aggregation. Just a normal Ethereum transaction.

```typescript
import { encodeFunctionData } from "viem";
import { walletClient } from "...";
import { ENSFirewallAccountAbi } from "...";

const SMART_ACCOUNT = "0x6EB916196e1A081234B26a977DFacF32510fA6C7";

const data = encodeFunctionData({
  abi: ENSFirewallAccountAbi,
  functionName: "execute",
  args: [destination, value, callData],
});

const txHash = await walletClient.sendTransaction({
  to: SMART_ACCOUNT,
  data,
});
```

If the destination is blocked, the transaction reverts with `PolicyViolation`. The SDK should catch this and present a friendly error to the agent.

### Method 2 — Via Pimlico bundler (proper ERC-4337 flow)

For Layer 3+, the agent has its own session key (separate from owner). The agent constructs a UserOperation, signs it with the session key, and Pimlico's bundler submits it to the EntryPoint.

This is what enables the agent to run autonomously without exposing the owner key.

Pseudocode using `permissionless.js` (refer to Pimlico docs for exact API):

```typescript
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http } from "viem";
import { sepolia } from "viem/chains";

const ENTRY_POINT = "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108";

const account = await toSimpleSmartAccount({
  client: publicClient,
  entryPoint: { address: ENTRY_POINT, version: "0.8" },
  owner: agentSessionKey,
  address: "0x6EB916196e1A081234B26a977DFacF32510fA6C7",
});

const smartAccountClient = createSmartAccountClient({
  account,
  bundlerTransport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`),
  chain: sepolia,
});

await smartAccountClient.sendTransaction({
  to: destination,
  value,
  data: callData,
});
```

---

## How the SDK should validate offchain (defense in depth)

Even though the contract validates onchain, the SDK should validate the same logic offchain BEFORE constructing the userOp. This gives the agent fast feedback ("I can't do that") instead of a failed tx.

```typescript
import { ENS_KEYS, decodeBlocklist } from "@ensfirewall/shared";
import { getTextRecord } from "ens-agent-firewall";

async function validateLocally(target: Address) {
  // Layer 2 simplification: hardcode authority. Multi-authority comes in Layer 4.
  const authorityName = "scamlist.ensfirewall.eth";
  
  const hexBlob = await getTextRecord(authorityName, ENS_KEYS.POLICY_RULES_ENCODED);
  if (!hexBlob || hexBlob.length === 0) return { valid: true };
  
  const blocked = decodeBlocklist(hexBlob as `0x${string}`);
  const isBlocked = blocked.some(addr => addr.toLowerCase() === target.toLowerCase());
  
  if (isBlocked) {
    return { valid: false, reason: "destination is on blocklist" };
  }
  
  return { valid: true };
}
```

Inside `buildSafeUserOp`:

```typescript
const result = await validateLocally(call.to);
if (!result.valid) {
  throw new Error(`PolicyViolation: ${result.reason}`);
}
// ... build userOp and submit
```

---

## CRITICAL: encoding format must match Solidity exactly

The contract decodes the policy blob as:

```solidity
address[] memory blocked = abi.decode(encoded, (address[]));
```

The SDK encoder (in `packages/shared/src/encoding.ts`) **must produce bytes that decode back to the exact same array.** This is non-negotiable: if the formats drift, both validators give different results and defense-in-depth breaks silently.

Required encoder:

```typescript
import { encodeAbiParameters } from "viem";
import type { Address } from "viem";

export function encodeBlocklist(addresses: Address[]): `0x${string}` {
  return encodeAbiParameters(
    [{ type: "address[]" }],
    [addresses]
  );
}

export function decodeBlocklist(encoded: `0x${string}`): Address[] {
  const [decoded] = decodeAbiParameters(
    [{ type: "address[]" }],
    encoded
  );
  return decoded as Address[];
}
```

### Mandatory round-trip test

Before relying on the SDK encoder for production, do this cross-validation test:

1. Gauss encodes an array of 3 test addresses with viem
2. Sends the resulting hex to aleregex
3. aleregex writes a quick Foundry test that calls `abi.decode` on those bytes
4. Confirms the array comes back identical

If this fails, fix the encoder before continuing. Don't ship divergent encoders.

---

## Test addresses already published

The `scamlist.ensfirewall.eth` text record currently contains:

```
[0xbad0000000000000000000000000000000000002]
```

Note: `0xBaD0000000000000000000000000000000000001` was originally in the list but was removed during the A9 E2E test (Test 3: "policy change without redeploy").

To add new test addresses, either:
- Update the existing `scamlist.ensfirewall.eth` text record using `setText` on the public resolver (requires owner key)
- Or create a new test authority (e.g., `test-list.ensfirewall.eth`) with its own text record, and subscribe a new smart account to it

The SDK should expose a `publishPolicy(authorityName, addresses[])` function for Gauss's frontend to write new policies easily.

---

## What Gauss can do RIGHT NOW

The contracts side is unblocking the following SDK tasks:

1. **G1, G2:** define policy types and encoding (use the format above)
2. **G3:** finish `packages/lib` package setup (already started by aleregex's port from growi-ens)
3. **G4:** implement `getPolicyList(authorityEns)` — test it against live `scamlist.ensfirewall.eth`
4. **G5:** implement `getSubscriptions(agentEns)` — note that for Layer 2 the smart account stores the authority directly, but the SDK's `getSubscriptions` should still read from a future agent ENS for forward compatibility
5. **G6:** implement `validateBlocklist(call, blocklist)` — mirror the Solidity logic exactly
6. **G7:** implement `buildSafeUserOp(args)` using Method 1 (direct call) first
7. Test end-to-end: SDK reads ENS, validates, calls `execute()` on `0x6EB916...` directly via the owner key
8. Once that works, swap to Method 2 (bundler via Pimlico) for the proper ERC-4337 flow

---

## Coordination notes

- **Don't change the encoding format** without coordinating with aleregex — both sides must match
- **Don't deploy a new smart account** in Layer 2 — use the existing one at `0x6EB916...` for testing
- **Don't write new authorities** to ENS without telling aleregex — these cost gas (negligible but trackable)
- **Use the existing wallet** for funding/testing — no need to create new ones unless explicitly testing multi-account scenarios

---

## Where to find more context

- `docs/PROJECT_CONTEXT.md` — full project overview, tech stack, architecture
- `docs/OSCARGAUSS_TASKS.md` — Gauss's full task list across Layers 2-6
- `docs/E2E_RESULTS.md` — the live test evidence from A9
- `packages/contracts/src/ENSFirewallAccount.sol` — the contract source
- `packages/contracts/src/PolicyValidator.sol` — the validation library
- `packages/lib/src/ens/` — ENS helpers (resolver reads, subname creation)
- `packages/shared/src/ens-keys.ts` — canonical ENS keys

---

**Layer 2 is closed. The system is alive on Sepolia. The thesis is proven. Now we build the SDK and the agent on top.**
