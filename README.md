# ENSFirewall

> Decentralized firewall for AI agents. Security policies live in ENS, enforced onchain by ERC-4337 smart accounts.

> 🏆 **ETHGlobal Open Agents** — applying for ENS prizes:
> **Best ENS Integration for AI Agents** + **Most Creative Use of ENS**

![ENSFirewall — System flow](./docs/ensfirewall_flow.png)

---

## The problem

AI agents now hold real money onchain. Prompt injection attacks drain them daily. Every agent maintains its own rules locally; there is no shared defense.

## The solution

ENSFirewall is a permissionless protocol where:

1. **Publishers** create security lists (blocked addresses, spending limits) under their own ENS subnames as text records.
2. **Agent owners** subscribe their agent's smart account to a trusted authority by configuring it onchain (single authority in the Layer 2 MVP; multi-authority via `policy:subscriptions` is the v2 design).
3. **Smart accounts** read ENS before signing any transaction. If a rule is violated, the call reverts onchain — even if the agent's LLM is fully compromised.

The agent code never enforces anything. The wallet does. Even if the LLM is fully prompt-injected, the agent has no private key that bypasses the smart account, because the only wallet with funds *is* the smart account.

## Live demo

🌐 **[ens-firewall-web.vercel.app](https://ens-firewall-web.vercel.app/)** — chat with the agent, watch ENS-published policies block malicious transactions in real time.

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

The thesis: **changing one ENS text record changes smart account behavior with no redeploy.** Full E2E walkthrough in [`docs/E2E_RESULTS.md`](./docs/E2E_RESULTS.md).

## Verify it yourself

You don't need to clone the repo. Run these against any Sepolia RPC:

```bash
# 1. The smart account's bound authority
cast call 0x6EB916196e1A081234B26a977DFacF32510fA6C7 \
  "authorityNode()(bytes32)" \
  --rpc-url $SEPOLIA_RPC_URL
# → 0xbbddcabcea9c861cd383a22397cc740ec468b664393240f35f21e62b04e5b567

# 2. The live policy in ENS
cast call 0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5 \
  "text(bytes32,string)(string)" \
  0xbbddcabcea9c861cd383a22397cc740ec468b664393240f35f21e62b04e5b567 \
  "policy:rules-encoded" \
  --rpc-url $SEPOLIA_RPC_URL
# → 0x...0002 (decodes to [0xbad0000000000000000000000000000000000002])

# 3. Smart account balance
cast balance 0x6EB916196e1A081234B26a977DFacF32510fA6C7 \
  --rpc-url $SEPOLIA_RPC_URL --ether
```

## How ENS is used

Five distinct jobs, all doing real work:

1. **Identity** — every authority has its own ENS name
2. **Configuration** — agent owners bind their smart account to a trusted authority's namehash; multi-authority subscription discovery via `policy:subscriptions` is the v2 design
3. **Distribution** — `policy:rules-encoded` propagates to every subscribed agent instantly with no redeploy
4. **Reputation** — verifiable by counting subscribers onchain
5. **Enforcement** — the smart account reads ENS via the resolver inside `execute()` before forwarding any call

Remove ENS and the protocol collapses.

## Architecture

- **Smart contract:** `ENSFirewallAccount.sol` extends eth-infinitism's `SimpleAccount`. Custom `execute()` reads ENS text records before forwarding any call.
- **Validation library:** `PolicyValidator.sol` — `abi.decode`s the text record bytes and reverts on a blocklist hit.
- **Validation lives in `execute()`, not `_validateUserOp()`.** ERC-4337 forbids external storage reads in the validation phase; putting an ENS resolver call there would risk bundler bans.
- **Network:** Sepolia testnet only.
- **No backend, no database** — all state lives in ENS or in contract storage.

The system-flow diagram at the top of this README shows the topology. The sequence diagram below shows the temporal lifecycle of a single transaction — including the two validation moments (offchain in the SDK, onchain in the smart account) that implement defense in depth.

![Transaction sequence](./docs/sequence.png)
## Repo structure

pnpm + turbo monorepo organized in four layers:

![Architecture](./docs/architecture.png)

- `packages/contracts/` — Solidity (Foundry). Smart account + validator. **13 tests passing**, plus full E2E run on live Sepolia.
- `packages/lib/` — TypeScript SDK foundation: ENS read/write helpers, viem chain clients, policy validators, ABI encoding/decoding (port from `growi-ens` disclosed below).
- `packages/shared/` — Shared TS types + ENS keys + ABI encoding (viem).
- `packages/web/` — Next.js 16 live demo with embedded chat agent (Vercel AI SDK + Anthropic Claude Sonnet 4.6), wallet connect via RainbowKit. **Deployed at [ens-firewall-web.vercel.app](https://ens-firewall-web.vercel.app/)**.

## Run the contracts locally

```bash
cd packages/contracts
forge test -vv
```

## Run the web demo locally

```bash
cd packages/web
cp .env.local.example .env.local
# Fill in: ANTHROPIC_API_KEY, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
pnpm install && pnpm dev
# Open http://localhost:3000/live
```

## Reused code disclosure

The ENS read/write helpers in `packages/lib/src/ens/*` and the viem chain clients in `packages/lib/src/chain/*` are ports from `growi-ens`, a prior project by aleregex. The smart account, the policy validator, the encoding/decoding contracts, the SDK orchestration layer (`policies/`, `validators/`), the offchain validators, the web demo with the AI agent integration, the ENS-as-ACL pattern itself, and all the integration code is original work for this hackathon.

## Documentation

- [`docs/E2E_RESULTS.md`](./docs/E2E_RESULTS.md) — full E2E test evidence with tx hashes
- [`docs/internal/`](./docs/internal/) — internal team coordination notes and design history (not for review)

## Team

- **aleregex** 
- **OscarGauss** 
