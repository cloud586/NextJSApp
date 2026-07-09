check "container_app_fqdn_targets" {
  assert {
    condition     = local.dev_fqdn_target != null
    error_message = "Dev Container App FQDN is required. Apply the dev environment first, or set dev_container_app_fqdn in terraform.tfvars."
  }
}
