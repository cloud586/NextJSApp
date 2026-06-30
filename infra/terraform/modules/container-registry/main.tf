resource "azurerm_container_registry" "this" {
  name                          = var.name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  sku                           = var.sku
  admin_enabled                 = false
  public_network_access_enabled = true
  tags                          = var.tags
}

resource "azurerm_role_assignment" "acr_pull" {
  for_each = var.pull_principal_ids

  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPull"
  principal_id         = each.value
}

resource "azurerm_role_assignment" "acr_push" {
  for_each = var.push_principal_ids

  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPush"
  principal_id         = each.value
}
