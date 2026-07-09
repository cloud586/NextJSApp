terraform {

  required_version = ">= 1.5.0"



  required_providers {

    launchdarkly = {

      source = "launchdarkly/launchdarkly"

      version = "~> 2.0"

    }

  }

}



provider "launchdarkly" {

  # Set LAUNCHDARKLY_ACCESS_TOKEN in the shell, or pass launchdarkly_access_token in terraform.tfvars.

  access_token = var.launchdarkly_access_token

}



data "launchdarkly_project" "existing" {

  count = var.create_project ? 0 : 1

  key = var.ld_project_key

}



resource "launchdarkly_project" "this" {

  count = var.create_project ? 1 : 0



  key = var.ld_project_key

  name = var.ld_project_name



  dynamic "environments" {

    for_each = var.ld_environment_keys

    content {

      key = environments.value

      name = title(environments.value)

      color = "4177DF"

    }

  }

}



locals {

  project_key = var.create_project ? launchdarkly_project.this[0].key : data.launchdarkly_project.existing[0].key

}



module "flags" {

  source = "../modules/launchdarkly-flags"



  project_key = local.project_key

  environment_keys = var.ld_environment_keys

}


