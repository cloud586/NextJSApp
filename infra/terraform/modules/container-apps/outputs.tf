output "container_app_fqdn" {
  value       = azurerm_container_app.this.ingress[0].fqdn
  description = "Container App ingress FQDN."
}

output "container_app_custom_domain_verification_id" {
  value       = azurerm_container_app.this.custom_domain_verification_id
  description = "Verification ID for ACA custom domain TXT records (asuid.<hostname>)."
}

output "custom_domain_hostname" {
  value       = var.custom_domain_hostname
  description = "Bound custom domain hostname, if configured."
}

output "custom_domain_verification_id" {
  value       = var.custom_domain_hostname != null ? azurerm_container_app.this.custom_domain_verification_id : null
  description = "Same as container_app_custom_domain_verification_id when a custom domain is configured."
}

output "custom_domain_tls_binding" {
  value       = var.custom_domain_hostname != null ? "SniEnabled (applied by terraform_data.bind_managed_certificate)" : null
  description = "TLS hostname binding runs az containerapp hostname bind during terraform apply."
}
