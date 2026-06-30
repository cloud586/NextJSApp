resource "azurerm_container_app_environment" "this" {
  name                       = "${var.name_prefix}-cae"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id
  infrastructure_subnet_id   = var.infrastructure_subnet_id
  zone_redundancy_enabled    = var.infrastructure_subnet_id != null ? var.zone_redundancy_enabled : null
  tags                       = var.tags

  timeouts {
    create = "120m"
    update = "120m"
  }
}

resource "azurerm_container_app" "this" {
  name                         = "${var.name_prefix}-app"
  container_app_environment_id = azurerm_container_app_environment.this.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [var.managed_identity_id]
  }

  registry {
    server   = var.acr_login_server
    identity = var.managed_identity_id
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "nextjsapp"
      image  = var.container_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "AZURE_APP_CONFIG_ENDPOINT"
        value = var.app_config_endpoint
      }

      env {
        name  = "AZURE_APP_CONFIG_LABEL"
        value = var.app_config_label
      }

      env {
        name  = "AZURE_CLIENT_ID"
        value = var.managed_identity_client_id
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      liveness_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/"

        initial_delay           = 10
        interval_seconds        = 30
        timeout                 = 5
        failure_count_threshold = 3
      }

      readiness_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/"

        interval_seconds        = 10
        timeout                 = 3
        failure_count_threshold = 3
        success_count_threshold = 1
      }
    }
  }
}
