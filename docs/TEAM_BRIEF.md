# ENSFirewall — Team Brief

> Coordination document for **@aleregex** and **@OscarGauss** to build ENSFirewall during the ETHGlobal Open Agents hackathon.
>
> **Repo:** [github.com/aleregex/ENSFirewall](https://github.com/aleregex/ENSFirewall)

---

## What we're building

ENSFirewall is a permissionless protocol where:

1. Anyone publishes a security list (blocked addresses, spending limits, prompt injection patterns) under an ENS subname as a text record.
2. Any agent owner subscribes their agent to trusted lists by writing one ENS text record on the agent's name.
3. A custom ERC-4337 smart account reads those text records and refuses to sign any transaction that violates them — onchain, before the userOp is broadcast.

The agent code never enforces anything. The wallet does. Even if the LLM is fully compromised by prompt injection, the policies in ENS still hold because the agent has no private key that bypasses the contract — the only wallet with funds *is* the contract.

Plus a feedback layer: when an agent gets attacked, the owner can publish the malicious address to a community ENS list. Every subscribed agent worldwide inherits the protection instantly. No deploys. No patches.

**Target tracks:** Best ENS Integration for AI Agents + Most Creative Use of ENS.

---

## Current project state

### Done — Layer 1

- Monorepo setup with pnpm + turbo
- Five packages scaffolded: `agent`, `contracts`, `lib`, `shared`, `web`
- `packages/contracts` initialized with Foundry
- Smart account `ENSFirewallAccount.sol` extending `SimpleAccount` (ERC-4337 reference)
- Hardcoded blocklist in contract storage (will be replaced by ENS reads in Layer 2)
- Four green Foundry tests covering allow / block / add-to-blocklist / unblock
- Custom error `PolicyViolation(string reason)` for rejections
- Methods: `initializeWithBlocklist`, `blockAddress`, `unblockAddress`, `execute`, `executeBatch`

### Current actual repo structure

```
ensfirewall/
├── .claude/
│   └── settings.local.json
├── .env.example
├── .gitignore
├── docs/                                   (empty)
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── packages/
    ├── agent/
    │   └── src/                            (empty)
    ├── contracts/
    │   ├── foundry.toml
    │   ├── README.md
    │   ├── lib/                            (forge-std, account-abstraction, openzeppelin-contracts)
    │   ├── script/
    │   │   └── Counter.s.sol               ← legacy from forge init, to delete
    │   ├── src/
    │   │   ├── Counter.sol                 ← legacy from forge init, to delete
    │   │   └── ENSFirewallAccount.sol      ← Layer 1 smart account (blocklist hardcoded)
    │   └── test/
    │       └── ENSFirewallAccount.t.sol    ← 4 passing tests
    ├── shared/
    │   └── src/                            (empty)
    └── web/                                (empty)
```

### In progress — Layer 2

The current focus. This is where we split the work between aleregex and OscarGauss.

### Coming next — Layers 3 to 6

- **Layer 3:** TypeScript SDK published to npm as `ens-agent-firewall` + reference agent with Anthropic SDK running in CLI
- **Layer 4:** The other two policy types (limits, patterns) + Next.js web UI with the three-panel demo (chat, ENS state, etherscan feed)
- **Layer 5:** Feedback loop (community lists), second agent demonstrating the network effect, public live demo deployed
- **Layer 6:** Polish, three-minute submission video, npm publish, final README, ETHGlobal submission

---

## Architecture

### The actors

| Actor | Role | Tech |
|-------|------|------|
| **Publishers** | Create security lists under their own ENS subnames | Web UI or SDK |
| **Subscribers** (agent owners) | Choose which lists their agent trusts by writing a text record | Web UI or SDK |
| **Smart Accounts** (consumers) | Read ENS before every transaction and reject violators onchain | Solidity ERC-4337 |
| **AI Agents** | Build transactions using the SDK | Anthropic SDK + tool calling |
| **ENS** | Stores all rules and subscriptions | Text records onchain |

### Where each thing lives

- **The rules:** ENS text records (`policy:rules`, `policy:rules-encoded`, `policy:subscriptions`)
- **The money:** in the smart account (ERC-4337 contract)
- **The validation:** twice, in two places
  - Offchain in the SDK (early filter for fast feedback)
  - Onchain in the contract (defense in depth, cannot be bypassed)
- **The agent:** runs as a normal process, uses the SDK to build transactions
- **No backend:** all state lives in ENS or in contract storage

### Tech stack

- pnpm 9.x with workspaces, turbo as orchestrator
- Solidity 0.8.28 with Foundry (version pinned by the eth-infinitism/account-abstraction dependency)
- ERC-4337 with eth-infinitism reference implementation
- TypeScript strict mode in all TS packages
- Pimlico bundler (configured in Layer 3)
- Next.js 16, Tailwind, viem, wagmi, Framer Motion (Layer 4)
- Anthropic SDK with tool calling (Layer 3)
- Network: Sepolia testnet only, no mainnet

---

## Work split: aleregex vs OscarGauss

The principle: **work in parallel on different packages so we never touch the same file at the same time.**

### aleregex — ENS, contracts, onchain

Owner of:

- `packages/contracts/` — all Solidity, Foundry, scripts, deploys
- `packages/shared/` — only the parts related to ENS keys and ABI encoding format
- The full ENS flow — registration, subnames, text records, NameWrapper, resolver
- All Sepolia deployments — smart account, validator, subname creation
- Sepolia ETH and RPC setup
- The project's ENS name (`ensfirewall.eth` on Sepolia)
- Reused code from the prior `growi-ens` project (the `lib/ens/*` and `lib/chain/*` helpers — adapt them into `packages/lib/src/ens/` and `packages/lib/src/chain/`)

Why aleregex on this side: existing experience with ENS via the growi-ens project. The helpers being reused are code aleregex already wrote. The Solidity stack (Foundry, ERC-4337, account abstraction) is already validated by the Layer 1 work.

### OscarGauss — SDK, agent, frontend

Owner of:

- `packages/lib/` — the full TypeScript SDK
- `packages/agent/` — the reference agent with Anthropic SDK
- `packages/web/` — Next.js, dashboards, live demo
- `packages/shared/` — only the parts related to policy types and offchain validators
- Anthropic SDK setup
- npm publish flow for the SDK

Why OscarGauss on this side: more TypeScript-heavy work, frontend, SDK integrations. Less blockchain-context-required work where parallel iteration speed matters most.

### Contact point: `packages/shared/`

This package is the **data contract** between both sides. It defines:

- **ENS keys** (`policy:rules`, `policy:subscriptions`, etc.) — written by aleregex's contracts, read by OscarGauss's SDK
- **Policy types** (BlocklistRules, etc.) — used by OscarGauss in offchain validators
- **Encoding/decoding functions** (`encodeBlocklist`, `decodeBlocklist`) — used by OscarGauss to write the ABI-encoded blob that aleregex's Solidity reads onchain

**Rule:** any change to `shared/` must be communicated to the other before being made, because it breaks both sides. Default ownership: aleregex defines ENS keys and encoding format (because the contract has to read it); OscarGauss defines TypeScript types and offchain validators.

---

## Layer 2 task split

### aleregex tasks

1. **Buy `ensfirewall.eth` on Sepolia** at [sepolia.app.ens.domains](https://sepolia.app.ens.domains).
2. **Define and commit the ENS keys schema** in `packages/shared/src/ens-keys.ts` — the constants both sides will use.
3. **Copy and adapt `lib/ens/*` and `lib/chain/*` from growi-ens** into `packages/lib/src/ens/` and `packages/lib/src/chain/`. These are the read/write helpers for text records, the viem clients, and the `writeSafeContract` pattern.
4. **Create `PolicyValidator.sol`** in `packages/contracts/src/`. This contract decodes the ABI-encoded blob from a text record and applies the rule.
5. **Refactor `ENSFirewallAccount.sol`** so it calls the validator and performs the ENS resolver call directly, instead of reading local storage.
6. **Foundry tests with a mocked ENS Resolver** — no need to touch Sepolia for the test loop.
7. **Foundry script to publish a text record** under a subname on Sepolia.
8. **Foundry script to deploy `ENSFirewallAccount` on Sepolia** and subscribe it to that subname.
9. **Manual E2E test:** change the text record on Sepolia, verify the contract behavior changes without redeploy. **This is the make-or-break test for Layer 2 and for the entire project thesis.**

### OscarGauss tasks

1. **Define and commit the policy types** in `packages/shared/src/policy-schema.ts` — `BlocklistRules`, `LimitsRules`, `PatternsRules`, and a `PolicyList` type with discriminated union by `type`.
2. **Implement `encodeBlocklist` and `decodeBlocklist`** in `packages/shared/src/encoding.ts` using viem's `encodeAbiParameters` / `decodeAbiParameters` with type `address[]`. The format must match exactly what aleregex's Solidity validator reads.
3. **Set up `packages/lib/`:** package.json, tsup config, tsconfig. The SDK is named `ens-agent-firewall`.
4. **Implement `getPolicyList(authorityEns)` in the SDK:** given an ENS name, read the `policy:rules-encoded` text record, decode it, return the list. Uses the ENS helpers aleregex copies into `packages/lib/src/ens/`.
5. **Implement `getSubscriptions(agentEns)` in the SDK:** read the `policy:subscriptions` text record, return an array of ENS names.
6. **Implement the offchain validator in the SDK:** `validateBlocklist(call, blocklist)` returning `{ valid: boolean, reason?: string }`.
7. **Implement `buildSafeUserOp(args)` in the SDK:** orchestrates the steps above. Reads subscriptions, reads each policy list, validates locally first. If anything fails, throws `PolicyViolation`. If safe, builds the userOp and returns it ready to submit to the bundler.
8. **Set up `packages/agent/`:** create the reference agent with Anthropic SDK. For Layer 2, a simple CLI that takes a user message, the LLM decides whether to transfer, and uses `buildSafeUserOp` from the SDK. This is the agent that goes public in Layer 5.

### Layer 2 sync point

When both sides finish, the integration test:

- aleregex has a contract deployed on Sepolia that reads ENS
- OscarGauss has an SDK that writes to ENS and builds userOps
- Test scenario: OscarGauss writes a blocklist with address X. aleregex runs the agent. The agent tries to send to X. OscarGauss verifies the SDK rejects it locally. If for any reason the SDK didn't catch it, aleregex's contract rejects it onchain.

If both sides converge here without duplicated code and both pass, **Layer 2 is closed**.

---

## Coordination rules

### Branching

- `main`: only merges of complete features with passing tests
- `aleregex/contracts-*`, `aleregex/ens-*`: aleregex's branches
- `gauss/sdk-*`, `gauss/agent-*`, `gauss/web-*`: OscarGauss's branches
- PR on merge with light review by the other (not strict, hackathon mode)

### Commits

Conventional commits:
- `feat(contracts): ...` — aleregex
- `feat(lib): ...`, `feat(agent): ...`, `feat(web): ...` — OscarGauss
- `feat(shared): ...` — whoever touches it (notify the other first)

### Communication

- Any change in `packages/shared/` is announced before being made
- Any change affecting the data contract between SDK and contract (e.g., how blocklist is encoded) is discussed before implementation
- Daily quick check-in: yesterday, today, blockers

### Definition of done per task

- Code committed and pushed
- Tests passing if applicable
- Package README updated if the public API changed
- The other person notified if their side is affected

---

## Technical decisions already made

1. **Smart account first, ENS second.** Layer 1 hardcoded the blocklist. Layer 2 swaps it for ENS reads. Validate the ERC-4337 stack before depending on ENS.

2. **Validate in `execute()`, not in `_validateUserOp()` for now.** ERC-4337 has strict rules about what `_validateUserOp` can do (no external storage reads without paymaster). Policy logic stays in `execute()` for now. Reconsider in Layer 2 if needed.

3. **Two text records per policy list:** `policy:rules` (human-readable JSON) and `policy:rules-encoded` (ABI-encoded bytes for cheap onchain reading). The contract reads the encoded version.

4. **Pure onchain reading.** The smart account makes the ENS resolver call directly. More gas, but the pitch sells itself: "the wallet reads ENS before signing, no oracle, no trusted intermediary."

5. **Reused code from growi-ens.** ENS read/write helpers and chain client setup come from a previous project. Disclosed in the README. Smart account, validation logic, agent integration, network effect, and demo UI are all new for this hackathon.

6. **Sepolia only.** No mainnet, no L2, no multichain. Multichain is a future-work bullet only.

7. **No backend, no database.** Everything lives in ENS or in contract storage. The web app is stateless. Non-negotiable, core to the pitch.

---

## Out of scope

Explicitly NOT building:

- Custom registry contracts (use ENS as-is)
- Backend with database
- User auth beyond wallet connect
- Tokens, payment systems, marketplaces
- Auto-publishing of signals (humans publish only, opt-in)
- Mobile native app (web only)
- Multichain (Sepolia only for the MVP)

---

## Resources

- **Repo:** [github.com/aleregex/ENSFirewall](https://github.com/aleregex/ENSFirewall)
- **Project ENS:** `ensfirewall.eth` on Sepolia (registration in progress)
- **Hackathon:** [ethglobal.com/events/openagents](https://ethglobal.com/events/openagents)
- **Target tracks:** ENS prizes (Best ENS Integration for AI Agents + Most Creative Use of ENS)
- **Reused code source:** aleregex's growi-ens repo (lib/ens/*, lib/chain/*)
- **Pimlico docs (bundler):** [docs.pimlico.io](https://docs.pimlico.io)
- **ERC-4337 reference:** [github.com/eth-infinitism/account-abstraction](https://github.com/eth-infinitism/account-abstraction)
- **Anthropic SDK:** [docs.claude.com](https://docs.claude.com)

---

## Hackathon principle

This is a hackathon. The rule: **shipping working code over architectural perfection.** If it works and passes tests, ship it. Refactor in Layer 6 if there is time. Each layer is a defensible deliverable on its own — if we have to stop at any point, we have something to show.
