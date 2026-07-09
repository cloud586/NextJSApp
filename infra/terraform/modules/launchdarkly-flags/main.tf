resource "launchdarkly_feature_flag" "auth_signup_enabled" {
  project_key    = var.project_key
  key            = "auth.signupEnabled"
  name           = "Auth Signup Enabled"
  description    = "Controls visibility of the Signup button on the marketing frontpage."
  variation_type = "boolean"
  tags           = var.tags

  variations {
    value = true
  }

  variations {
    value = false
  }

  defaults {
    on_variation  = 0
    off_variation = 1
  }
}

resource "launchdarkly_feature_flag_environment" "auth_signup_enabled" {
  for_each = toset(var.environment_keys)

  flag_id       = launchdarkly_feature_flag.auth_signup_enabled.id
  env_key       = each.value
  on            = false
  off_variation = 1

  fallthrough {
    # Default rule when the flag is ON — must serve true (variation 0).
    # off_variation handles everyone when the flag is OFF.
    variation = 0
  }
}
