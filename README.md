# ENSFirewall

> Decentralized firewall for AI agents. Security policies live in ENS, enforced onchain by ERC-4337 smart accounts.

**ETHGlobal Open Agents** — targeting ENS Best Integration + Most Creative Use of ENS.

---

## The problem

AI agents now hold real money onchain. Prompt injection attacks drain them daily. Every agent maintains its own rules locally; there is no shared defense.

## The solution

ENSFirewall is a permissionless protocol where:

1. **Publishers** create security lists (blocked addresses, spending limits) under their own ENS subnames as text records.
2. **Agent owners** subscribe their agent's smart account to trusted lists by writing one ENS text record.
3. **Smart accounts** read ENS before signing any transaction. If a rule is violated, the userOp reverts onchain — even if the agent's LLM is fully compromised.

The agent code never enforces anything. The wallet does. Even if the LLM is fully prompt-injected, the agent has no private key that bypasses the smart account, because the only wallet with funds *is* the smart account.

## Live on Sepolia

| Item | Address |
|---|---|
| Smart Account (proxy) | [`0x6EB916196e1A081234B26a977DFacF32510fA6C7`](https://sepolia.etherscan.io/address/0x6EB916196e1A081234B26a977DFacF32510fA6C7) |
| Implementation | [`0x43210ea5330d1Ee965b896671E7064D54d40a555`](https://sepolia.etherscan.io/address/0x43210ea5330d1Ee965b896671E7064D54d40a555) |
| Authority subname | [`scamlist.ensfirewall.eth`](https://sepolia.app.ens.domains/scamlist.ensfirewall.eth) |
| Public Resolver | `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5` |
| EntryPoint v0.8 (Sepolia) | `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108` |

## Verifiable evidence (4 onchain transactions)

| Test | Result | Tx |
|---|---|---|
| Safe transfer | Passed | [`0x52a52a41...`](https://sepolia.etherscan.io/tx/0x52a52a4169925e271a8625c5151dd9dec7cc0a52d1821e7f3a76659b343821a7) |
| Blocked transfer | Reverted with `PolicyViolation("destination is on blocklist")` | (see eth_estimateGas trace) |
| ENS text record updated | Passed | [`0x10138621...`](https://sepolia.etherscan.io/tx/0x1013862193843acb2533adf3afe92151a6c7c38494f6eb1eb15e89fd3c2c59c0) |
| **Same blocked transfer now passes (no redeploy)** | Passed | [`0xaf500081...`](https://sepolia.etherscan.io/tx/0xaf500081ecfab3e05ebd198b53ebc2269fd2def6e65f6d27f96acca68070183f) |

The thesis: **changing one ENS text record changes smart account behavior with no redeploy.**

## How ENS is used

Five distinct jobs, all doing real work:

1. **Identity** — every authority has its own ENS name
2. **Configuration** — subscriptions live in `policy:subscriptions` text record
3. **Distribution** — `policy:rules-encoded` propagates to every subscribed agent instantly
4. **Reputation** — verifiable by counting subscribers onchain
5. **Enforcement** — the smart account reads ENS via the resolver before signing

Remove ENS and the protocol collapses.

## Architecture

- **Smart contract:** ERC-4337 smart account (`ENSFirewallAccount.sol`) extending `SimpleAccount` with custom validation that reads ENS text records on every `execute()` call.
- **Validation library:** `PolicyValidator.sol` decodes ABI-encoded blobs and applies rules (blocklist + spending limits).
- **Network:** Sepolia testnet only.
- **No backend, no database** — all state lives in ENS or in contract storage.

## Repo structure

pnpm + turbo monorepo:

- `packages/contracts/` — Solidity (Foundry). Smart account + validator. **13 tests passing.**
- `packages/lib/` — TypeScript SDK foundation (ENS read/write helpers, chain clients). Adapted from prior project, see "Reused code" below.
- `packages/shared/` — TS types + ENS keys + ABI encoding/decoding (viem).
- `packages/agent/` — Agent reference (placeholder for Layer 5+).
- `packages/web/` — Frontend placeholder (live demo at: see below).

## Demo

- **Live page:** https://ens-firewall-web.vercel.app/

## Run the contracts locally

```bash
cd packages/contracts
forge test -vv
```
