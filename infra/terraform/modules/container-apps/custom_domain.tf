resource "azurerm_container_app_custom_domain" "this" {
  count = var.custom_domain_hostname != null ? 1 : 0

  name             = var.custom_domain_hostname
  container_app_id = azurerm_container_app.this.id

  lifecycle {
    ignore_changes = [
      certificate_binding_type,
      container_app_environment_certificate_id,
    ]
  }
}

resource "azurerm_container_app_environment_managed_certificate" "this" {
  count = var.custom_domain_hostname != null ? 1 : 0

  name                         = replace(var.custom_domain_hostname, ".", "-")
  container_app_environment_id = azurerm_container_app_environment.this.id
  subject_name                 = var.custom_domain_hostname
  domain_control_validation    = "CNAME"

  depends_on = [azurerm_container_app_custom_domain.this]
}

# Terraform cannot bind managed certificates natively — Azure leaves bindingType as Disabled
# until hostname bind is run. See: https://github.com/hashicorp/terraform-provider-azurerm/issues/27362
resource "terraform_data" "bind_managed_certificate" {
  count = var.custom_domain_hostname != null ? 1 : 0

  triggers_replace = [
    azurerm_container_app_environment_managed_certificate.this[0].id,
    azurerm_container_app_custom_domain.this[0].id,
  ]

  provisioner "local-exec" {
    command = "az containerapp hostname bind --hostname ${var.custom_domain_hostname} --name ${azurerm_container_app.this.name} --resource-group ${var.resource_group_name} --environment ${azurerm_container_app_environment.this.name} --certificate ${azurerm_container_app_environment_managed_certificate.this[0].name} --validation-method CNAME"
  }

  depends_on = [
    azurerm_container_app_custom_domain.this,
    azurerm_container_app_environment_managed_certificate.this,
  ]
}
