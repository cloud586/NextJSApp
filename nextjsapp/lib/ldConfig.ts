// Flags that are safe and allowed to be bootstrapped from server -> client
export const clientBootstrapWhitelist = new Set<string>([
  // Add flag keys here that are allowed to be evaluated on both server and client
  // Keep server-only flags out of this list. Currently empty to avoid
  // bootstrapping any server-only flags to the client.
]);
