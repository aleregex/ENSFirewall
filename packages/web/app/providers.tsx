"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";

// Pollar pattern: defer mounting wagmi+RainbowKit until the client is hydrated.
// WalletConnect's storage layer touches indexedDB at construction time and
// explodes during SSR/SSG. Both the wagmi config and the providers must only
// instantiate after hydration — hence the lazy useMemo inside the mounted branch.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function Providers({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [queryClient] = useState(() => new QueryClient());

  // Return null (not children) until mounted: any descendant that calls
  // wallet hooks (useAccount, useBalance…) would crash without WagmiProvider
  // in scope. Brief blank flash on first paint is the cost.
  if (!mounted) return null;

  return <ClientOnlyProviders queryClient={queryClient}>{children}</ClientOnlyProviders>;
}

function ClientOnlyProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  const wagmiConfig = useMemo(() => {
    // Imported lazily so WalletConnect's storage init never runs server-side.
    // Top-level `import` would fire during SSR even with the mounted gate.
    const { wagmiConfig } = require("@/lib/wagmi") as typeof import("@/lib/wagmi");
    return wagmiConfig;
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#2ce4ff",
            accentColorForeground: "#07091a",
            borderRadius: "large",
            overlayBlur: "small",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
