variable "location" {
  type        = string
  description = "Azure region for Terraform state resources."
  default     = "centralus"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group for Terraform remote state."
  default     = "nextjsapp-tfstate-rg"
}

variable "storage_account_name" {
  type        = string
  description = "Globally unique storage account name for Terraform state (3-24 lowercase alphanumeric)."
}

variable "container_name" {
  type        = string
  description = "Blob container name for Terraform state files."
  default     = "tfstate"
}
