output "flag_keys" {

  description = "Managed LaunchDarkly feature flag keys."

  value = module.flags.flag_keys

}



output "project_key" {

  description = "LaunchDarkly project key used for flag management."

  value = local.project_key

}


