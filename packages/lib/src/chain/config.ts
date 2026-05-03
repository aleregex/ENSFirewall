function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getDeployerPrivateKey(): `0x${string}` {
  const key = getEnvVar("DEPLOYER_PRIVATE_KEY");
  if (!key.startsWith("0x")) {
    throw new Error("DEPLOYER_PRIVATE_KEY must start with 0x");
  }
  if (key.length !== 66) {
    throw new Error("DEPLOYER_PRIVATE_KEY must be 66 characters (0x + 64 hex)");
  }
  return key as `0x${string}`;
}

export function getSepoliaRpcUrl(): string {
  return getEnvVar("SEPOLIA_RPC_URL");
}

export function getChainId(): number {
  const raw = process.env.CHAIN_ID;
  if (!raw) return 11155111;
  const id = parseInt(raw, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error("CHAIN_ID must be a positive number");
  }
  return id;
}

export function getEnsRootName(): string {
  return getEnvVar("ENS_ROOT_NAME");
}
