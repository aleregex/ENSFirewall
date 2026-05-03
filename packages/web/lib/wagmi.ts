import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId && typeof window !== "undefined") {
  // Don't crash render — RainbowKit can mount without a projectId, only WC v2
  // wallets won't be available. Logged once so the dev knows to set it.
  console.warn(
    "[ENSFirewall] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — only injected wallets (MetaMask, Rabby) will be available.",
  );
}

const sepoliaRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

export const wagmiConfig = getDefaultConfig({
  appName: "ENSFirewall",
  projectId: projectId || "ensfirewall-dev-no-projectid",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(sepoliaRpc),
  },
  ssr: true,
});
