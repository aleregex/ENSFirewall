// Quick sanity check: encode → decode → validate. Intended for the manual
// cross-test with aleregex (he runs his Foundry test against the same hex).
//
// Run from repo root:
//   node packages/shared/scripts/encoding-roundtrip.mjs

import {
  encodeBlocklist,
  decodeBlocklist,
} from "../dist/index.js";
import { validateBlocklist } from "../../lib/dist/index.js";

const BLOCKED = [
  "0xbadbadbadbadbadbadbadbadbadbadbadbadbad0",
  "0x000000000000000000000000000000000000bad1",
];

const ENCODED = encodeBlocklist(BLOCKED);
console.log("encoded hex:", ENCODED);
console.log("encoded byte length:", (ENCODED.length - 2) / 2);

const DECODED = decodeBlocklist(ENCODED);
console.log("decoded:", DECODED);

const sameLength = DECODED.length === BLOCKED.length;
const sameAddrs = DECODED.every(
  (addr, i) => addr.toLowerCase() === BLOCKED[i].toLowerCase(),
);
console.log("round-trip matches:", sameLength && sameAddrs);

// validateBlocklist
const blockedCall = {
  to: BLOCKED[0],
  value: 0n,
};
const allowedCall = {
  to: "0xcafecafecafecafecafecafecafecafecafecafe",
  value: 0n,
};

const blockedResult = validateBlocklist(blockedCall, {
  type: "blocklist",
  addresses: DECODED,
});
const allowedResult = validateBlocklist(allowedCall, {
  type: "blocklist",
  addresses: DECODED,
});

console.log("blocked call →", blockedResult);
console.log("allowed call →", allowedResult);

const ok =
  sameLength &&
  sameAddrs &&
  blockedResult.valid === false &&
  allowedResult.valid === true;

if (!ok) {
  console.error("\n❌ FAIL");
  process.exit(1);
}
console.log("\n✅ All checks pass");
