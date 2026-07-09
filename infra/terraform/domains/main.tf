data "azurerm_client_config" "current" {}

data "terraform_remote_state" "dev" {
  backend = "azurerm"

  config = {
    resource_group_name  = var.state_resource_group_name
    storage_account_name = var.state_storage_account_name
    container_name       = var.state_container_name
    key                  = var.dev_state_key
    use_azuread_auth     = true
  }
}

data "terraform_remote_state" "prod" {
  backend = "azurerm"

  config = {
    resource_group_name  = var.state_resource_group_name
    storage_account_name = var.state_storage_account_name
    container_name       = var.state_container_name
    key                  = var.prod_state_key
    use_azuread_auth     = true
  }
}

locals {
  prod_fqdn_target = var.prod_container_app_fqdn != null ? var.prod_container_app_fqdn : try(
    data.terraform_remote_state.prod.outputs.container_app_fqdn,
    null,
  )
  dev_fqdn_target = var.dev_container_app_fqdn != null ? var.dev_container_app_fqdn : try(
    data.terraform_remote_state.dev.outputs.container_app_fqdn,
    null,
  )

  prod_verification_id = var.prod_verification_id != null ? var.prod_verification_id : try(
    data.terraform_remote_state.prod.outputs.container_app_custom_domain_verification_id,
    null,
  )
  dev_verification_id = var.dev_verification_id != null ? var.dev_verification_id : try(
    data.terraform_remote_state.dev.outputs.container_app_custom_domain_verification_id,
    null,
  )

  contact = var.register_domain ? jsondecode(file(var.contact_info_file)) : null

  contact_block = var.register_domain ? {
    nameFirst    = local.contact.nameFirst
    nameLast     = local.contact.nameLast
    email        = local.contact.email
    phone        = local.contact.phone
    jobTitle     = try(local.contact.jobTitle, null)
    organization = try(local.contact.organization, null)
    addressMailing = {
      address1   = local.contact.addressMailing.address1
      address2   = try(local.contact.addressMailing.address2, null)
      city       = local.contact.addressMailing.city
      state      = local.contact.addressMailing.state
      country    = local.contact.addressMailing.country
      postalCode = local.contact.addressMailing.postalCode
    }
  } : null
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_dns_zone" "this" {
  name                = var.domain_name
  resource_group_name = azurerm_resource_group.this.name
  tags                = var.tags
}

resource "azapi_resource" "domain" {
  count = var.register_domain ? 1 : 0

  type      = "Microsoft.DomainRegistration/domains@2024-11-01"
  name      = var.domain_name
  parent_id = azurerm_resource_group.this.id
  location  = "global"

  schema_validation_enabled = false

  body = {
    properties = {
      dnsType   = "AzureDns"
      dnsZoneId = azurerm_dns_zone.this.id
      autoRenew = var.auto_renew
      privacy   = var.privacy

      consent = {
        agreementKeys = var.agreement_keys
        agreedBy      = var.consent_agreed_by
        agreedAt      = timestamp()
      }

      contactAdmin      = local.contact_block
      contactRegistrant = local.contact_block
      contactBilling    = local.contact_block
      contactTech       = local.contact_block
    }
  }

  lifecycle {
    ignore_changes = [
      body.properties.consent.agreedAt,
    ]
  }

  depends_on = [azurerm_dns_zone.this]
}

resource "azurerm_dns_cname_record" "prod_app" {
  count = local.prod_fqdn_target != null ? 1 : 0

  name                = var.prod_hostname
  zone_name           = azurerm_dns_zone.this.name
  resource_group_name = azurerm_resource_group.this.name
  ttl                 = 300
  record              = local.prod_fqdn_target
}

resource "azurerm_dns_cname_record" "dev_app" {
  name                = var.dev_hostname
  zone_name           = azurerm_dns_zone.this.name
  resource_group_name = azurerm_resource_group.this.name
  ttl                 = 300
  record              = local.dev_fqdn_target
}

resource "azurerm_dns_txt_record" "prod_verification" {
  count = local.prod_verification_id != null ? 1 : 0

  name                = "asuid.${var.prod_hostname}"
  zone_name           = azurerm_dns_zone.this.name
  resource_group_name = azurerm_resource_group.this.name
  ttl                 = 300

  record {
    value = local.prod_verification_id
  }
}

resource "azurerm_dns_txt_record" "dev_verification" {
  count = local.dev_verification_id != null ? 1 : 0

  name                = "asuid.${var.dev_hostname}"
  zone_name           = azurerm_dns_zone.this.name
  resource_group_name = azurerm_resource_group.this.name
  ttl                 = 300

  record {
    value = local.dev_verification_id
  }
}
