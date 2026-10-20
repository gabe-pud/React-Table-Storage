locals {
  name = "${var.project_name}-${var.environment}"
  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "random_string" "storage_suffix" {
  length  = 5
  lower   = true
  upper   = false
  numeric = true
  special = false
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}

resource "azurerm_storage_account" "data" {
  name                     = "st${substr(var.project_name, 0, 10)}${substr(var.environment, 0, 3)}${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  tags = local.tags
}

resource "azurerm_storage_account_static_website" "frontend" {
  storage_account_id = azurerm_storage_account.data.id
  index_document     = "index.html"
  error_404_document = "index.html"
}

resource "azurerm_storage_table" "contacts" {
  name               = var.table_name
  storage_account_id = azurerm_storage_account.data.id
}

resource "azurerm_service_plan" "api" {
  name                = "asp-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.api_sku
  tags                = local.tags
}

resource "azurerm_linux_web_app" "api" {
  name                = "app-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_service_plan.api.location
  service_plan_id     = azurerm_service_plan.api.id
  https_only          = true

  site_config {
    always_on = var.api_sku != "F1"

    cors {
      allowed_origins = [trimsuffix(azurerm_storage_account.data.primary_web_endpoint, "/")]
    }

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    PORT                              = "8080"
    WEBSITES_PORT                     = "8080"
    WEBSITE_NODE_DEFAULT_VERSION      = "~20"
    SCM_DO_BUILD_DURING_DEPLOYMENT    = "true"
    AZURE_TABLE_NAME                  = azurerm_storage_table.contacts.name
    AZURE_STORAGE_CONNECTION_STRING = azurerm_storage_account.data.primary_connection_string
    FRONTEND_ORIGINS                  = trimsuffix(azurerm_storage_account.data.primary_web_endpoint, "/")
  }

  tags = local.tags
}

