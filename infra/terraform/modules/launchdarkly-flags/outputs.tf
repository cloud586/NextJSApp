output "flag_keys" {
  description = "Map of managed feature flag keys."
  value = {
    auth_signup_enabled = launchdarkly_feature_flag.auth_signup_enabled.key
  }
}
