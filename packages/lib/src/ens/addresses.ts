import type { Address } from "viem";

function getEnvAddress(name: string): Address {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (!value.startsWith("0x") || value.length !== 42) {
    throw new Error(
      `${name} must be a valid Ethereum address (0x + 40 hex chars)`
    );
  }
  return value as Address;
}

export function getEnsRegistryAddress(): Address {
  return getEnvAddress("ENS_REGISTRY_ADDRESS");
}

export function getNameWrapperAddress(): Address {
  return getEnvAddress("NAMEWRAPPER_ADDRESS");
}

export function getEnsPublicResolverAddress(): Address {
  return getEnvAddress("ENS_PUBLIC_RESOLVER_ADDRESS");
}
