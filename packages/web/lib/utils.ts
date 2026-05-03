export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (!address) return "";
  if (address.length <= head + tail + 2) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://sepolia.etherscan.io/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}
