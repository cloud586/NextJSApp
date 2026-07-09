variable "launchdarkly_access_token" {

  type = string

  description = "LaunchDarkly API access token. Can also be set via LAUNCHDARKLY_ACCESS_TOKEN."

  sensitive = true

  default = null

}



variable "create_project" {

  type = bool

  description = "When true, create the LaunchDarkly project and environments before managing flags. When false, ld_project_key must already exist."

  default = false

}



variable "ld_project_key" {

  type = string

  description = "LaunchDarkly project key (lowercase). Not the display name. Run scripts/list-launchdarkly-projects.ps1 to list keys."



  validation {

    condition = can(regex("^[a-z][a-z0-9_-]*$", var.ld_project_key))

    error_message = "LaunchDarkly project keys must be lowercase (e.g. default or sutoremu). The display name \"Sutoremu\" is not a valid key."

  }

}



variable "ld_project_name" {

  type = string

  description = "Human-readable project name when create_project is true."

  default = "Sutoremu"

}



variable "ld_environment_keys" {

  type = list(string)

  description = "LaunchDarkly environment keys (e.g. [\"test\", \"production\"]). Must be set in terraform.tfvars; interactive prompts do not support lists."



  validation {

    condition = length(var.ld_environment_keys) > 0

    error_message = "Provide at least one LaunchDarkly environment key in ld_environment_keys."

  }

}


