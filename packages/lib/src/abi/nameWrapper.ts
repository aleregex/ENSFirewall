export const nameWrapperAbi = [
  {
    inputs: [
      { internalType: "bytes32", name: "parentNode", type: "bytes32" },
      { internalType: "string", name: "label", type: "string" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint32", name: "fuses", type: "uint32" },
      { internalType: "uint64", name: "expiry", type: "uint64" },
    ],
    name: "setSubnodeOwner",
    outputs: [{ internalType: "bytes32", name: "node", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "parentNode", type: "bytes32" },
      { internalType: "string", name: "label", type: "string" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "resolver", type: "address" },
      { internalType: "uint64", name: "ttl", type: "uint64" },
      { internalType: "uint32", name: "fuses", type: "uint32" },
      { internalType: "uint64", name: "expiry", type: "uint64" },
    ],
    name: "setSubnodeRecord",
    outputs: [{ internalType: "bytes32", name: "node", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "owner", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getData",
    outputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint32", name: "fuses", type: "uint32" },
      { internalType: "uint64", name: "expiry", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
