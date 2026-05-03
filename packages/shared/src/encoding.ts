import {
  decodeAbiParameters,
  encodeAbiParameters,
  type Address,
  type Hex,
} from "viem";

/**
 * Encoding for blocklist policies stored at the `policy:rules-encoded` ENS
 * text record. The on-chain validator decodes via:
 *
 *     bytes memory encoded = _hexStringToBytes(textRecord);  // strip 0x, hex→bytes
 *     address[] memory blocked = abi.decode(encoded, (address[]));
 *
 * So the TypeScript side must produce a `0x…` hex string whose raw bytes are
 * exactly `abi.encode(address[])`. viem's `encodeAbiParameters` already
 * returns that shape — keep this file as the single canonical wrapper so
 * call-sites can't drift.
 *
 * Round-trip invariant: `decodeBlocklist(encodeBlocklist(xs))` deeply equals
 * `xs` (modulo address checksum casing, which viem normalises on decode).
 */

const BLOCKLIST_ABI = [{ type: "address[]" as const }] as const;

export function encodeBlocklist(addresses: readonly Address[]): Hex {
  return encodeAbiParameters(BLOCKLIST_ABI, [addresses as Address[]]);
}

export function decodeBlocklist(encoded: Hex): Address[] {
  const [decoded] = decodeAbiParameters(BLOCKLIST_ABI, encoded);
  // viem returns `readonly Address[]`; we widen to a mutable copy because
  // most consumers want to push/sort without dealing with `as`.
  return [...decoded] as Address[];
}
