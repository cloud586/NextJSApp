variable "location" {
  type        = string
  description = "Azure region for the DNS resource group."
  default     = "centralus"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group for domain and DNS resources."
  default     = "sutoremu-dns-rg"
}

variable "domain_name" {
  type        = string
  description = "Root domain to register and host in Azure DNS."
  default     = "sutoremu.com"
}

variable "prod_hostname" {
  type        = string
  description = "Production app hostname (relative to domain_name)."
  default     = "app"
}

variable "dev_hostname" {
  type        = string
  description = "Dev app hostname (relative to domain_name)."
  default     = "dev.app"
}

variable "register_domain" {
  type        = bool
  description = "Purchase the domain via Azure App Service Domains. Set false if the domain is already registered."
  default     = true
}

variable "auto_renew" {
  type        = bool
  description = "Automatically renew the domain registration each year."
  default     = true
}

variable "privacy" {
  type        = bool
  description = "Enable WHOIS privacy for the domain registration."
  default     = true
}

variable "contact_info_file" {
  type        = string
  description = "Path to ICANN contact JSON (see contact_info.json.example). Required when register_domain is true."
  default     = null

  validation {
    condition     = !var.register_domain || var.contact_info_file != null
    error_message = "contact_info_file is required when register_domain is true."
  }
}

variable "consent_agreed_by" {
  type        = string
  description = "Client IP address for domain purchase consent (your public IPv4 or IPv6 at apply time)."
  default     = null
  sensitive   = true

  validation {
    condition     = !var.register_domain || var.consent_agreed_by != null
    error_message = "consent_agreed_by is required when register_domain is true."
  }
}

variable "agreement_keys" {
  type        = list(string)
  description = "Legal agreement keys for domain purchase (default DNRA for .com)."
  default     = ["DNRA"]
}

variable "state_resource_group_name" {
  type        = string
  description = "Resource group containing the Terraform remote state storage account."
  default     = "nextjsapp-tfstate-rg"
}

variable "state_storage_account_name" {
  type        = string
  description = "Storage account name for Terraform remote state."
  default     = "nextjsapptfstate"
}

variable "state_container_name" {
  type        = string
  description = "Blob container name for Terraform remote state."
  default     = "tfstate"
}

variable "dev_state_key" {
  type        = string
  description = "Remote state key for the dev environment."
  default     = "nextjsapp-dev.tfstate"
}

variable "prod_state_key" {
  type        = string
  description = "Remote state key for the prod environment."
  default     = "nextjsapp-prod.tfstate"
}

variable "prod_container_app_fqdn" {
  type        = string
  description = "Override prod Container App FQDN when prod remote state is unavailable."
  default     = null
}

variable "dev_container_app_fqdn" {
  type        = string
  description = "Override dev Container App FQDN when dev remote state is unavailable."
  default     = null
}

variable "prod_verification_id" {
  type        = string
  description = "Override prod ACA domain verification ID for asuid.* TXT record."
  default     = null
}

variable "dev_verification_id" {
  type        = string
  description = "Override dev ACA domain verification ID for asuid.* TXT record."
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to domain and DNS resources."
  default = {
    app        = "nextjsapp"
    managed-by = "terraform"
  }
}
