output "domain_name" {
  value       = var.domain_name
  description = "Root domain name."
}

output "dns_zone_id" {
  value       = azurerm_dns_zone.this.id
  description = "Azure DNS zone resource ID."
}

output "name_servers" {
  value       = azurerm_dns_zone.this.name_servers
  description = "Azure DNS name servers (delegated automatically when purchased via App Service Domain)."
}

output "prod_app_fqdn" {
  value       = "${var.prod_hostname}.${var.domain_name}"
  description = "Production custom hostname."
}

output "dev_app_fqdn" {
  value       = "${var.dev_hostname}.${var.domain_name}"
  description = "Dev custom hostname."
}

output "prod_cname_target" {
  value       = local.prod_fqdn_target
  description = "CNAME target for the production app hostname (null when prod is not deployed)."
}

output "dev_cname_target" {
  value       = local.dev_fqdn_target
  description = "CNAME target for the dev app hostname."
}

output "domain_resource_id" {
  value       = try(azapi_resource.domain[0].id, null)
  description = "App Service Domain resource ID (null when register_domain is false)."
}
