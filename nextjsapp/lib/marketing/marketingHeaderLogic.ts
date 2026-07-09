export function shouldShowSignup(
  ldConfigured: boolean,
  flagValue: boolean,
): boolean {
  if (!ldConfigured) {
    return false;
  }
  return flagValue;
}
