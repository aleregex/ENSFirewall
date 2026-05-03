// Smoke test: read scamlist.ensfirewall.eth via the SDK's getPolicyList +
// getSubscriptions, decode, and validate one allowed + one blocked address.
//
//   node --env-file=.env packages/lib/scripts/smoke-read-scamlist.mjs

import {
  getPolicyList,
  getSubscriptions,
  validateBlocklist,
} from "../dist/index.js";

const AUTHORITY = "scamlist.ensfirewall.eth";
const AGENT = "ensfirewall.eth";

console.log(`\n=== getPolicyList("${AUTHORITY}") ===`);
const list = await getPolicyList(AUTHORITY);
if (!list) {
  console.error("❌ no policy list");
  process.exit(1);
}
console.log(JSON.stringify(list, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

if (list.rule.type !== "blocklist") {
  console.error("❌ expected blocklist rule");
  process.exit(1);
}

const blocked = list.rule.addresses[0];
const safe = "0xcafecafecafecafecafecafecafecafecafecafe";

console.log(`\n=== validateBlocklist against decoded list ===`);
const blockedRes = validateBlocklist({ to: blocked, value: 0n }, list.rule);
const safeRes = validateBlocklist({ to: safe, value: 0n }, list.rule);
console.log(`  blocked target ${blocked.slice(0, 10)}…  →`, blockedRes);
console.log(`  safe target    ${safe.slice(0, 10)}…  →`, safeRes);

console.log(`\n=== getSubscriptions("${AGENT}") ===`);
const subs = await getSubscriptions(AGENT);
console.log(subs.length === 0 ? "(empty — Layer 2 contract uses single authority)" : subs);

const ok = blockedRes.valid === false && safeRes.valid === true;
if (!ok) {
  console.error("\n❌ validator returned wrong result");
  process.exit(1);
}
console.log("\n✅ G4 + G5 + G6 all green against live Sepolia");
