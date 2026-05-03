# E2E Test Results

## Layer 2 — Blocklist enforcement via ENS

**Date:** 2026-05-03
**Tested by:** aleregex
**Status:** ✅ PASSED

### Setup

- Smart account (proxy): `0x6EB916196e1A081234B26a977DFacF32510fA6C7`
- Implementation: `0x43210ea5330d1Ee965b896671E7064D54d40a555`
- Authority subname: `scamlist.ensfirewall.eth`
- Authority namehash: `0xbbddcabcea9c861cd383a22397cc740ec468b664393240f35f21e62b04e5b567`
- Public Resolver: `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5`
- Initial blocklist: `[0xBaD0000000000000000000000000000000000001, 0xbad0000000000000000000000000000000000002]`

### Test 1: Transfer to safe address ✅

- To: `0x41eD89C738435e6957Ed43b2Bc75bF918c861909` (not in blocklist)
- Amount: 0.001 ETH
- Tx: [`0x52a52a4169925e271a8625c5151dd9dec7cc0a52d1821e7f3a76659b343821a7`](https://sepolia.etherscan.io/tx/0x52a52a4169925e271a8625c5151dd9dec7cc0a52d1821e7f3a76659b343821a7)
- Result: Success, recipient received 0.001 ETH

### Test 2: Transfer to blocked address ✅

- To: `0xBaD0000000000000000000000000000000000001` (in blocklist)
- Amount: 0.001 ETH
- Result: Reverted with `PolicyViolation("destination is on blocklist")`
- Smart account read ENS, found target in blocklist, refused to sign onchain

### Test 3: Policy change propagates without redeploy ✅ (CRITICAL)

This is the test that proves the project's thesis.

- Step 1: Updated `policy:rules-encoded` text record at `scamlist.ensfirewall.eth` to remove `0xBaD0000000000000000000000000000000000001` from the blocklist
  - ENS update tx: [`0x1013862193843acb2533adf3afe92151a6c7c38494f6eb1eb15e89fd3c2c59c0`](https://sepolia.etherscan.io/tx/0x1013862193843acb2533adf3afe92151a6c7c38494f6eb1eb15e89fd3c2c59c0)
- Step 2: Repeated the exact same transfer that failed in Test 2 (same smart account, same target, same amount, NO contract changes)
- Result: ✅ Success
  - Tx: [`0xaf500081ecfab3e05ebd198b53ebc2269fd2def6e65f6d27f96acca68070183f`](https://sepolia.etherscan.io/tx/0xaf500081ecfab3e05ebd198b53ebc2269fd2def6e65f6d27f96acca68070183f)

**Conclusion:** Smart account behavior changed entirely from a single ENS text record update. No contract redeploy. No state migration. The policy enforcement layer is live in ENS, exactly as designed.