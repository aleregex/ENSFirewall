import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";
import {
  getChainId,
  getDeployerPrivateKey,
  getSepoliaRpcUrl,
} from "./config.js";

function resolveChain(chainId: number, rpcUrl: string) {
  switch (chainId) {
    case 1:
      return mainnet;
    case 11155111:
      return sepolia;
    default:
      return {
        id: chainId,
        name: `Custom Chain ${chainId}`,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] },
        },
      } as const;
  }
}

let cachedAccount: PrivateKeyAccount | undefined;
let cachedPublicClient: PublicClient | undefined;
let cachedWalletClient: WalletClient | undefined;

export function getAccount(): PrivateKeyAccount {
  if (!cachedAccount) {
    cachedAccount = privateKeyToAccount(getDeployerPrivateKey());
  }
  return cachedAccount;
}

export function getPublicClient(): PublicClient {
  if (!cachedPublicClient) {
    const rpcUrl = getSepoliaRpcUrl();
    const chain = resolveChain(getChainId(), rpcUrl);
    cachedPublicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    }) as PublicClient;
  }
  return cachedPublicClient;
}

export function getWalletClient(): WalletClient {
  if (!cachedWalletClient) {
    const rpcUrl = getSepoliaRpcUrl();
    const chain = resolveChain(getChainId(), rpcUrl);
    cachedWalletClient = createWalletClient({
      account: getAccount(),
      chain,
      transport: http(rpcUrl),
    });
  }
  return cachedWalletClient;
}
