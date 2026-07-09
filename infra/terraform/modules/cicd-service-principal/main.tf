data "azuread_client_config" "current" {}

resource "azuread_application" "cicd" {
  display_name = var.display_name
  owners       = [data.azuread_client_config.current.object_id]
}

resource "azuread_service_principal" "cicd" {
  client_id = azuread_application.cicd.client_id
  owners    = [data.azuread_client_config.current.object_id]
}

resource "azuread_service_principal_password" "cicd" {
  service_principal_id = azuread_service_principal.cicd.id
}

resource "azuread_application_federated_identity_credential" "cicd" {
  for_each = { for credential in var.federated_credentials : credential.display_name => credential }

  application_id = azuread_application.cicd.id
  display_name   = each.value.display_name
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = each.value.issuer
  subject        = each.value.subject
}
