import {
  decodeAbiParameters,
  encodeAbiParameters,
  type Address,
  type Hex,
} from "viem";

export function encodeBlocklist(addresses: Address[]): Hex {
  return encodeAbiParameters([{ type: "address[]" }], [addresses]);
}

export function decodeBlocklist(encoded: Hex): Address[] {
  const [addrs] = decodeAbiParameters(
    [{ type: "address[]" }],
    encoded
  ) as [Address[]];
  return addrs;
}

export interface Limits {
  maxPerTxWei: bigint;
  maxPerDayWei: bigint;
}

export function encodeLimits(maxPerTxWei: bigint, maxPerDayWei: bigint): Hex {
  return encodeAbiParameters(
    [{ type: "uint256" }, { type: "uint256" }],
    [maxPerTxWei, maxPerDayWei]
  );
}

export function decodeLimits(encoded: Hex): Limits {
  const [maxPerTxWei, maxPerDayWei] = decodeAbiParameters(
    [{ type: "uint256" }, { type: "uint256" }],
    encoded
  ) as [bigint, bigint];
  return { maxPerTxWei, maxPerDayWei };
}
