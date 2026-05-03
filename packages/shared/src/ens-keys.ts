export const ENS_KEYS = {
  POLICY_RULES_JSON: "policy:rules",
  POLICY_RULES_ENCODED: "policy:rules-encoded",
  POLICY_SUBSCRIPTIONS: "policy:subscriptions",
  POLICY_VERSION: "policy:version",
  POLICY_PUBLISHER: "policy:publisher",
} as const;

export type EnsKey = typeof ENS_KEYS[keyof typeof ENS_KEYS];
